# CrossFit Caravelas site — instructions for every Claude Code session

Spec: `docs/SPEC.md` (wins over Figma; deviations are in §12). Contract: `docs/CONTENT_CONTRACT.md`. State: `docs/HANDOFF.md`.

## Ownership
- **Nico (UI):** `src/components/**`, `src/app/**` pages/layout, `src/i18n/**`, `src/styles/**`, `public/assets/**`.
- **Juanpi (data):** `src/content/sources/sheets.ts`, `src/content/parse/**`, `src/app/api/revalidate/**`, `apps-script/**`, the Google Sheet.
- **Shared (contract):** `src/content/schema.ts`, `src/content/select.ts`, fixtures, `docs/CONTENT_CONTRACT.md`. Changes only via `contract:` PRs.

## Rules
1. Read CLAUDE.md, docs/SPEC.md, docs/CONTENT_CONTRACT.md, docs/HANDOFF.md first.
2. Stay inside your owner's area; need something from the other area → write it under "Requests" in HANDOFF.md.
3. Never change `schema.ts` as a side effect.
4. Branches `ui/<topic>`, `data/<topic>`, `contract/<topic>`; `main` protected; merge via PR.
5. Conventional commits, small PRs.
6. Before ending a session, update `docs/HANDOFF.md`.
7. `pnpm test` and `pnpm build` must pass before a PR (`corepack pnpm …` if pnpm isn't installed).

## Commands
`pnpm dev` · `pnpm test` · `pnpm typecheck` · `pnpm build` (use `BASE_PATH=/testsite/caravelas` to test the subpath build).

## Design rules (owner decisions)
- **Every line on the site is 1px** (borders, rules, separators, outlines) — no 0.5/0.62/0.65px variants even where Figma has them. Hierarchy comes from colour, not weight.
- Card groups have consistent rounded corners (16px) top and bottom, on mobile too.
- Follow Figma values for sizes/colours; deviations only when the owner asks.
