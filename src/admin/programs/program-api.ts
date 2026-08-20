import { client } from '../amplify-config';
import { updateWorkout, getWorkoutExercises } from '../workouts/workout-api';
import { updateExercise } from '../exercises/exercise-api';

export interface Program {
  id: string;
  name: string;
  description: string;
  equipment: string;
  marketingText: string;
  warmupWorkoutID: string | null;
  categoryID: string | null;
  coachID: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Period {
  id: string;
  programID: string;
  from: number;
  to: number;
}

export interface PeriodWorkout {
  id: string;
  periodID: string;
  workoutID: string;
  workoutName: string | null;
  sortOrder: number;
}

export interface CreateProgramInput {
  name: string;
  description: string;
  equipment: string;
  marketingText?: string;
  warmupWorkoutID?: string;
  categoryID: string;
  coachID?: string;
}

export async function listPrograms(): Promise<Program[]> {
  const all: Program[] = [];
  let nextToken: string | null = null;
  do {
    const { data, nextToken: newToken } = await client.models.Program.list({
      nextToken: nextToken ?? undefined,
    });
    all.push(...(data as unknown as Program[]));
    nextToken = newToken ?? null;
  } while (nextToken);
  return all;
}

export async function getProgram(id: string): Promise<Program | null> {
  const { data } = await client.models.Program.get({ id });
  return data as unknown as Program | null;
}

export async function createProgram(input: CreateProgramInput): Promise<Program> {
  const { data, errors } = await client.models.Program.create(input);
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
  return data as unknown as Program;
}

export async function updateProgram(input: { id: string; name?: string; description?: string; equipment?: string; marketingText?: string; warmupWorkoutID?: string | null; categoryID?: string | null; coachID?: string | null }): Promise<Program> {
  const { data, errors } = await client.models.Program.update(input);
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
  return data as unknown as Program;
}

/**
 * Collect every workout (incl. warmup) and exercise reachable from a program,
 * following periods -> periodWorkouts -> workout -> workoutExercises -> exercise.
 * Note: workouts can be shared across programs, so moving them affects those programs too.
 */
export async function getProgramContentIds(
  programID: string,
  warmupWorkoutID: string | null,
): Promise<{ workoutIDs: string[]; exerciseIDs: string[] }> {
  const periods = await getPeriods(programID);
  const workoutIDs = new Set<string>();
  if (warmupWorkoutID) workoutIDs.add(warmupWorkoutID);
  for (const p of periods) {
    const pws = await getPeriodWorkouts(p.id);
    pws.forEach((pw) => workoutIDs.add(pw.workoutID));
  }
  const exerciseIDs = new Set<string>();
  for (const wid of workoutIDs) {
    const wes = await getWorkoutExercises(wid);
    wes.forEach((we) => exerciseIDs.add(we.exerciseID));
  }
  return { workoutIDs: [...workoutIDs], exerciseIDs: [...exerciseIDs] };
}

/**
 * Move a program's workouts and their exercises to the given category, so content
 * doesn't end up split across categories when the program's category changes.
 */
export async function moveProgramContentToCategory(
  programID: string,
  categoryID: string,
  warmupWorkoutID: string | null,
): Promise<void> {
  const { workoutIDs, exerciseIDs } = await getProgramContentIds(programID, warmupWorkoutID);
  await Promise.all([
    ...workoutIDs.map((id) => updateWorkout({ id, categoryID })),
    ...exerciseIDs.map((id) => updateExercise({ id, categoryID })),
  ]);
}

export async function deleteProgram(id: string): Promise<void> {
  const { errors } = await client.models.Program.delete({ id });
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
}

/** Every period across all programs (unfiltered) — for cross-program content-health checks. */
export async function listAllPeriods(): Promise<Period[]> {
  const all: Period[] = [];
  let nextToken: string | null = null;
  do {
    const { data, nextToken: newToken } = await client.models.Period.list({
      nextToken: nextToken ?? undefined,
    });
    all.push(...(data as unknown as Period[]));
    nextToken = newToken ?? null;
  } while (nextToken);
  return all;
}

/** Every period-workout link across all programs (unfiltered). */
export async function listAllPeriodWorkouts(): Promise<PeriodWorkout[]> {
  const all: PeriodWorkout[] = [];
  let nextToken: string | null = null;
  do {
    const { data, nextToken: newToken } = await client.models.PeriodWorkout.list({
      nextToken: nextToken ?? undefined,
    });
    all.push(...(data as unknown as PeriodWorkout[]));
    nextToken = newToken ?? null;
  } while (nextToken);
  return all;
}

export async function getPeriods(programID: string): Promise<Period[]> {
  const all: Period[] = [];
  let nextToken: string | null = null;
  do {
    const { data, nextToken: newToken } = await client.models.Period.list({
      filter: { programID: { eq: programID } },
      nextToken: nextToken ?? undefined,
    });
    all.push(...(data as unknown as Period[]));
    nextToken = newToken ?? null;
  } while (nextToken);
  return all.sort((a, b) => a.from - b.from);
}

export async function createPeriod(input: { programID: string; from: number; to: number }): Promise<Period> {
  const { data, errors } = await client.models.Period.create(input);
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
  return data as unknown as Period;
}

export async function deletePeriod(id: string): Promise<void> {
  const { errors } = await client.models.Period.delete({ id });
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
}

export async function getPeriodWorkouts(periodID: string): Promise<PeriodWorkout[]> {
  const all: PeriodWorkout[] = [];
  let nextToken: string | null = null;
  do {
    const { data, nextToken: newToken } = await client.models.PeriodWorkout.list({
      filter: { periodID: { eq: periodID } },
      nextToken: nextToken ?? undefined,
    });
    all.push(...(data as unknown as PeriodWorkout[]));
    nextToken = newToken ?? null;
  } while (nextToken);
  return all.sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function createPeriodWorkout(input: { periodID: string; workoutID: string; workoutName?: string; sortOrder: number }): Promise<PeriodWorkout> {
  const { data, errors } = await client.models.PeriodWorkout.create(input);
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
  return data as unknown as PeriodWorkout;
}

export async function deletePeriodWorkout(id: string): Promise<void> {
  const { errors } = await client.models.PeriodWorkout.delete({ id });
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
}

// --- Media ---

export interface Media {
  id: string;
  fileKey: string;
  type: string;
}

export interface ProgramMediaLink {
  id: string;
  programID: string;
  mediaID: string;
}

async function createMedia(fileKey: string, type: 'image'): Promise<Media> {
  const { data, errors } = await client.models.Media.create({ fileKey, type });
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
  return data as unknown as Media;
}

export async function getProgramPosterMedia(programID: string): Promise<{ link: ProgramMediaLink; media: Media } | null> {
  const { data } = await client.models.ProgramMedia.list({
    filter: { programID: { eq: programID } },
  });
  const links = data as unknown as ProgramMediaLink[];
  if (!links.length) return null;
  const link = links[0];
  const { data: mediaData } = await client.models.Media.get({ id: link.mediaID });
  if (!mediaData) return null;
  return { link, media: mediaData as unknown as Media };
}

export async function linkProgramPoster(programID: string, fileKey: string): Promise<void> {
  const existing = await getProgramPosterMedia(programID);
  if (existing) {
    await client.models.ProgramMedia.delete({ id: existing.link.id });
    await client.models.Media.delete({ id: existing.media.id });
  }
  const media = await createMedia(fileKey, 'image');
  const { errors } = await client.models.ProgramMedia.create({ programID, mediaID: media.id });
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
}
