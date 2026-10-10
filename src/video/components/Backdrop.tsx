import React from 'react';
import { AbsoluteFill, random, useVideoConfig } from 'remotion';
import { alpha, darken, lighten, mix } from '../../shared/color';
import type { SceneId } from '../../shared/config';
import { useTheme } from '../theme';
import { useAbsFrame } from '../util/anim';
import { Cloud } from './Cloud';

const GLOW: Record<SceneId, string> = {
  opening: '50% 32%',
  'birthday-boy': '50% 28%',
  celebration: '50% 64%',
  'event-details': '50% 40%',
  closing: '50% 58%',
};

const FAR_CLOUDS = [
  { y: 230, w: 300, x0: 80, sp: 9, shape: 2, o: 0.7 },
  { y: 470, w: 230, x0: 760, sp: 6, shape: 0, o: 0.55 },
  { y: 760, w: 340, x0: 420, sp: 11, shape: 1, o: 0.5 },
  { y: 1080, w: 260, x0: 980, sp: 7, shape: 2, o: 0.45 },
  { y: 1320, w: 380, x0: 200, sp: 10, shape: 0, o: 0.5 },
];

/** Opaque sky background. Animated on absolute time so overlapping scenes line up during transitions. */
export const Backdrop: React.FC<{ variant: SceneId }> = ({ variant }) => {
  const theme = useTheme();
  const { c, deco } = theme;
  const frame = useAbsFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const t = frame / fps;
  const dark = theme.tone === 'dark';

  const gradient = {
    sky: `linear-gradient(180deg, ${lighten(c.baby, 0.45)} 0%, ${c.baby} 36%, ${mix(c.baby, c.sky, 0.55)} 72%, ${c.sky} 100%)`,
    dreamy: `linear-gradient(180deg, ${lighten(c.baby, 0.65)} 0%, ${lighten(c.baby, 0.3)} 45%, ${mix(c.baby, c.silver, 0.5)} 75%, ${mix(c.baby, c.sky, 0.35)} 100%)`,
    polka: `linear-gradient(180deg, ${lighten(c.baby, 0.3)} 0%, ${c.baby} 50%, ${mix(c.baby, c.sky, 0.7)} 100%)`,
    twilight: `linear-gradient(180deg, ${darken(c.deep, 0.62)} 0%, ${darken(c.deep, 0.4)} 42%, ${darken(c.deep, 0.08)} 80%, ${mix(c.deep, c.sky, 0.3)} 100%)`,
  }[theme.bg];

  const glowColor = dark ? alpha(c.sky, 0.35) : alpha('#FFFFFF', variant === 'celebration' ? 0.85 : 0.75);

  return (
    <AbsoluteFill style={{ background: gradient, overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at ${GLOW[variant]}, ${glowColor} 0%, ${alpha(dark ? c.sky : '#FFFFFF', 0)} 58%)` }} />
      {deco.lightRays && (
        <div
          style={{
            position: 'absolute',
            left: W / 2 - 1700,
            top: H * 0.22 - 1700,
            width: 3400,
            height: 3400,
            borderRadius: '50%',
            opacity: dark ? 0.35 : 0.9,
            background: `repeating-conic-gradient(from ${(t * 3.5).toFixed(2)}deg, rgba(255,255,255,0) 0deg, rgba(255,255,255,0.32) 4deg, rgba(255,255,255,0) 8deg, rgba(255,255,255,0) 15deg)`,
            WebkitMaskImage: 'radial-gradient(circle, #000 0%, rgba(0,0,0,0.55) 22%, rgba(0,0,0,0) 50%)',
            maskImage: 'radial-gradient(circle, #000 0%, rgba(0,0,0,0.55) 22%, rgba(0,0,0,0) 50%)',
          }}
        />
      )}
      {theme.bg === 'polka' && (
        <AbsoluteFill
          style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, ${alpha('#FFFFFF', 0.55)} 0 17px, transparent 18px), radial-gradient(circle at 75% 75%, ${alpha('#FFFFFF', 0.55)} 0 17px, transparent 18px)`,
            backgroundSize: '170px 170px',
            backgroundPosition: `0px ${(t * 14).toFixed(1)}px`,
            WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,0.85), rgba(0,0,0,0.35) 70%, rgba(0,0,0,0.1))',
            maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.85), rgba(0,0,0,0.35) 70%, rgba(0,0,0,0.1))',
          }}
        />
      )}
      {dark && <StarField />}
      {deco.clouds &&
        FAR_CLOUDS.concat(theme.bg === 'dreamy' ? [{ y: 600, w: 420, x0: 120, sp: 5, shape: 1, o: 0.65 }, { y: 1500, w: 460, x0: 700, sp: 8, shape: 2, o: 0.6 }] : []).map((cl, i) => {
          const span = W + 800;
          const x = ((((cl.x0 + cl.sp * t) % span) + span) % span) - 400;
          return (
            <div key={i} style={{ position: 'absolute', left: x, top: cl.y }}>
              <Cloud shape={cl.shape} width={cl.w} opacity={cl.o * (dark ? 0.6 : 1)} shadow={false} />
            </div>
          );
        })}
      {deco.bokeh && <Bokeh />}
    </AbsoluteFill>
  );
};

const Bokeh: React.FC = () => {
  const theme = useTheme();
  const frame = useAbsFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const t = frame / fps;
  const n = Math.round(14 * Math.min(1.4, Math.max(0.6, theme.intensity)));
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const size = 26 + random(`bk-s${i}`) * 80;
        const speed = 14 + random(`bk-v${i}`) * 30;
        const span = H + 300;
        const y = ((((random(`bk-y${i}`) * span - speed * t) % span) + span) % span) - 150;
        const x = random(`bk-x${i}`) * W + Math.sin(t * 0.6 + i) * 18;
        const tw = 0.35 + 0.35 * Math.sin(t * (0.8 + random(`bk-t${i}`)) + i * 2.1);
        const col = i % 3 === 0 ? theme.c.gold : '#FFFFFF';
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x - size / 2,
              top: y - size / 2,
              width: size,
              height: size,
              borderRadius: '50%',
              opacity: tw,
              background: `radial-gradient(circle, ${alpha(col, 0.55)} 0%, ${alpha(col, 0.2)} 45%, ${alpha(col, 0)} 70%)`,
            }}
          />
        );
      })}
    </>
  );
};

const StarField: React.FC = () => {
  const theme = useTheme();
  const frame = useAbsFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const t = frame / fps;
  return (
    <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
      {Array.from({ length: 80 }, (_, i) => {
        const x = random(`st-x${i}`) * W;
        const y = random(`st-y${i}`) * H * 0.75;
        const r = 1.2 + random(`st-r${i}`) * 2.6;
        const o = 0.35 + 0.65 * Math.abs(Math.sin(t * (0.6 + random(`st-t${i}`) * 1.6) + i));
        return <circle key={i} cx={x} cy={y} r={r} fill={i % 7 === 0 ? theme.c.gold : '#FFFFFF'} opacity={o} />;
      })}
    </svg>
  );
};
