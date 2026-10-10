import React, { useId } from 'react';
import { useVideoConfig } from 'remotion';
import { alpha, mix } from '../../shared/color';
import { useTheme } from '../theme';
import { useAbsFrame } from '../util/anim';

const SHAPES = [
  { w: 400, h: 200, circles: [[95, 128, 62], [165, 92, 78], [248, 96, 66], [318, 130, 52]], base: [60, 122, 280, 64] },
  { w: 420, h: 190, circles: [[90, 125, 55], [150, 95, 62], [220, 75, 80], [300, 105, 62], [350, 135, 45]], base: [55, 120, 325, 58] },
  { w: 360, h: 170, circles: [[85, 110, 50], [150, 80, 68], [225, 95, 55], [285, 115, 45]], base: [50, 104, 270, 52] },
] as const;

export const svgId = (raw: string) => raw.replace(/[^a-zA-Z0-9_-]/g, '');

export const Cloud: React.FC<{ shape?: number; width: number; opacity?: number; style?: React.CSSProperties; shadow?: boolean }> = ({
  shape = 0,
  width,
  opacity = 1,
  style,
  shadow = true,
}) => {
  const t = useTheme();
  const id = svgId(useId());
  const s = SHAPES[shape % SHAPES.length];
  const dark = t.tone === 'dark';
  const top = dark ? mix(t.c.baby, t.c.deep, 0.35) : '#FFFFFF';
  const bottom = dark ? mix(t.c.deep, t.c.sky, 0.25) : mix('#FFFFFF', t.c.baby, 0.7);
  return (
    <svg
      viewBox={`0 0 ${s.w} ${s.h}`}
      width={width}
      height={(width * s.h) / s.w}
      style={{ overflow: 'visible', opacity, filter: shadow ? `drop-shadow(0 ${width * 0.04}px ${width * 0.06}px ${alpha(t.c.deep, 0.16)})` : undefined, ...style }}
    >
      <defs>
        <linearGradient id={`cg${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.15" stopColor={top} />
          <stop offset="1" stopColor={bottom} />
        </linearGradient>
      </defs>
      <g fill={`url(#cg${id})`}>
        {s.circles.map(([cx, cy, r], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} />
        ))}
        <rect x={s.base[0]} y={s.base[1]} width={s.base[2]} height={s.base[3]} rx={s.base[3] / 2} />
      </g>
      <g fill="#FFFFFF" opacity={dark ? 0.15 : 0.7}>
        {s.circles.slice(0, 3).map(([cx, cy, r], i) => (
          <circle key={i} cx={cx - r * 0.25} cy={cy - r * 0.3} r={r * 0.45} />
        ))}
      </g>
    </svg>
  );
};

/** Slow-drifting row of big clouds hugging the bottom edge (foreground depth). */
export const CloudBank: React.FC<{ y: number; scale?: number; opacity?: number; seed?: number }> = ({ y, scale = 1, opacity = 1, seed = 0 }) => {
  const frame = useAbsFrame();
  const { fps, width } = useVideoConfig();
  const t = frame / fps;
  const items = [
    { x: -180, w: 560, shape: 1, dy: 40, sp: 0.35 },
    { x: 220, w: 640, shape: 0, dy: 0, sp: 0.28 },
    { x: 640, w: 600, shape: 2, dy: 30, sp: 0.4 },
    { x: -60, w: 520, shape: 2, dy: 120, sp: 0.5 },
    { x: 420, w: 560, shape: 1, dy: 120, sp: 0.45 },
    { x: 820, w: 480, shape: 0, dy: 110, sp: 0.3 },
  ];
  return (
    <div style={{ position: 'absolute', left: 0, top: y, width, height: 600, pointerEvents: 'none' }}>
      {items.map((c, i) => {
        const drift = Math.sin(t * c.sp + i * 1.7 + seed) * 26;
        return (
          <div key={i} style={{ position: 'absolute', left: c.x * scale + drift, top: c.dy * scale }}>
            <Cloud shape={c.shape} width={c.w * scale} opacity={opacity} />
          </div>
        );
      })}
    </div>
  );
};
