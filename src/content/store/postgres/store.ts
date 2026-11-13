import { and, desc, eq, max } from 'drizzle-orm';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import type { EditableContent, VersionInfo } from '../../schema';
import { lisbonToday } from '../../select';
import { checkContent } from '../guards';
import { validateContent } from '../validate';
import {
  type ContentStore,
  type Draft,
  DraftConflictError,
  NotFoundError,
  PublishBlockedError,
} from '../types';
import { auditLog, drafts, sites, versions } from './schema';

// Any Drizzle Postgres database: PGlite in tests/dev, Neon (WebSocket pool) in production.
// Note: the store needs interactive transactions, so Neon's HTTP driver is not enough.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = PgDatabase<any, any>;

interface Options {
  now?: () => Date;
}

const vid = (n: number) => `v${n}`;
const vnum = (id: string): number | null => {
  const m = /^v(\d+)$/.exec(id);
  return m ? Number(m[1]) : null;
};

type VersionRow = typeof versions.$inferSelect;
const toInfo = (r: VersionRow): VersionInfo => ({
  id: vid(r.number),
  status: r.status,
  createdAt: r.createdAt.toISOString(),
  author: r.author,
  ...(r.note ? { note: r.note } : {}),
  ...(r.basedOn ? { basedOn: r.basedOn } : {}),
});

type DraftRow = typeof drafts.$inferSelect;
const toDraft = (r: DraftRow): Draft => ({
  content: r.content,
  revision: r.revision,
  ...(r.basedOn ? { basedOn: r.basedOn } : {}),
  updatedAt: r.updatedAt.toISOString(),
  updatedBy: r.updatedBy,
});

/** ContentStore for one site, on Postgres. The site row must exist (see `importContent`). */
export function createPostgresStore(db: Db, siteId: string, opts: Options = {}): ContentStore {
  const now = opts.now ?? (() => new Date());

  async function publishedRow(q: Db = db): Promise<VersionRow | null> {
    const [r] = await q
      .select()
      .from(versions)
      .where(and(eq(versions.siteId, siteId), eq(versions.status, 'published')));
    return r ?? null;
  }

  async function draftRow(q: Db = db, lock = false): Promise<DraftRow | null> {
    const base = q.select().from(drafts).where(eq(drafts.siteId, siteId));
    const [r] = lock ? await base.for('update') : await base;
    return r ?? null;
  }

  async function currentDraft(q: Db = db): Promise<Draft | null> {
    const d = await draftRow(q);
    if (d) return toDraft(d);
    const p = await publishedRow(q);
    return p ? { content: p.content, revision: 0, basedOn: vid(p.number) } : null;
  }

  async function conflict(q: Db = db): Promise<never> {
    const cur = await currentDraft(q);
    throw new DraftConflictError({ revision: cur?.revision ?? 0, updatedAt: cur?.updatedAt, updatedBy: cur?.updatedBy });
  }

  /** Optimistic write: one atomic statement per case, so two editors can never both win. */
  async function writeDraft(
    content: EditableContent,
    author: string,
    expectedRevision: number,
    action: 'save_draft' | 'restore',
    basedOnOverride?: string,
    versionId?: string,
  ): Promise<Draft> {
    return db.transaction(async (tx) => {
      const at = now();
      let row: DraftRow | undefined;
      if (expectedRevision === 0) {
        const p = await publishedRow(tx);
        [row] = await tx
          .insert(drafts)
          .values({
            siteId,
            revision: 1,
            basedOn: basedOnOverride ?? (p ? vid(p.number) : null),
            content,
            updatedAt: at,
            updatedBy: author,
          })
          .onConflictDoNothing()
          .returning();
      } else {
        [row] = await tx
          .update(drafts)
          .set({
            revision: expectedRevision + 1,
            content,
            updatedAt: at,
            updatedBy: author,
            ...(basedOnOverride ? { basedOn: basedOnOverride } : {}),
          })
          .where(and(eq(drafts.siteId, siteId), eq(drafts.revision, expectedRevision)))
          .returning();
      }
      if (!row) return conflict(tx);
      await tx.insert(auditLog).values({ at, siteId, actor: author, action, versionId: versionId ?? null, details: { revision: row.revision } });
      return toDraft(row);
    });
  }

  async function getVersion(id: string) {
    const n = vnum(id);
    if (n === null) return null;
    const [r] = await db.select().from(versions).where(and(eq(versions.siteId, siteId), eq(versions.number, n)));
    return r ? { version: toInfo(r), content: r.content } : null;
  }

  return {
    async getPublished() {
      const p = await publishedRow();
      return p ? { version: toInfo(p), content: p.content } : null;
    },

    async getDraft() {
      return currentDraft();
    },

    async saveDraft(content, author, expectedRevision) {
      return writeDraft(validateContent(content), author, expectedRevision, 'save_draft');
    },

    async discardDraft(author) {
      await db.transaction(async (tx) => {
        const gone = await tx.delete(drafts).where(eq(drafts.siteId, siteId)).returning({ r: drafts.revision });
        if (gone.length) await tx.insert(auditLog).values({ at: now(), siteId, actor: author, action: 'discard_draft' });
      });
    },

    async publish(author, note) {
      return db.transaction(async (tx) => {
        const d = await draftRow(tx, true); // locks the draft until commit
        if (!d) {
          if (await publishedRow(tx)) throw new PublishBlockedError([{ path: '', message: 'Não há alterações para publicar.' }]);
          throw new NotFoundError('rascunho');
        }
        const at = now();
        const { errors } = checkContent(d.content, lisbonToday(at).isoDate);
        if (errors.length) throw new PublishBlockedError(errors);

        const [{ last }] = await tx.select({ last: max(versions.number) }).from(versions).where(eq(versions.siteId, siteId));
        const number = (last ?? 0) + 1;
        await tx
          .update(versions)
          .set({ status: 'archived' })
          .where(and(eq(versions.siteId, siteId), eq(versions.status, 'published')));
        const [row] = await tx
          .insert(versions)
          .values({ siteId, number, status: 'published', content: d.content, author, note: note || null, basedOn: d.basedOn, createdAt: at })
          .returning();
        await tx.delete(drafts).where(eq(drafts.siteId, siteId));
        await tx.insert(auditLog).values({ at, siteId, actor: author, action: 'publish', versionId: vid(number), details: note ? { note } : null });
        return toInfo(row);
      });
    },

    async listVersions(limit = 20) {
      const rows = await db.select().from(versions).where(eq(versions.siteId, siteId)).orderBy(desc(versions.number)).limit(limit);
      return rows.map(toInfo);
    },

    getVersion,

    async restore(versionId, author, expectedRevision) {
      const v = await getVersion(versionId);
      if (!v) throw new NotFoundError(`versão ${versionId}`);
      // Re-validate: an old version may not fit the current schema any more.
      const content = validateContent(v.content);
      const live = await publishedRow();
      return writeDraft(content, author, expectedRevision, 'restore', live ? vid(live.number) : undefined, versionId);
    },
  };
}

/**
 * Creates the site if needed and publishes `content` as its first version (v1). Refuses if the site
 * already has versions, so running an import twice never overwrites what the gym published.
 */
export async function importContent(
  db: Db,
  site: { id: string; name: string },
  content: unknown,
  author: string,
  now: () => Date = () => new Date(),
): Promise<VersionInfo> {
  const valid = validateContent(content);
  return db.transaction(async (tx) => {
    await tx.insert(sites).values(site).onConflictDoNothing();
    const [{ last }] = await tx.select({ last: max(versions.number) }).from(versions).where(eq(versions.siteId, site.id));
    if (last !== null) throw new Error(`O site "${site.id}" já tem versões; a importação só cria a primeira.`);
    const at = now();
    const [row] = await tx
      .insert(versions)
      .values({ siteId: site.id, number: 1, status: 'published', content: valid, author, note: 'Importação inicial', createdAt: at })
      .returning();
    await tx.insert(auditLog).values({ at, siteId: site.id, actor: author, action: 'import', versionId: 'v1' });
    return toInfo(row);
  });
}
