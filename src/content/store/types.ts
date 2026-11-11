import type { EditableContent, VersionInfo } from '../schema';
import type { Issue } from './guards';

/** The single open draft of a site. It is not a version: it becomes one when published. */
export interface Draft {
  content: EditableContent;
  /** Bumped on every save; 0 means "no saved draft yet" (content copied from the published version). */
  revision: number;
  /** Version this draft started from; absent if nothing was ever published. */
  basedOn?: string;
  updatedAt?: string; // ISO 8601, absent while revision is 0
  updatedBy?: string; // email, absent while revision is 0
}

/**
 * Storage behind the admin panel. One instance serves ONE site (gym): multi-gym is a factory that
 * picks the store for the signed-in user's site, so nothing here carries a gym id.
 *
 * Rules every implementation follows (memory.test.ts is the reference):
 * - Every write is validated with `EditableContent` (zod); invalid content never gets stored.
 * - `saveDraft` uses optimistic concurrency: pass the revision you loaded; if someone saved since,
 *   it throws `DraftConflictError` (the panel shows who and when) instead of overwriting.
 * - `publish` runs `checkContent()`; any error blocks it with `PublishBlockedError`.
 * - Publishing creates a new immutable version, archives the previous one and clears the draft.
 * - `restore` never publishes: it copies an old version into the draft, to review and publish again.
 */
export interface ContentStore {
  /** What the public site shows, or null if nothing was ever published. Used by the `db` source. */
  getPublished(): Promise<{ version: VersionInfo; content: EditableContent } | null>;
  /** The open draft; if there is none, a fresh copy of the published content (revision 0). Null if nothing exists. */
  getDraft(): Promise<Draft | null>;
  saveDraft(content: unknown, author: string, expectedRevision: number): Promise<Draft>;
  discardDraft(author: string): Promise<void>;
  publish(author: string, note?: string): Promise<VersionInfo>;
  /** Newest first. */
  listVersions(limit?: number): Promise<VersionInfo[]>;
  getVersion(id: string): Promise<{ version: VersionInfo; content: EditableContent } | null>;
  restore(versionId: string, author: string, expectedRevision: number): Promise<Draft>;
}

export class InvalidContentError extends Error {
  readonly issues: Issue[];
  constructor(issues: Issue[]) {
    super(`Conteúdo inválido: ${issues.map((i) => `${i.path}: ${i.message}`).join('; ')}`);
    this.name = 'InvalidContentError';
    this.issues = issues;
  }
}

export class DraftConflictError extends Error {
  readonly current: Pick<Draft, 'revision' | 'updatedAt' | 'updatedBy'>;
  constructor(current: Pick<Draft, 'revision' | 'updatedAt' | 'updatedBy'>) {
    super(`O rascunho foi alterado por ${current.updatedBy ?? 'outra pessoa'} entretanto (revisão ${current.revision}).`);
    this.name = 'DraftConflictError';
    this.current = current;
  }
}

export class PublishBlockedError extends Error {
  readonly issues: Issue[];
  constructor(issues: Issue[]) {
    super(`Não é possível publicar: ${issues.map((i) => i.message).join('; ')}`);
    this.name = 'PublishBlockedError';
    this.issues = issues;
  }
}

export class NotFoundError extends Error {
  constructor(what: string) {
    super(`Não encontrado: ${what}`);
    this.name = 'NotFoundError';
  }
}
