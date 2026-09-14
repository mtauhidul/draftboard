'use client';

import { Copy, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatRelativeTime } from '@/lib/format';
import type { Board } from '@/types/board';

type Props = {
  board: Board;
  onRename: (board: Board) => void;
  onDuplicate: (board: Board) => void;
  onDelete: (board: Board) => void;
};

export function BoardItem({ board, onRename, onDuplicate, onDelete }: Props) {
  return (
    // A dashed outline instead of Excalidraw's solid island. The boards list is
    // a set of things you open rather than content in its own right, and the
    // dashes echo the empty state below — so the list reads as "slots" that
    // fill up. Everything else stays on Excalidraw's tokens (`rounded-md` is
    // its 8px radius), so the card still belongs to the same system.
    //
    // The outline uses `--card-outline-color` rather than Excalidraw's
    // `--default-border-color`, which is derived from `--color-surface-high`
    // and so is near-white in light mode: correct for a focus ring on an
    // already-elevated island, invisible as an outline on the page background.
    //
    // Hover and focus share one treatment so keyboard users get the same
    // affordance as a mouse; `focus-within` rather than `focus-visible` because
    // focus can land on either the card link or the actions button.
    <div className="group relative flex min-h-24 rounded-md border border-dashed border-[var(--card-outline-color)] transition-colors hover:border-solid hover:border-primary hover:bg-[var(--button-hover-bg)] focus-within:border-solid focus-within:border-primary focus-within:bg-[var(--button-hover-bg)]">
      <Link
        href={`/${board.id}`}
        className="flex w-full flex-col p-3 pr-11 outline-none"
      >
        <span className="truncate text-sm font-medium">{board.title}</span>

        {board.description && (
          <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {board.description}
          </span>
        )}

        {/*
         * `mt-auto` pins this row to the bottom, so the category and timestamp
         * line up across a row of cards no matter how much description each one
         * carries. The category is plain text with a middot rather than a
         * filled chip — one less box competing with the title.
         */}
        <span className="mt-auto flex items-center gap-1.5 pt-3 text-xs text-muted-foreground">
          {board.category && (
            <>
              <span className="truncate">{board.category}</span>
              <span aria-hidden>·</span>
            </>
          )}
          <span className="whitespace-nowrap">
            {formatRelativeTime(board.updatedAt)}
          </span>
        </span>
      </Link>

      {/*
       * Always visible rather than revealed on hover: a hidden control is a
       * control nobody finds, and there is no hover on a touch screen. It is
       * kept quiet with the muted foreground and no fill, and darkens to full
       * contrast when the card or the button is hovered.
       */}
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Actions for ${board.title}`}
          className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary group-hover:text-foreground data-open:text-foreground"
        >
          <MoreHorizontal className="size-4" aria-hidden />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onRename(board)}>
            <Pencil />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDuplicate(board)}>
            <Copy />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => onDelete(board)}
          >
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
