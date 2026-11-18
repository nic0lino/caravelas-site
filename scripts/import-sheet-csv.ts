/**
 * Import the Google Sheet (exported as one CSV per tab) into a local PGlite database, as v1 of a site.
 *
 *   pnpm db:import ../sheet-csv
 *   pnpm db:import ../sheet-csv --site caravelas --name "CrossFit Caravelas" --author juanpi --db .data/pglite
 *
 * The database is a folder (default .data/pglite, git-ignored): delete it to start over.
 * The same `importSheetTabs` will later run against Neon; nothing here talks to the network.
 */
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { importSheetTabs, readCsvTabs } from '../src/content/import/sheet-csv';
import { SheetError } from '../src/content/parse/tabs';
import { PublishBlockedError } from '../src/content/store/types';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    site: { type: 'string', default: 'caravelas' },
    name: { type: 'string', default: 'CrossFit Caravelas' },
    author: { type: 'string', default: 'import' },
    db: { type: 'string', default: '.data/pglite' },
  },
});

async function main() {
  const dir = positionals[0];
  if (!dir) {
    console.error('Usage: pnpm db:import <folder with config.csv, horario.csv, …> [--site id] [--name "Gym"] [--author who] [--db .data/pglite]');
    process.exit(2);
  }
  const dataDir = resolve(values.db!);
  mkdirSync(dataDir, { recursive: true });
  const pg = new PGlite(dataDir);
  const db = drizzle(pg);
  await migrate(db, { migrationsFolder: resolve('drizzle') });

  const tabs = await readCsvTabs(resolve(dir));
  console.log(`Tabs found: ${Object.keys(tabs).join(', ') || '(none)'}`);
  try {
    const r = await importSheetTabs(db, { id: values.site!, name: values.name! }, tabs, values.author!);
    console.log(`\n✓ Site "${values.site}" published as ${r.version.id} in ${dataDir}`);
    console.log(
      `  ${r.counts.schedule} classes · ${r.counts.prices} prices · ${r.counts.coaches} coaches · ` +
        `${r.counts.features} features · ${r.counts.marquee} notices`,
    );
    for (const w of r.sheetWarnings) console.log(`  ⚠ sheet: ${w}`);
    for (const w of r.warnings) console.log(`  ⚠ ${w.path}: ${w.message}`);
  } catch (e) {
    if (e instanceof SheetError) console.error(`\n✗ The sheet cannot be used:\n- ${e.problems.join('\n- ')}`);
    else if (e instanceof PublishBlockedError) console.error(`\n✗ Would not pass the publish checks:\n${e.issues.map((i) => `- ${i.path}: ${i.message}`).join('\n')}`);
    else console.error(`\n✗ ${(e as Error).message}`);
    process.exitCode = 1;
  } finally {
    await pg.close();
  }
}

main();
