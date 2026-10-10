import type { BackgroundId, BodyFontId, DisplayFontId, ScriptFontId, ThemeColors } from './config';

export interface ThemePreset {
  id: string;
  name: string;
  colors: ThemeColors;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'sky-blue-mickey-inspired',
    name: 'Classic Sky Blue',
    colors: { sky: '#87CEEB', baby: '#C7E8FA', deep: '#2463A6', white: '#FFFFFF', silver: '#DCE6F0', gold: '#F2D58A' },
  },
  {
    id: 'royal-blue-gold',
    name: 'Royal Blue & Gold',
    colors: { sky: '#6FB7E9', baby: '#D3EAFA', deep: '#1B4C8C', white: '#FFFFFF', silver: '#E1E9F2', gold: '#E9C46A' },
  },
  {
    id: 'pastel-cloud',
    name: 'Pastel Cloud',
    colors: { sky: '#A3D5EF', baby: '#E2F2FC', deep: '#3A72AE', white: '#FFFFFF', silver: '#EBF1F7', gold: '#F4DCA0' },
  },
  {
    id: 'ocean-breeze',
    name: 'Ocean Breeze',
    colors: { sky: '#74C3E6', baby: '#CDEEFA', deep: '#1C5E8C', white: '#FFFFFF', silver: '#D9E8EF', gold: '#F3C878' },
  },
];

export const BACKGROUNDS: { id: BackgroundId; label: string; description: string; tone: 'light' | 'dark' }[] = [
  { id: 'sky', label: 'Sunny Sky', description: 'Bright sky gradient with light rays', tone: 'light' },
  { id: 'dreamy', label: 'Dreamy Clouds', description: 'Soft pastel haze, extra clouds', tone: 'light' },
  { id: 'polka', label: 'Polka Dots', description: 'Playful dots on baby blue', tone: 'light' },
  { id: 'twilight', label: 'Evening Twilight', description: 'Deep blue with twinkling stars', tone: 'dark' },
];

export interface FontOption<T extends string> {
  id: T;
  label: string;
  family: string;
  /** Weight used for headings / main usage. */
  weight: number;
  /** Additional weights to preload. */
  weights: number[];
}

export const DISPLAY_FONTS: FontOption<DisplayFontId>[] = [
  { id: 'fredoka', label: 'Fredoka (rounded)', family: 'Fredoka', weight: 600, weights: [500, 600, 700] },
  { id: 'baloo', label: 'Baloo 2 (bubbly)', family: 'Baloo 2', weight: 800, weights: [600, 700, 800] },
  { id: 'luckiest', label: 'Luckiest Guy (cartoon)', family: 'Luckiest Guy', weight: 400, weights: [400] },
  { id: 'chewy', label: 'Chewy (playful)', family: 'Chewy', weight: 400, weights: [400] },
];

export const SCRIPT_FONTS: FontOption<ScriptFontId>[] = [
  { id: 'dancing', label: 'Dancing Script', family: 'Dancing Script', weight: 700, weights: [600, 700] },
  { id: 'pacifico', label: 'Pacifico', family: 'Pacifico', weight: 400, weights: [400] },
  { id: 'greatvibes', label: 'Great Vibes', family: 'Great Vibes', weight: 400, weights: [400] },
];

export const BODY_FONTS: FontOption<BodyFontId>[] = [
  { id: 'nunito', label: 'Nunito', family: 'Nunito', weight: 700, weights: [600, 700, 800, 900] },
  { id: 'quicksand', label: 'Quicksand', family: 'Quicksand', weight: 700, weights: [500, 600, 700] },
  { id: 'fredoka', label: 'Fredoka', family: 'Fredoka', weight: 500, weights: [500, 600, 700] },
];

export const findFont = <T extends string>(list: FontOption<T>[], id: T): FontOption<T> =>
  list.find((f) => f.id === id) ?? list[0];
