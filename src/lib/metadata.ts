import type { Metadata } from 'next';
import { LANGS, langPath, type Lang } from '@/content/langs';
import { LANG_META, strings } from '@/i18n';

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const indexable = process.env.NEXT_PUBLIC_INDEXABLE === 'true';

export const langUrl = (lang: Lang) => (lang === 'pt' ? siteUrl : `${siteUrl}${langPath(lang)}`);

export function buildMetadata(lang: Lang): Metadata {
  const t = strings(lang);
  return {
    metadataBase: new URL(siteUrl + '/'),
    title: t.siteTitle,
    description: t.siteDescription,
    robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
    alternates: {
      canonical: langUrl(lang),
      languages: {
        ...Object.fromEntries(LANGS.map((l) => [strings(l).htmlLang, langUrl(l)])),
        'x-default': siteUrl,
      },
    },
    openGraph: {
      title: t.siteTitle,
      description: t.siteDescription,
      locale: LANG_META[lang].og,
      alternateLocale: LANGS.filter((l) => l !== lang).map((l) => LANG_META[l].og),
      type: 'website',
      images: [{ url: `${siteUrl}/assets/og.jpg`, width: 1200, height: 630 }],
    },
  };
}
