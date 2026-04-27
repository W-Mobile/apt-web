import { client } from '../amplify-config';

export interface Exercise {
  id: string;
  name: string;
  description: string | null;
  equipment: string;
  tags: string[] | null;
  isVisibleInDiscover: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExerciseInput {
  name: string;
  description?: string;
  equipment: string;
  tags?: string[];
  isVisibleInDiscover?: boolean;
}

export interface UpdateExerciseInput {
  id: string;
  name?: string;
  description?: string;
  equipment?: string;
  tags?: string[];
  isVisibleInDiscover?: boolean;
}

export async function listExercises(): Promise<Exercise[]> {
  const allExercises: Exercise[] = [];
  let nextToken: string | null = null;

  do {
    const { data, nextToken: newToken } = await client.models.Exercise.list({
      nextToken: nextToken ?? undefined,
    });
    allExercises.push(...(data as unknown as Exercise[]));
    nextToken = newToken ?? null;
  } while (nextToken);

  return allExercises;
}

export async function getExercise(id: string): Promise<Exercise | null> {
  const { data } = await client.models.Exercise.get({ id });
  return data as unknown as Exercise | null;
}

export async function createExercise(input: CreateExerciseInput): Promise<Exercise> {
  const { data, errors } = await client.models.Exercise.create(input);
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
  return data as unknown as Exercise;
}

export async function updateExercise(input: UpdateExerciseInput): Promise<Exercise> {
  const { data, errors } = await client.models.Exercise.update(input);
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
  return data as unknown as Exercise;
}

export async function deleteExercise(id: string): Promise<void> {
  const { errors } = await client.models.Exercise.delete({ id });
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
}
