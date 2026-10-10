import type { AudioConfig, InvitationConfig, MusicSource } from './config';

export interface BuiltinTrack {
  id: Exclude<MusicSource, 'upload' | 'none'>;
  title: string;
  mood: string;
  file: string;
  bpm: number;
  beatsPerBar: number;
  /** Time of the first beat in seconds. */
  offset: number;
  duration: number;
}

// Both tracks are synthesized by scripts/generate-audio.mjs, so their beat grids are exact.
export const BUILTIN_TRACKS: BuiltinTrack[] = [
  {
    id: 'magical-sky',
    title: 'Magical Sky Celebration',
    mood: 'Music box, glockenspiel & pizzicato · 120 BPM · original',
    file: 'audio/magical-sky-celebration.wav',
    bpm: 120,
    beatsPerBar: 4,
    offset: 0,
    duration: 45,
  },
  {
    id: 'happy-birthday',
    title: 'Happy Birthday Music Box',
    mood: 'Waltz arrangement of the public-domain melody · 100 BPM · 3/4',
    file: 'audio/happy-birthday-music-box.wav',
    bpm: 100,
    beatsPerBar: 3,
    offset: 0,
    duration: 45,
  },
];

export const SFX_FILES = {
  chime: 'sfx/chime.wav',
  sparkle: 'sfx/sparkle.wav',
  pop: 'sfx/pop.wav',
  whoosh: 'sfx/whoosh.wav',
} as const;

export type SfxKind = keyof typeof SFX_FILES;

export const getBuiltinTrack = (id: MusicSource) => BUILTIN_TRACKS.find((t) => t.id === id) ?? null;

export function beatGrid(bpm: number, offset: number, duration: number): number[] {
  if (!(bpm > 0)) return [];
  const step = 60 / bpm;
  const out: number[] = [];
  let t = offset;
  while (t < 0) t += step;
  for (; t <= duration + 1e-6; t += step) out.push(Math.round(t * 1000) / 1000);
  return out;
}

/** Beat markers in the music file's own timeline. */
export function musicBeats(audio: AudioConfig): number[] {
  if (audio.source === 'none') return [];
  const track = getBuiltinTrack(audio.source);
  if (track && audio.beatSource === 'track') return beatGrid(track.bpm, track.offset, track.duration);
  return [...audio.beats].filter((b) => Number.isFinite(b)).sort((a, b) => a - b);
}

export interface BeatMarker {
  /** Seconds on the video timeline. */
  t: number;
  downbeat: boolean;
}

/** Which markers are downbeats (first beat of a bar), by index in the music's marker list. */
export function isDownbeat(index: number, beatsPerBar: number, downbeatOffset: number): boolean {
  const bpb = Math.max(1, Math.round(beatsPerBar));
  return (((index - downbeatOffset) % bpb) + bpb) % bpb === 0;
}

/** Beat markers mapped onto the video timeline (start offset and looping applied). */
export function videoBeats(config: InvitationConfig, videoDuration: number): BeatMarker[] {
  const { audio } = config;
  const beats = musicBeats(audio);
  if (!beats.length) return [];
  const bpb = effectiveBeatsPerBar(config);
  const offset = Math.max(0, audio.startOffset);
  const trackLen = getBuiltinTrack(audio.source)?.duration ?? audio.trackDuration;
  // A looping <Html5Audio> with trimBefore repeats the trimmed part [offset, trackLen].
  const period = audio.loop && trackLen - offset > 1 ? trackLen - offset : 0;
  const out: BeatMarker[] = [];
  for (let k = 0; k === 0 || (period > 0 && k * period <= videoDuration); k++) {
    beats.forEach((b, i) => {
      if (b < offset - 1e-6 || b > trackLen + 1e-6) return;
      const t = b - offset + k * period;
      if (t <= videoDuration) out.push({ t, downbeat: isDownbeat(i, bpb, audio.downbeatOffset) });
    });
  }
  return out.sort((a, b) => a.t - b.t);
}

export function effectiveBpm(config: InvitationConfig): number {
  const track = getBuiltinTrack(config.audio.source);
  if (track && config.audio.beatSource === 'track') return track.bpm;
  return config.audio.bpm;
}

export function effectiveBeatsPerBar(config: InvitationConfig): number {
  const track = getBuiltinTrack(config.audio.source);
  if (track && config.audio.beatSource === 'track') return track.beatsPerBar;
  return config.audio.beatsPerBar;
}
