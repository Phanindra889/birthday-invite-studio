// Prints every beat-synced cue and its distance to the nearest beat / downbeat.
//   npx tsx scripts/check-sync.ts [config.json]
import { readFileSync } from 'node:fs';
import { DEFAULT_CONFIG, normalizeConfig } from '../src/shared/config';
import { computeCues } from '../src/shared/cues';

const config = normalizeConfig(process.argv[2] ? JSON.parse(readFileSync(process.argv[2], 'utf8')) : DEFAULT_CONFIG);
const cues = computeCues(config);
const fps = cues.timeline.fps;
const nearest = (t: number, list: number[]) => Math.min(...list.map((b) => Math.abs(b - t)));
const beats = cues.beats.map((b) => b.t);
const downs = cues.beats.filter((b) => b.downbeat).map((b) => b.t);
let worst = 0;
for (const s of cues.timeline.scenes) {
  for (const [key, frame] of Object.entries(cues.scenes[s.id] ?? {})) {
    const t = frame / fps;
    const off = nearest(t, beats);
    worst = Math.max(worst, off);
    console.log(`${s.id.padEnd(14)} ${key.padEnd(9)} ${t.toFixed(2).padStart(6)}s  beat ±${(off * 1000).toFixed(0)}ms${nearest(t, downs) < 0.02 ? '  (downbeat)' : ''}`);
  }
}
console.log(`confetti bursts: ${cues.confetti.map((c) => (c.frame / fps).toFixed(2)).join(', ')}s`);
console.log(`sound effects: ${cues.sfx.length}, worst cue offset from a beat: ${(worst * 1000).toFixed(0)} ms (1 frame = ${(1000 / fps).toFixed(0)} ms)`);
