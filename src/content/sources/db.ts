import 'server-only';
import { SiteContent } from '../schema';
import { lisbonToday } from '../select';
import { checkContent } from '../store/guards';
import { getDb } from '../store/postgres/connect';
import { createPostgresStore, type Db } from '../store/postgres/store';

/** The site (gym) a deployment shows when `SITE_ID` is not set: the id `pnpm db:import` uses by default. */
export const DEFAULT_SITE_ID = 'caravelas';

/**
 * Database source: the PUBLISHED version of one site (drafts never reach the public site).
 * Throws if the site has nothing published or the database is unreachable, so ISR keeps serving
 * the last good page. Non-blocking publish checks (e.g. an expired notice) become `meta.warnings`,
 * like the sheet's per-row warnings, so /status shows them.
 */
export async function loadPublished(db: Db, siteId: string, now: Date = new Date()): Promise<SiteContent> {
  const published = await createPostgresStore(db, siteId).getPublished();
  if (!published) throw new Error(`db: nada publicado para o site "${siteId}"`);
  const { warnings } = checkContent(published.content, lisbonToday(now).isoDate);
  return SiteContent.parse({
    ...published.content,
    meta: { source: 'db', fetchedAt: now.toISOString(), warnings: warnings.map((w) => `${w.path}: ${w.message}`) },
  });
}

/** Env: DATABASE_URL (see store/postgres/connect.ts), SITE_ID (default `caravelas`). */
export async function loadDb(): Promise<SiteContent> {
  return loadPublished(await getDb(), process.env.SITE_ID || DEFAULT_SITE_ID);
}
