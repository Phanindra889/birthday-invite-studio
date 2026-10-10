import { SCENE_META, type InvitationConfig } from './config';
import { parseIsoDate } from './format';
import { plainText } from './markup';
import { computeTimeline } from './timeline';

export interface Issue {
  field: string;
  level: 'error' | 'warning';
  message: string;
}

export const TARGET_RANGE = { min: 35, max: 45 };

export function validateConfig(c: InvitationConfig): Issue[] {
  const issues: Issue[] = [];
  const err = (field: string, message: string) => issues.push({ field, level: 'error', message });
  const warn = (field: string, message: string) => issues.push({ field, level: 'warning', message });

  if (!c.childName.trim()) err('childName', "Add the birthday child's name.");
  else if (c.childName.trim().length > 40) warn('childName', 'Very long names are shrunk to fit; consider a shorter form.');
  if (!c.occasion.trim()) warn('occasion', 'The occasion line is empty.');
  if (!parseIsoDate(c.eventDate)) err('eventDate', 'Enter a valid date.');
  if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(c.eventTime.trim())) err('eventTime', 'Enter a valid start time.');
  if (!c.venueName.trim()) warn('venueName', 'The venue name is empty.');
  if (c.venueAddress.length > 160) warn('venueAddress', 'Long addresses are shown in a smaller size.');
  if (c.rsvpContact.length > 80) warn('rsvpContact', 'Keep RSVP details short so they stay readable.');

  const longText: [keyof InvitationConfig['text'], number][] = [
    ['openingKicker', 40], ['openingHeadline', 50], ['nameTagline', 60], ['celebrationHeadline', 80],
    ['celebrationSubline', 70], ['inviteHeader', 30], ['inviteMessage', 140], ['closingHeadline', 80], ['closingMessage', 90],
  ];
  for (const [key, max] of longText) {
    if (plainText(c.text[key]).length > max) warn(`text.${key}`, `Longer than ${max} characters — it will be shrunk to fit.`);
  }

  const enabled = c.scenes.filter((s) => s.enabled);
  if (!enabled.length) err('scenes', 'Enable at least one scene.');
  for (const s of enabled) {
    const meta = SCENE_META[s.id];
    if (s.durationSeconds < meta.minDuration || s.durationSeconds > meta.maxDuration) {
      warn(`scene.${s.id}`, `${meta.short} is clamped to ${meta.minDuration}–${meta.maxDuration}s.`);
    }
  }
  const total = computeTimeline(c).durationSeconds;
  if (enabled.length && (total < TARGET_RANGE.min || total > TARGET_RANGE.max)) {
    warn('scenes', `Total length is ${total.toFixed(1)}s (target ${TARGET_RANGE.min}–${TARGET_RANGE.max}s).`);
  }
  if (c.audio.source === 'upload' && !c.musicUrl) warn('audio', 'The uploaded track is missing — upload it again or pick a built-in track.');
  if (c.audio.beatSync && c.audio.source !== 'none' && c.audio.beatSource !== 'track' && c.audio.beats.length < 4) {
    warn('audio', 'No beat markers yet — detect beats, generate a grid or tap the tempo.');
  }
  if (c.fps !== 30 && c.fps !== 60) err('fps', 'Frame rate must be 30 or 60.');
  return issues;
}
