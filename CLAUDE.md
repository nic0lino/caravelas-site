# CrossFit Caravelas site — instructions for every Claude Code session

Spec: `docs/SPEC.md` (wins over Figma; deviations are in §12). Contract: `docs/CONTENT_CONTRACT.md`. State: `docs/HANDOFF.md`.

## Ownership
- **Nico (UI):** `src/components/**` (incl. `admin/**` and `ui/**`), `src/app/**` pages/layout (incl. `(pt)/admin/**`), `src/i18n/**`, `src/styles/**`, `public/assets/**`.
- **Juanpi (data):** `src/content/sources/**` (sheets, db), `src/content/parse/**`, `src/content/import/**`, `src/content/store/**` implementations, `drizzle/**` + `drizzle.config.ts`, `scripts/**` that touch data, `src/app/api/revalidate/**`, `apps-script/**`, the Google Sheet, the database.
- **Shared (contract):** `src/content/schema.ts`, `src/content/select.ts`, `src/content/store/types.ts` (the `ContentStore` interface), fixtures, `docs/CONTENT_CONTRACT.md`. Changes only via `contract:` PRs.
- **Shared (security, both review):** admin login and sessions (`src/lib/admin-auth.ts`, `src/app/api/admin/**`), `.github/**`, `package.json` + `pnpm-lock.yaml` (say in the PR which dependency you add and why).
- **One storage layer:** the admin panel talks only to `ContentStore`; it never queries the database directly.

## Rules
1. Read CLAUDE.md, docs/SPEC.md, docs/CONTENT_CONTRACT.md, docs/HANDOFF.md first.
2. Stay inside your owner's area; need something from the other area → write it under "Requests" in HANDOFF.md.
3. Never change `schema.ts` as a side effect.
4. Branches `ui/<topic>`, `data/<topic>`, `contract/<topic>`, `chore/<topic>`; `main` protected; merge via PR.
5. Conventional commits, small PRs.
6. Before ending a session, update `docs/HANDOFF.md`.
7. `pnpm typecheck`, `pnpm test` and `pnpm build` must pass before a PR (`corepack pnpm …` if pnpm isn't installed). CI (`.github/workflows/ci.yml`) runs the same on every PR; don't merge a red PR.

## Commands
`pnpm dev` · `pnpm test` · `pnpm typecheck` · `pnpm build` (use `BASE_PATH=/testsite/caravelas` to test the subpath build).

## Design rules (owner decisions)
- **Lines are 1px everywhere, except the schedule table, whose rules and dividers are 0.5px hairlines** (the pricing band right under it stays 1px). No other weights (0.62/0.65...) even where Figma has them. Hierarchy comes from colour: row rules white, column dividers lime `#95be35`.
- **Schedule table interaction is subtle:** today's column header gets a soft lime tint (no strong yellow); hovering a class lightens its cell (200ms) and its day label goes Regular → Black.
- Card groups have consistent rounded corners (16px) top and bottom, on mobile too.
- Follow Figma values for sizes/colours; deviations only when the owner asks.

- **Type scale** lives in `src/app/globals.css` (`@theme`): 12/14/16/20/32 + the fluid hero `display`; no `text-[Npx]`. The only exception is `text-2xs` (10px), reserved for the cookie bar. The schedule table is the priority for legibility (class names 14px, coach line 12px, times 20px).
