'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import type { ThemePreference } from '@/lib/db/database';
import { getThemePreference, setThemePreference } from '@/lib/db/settings';

export type ResolvedTheme = 'light' | 'dark';

type ThemeContextValue = {
  /** What the user asked for, or `null` until the stored value has loaded. */
  preference: ThemePreference | null;
  /** What that resolves to right now. */
  resolved: ResolvedTheme;
  setPreference: (value: ThemePreference) => void;
  /** Adopts a theme chosen in Excalidraw, treating it as an explicit choice. */
  syncFromCanvas: (value: ResolvedTheme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Where the shell's theme preference lives.
 *
 * localStorage is the source of truth for the *shell*: it is the only store a
 * browser lets us read synchronously, which is what a pre-paint script needs to
 * avoid a flash of the wrong theme. IndexedDB mirrors it — the preference is
 * real app data, so it belongs there too — but a browser that denies
 * localStorage only loses the no-flash optimisation; the IndexedDB copy still
 * applies the right theme a moment later.
 */
const CACHE_KEY = 'draftboard:theme';

/**
 * Applies the theme before first paint.
 *
 * Excalidraw has no theme persistence of its own and starts light on every
 * load, so without this the shell would paint light and then flip. Dark is the
 * default: a first visit, or a visit from before this preference existed,
 * starts dark. An explicit light choice is the only thing that overrides it.
 */
export const themeBootstrapScript = `(function(){try{var v=localStorage.getItem('${CACHE_KEY}');var d=v!=='light';document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

function systemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/**
 * Reads the cached theme synchronously.
 *
 * Used to seed React state from the very same value the bootstrap script just
 * painted, so the first render agrees with the DOM instead of briefly
 * contradicting it (and correcting itself a tick later).
 */
function readCachedTheme(): ResolvedTheme | null {
  if (typeof window === 'undefined') return null;

  try {
    const value = localStorage.getItem(CACHE_KEY);
    return value === 'dark' || value === 'light' ? value : null;
  } catch {
    return null;
  }
}

function applyTheme(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference | null>(
    null
  );
  // Seeded from the cache the bootstrap script already applied, falling back to
  // the same default it uses, so there is no theme change on the first commit.
  const [resolved, setResolved] = useState<ResolvedTheme>(
    () => readCachedTheme() ?? 'dark'
  );

  // `resolved` is read inside a callback that should not be rebuilt every time
  // the theme changes, so a ref carries the current value to it.
  const resolvedRef = useRef(resolved);
  useEffect(() => {
    resolvedRef.current = resolved;
  }, [resolved]);

  useEffect(() => {
    let active = true;

    getThemePreference()
      .then(stored => {
        if (!active) return;
        setPreferenceState(stored);
        // An explicit choice made in this tab (or one restored from the cache)
        // outranks the IndexedDB row, which may predate it by a few
        // milliseconds. `system` still has to be resolved here because the
        // cache only ever holds `light` or `dark`.
        if (stored !== 'system') {
          setResolved(stored);
        } else if (readCachedTheme() === null) {
          setResolved(systemTheme());
        }
      })
      .catch(error => {
        console.error('Failed to read theme preference', error);
      });

    return () => {
      active = false;
    };
  }, []);

  // Relevant only while the preference is "system". Once the user picks an
  // explicit theme, the canvas owns it and the OS setting is ignored.
  useEffect(() => {
    if (preference !== 'system') return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setResolved(media.matches ? 'dark' : 'light');

    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [preference]);

  useEffect(() => {
    applyTheme(resolved);
    try {
      localStorage.setItem(CACHE_KEY, resolved);
    } catch {
      // Storage can be unavailable (private mode). The theme still applies; it
      // just will not survive a reload without a flash.
    }
  }, [resolved]);

  const setPreference = useCallback((value: ThemePreference) => {
    setPreferenceState(value);
    setResolved(value === 'system' ? systemTheme() : value);

    setThemePreference(value).catch(error => {
      console.error('Failed to save theme preference', error);
    });
  }, []);

  /**
   * Called when the canvas reports its theme.
   *
   * Excalidraw reports only `light` or `dark`, so a `system` preference cannot
   * survive a round trip through it. The value is treated as the source of
   * truth only when it actually differs, so a canvas that is merely agreeing
   * with the shell does not pin the preference to one value.
   */
  const syncFromCanvas = useCallback((value: ResolvedTheme) => {
    // The guard sits outside the updater on purpose: React may call a state
    // updater twice in development, and the write below must not happen twice.
    if (resolvedRef.current === value) return;

    setPreferenceState(value);
    setResolved(value);
    setThemePreference(value).catch(error => {
      console.error('Failed to save theme preference', error);
    });
  }, []);

  return (
    <ThemeContext.Provider
      value={{ preference, resolved, setPreference, syncFromCanvas }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used within a ThemeProvider');
  return value;
}
