import Dexie, { type EntityTable } from 'dexie';

import type { Board } from '@/types/board';

export type ThemePreference = 'light' | 'dark' | 'system';

export type Setting = {
  key: 'theme';
  value: ThemePreference;
};

/**
 * Local IndexedDB database. The only place in the app that knows about Dexie —
 * the `boards` / `settings` modules wrap it so the UI never touches storage
 * directly, and the whole thing can be swapped for another backend without
 * changing components.
 */
export const db = new Dexie('draftboard') as Dexie & {
  boards: EntityTable<Board, 'id'>;
  settings: EntityTable<Setting, 'key'>;
};

db.version(1).stores({
  boards: 'id, title, category, updatedAt',
  settings: 'key',
});

/** Guard for code paths that can run on the server (SSR / prerendering). */
export const isBrowser = () => typeof window !== 'undefined';
