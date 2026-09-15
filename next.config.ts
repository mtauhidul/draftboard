import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /**
   * `src/app/opengraph-image.tsx` reads `src/app/icon.svg` at build time so the
   * preview card draws the same file the favicon does. The font files it reads
   * out of `public/` are traced automatically — that directory ships whole —
   * but nothing in the app directory is, because tracing follows imports and
   * this is a path assembled at runtime rather than one the graph can see.
   *
   * The key is the route path, and the value is a glob from the project root.
   */
  outputFileTracingIncludes: {
    '/opengraph-image': ['src/app/icon.svg'],
  },
};

export default nextConfig;
