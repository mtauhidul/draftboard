import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import {
  ThemeProvider,
  themeBootstrapScript,
} from '@/components/theme/ThemeProvider';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';

import './globals.css';

/**
 * The app is set in Assistant (see `globals.css`), which is Excalidraw's own UI
 * typeface, so Geist is only kept as the `font-mono` fallback. Both are
 * `preload: false` because neither is used for first paint — preloading them
 * only competes with the Assistant files the page actually needs.
 */
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  preload: false,
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  preload: false,
});

export const metadata: Metadata = {
  /**
   * Everything below that names a URL — the canonical link, the Open Graph
   * image, the Twitter card — is resolved against this, so the deployed origin
   * is written down exactly once, in `src/lib/site.ts`.
   */
  metadataBase: new URL(SITE_URL),
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  /**
   * Stated rather than left to the default, which is already `index, follow`:
   * a tag that says what is meant is one less thing to re-derive. The boards
   * themselves opt out of this in their own layout, which is also why the
   * `robots.txt` file carries no `Disallow` — see the note there.
   */
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: { canonical: '/' },
  /**
   * `url` has to be given. The image, canonical and Twitter tags all pick up an
   * absolute address on their own, but `og:url` does not: Next only emits it
   * from this field, and omitting it drops the tag entirely rather than
   * falling back to `metadataBase`. Left unset, the first measurement of the
   * built page showed every other tag present and no `og:url` at all.
   */
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — a private, offline sketch board`,
    description: SITE_DESCRIPTION,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — a private, offline sketch board`,
    description: SITE_DESCRIPTION,
  },
  // Set explicitly so iOS uses the dark canvas it is about to show, rather than
  // defaulting the status bar to light on a dark board.
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent' },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // The bootstrap script sets `class` and `style` on <html> before React
      // hydrates. Suppressing the mismatch warning is the standard trade for
      // applying the theme without a flash of the wrong colours.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className="h-full">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
