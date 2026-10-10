import React from 'react';
import { random, useVideoConfig } from 'remotion';
import { alpha } from '../../shared/color';
import { useCues, useTheme } from '../theme';
import { beatPulse, fadeIn, useAbsFrame } from '../util/anim';

export const STAR_PATH = 'M0 -1 Q0.16 -0.16 1 0 Q0.16 0.16 0 1 Q-0.16 0.16 -1 0 Q-0.16 -0.16 0 -1 Z';

export const Sparkle: React.FC<{ x: number; y: number; size: number; color: string; rotate?: number; opacity?: number; glow?: boolean }> = ({
  x,
  y,
  size,
  color,
  rotate = 0,
  opacity = 1,
  glow = true,
}) => (
  <g transform={`translate(${x} ${y})`} opacity={opacity}>
    {glow && <circle r={size * 1.1} fill={alpha(color === '#FFFFFF' ? '#FFFFFF' : color, 0.22)} />}
    <path d={STAR_PATH} transform={`rotate(${rotate}) scale(${size})`} fill={color} />
    <path d={STAR_PATH} transform={`rotate(${rotate + 45}) scale(${size * 0.45})`} fill={color} opacity={0.8} />
  </g>
);

/** Twinkling four-point stars scattered over an area; brighter on beats. */
export const SparkleField: React.FC<{
  count: number;
  seed: string;
  area?: { x: number; y: number; w: number; h: number };
  size?: [number, number];
  start?: number;
  gold?: number;
}> = ({ count, seed, area, size = [10, 26], start = -Infinity, gold = 0.4 }) => {
  const theme = useTheme();
  const cues = useCues();
  const frame = useAbsFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  if (!theme.deco.sparkles) return null;
  const a = area ?? { x: 0, y: 0, w: W, h: H };
  const t = frame / fps;
  const pulse = beatPulse(cues.beats, t, 0.25) * theme.intensity;
  const appear = Number.isFinite(start) ? fadeIn(frame, start, 0.6 * fps) : 1;
  const n = Math.round(count * Math.min(1.5, Math.max(0.5, theme.intensity)));
  return (
    <svg width={W} height={H} style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}>
      {Array.from({ length: n }, (_, i) => {
        const x = a.x + random(`${seed}x${i}`) * a.w;
        const y = a.y + random(`${seed}y${i}`) * a.h;
        const sz = size[0] + random(`${seed}s${i}`) * (size[1] - size[0]);
        const sp = 1.4 + random(`${seed}v${i}`) * 2.2;
        const tw = Math.pow(0.5 + 0.5 * Math.sin(t * sp + i * 1.9), 3);
        const scale = (0.25 + 0.75 * tw + pulse * 0.35) * appear;
        const color = random(`${seed}c${i}`) < gold ? theme.c.gold : '#FFFFFF';
        return <Sparkle key={i} x={x} y={y} size={sz * scale} color={color} rotate={t * 25 * (i % 2 ? 1 : -1)} opacity={Math.min(1, 0.4 + tw)} />;
      })}
    </svg>
  );
};
