import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { describe, expect, it } from 'vitest';
import { contractSuite, seed } from '../contract-suite';
import { auditLog } from './schema';
import { createPostgresStore, importContent } from './store';

// One in-process Postgres (PGlite) for the whole file, with the real migrations from drizzle/.
// Every test gets its own site, which also proves sites never see each other's data.
const db = drizzle(new PGlite());
const ready = migrate(db, { migrationsFolder: process.env.DRIZZLE_MIGRATIONS ?? 'drizzle' });
let n = 0;
const newSite = () => ({ id: `gym-${++n}`, name: `Gym ${n}` });

contractSuite('postgres (PGlite)', {
  async seeded(content, author, now) {
    await ready;
    const site = newSite();
    await importContent(db, site, content, author, now);
    return createPostgresStore(db, site.id, { now });
  },
  async empty() {
    await ready;
    return createPostgresStore(db, newSite().id); // a site nobody imported
  },
});

describe('postgres store specifics', () => {
  it('importContent only creates the first version', async () => {
    await ready;
    const site = newSite();
    const v1 = await importContent(db, site, seed, 'juanpi@x');
    expect(v1).toMatchObject({ id: 'v1', note: 'Importação inicial' });
    await expect(importContent(db, site, seed, 'juanpi@x')).rejects.toBeInstanceOf(Error);
  });

  it('keeps sites apart', async () => {
    await ready;
    const a = newSite();
    const b = newSite();
    await importContent(db, a, seed, 'x');
    await importContent(db, b, seed, 'x');
    const sa = createPostgresStore(db, a.id);
    const sb = createPostgresStore(db, b.id);
    const changed = { ...seed, prices: seed.prices.map((p, i) => (i === 0 ? { ...p, priceEUR: 99 } : p)) };
    await sa.saveDraft(changed, 'x', 0);
    await sa.publish('x');
    expect((await sa.getPublished())?.content.prices[0].priceEUR).toBe(99);
    expect((await sb.getPublished())?.content.prices[0].priceEUR).toBe(seed.prices[0].priceEUR);
    expect((await sb.listVersions()).length).toBe(1);
  });

  it('writes an audit trail', async () => {
    await ready;
    const site = newSite();
    await importContent(db, site, seed, 'juanpi@x');
    const s = createPostgresStore(db, site.id);
    await s.saveDraft({ ...seed, prices: [{ ...seed.prices[0], priceEUR: 21 }] }, 'feu@x', 0);
    await s.publish('feu@x');
    const rows = (await db.select().from(auditLog)).filter((r) => r.siteId === site.id);
    expect(rows.map((r) => [r.action, r.actor])).toEqual([
      ['import', 'juanpi@x'],
      ['save_draft', 'feu@x'],
      ['publish', 'feu@x'],
    ]);
  });
});
