import React, { useId } from 'react';
import { Img, useVideoConfig } from 'remotion';
import { alpha, darken, lighten } from '../../shared/color';
import { useTheme } from '../theme';
import { useAbsFrame } from '../util/anim';
import { earsCircles } from '../util/ears';
import { svgId } from './Cloud';
import { Sparkle } from './Sparkles';

/** Circular (optionally ears-shaped) photo frame with a gold ring and orbiting sparkles. */
export const PhotoFrame: React.FC<{ src: string; size: number; shape: 'circle' | 'ears'; drawProgress?: number }> = ({
  src,
  size,
  shape,
  drawProgress = 1,
}) => {
  const t = useTheme();
  const { c } = t;
  const id = svgId(useId());
  const frame = useAbsFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;
  const R = size / 2;
  const ears = shape === 'ears';
  const pad = ears ? R * 0.95 : R * 0.2;
  const W = size + R * (ears ? 0.75 : 0.4);
  const H = size + pad + R * 0.2;
  const cx = W / 2;
  const cy = pad + R;
  const e = earsCircles(cx, cy, R * 1.08);
  const photo = R * 0.88;
  return (
    <div style={{ position: 'relative', width: W, height: H }}>
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <defs>
          <radialGradient id={`ear${id}`} cx="0.35" cy="0.3" r="0.85">
            <stop offset="0" stopColor={lighten(c.deep, 0.35)} />
            <stop offset="1" stopColor={darken(c.deep, 0.28)} />
          </radialGradient>
          <linearGradient id={`ring${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={lighten(c.gold, 0.6)} />
            <stop offset="0.5" stopColor={c.gold} />
            <stop offset="1" stopColor={darken(c.gold, 0.25)} />
          </linearGradient>
        </defs>
        <circle cx={cx} cy={cy + R * 0.06} r={R * 1.04} fill={alpha(c.deep, 0.22)} />
        {ears &&
          [e.left, e.right].map((ear, i) => (
            <g key={i} opacity={drawProgress}>
              <circle cx={ear.cx} cy={ear.cy} r={ear.r} fill={`url(#ear${id})`} stroke="#FFFFFF" strokeWidth={R * 0.04} />
              <ellipse cx={ear.cx - ear.r * 0.35} cy={ear.cy - ear.r * 0.35} rx={ear.r * 0.18} ry={ear.r * 0.32} transform={`rotate(-32 ${ear.cx - ear.r * 0.35} ${ear.cy - ear.r * 0.35})`} fill="#FFFFFF" opacity={0.35} />
            </g>
          ))}
        <circle cx={cx} cy={cy} r={R} fill="#FFFFFF" />
        <circle cx={cx} cy={cy} r={R * 0.95} fill="none" stroke={`url(#ring${id})`} strokeWidth={R * 0.075} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - drawProgress} transform={`rotate(-90 ${cx} ${cy})`} />
      </svg>
      <Img
        src={src}
        style={{
          position: 'absolute',
          left: cx - photo,
          top: cy - photo,
          width: photo * 2,
          height: photo * 2,
          borderRadius: '50%',
          objectFit: 'cover',
          boxShadow: `inset 0 0 0 4px ${alpha('#FFFFFF', 0.6)}`,
        }}
      />
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        {t.deco.sparkles &&
          Array.from({ length: 5 }, (_, i) => {
            const a = time * 0.6 + (i * Math.PI * 2) / 5;
            const r = R * 1.08;
            return <Sparkle key={i} x={cx + Math.cos(a) * r} y={cy + Math.sin(a) * r} size={R * (0.07 + 0.03 * Math.sin(time * 3 + i))} color={i % 2 ? '#FFFFFF' : c.gold} rotate={time * 40} opacity={drawProgress} />;
          })}
      </svg>
    </div>
  );
};
