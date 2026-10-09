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
