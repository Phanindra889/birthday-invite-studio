import { SCENE_META, type InvitationConfig, type SceneId, type TransitionId } from './config';

export type ResolvedTransition = Exclude<TransitionId, 'mix'>;

export interface TimelineScene {
  id: SceneId;
  index: number;
  /** Absolute frame where the scene is fully on screen (its nominal start). */
  startFrame: number;
  durationFrames: number;
  endFrame: number;
  /** Frames the scene is rendered before startFrame while it transitions in. */
  enterFrames: number;
  /** First rendered frame (startFrame - enterFrames). */
  from: number;
  transition: ResolvedTransition | 'none';
}

export interface Timeline {
  fps: number;
  totalFrames: number;
  durationSeconds: number;
  scenes: TimelineScene[];
}

const MIX_SEQUENCE: ResolvedTransition[] = ['ears', 'zoom', 'slide', 'ears', 'fade'];

export function clampDuration(id: SceneId, seconds: number): number {
  const meta = SCENE_META[id];
  if (!Number.isFinite(seconds)) return meta.defaultDuration;
  return Math.min(meta.maxDuration, Math.max(meta.minDuration, seconds));
}

/**
 * Lays enabled scenes end to end. Scenes overlap their predecessor by a short transition,
 * so the total duration is exactly the sum of the scene durations.
 */
export function computeTimeline(config: Pick<InvitationConfig, 'scenes' | 'fps' | 'design'>): Timeline {
  const fps = config.fps;
  const enabled = config.scenes.filter((s) => s.enabled);
  const scenes: TimelineScene[] = [];
  let cursor = 0;
  enabled.forEach((s, index) => {
    const durationFrames = Math.max(1, Math.round(clampDuration(s.id, s.durationSeconds) * fps));
    const prev = scenes[index - 1];
    const enterFrames =
      index === 0 ? 0 : Math.round(Math.min(0.8 * fps, prev.durationFrames * 0.3, durationFrames * 0.3));
    const transition: TimelineScene['transition'] =
      index === 0
        ? 'none'
        : config.design.transition === 'mix'
          ? MIX_SEQUENCE[(index - 1) % MIX_SEQUENCE.length]
          : config.design.transition;
    scenes.push({
      id: s.id,
      index,
      startFrame: cursor,
      durationFrames,
      endFrame: cursor + durationFrames,
      enterFrames,
      from: cursor - enterFrames,
      transition,
    });
    cursor += durationFrames;
  });
  const totalFrames = Math.max(1, cursor);
  return { fps, totalFrames, durationSeconds: totalFrames / fps, scenes };
}

export function sceneAtFrame(timeline: Timeline, frame: number): TimelineScene | null {
  for (const s of timeline.scenes) if (frame >= s.startFrame && frame < s.endFrame) return s;
  return timeline.scenes[timeline.scenes.length - 1] ?? null;
}
