import { describe, expect, it } from 'vitest';
import raw from '../sources/fixtures/content.json';
import { EditableContent } from '../schema';
import { checkContent } from './guards';

const { meta: _meta, ...rest } = raw as Record<string, unknown>;
const seed = EditableContent.parse(rest);
const TODAY = '2026-11-11';

describe('checkContent', () => {
  it('the fixture passes', () => {
    expect(checkContent(seed, TODAY).errors).toEqual([]);
  });

  it('blocks an empty schedule, duplicate slots and "other" without a name', () => {
    expect(checkContent({ ...seed, schedule: [] }, TODAY).errors[0].path).toBe('schedule');
    const s0 = seed.schedule[0];
    const dup = checkContent({ ...seed, schedule: [s0, { ...s0, id: 'x' }] }, TODAY).errors;
    expect(dup.map((e) => e.path)).toEqual(['schedule.1']);
    const other = checkContent({ ...seed, schedule: [{ ...s0, kind: 'other', name: undefined }] }, TODAY).errors;
    expect(other[0].path).toBe('schedule.0.name');
  });

  it('blocks prices ≤ 0 and opening hours that close before they open', () => {
    const p = checkContent({ ...seed, prices: [{ ...seed.prices[0], priceEUR: 0 }] }, TODAY).errors;
    expect(p[0].path).toBe('prices.0.priceEUR');
    const config = { ...seed.config, openingHours: { ...seed.config.openingHours, saturday: { opens: '12:00', closes: '09:00' } } };
    expect(checkContent({ ...seed, config }, TODAY).errors[0].path).toBe('config.openingHours.saturday');
  });

  it('blocks a notice that ends before it starts; only warns when it already expired', () => {
    const m = { id: 'm', highlight: { pt: 'Open Day' }, order: 0 };
    const bad = checkContent({ ...seed, marquee: [{ ...m, startsOn: '2026-12-10', endsOn: '2026-12-01' }] }, TODAY);
    expect(bad.errors[0].path).toBe('marquee.0.endsOn');
    const old = checkContent({ ...seed, marquee: [{ ...m, endsOn: '2025-12-31' }] }, TODAY);
    expect(old.errors).toEqual([]);
    expect(old.warnings[0].message).toContain('já expirou');
  });
});
