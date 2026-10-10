import React, { useMemo } from 'react';
import { useVideoConfig } from 'remotion';
import { alpha, darken, lighten } from '../../shared/color';
import type { TextAnimationId } from '../../shared/config';
import { parseMarkup } from '../../shared/markup';
import { useCues, useFontsReady, useTheme, type VisualTheme } from '../theme';
import { beatPulse, entrance, entranceStyle, useAbsFrame } from '../util/anim';
import { layoutText } from '../util/measure';

export type TextRole = 'display' | 'script' | 'body';

export interface RevealTextProps {
  /** Text with *highlight* markup and optional line breaks. */
  text: string;
  role: TextRole;
  /** Absolute frame where the first unit starts its entrance. */
  start: number;
  maxWidth: number;
  maxSize: number;
  minSize?: number;
  maxLines?: number;
  split?: 'word' | 'letter';
  /** Frames between units. Defaults to the beat-synced word stagger. */
  stagger?: number;
  lineHeight?: number;
  color?: string;
  weight?: number;
  highlightScale?: number;
  align?: 'center' | 'left';
  anim?: TextAnimationId;
  /** Surface the text sits on: 'scene' (sky) or 'card' (white card, no outline needed). */
  surface?: 'scene' | 'card';
  style?: React.CSSProperties;
}

export function roleStyle(role: TextRole, t: VisualTheme, size: number, surface: 'scene' | 'card', weight?: number, color?: string): React.CSSProperties {
  const font = t.fonts[role];
  const base: React.CSSProperties = {
    fontFamily: `"${font.family}", "Nunito", sans-serif`,
    fontWeight: weight ?? font.weight,
    fontSize: size,
    color: color ?? (surface === 'card' ? t.c.deep : t.ink),
  };
  if (surface === 'card') return base;
  const light = t.tone === 'light';
  if (role === 'display') {
    return {
      ...base,
      WebkitTextStroke: `${(size * 0.11).toFixed(1)}px ${t.outline}`,
      paintOrder: 'stroke fill',
      textShadow: light
        ? `0 ${size * 0.05}px 0 ${alpha(t.deepDark, 0.16)}, 0 ${size * 0.1}px ${size * 0.24}px ${alpha(t.c.deep, 0.3)}`
        : `0 0 ${size * 0.2}px ${alpha(t.c.sky, 0.7)}, 0 ${size * 0.06}px ${size * 0.12}px rgba(0,0,0,0.35)`,
    };
  }
  if (role === 'script') {
    return {
      ...base,
      color: color ?? (light ? t.c.deep : t.c.gold),
      textShadow: light
        ? `0 0 ${size * 0.08}px ${t.glow}, 0 0 ${size * 0.22}px ${t.glow}, 0 0 ${size * 0.4}px ${t.glow}`
        : `0 0 ${size * 0.25}px ${alpha(t.c.gold, 0.55)}, 0 ${size * 0.05}px ${size * 0.1}px rgba(0,0,0,0.35)`,
    };
  }
  return {
    ...base,
    color: color ?? t.inkSoft,
    textShadow: light
      ? `0 0 ${size * 0.12}px ${t.glow}, 0 0 ${size * 0.3}px ${t.glow}, 0 0 ${size * 0.5}px ${alpha(t.c.white, 0.8)}`
      : `0 ${size * 0.05}px ${size * 0.15}px rgba(0,0,0,0.45)`,
  };
}

/** Gold, outlined, extruded "sticker" lettering used for *highlighted* words. */
export const StickerText: React.FC<{ text: string; size: number; family: string; weight: number }> = ({ text, size, family, weight }) => {
  const t = useTheme();
  const depth = 7;
  const extrusion = Array.from({ length: depth }, (_, i) => `0 ${((i + 1) * size * 0.011).toFixed(1)}px 0 ${darken(t.c.deep, 0.18 + i * 0.03)}`).join(', ');
  const common: React.CSSProperties = { fontFamily: `"${family}", sans-serif`, fontWeight: weight, fontSize: size, whiteSpace: 'pre' };
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <span
        aria-hidden
        style={{
          ...common,
          position: 'absolute',
          left: 0,
          top: 0,
          color: t.c.deep,
          WebkitTextStroke: `${(size * 0.15).toFixed(1)}px ${t.deepDark}`,
          paintOrder: 'stroke fill',
          textShadow: `${extrusion}, 0 ${size * 0.12}px ${size * 0.22}px rgba(10, 30, 60, 0.35)`,
        }}
      >
        {text}
      </span>
      <span
        style={{
          ...common,
          position: 'relative',
          backgroundImage: `linear-gradient(180deg, ${lighten(t.c.gold, 0.75)} 8%, ${lighten(t.c.gold, 0.15)} 42%, ${t.c.gold} 58%, ${darken(t.c.gold, 0.2)} 95%)`,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          WebkitTextStroke: `${(size * 0.03).toFixed(1)}px rgba(255,255,255,0.95)`,
        }}
      >
        {text}
      </span>
    </span>
  );
};

export const RevealText: React.FC<RevealTextProps> = ({
  text,
  role,
  start,
  maxWidth,
  maxSize,
  minSize,
  maxLines = 2,
  split = 'word',
  stagger,
  lineHeight = 1.08,
  color,
  weight,
  highlightScale = 1.25,
  align,
  anim,
  surface = 'scene',
  style,
}) => {
  const theme = useTheme();
  const cues = useCues();
  const fontsReady = useFontsReady();
  const frame = useAbsFrame();
  const { fps } = useVideoConfig();
  const font = theme.fonts[role];
  const w = weight ?? font.weight;
  const scaledMax = Math.round(maxSize * theme.textScale);
  const layout = useMemo(
    () =>
      layoutText(parseMarkup(text), {
        family: font.family,
        weight: w,
        maxWidth,
        maxLines,
        maxSize: scaledMax,
        minSize: minSize ?? Math.round(scaledMax * 0.45),
        highlightScale,
        padEm: role === 'display' && surface === 'scene' ? 0.14 : 0.06,
        fontsReady,
      }),
    [text, font.family, w, maxWidth, maxLines, scaledMax, minSize, highlightScale, role, surface, fontsReady],
  );
  if (!text.trim()) return null;

  const size = layout.fontSize;
  const textAlign = align ?? theme.align;
  const unitStagger = stagger ?? (split === 'letter' ? Math.max(1, Math.round(fps * 0.035)) : cues.wordStaggerFrames);
  const style0 = roleStyle(role, theme, size, surface, w, color);
  const pulse = beatPulse(cues.beats, frame / fps, 0.22, true) * theme.intensity;
  const animStyle = anim ?? theme.anim;

  let unit = 0;
  return (
    <div style={{ width: maxWidth, textAlign, ...style }}>
      {layout.lines.map((line, li) => (
        <div key={li} style={{ whiteSpace: 'nowrap', lineHeight, fontSize: size, ...style0, textShadow: undefined, WebkitTextStroke: undefined }}>
          {line.map((word, wi) => {
            const units = split === 'letter' && !word.highlight ? Array.from(word.text) : [word.text];
            const node = (
              <span key={wi} style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
                {units.map((u, ui) => {
                  const e = entrance(frame, start + unit++ * unitStagger, fps, animStyle, theme.intensity);
                  const s = entranceStyle(e);
                  if (word.highlight) {
                    const idle = e.opacity >= 1 ? 1 + 0.07 * pulse : 1;
                    return (
                      <span key={ui} style={{ display: 'inline-block', ...s, transform: `${s.transform} scale(${idle})`, transformOrigin: '50% 70%' }}>
                        <StickerText text={u} size={size * highlightScale} family={theme.fonts.display.family} weight={theme.fonts.display.weight} />
                      </span>
                    );
                  }
                  return (
                    <span key={ui} style={{ display: 'inline-block', ...style0, ...s, transformOrigin: '50% 80%' }}>
                      {u}
                    </span>
                  );
                })}
              </span>
            );
            return wi === 0 ? node : [<span key={`s${wi}`}> </span>, node];
          })}
        </div>
      ))}
    </div>
  );
};
