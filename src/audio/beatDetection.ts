// Beat detection for uploaded music (runs in the browser and in Node).
//
// 1. Spectral-flux onset envelope (log-magnitude STFT, ~86 frames/s).
// 2. Tempo from the autocorrelation of the envelope, weighted toward ~120 BPM.
// 3. Beat positions with dynamic programming (Ellis 2007, "Beat Tracking by Dynamic Programming").
// 4. Downbeat phase from low-frequency (kick/bass) onset energy.

export interface BeatAnalysis {
  bpm: number;
  /** Beat times in seconds. */
  beats: number[];
  /** 0..1 — how strongly the detected beats line up with onsets. */
  confidence: number;
  beatsPerBar: number;
  /** Index of the first downbeat within `beats`. */
  downbeatOffset: number;
}

const TARGET_RATE = 11025;
const N = 512;
const HOP = 128;

function fft(re: Float64Array, im: Float64Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ar = re[i + k], ai = im[i + k];
        const br = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const bi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ar + br; im[i + k] = ai + bi;
        re[i + k + len / 2] = ar - br; im[i + k + len / 2] = ai - bi;
        const t = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = t;
      }
    }
  }
}

function downsample(samples: Float32Array, rate: number): { data: Float32Array; rate: number } {
  const factor = Math.max(1, Math.round(rate / TARGET_RATE));
  if (factor === 1) return { data: samples, rate };
  const out = new Float32Array(Math.floor(samples.length / factor));
  for (let i = 0; i < out.length; i++) {
    let s = 0;
    for (let k = 0; k < factor; k++) s += samples[i * factor + k];
    out[i] = s / factor;
  }
  return { data: out, rate: rate / factor };
}

function normalizeEnvelope(env: Float64Array, fps: number): Float64Array {
  const win = Math.max(1, Math.round(0.4 * fps));
  const out = new Float64Array(env.length);
  let sum = 0;
  const pre: number[] = [0];
  for (let i = 0; i < env.length; i++) pre.push((sum += env[i]));
  for (let i = 0; i < env.length; i++) {
    const a = Math.max(0, i - win), b = Math.min(env.length, i + win + 1);
    out[i] = Math.max(0, env[i] - (pre[b] - pre[a]) / (b - a));
  }
  let mean = 0;
  for (const v of out) mean += v;
  mean /= out.length || 1;
  let sd = 0;
  for (const v of out) sd += (v - mean) ** 2;
  sd = Math.sqrt(sd / (out.length || 1)) || 1;
  for (let i = 0; i < out.length; i++) out[i] /= sd;
  return out;
}

/** Onset strength envelopes (full band and < 200 Hz) at `fps` frames per second. */
export function onsetEnvelope(samples: Float32Array, sampleRate: number) {
  const { data, rate } = downsample(samples, sampleRate);
  const frames = Math.max(0, Math.floor((data.length - N) / HOP));
  const fps = rate / HOP;
  const win = new Float64Array(N);
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1));
  const lowBins = Math.max(2, Math.round((200 / rate) * N));
  const full = new Float64Array(frames);
  const low = new Float64Array(frames);
  let prev = new Float64Array(N / 2);
  const re = new Float64Array(N), im = new Float64Array(N);
  for (let f = 0; f < frames; f++) {
    for (let i = 0; i < N; i++) { re[i] = data[f * HOP + i] * win[i]; im[i] = 0; }
    fft(re, im);
    const mag = new Float64Array(N / 2);
    let flux = 0, fluxLow = 0;
    for (let k = 1; k < N / 2; k++) {
      mag[k] = Math.log1p(1000 * Math.hypot(re[k], im[k]));
      const d = mag[k] - prev[k];
      if (d > 0) { flux += d; if (k < lowBins) fluxLow += d; }
    }
    full[f] = flux;
    low[f] = fluxLow;
    prev = mag;
  }
  // Each value describes the change into frame f, centered at its window midpoint.
  const latency = N / 2 / rate;
  return { full: normalizeEnvelope(full, fps), low: normalizeEnvelope(low, fps), fps, latency };
}

function estimatePeriod(env: Float64Array, fps: number, minBpm: number, maxBpm: number): number {
  const minLag = Math.floor((60 / maxBpm) * fps);
  const maxLag = Math.ceil((60 / minBpm) * fps);
  const ac = new Float64Array(maxLag + 2);
  for (let lag = minLag - 1; lag <= maxLag + 1; lag++) {
    let s = 0;
    for (let i = lag; i < env.length; i++) s += env[i] * env[i - lag];
    ac[lag] = s / (env.length - lag);
  }
  const center = (60 / 120) * fps;
  let best = minLag, bestScore = -Infinity;
  for (let lag = minLag; lag <= maxLag; lag++) {
    // Favor lags whose double also correlates (true beat period) and tempos near 120 BPM.
    const w = Math.exp(-0.5 * (Math.log2(lag / center) / 0.9) ** 2);
    const s = (ac[lag] + 0.5 * (2 * lag <= maxLag + 1 ? ac[2 * lag] ?? 0 : 0)) * w;
    if (s > bestScore) { bestScore = s; best = lag; }
  }
  // Parabolic interpolation around the peak for a sub-frame period.
  const [a, b, c] = [ac[best - 1] ?? 0, ac[best], ac[best + 1] ?? 0];
  const denom = a - 2 * b + c;
  const delta = denom !== 0 ? Math.max(-0.5, Math.min(0.5, (0.5 * (a - c)) / denom)) : 0;
  return best + delta;
}

function trackBeats(env: Float64Array, period: number, tightness = 100): number[] {
  const n = env.length;
  const score = new Float64Array(n);
  const back = new Int32Array(n).fill(-1);
  const lo = Math.round(period / 2), hi = Math.round(period * 2);
  for (let t = 0; t < n; t++) {
    let best = 0, bestPrev = -1;
    for (let p = t - hi; p <= t - lo; p++) {
      if (p < 0) continue;
      const s = score[p] - tightness * Math.log((t - p) / period) ** 2;
      if (bestPrev < 0 || s > best) { best = s; bestPrev = p; }
    }
    score[t] = env[t] + (bestPrev >= 0 ? best : 0);
    back[t] = bestPrev;
  }
  let end = n - 1;
  for (let t = Math.max(0, n - Math.round(period)); t < n; t++) if (score[t] > score[end]) end = t;
  const beats: number[] = [];
  for (let t = end; t >= 0; t = back[t]) beats.unshift(t);
  return beats;
}

export function detectBeats(samples: Float32Array, sampleRate: number, opts: { minBpm?: number; maxBpm?: number; beatsPerBar?: number } = {}): BeatAnalysis {
  const beatsPerBar = opts.beatsPerBar ?? 4;
  const { full, low, fps, latency } = onsetEnvelope(samples, sampleRate);
  if (full.length < fps * 3) return { bpm: 0, beats: [], confidence: 0, beatsPerBar, downbeatOffset: 0 };
  const period = estimatePeriod(full, fps, opts.minBpm ?? 60, opts.maxBpm ?? 190);
  const frames = trackBeats(full, period);
  const beats = frames.map((f) => Math.round((f / fps + latency) * 1000) / 1000).filter((t) => t >= 0);

  // Confidence: onset strength on beats vs. halfway between beats.
  let on = 0, off = 0;
  for (const f of frames) {
    on += full[f] ?? 0;
    off += full[Math.round(f + period / 2)] ?? 0;
  }
  const confidence = Math.max(0, Math.min(1, (on - off) / (on + 1e-9)));

  // Downbeat phase: which beat position in the bar carries the most low-frequency energy.
  let downbeatOffset = 0, bestPhase = -Infinity;
  for (let ph = 0; ph < beatsPerBar; ph++) {
    let s = 0;
    for (let i = ph; i < frames.length; i += beatsPerBar) {
      const f = frames[i];
      s += Math.max(low[f] ?? 0, low[f + 1] ?? 0, low[f - 1] ?? 0);
    }
    if (s > bestPhase) { bestPhase = s; downbeatOffset = ph; }
  }

  // Report BPM from the median inter-beat interval of the tracked beats.
  const intervals = beats.slice(1).map((b, i) => b - beats[i]).sort((a, b) => a - b);
  const median = intervals[Math.floor(intervals.length / 2)] ?? period / fps;
  return { bpm: Math.round((60 / median) * 10) / 10, beats, confidence, beatsPerBar, downbeatOffset };
}

/** Min/max peak pairs for drawing a waveform. */
export function waveformPeaks(samples: Float32Array, buckets: number): Float32Array {
  const out = new Float32Array(buckets * 2);
  const size = Math.max(1, Math.floor(samples.length / buckets));
  for (let b = 0; b < buckets; b++) {
    let min = 0, max = 0;
    const end = Math.min(samples.length, (b + 1) * size);
    for (let i = b * size; i < end; i++) {
      const v = samples[i];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    out[b * 2] = min;
    out[b * 2 + 1] = max;
  }
  return out;
}

/** BPM from tap times (seconds), using the median interval of the last taps. */
export function tapTempo(taps: number[]): number | null {
  const recent = taps.slice(-9);
  if (recent.length < 3) return null;
  const d = recent.slice(1).map((t, i) => t - recent[i]).sort((a, b) => a - b);
  const med = d[Math.floor(d.length / 2)];
  return med > 0.2 && med < 2 ? Math.round((60 / med) * 10) / 10 : null;
}
