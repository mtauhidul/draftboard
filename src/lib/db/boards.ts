import { db, isBrowser } from '@/lib/db/database';
import { emptyScene, type Board, type BoardScene } from '@/types/board';

export function createBoard(input?: {
  id?: string;
  title?: string;
  description?: string;
  category?: string;
}): Board {
  const now = new Date();

  return {
    id: input?.id ?? crypto.randomUUID(),
    title: input?.title?.trim() || 'Untitled Board',
    description: input?.description?.trim() || undefined,
    category: input?.category?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
    scene: emptyScene(),
  };
}

export async function listBoards(): Promise<Board[]> {
  if (!isBrowser()) return [];
  const boards = await db.boards.toArray();
  return boards.map(normalizeBoard).sort(byRecentlyUpdated);
}

export async function getBoard(id: string): Promise<Board | undefined> {
  if (!isBrowser()) return undefined;
  const board = await db.boards.get(id);
  return board ? normalizeBoard(board) : undefined;
}

export async function createNewBoard(input?: {
  title?: string;
  description?: string;
  category?: string;
}): Promise<Board> {
  const board = createBoard(input);
  await db.boards.add(board);
  return board;
}

export async function renameBoard(id: string, title: string): Promise<void> {
  await db.boards.update(id, {
    title: title.trim() || 'Untitled Board',
    updatedAt: new Date(),
  });
}

export async function updateBoard(
  id: string,
  changes: Partial<Omit<Board, 'id' | 'createdAt'>>
): Promise<void> {
  await db.boards.update(id, { ...changes, updatedAt: new Date() });
}

/**
 * Scene writes in flight, keyed by board id.
 *
 * Switching boards quickly can have the outgoing board's teardown flush overlap
 * the incoming board's first autosave. Chaining per id keeps writes to a single
 * row ordered without making unrelated boards wait on each other.
 */
const sceneWrites = new Map<string, Promise<void>>();

/**
 * Persists a board's canvas contents.
 *
 * Deliberately does not touch `title` or any other metadata — the canvas only
 * owns `scene` and `updatedAt`.
 */
export async function saveBoardScene(
  id: string,
  scene: BoardScene
): Promise<void> {
  const previous = sceneWrites.get(id) ?? Promise.resolve();

  const write = previous
    .catch(() => {
      // A failed earlier write must not block this one.
    })
    .then(() => db.boards.update(id, { scene, updatedAt: new Date() }))
    .then(() => undefined);

  sceneWrites.set(id, write);

  try {
    await write;
  } finally {
    // Only the last write for this board clears the entry, so a queued
    // successor still sees and awaits it.
    if (sceneWrites.get(id) === write) sceneWrites.delete(id);
  }
}

export async function duplicateBoard(id: string): Promise<Board | undefined> {
  const source = await getBoard(id);
  if (!source) return undefined;

  const copy: Board = {
    ...source,
    id: crypto.randomUUID(),
    title: `${source.title} (copy)`,
    createdAt: new Date(),
    updatedAt: new Date(),
    scene: cloneScene(source.scene),
  };

  await db.boards.add(copy);
  return copy;
}

export async function deleteBoard(id: string): Promise<void> {
  await db.boards.delete(id);
}

/** Full wipe, used by the "reset local data" action. */
export async function deleteAllBoards(): Promise<void> {
  await db.boards.clear();
}

function byRecentlyUpdated(a: Board, b: Board): number {
  return toTime(b.updatedAt) - toTime(a.updatedAt);
}

function toTime(value: Date | string | undefined): number {
  if (!value) return 0;
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

/** Deep-ish copy: elements are shallow-cloned so edits can't leak between boards. */
function cloneScene(scene: BoardScene): BoardScene {
  return {
    elements: scene.elements.map(element => ({ ...element })),
    files: { ...scene.files },
  };
}

/** Keeps rows written by older/partial versions safe to render. */
function normalizeBoard(board: Board): Board {
  return { ...board, scene: board.scene ?? emptyScene() };
}
