'use client';

import '@excalidraw/excalidraw/index.css';

import { Excalidraw, MainMenu, getSceneVersion } from '@excalidraw/excalidraw';
import type {
  ExcalidrawImperativeAPI,
  ExcalidrawProps,
} from '@excalidraw/excalidraw/types';
import { AlertCircle, ArrowLeft, Check, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { RenameBoardDialog } from '@/components/boards/RenameBoardDialog';
import { useTheme } from '@/components/theme/ThemeProvider';
import { renameBoard, saveBoardScene } from '@/lib/db/boards';
import type { BoardScene } from '@/types/board';

/** Idle time before a change is written to IndexedDB. */
const SAVE_DELAY_MS = 700;

/**
 * Excalidraw's own phone breakpoint, copied from its source so the island can
 * agree with it.
 *
 * Excalidraw decides that it is on a phone with `width < 730`, or `height < 500`
 * while still narrower than 1000 — a landscape phone is short *and* narrow. It
 * also measures the container rather than the window, which is why this reads
 * the wrapper's own box instead of the viewport.
 */
const MQ_MAX_WIDTH_PORTRAIT = 730;
const MQ_MAX_WIDTH_LANDSCAPE = 1000;
const MQ_MAX_HEIGHT_LANDSCAPE = 500;

function isPhoneLayout(width: number, height: number) {
  return (
    width < MQ_MAX_WIDTH_PORTRAIT ||
    (height < MQ_MAX_HEIGHT_LANDSCAPE && width < MQ_MAX_WIDTH_LANDSCAPE)
  );
}

/**
 * Width at which Excalidraw's top-right row has room for the island.
 *
 * That row is a fixed slot a little under 300px wide holding the Library
 * button, and it does not make room for extra children — it simply spills past
 * the right edge and takes Library off-screen with it.
 *
 * The overflow point depends on how wide the island is, so this is derived
 * from the island's own ceiling rather than from a single measured case: with
 * the name capped at `sm:max-w-44` the island tops out near 300px, and around
 * 1080px is where the row starts having 300px of slack left over.
 */
const ROW_MIN_WIDTH = 1084;

/**
 * Width at which the island can sit beside the menu button instead of on the
 * right.
 *
 * Excalidraw centres its shape toolbar in the next grid column, so the gap
 * between the menu button and the toolbar is what the island has to fit into.
 * That gap is fixed while the toolbar is wider than its share of the row and
 * only starts growing past roughly 1150px, so this has to clear both that and
 * the island's own width: the toolbar's left edge is `(width - 550) / 2` and
 * the island needs ~300px after its 64px offset, which only adds up from about
 * 1340px. Below that the island would land on the tools themselves — the same
 * overlap-on-top-of-Excalidraw bug in a different corner.
 */
const MENU_SIDE_MIN_WIDTH = 1344;

/**
 * Scene versions already written to IndexedDB, keyed by board id.
 *
 * Module scope on purpose: switching boards unmounts and remounts the canvas,
 * so component state does not survive. Without this every remount would start
 * from "nothing saved", and the first change event for an already-stored board
 * would look like an unsaved edit.
 */
const savedVersions = new Map<string, number>();

type Props = {
  boardId: string;
  title: string;
  initialScene: BoardScene;
};

type SaveStatus = 'saved' | 'saving' | 'error';

/**
 * A board, rendered as close to bare Excalidraw as possible.
 *
 * The canvas is the page: there is no app chrome, no sidebar and no header
 * competing with it, so all of Excalidraw's own UI — including its theme and
 * canvas-background controls — behaves exactly as it does standalone. The only
 * additions are a small floating pill for the way back and the board name, and
 * a save indicator, both of which sit above the canvas rather than shrinking
 * it.
 */
export function ExcalidrawCanvas({ boardId, title, initialScene }: Props) {
  const { resolved: theme, syncFromCanvas } = useTheme();

  const savedVersion = useRef(
    savedVersions.get(boardId) ?? getSceneVersion(initialScene.elements)
  );
  const pendingScene = useRef<BoardScene | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<SaveStatus>('saved');
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(title);

  const api = useRef<ExcalidrawImperativeAPI | null>(null);
  const appliedTheme = useRef(theme);

  /**
   * The canvas's own size, tracked from the wrapper rather than the viewport so
   * it agrees with what Excalidraw measures, and so the chrome re-lays out when
   * the window changes size.
   */
  const container = useRef<HTMLDivElement | null>(null);
  const [canvas, setCanvas] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = container.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      const box = entry?.contentRect;
      if (box) setCanvas({ width: box.width, height: box.height });
    });

    // The observer's first callback carries the initial size, so this is right
    // by the first paint rather than a frame later.
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  /**
   * Where the island goes, as three mutually exclusive cases.
   *
   * Excalidraw's top-right row is the natural home, but it only holds the island
   * once the grid is wide enough to give some slack; below that it spills and
   * pushes Library off the right edge. Past 1280px the stretch between the menu
   * button and the centred toolbar is instead wide enough for the island on the
   * left, which is where it reads best. Whatever is left — phones, and the
   * widths where neither corner has room — puts the island under the toolbar.
   */
  const phoneLayout = isPhoneLayout(canvas.width, canvas.height);
  const besideMenu = canvas.width >= MENU_SIDE_MIN_WIDTH;
  const inTopRightRow =
    !phoneLayout && !besideMenu && canvas.width >= ROW_MIN_WIDTH;
  const underToolbar = !inTopRightRow && !besideMenu;

  /**
   * The theme is deliberately *not* passed as a prop: Excalidraw only renders
   * its own theme command while it owns the value, and that command is the
   * intended way to switch. The cost is that the shell must push changes back
   * in when it is the one that changed — a system-preference flip while a board
   * is open, for instance — which is what this does.
   */
  useEffect(() => {
    if (appliedTheme.current === theme) return;
    appliedTheme.current = theme;
    api.current?.updateScene({ appState: { theme } });
  }, [theme]);

  const captureApi = useCallback((instance: ExcalidrawImperativeAPI) => {
    api.current = instance;
  }, []);

  /**
   * Writes `scene` and remembers what landed. A failed write leaves the version
   * untouched so the next edit retries rather than silently believing the scene
   * is already stored.
   */
  const persist = useCallback(
    async (scene: BoardScene): Promise<boolean> => {
      try {
        await saveBoardScene(boardId, scene);
        const version = getSceneVersion(scene.elements);
        savedVersion.current = version;
        savedVersions.set(boardId, version);
        return true;
      } catch (error) {
        console.error('Failed to save board', error);
        return false;
      }
    },
    [boardId]
  );

  /** Cancels any pending debounce and writes whatever is still unsaved. */
  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }

    const scene = pendingScene.current;
    if (!scene) return;

    pendingScene.current = null;
    const ok = await persist(scene);

    if (ok) {
      // Only claim "saved" if nothing new arrived while the write was in flight.
      if (!pendingScene.current) setStatus('saved');
      return;
    }

    // Re-arm with the scene that failed so Retry (and the unmount/visibility
    // flush) has something to write. A newer change wins if one landed.
    pendingScene.current ??= scene;
    setStatus('error');
  }, [persist]);

  const handleChange: NonNullable<ExcalidrawProps['onChange']> = useCallback(
    (elements, appState, files) => {
      // Excalidraw owns the theme command, so its reported theme is the source
      // of truth. Mirroring it keeps the rest of the app in step instead of
      // contradicting the canvas. This is a no-op when the two already agree.
      syncFromCanvas(appState.theme);

      // A theme flip, a selection change or a camera move arrive here too, but
      // none of them change the element version, so this filters them out and
      // nothing gets written for them.
      if (getSceneVersion(elements) === savedVersion.current) return;

      pendingScene.current = { elements, files };
      setStatus('saving');

      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        void flush();
      }, SAVE_DELAY_MS);
    },
    [flush, syncFromCanvas]
  );

  /**
   * Leaving the board (or the tab) mid-debounce must not lose the last edit.
   * A backgrounded tab can be frozen and never run a cleanup function, so
   * `visibilitychange` covers the tab-switch and browser-close cases too.
   */
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === 'hidden') void flush();
    };

    document.addEventListener('visibilitychange', onHidden);

    return () => {
      document.removeEventListener('visibilitychange', onHidden);
      void flush();
    };
  }, [flush]);

  /**
   * The island, in the form Excalidraw's top-right row wants it.
   *
   * `renderTopRightUI` is Excalidraw's own hook for that corner, and it already
   * knows whether it is in its phone layout — the same condition its top-right
   * row depends on. Returning nothing on a phone is deliberate: there the row
   * does not exist and the hook is called inside the full-width top bar
   * instead, where the island would be crammed in beside the tools.
   *
   * It is also skipped entirely on wide screens, where the island moves beside
   * the menu button, so that it is never rendered into two corners at once.
   */
  const renderChrome = useCallback<
    NonNullable<ExcalidrawProps['renderTopRightUI']>
  >(
    isMobile => {
      // `isMobile` duplicates the phone case already excluded by
      // `inTopRightRow`; it is checked anyway so an Excalidraw that shifts its
      // own breakpoint can never leave the island inside the phone toolbar.
      if (isMobile || !inTopRightRow) return null;
      return (
        <div
          data-testid="draftboard-chrome"
          className="pointer-events-auto flex min-w-0 items-center"
        >
          <BoardControl
            name={name}
            status={status}
            onRename={() => setRenaming(true)}
            onRetry={() => void flush()}
          />
        </div>
      );
    },
    [name, status, flush, inTopRightRow]
  );

  return (
    <div ref={container} className="relative h-dvh w-full overflow-hidden">
      {/*
       * Draftboard is a fully local tool, so nothing here may reach out to
       * excalidraw.com. The props below are the app-surface half of that
       * promise; the CSS half lives in `globals.css`.
       *
       * - `aiEnabled={false}` removes the "Generate" (text-to-diagram) button,
       *   the Mermaid entry in the command palette, and the "convert to code"
       *   action — all of which post the scene to a remote service.
       * - `validateEmbeddable={false}` stops an embedded URL from being
       *   fetched. Excalidraw caches a "do not render" verdict per element, so
       *   nothing is painted in its place either. `renderEmbeddable` is the
       *   render-side belt to that braces.
       * - `onLinkOpen` is Excalidraw's own navigation hook, so a link element
       *   can no longer open a tab behind our back.
       * - `UIOptions` names only the actions this app exposes. Excalidraw
       *   merges it over its own defaults, so what is left out — "Export to
       *   Excalidraw+", `saveToActiveFile` — is off, and what is named keeps
       *   its default. What survives is open, save, export, find, theme and
       *   canvas background, all of which stay on this device.
       */}
      <Excalidraw
        initialData={{
          elements: initialScene.elements,
          files: initialScene.files,
          scrollToContent: true,
          // Seeded once, on mount. Everything else about the canvas — its
          // theme command, its canvas-background picker, its zoom controls —
          // is left exactly as Excalidraw ships it.
          appState: { ...initialScene.appState, theme },
        }}
        excalidrawAPI={captureApi}
        onChange={handleChange}
        name={name}
        renderTopRightUI={renderChrome}
        aiEnabled={false}
        validateEmbeddable={false}
        renderEmbeddable={() => null}
        onLinkOpen={(_element, event) => event.preventDefault()}
        UIOptions={{
          // Every key Excalidraw resolves by default is named here, rather than
          // only the ones that differ, so the object Excalidraw stores is
          // identical on every render. A partial object is parsed into a fresh
          // copy each time, which reads as "the options changed" and re-runs
          // more work than this screen should do on a keystroke.
          canvasActions: {
            changeViewBackgroundColor: true,
            clearCanvas: true,
            export: { saveFileToDisk: true },
            loadScene: true,
            saveAsImage: true,
            saveToActiveFile: false,
            // `null` means "resolve the default", which is on. See the note on
            // this object above.
            toggleTheme: null,
          },
        }}
      >
        {/*
         * A `MainMenu` child replaces Excalidraw's default list wholesale, which
         * is how the "Excalidraw links" group (GitHub / Follow us / Discord
         * chat) and the Help entry — the one that leads to the docs, blog, issue
         * tracker and YouTube — stop being offered. Only actions that stay on
         * this device are listed.
         *
         * The items gate themselves on the same `UIOptions.canvasActions` flags
         * the default menu reads, so this list follows the options above rather
         * than duplicating them: file open and reset drop out in a read-only or
         * embedded context, and the theme and canvas-background pickers drop out
         * when their actions are turned off.
         *
         * `Export` is included here rather than left to the default menu, which
         * renders it behind its own `canvasActions.export` check. Passing it
         * through unconditionally is safe because nothing in this app can turn
         * that action off.
         */}
        <MainMenu>
          <MainMenu.DefaultItems.LoadScene />
          <MainMenu.DefaultItems.Export />
          <MainMenu.DefaultItems.SaveAsImage />
          <MainMenu.DefaultItems.SearchMenu />
          <MainMenu.DefaultItems.ClearCanvas />
          <MainMenu.Separator />
          <MainMenu.DefaultItems.ToggleTheme />
          <MainMenu.DefaultItems.ChangeCanvasBackground />
        </MainMenu>
      </Excalidraw>

      {/**
       * The two placements for the widths where Excalidraw's top-right row is
       * not the right home for the island.
       *
       * The original bug was a fixed-position island: the top-right corner
       * already belongs to Excalidraw's Library button, and a positioned overlay
       * with a higher z-index covers it and swallows its clicks. So the island
       * is drawn by Excalidraw's own hook wherever that row can hold it.
       *
       * The row cannot always. It is a fixed-width slot, so on a phone there is
       * no such row at all and on medium screens it has no slack — in both cases
       * the island drops underneath the toolbar instead. On a wide screen it
       * moves to the left, into the empty stretch between the menu button and
       * the centred toolbar.
       *
       * These three conditions are mutually exclusive, so the island is only
       * ever rendered once.
       */}
      {underToolbar && (
        <div
          data-testid="draftboard-chrome"
          className="pointer-events-none absolute top-16 left-4 z-10 max-w-[calc(100%-2rem)]"
        >
          <div className="pointer-events-auto flex">
            <BoardControl
              name={name}
              status={status}
              onRename={() => setRenaming(true)}
              onRetry={() => void flush()}
            />
          </div>
        </div>
      )}

      {besideMenu && (
        <div
          data-testid="draftboard-chrome"
          className="pointer-events-none absolute top-4 left-16 z-10"
        >
          <div className="pointer-events-auto flex">
            <BoardControl
              name={name}
              status={status}
              onRename={() => setRenaming(true)}
              onRetry={() => void flush()}
            />
          </div>
        </div>
      )}

      <RenameBoardDialog
        open={renaming}
        onOpenChange={setRenaming}
        currentTitle={name}
        onSubmit={async next => {
          await renameBoard(boardId, next);
          setName(next);
        }}
      />
    </div>
  );
}

/**
 * The only app chrome on a board: a way back, the board name, and the save
 * state, grouped into a single island.
 *
 * This is built from Excalidraw's own island recipe rather than the app's
 * generic card style, so it reads as part of the toolbar row it sits in:
 * `--island-bg-color` with `--shadow-island`, an 8px radius, and a small
 * inset around its controls.
 *
 * Deliberately only 36px tall — the same as the burger and the Library button
 * it sits next to, so the three read as one row rather than the island standing
 * proud of its neighbours. Its height is pinned with `h-9` rather than left to
 * its contents, which is what lets the controls be smaller than the box: at
 * `h-7` they leave room for `p-1`, so the hover fill sits 4px clear of the
 * island's edge instead of filling it corner to corner.
 *
 * Its colours come from Excalidraw's UI tokens (`--color-on-surface`,
 * `--button-hover-bg`, `--default-border-color`) because those are already
 * remapped in `globals.css`, which keeps it in step with the rest of the app
 * AND with Excalidraw whenever both switch theme together.
 *
 * Widths are pinned so the island keeps its shape wherever it is mounted: the
 * name truncates rather than growing the box, which is what stops it from
 * shoving Excalidraw's toolbar sideways instead of fitting in beside it.
 */
function BoardControl({
  name,
  status,
  onRename,
  onRetry,
}: {
  name: string;
  status: SaveStatus;
  onRename: () => void;
  onRetry: () => void;
}) {
  return (
    <div
      className="flex h-9 min-w-0 items-center gap-0.5 rounded-md bg-[var(--island-bg-color)] p-1 text-[color:var(--color-on-surface)] shadow-island"
      // Excalidraw listens on `window` and treats Escape as "deselect", so
      // without this, dismissing the rename dialog would also clear the
      // selection behind it.
      onKeyDown={event => event.stopPropagation()}
    >
      <Link
        href="/"
        aria-label="Back to boards"
        title="Back to boards"
        className="flex size-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-[var(--button-hover-bg)]"
      >
        <ArrowLeft className="size-4" />
      </Link>

      {/*
        `h-7`/`max-w-*` matter: without an explicit height the button collapses
        to the text's ~20px line box and its hover fill hugged the letters, and
        without a width cap a long board name would widen the island past what
        the placement breakpoints below were measured against.
      */}
      <button
        type="button"
        onClick={onRename}
        title="Rename board"
        className="flex h-7 min-w-0 max-w-32 items-center rounded-md px-2 text-sm font-medium transition-colors hover:bg-[var(--button-hover-bg)] sm:max-w-44"
      >
        <span className="truncate">{name}</span>
      </button>

      <span
        className="h-5 w-px shrink-0 bg-[var(--default-border-color)]"
        aria-hidden
      />

      <SaveIndicator status={status} onRetry={onRetry} />
    </div>
  );
}

function SaveIndicator({
  status,
  onRetry,
}: {
  status: SaveStatus;
  onRetry: () => void;
}) {
  return (
    <span
      aria-live="polite"
      className="flex h-7 shrink-0 items-center gap-1.5 px-2 text-xs tabular-nums"
    >
      {status === 'saving' && (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden />
          <span className="hidden text-muted-foreground sm:inline">
            Saving…
          </span>
        </>
      )}

      {status === 'saved' && (
        <>
          <Check className="size-4" aria-hidden />
          <span className="hidden text-muted-foreground sm:inline">Saved</span>
        </>
      )}

      {status === 'error' && (
        <>
          <AlertCircle className="size-4 text-destructive" aria-hidden />
          <span className="text-destructive">Not saved</span>
          <button
            type="button"
            onClick={onRetry}
            className="underline underline-offset-2 hover:text-destructive/80"
          >
            Retry
          </button>
        </>
      )}
    </span>
  );
}
