import { client } from '../amplify-config';
import { listPrograms, listAllPeriods, listAllPeriodWorkouts } from '../programs/program-api';
import { listWorkouts } from '../workouts/workout-api';
import { listExercises } from '../exercises/exercise-api';
import { computeMismatchedFrom } from './content-health';

export interface Category {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryCounts {
  programs: number;
  workouts: number;
  exercises: number;
  total: number;
  /** Workouts/exercises whose parent program sits in a different category. */
  splitContent: number;
}

export interface CategoryWithCounts extends Category {
  counts: CategoryCounts;
}

export interface CreateCategoryInput {
  slug: string;
  name: string;
  sortOrder: number;
  isActive?: boolean;
}

export interface UpdateCategoryInput {
  id: string;
  name?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export async function listCategories(): Promise<Category[]> {
  const all: Category[] = [];
  let nextToken: string | null = null;
  do {
    const { data, nextToken: newToken } = await client.models.Category.list({
      nextToken: nextToken ?? undefined,
    });
    all.push(...(data as unknown as Category[]));
    nextToken = newToken ?? null;
  } while (nextToken);
  return all.sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getCategory(id: string): Promise<Category | null> {
  const { data } = await client.models.Category.get({ id });
  return data as unknown as Category | null;
}

export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  const { data, errors } = await client.models.Category.create(input);
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
  return data as unknown as Category;
}

export async function updateCategory(input: UpdateCategoryInput): Promise<Category> {
  const { data, errors } = await client.models.Category.update(input);
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
  return data as unknown as Category;
}

export async function deleteCategory(id: string): Promise<void> {
  const { errors } = await client.models.Category.delete({ id });
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
}

/**
 * Count linked content per category, computed client-side (no GSIs available).
 * "splitContent" flags workouts/exercises whose parent program is in another category —
 * surfaced as a warning in the admin so mis-tagging can be corrected.
 */
export function computeCategoryCounts(
  categories: Category[],
  programs: { id: string; categoryID: string | null }[],
  workouts: { id: string; categoryID: string | null }[],
  exercises: { id: string; categoryID: string | null }[],
  mismatchedWorkoutIDs: Set<string> = new Set(),
): Map<string, CategoryCounts> {
  const result = new Map<string, CategoryCounts>();
  for (const cat of categories) {
    const programCount = programs.filter((p) => p.categoryID === cat.id).length;
    const workoutCount = workouts.filter((w) => w.categoryID === cat.id).length;
    const exerciseCount = exercises.filter((e) => e.categoryID === cat.id).length;
    // Split = workouts tagged to this category that sit under a program of another category.
    const splitContent = workouts.filter((w) => w.categoryID === cat.id && mismatchedWorkoutIDs.has(w.id)).length;
    result.set(cat.id, {
      programs: programCount,
      workouts: workoutCount,
      exercises: exerciseCount,
      total: programCount + workoutCount + exerciseCount,
      splitContent,
    });
  }
  return result;
}

export async function listCategoriesWithCounts(): Promise<CategoryWithCounts[]> {
  const [categories, programs, workouts, exercises, periods, periodWorkouts] = await Promise.all([
    listCategories(),
    listPrograms(),
    listWorkouts(),
    listExercises(),
    listAllPeriods(),
    listAllPeriodWorkouts(),
  ]);
  const mismatched = computeMismatchedFrom(programs, periods, periodWorkouts, workouts);
  const counts = computeCategoryCounts(categories, programs, workouts, exercises, mismatched);
  return categories.map((cat) => ({
    ...cat,
    counts: counts.get(cat.id) ?? { programs: 0, workouts: 0, exercises: 0, total: 0, splitContent: 0 },
  }));
}

/**
 * Swap sortOrder between two categories and persist both. Used by the ▲/▼ reorder controls.
 */
export async function swapCategorySortOrder(a: Category, b: Category): Promise<void> {
  await Promise.all([
    updateCategory({ id: a.id, sortOrder: b.sortOrder }),
    updateCategory({ id: b.id, sortOrder: a.sortOrder }),
  ]);
}

/**
 * Trigger the idempotent backend migration that seeds default categories and backfills
 * existing content to "Performance" (and publishes it). Admin-only.
 */
export async function runSeedMigration(): Promise<void> {
  const mutations = client.mutations as unknown as {
    seedProgramCategories: () => Promise<{ errors?: { message: string }[] }>;
  };
  const { errors } = await mutations.seedProgramCategories();
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
}
