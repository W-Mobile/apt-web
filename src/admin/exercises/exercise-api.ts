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

// --- Media ---

export interface Media {
  id: string;
  fileKey: string;
  type: string;
}

export interface ExerciseMediaLink {
  id: string;
  exerciseID: string;
  mediaID: string;
}

async function createMedia(fileKey: string, type: 'video' | 'image'): Promise<Media> {
  const { data, errors } = await client.models.Media.create({ fileKey, type });
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
  return data as unknown as Media;
}

export async function getExerciseVideoMedia(exerciseID: string): Promise<{ link: ExerciseMediaLink; media: Media } | null> {
  const { data } = await client.models.ExerciseVideoMedia.list({
    filter: { exerciseID: { eq: exerciseID } },
  });
  const links = data as unknown as ExerciseMediaLink[];
  if (!links.length) return null;
  const link = links[0];
  const { data: mediaData } = await client.models.Media.get({ id: link.mediaID });
  if (!mediaData) return null;
  return { link, media: mediaData as unknown as Media };
}

export async function getExercisePosterMedia(exerciseID: string): Promise<{ link: ExerciseMediaLink; media: Media } | null> {
  const { data } = await client.models.ExercisePosterMedia.list({
    filter: { exerciseID: { eq: exerciseID } },
  });
  const links = data as unknown as ExerciseMediaLink[];
  if (!links.length) return null;
  const link = links[0];
  const { data: mediaData } = await client.models.Media.get({ id: link.mediaID });
  if (!mediaData) return null;
  return { link, media: mediaData as unknown as Media };
}

export async function linkExerciseVideo(exerciseID: string, fileKey: string): Promise<void> {
  const existing = await getExerciseVideoMedia(exerciseID);
  if (existing) {
    await client.models.ExerciseVideoMedia.delete({ id: existing.link.id });
    await client.models.Media.delete({ id: existing.media.id });
  }
  const media = await createMedia(fileKey, 'video');
  const { errors } = await client.models.ExerciseVideoMedia.create({ exerciseID, mediaID: media.id });
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
}

export async function linkExercisePoster(exerciseID: string, fileKey: string): Promise<void> {
  const existing = await getExercisePosterMedia(exerciseID);
  if (existing) {
    await client.models.ExercisePosterMedia.delete({ id: existing.link.id });
    await client.models.Media.delete({ id: existing.media.id });
  }
  const media = await createMedia(fileKey, 'image');
  const { errors } = await client.models.ExercisePosterMedia.create({ exerciseID, mediaID: media.id });
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
}
