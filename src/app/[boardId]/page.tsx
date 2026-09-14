'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { getBoard } from '@/lib/db/boards';
import type { Board } from '@/types/board';

/**
 * Excalidraw reaches for `window` and `ResizeObserver` while its module is
 * being evaluated, and its stylesheet assumes real layout, so it cannot be
 * prerendered. Loading it client-only also keeps its large bundle out of the
 * initial load.
 */
const ExcalidrawCanvas = dynamic(
  () =>
    import('@/components/boards/ExcalidrawCanvas').then(
      m => m.ExcalidrawCanvas
    ),
  { ssr: false, loading: () => <Note>Loading board…</Note> }
);

export default function BoardPage() {
  const params = useParams<{ boardId: string }>();

  // Keying here is what makes switching boards safe: the whole subtree is torn
  // down and rebuilt per board id, so no board's state can bleed into another's.
  return <BoardView key={params.boardId} boardId={params.boardId} />;
}

function BoardView({ boardId }: { boardId: string }) {
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  // Deliberately a one-shot read rather than a live query: re-reading the board
  // after every autosave would hand Excalidraw a fresh scene mid-draw.
  useEffect(() => {
    let active = true;

    getBoard(boardId)
      .then(result => {
        if (!active) return;
        setBoard(result ?? null);
        setLoading(false);
      })
      .catch(error => {
        console.error('Failed to load board', error);
        if (!active) return;
        setFailed(true);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [boardId]);

  if (loading) return <Note>Loading board…</Note>;

  if (failed) {
    return (
      <Note>
        <h1 className="text-base font-semibold tracking-tight">
          Couldn&apos;t load this board
        </h1>
        <p>Local storage may be unavailable. Try reloading the page.</p>
        <BackToBoards />
      </Note>
    );
  }

  if (!board) {
    return (
      <Note>
        <h1 className="text-base font-semibold tracking-tight">
          Board not found
        </h1>
        <p>It may have been deleted.</p>
        <BackToBoards />
      </Note>
    );
  }

  return (
    <ExcalidrawCanvas
      boardId={board.id}
      title={board.title}
      initialScene={board.scene}
    />
  );
}

function BackToBoards() {
  return (
    <Link
      href="/"
      className="mt-2 underline underline-offset-4 hover:text-foreground"
    >
      Back to boards
    </Link>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-1 px-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
