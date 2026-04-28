import { client } from '../amplify-config';

export interface Workout {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutExercise {
  id: string;
  workoutID: string;
  exerciseID: string;
  sortOrder: number;
  superset: string | null;
  sets: string;
  reps: string;
}

export interface CreateWorkoutInput {
  name: string;
  description: string;
}

export interface CreateWorkoutExerciseInput {
  workoutID: string;
  exerciseID: string;
  sortOrder: number;
  superset?: string;
  sets: string;
  reps: string;
}

export async function listWorkouts(): Promise<Workout[]> {
  const all: Workout[] = [];
  let nextToken: string | null = null;
  do {
    const { data, nextToken: newToken } = await client.models.Workout.list({
      nextToken: nextToken ?? undefined,
    });
    all.push(...(data as unknown as Workout[]));
    nextToken = newToken ?? null;
  } while (nextToken);
  return all;
}

export async function getWorkout(id: string): Promise<Workout | null> {
  const { data } = await client.models.Workout.get({ id });
  return data as unknown as Workout | null;
}

export async function createWorkout(input: CreateWorkoutInput): Promise<Workout> {
  const { data, errors } = await client.models.Workout.create(input);
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
  return data as unknown as Workout;
}

export async function updateWorkout(input: { id: string; name?: string; description?: string }): Promise<Workout> {
  const { data, errors } = await client.models.Workout.update(input);
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
  return data as unknown as Workout;
}

export async function deleteWorkout(id: string): Promise<void> {
  const { errors } = await client.models.Workout.delete({ id });
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
}

export async function getWorkoutExercises(workoutID: string): Promise<WorkoutExercise[]> {
  const all: WorkoutExercise[] = [];
  let nextToken: string | null = null;
  do {
    const { data, nextToken: newToken } = await client.models.WorkoutExercise.list({
      filter: { workoutID: { eq: workoutID } },
      nextToken: nextToken ?? undefined,
    });
    all.push(...(data as unknown as WorkoutExercise[]));
    nextToken = newToken ?? null;
  } while (nextToken);
  return all.sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function createWorkoutExercise(input: CreateWorkoutExerciseInput): Promise<WorkoutExercise> {
  const { data, errors } = await client.models.WorkoutExercise.create(input);
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
  return data as unknown as WorkoutExercise;
}

export async function deleteWorkoutExercise(id: string): Promise<void> {
  const { errors } = await client.models.WorkoutExercise.delete({ id });
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
}
