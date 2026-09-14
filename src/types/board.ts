import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { BinaryFiles } from '@excalidraw/excalidraw/types';

/**
 * The parts of an Excalidraw scene worth persisting.
 *
 * Camera state (scroll/zoom) is intentionally not persisted: reopening a board
 * at a stale viewport is more disorienting than starting at the origin.
 *
 * `appState` is narrowed to the canvas backdrop rather than the whole object:
 * selection, the active tool and the editor theme are session state, and
 * restoring them would fight whatever the user is doing when the board reopens.
 * The backdrop is worth keeping because it is drawn *by* the user, and because
 * Excalidraw only recolours newly created elements when the theme flips.
 */
export type BoardScene = {
  elements: readonly ExcalidrawElement[];
  files: BinaryFiles;
  appState?: { viewBackgroundColor?: string };
};

export type Board = {
  id: string;
  title: string;
  description?: string;
  category?: string;
  createdAt: Date;
  updatedAt: Date;
  scene: BoardScene;
};

export const emptyScene = (): BoardScene => ({ elements: [], files: {} });
