import { useContext } from 'react';
import { Easing, interpolate, spring, useCurrentFrame } from 'remotion';
import type { TextAnimationId } from '../../shared/config';
import type { BeatMarker } from '../../shared/music';
import { SceneContext } from '../theme';

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Absolute composition frame, also inside scene <Sequence>s. */
export function useAbsFrame(): number {
  const local = useCurrentFrame();
  const scene = useContext(SceneContext);
  return scene ? local + scene.from : local;
}

/** Index of the last beat at or before t (binary search), or -1. */
export function lastBeatIndex(beats: BeatMarker[], t: number): number {
  let lo = 0, hi = beats.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (beats[mid].t <= t + 1e-6) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans;
}

/** 1 right on a beat, decaying exponentially until the next one. */
export function beatPulse(beats: BeatMarker[], t: number, decay = 0.18, downbeatsOnly = false): number {
  let i = lastBeatIndex(beats, t);
  if (downbeatsOnly) while (i >= 0 && !beats[i].downbeat) i--;
  if (i < 0) return 0;
  return Math.exp(-(t - beats[i].t) / decay);
}

export interface Entrance {
  opacity: number;
  x: number;
  y: number;
  scale: number;
  rotate: number;
}

export const HIDDEN: Entrance = { opacity: 0, x: 0, y: 0, scale: 1, rotate: 0 };

/** Deterministic entrance curve for text units and decorative elements. */
export function entrance(frame: number, start: number, fps: number, style: TextAnimationId, intensity = 1): Entrance {
  const f = frame - start;
  if (f < 0) return HIDDEN;
  const k = Math.min(1.5, Math.max(0.4, intensity));
  switch (style) {
    case 'pop': {
      const s = spring({ frame: f, fps, config: { damping: 11, stiffness: 170, mass: 0.7 } });
      return { opacity: clamp01(f / (0.12 * fps)), x: 0, y: (1 - s) * 34 * k, scale: 0.3 + 0.7 * s, rotate: (1 - s) * -6 * k };
    }
    case 'rise': {
      const s = spring({ frame: f, fps, config: { damping: 18, stiffness: 120 } });
      return { opacity: clamp01(f / (0.3 * fps)), x: 0, y: (1 - s) * 90 * k, scale: 1, rotate: 0 };
    }
    case 'bounce': {
      const s = spring({ frame: f, fps, config: { damping: 7.5, stiffness: 150, mass: 0.8 } });
      return { opacity: clamp01(f / (0.1 * fps)), x: 0, y: -(1 - s) * 230 * k, scale: 1, rotate: 0 };
    }
    case 'fade':
    default: {
      const p = interpolate(f, [0, 0.55 * fps], [0, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
      return { opacity: p, x: 0, y: (1 - p) * 14, scale: 0.94 + 0.06 * p, rotate: 0 };
    }
  }
}

export const entranceStyle = (e: Entrance): React.CSSProperties => ({
  opacity: e.opacity,
  transform: `translate(${e.x}px, ${e.y}px) scale(${e.scale}) rotate(${e.rotate}deg)`,
});

/** Spring 0 -> 1 starting at `start` (frames). */
export function springIn(frame: number, start: number, fps: number, damping = 14, stiffness = 120, mass = 1): number {
  if (frame < start) return 0;
  return spring({ frame: frame - start, fps, config: { damping, stiffness, mass } });
}

export function fadeIn(frame: number, start: number, frames: number): number {
  return interpolate(frame, [start, start + Math.max(1, frames)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
}
