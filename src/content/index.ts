import 'server-only';
import { SiteContent } from './schema';
import { loadFixture } from './sources/fixture';

/**
 * The only entry point the UI uses. Returns a validated SiteContent; localized
 * fields stay as `{ pt, en? }` and are resolved at render with `localize()`.
 * Throws if the source is unusable, so ISR keeps serving the last good page.
 */
export async function getSiteContent(): Promise<SiteContent> {
  const source = process.env.CONTENT_SOURCE ?? 'fixture';
  switch (source) {
    case 'fixture':
      return loadFixture();
    case 'sheets':
      // Juanpi: implement in sources/sheets.ts, return SiteContent.parse(...)
      throw new Error('CONTENT_SOURCE=sheets: adapter not implemented yet');
    default:
      throw new Error(`Unknown CONTENT_SOURCE "${source}"`);
  }
}

export { SiteContent };
