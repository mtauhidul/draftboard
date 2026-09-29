import { db, isBrowser } from '@/lib/db/database';
import { emptyScene, type Board, type BoardScene } from '@/types/board';

/**
 * Bumped only when the shape of the file changes in a way an older importer
 * could not read. The importer is expected to reject anything it does not know.
 */
export const BACKUP_VERSION = 1;

export const BACKUP_FILENAME = 'draftboard-backup.json';

export type Backup = {
  version: number;
  exportedAt: string;
  boards: Board[];
};

/** Thrown for anything wrong with a file the user picked, with a message meant
 * to be shown as-is next to the Import control. */
export class BackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupError';
  }
}

export type ImportSummary = {
  /** Boards written to IndexedDB. */
  imported: number;
  /** Boards already present under the same id, left untouched. */
  skipped: number;
};

/**
 * Reads everything the app stores about the user's work.
 *
 * Settings are deliberately excluded: a backup exists to preserve boards, and
 * the theme preference is a display choice that should not follow a file around
 * between devices.
 */
export async function createBackup(): Promise<Backup> {
  if (!isBrowser())
    throw new Error('Backups can only be created in a browser.');

  const boards = await db.boards.toArray();

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    // `scene` is defaulted so a row written by an older build still exports a
    // readable file rather than one with a missing key.
    boards: boards.map(board => ({
      ...board,
      scene: board.scene ?? emptyScene(),
    })),
  };
}

export function serializeBackup(backup: Backup): string {
  return JSON.stringify(backup, null, 2);
}

/** Hands the file to the browser without leaving the page. */
export function downloadBackup(backup: Backup): void {
  const blob = new Blob([serializeBackup(backup)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = BACKUP_FILENAME;
  document.body.append(link);
  link.click();
  link.remove();

  // Revoking immediately can cancel the download in some browsers, so let the
  // navigation that starts it settle first.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Convenience for the UI: build the file and hand it over in one step. */
export async function exportAllData(): Promise<Backup> {
  const backup = await createBackup();
  downloadBackup(backup);
  return backup;
}

/**
 * Turns the text of a backup file into a `Backup`, or throws a `BackupError`
 * with something the user can act on.
 *
 * Every field is rebuilt rather than trusted: the file has been outside the
 * app's control since it was downloaded, and a row that reaches IndexedDB
 * malformed is a board that renders as a crash. Known fields are coerced to
 * their expected shape, unknown ones are dropped, and only the structure that
 * cannot be guessed at — the top level — is rejected outright.
 */
export function parseBackup(text: string): Backup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError('That file is not valid JSON.');
  }

  if (!isRecord(raw))
    throw new BackupError('That file does not look like a Draftboard backup.');

  if (typeof raw.version !== 'number')
    throw new BackupError('That backup is missing its version number.');

  if (raw.version > BACKUP_VERSION)
    throw new BackupError(
      'That backup was made by a newer version of Draftboard.'
    );

  if (!Array.isArray(raw.boards))
    throw new BackupError('That backup does not contain a list of boards.');

  return {
    version: raw.version,
    exportedAt:
      typeof raw.exportedAt === 'string'
        ? raw.exportedAt
        : new Date().toISOString(),
    boards: raw.boards.map(parseBoard),
  };
}

/**
 * Writes a parsed backup into IndexedDB.
 *
 * Ids are kept as they were exported, so importing the same file twice is a
 * no-op instead of a pile of duplicates: any board whose id is already stored
 * is left alone rather than overwritten, since local edits are the more recent
 * copy and silently replacing them is the one way this could lose work.
 */
export async function importBackup(backup: Backup): Promise<ImportSummary> {
  if (!isBrowser()) throw new BackupError('Importing needs a browser tab.');

  const existing = new Set<string>(
    await db.boards.toCollection().primaryKeys()
  );

  // Also guards against a file that lists the same id twice, which `bulkAdd`
  // would reject.
  const incoming = new Map<string, Board>();
  for (const board of backup.boards) {
    if (existing.has(board.id) || incoming.has(board.id)) continue;
    incoming.set(board.id, board);
  }

  const boards = [...incoming.values()];
  if (boards.length > 0) await db.boards.bulkAdd(boards);

  return {
    imported: boards.length,
    skipped: backup.boards.length - boards.length,
  };
}

/** Reads a picked file and restores it in one step. */
export async function importBackupFile(file: File): Promise<ImportSummary> {
  return importBackup(parseBackup(await file.text()));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseBoard(value: unknown, index: number): Board {
  if (!isRecord(value))
    throw new BackupError(
      `Board ${index + 1} in that backup is not an object.`
    );

  const createdAt = toDate(value.createdAt);

  return {
    id:
      typeof value.id === 'string' && value.id.trim()
        ? value.id
        : crypto.randomUUID(),
    title:
      typeof value.title === 'string' && value.title.trim()
        ? value.title.trim()
        : 'Untitled Board',
    description: optionalText(value.description),
    category: optionalText(value.category),
    createdAt,
    updatedAt: toDate(value.updatedAt, createdAt),
    scene: parseScene(value.scene),
  };
}

function parseScene(value: unknown): BoardScene {
  if (!isRecord(value)) return emptyScene();

  // The elements are passed through untouched: they are Excalidraw's own
  // objects and only it can tell a stale one from an invalid one, so a board
  // opened with a bad element degrades the same way a board drawn with an older
  // Excalidraw does — per element, not per board.
  const elements = Array.isArray(value.elements)
    ? (value.elements as BoardScene['elements'])
    : [];
  const files = isRecord(value.files)
    ? (value.files as BoardScene['files'])
    : {};

  // Only the backdrop is restored, mirroring what export kept: selection, tool
  // and theme are session state and belong to whoever opens the board next.
  const appState =
    isRecord(value.appState) &&
    typeof value.appState.viewBackgroundColor === 'string'
      ? { viewBackgroundColor: value.appState.viewBackgroundColor }
      : undefined;

  return { elements, files, appState };
}

function optionalText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/**
 * Dates have already been through `JSON.stringify`, so they arrive as strings;
 * accepting a number as well costs nothing and makes a hand-edited file work.
 */
function toDate(value: unknown, fallback = new Date()): Date {
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }

  return fallback;
}
