import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/lib/site';

/**
 * The board list is crawlable; the boards themselves are not.
 *
 * The board pages are kept out by their own `noindex` tag rather than by a
 * `Disallow` rule here, and the difference matters: a `Disallow` stops a
 * crawler from reading the page, which also stops it from reading the
 * `noindex` — so the URL can still end up indexed from an inbound link, just
 * with no description. Letting the page be fetched and refuse itself is the
 * only reliable way to keep it out.
 *
 * `/_next/` is deliberately absent. That path holds the page's own CSS and
 * JavaScript, and blocking it would hide the site's content from a renderer
 * that needs those files to see anything at all.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
