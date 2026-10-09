# Handoff

## State (2026-10-09)
Phases 0–3 first pass done with fixture content; Phase 4 (Sheets) is Juanpi's.
- `pnpm typecheck`, `pnpm test` (10 selector tests) and `pnpm build` pass, also with `BASE_PATH=/testsite/caravelas` (assets, hreflang, noindex meta + header verified in the build output).
- Hero: poster → lazy WebGL2 zigzag refraction on `public/video/hero.{webm,mp4}` (≈2 MB each, 960×540, 24 fps), with green tint overlays. Falls back to the poster on no WebGL2 / reduced motion / saveData / context lost. Pauses off-screen and on hidden tab. Shader params are in `src/components/Hero/refraction.ts` (tuned by eye against Figma `1:10`, not pixel-matched).
- Marquee, feature rotator (4 real features from Figma), schedule (table + day tabs, "today" in Europe/Lisbon), price band with squiggle, Capitães, footer, mobile menu, PT `/` + EN `/en`, JSON-LD, OG image, `/status`, `/api/revalidate`.
- Assets from Figma in `public/assets/` (logo, feature icons, team photo, map, CrossFit logos, squiggles). Raw downloads and reference screenshots are in `source/` (git-ignored).
- Fixture content mirrors the Figma desktop frame. Placeholders: RegyBox CTA link, WhatsApp, email, Instagram/Facebook URLs, footer opening hours, JSON-LD geo.

## Update — fidelity pass + languages (2026-10-09)
- Layout re-done from Figma `get_design_context` per section (colors and sizes are the Figma values; text sizes follow Figma, e.g. cell names 12px, coach line 8px, bios 12px — deliberate, the user asked to follow Figma over the legibility deviations in SPEC §12.1). Geometry measured at 1728px matches Figma: header 147, hero 667, column 1000, table 143/32/43, price items at 303/485/683/881, team 502 with the 931px photo at x=864, map 374×301.
- Languages: PT (`/`), EN, ES, FR, DE, RU, UK (`/en`, `/es`, `/fr`, `/de`, `/ru`, `/uk` via `src/app/(intl)/[lang]`). Language menu is a dropdown with inline SVG flags (replaces the `PT · EN` toggle, SPEC D5). UI strings in `src/i18n/*.ts` (machine-written translations: ask native speakers to review). Cyrillic uses Source Sans 3 as a per-glyph fallback (Lato has none).
- Hero title is never translated. Map: real Google Maps iframe (lazy), loaded as soon as the visitor accepts the cookie notice (the only third-party cookies on the site; choice in localStorage, reopenable from the footer; until then a placeholder with an "open in Google Maps" link). **Before launch:** write the real Cookie/Privacy policy pages the footer links to.
- Inter Bold is used for the schedule section title (as in Figma).

- Policies: footer + cookie notice link to the existing Wix policy pages (`config.privacyHref/cookiesHref`). Proposed Google Maps addendum + date + controller data for the gym to validate: `docs/COOKIES_ADDENDUM.md`. Fixture email/WhatsApp now come from the old site's policy pages (to confirm).

## Next steps
- Compare against Figma at 1728 / 440 widths (only checked by eye at 1200, 599 and 375); Playwright smoke test; Lighthouse on the deployed URL (not run).
- Hero: separate portrait video crop for mobile if needed; the source video is a split-screen of two clips, so check the crop on phones. Poster is a plain frame, not a pre-rendered shader frame.
- Marquee: verify no jump after font load / resize on a real device; reduced-motion CSS is untested.
- Privacy / Cookies pages (footer links are `#`) and Livro de Reclamações logo (text link for now).
- Deploy: Vercel project + rewrite in nicolino.zip (Nico, separate PR).

## Open questions
- Real RegyBox link, WhatsApp, email, social URLs, opening hours; 3×/sem price (desktop €70 vs mobile).
- Museo Sans licence (D4). The 4th feature reuses the ship icon.
- Coach copy/bios are taken from the Figma frame; confirm they are final.

## Requests
- Juanpi: implement `src/content/sources/sheets.ts` (+ parsers, harden `/api/revalidate`); set `CONTENT_SOURCE=sheets`.
