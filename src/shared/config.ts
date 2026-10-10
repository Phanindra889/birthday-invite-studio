// Central, serializable invitation configuration shared by the editor, the video
// composition and the render server. Everything the video shows comes from here.

export type SceneId = 'opening' | 'birthday-boy' | 'celebration' | 'event-details' | 'closing';

export interface SceneConfig {
  id: SceneId;
  enabled: boolean;
  durationSeconds: number;
}

export type TextKey =
  | 'openingKicker'
  | 'openingHeadline'
  | 'nameTagline'
  | 'celebrationHeadline'
  | 'celebrationSubline'
  | 'inviteHeader'
  | 'inviteMessage'
  | 'closingHeadline'
  | 'closingMessage'
  | 'signoffPrefix';

export type DisplayFontId = 'fredoka' | 'baloo' | 'luckiest' | 'chewy';
export type ScriptFontId = 'dancing' | 'pacifico' | 'greatvibes';
export type BodyFontId = 'nunito' | 'quicksand' | 'fredoka';
export type BackgroundId = 'sky' | 'dreamy' | 'twilight' | 'polka';
export type TransitionId = 'mix' | 'ears' | 'fade' | 'slide' | 'zoom';
export type TextAnimationId = 'pop' | 'rise' | 'bounce' | 'fade';
export type DecorationId = 'clouds' | 'balloons' | 'sparkles' | 'confetti' | 'lightRays' | 'ears' | 'bokeh' | 'bunting';
export type MusicSource = 'magical-sky' | 'happy-birthday' | 'upload' | 'none';
export type BeatSource = 'track' | 'detected' | 'grid' | 'manual';
export type AspectRatio = '9:16' | '16:9';

export interface ThemeColors {
  sky: string;
  baby: string;
  deep: string;
  white: string;
  silver: string;
  gold: string;
}

export interface DesignConfig {
  colors: ThemeColors;
  background: BackgroundId;
  fonts: { display: DisplayFontId; script: ScriptFontId; body: BodyFontId };
  textScale: number;
  textAlign: 'center' | 'left';
  textAnimation: TextAnimationId;
  transition: TransitionId;
  /** 0.5 = subtle, 1 = balanced, 1.5 = lively. Scales motion amplitude and particle counts. */
  intensity: number;
  decorations: Record<DecorationId, boolean>;
  photoFrame: 'circle' | 'ears';
}

export interface SfxConfig {
  enabled: boolean;
  volume: number;
  chimes: boolean;
  sparkles: boolean;
  pops: boolean;
  whooshes: boolean;
}

export interface AudioConfig {
  source: MusicSource;
  /** Display name of an uploaded track. The file itself lives in the browser (IndexedDB). */
  uploadName: string;
  /** Length of the selected track in seconds (needed for looping uploads). */
  trackDuration: number;
  volume: number;
  /** Seconds to skip at the start of the music file. */
  startOffset: number;
  fadeIn: number;
  fadeOut: number;
  loop: boolean;
  /** When on, text reveals, bursts and accents snap to the beat markers. */
  beatSync: boolean;
  bpm: number;
  beatsPerBar: number;
  /** Which beat (0-based) of the marker list is the first downbeat. */
  downbeatOffset: number;
  /** Beat times in seconds, measured in the music file's own time. */
  beats: number[];
  beatSource: BeatSource;
  sfx: SfxConfig;
}

export interface InvitationConfig {
  version: 1;
  childName: string;
  occasion: string;
  /** ISO date, YYYY-MM-DD. */
  eventDate: string;
  /** 24h time, HH:mm. */
  eventTime: string;
  /** Custom time label. Empty = generated from eventTime ("7:00 PM onwards"). */
  timeLabel: string;
  venueName: string;
  city: string;
  venueAddress: string;
  parentsNames: string;
  rsvpContact: string;
  /** Data URL or http(s) URL of the cropped baby photo. Empty = no photo. */
  photoUrl: string;
  theme: string;
  aspectRatio: AspectRatio;
  width: number;
  height: number;
  fps: number;
  targetDurationSeconds: number;
  /** Resolved music URL for uploaded tracks (blob: in the editor, http: on the render server). */
  musicUrl: string;
  scenes: SceneConfig[];
  text: Record<TextKey, string>;
  design: DesignConfig;
  audio: AudioConfig;
}

export const SCENE_META: Record<
  SceneId,
  { label: string; short: string; description: string; defaultDuration: number; minDuration: number; maxDuration: number }
> = {
  opening: {
    label: 'Magical Sky Opening',
    short: 'Opening',
    description: 'Clouds part, the ears emblem draws in and the opening line appears.',
    defaultDuration: 5,
    minDuration: 3,
    maxDuration: 12,
  },
  'birthday-boy': {
    label: 'Birthday Boy Reveal',
    short: 'Name reveal',
    description: 'Photo (or the big number 1), the name and the tagline with balloons and confetti.',
    defaultDuration: 7,
    minDuration: 4,
    maxDuration: 15,
  },
  celebration: {
    label: 'First Birthday Celebration',
    short: 'Celebration',
    description: 'Birthday cake, bunting, balloons and confetti bursts on the downbeats.',
    defaultDuration: 8,
    minDuration: 4,
    maxDuration: 15,
  },
  'event-details': {
    label: 'Event Invitation',
    short: 'Event details',
    description: 'Date, time, venue and optional address / RSVP on an invitation card.',
    defaultDuration: 12,
    minDuration: 6,
    maxDuration: 20,
  },
  closing: {
    label: 'Heartwarming Closing',
    short: 'Closing',
    description: 'Closing messages, the name, a big number 1, balloon release and fade-out.',
    defaultDuration: 13,
    minDuration: 6,
    maxDuration: 20,
  },
};

export const SCENE_ORDER: SceneId[] = ['opening', 'birthday-boy', 'celebration', 'event-details', 'closing'];

export const DEFAULT_TEXT: Record<TextKey, string> = {
  openingKicker: 'A Little Star',
  openingHeadline: 'Is Turning *ONE!*',
  nameTagline: 'Our Little Prince\nIs Turning *ONE!*',
  celebrationHeadline: '*ONE* Year of Smiles, Love & Little Adventures!',
  celebrationSubline: 'Tiny hands, little feet, and a heart so sweet!',
  inviteHeader: "You're Invited!",
  inviteMessage: 'Join us for a magical Mickey-inspired celebration as we celebrate his first birthday.',
  closingHeadline: "Come Celebrate Our Little Prince's Special Day!",
  closingMessage: 'Your Presence Will Make Our Celebration Extra Special.',
  signoffPrefix: 'With love,',
};

export const DEFAULT_COLORS: ThemeColors = {
  sky: '#87CEEB',
  baby: '#C7E8FA',
  deep: '#2463A6',
  white: '#FFFFFF',
  silver: '#DCE6F0',
  gold: '#F2D58A',
};

export const DEFAULT_CONFIG: InvitationConfig = {
  version: 1,
  childName: 'Vengala Mounish',
  occasion: '1st Birthday Celebration',
  eventDate: '2026-10-18',
  eventTime: '19:00',
  timeLabel: '7:00 PM onwards',
  venueName: 'Y Convention',
  city: 'Vijayawada',
  venueAddress: '',
  parentsNames: '',
  rsvpContact: '',
  photoUrl: '',
  theme: 'sky-blue-mickey-inspired',
  aspectRatio: '9:16',
  width: 1080,
  height: 1920,
  fps: 30,
  targetDurationSeconds: 45,
  musicUrl: '',
  scenes: [
    { id: 'opening', enabled: true, durationSeconds: 5 },
    { id: 'birthday-boy', enabled: true, durationSeconds: 7 },
    { id: 'celebration', enabled: true, durationSeconds: 8 },
    { id: 'event-details', enabled: true, durationSeconds: 12 },
    { id: 'closing', enabled: true, durationSeconds: 13 },
  ],
  text: { ...DEFAULT_TEXT },
  design: {
    colors: { ...DEFAULT_COLORS },
    background: 'sky',
    fonts: { display: 'fredoka', script: 'dancing', body: 'nunito' },
    textScale: 1,
    textAlign: 'center',
    textAnimation: 'pop',
    transition: 'mix',
    intensity: 1,
    decorations: {
      clouds: true,
      balloons: true,
      sparkles: true,
      confetti: true,
      lightRays: true,
      ears: true,
      bokeh: true,
      bunting: true,
    },
    photoFrame: 'ears',
  },
  audio: {
    source: 'magical-sky',
    uploadName: '',
    trackDuration: 45,
    volume: 0.85,
    startOffset: 0,
    fadeIn: 0.4,
    fadeOut: 2.5,
    loop: false,
    beatSync: true,
    bpm: 120,
    beatsPerBar: 4,
    downbeatOffset: 0,
    beats: [],
    beatSource: 'track',
    sfx: { enabled: true, volume: 0.45, chimes: true, sparkles: true, pops: true, whooshes: false },
  },
};

/** Deep-ish clone that is safe for the plain JSON config. */
export const cloneConfig = (c: InvitationConfig): InvitationConfig => JSON.parse(JSON.stringify(c));

/**
 * Merges a partial / older config (e.g. from localStorage or an imported JSON file)
 * over the defaults so new fields always exist.
 */
export function normalizeConfig(input: unknown): InvitationConfig {
  const base = cloneConfig(DEFAULT_CONFIG);
  if (!input || typeof input !== 'object') return base;
  const src = input as Partial<InvitationConfig>;
  const merged: InvitationConfig = {
    ...base,
    ...src,
    version: 1,
    text: { ...base.text, ...(src.text ?? {}) },
    design: {
      ...base.design,
      ...(src.design ?? {}),
      colors: { ...base.design.colors, ...(src.design?.colors ?? {}) },
      fonts: { ...base.design.fonts, ...(src.design?.fonts ?? {}) },
      decorations: { ...base.design.decorations, ...(src.design?.decorations ?? {}) },
    },
    audio: {
      ...base.audio,
      ...(src.audio ?? {}),
      sfx: { ...base.audio.sfx, ...(src.audio?.sfx ?? {}) },
    },
  };
  const known = new Set<SceneId>(SCENE_ORDER);
  const scenes = Array.isArray(src.scenes)
    ? src.scenes.filter((s): s is SceneConfig => !!s && known.has(s.id as SceneId))
    : base.scenes;
  // Keep every scene type present exactly once (disabled ones can be re-enabled later).
  const seen = new Set(scenes.map((s) => s.id));
  merged.scenes = [
    ...scenes.map((s) => ({ id: s.id, enabled: s.enabled !== false, durationSeconds: Number(s.durationSeconds) || SCENE_META[s.id].defaultDuration })),
    ...SCENE_ORDER.filter((id) => !seen.has(id)).map((id) => ({ id, enabled: false, durationSeconds: SCENE_META[id].defaultDuration })),
  ];
  if (merged.aspectRatio !== '9:16') merged.aspectRatio = '9:16';
  merged.width = 1080;
  merged.height = 1920;
  merged.fps = merged.fps === 60 ? 60 : 30;
  return merged;
}
