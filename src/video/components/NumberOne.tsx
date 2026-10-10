import React, { useId } from 'react';
import { useVideoConfig } from 'remotion';
import { darken, lighten } from '../../shared/color';
import { useTheme } from '../theme';
import { useAbsFrame } from '../util/anim';
import { svgId } from './Cloud';
import { STAR_PATH } from './Sparkles';

// Chunky, rounded "1" drawn in a 500 x 640 box (the ears sit above the stem).
const ONE_PATH =
  'M150 255 L262 168 Q276 158 294 158 L318 158 Q346 158 346 186 L346 520 L386 520 Q410 520 410 544 L410 578 Q410 602 386 602 L166 602 Q142 602 142 578 L142 544 Q142 520 166 520 L218 520 L218 290 L186 312 Q170 322 159 309 L142 289 Q131 270 150 255 Z';

/** The big golden number one with ears, extruded for a soft 3D look. */
export const NumberOne: React.FC<{ height: number; style?: React.CSSProperties }> = ({ height, style }) => {
  const t = useTheme();
  const { c } = t;
  const id = svgId(useId());
  const frame = useAbsFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;
  const shine = ((time * 0.45) % 1.6) - 0.3;
  const depth = 9;
  const width = (height * 500) / 640;
  return (
    <svg viewBox="0 0 500 640" width={width} height={height} style={{ overflow: 'visible', ...style }}>
      <defs>
        <linearGradient id={`face${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={lighten(c.gold, 0.72)} />
          <stop offset="0.35" stopColor={lighten(c.gold, 0.2)} />
          <stop offset="0.7" stopColor={c.gold} />
          <stop offset="1" stopColor={darken(c.gold, 0.22)} />
        </linearGradient>
        <radialGradient id={`ear${id}`} cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" stopColor={lighten(c.deep, 0.35)} />
          <stop offset="0.6" stopColor={c.deep} />
          <stop offset="1" stopColor={darken(c.deep, 0.3)} />
        </radialGradient>
        <linearGradient id={`shine${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
          <stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0.7} />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </linearGradient>
        <clipPath id={`clip${id}`}>
          <path d={ONE_PATH} />
        </clipPath>
      </defs>

      {t.deco.ears && (
        <g>
          {[
            [176, 128],
            [372, 112],
          ].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x + 6} cy={y + 12} r={88} fill={darken(c.deep, 0.45)} />
              <circle cx={x} cy={y} r={88} fill={`url(#ear${id})`} stroke="#FFFFFF" strokeWidth={10} />
              <ellipse cx={x - 30} cy={y - 32} rx={20} ry={34} transform={`rotate(-32 ${x - 30} ${y - 32})`} fill="#FFFFFF" opacity={0.35} />
            </g>
          ))}
        </g>
      )}

      {/* Outline + extrusion */}
      <path d={ONE_PATH} fill={t.deepDark} stroke={t.deepDark} strokeWidth={34} strokeLinejoin="round" transform={`translate(${depth * 1.1} ${depth * 2})`} />
      {Array.from({ length: depth }, (_, i) => (
        <path
          key={i}
          d={ONE_PATH}
          fill={darken(c.deep, 0.1 + (i / depth) * 0.15)}
          stroke={darken(c.deep, 0.1 + (i / depth) * 0.15)}
          strokeWidth={18}
          strokeLinejoin="round"
          transform={`translate(${(depth - i) * 1.1} ${(depth - i) * 2})`}
        />
      ))}
      <path d={ONE_PATH} fill="none" stroke="#FFFFFF" strokeWidth={22} strokeLinejoin="round" />
      <path d={ONE_PATH} fill={`url(#face${id})`} stroke={`url(#face${id})`} strokeWidth={6} strokeLinejoin="round" />
      <g clipPath={`url(#clip${id})`}>
        <rect x={-200 + shine * 700} y={100} width={160} height={600} fill={`url(#shine${id})`} transform="rotate(18 250 400)" />
        <path d="M244 208 L244 520" stroke="#FFFFFF" strokeWidth={14} strokeLinecap="round" opacity={0.45} />
      </g>
      <path d={STAR_PATH} transform="translate(318 214) scale(26)" fill="#FFFFFF" opacity={0.9} />
    </svg>
  );
};
