/**
 * The one place the deployed origin is written down.
 *
 * Next resolves relative metadata URLs against `metadataBase`, so everything
 * that needs an absolute URL — the Open Graph image, the canonical link, the
 * sitemap — is built from here rather than repeating the host name per file and
 * letting the copies drift.
 *
 * The production host is hardcoded on purpose. Vercel also serves each deploy
 * from a preview URL, but a preview is a copy of this app, not a second address
 * for it, so pointing every copy at the canonical origin is the correct
 * behaviour rather than an oversight.
 */
export const SITE_URL = 'https://draftboard-canvas.vercel.app';

export const SITE_NAME = 'Draftboard';

/**
 * Used for the meta description, the Open Graph tags and the manifest, so the
 * app introduces itself the same way everywhere it is seen.
 *
 * The claim is deliberately narrow — "stored in this browser", not "secure" or
 * "unhackable". It is the part that is actually true and actually verifiable.
 */
export const SITE_DESCRIPTION =
  'A private, offline sketch board. Draw on as many boards as you like — everything is stored in your own browser, and nothing is ever uploaded.';
