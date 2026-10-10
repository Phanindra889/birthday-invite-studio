// Checks the beat detector against the built-in tracks, whose beat grids are known exactly.
//   npm run test:beats
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { detectBeats } from '../src/audio/beatDetection';
import { BUILTIN_TRACKS, beatGrid } from '../src/shared/music';

const root = path.resolve(import.meta.dirname, '..');

function readWavMono(file: string): { samples: Float32Array; rate: number } {
  const buf = readFileSync(file);
  let p = 12;
  let rate = 44100, channels = 2, bits = 16, data: Buffer | null = null;
  while (p < buf.length - 8) {
    const id = buf.toString('ascii', p, p + 4);
    const size = buf.readUInt32LE(p + 4);
    if (id === 'fmt ') {
      channels = buf.readUInt16LE(p + 10);
      rate = buf.readUInt32LE(p + 12);
      bits = buf.readUInt16LE(p + 22);
    } else if (id === 'data') data = buf.subarray(p + 8, p + 8 + size);
    p += 8 + size + (size % 2);
  }
  if (!data || bits !== 16) throw new Error('Only 16-bit PCM WAV is supported here');
  const frames = data.length / (2 * channels);
  const samples = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    let s = 0;
    for (let c = 0; c < channels; c++) s += data.readInt16LE((i * channels + c) * 2);
    samples[i] = s / channels / 32768;
  }
  return { samples, rate };
}

let failed = false;
for (const track of BUILTIN_TRACKS) {
  const { samples, rate } = readWavMono(path.join(root, 'public', track.file));
  const t0 = performance.now();
  const res = detectBeats(samples, rate, { beatsPerBar: track.beatsPerBar });
  const ms = performance.now() - t0;
  const truth = beatGrid(track.bpm, track.offset, track.duration);
  // Detected beats should sit on the true grid (allowing half/double tempo).
  const errors = res.beats.map((b) => Math.min(...truth.map((g) => Math.abs(g - b))));
  const onGrid = errors.filter((e) => e < 0.05).length / Math.max(1, errors.length);
  const meanErr = errors.reduce((a, b) => a + b, 0) / Math.max(1, errors.length);
  const ratio = res.bpm / track.bpm;
  const tempoOk = [0.5, 1, 2].some((r) => Math.abs(ratio - r) < 0.03);
  const firstDownbeat = res.beats[res.downbeatOffset] ?? NaN;
  const barLen = (60 / track.bpm) * track.beatsPerBar;
  const downbeatPhase = ((firstDownbeat - track.offset) % barLen + barLen) % barLen;
  const downbeatOk = Math.min(downbeatPhase, barLen - downbeatPhase) < 0.06;
  const pass = tempoOk && onGrid > 0.9;
  if (!pass) failed = true;
  console.log(
    `${pass ? 'PASS' : 'FAIL'} ${track.title}: detected ${res.bpm} BPM (true ${track.bpm}), ${res.beats.length} beats, ` +
      `${(onGrid * 100).toFixed(0)}% within 50 ms of the grid, mean error ${(meanErr * 1000).toFixed(1)} ms, ` +
      `confidence ${res.confidence.toFixed(2)}, downbeat ${downbeatOk ? 'aligned' : `off by ${downbeatPhase.toFixed(2)}s`}, ${ms.toFixed(0)} ms`,
  );
}
process.exitCode = failed ? 1 : 0;
