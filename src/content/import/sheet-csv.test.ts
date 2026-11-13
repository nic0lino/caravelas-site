import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createPostgresStore } from '../store/postgres/store';
import { PublishBlockedError } from '../store/types';
import { importSheetTabs, readCsvTabs } from './sheet-csv';

// The smallest sheet the parser accepts, as Google Sheets would export it (quotes, multi-line bio).
const CSV: Record<string, string> = {
  config: [
    'chave,pt,en',
    'hero_titulo,Box de bem-estar,',
    'cta_texto,Agende a aula experimental,Book your free trial class',
    'cta_badge,GRÁTIS,FREE',
    'cta_link,https://www.regybox.pt/app/caravelas,',
    'morada_rua,R. Arco do Chafariz das Terras 13A,',
    'morada_cp,1200-607,',
    'morada_cidade,Lisboa,',
    'maps_link,https://maps.google.com/?q=CrossFit+Caravelas+Lisboa,',
    'horario_seg_sex,07:00-21:00,',
    'horario_sab,09:00-12:00,',
    'horario_dom,,',
  ].join('\r\n'),
  horario: 'ativo,dia,hora,tipo,coach\r\nTRUE,Segunda,07:00,CrossFit,Ana Lima\r\nTRUE,Sábado,09:00,Team WOD,\r\n',
  precos: 'ativo,plano_pt,preco,destaque,ordem\r\nTRUE,Drop-In,20,TRUE,1\r\nTRUE,2 Aulas por semana,60,FALSE,2\r\n',
  equipa: 'ativo,nome,bio_pt,ordem\r\nTRUE,Ana Lima,"Formada pela UniBH.\n\nÉ ""CF-L2"", treinadora.",1\r\n',
  destaques: 'ativo,icone,titulo_pt,texto_pt,ordem\r\nTRUE,Boia,Foco em bem-estar,"Treinamos para a vida, não para o pódio.",1\r\n',
  marquesina: 'ativo,destaque_pt,texto_pt,fim,ordem\r\nTRUE,Open Day,traga um amigo,31/12/2025,1\r\n',
};

async function csvDir(overrides: Record<string, string> = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'caravelas-csv-'));
  for (const [tab, text] of Object.entries({ ...CSV, ...overrides })) await writeFile(join(dir, `${tab}.csv`), text, 'utf8');
  await writeFile(join(dir, 'LEIA-ME.txt'), 'not a tab', 'utf8');
  return dir;
}

const db = drizzle(new PGlite());
const ready = migrate(db, { migrationsFolder: process.env.DRIZZLE_MIGRATIONS ?? 'drizzle' });
const now = () => new Date('2026-11-11T10:00:00Z');

describe('sheet CSV import', () => {
  it('reads one tab per CSV file and ignores other files', async () => {
    const tabs = await readCsvTabs(await csvDir());
    expect(Object.keys(tabs).sort()).toEqual(['config', 'destaques', 'equipa', 'horario', 'marquesina', 'precos']);
    expect(tabs.equipa?.[1][2]).toBe('Formada pela UniBH.\n\nÉ "CF-L2", treinadora.');
  });

  it('publishes the sheet as v1 of a new site, with counts and warnings', async () => {
    await ready;
    const r = await importSheetTabs(db, { id: 'csv-a', name: 'A' }, await readCsvTabs(await csvDir()), 'juanpi@x', now);
    expect(r.version).toMatchObject({ id: 'v1', status: 'published', author: 'juanpi@x' });
    expect(r.counts).toMatchObject({ schedule: 2, prices: 2, coaches: 1, features: 1, marquee: 1 });
    expect(r.warnings[0].message).toContain('já expirou'); // Open Day ended in 2025: warns, does not block
    const pub = await createPostgresStore(db, 'csv-a').getPublished();
    expect(pub?.content.prices.map((p) => p.priceEUR)).toEqual([20, 60]);
    expect(pub?.content.coaches[0].bio.pt).toContain('"CF-L2"');
  });

  it('refuses content that would not pass the publish checks, and writes nothing', async () => {
    await ready;
    const tabs = await readCsvTabs(await csvDir({ precos: 'ativo,plano_pt,preco\r\nTRUE,Drop-In,0\r\n' }));
    await expect(importSheetTabs(db, { id: 'csv-b', name: 'B' }, tabs, 'x', now)).rejects.toBeInstanceOf(PublishBlockedError);
    expect(await createPostgresStore(db, 'csv-b').getPublished()).toBeNull();
  });
});
