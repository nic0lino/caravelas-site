import type { ReactNode } from 'react';
import { cyrillic, inter, lato } from '@/app/fonts';
import { strings } from '@/i18n';
import type { Lang } from '@/content/select';
import '@/app/globals.css';

export function RootDocument({ lang, children }: { lang: Lang; children: ReactNode }) {
  return (
    <html lang={strings(lang).htmlLang} className={`${lato.variable} ${inter.variable} ${cyrillic.variable}`}>
      <body>{children}</body>
    </html>
  );
}
