'use client';

import { Download, Lock, Plus, Upload } from 'lucide-react';
import Link from 'next/link';
import { useRef, useState } from 'react';

import { BoardGrid } from '@/components/boards/BoardGrid';
import { CreateBoardDialog } from '@/components/boards/CreateBoardDialog';
import { LogoMark } from '@/components/brand/LogoMark';
import { ThemeToggleButton } from '@/components/theme/ThemeToggleButton';
import { useHotkey } from '@/lib/hooks/useHotkey';
import type { Board } from '@/types/board';

type Props = {
  boards: Board[];
  loading: boolean;
  onCreate: (values: {
    title: string;
    description: string;
    category: string;
  }) => Promise<void>;
  onRename: (id: string, title: string) => Promise<void>;
  onDuplicate: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onExport: () => Promise<void>;
  onImport: (file: File) => Promise<string>;
};

/**
 * The board manager.
 *
 * Styled as one Excalidraw island: same surface, same hairline shadow, same
 * 0.5rem radius, same violet primary and same 2.25rem control height as the
 * chrome on a board. Everything below the bar is canvas.
 *
 * The bar sticks rather than scrolling away, which is also what Excalidraw does
 * with its top menu, so the way out is always one click from anywhere in a long
 * list.
 */
export function BoardList({
  boards,
  loading,
  onCreate,
  onRename,
  onDuplicate,
  onDelete,
  onExport,
  onImport,
}: Props) {
  const [creating, setCreating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const importInput = useRef<HTMLInputElement>(null);

  useHotkey('n', () => {
    if (!creating) setCreating(true);
  });

  const canExport = !loading && boards.length > 0 && !exporting;

  async function handleExport() {
    setExporting(true);
    setNotice(null);
    try {
      await onExport();
    } catch (error) {
      console.error('Export failed', error);
    } finally {
      setExporting(false);
    }
  }

  async function handleImport(file: File) {
    setImporting(true);
    setNotice(null);
    try {
      setNotice(await onImport(file));
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : 'That file could not be read.'
      );
    } finally {
      setImporting(false);
    }
  }

  return (
    // `app-grid` is the 20px dot lattice on the boards page: the same pitch as
    // Excalidraw's own canvas grid, so the list of boards sits on the paper the
    // boards themselves are drawn on. It is painted on this outer column rather
    // than on `main` so the texture covers the whole viewport, and because this
    // element never scrolls, the board cards slide over a stationary sheet
    // instead of dragging the dots along with them.
    <div className="app-grid flex h-dvh flex-col">
      {/*
       * `mt-*` mirrors the `top-*` sticky offset on purpose. A sticky element
       * with a non-zero `top` is shifted *visually* but its layout box stays at
       * its normal flow position, so the gap the offset opens above it is
       * invisible to layout: `main` would start at the header's 44px flow
       * bottom while the island was actually painted from 12px down to 56px,
       * and the first row of cards slid underneath it. Giving the header a
       * matching top margin makes flow position and sticky rest position agree,
       * so `main` begins below the island's real bottom edge.
       */}
      <header className="sticky top-2 z-20 mx-2 mt-2 flex shrink-0 flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-md bg-[var(--island-bg-color)] py-1 pr-1 pl-2 shadow-island sm:top-3 sm:mx-3 sm:mt-3">
        <div className="flex min-w-0 items-center gap-2">
          {/*
           * The mark is tinted with the primary colour while the wordmark stays
           * at full foreground contrast, so the logo reads as a piece of
           * interface rather than a picture pasted into the corner.
           */}
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-md px-1 py-1 text-base font-semibold text-foreground transition-colors hover:text-primary"
          >
            <LogoMark className="size-4 text-primary" />
            Draftboard
          </Link>
          <span
            className="hidden text-xs text-muted-foreground sm:inline"
            aria-live="polite"
          >
            {boards.length > 0
              ? `${boards.length} board${boards.length === 1 ? '' : 's'}`
              : 'Your boards live on this device'}
          </span>
        </div>

        {/*
         * The row is spaced with `gap-1`, not with each button's own padding:
         * the buttons only need enough inner padding to keep their hover fill
         * off the label, so what reads as breathing room here is the space
         * *between* the fills rather than padding inside them.
         */}
        <div className="flex shrink-0 items-center gap-1">
          {/*
           * Non-primary actions use Excalidraw's `island` button treatment: no
           * fill until hover, then `--button-hover-bg`.
           */}
          <button
            type="button"
            onClick={handleExport}
            disabled={!canExport}
            title="Download every board as a JSON file"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md px-2 text-sm text-foreground transition-colors hover:bg-[var(--button-hover-bg)] disabled:pointer-events-none disabled:opacity-50"
          >
            <Download className="size-4" aria-hidden />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/*
           * The file input itself is never shown: a native file control cannot
           * be styled to match the island, and its label would be the only
           * chrome on the bar. The button raises the picker instead, and the
           * input stays in the tree because a detached one cannot be clicked.
           */}
          <button
            type="button"
            onClick={() => importInput.current?.click()}
            disabled={importing}
            title="Restore boards from a backup file"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md px-2 text-sm text-foreground transition-colors hover:bg-[var(--button-hover-bg)] disabled:pointer-events-none disabled:opacity-50"
          >
            <Upload className="size-4" aria-hidden />
            <span className="hidden sm:inline">
              {importing ? 'Importing…' : 'Import'}
            </span>
          </button>
          <input
            ref={importInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={event => {
              const file = event.target.files?.[0];
              // Clearing the value is what lets the same file be picked twice
              // in a row: without it the second pick fires no change event.
              event.target.value = '';
              if (file) void handleImport(file);
            }}
          />

          <ThemeToggleButton />

          {/* The one filled action, in Excalidraw's primary violet. */}
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-primary px-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-[var(--color-primary-hover)]"
          >
            <Plus className="size-4" aria-hidden />
            New board
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-2 pt-2 pb-2 sm:px-3">
        {/*
         * The result of the last import lives here rather than in a toast:
         * it is the one message the user has to be able to re-read, and a
         * toast that has already faded is no use when deciding whether the
         * restore worked. `aria-live` so the outcome is announced too.
         */}
        {notice && (
          <p
            aria-live="polite"
            className="mb-2 rounded-md border border-dashed border-[var(--card-outline-color)] px-3 py-2 text-xs text-muted-foreground"
          >
            {notice}
          </p>
        )}

        <BoardGrid
          boards={boards}
          loading={loading}
          onNew={() => setCreating(true)}
          onRename={onRename}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      </main>

      {/*
       * The footer is a flex sibling of `main` rather than something fixed or
       * sticky. The page is a `h-dvh` column and `main` is the only child that
       * flexes, so `main` absorbs whatever height is left over and scrolls its
       * own contents inside that box. The footer therefore lands on the bottom
       * edge of the viewport on its own, at every list length, with no offset
       * arithmetic to keep in sync — and it sits outside the scroll container,
       * so it stays put while the boards scroll past it.
       *
       * It carries the two things worth saying on this screen. The privacy note
       * is deliberately the narrow claim: "in this browser" is what the code
       * actually guarantees — an IndexedDB database and a `localStorage` key,
       * with no server to send anything to. The credit is here because the
       * canvas is Excalidraw's work, not this app's.
       *
       * No surface of its own: the footer is transparent so the board grid runs
       * to the bottom edge of the window behind it, rather than stopping at a
       * bar. The two lines are quiet enough to sit directly on the background.
       */}
      <footer className="mx-2 mb-2 flex shrink-0 flex-col items-center gap-1 px-3 py-2 text-center text-xs text-muted-foreground sm:mx-3 sm:mb-3 sm:flex-row sm:justify-between sm:gap-x-3 sm:text-left">
        <p className="flex items-center gap-1.5">
          <Lock className="size-3.5 shrink-0" aria-hidden />
          <span>
            Your boards are stored in this browser only — nothing is uploaded.
          </span>
        </p>
        <p className="shrink-0">
          Powered by{' '}
          <a
            href="https://excalidraw.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground underline-offset-2 transition-colors hover:text-primary hover:underline"
          >
            Excalidraw
          </a>
        </p>
      </footer>

      <CreateBoardDialog
        open={creating}
        onOpenChange={setCreating}
        onSubmit={onCreate}
      />
    </div>
  );
}
