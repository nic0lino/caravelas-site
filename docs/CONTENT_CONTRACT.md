# Content contract

The UI only calls `getSiteContent()` (`src/content/index.ts`) and receives a validated `SiteContent`.
The schema is `src/content/schema.ts` (zod) — it is the source of truth; selectors live in `src/content/select.ts`.
Sheet layout, tolerant parsing rules and failure behaviour: `docs/SPEC.md` §4.3–4.5.

Localized fields are `{ pt, en? }`; resolve with `localize(field, lang)` (falls back to PT).
Contract changes: separate `contract: …` PR touching schema.ts + fixture + this changelog, approved by the other person.

## Changelog
- v1 (2026-10-09): initial schema from SPEC §4.2.
- v2 (2026-10-09): `Localized` gains optional `es`, `fr`, `de`, `ru`, `uk` (PT stays required). Fallback chain is `lang → en → pt` (`localize()` in select.ts). Fixture translated except coach bios (fallback). **Juanpi:** the sheet needs matching `_es/_fr/_de/_ru/_uk` columns on every tab that has `_pt/_en`. Made directly by Nico's session at the owner's request; needs Juanpi's review.
- `config.heroTitle` is intentionally never translated: the UI always renders `heroTitle.pt` ("Box de bem-estar").
- v3 (2026-10-09): `Coach.instagram` (optional URL) — shows an Instagram icon linking to the coach's profile next to the name. **Juanpi:** add an `instagram` column to the `equipa` tab. Fixture uses the gym's account as a placeholder for both coaches.
- v4 (2026-10-09): `config.privacyHref` and `config.cookiesHref` (optional URLs) for the footer/cookie-notice policy links. Sheet `config` keys: `politica_privacidade_link`, `politica_cookies_link`. Fixture points at the existing Wix pages (they disappear with the Wix site: SPEC §3.5 step 4).
- v5 (2026-10-09): `Coach.photoSide` (`left`|`right`, optional) says which person in the team photo the coach is; the Instagram tag floats near that face. Without it, the order decides (1st = left, 2nd = right). Sheet column `equipa.foto_lado` (esquerda/direita). The tag positions themselves live in `PhotoTags.tsx` and match the cut-out `team-people.webp`: re-tune them if the image changes. `config.teamPhoto` now means that cut-out (transparent PNG/WebP of the coaches); the gym photo behind it is a static asset (`team-bg.jpg`). `Coach.instagram` now renders as that tag (no icon next to the name any more).
- v6 (2026-10-09): `config.email` (string) → `config.emails` (string[]). The footer's Email button opens one message addressed to all of them. Sheet `config` key `email`: several addresses separated by commas/semicolons. Official addresses: feu.ferreira@caravelas.fit, ana.lima@caravelas.fit; WhatsApp +351 912 849 143 (confirmed by the gym).
- v7 (2026-10-09): `config.affiliateHref` (the gym's page on crossfit.com, linked from the CrossFit Affiliates badge; the Journal badge links to journal.crossfit.com). `privacyHref`/`cookiesHref` are now optional *overrides*: the legal pages live in this site (`/politica-de-privacidade`, `/politica-de-cookies`, literal copy of the old Wix pages in `src/content/legal/`). Sheet keys: `crossfit_afiliado_link`.
- v8 (2026-10-09): no schema change. Coach bios (`equipa` tab, `bio_*`) accept two inline marks, `**bold**` and `*italic*`; the first paragraph is always bold. Fixture bios shortened to the owner's new copy and translated into all 7 languages (the v2 note about bios falling back no longer applies). **Juanpi:** pass the asterisks through untouched.
- v9 (2026-11-11, **draft — needs Nico's review**): admin panel contract (ADMIN.md §11.2). `meta.source` gains `'db'` (no loader yet: `getSiteContent()` still throws for it). New `EditableContent` (= `SiteContent` without `meta`) and `VersionInfo`. New `ContentStore` interface in `src/content/store/` with an in-memory reference implementation and the publish guards. Nothing in the public site changes. See "Admin store" below.

## Admin store (v9)
The panel never touches storage directly; it talks to a `ContentStore` (`src/content/store/types.ts`). Storage (memory today, Postgres later, or anything else) is swapped behind it without touching the UI.

- **One store = one site.** Multi-gym is a factory that returns the store for the signed-in user's site; the content has no gym id.
- **Draft vs versions.** There is one open draft per site, edited many times (`revision` 1, 2, 3…). Publishing turns it into an immutable version (`v1`, `v2`…), archives the previous one and clears the draft. `getDraft()` with no saved draft returns a copy of the live content with `revision: 0`.
- **Two editors.** `saveDraft(content, author, expectedRevision)`: pass the revision you loaded; if someone saved in between, it throws `DraftConflictError` with who and when, instead of overwriting.
- **Validation.** Every write is parsed with `EditableContent` (zod) → `InvalidContentError` with dotted paths (`schedule.0.time`) the panel can point at. Publishing also runs `checkContent()` (`store/guards.ts`) → `PublishBlockedError`. Errors: empty schedule, two classes at the same day+time, kind `other` without a name, no price plans, price ≤ 0, opening hours that close before they open, a notice that ends before it starts. Warnings (never blocking): a notice that already expired. Messages are in Portuguese.
- **Undo.** `restore(versionId, …)` copies an old version into the draft; it is published like any other change.
- The tests in `store/memory.test.ts` describe the behaviour every implementation must keep.
- v10 (2026-11-11): two optional flags, both absent = current behaviour (no fixture or sheet change needed). `ScheduleSlot.enabled` (`false` keeps the slot in the data/panel but renders an empty cell; `buildScheduleGrid` still keeps its time row, and a disabled Sunday slot does not add the Sunday column; `slotsForDay` skips it). `SiteConfig.marqueeEnabled` (`false` hides the marquee while its notices stay stored; the UI checks `!== false`). Sheets source: no column yet, so sheet content never sets them. Note: `checkContent()` still treats two slots at the same day+time as a clash even if one is disabled.
