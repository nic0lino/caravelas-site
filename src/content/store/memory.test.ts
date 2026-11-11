import { describe, expect, it } from 'vitest';
import raw from '../sources/fixtures/content.json';
import { EditableContent } from '../schema';
import { createMemoryStore } from './memory';
import { DraftConflictError, InvalidContentError, NotFoundError, PublishBlockedError } from './types';

const { meta: _meta, ...rest } = raw as Record<string, unknown>;
const seed = EditableContent.parse(rest);

function setup() {
  let t = Date.parse('2026-11-11T10:00:00Z');
  const store = createMemoryStore({ seed, seedAuthor: 'juanpi@x', now: () => new Date((t += 60_000)) });
  return store;
}
const withPrice = (c: EditableContent, i: number, priceEUR: number): EditableContent => ({
  ...c,
  prices: c.prices.map((p, j) => (j === i ? { ...p, priceEUR } : p)),
});

describe('memory store', () => {
  it('starts with the seed published as v1 and no saved draft', async () => {
    const s = setup();
    const pub = await s.getPublished();
    expect(pub?.version).toMatchObject({ id: 'v1', status: 'published', author: 'juanpi@x' });
    const d = await s.getDraft();
    expect(d?.revision).toBe(0);
    expect(d?.basedOn).toBe('v1');
    expect(d?.content).toEqual(seed);
  });

  it('an empty store has nothing published and no draft', async () => {
    const s = createMemoryStore();
    expect(await s.getPublished()).toBeNull();
    expect(await s.getDraft()).toBeNull();
    await expect(s.publish('a@x')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('save → publish creates v2, archives v1 and clears the draft', async () => {
    const s = setup();
    const d1 = await s.saveDraft(withPrice(seed, 0, 25), 'feu@x', 0);
    expect(d1).toMatchObject({ revision: 1, updatedBy: 'feu@x', basedOn: 'v1' });
    expect((await s.getPublished())?.content.prices[0].priceEUR).toBe(seed.prices[0].priceEUR); // not live yet

    const v2 = await s.publish('feu@x', 'Drop-in a 25 €');
    expect(v2).toMatchObject({ id: 'v2', status: 'published', basedOn: 'v1', note: 'Drop-in a 25 €' });
    expect((await s.getPublished())?.content.prices[0].priceEUR).toBe(25);
    expect((await s.listVersions()).map((v) => [v.id, v.status])).toEqual([['v2', 'published'], ['v1', 'archived']]);
    expect((await s.getDraft())?.revision).toBe(0);
  });

  it('rejects a stale save instead of overwriting (two editors)', async () => {
    const s = setup();
    await s.saveDraft(withPrice(seed, 0, 25), 'ana@x', 0);
    const err = await s.saveDraft(withPrice(seed, 0, 30), 'feu@x', 0).catch((e) => e);
    expect(err).toBeInstanceOf(DraftConflictError);
    expect(err.current).toMatchObject({ revision: 1, updatedBy: 'ana@x' });
    expect((await s.getDraft())?.content.prices[0].priceEUR).toBe(25);
  });

  it('never stores content that fails the schema', async () => {
    const s = setup();
    const bad = { ...seed, schedule: [{ ...seed.schedule[0], time: '7.30' }] };
    const err = await s.saveDraft(bad, 'feu@x', 0).catch((e) => e);
    expect(err).toBeInstanceOf(InvalidContentError);
    expect(err.issues[0].path).toBe('schedule.0.time');
    expect((await s.getDraft())?.revision).toBe(0);
  });

  it('blocks publishing when a guard fails, and when there is nothing to publish', async () => {
    const s = setup();
    await expect(s.publish('feu@x')).rejects.toBeInstanceOf(PublishBlockedError);
    await s.saveDraft(withPrice(seed, 1, 0), 'feu@x', 0);
    const err = await s.publish('feu@x').catch((e) => e);
    expect(err).toBeInstanceOf(PublishBlockedError);
    expect(err.issues[0].path).toBe('prices.1.priceEUR');
    expect((await s.listVersions()).length).toBe(1);
  });

  it('restore copies an old version into the draft without publishing it', async () => {
    const s = setup();
    await s.saveDraft(withPrice(seed, 0, 25), 'feu@x', 0);
    await s.publish('feu@x');
    const d = await s.restore('v1', 'nico@x', 0);
    expect(d).toMatchObject({ revision: 1, basedOn: 'v2', updatedBy: 'nico@x' });
    expect(d.content.prices[0].priceEUR).toBe(seed.prices[0].priceEUR);
    expect((await s.getPublished())?.version.id).toBe('v2');
    await expect(s.restore('v9', 'nico@x', 1)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('discardDraft drops unsaved work back to the published content', async () => {
    const s = setup();
    await s.saveDraft(withPrice(seed, 0, 25), 'feu@x', 0);
    await s.discardDraft('feu@x');
    expect((await s.getDraft())?.revision).toBe(0);
  });

  it('returned objects are copies: mutating them does not change the store', async () => {
    const s = setup();
    const pub = await s.getPublished();
    pub!.content.prices[0].priceEUR = 999;
    expect((await s.getPublished())?.content.prices[0].priceEUR).toBe(seed.prices[0].priceEUR);
  });
});
