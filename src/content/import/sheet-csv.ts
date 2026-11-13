import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { VersionInfo } from '../schema';
import { lisbonToday } from '../select';
import { parseCsv } from '../parse/csv';
import { parseSheet, type SheetTabs } from '../parse/tabs';
import { checkContent, type Issue } from '../store/guards';
import { importContent, type Db } from '../store/postgres/store';
import { PublishBlockedError } from '../store/types';

/**
 * Tab name from a CSV file name. Google Sheets downloads a tab as "<spreadsheet> - <tab>.csv"
 * (e.g. "Caravelas — Site - horario.csv"); a file renamed to just "<tab>.csv" works too.
 * The tab is what follows the LAST " - ", so a spreadsheet title with " - " in it is fine.
 */
export function tabNameFromFile(file: string): string {
  const base = file.replace(/\.csv$/i, '');
  const i = base.lastIndexOf(' - ');
  return (i >= 0 ? base.slice(i + 3) : base).trim();
}

/**
 * A folder with one CSV per sheet tab (File → Download → CSV in Google Sheets, once per tab):
 * config, horario, precos, equipa, destaques, marquesina (other tabs, like LEIA-ME, are ignored by
 * `parseSheet`). Returns the same grids the Sheets API gives, so `parseSheet` reads them unchanged.
 * Two files for the same tab are an error: the import must not pick one of them silently.
 */
export async function readCsvTabs(dir: string): Promise<SheetTabs> {
  const tabs: SheetTabs = {};
  const from: Record<string, string> = {};
  for (const file of (await readdir(dir)).sort()) {
    if (!file.toLowerCase().endsWith('.csv')) continue;
    const tab = tabNameFromFile(file);
    if (from[tab]) throw new Error(`Two CSV files for the tab "${tab}": "${from[tab]}" and "${file}"`);
    from[tab] = file;
    tabs[tab] = parseCsv(await readFile(join(dir, file), 'utf8'));
  }
  return tabs;
}

export interface ImportResult {
  version: VersionInfo;
  /** Rows or cells the sheet parser skipped or dropped (same messages as /status). */
  sheetWarnings: string[];
  /** Non-blocking publish checks, e.g. a notice that already expired. */
  warnings: Issue[];
  counts: Record<'schedule' | 'prices' | 'coaches' | 'features' | 'marquee', number>;
}

/**
 * Sheet tabs → site content → v1 of `site` in the database. Throws `SheetError` if the sheet is
 * unusable, `PublishBlockedError` if the content would not pass the publish checks, and an error if
 * the site already has versions (an import never overwrites what was published).
 */
export async function importSheetTabs(
  db: Db,
  site: { id: string; name: string },
  tabs: SheetTabs,
  author: string,
  now: () => Date = () => new Date(),
): Promise<ImportResult> {
  const { content, warnings: sheetWarnings } = parseSheet(tabs);
  const { errors, warnings } = checkContent(content, lisbonToday(now()).isoDate);
  if (errors.length) throw new PublishBlockedError(errors);
  const version = await importContent(db, site, content, author, now);
  return {
    version,
    sheetWarnings,
    warnings,
    counts: {
      schedule: content.schedule.length,
      prices: content.prices.length,
      coaches: content.coaches.length,
      features: content.features.length,
      marquee: content.marquee.length,
    },
  };
}
