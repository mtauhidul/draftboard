import type { Metadata } from 'next';

/**
 * A thin server wrapper whose only job is to keep board pages out of search
 * results.
 *
 * The page beneath it is a client component — it has to be, because the board
 * is read out of the visitor's own IndexedDB — and a client component cannot
 * export `metadata`. Putting the tag here is also why `robots.txt` carries no
 * `Disallow` for boards: a disallowed URL is never fetched, so its `noindex` is
 * never read, and the page can still be listed from an inbound link with no
 * description attached. Letting it be fetched and refuse itself is the only
 * version that works.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  /**
   * Cleared rather than left to inherit. A canonical link on a board sends a
   * crawler to the home page as the authoritative copy of a page that is not
   * the home page — a claim worth making about a product page, and simply
   * wrong about an address that holds one person's drawing.
   *
   * Note the difference from the Open Graph tags, which are deliberately left
   * alone: `alternates` is merged key by key, so clearing `canonical` here
   * leaves the rest of the parent's `alternates` intact, whereas a nested
   * object like `openGraph` is replaced wholesale. Setting `openGraph` in this
   * file — even to change one field — dropped `og:image`, `og:type` and
   * `og:site_name` from the built page, and left a card with no picture on it.
   *
   * Inheriting the card is the right outcome anyway. A board link does not
   * need a card of its own; it needs to not look broken when it is pasted
   * somewhere, and the site's card does that.
   */
  alternates: { canonical: null },
};

export default function BoardLayout({ children }: LayoutProps<'/[boardId]'>) {
  return children;
}
