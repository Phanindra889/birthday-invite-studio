import type { InvitationConfig } from './config';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export interface ParsedDate {
  year: number;
  month: number;
  day: number;
  weekday: string;
}

/** Parses YYYY-MM-DD without any timezone shifting. Returns null for invalid dates. */
export function parseIsoDate(iso: string): ParsedDate | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return { year, month, day, weekday: WEEKDAYS[d.getUTCDay()] };
}

/** "Sunday, 18 October 2026" */
export function formatLongDate(iso: string): string {
  const p = parseIsoDate(iso);
  if (!p) return iso;
  return `${p.weekday}, ${p.day} ${MONTHS[p.month - 1]} ${p.year}`;
}

/** { weekday: "Sunday", date: "18 October 2026" } for two-line layouts. */
export function splitLongDate(iso: string): { weekday: string; date: string } {
  const p = parseIsoDate(iso);
  if (!p) return { weekday: '', date: iso };
  return { weekday: p.weekday, date: `${p.day} ${MONTHS[p.month - 1]} ${p.year}` };
}

/** "19:00" -> "7:00 PM" */
export function formatTime12h(hhmm: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return hhmm;
  const h = Number(m[1]);
  const min = m[2];
  if (h > 23 || Number(min) > 59) return hhmm;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${min} ${suffix}`;
}

export function resolveTimeLabel(config: Pick<InvitationConfig, 'timeLabel' | 'eventTime'>): string {
  const custom = config.timeLabel.trim();
  return custom || `${formatTime12h(config.eventTime)} onwards`;
}

export function venueLine(config: Pick<InvitationConfig, 'venueName' | 'city'>): string {
  return [config.venueName.trim(), config.city.trim()].filter(Boolean).join(', ');
}

/** 75.25 -> "01:15.3" */
export function seconds(s: number): string {
  const m = Math.floor(s / 60);
  const rest = s - m * 60;
  return `${String(m).padStart(2, '0')}:${rest.toFixed(1).padStart(4, '0')}`;
}

export function slugify(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60) || 'invitation';
}
