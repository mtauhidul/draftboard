import type { MetadataRoute } from 'next';

import { SITE_DESCRIPTION } from '@/lib/site';

/**
 * Draftboard installs like a native app: open it from your dock or home screen
 * and it runs in its own window, with no browser chrome around the canvas.
 *
 * There is deliberately no service worker behind this. Draftboard works
 * entirely offline already — every board lives in the browser's own database,
 * so there is nothing to fetch and nothing to cache. A service worker would
 * only add a second copy of the app to keep in sync, and one more thing to go
 * stale, for no gain.
 *
 * `theme_color` matches the dark canvas, which is the default theme, so the
 * window frame lines up with the board it is showing.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Draftboard',
    short_name: 'Draftboard',
    description: SITE_DESCRIPTION,
    /**
     * `id` pins the installed app to its origin rather than to `start_url`, so
     * a future change to the start URL updates the existing installation
     * instead of being read as a second, separate app.
     */
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#121212',
    theme_color: '#121212',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/icon.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };
}
