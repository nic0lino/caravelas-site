import { describe, expect, it } from 'vitest';
import raw from '../sources/fixtures/content.json';
import { EditableContent } from '../schema';
import { DraftConflictError, InvalidContentError, NotFoundError, PublishBlockedError, type ContentStore } from './types';

const { meta: _meta, ...rest } = raw as Record<string, unknown>;
export const seed = EditableContent.parse(rest);

export interface StoreFactory {
  /** A store whose site has `content` published as v1 by `author`; `now` drives every timestamp. */
  seeded(content: EditableContent, author: string, now: () => Date): Promise<ContentStore>;
  /** A store for a site with nothing published. */
  empty(): Promise<ContentStore>;
}

const withPrice = (c: EditableContent, i: number, priceEUR: number): EditableContent => ({
  ...c,
  prices: c.prices.map((p, j) => (j === i ? { ...p, priceEUR } : p)),
});

/**
 * The behaviour every ContentStore must have. Run it against each implementation
 * (memory.test.ts, postgres.test.ts): if both pass, the panel can switch between them blindly.
 */
export function contractSuite(name: string, factory: StoreFactory) {
  async function setup() {
    let t = Date.parse('2026-11-11T10:00:00Z');
    return factory.seeded(seed, 'juanpi@x', () => new Date((t += 60_000)));
  }

  describe(`ContentStore contract: ${name}`, () => {
    it('starts with the seed published as v1 and no saved draft', async () => {
      const s = await setup();
      const pub = await s.getPublished();
      expect(pub?.version).toMatchObject({ id: 'v1', status: 'published', author: 'juanpi@x' });
      expect(pub?.content).toEqual(seed);
      const d = await s.getDraft();
      expect(d?.revision).toBe(0);
      expect(d?.basedOn).toBe('v1');
      expect(d?.content).toEqual(seed);
    });

    it('an empty store has nothing published and no draft', async () => {
      const s = await factory.empty();
      expect(await s.getPublished()).toBeNull();
      expect(await s.getDraft()).toBeNull();
      await expect(s.publish('a@x')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('save → publish creates v2, archives v1 and clears the draft', async () => {
      const s = await setup();
      const d1 = await s.saveDraft(withPrice(seed, 0, 25), 'feu@x', 0);
      expect(d1).toMatchObject({ revision: 1, updatedBy: 'feu@x', basedOn: 'v1' });
      const d2 = await s.saveDraft(withPrice(seed, 0, 26), 'feu@x', 1);
      expect(d2.revision).toBe(2);
      expect((await s.getPublished())?.content.prices[0].priceEUR).toBe(seed.prices[0].priceEUR); // not live yet

      const v2 = await s.publish('feu@x', 'Drop-in a 26 €');
      expect(v2).toMatchObject({ id: 'v2', status: 'published', basedOn: 'v1', note: 'Drop-in a 26 €' });
      expect((await s.getPublished())?.content.prices[0].priceEUR).toBe(26);
      expect((await s.listVersions()).map((v) => [v.id, v.status])).toEqual([
        ['v2', 'published'],
        ['v1', 'archived'],
      ]);
      expect((await s.getDraft())?.revision).toBe(0);
      expect((await s.getVersion('v1'))?.content.prices[0].priceEUR).toBe(seed.prices[0].priceEUR);
    });

    it('rejects a stale save instead of overwriting (two editors)', async () => {
      const s = await setup();
      await s.saveDraft(withPrice(seed, 0, 25), 'ana@x', 0);
      const err = await s.saveDraft(withPrice(seed, 0, 30), 'feu@x', 0).catch((e) => e);
      expect(err).toBeInstanceOf(DraftConflictError);
      expect(err.current).toMatchObject({ revision: 1, updatedBy: 'ana@x' });
      const err2 = await s.saveDraft(withPrice(seed, 0, 30), 'feu@x', 7).catch((e) => e);
      expect(err2).toBeInstanceOf(DraftConflictError);
      expect((await s.getDraft())?.content.prices[0].priceEUR).toBe(25);
    });

    it('never stores content that fails the schema', async () => {
      const s = await setup();
      const bad = { ...seed, schedule: [{ ...seed.schedule[0], time: '7.30' }] };
      const err = await s.saveDraft(bad, 'feu@x', 0).catch((e) => e);
      expect(err).toBeInstanceOf(InvalidContentError);
      expect(err.issues[0].path).toBe('schedule.0.time');
      expect((await s.getDraft())?.revision).toBe(0);
    });

    it('blocks publishing when a guard fails, and when there is nothing to publish', async () => {
      const s = await setup();
      await expect(s.publish('feu@x')).rejects.toBeInstanceOf(PublishBlockedError);
      await s.saveDraft(withPrice(seed, 1, 0), 'feu@x', 0);
      const err = await s.publish('feu@x').catch((e) => e);
      expect(err).toBeInstanceOf(PublishBlockedError);
      expect(err.issues[0].path).toBe('prices.1.priceEUR');
      expect((await s.listVersions()).length).toBe(1);
      expect((await s.getDraft())?.revision).toBe(1); // the draft survives a blocked publish
    });

    it('restore copies an old version into the draft without publishing it', async () => {
      const s = await setup();
      await s.saveDraft(withPrice(seed, 0, 25), 'feu@x', 0);
      await s.publish('feu@x');
      const d = await s.restore('v1', 'nico@x', 0);
      expect(d).toMatchObject({ revision: 1, basedOn: 'v2', updatedBy: 'nico@x' });
      expect(d.content.prices[0].priceEUR).toBe(seed.prices[0].priceEUR);
      expect((await s.getPublished())?.version.id).toBe('v2');
      await expect(s.restore('v9', 'nico@x', 1)).rejects.toBeInstanceOf(NotFoundError);
      expect(await s.getVersion('nope')).toBeNull();
    });

    it('discardDraft drops unsaved work back to the published content', async () => {
      const s = await setup();
      await s.saveDraft(withPrice(seed, 0, 25), 'feu@x', 0);
      await s.discardDraft('feu@x');
      const d = await s.getDraft();
      expect(d?.revision).toBe(0);
      expect(d?.content.prices[0].priceEUR).toBe(seed.prices[0].priceEUR);
    });

    it('returned objects are copies: mutating them does not change the store', async () => {
      const s = await setup();
      const pub = await s.getPublished();
      pub!.content.prices[0].priceEUR = 999;
      expect((await s.getPublished())?.content.prices[0].priceEUR).toBe(seed.prices[0].priceEUR);
    });
  });
}
