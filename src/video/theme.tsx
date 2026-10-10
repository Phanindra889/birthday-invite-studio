import { createContext, useContext } from 'react';
import { alpha, darken, lighten, mix } from '../shared/color';
import type { BackgroundId, DecorationId, InvitationConfig, TextAnimationId, ThemeColors } from '../shared/config';
import { DEFAULT_CONFIG } from '../shared/config';
import type { CueSchedule } from '../shared/cues';
import { computeCues } from '../shared/cues';
import { BACKGROUNDS, BODY_FONTS, DISPLAY_FONTS, SCRIPT_FONTS, findFont } from '../shared/themes';
import type { TimelineScene } from '../shared/timeline';

export interface FontRef {
  family: string;
  weight: number;
}

export interface VisualTheme {
  c: ThemeColors;
  tone: 'light' | 'dark';
  bg: BackgroundId;
  fonts: { display: FontRef; script: FontRef; body: FontRef };
  textScale: number;
  align: 'center' | 'left';
  anim: TextAnimationId;
  intensity: number;
  deco: Record<DecorationId, boolean>;
  photoFrame: 'circle' | 'ears';
  /** Main text color and its outline / glow partner. */
  ink: string;
  inkSoft: string;
  outline: string;
  glow: string;
  goldDeep: string;
  goldLight: string;
  deepDark: string;
  fadeColor: string;
}

export function buildTheme(config: InvitationConfig): VisualTheme {
  const d = config.design;
  const c = d.colors;
  const tone = BACKGROUNDS.find((b) => b.id === d.background)?.tone ?? 'light';
  const display = findFont(DISPLAY_FONTS, d.fonts.display);
  const script = findFont(SCRIPT_FONTS, d.fonts.script);
  const body = findFont(BODY_FONTS, d.fonts.body);
  const light = tone === 'light';
  return {
    c,
    tone,
    bg: d.background,
    fonts: {
      display: { family: display.family, weight: display.weight },
      script: { family: script.family, weight: script.weight },
      body: { family: body.family, weight: body.weight },
    },
    textScale: d.textScale,
    align: d.textAlign,
    anim: d.textAnimation,
    intensity: d.intensity,
    deco: d.decorations,
    photoFrame: d.photoFrame,
    ink: light ? c.deep : c.white,
    inkSoft: light ? mix(c.deep, '#1b2f4d', 0.25) : lighten(c.baby, 0.3),
    outline: light ? c.white : darken(c.deep, 0.45),
    glow: light ? alpha(c.white, 0.95) : alpha(c.sky, 0.65),
    goldDeep: darken(c.gold, 0.42),
    goldLight: lighten(c.gold, 0.6),
    deepDark: darken(c.deep, 0.35),
    fadeColor: light ? lighten(c.baby, 0.55) : darken(c.deep, 0.6),
  };
}

export const ThemeContext = createContext<VisualTheme>(buildTheme(DEFAULT_CONFIG));
export const useTheme = () => useContext(ThemeContext);

export const CueContext = createContext<CueSchedule>(computeCues(DEFAULT_CONFIG));
export const useCues = () => useContext(CueContext);

export const ConfigContext = createContext<InvitationConfig>(DEFAULT_CONFIG);
export const useConfig = () => useContext(ConfigContext);

export const FontsReadyContext = createContext(false);
export const useFontsReady = () => useContext(FontsReadyContext);

export const SceneContext = createContext<TimelineScene | null>(null);
export const useScene = () => {
  const s = useContext(SceneContext);
  if (!s) throw new Error('useScene() must be used inside a scene');
  return s;
};
