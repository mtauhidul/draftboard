import { db, isBrowser } from '@/lib/db/database';
import { emptyScene, type Board } from '@/types/board';

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
