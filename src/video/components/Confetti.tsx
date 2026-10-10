import React from 'react';
import { random, useCurrentFrame, useVideoConfig } from 'remotion';
import { mix } from '../../shared/color';
import { useCues, useTheme } from '../theme';
import { STAR_PATH } from './Sparkles';

const LIFE = 3.8;
const DRAG = 2.3;
const GRAVITY = 760;

/**
 * Deterministic confetti: every piece's position is a closed-form function of time since
 * its burst, so any frame can be rendered independently (required for parallel rendering).
 */
export const ConfettiLayer: React.FC = () => {
  const theme = useTheme();
  const cues = useCues();
  const frame = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  if (!theme.deco.confetti) return null;
  const { c } = theme;
  const palette = [c.sky, c.deep, c.gold, '#FFFFFF', c.baby, mix(c.gold, '#FFFFFF', 0.35), mix(c.sky, c.deep, 0.5)];
  const pieces: React.ReactNode[] = [];

  for (const burst of cues.confetti) {
    const t = (frame - burst.frame) / fps;
    if (t < 0 || t > LIFE) continue;
    const n = Math.round((burst.kind === 'shower' ? 80 : 100) * burst.amount);
    for (let i = 0; i < n; i++) {
      const r = (k: string) => random(`cf-${burst.seed}-${i}-${k}`);
      let x0: number, y0: number, vx: number, vy: number;
      if (burst.kind === 'cannons') {
        const left = i % 2 === 0;
        const ang = ((left ? -58 - r('a') * 26 : -122 + r('a') * 26) * Math.PI) / 180;
        const speed = 1500 + r('s') * 1400;
        x0 = left ? -20 : W + 20;
        y0 = H * 0.8 + r('y') * 140;
        vx = Math.cos(ang) * speed;
        vy = Math.sin(ang) * speed;
      } else {
        x0 = r('x') * W;
        y0 = -40 - r('y') * 520;
        vx = (r('vx') - 0.5) * 240;
        vy = 60 + r('vy') * 240;
      }
      const e = (1 - Math.exp(-DRAG * t)) / DRAG;
      const term = GRAVITY / DRAG;
      const flutter = Math.sin(t * (3 + r('f') * 3) + r('p') * 6) * 30 * Math.min(1, t * 1.5);
      const x = x0 + vx * e + flutter;
      const y = y0 + vy * e + term * (t - e);
      if (y > H + 60 || x < -80 || x > W + 80) continue;
      const rot = r('r') * 360 + (r('sp') - 0.5) * 900 * t;
      const flip = Math.cos(t * (5 + r('fl') * 7) + r('ph') * 6);
      const opacity = Math.min(1, (LIFE - t) / 0.8) * Math.min(1, t * 12);
      const color = palette[Math.floor(r('c') * palette.length)];
      const shape = Math.floor(r('sh') * 10);
      const s = 0.8 + r('z') * 0.7;
      let el: React.ReactNode;
      if (shape < 4) el = <rect x={-8 * s} y={-13 * s} width={16 * s} height={26 * s} rx={2} fill={color} />;
      else if (shape < 6) el = <rect x={-4 * s} y={-20 * s} width={8 * s} height={40 * s} rx={3} fill={color} />;
      else if (shape < 8) el = <circle r={9 * s} fill={color} />;
      else if (shape < 9) el = <path d={STAR_PATH} transform={`scale(${14 * s})`} fill={c.gold} />;
      else
        el = (
          <g fill={c.deep}>
            <circle r={9 * s} />
            <circle cx={-9 * s} cy={-9 * s} r={5.5 * s} />
            <circle cx={9 * s} cy={-9 * s} r={5.5 * s} />
          </g>
        );
      pieces.push(
        <g key={`${burst.seed}-${i}`} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(1 ${flip.toFixed(3)})`} opacity={opacity}>
          {el}
        </g>,
      );
    }
  }
  if (!pieces.length) return null;
  return (
    <svg width={W} height={H} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {pieces}
    </svg>
  );
};
