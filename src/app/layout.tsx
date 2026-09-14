import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import {
  ThemeProvider,
  themeBootstrapScript,
} from '@/components/theme/ThemeProvider';

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
  title: 'Draftboard',
  description: 'Your boards, stored locally.',
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
