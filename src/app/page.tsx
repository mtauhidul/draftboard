'use client';

import { useLiveQuery } from 'dexie-react-hooks';

import { BoardList } from '@/components/boards/BoardList';
import { exportAllData } from '@/lib/db/backup';
import {
  createNewBoard,
  deleteBoard,
  duplicateBoard,
  listBoards,
  renameBoard,
} from '@/lib/db/boards';

export default function HomePage() {
  // Live query: the list re-renders whenever IndexedDB changes, so mutations
  // never need a manual refetch.
  const boards = useLiveQuery(listBoards, [], []);

  return (
    <BoardList
      boards={boards ?? []}
      loading={!boards}
      onCreate={async values => {
        await createNewBoard({
          title: values.title,
          description: values.description,
          category: values.category,
        });
      }}
      onRename={renameBoard}
      onDuplicate={async id => {
        await duplicateBoard(id);
      }}
      onDelete={deleteBoard}
      onExport={async () => {
        await exportAllData();
      }}
    />
  );
}
