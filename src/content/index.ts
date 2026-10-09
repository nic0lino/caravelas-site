import 'server-only';
import { SiteContent } from './schema';
import { loadFixture } from './sources/fixture';
import { loadSheets } from './sources/sheets';

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
      return loadSheets();
    default:
      throw new Error(`Unknown CONTENT_SOURCE "${source}"`);
  }
}

export { SiteContent };
