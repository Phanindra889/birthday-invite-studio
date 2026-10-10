import React, { useId } from 'react';
import { random, useVideoConfig } from 'remotion';
import { alpha, darken, lighten, mix } from '../../shared/color';
import { useTheme } from '../theme';
import { useAbsFrame } from '../util/anim';
import { svgId } from './Cloud';

const frontY = (x: number, cx: number, cy: number, rx: number, ry: number) => cy + ry * Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2));

/** Frosting cap: the top ellipse plus a band along the front edge. */
function frostingPath(cx: number, cy: number, rx: number, ry: number, band: number): string {
  let d = `M ${cx - rx} ${cy} A ${rx} ${ry} 0 0 1 ${cx + rx} ${cy} L ${cx + rx} ${cy + band}`;
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const x = cx + rx - (2 * rx * i) / steps;
    d += ` L ${x.toFixed(1)} ${(frontY(x, cx, cy, rx, ry) + band).toFixed(1)}`;
  }
  return `${d} Z`;
}

const Drips: React.FC<{ cx: number; cy: number; rx: number; ry: number; band: number; n: number; min: number; max: number; w: number; fill: string; seed: string }> = ({
  cx, cy, rx, ry, band, n, min, max, w, fill, seed,
}) => (
  <g fill={fill}>
    {Array.from({ length: n }, (_, i) => {
      const x = cx - rx + w + ((2 * rx - 2 * w) * (i + 0.5)) / n + (random(`${seed}x${i}`) - 0.5) * 10;
      const len = min + random(`${seed}l${i}`) * (max - min);
      const y = frontY(x, cx, cy, rx, ry) + band - 4;
      return <rect key={i} x={x - w} y={y} width={w * 2} height={len} rx={w} />;
    })}
  </g>
);

/** Cylinder shading: darker edges, light center. */
const Cylinder: React.FC<{ id: string; color: string }> = ({ id, color }) => (
  <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stopColor={darken(color, 0.2)} />
    <stop offset="0.22" stopColor={color} />
    <stop offset="0.45" stopColor={lighten(color, 0.18)} />
    <stop offset="0.75" stopColor={color} />
    <stop offset="1" stopColor={darken(color, 0.24)} />
  </linearGradient>
);

export const Cake: React.FC<{ width: number; style?: React.CSSProperties }> = ({ width, style }) => {
  const t = useTheme();
  const { c } = t;
  const id = svgId(useId());
  const frame = useAbsFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;
  const flicker = 1 + 0.07 * Math.sin(time * 13.1) + 0.05 * Math.sin(time * 7.3 + 1.3);
  const lean = Math.sin(time * 5.7) * 4;
  const lower = mix(c.sky, c.deep, 0.18);
  const upper = c.baby;
  const topDrip = mix(c.deep, c.sky, 0.2);

  return (
    <svg viewBox="0 0 600 700" width={width} height={(width * 700) / 600} style={{ overflow: 'visible', ...style }}>
      <defs>
        <radialGradient id={`glow${id}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity={t.tone === 'dark' ? 0.25 : 0.65} />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </radialGradient>
        <linearGradient id={`plate${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={lighten(c.silver, 0.6)} />
          <stop offset="1" stopColor={darken(c.silver, 0.18)} />
        </linearGradient>
        <linearGradient id={`gold${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={darken(c.gold, 0.2)} />
          <stop offset="0.4" stopColor={lighten(c.gold, 0.45)} />
          <stop offset="1" stopColor={darken(c.gold, 0.25)} />
        </linearGradient>
        <radialGradient id={`ear${id}`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor={lighten(c.deep, 0.3)} />
          <stop offset="1" stopColor={darken(c.deep, 0.25)} />
        </radialGradient>
        <radialGradient id={`flame${id}`} cx="0.5" cy="0.7" r="0.7">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.35" stopColor="#FFE9A3" />
          <stop offset="0.75" stopColor="#FFB443" />
          <stop offset="1" stopColor="#FF8A3D" />
        </radialGradient>
        <radialGradient id={`halo${id}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFE9A3" stopOpacity={0.75} />
          <stop offset="1" stopColor="#FFE9A3" stopOpacity={0} />
        </radialGradient>
        <Cylinder id={`low${id}`} color={lower} />
        <Cylinder id={`up${id}`} color={upper} />
      </defs>

      <ellipse cx={300} cy={420} rx={330} ry={300} fill={`url(#glow${id})`} />

      {/* Plate */}
      <ellipse cx={300} cy={646} rx={290} ry={38} fill={darken(c.silver, 0.25)} opacity={0.6} />
      <ellipse cx={300} cy={636} rx={285} ry={36} fill={`url(#plate${id})`} stroke={c.gold} strokeWidth={4} />

      {/* Bottom tier */}
      <path d="M85 440 L85 612 A215 30 0 0 0 515 612 L515 440 Z" fill={`url(#low${id})`} />
      <g fill="#FFFFFF" opacity={0.9}>
        {[505, 562].map((y, row) =>
          Array.from({ length: 7 }, (_, i) => {
            const x = 122 + i * 60 + (row ? 30 : 0);
            return x < 490 ? <circle key={`${row}-${i}`} cx={x} cy={y + (row ? 6 : 0)} r={11} /> : null;
          }),
        )}
      </g>
      <path d="M85 588 A215 30 0 0 0 515 588 L515 604 A215 30 0 0 1 85 604 Z" fill={`url(#gold${id})`} />
      <g fill="#FFFFFF">
        {Array.from({ length: 19 }, (_, i) => {
          const x = 97 + i * 22.5;
          return <circle key={i} cx={x} cy={frontY(x, 300, 588, 215, 30) - 1} r={5} />;
        })}
      </g>
      <path d={frostingPath(300, 440, 215, 30, 10)} fill="#FFFFFF" />
      <Drips cx={300} cy={440} rx={215} ry={30} band={10} n={9} min={34} max={96} w={14} fill="#FFFFFF" seed="bd" />

      {/* Ears behind the top tier */}
      {t.deco.ears && (
        <g>
          {[205, 395].map((x) => (
            <g key={x}>
              <circle cx={x} cy={258} r={60} fill={`url(#ear${id})`} stroke="#FFFFFF" strokeWidth={6} />
              <ellipse cx={x - 20} cy={236} rx={14} ry={22} transform={`rotate(-30 ${x - 20} 236)`} fill="#FFFFFF" opacity={0.35} />
            </g>
          ))}
        </g>
      )}

      {/* Top tier */}
      <path d="M165 300 L165 448 A135 20 0 0 0 435 448 L435 300 Z" fill={`url(#up${id})`} />
      <path d="M165 426 A135 20 0 0 0 435 426 L435 440 A135 20 0 0 1 165 440 Z" fill={`url(#gold${id})`} />
      <path d={frostingPath(300, 300, 135, 20, 8)} fill={topDrip} />
      <Drips cx={300} cy={300} rx={135} ry={20} band={8} n={7} min={22} max={62} w={10} fill={topDrip} seed="td" />
      <ellipse cx={300} cy={299} rx={128} ry={16} fill={lighten(topDrip, 0.12)} />
      <g>
        {Array.from({ length: 16 }, (_, i) => {
          const x = 185 + random(`sp-x${i}`) * 230;
          const y = 345 + random(`sp-y${i}`) * 70;
          if (Math.abs(x - 300) < 52 && Math.abs(y - 375) < 52) return null;
          const col = [c.gold, '#FFFFFF', c.deep][i % 3];
          return <rect key={i} x={x - 7} y={y - 2.5} width={14} height={5} rx={2.5} fill={col} transform={`rotate(${random(`sp-r${i}`) * 180} ${x} ${y})`} />;
        })}
      </g>
      <circle cx={300} cy={378} r={38} fill={`url(#gold${id})`} stroke="#FFFFFF" strokeWidth={5} />
      <text x={300} y={396} textAnchor="middle" fontFamily={`"${t.fonts.display.family}", sans-serif`} fontWeight={700} fontSize={50} fill={c.deep}>
        1
      </text>

      {/* Candle and flame */}
      <rect x={290} y={208} width={20} height={94} rx={7} fill="#FFFFFF" stroke={alpha(c.deep, 0.15)} strokeWidth={2} />
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M290 ${222 + i * 22} L310 ${212 + i * 22} L310 ${220 + i * 22} L290 ${230 + i * 22} Z`} fill={c.sky} />
      ))}
      <line x1={300} y1={208} x2={300} y2={196} stroke="#5B4A3A" strokeWidth={3} strokeLinecap="round" />
      <g transform={`translate(300 194) rotate(${lean}) scale(${flicker} ${flicker * (1 + 0.04 * Math.sin(time * 9))})`}>
        <circle r={58} fill={`url(#halo${id})`} />
        <path d="M0 -46 C 11 -27 19 -12 0 6 C -19 -12 -11 -27 0 -46 Z" fill={`url(#flame${id})`} />
        <path d="M0 -18 C 4 -10 6 -4 0 3 C -6 -4 -4 -10 0 -18 Z" fill="#FFFFFF" opacity={0.85} />
      </g>
    </svg>
  );
};
