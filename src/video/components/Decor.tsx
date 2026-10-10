import React, { useId } from 'react';
import { Easing, interpolate, useVideoConfig } from 'remotion';
import { alpha, darken, lighten } from '../../shared/color';
import { useCues, useFontsReady, useTheme } from '../theme';
import { beatPulse, clamp01, fadeIn, springIn, useAbsFrame } from '../util/anim';
import { earsCircles, earsOutlinePath } from '../util/ears';
import { measure } from '../util/measure';
import { svgId } from './Cloud';
import { Sparkle } from './Sparkles';

/** Large ears emblem that draws its outline, fills in, and holds a star. */
export const EarsEmblem: React.FC<{ cx: number; cy: number; R: number; start: number; starAt: number }> = ({ cx, cy, R, start, starAt }) => {
  const t = useTheme();
  const cues = useCues();
  const { c } = t;
  const id = svgId(useId());
  const frame = useAbsFrame();
  const { fps, width: W } = useVideoConfig();
  const time = frame / fps;
  const draw = interpolate(frame, [start, start + 1.3 * fps], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) });
  const fill = fadeIn(frame, start + 0.9 * fps, 0.6 * fps);
  const star = springIn(frame, starAt, fps, 9, 140, 0.8);
  const pulse = beatPulse(cues.beats, time, 0.25, true) * t.intensity;
  const path = earsOutlinePath(cx, cy, R);
  const circles = earsCircles(cx, cy, R);
  const shine = ((time * 0.35) % 1.4) - 0.2;
  const top = circles.left.cy - circles.left.r - 60;
  const h = R * 2.6 + 120;
  return (
    <svg width={W} height={top + h} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
      <defs>
        <radialGradient id={`gl${id}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={t.tone === 'dark' ? c.sky : '#FFFFFF'} stopOpacity={0.8} />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </radialGradient>
        <linearGradient id={`fl${id}`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor={lighten(c.deep, 0.32)} />
          <stop offset="0.6" stopColor={c.deep} />
          <stop offset="1" stopColor={darken(c.deep, 0.3)} />
        </linearGradient>
        <linearGradient id={`sh${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
          <stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0.45} />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </linearGradient>
        <clipPath id={`cl${id}`}>
          <path d={path} />
        </clipPath>
      </defs>
      <circle cx={cx} cy={cy - R * 0.25} r={R * 2.3} fill={`url(#gl${id})`} opacity={0.55 + 0.25 * draw + 0.2 * pulse} />
      <path d={path} fill={`url(#fl${id})`} opacity={fill} />
      <g clipPath={`url(#cl${id})`} opacity={fill}>
        {[circles.head, circles.left, circles.right].map((k, i) => (
          <ellipse key={i} cx={k.cx - k.r * 0.38} cy={k.cy - k.r * 0.4} rx={k.r * 0.2} ry={k.r * 0.36} transform={`rotate(-32 ${k.cx - k.r * 0.38} ${k.cy - k.r * 0.4})`} fill="#FFFFFF" opacity={0.28} />
        ))}
        <rect x={cx - R * 2 + shine * R * 4} y={cy - R * 2.5} width={R * 0.6} height={R * 5} fill={`url(#sh${id})`} transform={`rotate(20 ${cx} ${cy})`} />
      </g>
      <path d={path} fill="none" stroke={c.gold} strokeWidth={R * 0.075} strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
      <path d={path} fill="none" stroke="#FFFFFF" strokeWidth={R * 0.02} strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} opacity={0.9} />
      {draw > 0 && draw < 1 && <Sparkle x={pointOnEars(cx, cy, R, draw).x} y={pointOnEars(cx, cy, R, draw).y} size={R * 0.12} color="#FFFFFF" rotate={time * 90} />}
      {star > 0 && <Sparkle x={cx} y={cy + R * 0.05} size={R * 0.42 * star * (1 + 0.12 * pulse)} color={c.gold} rotate={(1 - star) * 120 + Math.sin(time * 2) * 6} />}
    </svg>
  );
};

/** Rough position of the drawing pen along the ears outline (for the sparkle that leads the stroke). */
function pointOnEars(cx: number, cy: number, R: number, p: number) {
  const { left, right, head } = earsCircles(cx, cy, R);
  // Parametrize by segments: left ear (35%), head top (10%), right ear (35%), head bottom (20%) — close enough for a sparkle.
  const seg = (k: { cx: number; cy: number; r: number }, a0: number, a1: number, u: number) => {
    const a = ((a0 + (a1 - a0) * u) * Math.PI) / 180;
    return { x: k.cx + Math.cos(a) * k.r, y: k.cy + Math.sin(a) * k.r };
  };
  if (p < 0.35) return seg(left, 110, 340, p / 0.35);
  if (p < 0.45) return seg(head, -110, -70, (p - 0.35) / 0.1);
  if (p < 0.8) return seg(right, 200, 430, (p - 0.45) / 0.35);
  return seg(head, 20, 160, (p - 0.8) / 0.2);
}

/** Pennant garland swinging across the top of the frame. */
export const Bunting: React.FC<{ start: number; y?: number; sag?: number; flags?: number }> = ({ start, y = 150, sag = 120, flags = 11 }) => {
  const t = useTheme();
  const cues = useCues();
  const { c } = t;
  const frame = useAbsFrame();
  const { fps, width: W } = useVideoConfig();
  if (!t.deco.bunting) return null;
  const time = frame / fps;
  const s = springIn(frame, start, fps, 12, 90);
  const pulse = beatPulse(cues.beats, time, 0.2) * t.intensity;
  const P0 = { x: -40, y }, P1 = { x: W / 2, y: y + sag * 2 }, P2 = { x: W + 40, y };
  const at = (u: number) => ({
    x: (1 - u) ** 2 * P0.x + 2 * (1 - u) * u * P1.x + u * u * P2.x,
    y: (1 - u) ** 2 * P0.y + 2 * (1 - u) * u * P1.y + u * u * P2.y,
    a: Math.atan2(2 * (1 - u) * (P1.y - P0.y) + 2 * u * (P2.y - P1.y), 2 * (1 - u) * (P1.x - P0.x) + 2 * u * (P2.x - P1.x)),
  });
  const colors = [c.sky, '#FFFFFF', c.deep, c.gold];
  return (
    <svg width={W} height={y + sag * 2 + 160} style={{ position: 'absolute', left: 0, top: -(1 - s) * 360, overflow: 'visible' }}>
      <path d={`M ${P0.x} ${P0.y} Q ${P1.x} ${P1.y} ${P2.x} ${P2.y}`} stroke={alpha(t.c.deep, 0.55)} strokeWidth={4} fill="none" />
      {Array.from({ length: flags }, (_, i) => {
        const u = (i + 0.5) / flags;
        const p = at(u);
        const sway = Math.sin(time * 2.2 + i * 0.9) * 5 * t.intensity + pulse * 4 * (i % 2 ? 1 : -1);
        const col = colors[i % colors.length];
        const dot = col === '#FFFFFF' ? c.sky : '#FFFFFF';
        return (
          <g key={i} transform={`translate(${p.x} ${p.y}) rotate(${(p.a * 180) / Math.PI + sway})`}>
            <path d="M-42 0 L42 0 L0 104 Z" fill={col} stroke={alpha(darken(col, 0.25), 0.6)} strokeWidth={2} strokeLinejoin="round" />
            <path d="M-42 0 L42 0 L36 12 L-36 12 Z" fill={alpha('#FFFFFF', 0.25)} />
            <circle cx={0} cy={36} r={10} fill={dot} />
            <circle cx={-11} cy={25} r={6} fill={dot} />
            <circle cx={11} cy={25} r={6} fill={dot} />
          </g>
        );
      })}
    </svg>
  );
};

/** Ribbon banner with folded tails; text in the script font. */
export const Ribbon: React.FC<{ text: string; start: number; size: number; maxWidth: number }> = ({ text, start, size, maxWidth }) => {
  const t = useTheme();
  const { c } = t;
  const fontsReady = useFontsReady();
  const frame = useAbsFrame();
  const { fps } = useVideoConfig();
  const font = t.fonts.script;
  if (!text.trim()) return null;
  const textW = measure(text, font.family, font.weight, size, fontsReady);
  const fit = Math.min(1, (maxWidth - size * 2.2) / textW);
  const fs = size * fit;
  const bandW = Math.min(maxWidth - size * 1.2, textW * fit + fs * 1.6);
  const bandH = fs * 1.5;
  const tail = fs * 0.9;
  const s = springIn(frame, start, fps, 13, 110);
  const W = bandW + tail * 2;
  const H = bandH + fs * 0.4;
  const back = darken(c.deep, 0.3);
  return (
    <div style={{ position: 'relative', width: W, height: H, transform: `scaleX(${0.2 + 0.8 * s})`, opacity: clamp01(s * 2) }}>
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <path d={`M0 ${fs * 0.4} L${tail * 1.6} ${fs * 0.4} L${tail * 1.6} ${H} L0 ${H} L${tail * 0.55} ${fs * 0.4 + bandH / 2} Z`} fill={back} />
        <path d={`M${W} ${fs * 0.4} L${W - tail * 1.6} ${fs * 0.4} L${W - tail * 1.6} ${H} L${W} ${H} L${W - tail * 0.55} ${fs * 0.4 + bandH / 2} Z`} fill={back} />
        <path d={`M${tail} ${bandH} L${tail * 1.6} ${H} L${tail * 1.6} ${bandH} Z`} fill={darken(c.deep, 0.5)} />
        <path d={`M${W - tail} ${bandH} L${W - tail * 1.6} ${H} L${W - tail * 1.6} ${bandH} Z`} fill={darken(c.deep, 0.5)} />
        <rect x={tail} y={0} width={bandW} height={bandH} rx={fs * 0.18} fill={c.deep} />
        <rect x={tail + 8} y={8} width={bandW - 16} height={bandH - 16} rx={fs * 0.14} fill="none" stroke={c.gold} strokeWidth={3} opacity={0.9} />
        <rect x={tail} y={0} width={bandW} height={bandH * 0.45} rx={fs * 0.18} fill="#FFFFFF" opacity={0.1} />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: tail,
          top: 0,
          width: bandW,
          height: bandH,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: `"${font.family}", cursive`,
          fontWeight: font.weight,
          fontSize: fs,
          color: '#FFFFFF',
          whiteSpace: 'nowrap',
          textShadow: `0 ${fs * 0.04}px ${fs * 0.1}px ${alpha('#000000', 0.25)}`,
          paddingBottom: fs * 0.08,
        }}
      >
        {text}
      </div>
    </div>
  );
};

/** A shooting star crossing the sky with a fading tail. */
export const ShootingStar: React.FC<{ start: number; from: [number, number]; to: [number, number]; duration?: number }> = ({ start, from, to, duration = 1.1 }) => {
  const t = useTheme();
  const id = svgId(useId());
  const frame = useAbsFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const p = (frame - start) / (duration * fps);
  if (p < 0 || p > 1.3 || !t.deco.sparkles) return null;
  const e = Easing.out(Easing.quad)(Math.min(1, p));
  const x = from[0] + (to[0] - from[0]) * e;
  const y = from[1] + (to[1] - from[1]) * e;
  const ang = Math.atan2(to[1] - from[1], to[0] - from[0]);
  const len = 380 * Math.min(1, p * 3) * (1 - Math.max(0, p - 0.8) * 2);
  const tx = x - Math.cos(ang) * len;
  const ty = y - Math.sin(ang) * len;
  const o = Math.min(1, (1.3 - p) * 3);
  return (
    <svg width={W} height={H} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
      <defs>
        <linearGradient id={`ss${id}`} gradientUnits="userSpaceOnUse" x1={x} y1={y} x2={tx} y2={ty}>
          <stop offset="0" stopColor="#FFFFFF" stopOpacity={0.95} />
          <stop offset="0.4" stopColor={t.c.gold} stopOpacity={0.6} />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </linearGradient>
      </defs>
      <line x1={x} y1={y} x2={tx} y2={ty} stroke={`url(#ss${id})`} strokeWidth={9} strokeLinecap="round" opacity={o} />
      <Sparkle x={x} y={y} size={30} color="#FFFFFF" rotate={p * 200} opacity={o} />
    </svg>
  );
};

const ICONS: Record<string, React.ReactNode> = {
  date: (
    <>
      <rect x={3.5} y={5} width={17} height={15.5} rx={3} />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
      <circle cx={8.5} cy={14.5} r={0.6} fill="currentColor" />
      <circle cx={12} cy={14.5} r={0.6} fill="currentColor" />
      <circle cx={15.5} cy={14.5} r={0.6} fill="currentColor" />
    </>
  ),
  time: (
    <>
      <circle cx={12} cy={12} r={8.5} />
      <path d="M12 7.5V12l3.2 2" />
    </>
  ),
  venue: (
    <>
      <path d="M12 21s-6.5-5.8-6.5-11A6.5 6.5 0 0 1 18.5 10c0 5.2-6.5 11-6.5 11Z" />
      <circle cx={12} cy={10} r={2.4} />
    </>
  ),
  rsvp: <path d="M6 4h2.8l1.7 4.4-2.2 1.4a10.5 10.5 0 0 0 5.4 5.4l1.4-2.2 4.4 1.7V17.5a2 2 0 0 1-2 2A14.5 14.5 0 0 1 4 6a2 2 0 0 1 2-2Z" />,
  heart: <path d="M12 19.5s-7-4.3-7-9.6A3.9 3.9 0 0 1 12 7.6a3.9 3.9 0 0 1 7 2.3c0 5.3-7 9.6-7 9.6Z" />,
};

export const IconBadge: React.FC<{ icon: keyof typeof ICONS | string; size: number }> = ({ icon, size }) => {
  const t = useTheme();
  const id = svgId(useId());
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" style={{ flex: 'none', overflow: 'visible' }}>
      <defs>
        <linearGradient id={`ib${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={lighten(t.c.deep, 0.25)} />
          <stop offset="1" stopColor={darken(t.c.deep, 0.15)} />
        </linearGradient>
      </defs>
      <circle cx={24} cy={25.5} r={22} fill={alpha(t.c.deep, 0.18)} />
      <circle cx={24} cy={24} r={22} fill={`url(#ib${id})`} stroke={t.c.gold} strokeWidth={2} />
      <g transform="translate(12 12)" fill="none" stroke="#FFFFFF" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" color="#FFFFFF">
        {ICONS[icon]}
      </g>
    </svg>
  );
};
