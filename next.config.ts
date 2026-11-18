import type { NextConfig } from 'next';

const basePath = process.env.BASE_PATH || '';
const indexable = process.env.NEXT_PUBLIC_INDEXABLE === 'true';

const config: NextConfig = {
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  poweredByHeader: false,
  // PGlite (local DATABASE_URL=pglite:…) loads its own WASM files at runtime: keep it out of the server bundle.
  serverExternalPackages: ['@electric-sql/pglite'],
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  async headers() {
    if (indexable) return [];
    return [{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }];
  },
};

export default config;
