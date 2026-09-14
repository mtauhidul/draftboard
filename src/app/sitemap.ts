import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/lib/site';

/**
 * Only the board list is listed.
 *
 * A board lives at `/{uuid}` and exists purely in the visitor's own browser, so
 * there is nothing there for a crawler to read — a URL in a sitemap that has no
 * content behind it is a soft 404, and inviting a crawler to one is worse than
 * staying quiet about it.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
