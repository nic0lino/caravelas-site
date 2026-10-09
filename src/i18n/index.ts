import { pt, type UiStrings } from './pt';
import { en } from './en';
import { es } from './es';
import { fr } from './fr';
import { de } from './de';
import { ru } from './ru';
import { uk } from './uk';
import type { Lang } from '@/content/langs';

export type { UiStrings };

const table: Record<Lang, UiStrings> = { pt, en, es, fr, de, ru, uk };
export const strings = (lang: Lang): UiStrings => table[lang];

/** Native names for the language menu + locale codes for metadata. */
export const LANG_META: Record<Lang, { name: string; code: string; og: string }> = {
  pt: { name: 'Português', code: 'PT', og: 'pt_PT' },
  en: { name: 'English', code: 'EN', og: 'en_GB' },
  es: { name: 'Español', code: 'ES', og: 'es_ES' },
  fr: { name: 'Français', code: 'FR', og: 'fr_FR' },
  de: { name: 'Deutsch', code: 'DE', og: 'de_DE' },
  ru: { name: 'Русский', code: 'RU', og: 'ru_RU' },
  uk: { name: 'Українська', code: 'UK', og: 'uk_UA' },
};
