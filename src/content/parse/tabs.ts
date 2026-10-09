/**
 * Sheet tabs -> SiteContent pieces (SPEC §4.3–4.4).
 *
 * Input is what the Sheets API returns: per tab, a grid of strings (rows of cells,
 * trailing empty cells may be missing). Output is the content without `meta`,
 * plus human-readable warnings in Portuguese for the /status page.
 *
 * Failure policy:
 * - a bad optional cell -> warning, the field is left out;
 * - a bad required cell -> warning, the ROW is skipped;
 * - a missing tab or a bad required `config` key -> SheetError (thrown), so ISR
 *   keeps serving the last good page instead of a broken one.
 *
 * The result is NOT validated here: the caller runs `SiteContent.parse()` on it.
 */
import { LANGS } from '../langs';
import type { Coach, Feature, Localized, MarqueeItem, PricePlan, ScheduleSlot, SiteConfig, SiteContent } from '../schema';
import {
  clean,
  cleanMultiline,
  fold,
  isBlank,
  normalizeHeader,
  parseBool,
  parseDate,
  parseEmails,
  parseIcon,
  parseIntCell,
  parseKind,
  parsePhone,
  parsePrice,
  parseSide,
  parseTime,
  parseTimeRange,
  parseUrl,
  parseWeekday,
  stableId,
  type TimeRange,
} from './values';

/** Raw grids keyed by tab title, e.g. { config: [["chave","pt"],["cta_link","https://…"]] }. */
export type SheetTabs = Record<string, string[][] | undefined>;

export type ParsedSheet = Omit<SiteContent, 'meta'>;

export class SheetError extends Error {
  readonly problems: string[];
  constructor(problems: string[]) {
    super(`Sheet inválida:\n- ${problems.join('\n- ')}`);
    this.name = 'SheetError';
    this.problems = problems;
  }
}

export const TAB = {
  config: 'config',
  marquee: 'marquesina',
  schedule: 'horario',
  prices: 'precos',
  coaches: 'equipa',
  features: 'destaques',
} as const;

// ---------- table reading ----------

/** One data row: its 1-based row number in the sheet and a getter by normalized header. */
export interface Row {
  n: number;
  get(key: string): string;
}

/** First non-empty row is the header; headers are matched case/accent-insensitively. Empty rows are skipped. */
export function readTable(grid: string[][]): { headers: Set<string>; rows: Row[] } {
  const headerIdx = grid.findIndex((r) => r.some((c) => !isBlank(c)));
  if (headerIdx < 0) return { headers: new Set(), rows: [] };
  const cols = new Map<string, number>();
  grid[headerIdx]!.forEach((h, i) => {
    const key = normalizeHeader(h);
    if (key && !cols.has(key)) cols.set(key, i);
  });
  const rows: Row[] = [];
  for (let i = headerIdx + 1; i < grid.length; i++) {
    const cells = grid[i] ?? [];
    if (!cells.some((c) => !isBlank(c))) continue;
    rows.push({
      n: i + 1,
      get: (key) => {
        const idx = cols.get(key);
        return idx === undefined ? '' : (cells[idx] ?? '');
      },
    });
  }
  return { headers: new Set(cols.keys()), rows };
}

function findTab(tabs: SheetTabs, name: string): string[][] | undefined {
  const want = fold(name);
  for (const [title, grid] of Object.entries(tabs)) if (fold(title) === want) return grid ?? [];
  return undefined;
}

/** `{base}_pt`, `{base}_en`… -> Localized. Undefined when PT is blank. */
function localizedFrom(get: (lang: string) => string, multiline = false): Localized | undefined {
  const norm = multiline ? cleanMultiline : clean;
  const pt = norm(get('pt'));
  if (!pt) return undefined;
  const out: Localized = { pt };
  for (const l of LANGS) {
    if (l === 'pt') continue;
    const v = norm(get(l));
    if (v) out[l] = v;
  }
  return out;
}
const localizedCol = (row: Row, base: string, multiline = false) => localizedFrom((l) => row.get(`${base}_${l}`), multiline);

// ---------- warnings ----------

class Warnings {
  private entries: { tab: string; n: number; msg: string }[] = [];
  add(tab: string, n: number, msg: string) {
    this.entries.push({ tab, n, msg });
  }
  /** Grouped by tab (in parse order), then by row number; same-row messages keep their order. */
  get list(): string[] {
    const tabOrder = [...new Set(this.entries.map((e) => e.tab))];
    return [...this.entries]
      .sort((a, b) => tabOrder.indexOf(a.tab) - tabOrder.indexOf(b.tab) || a.n - b.n)
      .map((e) => `${e.tab} linha ${e.n}: ${e.msg}`);
  }
}
const q = (s: string) => `'${clean(s)}'`;

/** `ativo` column: blank or missing column -> active; unchecked -> inactive (also hides the grey example row). */
function isActive(tab: string, row: Row, w: Warnings): boolean {
  const raw = row.get('ativo');
  if (isBlank(raw)) return true;
  const b = parseBool(raw);
  if (b === null) {
    w.add(tab, row.n, `valor de 'ativo' não reconhecido ${q(raw)} (linha ignorada)`);
    return false;
  }
  return b;
}

/** `ordem` column: blank -> sheet row number (keeps sheet order); invalid -> warning + row number. */
function orderOf(tab: string, row: Row, w: Warnings): number {
  const raw = row.get('ordem');
  if (isBlank(raw)) return row.n;
  const n = parseIntCell(raw);
  if (n === null) {
    w.add(tab, row.n, `ordem inválida ${q(raw)} (usada a posição na folha)`);
    return row.n;
  }
  return n;
}

/** Optional URL cell: blank -> undefined; invalid -> warning + undefined. */
function optionalUrl(tab: string, row: Row, col: string, w: Warnings): string | undefined {
  const raw = row.get(col);
  if (isBlank(raw)) return undefined;
  const url = parseUrl(raw);
  if (!url) w.add(tab, row.n, `link inválido em '${col}' ${q(raw)} (ignorado)`);
  return url ?? undefined;
}

/** "@handle", "handle" or a full URL -> Instagram profile URL. */
export function instagramUrl(s: string): string | null {
  const v = clean(s);
  const handle = /^@?([A-Za-z0-9._]{1,30})$/.exec(v);
  if (handle && !v.includes('.com')) return `https://www.instagram.com/${handle[1]}/`;
  return parseUrl(v);
}

/** Drop rows whose id was already seen (identical rows typed twice). */
function dedupe<T extends { id: string }>(tab: string, items: { item: T; n: number }[], w: Warnings): T[] {
  const seen = new Map<string, number>();
  const out: T[] = [];
  for (const { item, n } of items) {
    const first = seen.get(item.id);
    if (first !== undefined) {
      w.add(tab, n, `repetida (igual à linha ${first}; ignorada)`);
      continue;
    }
    seen.set(item.id, n);
    out.push(item);
  }
  return out;
}

// ---------- list tabs ----------

export function parseMarquee(grid: string[][], w: Warnings): MarqueeItem[] {
  const tab = TAB.marquee;
  const items: { item: MarqueeItem; n: number }[] = [];
  for (const row of readTable(grid).rows) {
    if (!isActive(tab, row, w)) continue;
    const highlight = localizedCol(row, 'destaque');
    if (!highlight) {
      w.add(tab, row.n, "falta 'destaque_pt' (linha ignorada)");
      continue;
    }
    const dates: { startsOn?: string; endsOn?: string } = {};
    for (const [col, key] of [['inicio', 'startsOn'], ['fim', 'endsOn']] as const) {
      const raw = row.get(col);
      if (isBlank(raw)) continue;
      const d = parseDate(raw);
      if (d) dates[key] = d;
      else w.add(tab, row.n, `data inválida em '${col}' ${q(raw)} (ignorada)`);
    }
    if (dates.startsOn && dates.endsOn && dates.endsOn < dates.startsOn) {
      w.add(tab, row.n, `'fim' é anterior a 'inicio' (linha ignorada)`);
      continue;
    }
    const text = localizedCol(row, 'texto');
    const href = optionalUrl(tab, row, 'link', w);
    items.push({
      n: row.n,
      item: {
        id: stableId('marquesina', highlight.pt, text?.pt, dates.startsOn),
        highlight,
        ...(text && { text }),
        ...(href && { href }),
        ...dates,
        order: orderOf(tab, row, w),
      },
    });
  }
  return dedupe(tab, items, w);
}

export function parseSchedule(grid: string[][], w: Warnings): ScheduleSlot[] {
  const tab = TAB.schedule;
  const items: { item: ScheduleSlot; n: number }[] = [];
  for (const row of readTable(grid).rows) {
    if (!isActive(tab, row, w)) continue;
    const day = parseWeekday(row.get('dia'));
    const time = parseTime(row.get('hora'));
    const kind = parseKind(row.get('tipo'));
    const errors = [
      !day && `dia inválido ${q(row.get('dia'))}`,
      !time && `hora inválida ${q(row.get('hora'))}`,
      !kind && `tipo inválido ${q(row.get('tipo'))}`,
    ].filter(Boolean);
    if (!day || !time || !kind) {
      w.add(tab, row.n, `${errors.join(', ')} (linha ignorada)`);
      continue;
    }
    const name = localizedCol(row, 'aula');
    const coach = clean(row.get('coach')) || undefined;
    const note = localizedCol(row, 'nota');
    items.push({
      n: row.n,
      item: {
        id: stableId('horario', day, time, kind, name?.pt, coach),
        day,
        time,
        kind,
        ...(name && { name }),
        ...(coach && { coach }),
        ...(note && { note }),
      },
    });
  }
  return dedupe(tab, items, w);
}

export function parsePrices(grid: string[][], w: Warnings): PricePlan[] {
  const tab = TAB.prices;
  const items: { item: PricePlan; n: number }[] = [];
  for (const row of readTable(grid).rows) {
    if (!isActive(tab, row, w)) continue;
    const label = localizedCol(row, 'plano');
    const price = parsePrice(row.get('preco'));
    if (!label || price === null) {
      const errors = [!label && "falta 'plano_pt'", price === null && `preço inválido ${q(row.get('preco'))}`].filter(Boolean);
      w.add(tab, row.n, `${errors.join(', ')} (linha ignorada)`);
      continue;
    }
    const featuredRaw = row.get('destaque');
    const featured = parseBool(featuredRaw);
    if (!isBlank(featuredRaw) && featured === null) w.add(tab, row.n, `valor de 'destaque' não reconhecido ${q(featuredRaw)} (assumido não)`);
    items.push({
      n: row.n,
      item: { id: stableId('precos', label.pt), label, priceEUR: price, featured: featured ?? false, order: orderOf(tab, row, w) },
    });
  }
  return dedupe(tab, items, w);
}

export function parseCoaches(grid: string[][], w: Warnings): Coach[] {
  const tab = TAB.coaches;
  const items: { item: Coach; n: number }[] = [];
  for (const row of readTable(grid).rows) {
    if (!isActive(tab, row, w)) continue;
    const name = clean(row.get('nome'));
    const bio = localizedCol(row, 'bio', true);
    if (!name || !bio) {
      const errors = [!name && "falta 'nome'", !bio && "falta 'bio_pt'"].filter(Boolean);
      w.add(tab, row.n, `${errors.join(', ')} (linha ignorada)`);
      continue;
    }
    let instagram: string | undefined;
    const igRaw = row.get('instagram');
    if (!isBlank(igRaw)) {
      instagram = instagramUrl(igRaw) ?? undefined;
      if (!instagram) w.add(tab, row.n, `instagram inválido ${q(igRaw)} (ignorado)`);
    }
    let photoSide: 'left' | 'right' | undefined;
    const sideRaw = row.get('foto_lado');
    if (!isBlank(sideRaw)) {
      photoSide = parseSide(sideRaw) ?? undefined;
      if (!photoSide) w.add(tab, row.n, `'foto_lado' deve ser esquerda ou direita, não ${q(sideRaw)} (ignorado)`);
    }
    items.push({
      n: row.n,
      item: {
        id: stableId('equipa', name),
        name,
        bio,
        ...(instagram && { instagram }),
        ...(photoSide && { photoSide }),
        order: orderOf(tab, row, w),
      },
    });
  }
  return dedupe(tab, items, w);
}

export function parseFeatures(grid: string[][], w: Warnings): Feature[] {
  const tab = TAB.features;
  const items: { item: Feature; n: number }[] = [];
  for (const row of readTable(grid).rows) {
    if (!isActive(tab, row, w)) continue;
    const icon = parseIcon(row.get('icone'));
    const title = localizedCol(row, 'titulo');
    const text = localizedCol(row, 'texto');
    if (!icon || !title || !text) {
      const errors = [
        !icon && `ícone inválido ${q(row.get('icone'))}`,
        !title && "falta 'titulo_pt'",
        !text && "falta 'texto_pt'",
      ].filter(Boolean);
      w.add(tab, row.n, `${errors.join(', ')} (linha ignorada)`);
      continue;
    }
    items.push({
      n: row.n,
      item: { id: stableId('destaques', icon, title.pt), icon, title, text, order: orderOf(tab, row, w) },
    });
  }
  return dedupe(tab, items, w);
}

// ---------- config tab (key/value) ----------

const CONFIG_KEYS = new Set([
  'hero_titulo', 'cta_texto', 'cta_badge', 'cta_link',
  'precos_atualizados', 'precos_promo', 'precos_promo_link',
  'morada_rua', 'morada_cp', 'morada_cidade', 'maps_link',
  'horario_seg_sex', 'horario_sab', 'horario_dom',
  'email', 'whatsapp', 'instagram', 'facebook', 'equipa_foto',
  'politica_privacidade_link', 'politica_cookies_link', 'crossfit_afiliado_link',
]);

/**
 * `config` tab: `chave | pt | en | es | …`. Non-translatable values go in the `pt`
 * column (a `valor` column is accepted as an alias). Problems with required keys
 * are collected in `problems` (the caller throws); optional ones become warnings.
 */
export function parseConfig(grid: string[][], w: Warnings, problems: string[]): SiteConfig | null {
  const tab = TAB.config;
  const rows = new Map<string, Row>();
  for (const row of readTable(grid).rows) {
    const key = normalizeHeader(row.get('chave'));
    if (!key) continue;
    if (!CONFIG_KEYS.has(key)) {
      w.add(tab, row.n, `chave desconhecida ${q(row.get('chave'))} (ignorada)`);
      continue;
    }
    if (rows.has(key)) {
      w.add(tab, row.n, `chave '${key}' repetida (usada a primeira)`);
      continue;
    }
    rows.set(key, row);
  }
  const value = (key: string) => {
    const row = rows.get(key);
    return row ? clean(row.get('pt') || row.get('valor')) : '';
  };
  const localized = (key: string) => {
    const row = rows.get(key);
    return row ? localizedFrom((l) => (l === 'pt' ? row.get('pt') || row.get('valor') : row.get(l))) : undefined;
  };
  const lineOf = (key: string) => rows.get(key)?.n ?? 0;

  // required
  const need = <T>(key: string, v: T | null | undefined, what = 'em falta ou inválido'): T | undefined => {
    if (v === null || v === undefined || v === '') {
      const raw = value(key);
      problems.push(raw ? `config '${key}': ${what} ${q(raw)}` : `config '${key}': em falta`);
      return undefined;
    }
    return v;
  };
  const heroTitle = need('hero_titulo', localized('hero_titulo'));
  const ctaLabel = need('cta_texto', localized('cta_texto'));
  const ctaBadge = need('cta_badge', localized('cta_badge'));
  const ctaHref = need('cta_link', parseUrl(value('cta_link')), 'link inválido');
  const street = need('morada_rua', value('morada_rua'));
  const postalCode = need('morada_cp', value('morada_cp'));
  const city = need('morada_cidade', value('morada_cidade'));
  const mapsHref = need('maps_link', parseUrl(value('maps_link')), 'link inválido');

  const hours = (key: string): TimeRange | null | undefined => {
    // the key must exist; an EMPTY value means closed (a missing row is a mistake, not "closed")
    if (!rows.has(key)) {
      problems.push(`config '${key}': em falta (deixe o valor vazio para "fechado")`);
      return undefined;
    }
    const r = parseTimeRange(value(key));
    if (r === 'closed') return null;
    if (r === null) {
      problems.push(`config '${key}': horário inválido ${q(value(key))} (use p.ex. 07:00-21:00, ou vazio = fechado)`);
      return undefined;
    }
    return r;
  };
  const weekdays = hours('horario_seg_sex');
  const saturday = hours('horario_sab');
  const sunday = hours('horario_dom');

  // optional
  const optUrl = (key: string): string | undefined => {
    const raw = value(key);
    if (!raw) return undefined;
    const url = parseUrl(raw);
    if (!url) w.add(tab, lineOf(key), `link inválido em '${key}' ${q(raw)} (ignorado)`);
    return url ?? undefined;
  };
  const optional: Partial<SiteConfig> = {};
  const set = <K extends keyof SiteConfig>(k: K, v: SiteConfig[K] | undefined) => {
    if (v !== undefined) optional[k] = v;
  };
  set('pricesUpdatedNote', localized('precos_atualizados'));
  set('pricesPromoNote', localized('precos_promo'));
  set('pricesPromoHref', optUrl('precos_promo_link'));
  set('privacyHref', optUrl('politica_privacidade_link'));
  set('cookiesHref', optUrl('politica_cookies_link'));
  set('affiliateHref', optUrl('crossfit_afiliado_link'));
  set('facebook', optUrl('facebook'));
  const ig = value('instagram');
  if (ig) {
    const url = instagramUrl(ig);
    if (url) optional.instagram = url;
    else w.add(tab, lineOf('instagram'), `instagram inválido ${q(ig)} (ignorado)`);
  }
  const wa = value('whatsapp');
  if (wa) {
    const phone = parsePhone(wa);
    if (phone) optional.whatsapp = phone;
    else w.add(tab, lineOf('whatsapp'), `whatsapp inválido ${q(wa)} (use p.ex. +351 912 345 678; ignorado)`);
  }
  const em = value('email');
  if (em) {
    const { emails, invalid } = parseEmails(em);
    if (emails.length) optional.emails = emails;
    for (const bad of invalid) w.add(tab, lineOf('email'), `email inválido ${q(bad)} (ignorado)`);
  }
  const photo = value('equipa_foto');
  if (photo) optional.teamPhoto = photo;

  if (
    !heroTitle || !ctaLabel || !ctaBadge || !ctaHref || !street || !postalCode || !city || !mapsHref ||
    weekdays === undefined || saturday === undefined || sunday === undefined
  ) {
    return null;
  }
  return {
    heroTitle,
    ctaLabel,
    ctaBadge,
    ctaHref,
    address: { street, postalCode, city },
    mapsHref,
    openingHours: { weekdays, saturday, sunday },
    ...optional,
  };
}

// ---------- whole sheet ----------

/** Parse every tab. Throws SheetError when a tab is missing or `config` lacks required keys. */
export function parseSheet(tabs: SheetTabs): { content: ParsedSheet; warnings: string[] } {
  const w = new Warnings();
  const problems: string[] = [];
  const grid = (name: string) => {
    const g = findTab(tabs, name);
    if (g === undefined) problems.push(`falta o separador '${name}'`);
    return g ?? [];
  };
  const config = parseConfig(grid(TAB.config), w, problems);
  const marquee = parseMarquee(grid(TAB.marquee), w);
  const schedule = parseSchedule(grid(TAB.schedule), w);
  const prices = parsePrices(grid(TAB.prices), w);
  const coaches = parseCoaches(grid(TAB.coaches), w);
  const features = parseFeatures(grid(TAB.features), w);

  if (schedule.length === 0) problems.push("o separador 'horario' não tem nenhuma aula válida");
  if (prices.length === 0) problems.push("o separador 'precos' não tem nenhum plano válido");
  if (problems.length || !config) throw new SheetError(problems.length ? problems : ['config inválida']);

  return { content: { config, marquee, features, schedule, prices, coaches }, warnings: w.list };
}

export { Warnings };
