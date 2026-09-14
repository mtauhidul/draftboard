'use client';

import { LayoutGrid, Plus } from 'lucide-react';
import { useState } from 'react';

import { BoardItem } from '@/components/boards/BoardItem';
import { RenameBoardDialog } from '@/components/boards/RenameBoardDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Board } from '@/types/board';

type Props = {
  boards: Board[];
  loading: boolean;
  onNew: () => void;
  onRename: (id: string, title: string) => Promise<void>;
  onDuplicate: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export function BoardGrid({
  boards,
  loading,
  onNew,
  onRename,
  onDuplicate,
  onDelete,
}: Props) {
  const [renaming, setRenaming] = useState<Board | null>(null);
  const [deleting, setDeleting] = useState<Board | null>(null);

  if (loading) return <Skeleton />;
  if (boards.length === 0) return <EmptyState onNew={onNew} />;

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {boards.map(board => (
          <BoardItem
            key={board.id}
            board={board}
            onRename={setRenaming}
            onDuplicate={item => void onDuplicate(item.id)}
            onDelete={setDeleting}
          />
        ))}
      </div>

      <RenameBoardDialog
        open={renaming !== null}
        onOpenChange={open => !open && setRenaming(null)}
        currentTitle={renaming?.title ?? ''}
        onSubmit={title =>
          renaming ? onRename(renaming.id, title) : Promise.resolve()
        }
      />

      <AlertDialog
        open={deleting !== null}
        onOpenChange={open => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete board?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleting?.title}” and its drawing will be permanently deleted.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleting) void onDelete(deleting.id);
                setDeleting(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Skeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        // Dashed outline to match the real card, with two bars standing in for
        // the title and the meta row. Staggered opacity reads as "loading"
        // rather than as a set of empty boards.
        <div
          key={index}
          style={{ opacity: 1 - index * 0.2 }}
          className="flex min-h-24 animate-pulse flex-col rounded-md border border-dashed border-[var(--card-outline-color)] p-3"
        >
          <div className="h-3.5 w-2/3 rounded-full bg-[var(--color-surface-high)]" />
          <div className="mt-auto h-2.5 w-1/3 rounded-full bg-[var(--color-surface-high)]" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    // The dashed slot is the same shape as a board card, so "nothing here yet"
    // and "here is a board" are visibly the same idea. Only the button inside is
    // interactive: the surrounding area is a plain container, not a giant
    // clickable target, so a stray click on empty space does nothing.
    <div className="flex w-full flex-col items-center justify-center gap-4 rounded-md border border-dashed border-[var(--card-outline-color)] px-6 py-20 text-center">
      <LayoutGrid className="size-5 text-muted-foreground" aria-hidden />
      <div>
        <p className="text-sm font-medium">No boards yet</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Create one to start drawing.
        </p>
      </div>
      <button
        type="button"
        onClick={onNew}
        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors outline-none hover:bg-[var(--color-primary-hover)] focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Plus className="size-4" aria-hidden />
        New board
      </button>
    </div>
  );
}
