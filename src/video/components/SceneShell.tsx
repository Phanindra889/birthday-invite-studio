import React from 'react';
import { AbsoluteFill, Easing, Sequence, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { alpha } from '../../shared/color';
import { SCENE_META } from '../../shared/config';
import type { TimelineScene } from '../../shared/timeline';
import { SceneContext, useTheme } from '../theme';
import { clamp01 } from '../util/anim';
import { earsOutlinePath } from '../util/ears';

/** Places a scene on the timeline, runs its entrance transition and a slow camera push. */
export const SceneShell: React.FC<{ scene: TimelineScene; children: React.ReactNode }> = ({ scene, children }) => (
  <Sequence from={scene.from} durationInFrames={scene.durationFrames + scene.enterFrames} name={SCENE_META[scene.id].label}>
    <SceneContext.Provider value={scene}>
      <TransitionIn scene={scene}>
        <Camera scene={scene}>{children}</Camera>
      </TransitionIn>
    </SceneContext.Provider>
  </Sequence>
);

const Camera: React.FC<{ scene: TimelineScene; children: React.ReactNode }> = ({ scene, children }) => {
  const frame = useCurrentFrame();
  const theme = useTheme();
  const total = scene.durationFrames + scene.enterFrames;
  const p = frame / total;
  const zoom = 1 + 0.035 * Math.min(1.5, theme.intensity) * p;
  return <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: '50% 42%' }}>{children}</AbsoluteFill>;
};

const TransitionIn: React.FC<{ scene: TimelineScene; children: React.ReactNode }> = ({ scene, children }) => {
  const frame = useCurrentFrame();
  const theme = useTheme();
  const { width: W, height: H } = useVideoConfig();
  if (scene.transition === 'none' || scene.enterFrames <= 0 || frame >= scene.enterFrames) {
    return <AbsoluteFill>{children}</AbsoluteFill>;
  }
  const p = clamp01(frame / scene.enterFrames);
  const e = Easing.inOut(Easing.cubic)(p);
  switch (scene.transition) {
    case 'ears': {
      const cx = W / 2;
      const cy = H * 0.56;
      const R = interpolate(e, [0, 1], [2, Math.hypot(W, H) * 0.62]);
      const d = earsOutlinePath(cx, cy, R);
      return (
        <>
          <AbsoluteFill style={{ clipPath: `path('${d}')` }}>{children}</AbsoluteFill>
          <svg width={W} height={H} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
            <path d={d} fill="none" stroke={alpha(theme.c.gold, 0.95)} strokeWidth={16} />
            <path d={d} fill="none" stroke="#FFFFFF" strokeWidth={5} opacity={0.9} />
          </svg>
        </>
      );
    }
    case 'zoom':
      return <AbsoluteFill style={{ opacity: clamp01(p * 1.6), transform: `scale(${1.28 - 0.28 * e})` }}>{children}</AbsoluteFill>;
    case 'slide': {
      const s = Easing.out(Easing.cubic)(p);
      return (
        <AbsoluteFill style={{ transform: `translateY(${(1 - s) * H}px)`, boxShadow: `0 -30px 60px ${alpha(theme.c.deep, 0.25)}` }}>
          {children}
        </AbsoluteFill>
      );
    }
    case 'fade':
    default:
      return <AbsoluteFill style={{ opacity: e }}>{children}</AbsoluteFill>;
  }
};
