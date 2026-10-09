import { describe, expect, it } from 'vitest';
import {
  buildScheduleGrid,
  formatPrice,
  lisbonToday,
  localize,
  selectActiveMarquee,
  splitBio,
} from './select';
import type { MarqueeItem, ScheduleSlot } from './schema';

const item = (id: string, o: Partial<MarqueeItem> = {}): MarqueeItem => ({
  id,
  highlight: { pt: id },
  order: 0,
  ...o,
});

describe('selectActiveMarquee', () => {
  it('applies inclusive start/end bounds', () => {
    const items = [
      item('a', { startsOn: '2026-10-09', endsOn: '2026-10-09' }),
      item('past', { endsOn: '2026-10-08' }),
      item('future', { startsOn: '2026-10-10' }),
      item('open'),
    ];
    expect(selectActiveMarquee(items, '2026-10-09').map((i) => i.id)).toEqual(['a', 'open']);
  });
  it('sorts by order', () => {
    const items = [item('b', { order: 2 }), item('a', { order: 1 })];
    expect(selectActiveMarquee(items, '2026-01-01').map((i) => i.id)).toEqual(['a', 'b']);
  });
  it('returns [] when nothing is active', () => {
    expect(selectActiveMarquee([item('x', { endsOn: '2020-01-01' })], '2026-01-01')).toEqual([]);
  });
});

describe('buildScheduleGrid', () => {
  const slot = (id: string, day: ScheduleSlot['day'], time: string): ScheduleSlot => ({
    id,
    day,
    time,
    kind: 'crossfit',
  });
  it('derives sorted rows and hides Sunday when empty', () => {
    const g = buildScheduleGrid([slot('1', 'mon', '19:00'), slot('2', 'tue', '06:15')]);
    expect(g.times).toEqual(['06:15', '19:00']);
    expect(g.days).toEqual(['mon', 'tue', 'wed', 'thu', 'fri', 'sat']);
    expect(g.cells['19:00']!.mon).toHaveLength(1);
    expect(g.cells['19:00']!.tue).toBeUndefined();
  });
  it('shows Sunday when a Sunday slot exists and stacks parallel classes', () => {
    const g = buildScheduleGrid([slot('1', 'sun', '10:00'), slot('2', 'sun', '10:00')]);
    expect(g.days).toContain('sun');
    expect(g.cells['10:00']!.sun).toHaveLength(2);
  });
});

describe('lisbonToday', () => {
  it('uses the Lisbon calendar day, not UTC', () => {
    // 23:30 UTC on 2026-07-09 is already 00:30 on the 10th in Lisbon (WEST, UTC+1)
    expect(lisbonToday(new Date('2026-07-09T23:30:00Z'))).toEqual({
      isoDate: '2026-07-10',
      weekday: 'fri',
    });
  });
  it('handles DST end (last Sunday of October)', () => {
    expect(lisbonToday(new Date('2026-10-25T12:00:00Z')).weekday).toBe('sun');
  });
});

describe('helpers', () => {
  it('localize falls back to pt', () => {
    expect(localize({ pt: 'Olá' }, 'en')).toBe('Olá');
    expect(localize({ pt: 'Olá', en: ' ' }, 'en')).toBe('Olá');
    expect(localize({ pt: 'Olá', en: 'Hi' }, 'en')).toBe('Hi');
    expect(localize(undefined, 'en')).toBeUndefined();
    // other languages: lang -> en -> pt
    expect(localize({ pt: 'Olá', en: 'Hi', fr: 'Salut' }, 'fr')).toBe('Salut');
    expect(localize({ pt: 'Olá', en: 'Hi' }, 'de')).toBe('Hi');
    expect(localize({ pt: 'Olá' }, 'uk')).toBe('Olá');
    expect(localize({ pt: 'Olá', en: 'Hi', ru: ' ' }, 'ru')).toBe('Hi');
  });
  it('formatPrice', () => {
    expect(formatPrice(20)).toBe('€20');
    expect(formatPrice(22.5)).toBe('€22,50');
  });
  it('splitBio', () => {
    expect(splitBio('A\n\n B \n\n\nC')).toEqual(['A', 'B', 'C']);
  });
});
