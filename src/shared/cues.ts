// Beat-synchronized cue schedule.
//
// Each scene declares *nominal* reveal times. When beat sync is on, every cue is moved
// to the closest suitable beat (or downbeat) so text, confetti and sound effects land on
// the music. The result is pure data computed from the config, so the editor preview,
// the timeline UI and the final render all see exactly the same frames.

import type { InvitationConfig, SceneId } from './config';
import { SCENE_META } from './config';
import { effectiveBpm, videoBeats, type BeatMarker, type SfxKind } from './music';
import { computeTimeline, type Timeline, type TimelineScene } from './timeline';

export interface ConfettiBurst {
  /** Absolute frame. */
  frame: number;
  kind: 'cannons' | 'shower';
  seed: number;
  /** Relative particle count, already scaled by the intensity setting. */
  amount: number;
}

export interface SfxEvent {
  frame: number;
  kind: SfxKind;
  volume: number;
}

export interface CueSchedule {
  timeline: Timeline;
  beats: BeatMarker[];
  /** Absolute frames per scene and cue key. */
  scenes: Partial<Record<SceneId, Record<string, number>>>;
  confetti: ConfettiBurst[];
  sfx: SfxEvent[];
  /** Delay between words of a staggered reveal (an eighth note when synced). */
  wordStaggerFrames: number;
  beatSeconds: number;
}

interface CueSpec {
  key: string;
  /** Seconds after the scene's nominal start; negative = seconds before the scene end. */
  at: number;
  downbeat?: boolean;
}

export function eventRows(config: InvitationConfig): ('date' | 'time' | 'venue' | 'rsvp')[] {
  const rows: ('date' | 'time' | 'venue' | 'rsvp')[] = ['date', 'time', 'venue'];
  if (config.rsvpContact.trim()) rows.push('rsvp');
  return rows;
}

function sceneSpecs(id: SceneId, config: InvitationConfig): CueSpec[] {
  switch (id) {
    case 'opening':
      return [
        { key: 'ears', at: 0.35 },
        { key: 'kicker', at: 1.5 },
        { key: 'headline', at: 2.4, downbeat: true },
      ];
    case 'birthday-boy':
      return [
        { key: 'hero', at: 0.15 },
        { key: 'name', at: 0.9, downbeat: true },
        { key: 'tagline', at: 2.6 },
        { key: 'one', at: 3.3 },
      ];
    case 'celebration':
      return [
        { key: 'cake', at: 0.15 },
        { key: 'headline', at: 1.0, downbeat: true },
        { key: 'subline', at: 3.8 },
      ];
    case 'event-details': {
      const rows = eventRows(config).map((_, i) => ({ key: `row${i}`, at: 2.0 + i * 0.6 }));
      return [
        { key: 'header', at: 0.2 },
        { key: 'card', at: 0.5 },
        { key: 'title', at: 1.1, downbeat: true },
        ...rows,
        { key: 'footer', at: 2.0 + rows.length * 0.6 + 0.3 },
      ];
    }
    case 'closing':
      return [
        { key: 'headline', at: 0.5, downbeat: true },
        { key: 'message', at: 2.4 },
        { key: 'name', at: 4.0, downbeat: true },
        { key: 'one', at: 4.6 },
        { key: 'finale', at: -3.2, downbeat: true },
      ];
  }
}

function makeSnapper(beats: BeatMarker[], enabled: boolean) {
  const all = beats.map((b) => b.t);
  const downs = beats.filter((b) => b.downbeat).map((b) => b.t);
  /** Closest value in [lo, hi] to `target` (pool is sorted). */
  const closest = (pool: number[], target: number, lo: number, hi: number) => {
    let best: number | null = null;
    for (const x of pool) {
      if (x < lo) continue;
      if (x > hi) break;
      if (best === null || Math.abs(x - target) < Math.abs(best - target)) best = x;
    }
    return best;
  };
  /** Moves `t` (never earlier than `min`) onto a nearby downbeat or beat. */
  return (t: number, downbeat = false, min = -Infinity) => {
    const target = Math.max(t, min);
    if (!enabled || !all.length) return target;
    if (downbeat) {
      const d = closest(downs, target, Math.max(min, target - 0.3), target + 1.0);
      if (d !== null) return d;
    }
    return closest(all, target, Math.max(min, target - 0.15), target + 0.55) ?? target;
  };
}

export function computeCues(config: InvitationConfig): CueSchedule {
  const timeline = computeTimeline(config);
  const fps = timeline.fps;
  const beats = config.audio.source === 'none' ? [] : videoBeats(config, timeline.durationSeconds);
  const sync = config.audio.beatSync && beats.length >= 2;
  const snap = makeSnapper(beats, sync);
  const bpm = effectiveBpm(config);
  const beatSeconds = sync && bpm > 0 ? 60 / bpm : 0.5;
  const wordStaggerFrames = Math.round(Math.min(0.32, Math.max(0.14, beatSeconds / 2)) * fps);
  const intensity = config.design.intensity;
  const deco = config.design.decorations;
  const sfxCfg = config.audio.sfx;

  const scenes: CueSchedule['scenes'] = {};
  const confetti: ConfettiBurst[] = [];
  const sfx: SfxEvent[] = [];
  const addSfx = (frame: number, kind: SfxKind, gain: number) => {
    if (!sfxCfg.enabled) return;
    const allowed = { chime: sfxCfg.chimes, sparkle: sfxCfg.sparkles, pop: sfxCfg.pops, whoosh: sfxCfg.whooshes }[kind];
    if (allowed) sfx.push({ frame: Math.max(0, Math.round(frame)), kind, volume: Math.min(1, sfxCfg.volume * gain) });
  };
  const addBurst = (sec: number, kind: ConfettiBurst['kind'], amount: number, seed: number) => {
    if (!deco.confetti) return;
    const frame = Math.round(sec * fps);
    confetti.push({ frame, kind, seed, amount: amount * intensity });
    addSfx(frame, 'pop', 0.7);
    if (kind === 'cannons') addSfx(frame + Math.round(0.12 * fps), 'pop', 0.45);
  };

  timeline.scenes.forEach((s: TimelineScene) => {
    const start = s.startFrame / fps;
    const end = s.endFrame / fps;
    const dur = end - start;
    // Shorter-than-default scenes reveal proportionally faster; longer ones hold longer.
    const scale = Math.min(1, Math.max(0.55, dur / SCENE_META[s.id].defaultDuration));
    const out: Record<string, number> = {};
    let prev = start - 1;
    for (const spec of sceneSpecs(s.id, config)) {
      const nominal = spec.at >= 0 ? start + spec.at * scale : end + spec.at;
      const min = prev + 0.25;
      let t = snap(nominal, spec.downbeat, Math.max(min, start - 0.2));
      t = Math.min(t, end - 0.6);
      out[spec.key] = Math.round(t * fps);
      prev = t;
    }
    scenes[s.id] = out;
    const sec = (key: string) => out[key] / fps;

    if (s.transition !== 'none') addSfx(s.from, 'whoosh', 0.8);
    switch (s.id) {
      case 'opening':
        addSfx(out.kicker, 'sparkle', 0.8);
        addSfx(out.headline, 'chime', 0.9);
        break;
      case 'birthday-boy': {
        addSfx(out.name, 'sparkle', 0.9);
        addSfx(out.tagline, 'chime', 0.75);
        addBurst(sec('name') + 0.05, 'cannons', 1, 11 + s.index);
        break;
      }
      case 'celebration': {
        addSfx(out.headline, 'sparkle', 0.8);
        // Confetti on downbeats after the headline lands (up to three bursts).
        const downs = sync ? beats.filter((b) => b.downbeat && b.t >= sec('headline') - 0.01 && b.t < end - 1.2).map((b) => b.t) : [];
        const times = downs.length ? downs.filter((_, i) => i % 2 === 0).slice(0, 3) : [sec('headline'), sec('subline')];
        times.forEach((t, i) => addBurst(t, i % 2 === 0 ? 'shower' : 'cannons', i === 0 ? 0.9 : 0.7, 31 + i + s.index));
        break;
      }
      case 'event-details':
        addSfx(out.card, 'chime', 0.6);
        break;
      case 'closing':
        addSfx(out.name, 'chime', 0.85);
        addBurst(sec('name'), 'cannons', 0.8, 51 + s.index);
        addSfx(out.finale, 'sparkle', 0.9);
        addBurst(sec('finale'), 'shower', 1, 61 + s.index);
        addBurst(sec('finale') + 0.05, 'cannons', 0.8, 71 + s.index);
        break;
    }
  });

  sfx.sort((a, b) => a.frame - b.frame);
  return { timeline, beats, scenes, confetti, sfx, wordStaggerFrames, beatSeconds };
}
