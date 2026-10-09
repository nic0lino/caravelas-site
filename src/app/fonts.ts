import { Inter, Lato, Source_Sans_3 } from 'next/font/google';

export const lato = Lato({
  subsets: ['latin', 'latin-ext'],
  weight: ['300', '400', '700', '900'],
  variable: '--font-lato',
  display: 'swap',
});

// Figma uses Inter Bold for the "Horários & Preçário" title only.
export const inter = Inter({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  weight: ['700'],
  variable: '--font-inter',
  display: 'swap',
});

// Lato has no Cyrillic: Source Sans 3 is the closest humanist fallback (per-glyph, so Latin text stays Lato).
export const cyrillic = Source_Sans_3({
  subsets: ['cyrillic', 'cyrillic-ext'],
  weight: ['300', '400', '700', '900'],
  variable: '--font-cyr',
  display: 'swap',
});
