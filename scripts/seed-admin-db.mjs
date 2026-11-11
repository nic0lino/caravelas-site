import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing');

const seed = JSON.parse(await readFile(new URL('../src/content/sources/fixtures/admin-seed.json', import.meta.url), 'utf8'));
const { config, marquee, features, schedule, prices, coaches } = seed;
const sql = neon(process.env.DATABASE_URL);

await sql`CREATE TABLE IF NOT EXISTS site_content (
  id integer PRIMARY KEY CHECK (id = 1),
  content jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text NOT NULL DEFAULT 'initial'
)`;

await sql`INSERT INTO site_content (id, content)
  VALUES (1, ${JSON.stringify({ config, marquee, features, schedule, prices, coaches })}::jsonb)
  ON CONFLICT (id) DO NOTHING`;

const rows = await sql`SELECT jsonb_array_length(content -> 'schedule') AS classes,
  jsonb_array_length(content -> 'prices') AS prices,
  jsonb_array_length(content -> 'coaches') AS coaches,
  updated_by FROM site_content WHERE id = 1`;
const row = rows[0];
if (!row) throw new Error('Content row was not created');
console.log(`Database ready: ${row.classes} classes, ${row.prices} prices, ${row.coaches} coaches; last editor: ${row.updated_by}`);
