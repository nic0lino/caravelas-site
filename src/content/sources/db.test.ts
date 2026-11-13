import { migrate } from 'drizzle-orm/pglite/migrator';
import { describe, expect, it } from 'vitest';
import { SiteContent } from '../schema';
import { seed } from '../store/contract-suite';
import { connect } from '../store/postgres/connect';
import { createPostgresStore, importContent } from '../store/postgres/store';
import { loadPublished } from './db';

// One in-memory PGlite for the file, through the same connect() the site uses (DATABASE_URL=pglite:).
const ready = connect('pglite:').then(async (db) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await migrate(db as any, { migrationsFolder: process.env.DRIZZLE_MIGRATIONS ?? 'drizzle' });
  return db;
});
const now = new Date('2026-11-13T10:00:00Z');
let n = 0;
async function siteWith(content = seed) {
  const db = await ready;
  const site = { id: `db-src-${++n}`, name: 'Gym' };
  await importContent(db, site, content, 'juanpi@x');
  return { db, siteId: site.id };
}

describe('db source', () => {
  it('serves the published version as SiteContent with source db', async () => {
    const { db, siteId } = await siteWith();
    const c = await loadPublished(db, siteId, now);
    expect(SiteContent.safeParse(c).success).toBe(true);
    expect(c.meta).toMatchObject({ source: 'db', fetchedAt: now.toISOString() });
    expect(c.schedule).toEqual(seed.schedule);
    expect(c.prices).toEqual(seed.prices);
  });

  it('turns non-blocking publish checks into meta.warnings (the fixture has an expired notice)', async () => {
    const { db, siteId } = await siteWith();
    const c = await loadPublished(db, siteId, now);
    expect(c.meta.warnings.some((w) => w.includes('já expirou'))).toBe(true);
  });

  it('never shows the draft, only what was published', async () => {
    const { db, siteId } = await siteWith();
    const store = createPostgresStore(db, siteId);
    const draft = await store.getDraft();
    const changed = { ...draft!.content, prices: draft!.content.prices.map((p) => ({ ...p, priceEUR: p.priceEUR + 1 })) };
    await store.saveDraft(changed, 'juanpi@x', draft!.revision);
    expect((await loadPublished(db, siteId, now)).prices).toEqual(seed.prices);
    await store.publish('juanpi@x');
    expect((await loadPublished(db, siteId, now)).prices).toEqual(changed.prices);
  });

  it('throws when the site has nothing published (ISR keeps the last good page)', async () => {
    const db = await ready;
    await expect(loadPublished(db, 'nobody', now)).rejects.toBeInstanceOf(Error);
  });
});

describe('connect', () => {
  it('needs DATABASE_URL and a known scheme, and never echoes the URL', async () => {
    await expect(connect(undefined)).rejects.toBeInstanceOf(Error);
    const secret = 'mysql://user:s3cret@host/db';
    const err = await connect(secret).catch((e: Error) => e);
    expect(err).toBeInstanceOf(Error);
    expect(String((err as Error).message).includes('s3cret')).toBe(false);
  });
});
