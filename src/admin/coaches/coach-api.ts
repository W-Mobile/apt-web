import { client } from '../amplify-config';
import { listPrograms } from '../programs/program-api';

export interface Coach {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CoachWithCounts extends Coach {
  programCount: number;
  imageFileKey: string | null;
}

export interface CreateCoachInput {
  name: string;
}

export interface UpdateCoachInput {
  id: string;
  name?: string;
}

interface Media {
  id: string;
  fileKey: string;
}

interface CoachMediaLink {
  id: string;
  coachID: string;
  mediaID: string;
}

export async function listCoaches(): Promise<Coach[]> {
  const all: Coach[] = [];
  let nextToken: string | null = null;
  do {
    const { data, nextToken: newToken } = await client.models.Coach.list({
      nextToken: nextToken ?? undefined,
    });
    all.push(...(data as unknown as Coach[]));
    nextToken = newToken ?? null;
  } while (nextToken);
  return all.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getCoach(id: string): Promise<Coach | null> {
  const { data } = await client.models.Coach.get({ id });
  return data as unknown as Coach | null;
}

export async function createCoach(input: CreateCoachInput): Promise<Coach> {
  const { data, errors } = await client.models.Coach.create(input);
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
  return data as unknown as Coach;
}

export async function updateCoach(input: UpdateCoachInput): Promise<Coach> {
  const { data, errors } = await client.models.Coach.update(input);
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
  return data as unknown as Coach;
}

export async function deleteCoach(id: string): Promise<void> {
  const existing = await getCoachImageMedia(id);
  if (existing) {
    await client.models.CoachMedia.delete({ id: existing.link.id });
    await client.models.Media.delete({ id: existing.media.id });
  }
  const { errors } = await client.models.Coach.delete({ id });
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
}

// --- Coach image (mirrors program poster: CoachMedia -> Media) ---

async function createMedia(fileKey: string): Promise<Media> {
  const { data, errors } = await client.models.Media.create({ fileKey, type: 'image' });
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
  return data as unknown as Media;
}

export async function getCoachImageMedia(coachID: string): Promise<{ link: CoachMediaLink; media: Media } | null> {
  const { data } = await client.models.CoachMedia.list({
    filter: { coachID: { eq: coachID } },
  });
  const links = data as unknown as CoachMediaLink[];
  if (!links.length) return null;
  const link = links[0];
  const { data: mediaData } = await client.models.Media.get({ id: link.mediaID });
  if (!mediaData) return null;
  return { link, media: mediaData as unknown as Media };
}

export async function linkCoachImage(coachID: string, fileKey: string): Promise<void> {
  const existing = await getCoachImageMedia(coachID);
  if (existing) {
    await client.models.CoachMedia.delete({ id: existing.link.id });
    await client.models.Media.delete({ id: existing.media.id });
  }
  const media = await createMedia(fileKey);
  const { errors } = await client.models.CoachMedia.create({ coachID, mediaID: media.id });
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
}

export async function listCoachesWithCounts(): Promise<CoachWithCounts[]> {
  const [coaches, programs] = await Promise.all([listCoaches(), listPrograms()]);
  const withCounts = await Promise.all(
    coaches.map(async (coach) => {
      const image = await getCoachImageMedia(coach.id);
      return {
        ...coach,
        programCount: programs.filter((p) => p.coachID === coach.id).length,
        imageFileKey: image?.media.fileKey ?? null,
      };
    }),
  );
  return withCounts;
}
