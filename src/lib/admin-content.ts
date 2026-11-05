import 'server-only';
import { neon } from '@neondatabase/serverless';
import { z } from 'zod';
import seed from '@/content/sources/fixtures/admin-seed.json';
import { SiteContent, Weekday, Time, ClassKind, type SiteContent as Content } from '@/content/schema';

const text = z.string().trim().min(1);
const optionalUrl = z.union([z.literal(''), z.url()]);
export const Edits = z.discriminatedUnion('section', [
  z.object({ section: z.literal('schedule'), version: z.string(), items: z.array(z.object({ id: z.string(), day: Weekday, time: Time, enabled: z.boolean(), kind: ClassKind, name: z.string(), coach: z.string() })).min(1).max(200) }),
  z.object({ section: z.literal('prices'), version: z.string(), items: z.array(z.object({ id: z.string(), label: text, priceEUR: z.number().positive(), featured: z.boolean() })).min(1).max(50) }),
  z.object({ section: z.literal('coaches'), version: z.string(), items: z.array(z.object({ id: z.string(), name: text, bio: text, instagram: optionalUrl })).min(1).max(20) }),
  z.object({ section: z.literal('config'), version: z.string(), data: z.object({ heroTitle: text, marqueeEnabled: z.boolean(), marquee: z.array(z.object({ id: z.string(), highlight: text, text: z.string(), href: optionalUrl, startsOn: z.union([z.literal(''), z.iso.date()]), endsOn: z.union([z.literal(''), z.iso.date()]) })).max(20), ctaLabel: text, ctaBadge: text, street: text, postalCode: text, city: text, mapsHref: z.url(), weekdaysOpen: Time.nullable(), weekdaysClose: Time.nullable(), saturdayOpen: Time.nullable(), saturdayClose: Time.nullable(), sundayOpen: Time.nullable(), sundayClose: Time.nullable(), emails: z.string(), whatsapp: z.string(), instagram: optionalUrl, facebook: optionalUrl }) }),
]);
export type AdminEdits = z.infer<typeof Edits>;
export type Section = AdminEdits['section'];

function db() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing');
  return neon(process.env.DATABASE_URL);
}
function stored(content: Content) {
  const { config, marquee, features, schedule, prices, coaches } = content;
  return { config, marquee, features, schedule, prices, coaches };
}
function initialContent(): Content { return SiteContent.parse(seed); }
function fromRow(value: unknown): Content {
  return SiteContent.parse({ ...(typeof value === 'string' ? JSON.parse(value) : value), meta: { source: 'db', fetchedAt: new Date().toISOString(), warnings: [] } });
}
async function ensureTable() {
  const sql = db();
  await sql`CREATE TABLE IF NOT EXISTS site_content (
    id integer PRIMARY KEY CHECK (id = 1),
    content jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by text NOT NULL DEFAULT 'initial'
  )`;
  await sql`INSERT INTO site_content (id, content) VALUES (1, ${JSON.stringify(stored(initialContent()))}::jsonb) ON CONFLICT (id) DO NOTHING`;
}
export async function loadDbContent(): Promise<Content> {
  const sql = db();
  try {
    const rows = await sql`SELECT content FROM site_content WHERE id = 1`;
    if (rows.length) return fromRow(rows[0]!.content);
  } catch (error) {
    if ((error as { code?: string }).code !== '42P01') throw error;
  }
  await ensureTable();
  const rows = await sql`SELECT content FROM site_content WHERE id = 1`;
  if (!rows.length) throw new Error('Database content row was not initialized');
  return fromRow(rows[0]!.content);
}
export async function readAdminContent() {
  await ensureTable();
  const sql = db();
  const rows = await sql`SELECT content,
    md5((content -> 'schedule')::text) AS schedule_version,
    md5((content -> 'prices')::text) AS prices_version,
    md5((content -> 'coaches')::text) AS coaches_version,
    md5((content -> 'config')::text || (content -> 'marquee')::text) AS config_version
    FROM site_content WHERE id = 1`;
  const row = rows[0]!;
  return { content: fromRow(row.content), versions: { schedule: row.schedule_version as string, prices: row.prices_version as string, coaches: row.coaches_version as string, config: row.config_version as string } };
}

export function applyEdits(current: Content, edit: AdminEdits): Content {
  const next = structuredClone(current);
  if (edit.section === 'schedule') {
    const existing = new Map(current.schedule.map(item => [item.id, item]));
    next.schedule = edit.items.map(item => {
      const old = existing.get(item.id);
      return { ...old, id: item.id, day: item.day, time: item.time, enabled: item.enabled, kind: item.kind, name: item.name ? { ...old?.name, pt: item.name } : undefined, coach: item.coach || undefined };
    });
    const duplicates = new Set(next.schedule.map(item => `${item.day}|${item.time}`));
    if (duplicates.size !== next.schedule.length) throw new Error('Hay clases duplicadas en el mismo día y horario.');
  } else if (edit.section === 'prices') {
    const existing = new Map(current.prices.map(item => [item.id, item]));
    next.prices = edit.items.map((item, index) => {
      const old = existing.get(item.id);
      return { ...old, id: item.id, label: { ...old?.label, pt: item.label }, priceEUR: item.priceEUR, featured: item.featured, order: index + 1 };
    });
  } else if (edit.section === 'coaches') {
    const existing = new Map(current.coaches.map(item => [item.id, item]));
    next.coaches = edit.items.map((item, index) => {
      const old = existing.get(item.id);
      return { ...old, id: item.id, name: item.name, bio: { ...old?.bio, pt: item.bio }, instagram: item.instagram || undefined, order: index + 1 };
    });
  } else {
    const d = edit.data;
    const hours = (open: string | null, close: string | null) => {
      if (!!open !== !!close || open && close && open >= close) throw new Error('El horario de apertura debe tener inicio y fin, y terminar después de abrir.');
      return open && close ? { opens: open, closes: close } : null;
    };
    next.config.heroTitle.pt = d.heroTitle;
    if ([d.ctaLabel, d.ctaBadge].join(' ').length > 33) throw new Error('El texto completo del botón no puede superar 33 caracteres.');
    next.config.ctaLabel.pt = d.ctaLabel;
    next.config.ctaBadge.pt = d.ctaBadge;
    next.config.marqueeEnabled = d.marqueeEnabled;
    const existingMarquee = new Map(current.marquee.map(item => [item.id, item]));
    next.marquee = d.marquee.map((item, index) => {
      if (item.startsOn && item.endsOn && item.endsOn < item.startsOn) throw new Error('La fecha final de un aviso debe ser posterior a la inicial.');
      const old = existingMarquee.get(item.id);
      return { ...old, id: item.id, highlight: { ...old?.highlight, pt: item.highlight }, text: item.text ? { ...old?.text, pt: item.text } : undefined, href: item.href || undefined, startsOn: item.startsOn || undefined, endsOn: item.endsOn || undefined, order: index + 1 };
    });
    next.config.address = { street: d.street, postalCode: d.postalCode, city: d.city };
    next.config.mapsHref = d.mapsHref;
    next.config.openingHours = { weekdays: hours(d.weekdaysOpen, d.weekdaysClose), saturday: hours(d.saturdayOpen, d.saturdayClose), sunday: hours(d.sundayOpen, d.sundayClose) };
    next.config.emails = d.emails.split(/[;,\n]/).map(v => v.trim()).filter(Boolean);
    next.config.whatsapp = d.whatsapp || undefined;
    next.config.instagram = d.instagram || undefined;
    next.config.facebook = d.facebook || undefined;
  }
  return SiteContent.parse(next);
}

export async function saveAdminContent(email: string, edit: AdminEdits) {
  const snapshot = await readAdminContent();
  if (snapshot.versions[edit.section] !== edit.version) throw new Error('Esta sección cambió desde que la abriste. Recarga antes de guardar.');
  const next = applyEdits(snapshot.content, edit);
  const sectionJson = JSON.stringify(stored(next)[edit.section]);
  const sql = db();
  const rows = edit.section === 'config'
    ? await sql`UPDATE site_content SET
      content = jsonb_set(jsonb_set(content, '{config}', ${sectionJson}::jsonb), '{marquee}', ${JSON.stringify(next.marquee)}::jsonb),
      updated_at = now(), updated_by = ${email}
      WHERE id = 1 AND md5((content -> 'config')::text || (content -> 'marquee')::text) = ${edit.version}
      RETURNING content`
    : await sql`UPDATE site_content SET
      content = jsonb_set(content, ARRAY[${edit.section}], ${sectionJson}::jsonb),
      updated_at = now(), updated_by = ${email}
      WHERE id = 1 AND md5((content -> ${edit.section})::text) = ${edit.version}
      RETURNING content`;
  if (!rows.length) throw new Error('Esta sección cambió desde que la abriste. Recarga antes de guardar.');
  return fromRow(rows[0]!.content);
}
