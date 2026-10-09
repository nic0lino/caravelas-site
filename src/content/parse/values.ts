/**
 * Tolerant cell parsers for the Google Sheet (SPEC §4.4).
 *
 * Every parser takes the raw cell string exactly as the sheet shows it and
 * returns the normalized value, or `null` when the cell can't be understood.
 * They never throw: the row layer decides whether `null` means "skip the row
 * with a warning" or "use a default".
 *
 * Blank cells: check `isBlank()` first. Most parsers also return `null` for
 * blank input, so a blank optional field and an invalid one look the same here.
 */
import type { ClassKind, Weekday } from '../schema';

// ---------- text ----------

/** True for undefined, empty or whitespace-only cells. */
export const isBlank = (s: string | null | undefined): boolean => !s || s.trim() === '';

/** Single-line field: trim and collapse internal whitespace (incl. line breaks). */
export function clean(s: string | null | undefined): string {
  return (s ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * Multi-line field (bios): keep line breaks and blank lines (paragraphs),
 * normalize Windows line endings, trim each line and the whole text.
 * Inline marks (`**bold**`, `*italic*`) pass through untouched (contract v8).
 */
export function cleanMultiline(s: string | null | undefined): string {
  return (s ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Lowercase, no accents, single spaces: "  Sábado " -> "sabado". For matching, never for display. */
export function fold(s: string | null | undefined): string {
  return clean(s)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/** Column header -> key: "Destaque PT" / "destaque-pt" / "DESTAQUE_PT" -> "destaque_pt". */
export function normalizeHeader(s: string | null | undefined): string {
  return fold(s).replace(/[\s-]+/g, '_');
}

// ---------- booleans ----------

const TRUE_WORDS = new Set(['true', 'verdadeiro', 'sim', 's', 'yes', 'y', 'si', '1', 'x', '✓', '✔', '☑']);
const FALSE_WORDS = new Set(['false', 'falso', 'nao', 'n', 'no', '0', '✗', '☐']);

/** TRUE/FALSE, VERDADEIRO/FALSO, sim/não, 1/0, checkbox values. Blank or unknown -> null. */
export function parseBool(s: string | null | undefined): boolean | null {
  const v = fold(s);
  if (TRUE_WORDS.has(v)) return true;
  if (FALSE_WORDS.has(v)) return false;
  return null;
}

// ---------- times ----------

const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * "7:00", "07:00", "07h00", "7h", "7.30", "7,30", "19H30", "7:00:00", "7:30 PM", "7" -> "HH:MM".
 * Hours 0–23, minutes 0–59; anything else -> null.
 */
export function parseTime(s: string | null | undefined): string | null {
  const v = fold(s).replace(/\s+/g, '');
  const m = /^(\d{1,2})(?:[:h.,](\d{2})?)?(?::\d{2})?(am|pm|a\.m\.|p\.m\.)?$/.exec(v);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2] === undefined ? 0 : Number(m[2]);
  const ampm = m[3]?.[0]; // 'a' | 'p' | undefined
  if (ampm) {
    if (h < 1 || h > 12) return null;
    if (ampm === 'a' && h === 12) h = 0;
    if (ampm === 'p' && h !== 12) h += 12;
  }
  if (h > 23 || min > 59) return null;
  return `${pad2(h)}:${pad2(min)}`;
}

export type TimeRange = { opens: string; closes: string };

const CLOSED_WORDS = new Set(['fechado', 'encerrado', 'closed', 'cerrado', '-', '—', '–']);

/**
 * Opening hours cell: "07:00-21:00", "7h–21h", "07:00 às 21:00", "7h a 21h".
 * Blank or "Fechado" -> 'closed'. Unparseable, or closes <= opens -> null.
 */
export function parseTimeRange(s: string | null | undefined): TimeRange | 'closed' | null {
  const v = fold(s);
  if (v === '' || CLOSED_WORDS.has(v)) return 'closed';
  const parts = v.split(/\s*(?:-|–|—|\bas\b|\ba\b|\bto\b)\s*/).filter(Boolean);
  if (parts.length !== 2) return null;
  const opens = parseTime(parts[0]);
  const closes = parseTime(parts[1]);
  if (!opens || !closes || closes <= opens) return null;
  return { opens, closes };
}

// ---------- dates ----------

/**
 * "dd/mm/yyyy", "d/m/yy", "dd-mm-yyyy", "dd.mm.yyyy", "yyyy-mm-dd" -> "yyyy-mm-dd".
 * Day-first always (Portugal). Two-digit years are 20yy. Impossible dates (31/02) -> null.
 * These are calendar dates for Europe/Lisbon: no time-zone conversion happens.
 */
export function parseDate(s: string | null | undefined): string | null {
  const v = clean(s);
  let y: number, mo: number, d: number;
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v);
  if (m) {
    [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  } else {
    m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(v);
    if (!m) return null;
    [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (m[3]!.length === 2) y += 2000;
  }
  if (mo < 1 || mo > 12 || d < 1) return null;
  const daysInMonth = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  if (d > daysInMonth) return null;
  return `${y}-${pad2(mo)}-${pad2(d)}`;
}

// ---------- numbers ----------

/**
 * "€20", "20 €", "20,00", "20.00", "EUR 22,5", "1.200,00", "1,200.00" -> number (cents precision).
 * With both separators present, the last one is the decimal separator.
 * A lone separator followed by exactly 3 digits ("1.200") is a thousands separator.
 * Negative or unparseable -> null.
 */
export function parsePrice(s: string | null | undefined): number | null {
  let v = clean(s).replace(/€|eur(os?)?/gi, '').replace(/\s+/g, '');
  if (!/^\d[\d.,]*$/.test(v)) return null;
  const lastDot = v.lastIndexOf('.');
  const lastComma = v.lastIndexOf(',');
  if (lastDot >= 0 && lastComma >= 0) {
    const dec = lastDot > lastComma ? '.' : ',';
    const thou = dec === '.' ? ',' : '.';
    v = v.split(thou).join('').replace(dec, '.');
  } else {
    const sep = lastDot >= 0 ? '.' : lastComma >= 0 ? ',' : null;
    if (sep) {
      const groups = v.split(sep);
      const isThousands = groups.length > 2 || (groups.length === 2 && groups[1]!.length === 3);
      v = isThousands ? groups.join('') : groups.join('.');
    }
  }
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

/** "1", " 2 ", "3.0" -> integer. Blank or non-integer -> null. */
export function parseIntCell(s: string | null | undefined): number | null {
  const v = clean(s).replace(',', '.');
  if (!/^-?\d+(\.0+)?$/.test(v)) return null;
  return Number.parseInt(v, 10);
}

// ---------- enums (dropdowns) ----------

const WEEKDAYS: Record<string, Weekday> = {
  segunda: 'mon', 'segunda-feira': 'mon', seg: 'mon', '2a': 'mon', '2ª': 'mon', monday: 'mon', mon: 'mon',
  terca: 'tue', 'terca-feira': 'tue', ter: 'tue', '3a': 'tue', '3ª': 'tue', tuesday: 'tue', tue: 'tue',
  quarta: 'wed', 'quarta-feira': 'wed', qua: 'wed', '4a': 'wed', '4ª': 'wed', wednesday: 'wed', wed: 'wed',
  quinta: 'thu', 'quinta-feira': 'thu', qui: 'thu', '5a': 'thu', '5ª': 'thu', thursday: 'thu', thu: 'thu',
  sexta: 'fri', 'sexta-feira': 'fri', sex: 'fri', '6a': 'fri', '6ª': 'fri', friday: 'fri', fri: 'fri',
  sabado: 'sat', sab: 'sat', saturday: 'sat', sat: 'sat',
  domingo: 'sun', dom: 'sun', sunday: 'sun', sun: 'sun',
};

/** "Segunda", "segunda-feira", "Sábado", "SAB", "Monday" -> Weekday. */
export function parseWeekday(s: string | null | undefined): Weekday | null {
  const v = fold(s).replace(/\.$/, '').replace(/\s*-\s*|\s+/g, '-'); // "segunda feira" -> "segunda-feira"
  return WEEKDAYS[v] ?? null;
}

/** "CrossFit", "Open Box", "openbox", "Team WOD", "Outro" -> ClassKind. */
export function parseKind(s: string | null | undefined): ClassKind | null {
  const v = fold(s).replace(/[\s_-]+/g, '');
  switch (v) {
    case 'crossfit':
    case 'cf':
      return 'crossfit';
    case 'openbox':
      return 'open_box';
    case 'teamwod':
      return 'team_wod';
    case 'outro':
    case 'outra':
    case 'other':
      return 'other';
    default:
      return null;
  }
}

export type FeatureIconName = 'lifebuoy' | 'anchor' | 'ship';

/** "Boia"/"bóia", "Âncora", "Navio"/"barco" (or the English names) -> icon key. */
export function parseIcon(s: string | null | undefined): FeatureIconName | null {
  switch (fold(s)) {
    case 'boia':
    case 'lifebuoy':
      return 'lifebuoy';
    case 'ancora':
    case 'anchor':
      return 'anchor';
    case 'navio':
    case 'barco':
    case 'ship':
      return 'ship';
    default:
      return null;
  }
}

/** "esquerda"/"left" -> 'left', "direita"/"right" -> 'right'. */
export function parseSide(s: string | null | undefined): 'left' | 'right' | null {
  const v = fold(s);
  if (v === 'esquerda' || v === 'left' || v === 'izquierda') return 'left';
  if (v === 'direita' || v === 'right' || v === 'derecha') return 'right';
  return null;
}

// ---------- contact ----------

/**
 * WhatsApp/phone -> E.164: "+351 912 849 143", "00351912849143", "912 849 143" (PT, 9 digits) -> "+351912849143".
 */
export function parsePhone(s: string | null | undefined): string | null {
  let v = clean(s).replace(/[\s().-]/g, '');
  if (v.startsWith('00')) v = `+${v.slice(2)}`;
  if (/^[29]\d{8}$/.test(v)) v = `+351${v}`; // Portuguese national number
  return /^\+\d{8,15}$/.test(v) ? v : null;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** "a@x.pt, b@x.pt; c@x.pt" -> ["a@x.pt", "b@x.pt", "c@x.pt"]. Invalid entries are returned separately. */
export function parseEmails(s: string | null | undefined): { emails: string[]; invalid: string[] } {
  const emails: string[] = [];
  const invalid: string[] = [];
  for (const part of (s ?? '').split(/[,;\s]+/)) {
    const e = part.trim().toLowerCase();
    if (!e) continue;
    if (EMAIL.test(e)) {
      if (!emails.includes(e)) emails.push(e);
    } else {
      invalid.push(part.trim());
    }
  }
  return { emails, invalid };
}

/** "https://x.pt/a", "www.x.pt", "instagram.com/foo" -> absolute https URL. Anything else -> null. */
export function parseUrl(s: string | null | undefined): string | null {
  const v = clean(s);
  if (!v || /\s/.test(v)) return null;
  const withScheme = /^https?:\/\//i.test(v) ? v : /^[\w-]+(\.[\w-]+)+(\/|$)/.test(v) ? `https://${v}` : null;
  if (!withScheme) return null;
  try {
    const u = new URL(withScheme);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}

// ---------- ids ----------

/**
 * Stable id from a row's key fields (never the row number: staff reorder rows).
 * FNV-1a 32-bit over the folded parts; same content -> same id, on server and in tests.
 * e.g. stableId('horario', 'mon', '07:00', 'crossfit') -> "horario-1k3x9z0".
 */
export function stableId(prefix: string, ...parts: (string | number | null | undefined)[]): string {
  const input = parts.map((p) => fold(p == null ? '' : String(p))).join('\u001f');
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `${prefix}-${(h >>> 0).toString(36)}`;
}
