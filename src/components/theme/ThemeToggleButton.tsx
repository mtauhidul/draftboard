'use client';

import { Moon, Sun } from 'lucide-react';

import { useTheme } from '@/components/theme/ThemeProvider';

/**
 * Flips the shell between light and dark.
 *
 * Like Excalidraw's own canvas toggle, the icon shows the theme the button
 * switches *to* rather than the one in effect.
 *
 * Both icons are always rendered and CSS decides which one is visible. That is
 * deliberate: the server cannot know the stored preference, so anything that
 * branches on the theme during render produces markup the client cannot agree
 * with, and React discards and rebuilds the tree. Letting `.dark` pick the icon
 * keeps both sides identical.
 *
 * The metrics are Excalidraw's icon-button metrics — a square
 * `--default-button-size` target with `--border-radius-md` corners that
 * highlights with `--button-hover-bg` — so it sits comfortably in a toolbar
 * island beside the other controls.
 */
export function ThemeToggleButton() {
  const { resolved, setPreference } = useTheme();

  return (
    <button
      type="button"
      onClick={() => setPreference(resolved === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle light and dark theme"
      title="Toggle light and dark theme"
      className="flex size-9 shrink-0 items-center justify-center rounded-md text-foreground transition-colors hover:bg-[var(--button-hover-bg)] focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
    >
      <Moon className="size-4 dark:hidden" aria-hidden />
      <Sun className="hidden size-4 dark:block" aria-hidden />
    </button>
  );
}
