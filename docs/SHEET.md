# Google Sheet — content source (Juanpi)

The gym edits the site's content in a Google Sheet. The site reads it with the
Sheets API (`values.batchGet`, one request for all tabs) when `CONTENT_SOURCE=sheets`.
Code: `src/content/sources/sheets.ts` (fetch) → `src/content/parse/tabs.ts` (tabs → content)
→ `src/content/parse/values.ts` (tolerant cell parsers) → `SiteContent.parse()` (contract).

## Access
- Owner: the site's dedicated Google account (not a personal one; ask Juanpi). The Google Cloud
  project with the API key lives in the same account.
- Sharing: **anyone with the link → viewer** (the API key can only read public-by-link sheets).
  Editors: the gym staff, Juanpi, Nico.
- Env (`.env.local` locally, Vercel → Settings → Environment Variables in production):

| Var | Value |
|---|---|
| `CONTENT_SOURCE` | `sheets` (`fixture` = the JSON in the repo) |
| `SHEETS_ID` | the part of the sheet URL between `/d/` and `/edit` |
| `SHEETS_API_KEY` | API key restricted to the Google Sheets API. Secret: never commit it |

## Tabs and columns
Header row = first non-empty row. Headers and dropdown values are matched ignoring case,
accents, spaces and hyphens (`Destaque PT` = `destaque_pt`, `Sábado` = `sabado`).
Unknown columns are ignored. Translatable fields have one column per language:
`_pt` (required), `_en`, `_es`, `_fr`, `_de`, `_ru`, `_uk` (optional; fallback lang → en → pt).

| Tab | Columns |
|---|---|
| `config` | `chave` \| `pt` \| `en` \| `es` \| `fr` \| `de` \| `ru` \| `uk` — key/value; non-translatable values go in `pt` (a `valor` column also works) |
| `marquesina` | `ativo` \| `destaque_*` \| `texto_*` \| `link` \| `inicio` \| `fim` \| `ordem` |
| `horario` | `ativo` \| `dia` \| `hora` \| `tipo` \| `aula_*` \| `coach` \| `nota_*` — **one row per class** |
| `precos` | `ativo` \| `plano_*` \| `preco` \| `destaque` \| `ordem` |
| `equipa` | `ativo` \| `nome` \| `bio_*` \| `instagram` \| `foto_lado` \| `ordem` |
| `destaques` | `ativo` \| `icone` \| `titulo_*` \| `texto_*` \| `ordem` |
| `LEIA-ME` | instructions for the gym; not read by the site |

`config` keys — required: `hero_titulo`, `cta_texto`, `cta_badge`, `cta_link`, `morada_rua`,
`morada_cp`, `morada_cidade`, `maps_link`, `horario_seg_sex`, `horario_sab`, `horario_dom`
(the three hours keys must exist; an empty value = closed). Optional: `precos_atualizados`,
`precos_promo`, `precos_promo_link`, `email` (several, separated by `,` or `;`), `whatsapp`,
`instagram`, `facebook`, `equipa_foto`, `politica_privacidade_link`, `politica_cookies_link`,
`crossfit_afiliado_link`.

Differences from the SPEC §4.3 proposal: `config` has all 7 language columns; `equipa` has
`instagram` (handle `@x` or URL), `foto_lado` (esquerda/direita) and `ordem` (contract v3/v5).

## Row rules
- `ativo`: unchecked/FALSE hides the row (use it for the grey example row); blank = active.
- `ordem`: blank = the row's position in the sheet.
- Accepted formats — times `7h`, `07h00`, `7.30`, `19:30`, `7:30 PM`; hours `07:00-21:00`,
  `7h às 21h`; dates `dd/mm/yyyy`, `d/m/yy`, `yyyy-mm-dd` (day first); prices `€20`, `20,00`,
  `20 €`; booleans TRUE/FALSE, sim/não, 1/0; WhatsApp `+351 912 849 143` or `912 849 143`.
- IDs are a hash of each row's content (never the row number), so reordering rows is safe.
  Two identical classes → the second is dropped with a warning.

## When something is wrong
| Problem | Result |
|---|---|
| Bad optional cell (link, email, instagram…) | warning; that field is left out |
| Bad required cell (class time, price…) | warning; **the row is skipped** |
| Missing tab, missing/bad required `config` key, no valid class or price, API error | **throws**: ISR keeps serving the last good page |

Warnings (in Portuguese, e.g. `horario linha 14: hora inválida '7.3O' (linha ignorada)`) are
listed on **`/status`** (noindex, unlinked), with the source, fetch time and counts per section.

API errors seen in the `pnpm dev` / Vercel logs:
- `HTTP 403 — The caller does not have permission`: the sheet isn't shared by link, or the key lacks the Sheets API.
- `HTTP 400 — API key not valid`: wrong key.
- `HTTP 400 — Unable to parse range: precos`: a tab was renamed or deleted.

## Freshness
Pages revalidate every 300 s (ISR). The "Site → Publicar alterações" menu (Apps Script, to do)
will call `POST /api/revalidate` with `x-revalidate-secret` for near-instant updates.
In `pnpm dev` the sheet is read on every reload.

## Seeding
The sheet was created by importing one CSV per tab generated from the fixture
(`File → Import → Upload → Insert new sheet(s)`, with "Convert text to numbers, dates and
formulas" **unchecked**, otherwise `1200-607` becomes a date and `+351…` a formula).
A round-trip check (CSV → `parseSheet` → `SiteContent`) matched the fixture exactly.
