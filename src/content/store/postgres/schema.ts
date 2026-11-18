import { sql } from 'drizzle-orm';
import {
  bigserial,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import type { EditableContent } from '../../schema';

/**
 * Tables behind PostgresStore (ADMIN.md §4.2, multi-gym ready). Product structure is relational;
 * the site content itself is one jsonb document per draft/version, validated by zod before it is
 * written (the database does not check what is inside `content`).
 *
 * Migrations: edit this file, then `pnpm drizzle-kit generate --name <what>`; commit the SQL in drizzle/.
 */

/** One row per gym. `id` is a stable slug ("caravelas"). */
export const sites = pgTable('sites', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * People who can sign in. Same shape as Auth.js' Drizzle adapter `users` table, so the auth branch
 * can add `accounts` / `sessions` / `verification_tokens` next to it without migrating this one.
 */
export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified', { withTimezone: true, mode: 'date' }),
  image: text('image'),
});

export const role = pgEnum('role', ['editor', 'admin']);

/** Who may edit which site. No row = no access (there is no self-signup). */
export const memberships = pgTable(
  'memberships',
  {
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    siteId: text('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
    role: role('role').notNull().default('editor'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.siteId] })],
);

/** The single open draft of a site (ContentStore.Draft). No row = no saved changes. */
export const drafts = pgTable('drafts', {
  siteId: text('site_id').primaryKey().references(() => sites.id, { onDelete: 'cascade' }),
  revision: integer('revision').notNull(),
  basedOn: text('based_on'), // "v3"
  content: jsonb('content').$type<EditableContent>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  updatedBy: text('updated_by').notNull(),
});

export const versionStatus = pgEnum('version_status', ['published', 'archived']);

/** Immutable published versions. The public id is `v{number}`, numbered per site. */
export const versions = pgTable(
  'versions',
  {
    siteId: text('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
    number: integer('number').notNull(),
    status: versionStatus('status').notNull(),
    content: jsonb('content').$type<EditableContent>().notNull(),
    author: text('author').notNull(),
    note: text('note'),
    basedOn: text('based_on'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.siteId, t.number] }),
    // at most one published version per site
    uniqueIndex('versions_one_published').on(t.siteId).where(sql`${t.status} = 'published'`),
  ],
);

export const auditAction = pgEnum('audit_action', ['save_draft', 'discard_draft', 'publish', 'restore', 'import']);

/** Append-only trail of who did what (ADMIN.md §4.2). Sign-ins get added with auth. */
export const auditLog = pgTable(
  'audit_log',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    at: timestamp('at', { withTimezone: true }).notNull(),
    siteId: text('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
    actor: text('actor').notNull(),
    action: auditAction('action').notNull(),
    versionId: text('version_id'),
    details: jsonb('details').$type<Record<string, unknown>>(),
  },
  (t) => [index('audit_log_site_at').on(t.siteId, t.at)],
);
