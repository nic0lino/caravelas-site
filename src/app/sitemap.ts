import type { MetadataRoute } from 'next';
import { LANGS } from '@/content/langs';
import { langUrl } from '@/lib/metadata';
import { strings } from '@/i18n';

export default function sitemap(): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(LANGS.map((l) => [strings(l).htmlLang, langUrl(l)]));
  return LANGS.map((l) => ({ url: langUrl(l), alternates: { languages } }));
}
