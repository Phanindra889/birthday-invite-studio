// Generates the built-in music tracks and sound effects as 44.1 kHz stereo WAV files.
//
// Everything here is synthesized from scratch (additive bells, Karplus–Strong plucks,
// filtered noise percussion and a Freeverb-style reverb), so the audio is original and
// free of third-party licensing. "Happy Birthday to You" is a public-domain melody.
//
// Usage: node scripts/generate-audio.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 44100;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const AUDIO_DIR = join(ROOT, 'public', 'audio');
const SFX_DIR = join(ROOT, 'public', 'sfx');

// ---------------------------------------------------------------- utilities

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function biquadCoeffs(type, f0, q) {
  const w0 = (2 * Math.PI * Math.min(f0, SR * 0.45)) / SR;
  const cos = Math.cos(w0);
  const alpha = Math.sin(w0) / (2 * q);
  let b0, b1, b2;
  if (type === 'lp') [b0, b1, b2] = [(1 - cos) / 2, 1 - cos, (1 - cos) / 2];
  else if (type === 'hp') [b0, b1, b2] = [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2];
  else [b0, b1, b2] = [alpha, 0, -alpha];
  const a0 = 1 + alpha;
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: (-2 * cos) / a0, a2: (1 - alpha) / a0 };
}

/** In-place biquad. `freqAt` may be a number or a function of the sample index (for sweeps). */
function biquad(buf, type, freqAt, q = 0.707) {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  let c = biquadCoeffs(type, typeof freqAt === 'number' ? freqAt : freqAt(0), q);
  for (let i = 0; i < buf.length; i++) {
    if (typeof freqAt === 'function' && i % 32 === 0) c = biquadCoeffs(type, freqAt(i), q);
    const x = buf[i];
    const y = c.b0 * x + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    buf[i] = y;
  }
  return buf;
}

class Mix {
  constructor(seconds) {
    const n = Math.ceil(seconds * SR);
    this.L = new Float32Array(n);
    this.R = new Float32Array(n);
    this.sL = new Float32Array(n);
    this.sR = new Float32Array(n);
  }
  /** Adds a mono buffer with equal-power panning and a reverb send amount. */
  add(buf, startSec, gain = 1, pan = 0, send = 0.3) {
    const start = Math.round(startSec * SR);
    const gl = Math.cos(((pan + 1) * Math.PI) / 4) * gain;
    const gr = Math.sin(((pan + 1) * Math.PI) / 4) * gain;
    const end = Math.min(buf.length, this.L.length - start);
    for (let i = Math.max(0, -start); i < end; i++) {
      const v = buf[i];
      this.L[start + i] += v * gl;
      this.R[start + i] += v * gr;
      this.sL[start + i] += v * gl * send;
      this.sR[start + i] += v * gr * send;
    }
  }
}

// ---------------------------------------------------------------- instruments

/** Additive bell: partials = [[ratio, amplitude, decaySeconds], ...]. */
function bell(freq, partials, length, attack = 0.002, detune = 0) {
  const n = Math.ceil(length * SR);
  const out = new Float32Array(n);
  for (const [ratio, amp, decay] of partials) {
    const f = freq * ratio * (1 + detune);
    if (f > SR * 0.45) continue;
    const w = (2 * Math.PI * f) / SR;
    const k = Math.exp(-1 / (decay * SR));
    let env = amp;
    for (let i = 0; i < n; i++) {
      out[i] += Math.sin(w * i) * env;
      env *= k;
    }
  }
  const a = Math.max(1, Math.round(attack * SR));
  for (let i = 0; i < a && i < n; i++) out[i] *= i / a;
  const r = Math.round(0.02 * SR);
  for (let i = 0; i < r; i++) out[n - 1 - i] *= i / r;
  return out;
}

const musicBox = (m) =>
  bell(mtof(m), [[1, 1, 1.5], [2, 0.22, 0.45], [4.18, 0.1, 0.12], [6.27, 0.06, 0.05]], 2.4, 0.0015);
const glock = (m) =>
  bell(mtof(m), [[1, 1, 1.1], [2.76, 0.38, 0.22], [5.4, 0.2, 0.08], [8.93, 0.08, 0.035]], 2.0, 0.001);
const celesta = (m) =>
  bell(mtof(m), [[1, 1, 1.4], [2, 0.3, 0.5], [3, 0.08, 0.2], [4.02, 0.04, 0.08]], 2.2, 0.004);

/** Karplus–Strong plucked string with fractional-delay tuning. */
function pluck(m, seconds, { t60 = 1.5, bright = 0.6, seed = 1 } = {}) {
  const freq = mtof(m);
  const n = Math.ceil(seconds * SR);
  const out = new Float32Array(n);
  const P = SR / freq;
  let N = Math.floor(P - 0.5);
  let d = P - N - 0.5;
  if (d < 0.1) { N -= 1; d += 1; }
  const C = (1 - d) / (1 + d);
  const g = Math.pow(0.001, 1 / (freq * t60));
  const line = new Float32Array(N);
  const rnd = mulberry32(seed);
  let lp = 0, mean = 0;
  for (let i = 0; i < N; i++) {
    lp += bright * (rnd() * 2 - 1 - lp);
    line[i] = lp;
    mean += lp;
  }
  mean /= N;
  for (let i = 0; i < N; i++) line[i] -= mean;
  let idx = 0, prev = 0, apIn = 0, apOut = 0;
  for (let i = 0; i < n; i++) {
    const x = line[idx];
    out[i] = x;
    const avg = 0.5 * (x + prev) * g;
    prev = x;
    const y = C * avg + apIn - C * apOut;
    apIn = avg; apOut = y;
    line[idx] = y;
    idx = (idx + 1) % N;
  }
  const r = Math.round(0.03 * SR);
  for (let i = 0; i < r; i++) out[n - 1 - i] *= i / r;
  return out;
}

const harp = (m, seed) => pluck(m, 3, { t60: 2.6, bright: 0.75, seed });

function pizzBass(m, seed) {
  const body = pluck(m, 1.4, { t60: 0.8, bright: 0.35, seed });
  const f = mtof(m);
  for (let i = 0; i < body.length; i++) {
    body[i] = body[i] * 0.8 + Math.sin((2 * Math.PI * f * i) / SR) * Math.exp(-i / (0.32 * SR)) * 0.55;
  }
  for (let i = 0; i < 40; i++) body[i] *= i / 40;
  return biquad(body, 'lp', 1400);
}

function polyBlep(t, dt) {
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
}

/** Warm detuned-saw pad voice, low-passed, with slow attack and release. */
function padVoice(m, seconds, { attack = 0.5, release = 0.9, cutoff = 1500, seed = 1 } = {}) {
  const total = seconds + release;
  const n = Math.ceil(total * SR);
  const out = new Float32Array(n);
  const rnd = mulberry32(seed);
  const base = mtof(m);
  for (const cents of [-9, 0, 8]) {
    const f = base * Math.pow(2, cents / 1200);
    const dt = f / SR;
    let ph = rnd();
    for (let i = 0; i < n; i++) {
      out[i] += (2 * ph - 1 - polyBlep(ph, dt)) / 3;
      ph += dt;
      if (ph >= 1) ph -= 1;
    }
  }
  biquad(out, 'lp', cutoff, 0.6);
  biquad(out, 'lp', cutoff * 1.4, 0.6);
  const a = attack * SR, s = seconds * SR, r = release * SR;
  for (let i = 0; i < n; i++) {
    let env = i < a ? i / a : 1;
    if (i > s) env *= Math.max(0, 1 - (i - s) / r);
    out[i] *= env * env;
  }
  return out;
}

function noise(seconds, seed) {
  const rnd = mulberry32(seed);
  const out = new Float32Array(Math.ceil(seconds * SR));
  for (let i = 0; i < out.length; i++) out[i] = rnd() * 2 - 1;
  return out;
}

function envelope(buf, attack, decay) {
  const a = Math.max(1, attack * SR);
  for (let i = 0; i < buf.length; i++) {
    buf[i] *= (i < a ? i / a : 1) * Math.exp(-Math.max(0, i - a) / (decay * SR));
  }
  return buf;
}

function kick() {
  const n = Math.ceil(0.5 * SR);
  const out = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = 46 + 110 * Math.exp(-t / 0.035);
    ph += (2 * Math.PI * f) / SR;
    out[i] = Math.sin(ph) * Math.exp(-t / 0.22);
  }
  for (let i = 0; i < 30; i++) out[i] *= i / 30;
  return out;
}

function clap(seed) {
  const out = biquad(noise(0.35, seed), 'bp', 1300, 0.9);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const bursts = [0, 0.011, 0.022].reduce((s, o) => s + (t >= o ? Math.exp(-(t - o) / 0.006) : 0), 0);
    out[i] *= 0.6 * bursts + Math.exp(-t / 0.09) * (t > 0.022 ? 1 : 0);
  }
  return out;
}

function snap(seed) {
  const out = envelope(biquad(noise(0.15, seed), 'bp', 2600, 1.4), 0.001, 0.035);
  for (let i = 0; i < out.length; i++) out[i] += Math.sin((2 * Math.PI * 1850 * i) / SR) * Math.exp(-i / (0.012 * SR)) * 0.3;
  return out;
}

const shaker = (seed) => envelope(biquad(noise(0.12, seed), 'hp', 6500, 0.8), 0.008, 0.035);

function tambourine(seed) {
  const out = envelope(biquad(noise(0.3, seed), 'hp', 7000, 0.7), 0.001, 0.09);
  for (const f of [5200, 7150, 9300]) {
    for (let i = 0; i < out.length; i++) out[i] += Math.sin((2 * Math.PI * f * i) / SR) * Math.exp(-i / (0.07 * SR)) * 0.08;
  }
  return out;
}

/** Rising filtered-noise swell that resolves into a soft cymbal shimmer. */
function swell(seconds, seed) {
  const out = noise(seconds, seed);
  biquad(out, 'bp', (i) => 600 + 7000 * Math.pow(i / out.length, 2), 0.8);
  for (let i = 0; i < out.length; i++) out[i] *= Math.pow(i / out.length, 2.2);
  return out;
}

const splash = (seed) => envelope(biquad(noise(2.5, seed), 'hp', 5000, 0.6), 0.002, 0.7);

// ---------------------------------------------------------------- effects & output

/** Freeverb (Jezar) — 8 lowpass-feedback combs + 4 allpasses per channel. */
function freeverb(inL, inR, { room = 0.84, damp = 0.28, wet = 0.32 } = {}) {
  const combT = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const apT = [556, 441, 341, 225];
  const run = (input, spread) => {
    const out = new Float32Array(input.length);
    const combs = combT.map((t) => ({ buf: new Float32Array(t + spread), i: 0, store: 0 }));
    const aps = apT.map((t) => ({ buf: new Float32Array(t + spread), i: 0 }));
    for (let n = 0; n < input.length; n++) {
      const x = input[n] * 0.015;
      let acc = 0;
      for (const c of combs) {
        const y = c.buf[c.i];
        c.store = y * (1 - damp) + c.store * damp;
        c.buf[c.i] = x + c.store * room;
        c.i = (c.i + 1) % c.buf.length;
        acc += y;
      }
      for (const a of aps) {
        const b = a.buf[a.i];
        a.buf[a.i] = acc + b * 0.5;
        a.i = (a.i + 1) % a.buf.length;
        acc = b - acc;
      }
      out[n] = acc * wet * 3;
    }
    return out;
  };
  return [run(inL, 0), run(inR, 23)];
}

function master(mix, { peakDb = -1.2, fadeOut = 0.4 } = {}) {
  const [rL, rR] = freeverb(mix.sL, mix.sR);
  const L = mix.L, R = mix.R;
  for (let i = 0; i < L.length; i++) { L[i] += rL[i]; R[i] += rR[i]; }
  biquad(L, 'hp', 28); biquad(R, 'hp', 28);
  let peak = 0;
  for (let i = 0; i < L.length; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const drive = 1.4;
  const norm = Math.tanh(drive);
  const target = Math.pow(10, peakDb / 20);
  for (let i = 0; i < L.length; i++) {
    L[i] = (Math.tanh((L[i] / peak) * drive) / norm) * target;
    R[i] = (Math.tanh((R[i] / peak) * drive) / norm) * target;
  }
  const f = Math.round(fadeOut * SR);
  for (let i = 0; i < f; i++) {
    const g = i / f;
    L[L.length - 1 - i] *= g;
    R[R.length - 1 - i] *= g;
  }
  return [L, R];
}

function writeWav(path, L, R) {
  const n = L.length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), 46 + i * 4);
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, buf);
  console.log(`wrote ${path.replace(ROOT + '/', '')} (${(n / SR).toFixed(2)}s, ${(buf.length / 1e6).toFixed(1)} MB)`);
}

// ---------------------------------------------------------------- arrangement helpers

function makeArranger(mix, bpm, beatsPerBar) {
  const spb = 60 / bpm;
  const T = (bar, beat = 0) => (bar * beatsPerBar + beat) * spb;
  let seed = 100;
  const nextSeed = () => ++seed;
  return {
    T,
    spb,
    melody(notes, barOffset, inst, gain, pan, send) {
      for (const [bar, beat, , m] of notes) mix.add(inst(m), T(barOffset + bar, beat), gain, pan, send);
    },
    pad(chord, bar, bars, gain = 0.06, opts = {}) {
      chord.forEach((m, i) =>
        mix.add(padVoice(m, bars * beatsPerBar * spb, { seed: nextSeed(), ...opts }), T(bar), gain, i % 2 ? 0.45 : -0.45, 0.35),
      );
    },
    hit(buf, bar, beat, gain, pan = 0, send = 0.08) {
      mix.add(buf, T(bar, beat), gain, pan, send);
    },
    seed: nextSeed,
  };
}

function arpeggio(chord, octaveShift = 12) {
  const [a, b, c] = chord.map((m) => m + octaveShift);
  return [a, b, c, a + 12, c, b, a, b];
}

// ---------------------------------------------------------------- track 1: Magical Sky Celebration

function magicalSky() {
  const bpm = 120, bpb = 4, seconds = 45;
  const mix = new Mix(seconds);
  const A = makeArranger(mix, bpm, bpb);
  const { T } = A;
  const C = {
    Dadd9: [62, 66, 69, 76], D: [62, 66, 69], Bm: [59, 62, 66], G: [59, 62, 67], A: [61, 64, 69],
    Em: [59, 64, 67], 'D/F#': [62, 66, 69], A7: [61, 64, 67],
  };
  const ROOTS = { D: 38, Bm: 47, G: 43, A: 45, Em: 40, 'D/F#': 42, A7: 45 };

  const melodyA = [
    [0, 0, 1, 81], [0, 1, 0.5, 78], [0, 1.5, 0.5, 81], [0, 2, 1.5, 86], [0, 3.5, 0.5, 85],
    [1, 0, 1, 83], [1, 1, 0.5, 78], [1, 1.5, 0.5, 83], [1, 2, 1, 86], [1, 3, 0.5, 85], [1, 3.5, 0.5, 83],
    [2, 0, 1, 79], [2, 1, 0.5, 83], [2, 1.5, 0.5, 86], [2, 2, 1, 88], [2, 3, 0.5, 86], [2, 3.5, 0.5, 83],
    [3, 0, 1.5, 85], [3, 1.5, 0.5, 81], [3, 2, 1, 88], [3, 3, 1, 85],
  ];
  const melodyB = [
    [0, 0, 0.5, 86], [0, 0.5, 0.5, 86], [0, 1, 1, 90], [0, 2, 0.5, 88], [0, 2.5, 0.5, 86], [0, 3, 1, 81],
    [1, 0, 0.5, 85], [1, 0.5, 0.5, 85], [1, 1, 1, 88], [1, 2, 0.5, 86], [1, 2.5, 0.5, 85], [1, 3, 1, 81],
    [2, 0, 0.5, 83], [2, 0.5, 0.5, 85], [2, 1, 1, 86], [2, 2, 1, 90], [2, 3, 0.5, 88], [2, 3.5, 0.5, 86],
    [3, 0, 1.5, 88], [3, 1.5, 0.5, 86], [3, 2, 1, 83], [3, 3, 1, 81],
  ];
  const melodyC = [
    [0, 0, 1.5, 83], [0, 1.5, 0.5, 81], [0, 2, 2, 79],
    [1, 0, 1.5, 81], [1, 1.5, 0.5, 78], [1, 2, 2, 74],
    [2, 0, 1, 79], [2, 1, 1, 83], [2, 2, 2, 88],
    [3, 0, 1, 85], [3, 1, 0.5, 83], [3, 1.5, 0.5, 81], [3, 2, 2, 76],
    [4, 0, 1, 78], [4, 1, 1, 81], [4, 2, 2, 86],
    [5, 0, 1, 88], [5, 1, 1, 85], [5, 2, 1, 81], [5, 3, 1, 85],
  ];

  // Intro (bars 0–1): harp glissando, twinkles, pad swell, glockenspiel motif.
  [62, 64, 66, 69, 71, 74, 76, 78, 81, 83, 86, 88, 90, 93].forEach((m, i) =>
    mix.add(harp(m, A.seed()), 0.05 + i * 0.072 - i * i * 0.0012, 0.32, -0.6 + i * 0.09, 0.5),
  );
  A.pad(C.Dadd9, 0, 2, 0.07, { attack: 1.4 });
  const rnd = mulberry32(42);
  const penta = [86, 88, 90, 93, 95, 98];
  for (let i = 0; i < 14; i++) {
    const t = 0.4 + i * 0.24 + rnd() * 0.1;
    mix.add(celesta(penta[Math.floor(rnd() * penta.length)]), t, 0.16 * (1 - i / 18), rnd() * 1.6 - 0.8, 0.6);
  }
  [81, 86, 90, 93].forEach((m, i) => mix.add(glock(m), T(1, i), 0.24, 0.3, 0.45));
  [81, 83, 85].forEach((m, i) => mix.add(musicBox(m), T(1, 3 + i * 0.25 - 0.5), 0.2, -0.15, 0.35));

  const section = (startBar, chords, opts) => {
    chords.forEach((name, i) => {
      const bar = startBar + i;
      const [chordName, chordName2] = name.split('|');
      const ch = C[chordName];
      A.pad(ch, bar, chordName2 ? 0.5 : 1, opts.pad);
      if (chordName2) A.pad(C[chordName2], bar + 0.5, 0.5, opts.pad);
      const root = ROOTS[chordName];
      if (opts.bass === 'half') {
        A.hit(pizzBass(root, A.seed()), bar, 0, 0.5, 0, 0.04);
        A.hit(pizzBass(root + 7, A.seed()), bar, 2, 0.42, 0, 0.04);
      } else if (opts.bass === 'bounce') {
        [[0, root], [1, root + 12], [2, root + 7], [3, root + 12]].forEach(([b, m]) => A.hit(pizzBass(m, A.seed()), bar, b, 0.46, 0, 0.04));
      }
      if (opts.arp) arpeggio(ch).forEach((m, k) => A.hit(celesta(m), bar, k * 0.5, opts.arp, k % 2 ? 0.35 : -0.35, 0.4));
      for (let b = 0; b < 4; b++) {
        if (opts.kick?.includes(b)) A.hit(kick(), bar, b, 0.62, 0, 0.03);
        if (opts.clap && (b === 1 || b === 3)) A.hit(clap(A.seed()), bar, b, 0.3, -0.15, 0.14);
        if (opts.snap && (b === 1 || b === 3)) A.hit(snap(A.seed()), bar, b, 0.22, -0.3, 0.16);
        if (opts.tamb && (b === 1 || b === 3)) A.hit(tambourine(A.seed()), bar, b + 0.5, 0.11, 0.4, 0.1);
        if (opts.shaker) [0, 0.5].forEach((o) => A.hit(shaker(A.seed()), bar, b + o, o ? opts.shaker : opts.shaker * 0.6, 0.45, 0.06));
      }
    });
  };

  // Verse (bars 2–5)
  section(2, ['D', 'Bm', 'G', 'A'], { pad: 0.045, bass: 'half', snap: true, shaker: 0.1 });
  A.melody(melodyA, 2, musicBox, 0.42, -0.1, 0.35);
  // Chorus (bars 6–9)
  section(6, ['D', 'A', 'Bm', 'G'], { pad: 0.05, bass: 'bounce', kick: [0, 2], clap: true, tamb: true, shaker: 0.12, arp: 0.07 });
  A.melody(melodyB, 6, musicBox, 0.44, -0.1, 0.35);
  A.melody(melodyB, 6, (m) => glock(m + 12), 0.1, 0.35, 0.4);
  // Gentle reading section (bars 10–15)
  section(10, ['G', 'D/F#', 'Em', 'A', 'D', 'A'], { pad: 0.05, bass: 'half', kick: [0], snap: true, shaker: 0.08, arp: 0.1 });
  A.melody(melodyC, 10, musicBox, 0.4, -0.1, 0.4);
  // Finale (bars 16–19), lift with syncopated kick and glockenspiel doubling
  section(16, ['D', 'A', 'Bm', 'G'], { pad: 0.055, bass: 'bounce', kick: [0, 2], clap: true, tamb: true, shaker: 0.13, arp: 0.08 });
  for (let bar = 16; bar < 20; bar++) A.hit(kick(), bar, 2.5, 0.4, 0, 0.03);
  A.melody(melodyB, 16, musicBox, 0.46, -0.1, 0.35);
  A.melody(melodyB, 16, (m) => glock(m + 12), 0.14, 0.35, 0.4);
  // Turnaround (bar 20) and final chord (bar 21)
  section(20, ['Em|A7'], { pad: 0.05, kick: [0], clap: true, shaker: 0.12 });
  A.hit(pizzBass(40, A.seed()), 20, 0, 0.46); A.hit(pizzBass(45, A.seed()), 20, 2, 0.46);
  A.melody([[0, 0, 1, 83], [0, 1, 1, 86], [0, 2, 1, 85], [0, 3, 1, 88]], 20, musicBox, 0.46, -0.1, 0.35);
  [3, 3.25, 3.5, 3.75].forEach((b, i) => A.hit(glock(88 + [0, 2, 5, 7][i]), 20, b, 0.12, 0.4, 0.4));
  A.hit(swell(T(1), A.seed()), 20, 0, 0.1, 0, 0.2);
  // Final hit
  A.pad([50, 57, 62, 66, 69], 21, 1.4, 0.06, { attack: 0.05, release: 1.6 });
  A.hit(pizzBass(38, A.seed()), 21, 0, 0.6, 0, 0.05);
  A.hit(pizzBass(26, A.seed()), 21, 0, 0.35, 0, 0.02);
  A.hit(kick(), 21, 0, 0.7, 0, 0.05);
  A.hit(splash(A.seed()), 21, 0, 0.09, 0.2, 0.3);
  [86, 90, 93, 98].forEach((m, i) => mix.add(musicBox(m), T(21) + i * 0.06, 0.4, -0.2 + i * 0.13, 0.45));
  [74, 78, 81, 86, 90, 93, 98].forEach((m, i) => mix.add(harp(m, A.seed()), T(21) + 0.05 + i * 0.05, 0.22, -0.5 + i * 0.16, 0.55));
  [98, 102, 105].forEach((m, i) => mix.add(glock(m), T(21) + 0.4 + i * 0.12, 0.08, 0.5, 0.6));

  const [L, R] = master(mix);
  writeWav(join(AUDIO_DIR, 'magical-sky-celebration.wav'), L, R);
}

// ---------------------------------------------------------------- track 2: Happy Birthday Music Box (3/4)

function happyBirthday() {
  const bpm = 100, bpb = 3, seconds = 45;
  const mix = new Mix(seconds);
  const A = makeArranger(mix, bpm, bpb);
  const { T } = A;
  const C = { D: [62, 66, 69], A: [61, 64, 69], A7: [61, 64, 67], G: [62, 67, 71], Em: [64, 67, 71], D7: [62, 66, 72] };
  const ROOTS = { D: 38, A: 45, A7: 45, G: 43, Em: 40, D7: 38 };

  // Public-domain melody, written as [bar, beat, length, midi] relative to the first full bar.
  const pickup = (bar) => [[bar, 2, 0.75, 81], [bar, 2.75, 0.25, 81]];
  const phrase = (withEndPickup) => [
    [0, 0, 1, 83], [0, 1, 1, 81], [0, 2, 1, 86],
    [1, 0, 2, 85], ...pickup(1),
    [2, 0, 1, 83], [2, 1, 1, 81], [2, 2, 1, 88],
    [3, 0, 2, 86], ...pickup(3),
    [4, 0, 1, 93], [4, 1, 1, 90], [4, 2, 1, 86],
    [5, 0, 1, 85], [5, 1, 1, 83], [5, 2, 0.75, 91], [5, 2.75, 0.25, 91],
    [6, 0, 1, 90], [6, 1, 1, 86], [6, 2, 1, 88],
    [7, 0, withEndPickup ? 2 : 3, 86], ...(withEndPickup ? pickup(7) : []),
  ];
  const chords = ['D', 'A', 'A', 'D', 'D7', 'G', 'D|A', 'D'];

  const waltz = (startBar, names, { celestaGain = 0.1, glockGain = 0, kickOn = false, shakerGain = 0 } = {}) => {
    names.forEach((name, i) => {
      const bar = startBar + i;
      const [n1, n2] = name.split('|');
      A.hit(pizzBass(ROOTS[n1], A.seed()), bar, 0, 0.5, 0, 0.05);
      A.pad(C[n1], bar, 1, 0.04);
      [1, 2].forEach((beat) => {
        const ch = C[beat === 2 && n2 ? n2 : n1];
        ch.forEach((m, k) => A.hit(celesta(m + 12), bar, beat, celestaGain / 1.6, (k - 1) * 0.3, 0.35));
        if (glockGain) A.hit(glock(ch[2] + 12), bar, beat, glockGain, 0.4, 0.4);
        if (shakerGain) A.hit(shaker(A.seed()), bar, beat, shakerGain, 0.45, 0.05);
      });
      if (kickOn) A.hit(kick(), bar, 0, 0.5, 0, 0.03);
    });
  };

  // Intro (bars 0–1) with harp glissando and twinkles; pickup into the first verse.
  [62, 64, 66, 69, 71, 74, 76, 78, 81, 83, 86, 88, 90, 93].forEach((m, i) =>
    mix.add(harp(m, A.seed()), 0.05 + i * 0.08, 0.3, -0.6 + i * 0.09, 0.5),
  );
  A.pad([62, 66, 69, 76], 0, 2, 0.06, { attack: 1.2 });
  const rnd = mulberry32(9);
  for (let i = 0; i < 10; i++) {
    mix.add(celesta([86, 88, 90, 93, 95][Math.floor(rnd() * 5)]), 0.5 + i * 0.22 + rnd() * 0.08, 0.14 * (1 - i / 14), rnd() * 1.4 - 0.7, 0.6);
  }
  A.melody(pickup(1), 0, musicBox, 0.45, -0.1, 0.35);

  // First pass (bars 2–9): music box over a light waltz.
  waltz(2, chords, { celestaGain: 0.09 });
  A.melody(phrase(true), 2, musicBox, 0.45, -0.1, 0.35);
  // Second pass (bars 10–17): fuller.
  waltz(10, chords, { celestaGain: 0.1, glockGain: 0.06, kickOn: true, shakerGain: 0.08 });
  A.melody(phrase(false), 10, musicBox, 0.47, -0.1, 0.35);
  A.melody(phrase(false), 10, (m) => glock(m + 12), 0.1, 0.35, 0.4);
  // Interlude (bars 18–21): celesta arpeggios, pickup into the final phrase.
  ['G', 'D', 'Em', 'A7'].forEach((name, i) => {
    const bar = 18 + i;
    A.hit(pizzBass(ROOTS[name], A.seed()), bar, 0, 0.45, 0, 0.05);
    A.pad(C[name], bar, 1, 0.045);
    const [a, b, c] = C[name].map((m) => m + 12);
    [a, b, c, a + 12, c, b].forEach((m, k) => A.hit(celesta(m), bar, k * 0.5, 0.12, k % 2 ? 0.35 : -0.35, 0.4));
    A.hit(shaker(A.seed()), bar, 1, 0.06, 0.45);
    A.hit(shaker(A.seed()), bar, 2, 0.06, 0.45);
  });
  A.melody([[21, 2, 0.75, 91], [21, 2.75, 0.25, 91]], 0, musicBox, 0.45, -0.1, 0.35);
  // Final phrase (bar 22) and ending chord (bar 23).
  waltz(22, ['D|A'], { celestaGain: 0.1, glockGain: 0.06, kickOn: true });
  A.melody([[22, 0, 1, 90], [22, 1, 1, 86], [22, 2, 1, 88]], 0, musicBox, 0.48, -0.1, 0.35);
  A.melody([[22, 0, 1, 90], [22, 1, 1, 86], [22, 2, 1, 88]], 0, (m) => glock(m + 12), 0.12, 0.35, 0.4);
  A.hit(swell(T(1), A.seed()), 22, 0, 0.08, 0, 0.2);
  A.pad([50, 57, 62, 66, 69], 23, 1.6, 0.06, { attack: 0.05, release: 1.6 });
  A.hit(pizzBass(38, A.seed()), 23, 0, 0.6);
  A.hit(pizzBass(26, A.seed()), 23, 0, 0.35);
  A.hit(kick(), 23, 0, 0.6);
  A.hit(splash(A.seed()), 23, 0, 0.08, 0.2, 0.3);
  [86, 90, 93, 98].forEach((m, i) => mix.add(musicBox(m), T(23) + i * 0.06, 0.42, -0.2 + i * 0.13, 0.45));
  [74, 78, 81, 86, 90, 93, 98].forEach((m, i) => mix.add(harp(m, A.seed()), T(23) + 0.05 + i * 0.05, 0.22, -0.5 + i * 0.16, 0.55));

  const [L, R] = master(mix);
  writeWav(join(AUDIO_DIR, 'happy-birthday-music-box.wav'), L, R);
}

// ---------------------------------------------------------------- sound effects

function sfx() {
  const render = (seconds, build, file, peakDb = -3) => {
    const mix = new Mix(seconds);
    build(mix);
    const [L, R] = master(mix, { peakDb, fadeOut: 0.05 });
    writeWav(join(SFX_DIR, file), L, R);
  };
  render(2.2, (m) => [86, 90, 93, 98].forEach((n, i) => m.add(glock(n), 0.01 + i * 0.07, 0.5, -0.4 + i * 0.25, 0.5)), 'chime.wav');
  render(2.0, (m) => {
    const rnd = mulberry32(5);
    for (let i = 0; i < 12; i++) m.add(celesta(98 - i - Math.floor(rnd() * 3)), 0.01 + i * 0.045, 0.4 * (1 - i / 16), rnd() * 1.6 - 0.8, 0.6);
  }, 'sparkle.wav');
  render(0.6, (m) => {
    const burst = envelope(biquad(noise(0.25, 3), 'bp', 2200, 0.7), 0.0005, 0.018);
    const thump = new Float32Array(Math.ceil(0.2 * SR));
    for (let i = 0; i < thump.length; i++) thump[i] = Math.sin((2 * Math.PI * 140 * i) / SR) * Math.exp(-i / (0.03 * SR));
    m.add(burst, 0.005, 0.8, 0, 0.25);
    m.add(thump, 0.005, 0.5, 0, 0.1);
  }, 'pop.wav', -6);
  render(1.2, (m) => {
    const w = noise(1.0, 11);
    biquad(w, 'bp', (i) => 350 + 2600 * Math.sin((Math.PI * i) / w.length) ** 2, 1.1);
    for (let i = 0; i < w.length; i++) w[i] *= Math.sin((Math.PI * i) / w.length) ** 2;
    m.add(w, 0.01, 1, 0, 0.3);
  }, 'whoosh.wav', -8);
}

magicalSky();
happyBirthday();
sfx();
