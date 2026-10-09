export const LANGS = ['pt', 'en', 'es', 'fr', 'de', 'ru', 'uk'] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = 'pt';
export const isLang = (v: string): v is Lang => (LANGS as readonly string[]).includes(v);
/** Languages other than PT are served under /<lang>. */
export const langPath = (lang: Lang) => (lang === DEFAULT_LANG ? '/' : `/${lang}`);
