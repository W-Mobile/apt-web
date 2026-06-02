import { arrayMove } from '@dnd-kit/sortable';

export interface ReorderableRow {
  clientId: string;
  pendingDelete?: boolean;
}

export function reorderExercises<T extends ReorderableRow>(
  rows: T[],
  activeId: string,
  overId: string
): T[] {
  if (activeId === overId) return rows;

  const activeRows = rows.filter((r) => !r.pendingDelete);
  const oldIdx = activeRows.findIndex((r) => r.clientId === activeId);
  const newIdx = activeRows.findIndex((r) => r.clientId === overId);
  if (oldIdx < 0 || newIdx < 0) return rows;

  const reorderedActive = arrayMove(activeRows, oldIdx, newIdx);
  let i = 0;
  return rows.map((r) => (r.pendingDelete ? r : reorderedActive[i++]));
}
