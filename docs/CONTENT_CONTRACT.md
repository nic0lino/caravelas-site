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
