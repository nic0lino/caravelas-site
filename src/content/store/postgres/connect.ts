import type { Db } from './store';

/**
 * The database behind `CONTENT_SOURCE=db` and the admin panel, chosen by `DATABASE_URL`:
 * - `postgres://…` / `postgresql://…` → Neon through its WebSocket pool (the store needs interactive
 *   transactions, which Neon's HTTP driver does not have). Use the pooled connection string.
 * - `pglite:<folder>` → a local PGlite database, e.g. `pglite:.data/pglite` after `pnpm db:import`.
 *   `pglite:` alone is an in-memory database (tests).
 * Errors never include the URL: it carries the password.
 */
export async function connect(url: string | undefined): Promise<Db> {
  if (!url) throw new Error('db: DATABASE_URL is missing');
  if (url.startsWith('pglite:')) {
    const [{ PGlite }, { drizzle }] = await Promise.all([import('@electric-sql/pglite'), import('drizzle-orm/pglite')]);
    const dir = url.slice('pglite:'.length);
    return drizzle(dir ? new PGlite(dir) : new PGlite());
  }
  if (/^postgres(ql)?:\/\//.test(url)) {
    const [{ Pool }, { drizzle }] = await Promise.all([
      import('@neondatabase/serverless'),
      import('drizzle-orm/neon-serverless'),
    ]);
    return drizzle(new Pool({ connectionString: url }));
  }
  throw new Error('db: DATABASE_URL must start with postgres://, postgresql:// or pglite:');
}

let shared: Promise<Db> | undefined;

/** One connection per server instance, reused across requests; a failed connect is retried next time. */
export function getDb(): Promise<Db> {
  shared ??= connect(process.env.DATABASE_URL).catch((e) => {
    shared = undefined;
    throw e;
  });
  return shared;
}
