# Draftboard

A private, offline sketch board. Create a board, draw on it, come back later — everything stays on your own device.

Live at **<https://draftboard-canvas.vercel.app>**.

Draftboard is a wrapper around [Excalidraw](https://github.com/excalidraw/excalidraw), the excellent open-source whiteboard library, with a small board manager on top so you can keep several boards instead of one endless canvas.

## Features

- **Multiple boards** — create, rename, duplicate and delete boards. Each has a title, a short description and a category.
- **Full Excalidraw canvas** — shapes, arrows, text, freehand drawing, images, the library, the command palette and keyboard shortcuts, exactly as Excalidraw ships them.
- **Saved automatically** — edits are written to your browser's local database shortly after you stop drawing, and again if you close the tab mid-stroke.
- **Light and dark theme** — remembered between visits, and the canvas follows it.
- **Backup** — export every board to a single JSON file and import it back, so your work survives clearing site data or moving machines.
- **Installable** — add it to your home screen or dock and it opens like a native app.

## Your data stays with you

There is no account, no server and no database behind Draftboard. Boards are saved in your own browser, using IndexedDB and `localStorage`. Nothing is uploaded, and there is no analytics or tracking.

Loading a board makes no network request at all — not to Excalidraw's servers, and not anywhere else. Two links in the canvas chrome (Help, and Browse libraries) point out to `excalidraw.com`, but they only do anything if you click them; nothing is sent on your behalf otherwise.

Two consequences worth knowing:

- Clearing your browser's site data will delete your boards. Use **Export** to keep a backup, and **Import** to restore it.
- Boards live per browser and per device — they are not synced anywhere, which is also why nobody else can read them.
- Importing never overwrites: a board whose id is already stored is skipped, so restoring the same file twice is safe and local edits always win.

## Getting started

```bash
pnpm install
pnpm dev
```

Then open <http://localhost:3000>.

```bash
pnpm build   # production build
pnpm lint    # eslint
```

## Credits

Built by **Mir Tauhidul Islam**.

The canvas is [Excalidraw](https://github.com/excalidraw/excalidraw) by the Excalidraw team, used through [`@excalidraw/excalidraw`](https://www.npmjs.com/package/@excalidraw/excalidraw) and licensed under the MIT License. Draftboard is an independent wrapper and is not affiliated with Excalidraw.
