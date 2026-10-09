import type { Localized, MarqueeItem, ScheduleSlot, Weekday } from './schema';

import type { Lang } from './langs';
export type { Lang };

export const WEEKDAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const JS_DAY_TO_WEEKDAY: Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/** Localized field -> string, falling back to PT when EN is missing/empty. */
export function localize(field: Localized, lang: Lang): string;
export function localize(field: Localized | undefined, lang: Lang): string | undefined;
export function localize(field: Localized | undefined, lang: Lang): string | undefined {
  if (!field) return undefined;
  // lang -> en -> pt
  return field[lang]?.trim() || field.en?.trim() || field.pt;
}

/** Calendar date + weekday as seen in Europe/Lisbon at `now`. */
export function lisbonToday(now: Date = new Date()): { isoDate: string; weekday: Weekday } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Lisbon',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  const isoDate = `${get('year')}-${get('month')}-${get('day')}`;
  // Date.UTC on the Lisbon calendar date gives the right weekday regardless of host TZ.
  const jsDay = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  return { isoDate, weekday: JS_DAY_TO_WEEKDAY[jsDay]! };
}

/** startsOn <= today <= endsOn (each bound optional), sorted by `order`. */
export function selectActiveMarquee(items: MarqueeItem[], todayIso: string): MarqueeItem[] {
  return items
    .filter((i) => (!i.startsOn || i.startsOn <= todayIso) && (!i.endsOn || todayIso <= i.endsOn))
    .sort((a, b) => a.order - b.order);
}

export interface ScheduleGrid {
  days: Weekday[];
  times: string[];
  /** cells[time][day] -> slots (usually 0 or 1) */
  cells: Record<string, Partial<Record<Weekday, ScheduleSlot[]>>>;
}

/** Rows = sorted unique times. Columns = Mon–Sat, plus Sun only if any Sunday slot exists. */
export function buildScheduleGrid(slots: ScheduleSlot[]): ScheduleGrid {
  const hasSunday = slots.some((s) => s.day === 'sun');
  const days = hasSunday ? WEEKDAYS : WEEKDAYS.filter((d) => d !== 'sun');
  const times = [...new Set(slots.map((s) => s.time))].sort();
  const cells: ScheduleGrid['cells'] = {};
  for (const t of times) cells[t] = {};
  for (const s of slots) {
    const row = cells[s.time]!;
    (row[s.day] ??= []).push(s);
  }
  return { days, times, cells };
}

/** Slots for one day, ordered by time (mobile day-tabs list). */
export function slotsForDay(slots: ScheduleSlot[], day: Weekday): ScheduleSlot[] {
  return slots.filter((s) => s.day === day).sort((a, b) => a.time.localeCompare(b.time));
}

/** €20 for integers, €22,50 otherwise (design style, pt-PT decimal comma). */
export function formatPrice(eur: number): string {
  return Number.isInteger(eur) ? `€${eur}` : `€${eur.toFixed(2).replace('.', ',')}`;
}

/** Split a bio on blank lines. First paragraph is rendered bold by the UI. */
export function splitBio(bio: string): string[] {
  return bio
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}
