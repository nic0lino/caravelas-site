import raw from './fixtures/content.json';
import { SiteContent } from '../schema';

export async function loadFixture(): Promise<SiteContent> {
  const parsed = SiteContent.parse(raw);
  return { ...parsed, meta: { ...parsed.meta, fetchedAt: new Date().toISOString() } };
}
