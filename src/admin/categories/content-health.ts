import { listPrograms, listAllPeriods, listAllPeriodWorkouts } from '../programs/program-api';
import { listWorkouts } from '../workouts/workout-api';

interface HasCategory { id: string; categoryID: string | null }
interface PeriodLike { id: string; programID: string }
interface PeriodWorkoutLike { periodID: string; workoutID: string }

/**
 * Pure core: a workout is "split" when its category differs from a program that
 * contains it (workouts can be shared across programs). Joined in memory.
 */
export function computeMismatchedFrom(
  programs: HasCategory[],
  periods: PeriodLike[],
  periodWorkouts: PeriodWorkoutLike[],
  workouts: HasCategory[],
): Set<string> {
  const programCategory = new Map(programs.map((p) => [p.id, p.categoryID]));
  const periodProgram = new Map(periods.map((pd) => [pd.id, pd.programID]));
  const workoutCategory = new Map(workouts.map((w) => [w.id, w.categoryID]));

  const mismatched = new Set<string>();
  for (const pw of periodWorkouts) {
    const programID = periodProgram.get(pw.periodID);
    if (!programID) continue;
    const progCat = programCategory.get(programID);
    const woCat = workoutCategory.get(pw.workoutID);
    // Only flag when both sides have a category and they disagree.
    if (progCat && woCat && progCat !== woCat) mismatched.add(pw.workoutID);
  }
  return mismatched;
}

/** Fetch everything needed and return the set of mis-tagged workout IDs. */
export async function computeMismatchedWorkoutIDs(): Promise<Set<string>> {
  const [programs, periods, periodWorkouts, workouts] = await Promise.all([
    listPrograms(),
    listAllPeriods(),
    listAllPeriodWorkouts(),
    listWorkouts(),
  ]);
  return computeMismatchedFrom(programs, periods, periodWorkouts, workouts);
}
