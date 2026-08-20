import { describe, it, expect, vi } from 'vitest';

// Avoid instantiating the real Amplify client (transitively imported via the *-api modules).
vi.mock('../amplify-config', () => ({ client: {} }));

import { computeCategoryCounts, Category } from './category-api';

function cat(id: string, sortOrder: number): Category {
  return { id, slug: id, name: id, sortOrder, isActive: true, createdAt: '', updatedAt: '' };
}

describe('computeCategoryCounts', () => {
  const performance = cat('perf', 1);
  const onCourt = cat('court', 2);

  it('counts programs, workouts and exercises per category', () => {
    const counts = computeCategoryCounts(
      [performance, onCourt],
      [
        { id: 'p1', categoryID: 'perf' },
        { id: 'p2', categoryID: 'perf' },
        { id: 'p3', categoryID: 'court' },
      ],
      [
        { id: 'w1', categoryID: 'perf' },
        { id: 'w2', categoryID: 'court' },
      ],
      [
        { id: 'e1', categoryID: 'perf' },
        { id: 'e2', categoryID: 'perf' },
        { id: 'e3', categoryID: 'perf' },
      ],
    );

    expect(counts.get('perf')).toEqual({ programs: 2, workouts: 1, exercises: 3, total: 6, splitContent: 0 });
    expect(counts.get('court')).toEqual({ programs: 1, workouts: 1, exercises: 0, total: 2, splitContent: 0 });
  });

  it('reports zero counts for a category with no linked content', () => {
    const counts = computeCategoryCounts([onCourt], [], [], []);
    expect(counts.get('court')).toEqual({ programs: 0, workouts: 0, exercises: 0, total: 0, splitContent: 0 });
  });

  it('ignores content whose categoryID is null or unknown', () => {
    const counts = computeCategoryCounts(
      [performance],
      [
        { id: 'p1', categoryID: null },
        { id: 'p2', categoryID: 'nonexistent' },
        { id: 'p3', categoryID: 'perf' },
      ],
      [],
      [],
    );
    expect(counts.get('perf')?.programs).toBe(1);
  });
});
