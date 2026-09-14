import { db, isBrowser, type ThemePreference } from '@/lib/db/database';

const THEME_KEY = 'theme';

/**
 * The stored theme preference.
 *
 * Dark is the default. Excalidraw itself starts light on every load, but this
 * app opens on the boards list where a bright canvas-sized white page is the
 * harsher of the two, so dark is what a first visit gets. A stored `light`
 * (i.e. the user pressed the toggle) is the only thing that changes it —
 * `system` remains a supported value for callers that want to opt into it.
 */
export async function getThemePreference(): Promise<ThemePreference> {
  if (!isBrowser()) return 'dark';
  const setting = await db.settings.get(THEME_KEY);
  return setting?.value ?? 'dark';
}

export async function setThemePreference(
  value: ThemePreference
): Promise<void> {
  await db.settings.put({ key: THEME_KEY, value });
}
