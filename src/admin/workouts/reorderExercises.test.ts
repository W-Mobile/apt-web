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
  it('flyttar en rad framåt i en lista utan pendingDelete', () => {
    const rows = [r('a', 'A'), r('b', 'B'), r('c', 'C'), r('d', 'D')];
    const result = reorderExercises(rows, 'a', 'c');
    expect(ids(result)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('flyttar en rad bakåt i en lista utan pendingDelete', () => {
    const rows = [r('a', 'A'), r('b', 'B'), r('c', 'C'), r('d', 'D')];
    const result = reorderExercises(rows, 'd', 'b');
    expect(ids(result)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('bevarar position för pendingDelete-rader när aktiva rader byter plats', () => {
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

  it('hanterar flera pendingDelete-rader utan att blanda ihop dem', () => {
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

  it('returnerar samma array-referens när activeId === overId', () => {
    const rows = [r('a', 'A'), r('b', 'B')];
    expect(reorderExercises(rows, 'a', 'a')).toBe(rows);
  });

  it('returnerar samma array-referens när activeId saknas', () => {
    const rows = [r('a', 'A'), r('b', 'B')];
    expect(reorderExercises(rows, 'okänd', 'a')).toBe(rows);
  });

  it('returnerar samma array-referens när overId saknas eller pekar på pendingDelete', () => {
    const rows = [r('a', 'A'), r('x', 'X', true), r('b', 'B')];
    expect(reorderExercises(rows, 'a', 'x')).toBe(rows);
  });

  it('muterar inte ursprungsarrayen', () => {
    const rows = [r('a', 'A'), r('b', 'B'), r('c', 'C')];
    const snapshot = ids(rows);
    reorderExercises(rows, 'a', 'c');
    expect(ids(rows)).toEqual(snapshot);
  });
});
