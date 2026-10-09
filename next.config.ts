import type { NextConfig } from 'next';

const basePath = process.env.BASE_PATH || '';
const indexable = process.env.NEXT_PUBLIC_INDEXABLE === 'true';

const config: NextConfig = {
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  poweredByHeader: false,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  async headers() {
    if (indexable) return [];
    return [{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }];
  },
};

export default config;
