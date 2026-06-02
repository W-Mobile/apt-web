import { describe, it, expect } from 'vitest';
import { reorderExercises } from './reorderExercises';

interface Row {
  clientId: string;
  label: string;
  pendingDelete?: boolean;
}

const r = (clientId: string, label: string, pendingDelete?: boolean): Row => ({
  clientId,
  label,
  ...(pendingDelete ? { pendingDelete: true } : {}),
});

const ids = (rows: Row[]) => rows.map((row) => row.clientId);

describe('reorderExercises', () => {
  it('moves a row forward in a list without pendingDelete', () => {
    const rows = [r('a', 'A'), r('b', 'B'), r('c', 'C'), r('d', 'D')];
    const result = reorderExercises(rows, 'a', 'c');
    expect(ids(result)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('moves a row backward in a list without pendingDelete', () => {
    const rows = [r('a', 'A'), r('b', 'B'), r('c', 'C'), r('d', 'D')];
    const result = reorderExercises(rows, 'd', 'b');
    expect(ids(result)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('preserves pendingDelete row positions when active rows are reordered', () => {
    const rows = [
      r('a', 'A'),
      r('x', 'X', true),
      r('b', 'B'),
      r('c', 'C'),
    ];
    const result = reorderExercises(rows, 'a', 'c');
    expect(ids(result)).toEqual(['b', 'x', 'c', 'a']);
    expect(result[1].pendingDelete).toBe(true);
    expect(result[1].label).toBe('X');
  });

  it('handles multiple pendingDelete rows without mixing them up', () => {
    const rows = [
      r('x1', 'X1', true),
      r('a', 'A'),
      r('b', 'B'),
      r('x2', 'X2', true),
      r('c', 'C'),
    ];
    const result = reorderExercises(rows, 'a', 'c');
    expect(ids(result)).toEqual(['x1', 'b', 'c', 'x2', 'a']);
    expect(result[0].pendingDelete).toBe(true);
    expect(result[3].pendingDelete).toBe(true);
  });

  it('returns the same array reference when activeId === overId', () => {
    const rows = [r('a', 'A'), r('b', 'B')];
    expect(reorderExercises(rows, 'a', 'a')).toBe(rows);
  });

  it('returns the same array reference when activeId is unknown', () => {
    const rows = [r('a', 'A'), r('b', 'B')];
    expect(reorderExercises(rows, 'unknown', 'a')).toBe(rows);
  });

  it('returns the same array reference when overId points at a pendingDelete row', () => {
    const rows = [r('a', 'A'), r('x', 'X', true), r('b', 'B')];
    expect(reorderExercises(rows, 'a', 'x')).toBe(rows);
  });

  it('does not mutate the input array', () => {
    const rows = [r('a', 'A'), r('b', 'B'), r('c', 'C')];
    const snapshot = ids(rows);
    reorderExercises(rows, 'a', 'c');
    expect(ids(rows)).toEqual(snapshot);
  });
});
