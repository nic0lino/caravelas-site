import { EditableContent, type VersionInfo } from '../schema';
import { lisbonToday } from '../select';
import { checkContent, type Issue } from './guards';
import {
  type ContentStore,
  type Draft,
  DraftConflictError,
  InvalidContentError,
  NotFoundError,
  PublishBlockedError,
} from './types';

interface Options {
  /** Content to start from; it becomes version 1 (published by `seedAuthor`). */
  seed?: EditableContent;
  seedAuthor?: string;
  now?: () => Date;
}

/**
 * In-memory ContentStore: the reference implementation of the contract, used by the tests and by the
 * panel while there is no database. Data lives as long as the process (lost on restart/redeploy).
 */
export function createMemoryStore(opts: Options = {}): ContentStore {
  const now = opts.now ?? (() => new Date());
  const versions: { version: VersionInfo; content: EditableContent }[] = [];
  let draft: Draft | null = null; // only set once someone saved
  let seq = 0;

  const clone = <T>(v: T): T => structuredClone(v);
  const published = () => versions.find((v) => v.version.status === 'published') ?? null;

  function validate(content: unknown): EditableContent {
    const r = EditableContent.safeParse(content);
    if (r.success) return r.data;
    const issues: Issue[] = r.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    throw new InvalidContentError(issues);
  }

  function currentDraft(): Draft | null {
    if (draft) return draft;
    const p = published();
    return p ? { content: p.content, revision: 0, basedOn: p.version.id } : null;
  }

  function writeDraft(content: EditableContent, author: string, expectedRevision: number, basedOn?: string): Draft {
    const cur = currentDraft();
    const curRevision = cur?.revision ?? 0;
    if (expectedRevision !== curRevision) {
      throw new DraftConflictError({ revision: curRevision, updatedAt: cur?.updatedAt, updatedBy: cur?.updatedBy });
    }
    draft = {
      content,
      revision: curRevision + 1,
      basedOn: basedOn ?? cur?.basedOn,
      updatedAt: now().toISOString(),
      updatedBy: author,
    };
    return clone(draft);
  }

  function addVersion(content: EditableContent, author: string, note?: string, basedOn?: string): VersionInfo {
    const prev = published();
    if (prev) prev.version.status = 'archived';
    const version: VersionInfo = {
      id: `v${++seq}`,
      status: 'published',
      createdAt: now().toISOString(),
      author,
      ...(note ? { note } : {}),
      ...(basedOn ? { basedOn } : {}),
    };
    versions.push({ version, content });
    return clone(version);
  }

  if (opts.seed) addVersion(validate(opts.seed), opts.seedAuthor ?? 'import', 'Importação inicial');

  return {
    async getPublished() {
      const p = published();
      return p ? clone(p) : null;
    },

    async getDraft() {
      const d = currentDraft();
      return d ? clone(d) : null;
    },

    async saveDraft(content, author, expectedRevision) {
      return writeDraft(validate(content), author, expectedRevision);
    },

    async discardDraft() {
      draft = null;
    },

    async publish(author, note) {
      const d = currentDraft();
      if (!d) throw new NotFoundError('rascunho');
      if (d.revision === 0) throw new PublishBlockedError([{ path: '', message: 'Não há alterações para publicar.' }]);
      const { errors } = checkContent(d.content, lisbonToday(now()).isoDate);
      if (errors.length) throw new PublishBlockedError(errors);
      const version = addVersion(d.content, author, note, d.basedOn);
      draft = null;
      return version;
    },

    async listVersions(limit = 20) {
      return versions.slice().reverse().slice(0, limit).map((v) => clone(v.version));
    },

    async getVersion(id) {
      const v = versions.find((x) => x.version.id === id);
      return v ? clone(v) : null;
    },

    async restore(versionId, author, expectedRevision) {
      const v = versions.find((x) => x.version.id === versionId);
      if (!v) throw new NotFoundError(`versão ${versionId}`);
      return writeDraft(clone(v.content), author, expectedRevision, published()?.version.id);
    },
  };
}
