import { defineConfig } from 'drizzle-kit';

// `pnpm drizzle-kit generate` writes SQL migrations to drizzle/ from the schema below.
// Applying them to a real database (Neon) comes with the `db` source; tests apply them to PGlite.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/content/store/postgres/schema.ts',
  out: './drizzle',
});
