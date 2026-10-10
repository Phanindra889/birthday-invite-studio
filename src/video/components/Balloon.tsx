import React, { useId } from 'react';
import { random, useVideoConfig } from 'remotion';
import { alpha, darken, lighten, mix } from '../../shared/color';
import { useCues, useTheme } from '../theme';
import { beatPulse, springIn, useAbsFrame } from '../util/anim';
import { earsOutlinePath } from '../util/ears';
import { svgId } from './Cloud';

export const Balloon: React.FC<{ color: string; width: number; sway?: number; stringLength?: number }> = ({ color, width, sway = 0, stringLength = 150 }) => {
  const t = useTheme();
  const id = svgId(useId());
  const isWhite = color.toUpperCase() === '#FFFFFF';
  const base = isWhite ? '#F6FAFE' : color;
  const h = 120 + stringLength;
  return (
    <svg viewBox={`0 0 100 ${h}`} width={width} height={(width * h) / 100} style={{ overflow: 'visible' }}>
      <defs>
        <radialGradient id={`bg${id}`} cx="0.34" cy="0.3" r="0.8">
          <stop offset="0" stopColor={lighten(base, 0.6)} />
          <stop offset="0.42" stopColor={base} />
          <stop offset="1" stopColor={darken(base, isWhite ? 0.2 : 0.3)} />
        </radialGradient>
      </defs>
      <path
        d={`M50 118 C ${50 + sway * 0.6} ${118 + stringLength * 0.3}, ${50 - sway} ${118 + stringLength * 0.6}, ${50 + sway * 0.4} ${118 + stringLength}`}
        stroke={alpha(t.c.deep, 0.4)}
        strokeWidth={1.3}
        fill="none"
      />
      <path d="M50 4 C 22 4 6 28 6 54 C 6 82 30 106 50 112 C 70 106 94 82 94 54 C 94 28 78 4 50 4 Z" fill={`url(#bg${id})`} />
      <path d="M45 110.5 L55 110.5 L52.5 118.5 L47.5 118.5 Z" fill={darken(base, 0.22)} />
      <ellipse cx={33} cy={34} rx={8.5} ry={17} transform="rotate(-28 33 34)" fill="#FFFFFF" opacity={0.55} />
      <circle cx={41} cy={17} r={3.4} fill="#FFFFFF" opacity={0.75} />
    </svg>
  );
};

/** Foil balloon in the three-circle ears silhouette. */
export const EarBalloon: React.FC<{ color: string; width: number; sway?: number; stringLength?: number }> = ({ color, width, sway = 0, stringLength = 150 }) => {
  const t = useTheme();
  const id = svgId(useId());
  const h = 168 + stringLength;
  return (
    <svg viewBox={`0 0 160 ${h}`} width={width} height={(width * h) / 160} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`fg${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={lighten(color, 0.65)} />
          <stop offset="0.3" stopColor={color} />
          <stop offset="0.55" stopColor={darken(color, 0.18)} />
          <stop offset="0.75" stopColor={lighten(color, 0.35)} />
          <stop offset="1" stopColor={darken(color, 0.25)} />
        </linearGradient>
      </defs>
      <path
        d={`M80 164 C ${80 + sway * 0.6} ${164 + stringLength * 0.3}, ${80 - sway} ${164 + stringLength * 0.6}, ${80 + sway * 0.4} ${164 + stringLength}`}
        stroke={alpha(t.c.deep, 0.4)}
        strokeWidth={1.4}
        fill="none"
      />
      <path d={earsOutlinePath(80, 104, 56)} fill={`url(#fg${id})`} stroke={lighten(color, 0.5)} strokeWidth={2.5} />
      <path d="M75 158 L85 158 L82.5 166 L77.5 166 Z" fill={darken(color, 0.25)} />
      <ellipse cx={60} cy={86} rx={10} ry={20} transform="rotate(-30 60 86)" fill="#FFFFFF" opacity={0.5} />
      <ellipse cx={30} cy={42} rx={6} ry={11} transform="rotate(-35 30 42)" fill="#FFFFFF" opacity={0.45} />
      <ellipse cx={122} cy={40} rx={5} ry={9} transform="rotate(-35 122 40)" fill="#FFFFFF" opacity={0.4} />
    </svg>
  );
};

export interface ClusterItem {
  x: number;
  y: number;
  w: number;
  color: string;
  ears?: boolean;
  z?: number;
}

/** A group of floating balloons that rise into place, bob gently and bounce on beats. */
export const BalloonCluster: React.FC<{ items: ClusterItem[]; start: number; seed: string; rise?: number }> = ({ items, start, seed, rise = 900 }) => {
  const theme = useTheme();
  const cues = useCues();
  const frame = useAbsFrame();
  const { fps } = useVideoConfig();
  if (!theme.deco.balloons) return null;
  const t = frame / fps;
  const k = theme.intensity;
  const pulse = beatPulse(cues.beats, t, 0.2) * k;
  return (
    <>
      {[...items]
        .sort((a, b) => (a.z ?? 0) - (b.z ?? 0))
        .map((b, i) => {
          const phase = random(`${seed}-p${i}`) * Math.PI * 2;
          const delay = Math.round(random(`${seed}-d${i}`) * 0.5 * fps);
          const s = springIn(frame, start + delay, fps, 16, 60, 1.2);
          const bob = Math.sin(t * 1.3 + phase) * 14 * k;
          const swayX = Math.sin(t * 0.8 + phase) * 10 * k;
          const rot = Math.sin(t * 0.9 + phase) * 4 * k;
          const y = b.y + (1 - s) * rise + bob - pulse * 10;
          const Comp = b.ears ? EarBalloon : Balloon;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: b.x + swayX,
                top: y,
                transform: `rotate(${rot}deg)`,
                transformOrigin: '50% 100%',
                opacity: Math.min(1, s * 2),
              }}
            >
              <Comp color={b.color} width={b.w} sway={Math.sin(t * 1.7 + phase) * 9} />
            </div>
          );
        })}
    </>
  );
};

export function balloonPalette(c: { sky: string; deep: string; white: string; gold: string; baby: string }) {
  return [c.sky, c.deep, '#FFFFFF', c.gold, mix(c.sky, c.deep, 0.45), c.baby];
}
