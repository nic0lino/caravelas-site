# CrossFit Caravelas — Website Spec (v1)

> Handoff spec for Claude Code. **Owner:** Nico (design + front-end). **Data layer:** Juanpi (Google Sheets), working in his own Claude Code sessions.
> Read this whole file before writing code. Where this spec and the Figma disagree, **this spec wins** — every deviation is deliberate and listed in §12.

---

## 0. TL;DR

- One-page marketing site for **CrossFit Caravelas** (box in Lisbon). Portuguese (pt-PT) by default, English as second language.
- **All operational content (announcements, schedule, prices, team, contact details) comes from a Google Sheet edited by non-technical gym staff.** The site must render correctly with messy data and must never go blank because of a bad cell.
- UI is built first against a typed **content contract + local fixture**, so Nico (UI) and Juanpi (Sheets) work in parallel without blocking each other.
- Review URL: `nicolino.zip/testsite/caravelas`. Later it migrates to the gym's own domain with **env + DNS changes only, zero code changes**.
- Signature element: the **Marquesina** — a yellow band with announcements scrolling infinitely, fed by the sheet, with optional start/end dates per announcement.

---

## 1. Context & goals

- The gym currently runs a Wix site. Bookings and members live in **RegyBox** — this site does **not** replace RegyBox; it links to it.
- The person updating content (Feu, coach/owner) has no technical background. Every editing decision is designed around: *open the sheet, change a cell, see it on the site within a minute.*
- Classes are taught in PT and EN; the audience includes expats → full EN version is a real requirement, not a nice-to-have.

**Goals**
1. Faithful, polished implementation of the Figma design (desktop + mobile), with the motion details specified here.
2. Sheet-driven content with validation, fallbacks and a visible way to debug bad rows.
3. Portable deployment (subpath now, own domain later).

**Non-goals (v1)**
- Booking/payment (RegyBox does this). Contact form (links to WhatsApp/email instead). Blog. Any CMS other than Sheets. Cookie banner (we avoid needing one — see §9).

---

## 2. Source of truth: Figma

**File key:** `Zm15KVYnokYH9zQ40jV0mX` — page `0:1`

| Node | ID | Notes |
|---|---|---|
| Desktop page | `10:269` | 1728 wide, content column 1000 |
| Header | `1:1743` | |
| Hero | `1:10` | video + refraction shader (see §7.3) |
| Marquesina (component) | `21:6104` | standalone frame; instance inside page is `9:71` |
| Horários & Preçário | `1:1255` | table `1:1489`, price band `1:1697` |
| Os Capitães | `10:270` | |
| Contact / footer | `8:224` | |
| Features (hero rotator content) | `21:6018` | 4 features — see §6.2 |
| Mobile page | `21:6092` | 440 wide |
| Mobile header / hero / marquee | `21:2748` / `21:2346` / `21:2318` | |
| Mobile schedule / team / footer | `20:243` / `20:1721` / `21:6050` | |
| Loose vectors (squiggles) | `21:6015`, `21:6016` | 736×46 wave strokes |

**Rules for using the Figma MCP**
- Call `get_design_context` **per section node**, never on the whole page (output is too large and goes sparse).
- Export every static asset into `public/assets/` (SVG where possible). Never ship `figma.com/api/mcp/asset/...` URLs — they expire in 7 days.
- Raw Figma output is absolute-positioned React+Tailwind: translate to real flex/grid layout.
- **Do not use Figma's shader runtime** (`ShaderEffect`, WebGPU, HTML-in-Canvas). It's a prototype runtime with no production browser support. Port the effect to WebGL2 per §7.3.
- The hero video (`videocaravelas`) is a video fill and can't be exported from Figma. **Nico provides the source file.**

---

## 3. Architecture & hosting

### 3.1 Repo — separate project, mounted under nicolino.zip (decision D1)

Build this as its **own repo** (`caravelas-site`) and its **own Vercel project**, mounted at `nicolino.zip/testsite/caravelas` via a rewrite (Next.js multi-zones). Reasons:
- Juanpi needs push access to this project, not to Nico's portfolio/toys repo.
- Migration to the gym's domain becomes "attach domain + set `BASE_PATH=''`". No extraction surgery.
- Keeps nicolino.zip's architecture rule intact (no unrelated code in the toys repo).

The only change in the nicolino.zip repo is a rewrite (Nico does this by hand, separate PR):

```js
// nicolino.zip next.config — rewrites()
{ source: '/testsite/caravelas', destination: 'https://<caravelas-project>.vercel.app/testsite/caravelas' },
{ source: '/testsite/caravelas/:path*', destination: 'https://<caravelas-project>.vercel.app/testsite/caravelas/:path*' },
```

### 3.2 Stack
- Next.js (App Router) + TypeScript (strict) + Tailwind CSS (latest stable), tokens as CSS variables.
- `zod` for the content contract. `vitest` for unit tests, `playwright` for smoke/visual checks.
- Fonts via `next/font` (self-hosted, no Google requests at runtime).
- Deployed on Vercel with **ISR** (not `output: 'export'` — static export can't revalidate).
- No UI kit. Components are small and bespoke.

### 3.3 Directory layout

```
caravelas-site/
  CLAUDE.md                     ← generated from §11, read by both Claude Code instances
  docs/
    SPEC.md                     ← this file
    CONTENT_CONTRACT.md         ← §4, with a changelog at the bottom
    HANDOFF.md                  ← updated at the end of every session
  src/
    app/
      (pt)/page.tsx             ← PT at basePath root
      en/page.tsx               ← EN at /en
      layout.tsx
      status/page.tsx           ← content health page (noindex), see §4.5
      api/revalidate/route.ts   ← on-demand revalidation (Juanpi)
      sitemap.ts  robots.ts
    components/
      Header/ MobileMenu/ LangSwitch/
      Hero/ HeroRefraction/ FeatureRotator/
      Marquee/
      Schedule/ (ScheduleGrid, ScheduleDayTabs, ScheduleCell)
      Pricing/
      Team/
      Footer/
      icons/                    ← feature icons + social, currentColor SVGs
    content/
      schema.ts                 ← THE CONTRACT (shared)
      index.ts                  ← getSiteContent(lang)
      select.ts                 ← pure selectors: active marquee items, schedule grid, today
      sources/
        fixture.ts
        fixtures/content.json
        sheets.ts               ← Juanpi
      parse/                    ← tolerant cell parsers (Juanpi)
    i18n/
      pt.ts  en.ts              ← UI strings only (labels, headings), not sheet content
    styles/tokens.css
  apps-script/                  ← Sheet-side scripts (Juanpi), versioned here
  public/assets/
```

### 3.4 Environment variables (`.env.example` must list all of them)

| Var | Example | Notes |
|---|---|---|
| `BASE_PATH` | `/testsite/caravelas` | `''` after migration. Used in `next.config` `basePath` |
| `NEXT_PUBLIC_SITE_URL` | `https://nicolino.zip/testsite/caravelas` | canonical, OG, sitemap |
| `NEXT_PUBLIC_INDEXABLE` | `false` | `false` → `noindex,nofollow` meta + `X-Robots-Tag` header |
| `CONTENT_SOURCE` | `fixture` \| `sheets` | fixture until Juanpi's adapter lands |
| `REVALIDATE_SECONDS` | `300` | ISR window |
| `REVALIDATE_SECRET` | random | shared with the Apps Script "Publicar" button |
| `SHEETS_*` | — | defined by Juanpi, documented in CONTENT_CONTRACT.md |

### 3.5 Migration to the gym's domain (checklist, not v1 work)
1. Decide domain (current `caravelas.fit` may be hard to access; alternative is a new domain).
2. Ideally transfer the Vercel project to the gym's own Vercel team.
3. `BASE_PATH=''`, `NEXT_PUBLIC_SITE_URL=https://<domain>`, `NEXT_PUBLIC_INDEXABLE=true`, redeploy, attach domain.
4. Port Privacy & Cookies policy pages (today they link to Wix URLs that die with the Wix site).
5. 301s from known Wix URLs to the new pages.
6. Remove the rewrite from nicolino.zip.

---

## 4. Content contract (shared — the interface between UI and data)

### 4.1 Principles
- **The UI never reads the sheet directly.** It calls `getSiteContent(lang)` and receives a validated `SiteContent` object. Where it comes from (fixture, Sheets, anything later) is invisible to components.
- **Row-level tolerance, page-level safety.** A bad row is skipped and reported as a warning; it never crashes rendering. If a whole source fetch fails, the previous good page keeps being served (ISR keeps the last successful render when regeneration throws).
- **Operational content → sheet. Brand copy & UI labels → code** (`src/i18n`). Rule of thumb: if it changes because of how the gym operates this week/month, it's in the sheet.
- **Localized fields** are `{ pt, en? }`. Missing `en` falls back to `pt`.
- **Inactive rows** (`ativo` unchecked) are dropped by the adapter. **Date windows** are applied by selectors in `select.ts`, not by the adapter.

### 4.2 Schema (`src/content/schema.ts`)

```ts
import { z } from 'zod';

export const Localized = z.object({ pt: z.string().min(1), en: z.string().optional() });

export const Weekday = z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
export const Time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/); // normalized "07:00"
export const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);      // normalized, Europe/Lisbon

export const MarqueeItem = z.object({
  id: z.string(),
  highlight: Localized,            // bold part
  text: Localized.optional(),      // light part
  href: z.string().url().optional(),
  startsOn: IsoDate.optional(),    // inclusive
  endsOn: IsoDate.optional(),      // inclusive
  order: z.number().int().default(0),
});

export const ClassKind = z.enum(['crossfit', 'open_box', 'team_wod', 'other']);

export const ScheduleSlot = z.object({
  id: z.string(),
  day: Weekday,
  time: Time,
  kind: ClassKind,
  name: Localized.optional(),      // if absent, UI uses the default label for `kind`
  coach: z.string().optional(),    // rendered as "Coach {coach}"; if absent, UI uses kind default (open_box → "Livre"/"Open")
  note: Localized.optional(),
});

export const PricePlan = z.object({
  id: z.string(),
  label: Localized,                // "Drop-In", "2 Aulas por semana"
  priceEUR: z.number().nonnegative(),
  featured: z.boolean().default(false), // outlined box (Drop-In in Figma)
  order: z.number().int().default(0),
});

export const Coach = z.object({
  id: z.string(),
  name: z.string().min(1),
  bio: Localized,                  // paragraphs separated by a blank line; FIRST paragraph renders bold (design rule, no markup)
  order: z.number().int().default(0),
});

export const FeatureIcon = z.enum(['lifebuoy', 'anchor', 'ship']);
export const Feature = z.object({
  id: z.string(),
  icon: FeatureIcon,
  title: Localized,
  text: Localized,
  order: z.number().int().default(0),
});

export const OpeningHours = z.object({
  weekdays: z.object({ opens: Time, closes: Time }).nullable(), // Mon–Fri
  saturday: z.object({ opens: Time, closes: Time }).nullable(),
  sunday:   z.object({ opens: Time, closes: Time }).nullable(), // null = "Fechado"
});

export const SiteConfig = z.object({
  heroTitle: Localized,
  ctaLabel: Localized,             // "Agende a aula experimental"
  ctaBadge: Localized,             // "GRÁTIS"
  ctaHref: z.string().url(),       // RegyBox trial booking link
  pricesUpdatedNote: Localized.optional(),
  pricesPromoNote: Localized.optional(),
  pricesPromoHref: z.string().url().optional(),
  address: z.object({ street: z.string(), postalCode: z.string(), city: z.string() }),
  mapsHref: z.string().url(),
  openingHours: OpeningHours,
  email: z.string().email().optional(),
  whatsapp: z.string().regex(/^\+\d{8,15}$/).optional(), // E.164
  instagram: z.string().url().optional(),
  facebook: z.string().url().optional(),
  teamPhoto: z.string().optional(), // repo path or absolute URL
});

export const SiteContent = z.object({
  config: SiteConfig,
  marquee: z.array(MarqueeItem),
  features: z.array(Feature),
  schedule: z.array(ScheduleSlot),
  prices: z.array(PricePlan),
  coaches: z.array(Coach),
  meta: z.object({
    source: z.enum(['fixture', 'sheets']),
    fetchedAt: z.string(),
    warnings: z.array(z.string()), // human-readable, e.g. "horario linha 14: hora inválida '7.30'"
  }),
});
export type SiteContent = z.infer<typeof SiteContent>;
```

### 4.3 Sheet layout (proposal — Juanpi owns the final version)

Column headers are in Portuguese for the gym. Header matching is case- and accent-insensitive.

| Tab | Columns |
|---|---|
| `config` | `chave` \| `pt` \| `en` — key/value. Keys: `hero_titulo`, `cta_texto`, `cta_badge`, `cta_link`, `precos_atualizados`, `precos_promo`, `precos_promo_link`, `morada_rua`, `morada_cp`, `morada_cidade`, `maps_link`, `horario_seg_sex` (`07:00-21:00`), `horario_sab`, `horario_dom` (empty = fechado), `email`, `whatsapp`, `instagram`, `facebook`, `equipa_foto` |
| `marquesina` | `ativo` ☑ \| `destaque_pt` \| `texto_pt` \| `destaque_en` \| `texto_en` \| `link` \| `inicio` \| `fim` \| `ordem` |
| `horario` | `ativo` ☑ \| `dia` ▾ (Segunda…Domingo) \| `hora` \| `tipo` ▾ (CrossFit, Open Box, Team WOD, Outro) \| `aula_pt` \| `aula_en` \| `coach` \| `nota_pt` \| `nota_en` — **one row per class**, never a grid |
| `precos` | `ativo` ☑ \| `plano_pt` \| `plano_en` \| `preco` \| `destaque` ☑ \| `ordem` |
| `equipa` | `ativo` ☑ \| `nome` \| `bio_pt` \| `bio_en` \| `ordem` |
| `destaques` | `ativo` ☑ \| `icone` ▾ (boia, âncora, navio) \| `titulo_pt` \| `texto_pt` \| `titulo_en` \| `texto_en` \| `ordem` |
| `LEIA-ME` | Instructions for Feu in PT. Not fetched. |

Sheet UX requirements (for Juanpi): frozen + protected header row, dropdowns (data validation) for every enum, checkboxes for booleans, example row in grey, a custom menu **"Site → Publicar alterações"** that calls the revalidate endpoint.

Why one row per class: the grid is derived (§6.4). Editing a 7×9 grid in a sheet invites merged cells and misaligned rows; a flat list is sortable, filterable and validatable.

### 4.4 Tolerant parsing rules (Juanpi; unit-tested)

- Trim everything; collapse internal whitespace in single-line fields.
- Booleans: `TRUE/FALSE`, `VERDADEIRO/FALSO`, `sim/não`, `1/0`, checkbox values.
- Dates → ISO: `dd/mm/yyyy`, `d/m/yy`, `yyyy-mm-dd`. Interpret in `Europe/Lisbon`.
- Times → `HH:MM`: `7:00`, `07h00`, `7h`, `7.30` (→ `07:30`).
- Prices → number: `€20`, `20 €`, `20,00`, `20.00`.
- Weekday/kind dropdown labels → enums (accent-insensitive: `Sabado` = `Sábado`).
- Empty rows skipped silently. Unknown columns ignored. Invalid rows skipped **with a warning** naming tab + row number + reason.
- IDs: stable hash of the row's key fields (don't rely on row numbers; staff will reorder).

### 4.5 Freshness & failure behavior

- Page uses ISR with `revalidate = REVALIDATE_SECONDS` (300).
- `POST /api/revalidate` with header `x-revalidate-secret` → revalidates `/` and `/en`. Triggered by the sheet's "Publicar alterações" menu for near-instant updates.
- **Source choice (Juanpi decides):** prefer a near-real-time source returning plain strings in one request — Sheets API v4 `values.batchGet` (API key, sheet shared as viewer) or an Apps Script web app returning JSON. Avoid the "Publish to web" CSV as primary (Google caches it for minutes, which defeats the Publicar button) and the `gviz` CSV endpoint (it coerces each column to a majority type and silently nulls minority-type cells).
- If the fetch fails or the result fails page-level validation (e.g. `config` missing required keys) → **throw**, so ISR keeps serving the last good page. Never render an empty site.
- `/status` page (noindex, unlinked): source, fetchedAt, counts per section, and the warnings list. This is how Feu/Juanpi find out why a row isn't showing.

### 4.6 Fixture
`src/content/sources/fixtures/content.json` reproduces the Figma content exactly (with the copy fixes from §12.2), plus:
- 2 marquee items (one with `endsOn` in the past, to prove filtering),
- one EN field intentionally missing (to prove fallback),
- schedule covering the full Figma grid.

### 4.7 Contract changes
Any change to `schema.ts` goes in its own PR titled `contract: …`, updating `schema.ts`, the fixture and the changelog in `docs/CONTENT_CONTRACT.md` together, approved by the other person. Neither Claude Code instance may change the schema as a side effect of other work.

---

## 5. Design system

### 5.1 Color tokens (`styles/tokens.css`)

| Token | Hex | Used in |
|---|---|---|
| `--yellow` | `#FDE00A` | hero title, marquee bg, day headers, squiggles (absorbs `#FDD806` from the Capitães pill) |
| `--lime-400` | `#A4CF3D` | schedule times, coach-name rule |
| `--lime-500` | `#99C82A` | CTA gradient start, footer heading |
| `--olive-600` | `#66793A` | CTA border |
| `--olive-700` | `#536C16` | featured price outline |
| `--olive-800` | `#4B6215` | CTA gradient end |
| `--moss-700` | `#496700` | coach names |
| `--moss-900` | `#304400` | header bg, Open Box cell, CTA text, Capitães title text, CTA shadow |
| `--moss-950` | `#293805` | Team WOD cell; CrossFit cell = same at 79% alpha |
| `--table-bg` | `#232E07` | schedule table body |
| `--band-bg` | `#121901` | price band |
| `--band-line` | `#74730A` | price band border |
| `--paper` | `#EDEDED` | team section |
| `--footer` | `#242424` | footer |
| `--ink` | `#0E0F0C` | language switch |
| Schedule section bg | radial `#4B5C0E` → `#34420A` → `#1D2705` | centered low, see Figma `1:1255` |

### 5.2 Typography

Primary family: **Lato** (Light 300, Regular 400, Medium 500, Bold 700, Black 900) via `next/font/google`.
Figma also uses **Museo Sans 100** (nav, hero body, marquee separator) and **Inter Bold** (one section title). Decision D4: default is **Lato only** — Museo Sans 100 → Lato Light; Inter → Lato Bold. Museo Sans needs a web license or Adobe Fonts kit; if Nico confirms one, swap it back in via a single CSS variable `--font-thin`.

| Role | Desktop | Mobile | Style |
|---|---|---|---|
| Display (hero title) | 96 / 0.78 | ~60 | Lato Black, uppercase, `--yellow` — use `clamp()` |
| H2 (section titles, coach names) | 32–36 | 20–24 | Lato Bold (titles), Lato Medium (coach names) |
| Marquee | 32 | ≥ 14 | Lato Bold (highlight) + Lato Light (text) |
| Lead | 20 | 15–16 | Lato Light (was Museo Sans 100) |
| Label | 16–20 | 12–14 | Lato Black (times, feature title), Lato Regular (day headers) |
| Body small | 12 → **14** | 14 | see §12.1 (readability) |
| Price | 32 | 24 | Lato Bold; label Lato Light 12 |

### 5.3 Layout & breakpoints
- Content column: `max-width: 1000px`, centered, `padding-inline: 24px` (16px on mobile). Sections: 40px vertical padding (desktop), 32px (mobile).
- Breakpoints: **mobile < 768** (design reference 440), **tablet 768–1199** (interpolate; schedule grid still fits), **desktop ≥ 1200** (design reference 1728).
- Anchors: `#horarios`, `#equipa`, `#contacto` with `scroll-margin-top` and smooth scroll (disabled under reduced motion).

### 5.4 Interaction states (not designed in Figma — proposed, keep subtle)
- **CTA:** hover → lift 1px, gradient brightens ~6%, shadow tightens; active → press 1px; focus-visible → 2px `--yellow` ring with 3px offset.
- **Nav links:** hover → `--yellow` text + 1px underline offset 6px.
- **Schedule (desktop):** hovered cell lightens; its time label and day header highlight.
- **Links in dark sections:** underline always visible (don't rely on color only).
- Global focus-visible ring everywhere; never remove outlines without replacement.

### 5.5 Assets to export from Figma
White logo lockup (header), logo mark (marquee separator), feature icons (lifebuoy, anchor, ship — as `currentColor` stroke SVGs), squiggles (yellow price-band wave, gradient Capitães wave), CrossFit Journal + CrossFit Affiliates logos, Livro de Reclamações logo, team photo, map image, PT flag (only if D5 keeps flags). Social icons in Figma are PNGs → replace with clean SVGs.

---

## 6. Sections (top → bottom)

### 6.1 Header — `1:1743` / mobile `21:2748`
- Bg `--moss-900`, padding 40px block. Logo left, nav center (`HORÁRIOS & PREÇÁRIO`, `EQUIPA`, `CONTACTO`; Lato Light 20, uppercase, white), language switch + Facebook/Instagram right.
- Language switch: see D5. Default = text toggle `PT · EN` in the dark pill (`--ink`, radius 10), active language bold. Switching preserves the current `#hash`.
- **Mobile:** logo + hamburger. Menu = full-screen overlay (`--moss-900`), large nav links, language toggle, socials, CTA. Focus trap, `Esc` closes, body scroll locked, returns focus to the button. Figma puts the language switch inside the mobile hero (top-right) — keep it there as well for parity.
- Not sticky in v1.

### 6.2 Hero — `1:10` / mobile `21:2583`
- Height ~667px desktop / ~518px mobile. Background: video with refraction shader (§7.3), poster image first.
- Left: display title `config.heroTitle` ("BOX DE BEM-ESTAR"), then the **feature block** (icon 101×106 + title Lato Black 20 + text Lato Light 20, white, max-width 358).
- Right, bottom-aligned with the feature block: CTA (402×70, radius 16, gradient `--lime-500` 66% → `--olive-800`, 2px `--olive-600` border, drop shadow `4px 4px 3px --moss-900`, text `--moss-900`: label Lato Medium 20 + badge Lato Black 20). Links to `config.ctaHref` (RegyBox) in a new tab.
- **Feature block rotates** through `features[]` (decision D3 — the `Features` frame holds 4 variants for one slot). See §7.2.
- Ensure text contrast over any video frame: add a subtle left-to-right dark gradient overlay if needed; check against the darkest and lightest frames.
- **Mobile:** stacked; title, feature block, CTA centered below.

### 6.3 Marquesina — `21:6104` / mobile `21:2318`
- Full-bleed band, bg `--yellow`, height 67px desktop / ≥ 40px mobile.
- Repeating unit: `[logo mark] [highlight (Lato Bold)] [text (Lato Light)] [thin "|"]`, black, 32px desktop.
- Content: `selectActiveMarquee(content.marquee, nowInLisbon)` — `startsOn ≤ today ≤ endsOn` (each bound optional), sorted by `order`. Multiple active items alternate along the track.
- If an item has `href`, the whole item is a link.
- **Zero active items → the band is not rendered at all** (no empty yellow strip).
- Position: directly under the hero (both breakpoints).
- Motion & accessibility: §7.1.

### 6.4 Horários & Preçário — `1:1255` / mobile `20:243` — `id="horarios"`
**Grid derivation (`select.ts`, unit-tested):**
- Rows = sorted unique `time` values across all slots.
- Columns = Mon–Sat always; Sunday only if any Sunday slot exists.
- Cell = slots matching day+time (support 2 stacked if a box ever runs parallel classes).
- Empty cell = empty (no placeholder text).

**Desktop (≥ 768): semantic `<table>`** with `<th scope="col">` days (Lato Regular 16, `--yellow`) and `<th scope="row">` times (Lato Black 20, `--lime-400`). 1px white rules as in Figma. Cell tint by `kind`: `crossfit` → `--moss-950`@79%, `open_box` → `--moss-900`, `team_wod` → `--moss-950`. CrossFit names Lato Black; Open Box Lato Regular. Second line: `Coach {coach}` (Light "Coach" + Regular name) or kind default ("Livre").
- **Today**: column header gets a yellow pill + visually hidden "(hoje)". Computed client-side in Europe/Lisbon after hydration (the page is cached, so "today" can't be server-rendered).
- Optional polish: thin marker on the next upcoming class today.

**Mobile (< 768): day tabs (decision D2).** Figma compresses the full 7-column table into 440px, which puts text at ~6px — unreadable. Instead: a row of day chips (Seg Ter Qua Qui Sex Sáb), default = today (Sunday → Monday + small note "Domingo: fechado"), then a vertical list for that day: time (`--lime-400`, Lato Black 20) + class name + coach. Same tokens and tints as desktop. Tabs follow the WAI-ARIA tabs pattern (arrow-key navigation).

**Price band** (`1:1697`): bg `--band-bg` with faint yellow radial glow on the left, 0.65px `--band-line` border, bottom radius 16, yellow squiggle decoration masked on the left (desktop only).
- Items from `prices[]` sorted by `order`: label Lato Light 12 + price Lato Bold 32, white. `featured` → 2px `--olive-700` outlined box (radius 7). Thin vertical separators between non-featured items (normalize — Figma is inconsistent about where separators go).
- Price format: `€20` as designed (integers without decimals; `€22,50` if non-integer). Note: pt-PT convention would be `20 €` — we keep the design's style deliberately.
- Footnotes row: `pricesUpdatedNote` (Light) left, `pricesPromoNote` (Bold, linked if `pricesPromoHref`) right.
- **Mobile:** 2×2 grid of prices, notes stacked and centered.

### 6.5 Os Capitães — `10:270` / mobile `20:1721` — `id="equipa"`
- Bg `--paper`. Left column: title pill (450×58, radius 10, gradient `--yellow` → transparent, "Os Capitães" Lato Bold 32 `--moss-900`, gradient squiggle to the right). Below, coach columns (211 wide, gap 28): name Lato Medium 32 `--moss-700` with 1px `--lime-400` bottom rule, then bio.
- Bio: split on blank lines; **first paragraph bold**, rest regular. Body size 14 (see §12.1), black.
- Right: team photo (`config.teamPhoto`, default `public/assets/team.jpg`), radius 16, radial fade into `--paper` on its left edge, bleeds to the viewport's right edge.
- Supports 1–4 coaches: 2-column grid that wraps.
- **Mobile:** photo first with the title pill overlapping its bottom-left; bios **single column** (Figma has two 170px columns, too narrow at readable sizes).
- Images: default is repo-hosted. If a URL is given in the sheet, render with explicit dimensions and `object-fit: cover`. Google Drive share links are not reliable image hosts — document this in `LEIA-ME`.

### 6.6 Contacto / Footer — `8:224` / mobile `21:6050` — `id="contacto"`
- Bg `--footer`, 600px column centered.
- Left: heading "Alguma dúvida, sugestão ou deseja falar com a **nossa equipa?**" (Lato Regular 20 `--lime-500`, last words Black). Figma says "Envie uma mensagem" but has no action → add two buttons: **WhatsApp** (`https://wa.me/<number>`) and **Email** (`mailto:`), rendered only if present in config.
- Address block (`MORADA`) and hours block (`HORÁRIOS`) from config, white 12→14px. Hours displayed as `Segunda a Sexta: 07:00–21:00`, `Sábado: 09:00–12:00`, `Domingo: Fechado`.
- Right: **static map image** linking to `config.mapsHref` (decision D6). Radius as in Figma. Alt text = full address.
- Logo row: CrossFit Journal + CrossFit Affiliates.
- Legal row: `© {current year} CrossFit Caravelas.` · `Política de Privacidade` · `Política de Cookies` · **Livro de Reclamações** logo linking to `https://www.livroreclamacoes.pt` (legally required for businesses in Portugal with a website — must be visible).
- **Mobile:** text blocks in 2 columns as in Figma, map full width below, logos centered.

---

## 7. Motion

### 7.1 Marquee mechanics
- Build the track by repeating the active items until one copy is ≥ viewport width, then render **two copies** side by side; animate `transform: translateX(0) → translateX(-50%)`, `linear`, `infinite`. Never animate `left`/`margin`.
- **Constant speed, not constant duration:** `duration = copyWidth / speed`, speed ≈ 60px/s desktop, 45px/s mobile (tune by eye). Recompute with `ResizeObserver` and after `document.fonts.ready` (prevents a jump when Lato swaps in).
- Pause on hover and on `:focus-within`. Plus a small, visible **pause/play button** at the band's right edge (24px, black icon, `aria-pressed`) — WCAG 2.2.2 requires a way to stop motion lasting > 5s.
- `prefers-reduced-motion: reduce` → no animation; show the first item static and centered (text may wrap).
- Accessibility: the band is a `<section aria-label="Avisos">`; one visually hidden list contains each announcement once; all visual copies are `aria-hidden="true"` with links `tabindex="-1"` except the first copy.
- Use `will-change: transform` only while animating. Pause when off-screen (`IntersectionObserver`) and when the tab is hidden.

### 7.2 Feature rotator (hero)
- Cycles `features[]` every ~6s: outgoing fades + translates up 8px, incoming fades in from 8px below (300–400ms, ease-out). Icon strokes "draw on" via `stroke-dashoffset` on entry — optional polish, keep only if it reads well.
- Pauses on hover/focus and when the hero is off-screen. Reduced motion → show the first feature only, static.
- Fixed height = tallest feature (measure once) to avoid layout shift.
- `aria-live="off"` (decorative rotation; don't spam screen readers). All features available to screen readers as a list.

### 7.3 Hero refraction shader (WebGL2 port of Figma's "Pattern refraction")
Figma params on `16:886`: pattern **Zigzag**, strength 19, smoothness 69%, frost 44%, dispersion 54%, center (50%, 50%), radius 8.16%, angle 32°, edge wrap Zero; the video layer is rotated 3.88° and overscaled.

Port as a single full-screen WebGL2 fragment shader sampling the `<video>` as a texture:
- Keep the math of the Figma shader (height field → normals → per-channel refraction with IOR dispersion → chromatic split, value-noise frost). Params translated: size ≈ 100px and offset ≈ 190px **at the 1786px design layer width** → express both as fractions of canvas width so the effect scales with the viewport. Seamlessness 0.69, frost 0.044, dispersion 0.135, angle −32°.
- Edge wrap: use **clamp/mirror**, not zero, to avoid black seams; apply the 3.88° rotation in UV space instead of CSS (no overscan waste).
- **Performance:** Figma's version does 36 sub-samples per pixel — unacceptable on phones. Use 1 sample (max 2×2 on desktop), render at 0.5–0.75 device pixel ratio (the frost hides aliasing), redraw only on new video frames (`requestVideoFrameCallback`, fallback rAF throttled to 30fps).
- Pause rendering + video when the hero leaves the viewport or the tab is hidden.
- **Load order:** poster image (pre-rendered frame *with* the effect — export the hero background from Figma) is the LCP element; shader module is dynamically imported after `load`; canvas fades in over the poster once the first frame is drawn.
- **Fallback to the static poster** when: no WebGL2, `prefers-reduced-motion`, `navigator.connection.saveData`, or the context is lost.
- Video: muted, `playsinline`, `loop`, no audio track. Encode H.264 MP4 + VP9 WebM, 8–12s seamless loop, ~960×540 is enough (the refraction hides compression), target ≤ 2.5MB. Separate portrait crop for mobile if the subject falls out of frame.
- Compare visually against the Figma screenshot of `1:10`; the goal is the same feel (diagonal zigzag refraction, soft frost, slight RGB split), not pixel identity.

---

## 8. i18n
- Routes: PT at the basePath root, EN at `/en`. Both render the same `<HomePage lang>`. No middleware, no auto-redirect by browser language (just a toggle); remember the last choice in `localStorage` only to preselect the toggle, wrapped in try/catch.
- `<html lang>` set correctly (`pt-PT` / `en`), `hreflang` alternates + `x-default` → PT.
- UI strings (nav, section titles, day names, "Coach", "Livre", "hoje", "Morada", "Fechado", marquee pause label, contact heading) live in `src/i18n/{pt,en}.ts`. Sheet content uses `Localized` with PT fallback.
- EN section titles: "Schedule & Pricing", "The Captains", "Contact".

---

## 9. SEO, legal, privacy
- Title: `CrossFit Caravelas — Box de bem-estar em Lisboa` / EN `CrossFit Caravelas — Wellness-focused CrossFit box in Lisbon`. Meta description per language. OG image 1200×630 (logo on hero poster).
- JSON-LD `ExerciseGym`: name, address, geo, `openingHoursSpecification` (from `config.openingHours`), sameAs (Instagram/Facebook), url.
- While `NEXT_PUBLIC_INDEXABLE=false`: `noindex,nofollow` meta **and** `X-Robots-Tag` header, so the gym's content never gets indexed under nicolino.zip (would become duplicate content after migration).
- **No cookies by default:** no Google Maps iframe (static image instead), no GA. If analytics are wanted, use a cookieless option (Vercel Web Analytics or Plausible) → no consent banner needed under GDPR.
- Livro de Reclamações link in the footer (see §6.6).

---

## 10. Accessibility & performance budgets
- Target Lighthouse (mobile): Performance ≥ 90, Accessibility 100, Best Practices ≥ 95, SEO 100 (with indexable on).
- LCP < 2.5s on simulated 4G (poster is the LCP element). CLS < 0.05. JS (excluding the lazy shader chunk) < 120KB gzipped.
- Contrast AA for all text, including over the video. Minimum rendered text size 12px anywhere, 14px for body copy.
- All motion respects `prefers-reduced-motion`; marquee has a pause control.
- Keyboard: everything reachable; visible focus; mobile menu traps focus; day tabs use roving tabindex.
- Images: explicit width/height, `next/image` where it helps, AVIF/WebP.

---

## 11. Collaboration protocol (→ create `CLAUDE.md` from this section in Phase 0)

Two people, two Claude Code accounts, one repo.

**Ownership**
- **Nico (UI):** `src/components/**`, `src/app/**` pages/layout, `src/i18n/**`, `src/styles/**`, `public/assets/**`.
- **Juanpi (data):** `src/content/sources/sheets.ts`, `src/content/parse/**`, `src/app/api/revalidate/**`, `apps-script/**`, the Google Sheet itself.
- **Shared (contract):** `src/content/schema.ts`, `src/content/select.ts`, fixtures, `docs/CONTENT_CONTRACT.md`. Changes only via `contract:` PRs (§4.7).

**Rules for every Claude Code session**
1. Read `CLAUDE.md`, `docs/SPEC.md`, `docs/CONTENT_CONTRACT.md` and `docs/HANDOFF.md` before doing anything.
2. Stay inside your owner's area. If you need something from the other area, write it under "Requests" in `HANDOFF.md` instead of editing it.
3. Never change `schema.ts` as a side effect. Propose contract changes as a separate PR.
4. Branches: `ui/<topic>`, `data/<topic>`, `contract/<topic>`. `main` is protected; merge via PR (Vercel preview per PR).
5. Conventional commits. Small PRs.
6. Before ending a session, update `docs/HANDOFF.md`: what changed, current state, next steps, open questions, requests to the other person.
7. `pnpm test` and `pnpm build` must pass before opening a PR.

---

## 12. Deviations from Figma & copy fixes

### 12.1 Design deviations (deliberate)
| Figma | Implementation | Why |
|---|---|---|
| Full table on mobile (~6px text) | Day tabs + list | Legibility |
| Two bio columns on mobile | Single column | Legibility |
| Body text 12px, coach line 8px | 14px body, ≥ 11px coach line | Legibility / a11y |
| Museo Sans 100 + Inter | Lato only (D4) | Licensing, consistency |
| Flag dropdown | `PT · EN` text toggle (D5) | Flags denote countries, not languages; which flag is English? |
| Embedded Google Map | Static image + link (D6) | No cookies/consent, faster |
| "Envie uma mensagem" with no action | WhatsApp + Email buttons | Otherwise a dead end |
| Marquee 12px on mobile | ≥ 14px | It's the key announcement |
| Schedule has no "today" | Today highlighted | Most visitors want today's classes |
| States undefined | §5.4 | Needed for implementation |

### 12.2 Copy fixes (pt-PT) — applied in code strings and fixture
| Figma | Fixed | Note |
|---|---|---|
| HORARIOS & PRECIARIO / Horarios & Preçario | Horários & Preçário | accents + spelling, unify nav and title |
| CONTACT | CONTACTO | EN word in PT nav |
| Os Capitaes | Os Capitães | |
| Sabado / Terca | Sábado / Terça | |
| GRATIS | GRÁTIS | |
| Agenda a aula experimental | Agende a aula experimental | rest of the site uses formal address ("Envie", "saia") — **Nico to confirm** |
| LISTOS E EQUIPADOS | PRONTOS E EQUIPADOS | "Listos" is Spanish |
| Coach Dinamico | Coach Dinâmico | placeholder? confirm with the gym |
| @ 2019 | © {current year} | |
| 7h00am - 9h00pm | 07:00–21:00 | pt-PT uses 24h |

### 12.3 Data inconsistencies in Figma (resolved by the sheet, flagged for the gym)
- Prices differ between desktop (2×/sem €60, 3×/sem €70, Livre €80) and mobile (all €70). Fixture uses the desktop values; the gym confirms.
- Desktop hides the "3 Aulas por semana" label. Fixture includes it.
- Every class says "Coach Ana Lima" — placeholder; real schedule comes from the gym.
- "Todos a bordo" and "Listos/Prontos e equipados" share the same ship icon — Nico to provide a 4th icon or accept the repeat.
- Coach bios mix pt-BR and pt-PT ("judô", "desporto"). Leave as written by the coaches unless the gym wants it normalized.

---

## 13. Open decisions (defaults applied — change here if needed)

| # | Decision | Default |
|---|---|---|
| D1 | Separate repo + multi-zone rewrite vs folder inside nicolino.zip | **Separate repo** |
| D2 | Mobile schedule: day tabs vs compressed table | **Day tabs** |
| D3 | Hero feature block rotates through 4 features vs static first one | **Rotates** |
| D4 | Lato only vs licensed Museo Sans 100 | **Lato only** |
| D5 | Language switch: text vs flag dropdown | **Text `PT · EN`** |
| D6 | Map: static image vs Google Maps iframe | **Static image** |
| D7 | Contact: WhatsApp/email links vs form | **Links** |
| D8 | Freshness: ISR 300s + Publicar button | **Yes** |
| D9 | Sheets source: API v4 vs Apps Script JSON | **Juanpi decides** (§4.5 constraints) |

---

## 14. Phases & acceptance criteria

**Phase 0 — Bootstrap (Nico)**
- Repo, Next + TS strict + Tailwind, `next/font` Lato, `tokens.css`, `.env.example`, `basePath` from env.
- `CLAUDE.md` (from §11), `docs/SPEC.md` (this file), `docs/CONTENT_CONTRACT.md` (§4 + changelog), `docs/HANDOFF.md`.
- `schema.ts`, `select.ts` (+ tests), fixture, `getSiteContent()` with fixture source.
- Assets exported from Figma into `public/assets/`.
- ✅ `pnpm build` passes; `/status` shows fixture content and zero warnings except the intentional ones.
- **After Phase 0 Juanpi can start Phase 4 in parallel.**

**Phase 1 — Static sections (Nico)**
- Header, mobile menu, hero (poster only), marquee (static), schedule (grid + day tabs), price band, team, footer — desktop + mobile.
- ✅ Side-by-side with Figma screenshots at 1728 and 440 widths: same structure, spacing within a few px, tokens match. Deviations only those in §12.

**Phase 2 — Motion (Nico)**
- Marquee animation (§7.1), feature rotator (§7.2), hero shader (§7.3).
- ✅ Marquee loops with no visible seam or jump at any width, after font load and after resize; pause button works; reduced motion = static.
- ✅ Shader holds 60fps on a mid-range laptop and doesn't drop the page below Lighthouse 90 on mobile; fallback poster shows with WebGL disabled.

**Phase 3 — i18n, SEO, deploy (Nico)**
- `/en`, hreflang, JSON-LD, OG, noindex on test path, Vercel deploy, rewrite added to nicolino.zip.
- ✅ `nicolino.zip/testsite/caravelas` and `/testsite/caravelas/en` load with assets, fonts and anchors working (no broken paths due to basePath).

**Phase 4 — Sheets (Juanpi)**
- Sheet with tabs/validation/LEIA-ME (§4.3), adapter + tolerant parsers (§4.4) with unit tests covering every format listed, `/api/revalidate`, Apps Script "Publicar" menu.
- ✅ Editing a marquee row and clicking Publicar shows the change on the live page within ~1 minute.
- ✅ Garbage rows (bad time, bad price, unknown day) are skipped and listed on `/status`; the rest of the page renders.
- ✅ Breaking the source (wrong ID) keeps serving the last good page.

**Phase 5 — QA & handoff to the gym**
- §15 checklist, then a 1-page PT guide for Feu in `LEIA-ME` (with screenshots).

---

## 15. QA checklist
- [ ] Marquee: 0 items (band hidden), 1 item, 3 items, very long item, item with link, expired item, future item, DST boundary dates (last Sunday of March/October).
- [ ] Schedule: today highlight on each weekday (mock date), Sunday behavior, parallel classes in one slot, a class at an unusual time (e.g. 06:15) creates a new row.
- [ ] EN with missing translations falls back to PT without empty elements.
- [ ] Keyboard-only pass through the whole page; screen reader pass (VoiceOver) on marquee, table and day tabs.
- [ ] Reduced motion: no marquee, no rotator, no shader, no smooth scroll.
- [ ] Lighthouse mobile on the deployed test URL meets §10.
- [ ] All links: RegyBox CTA, WhatsApp, email, Maps, Instagram, Facebook, policies, Livro de Reclamações.
- [ ] No requests to figma.com or fonts.googleapis.com at runtime.
- [ ] `noindex` present on the test URL (meta + header).
