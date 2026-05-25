import { client } from '../amplify-config';

export type FeedbackCategory = 'BUG' | 'SUGGESTION' | 'PRAISE' | 'OTHER';

export interface Feedback {
  id: string;
  userId: string;
  category: FeedbackCategory;
  message: string | null;
  appVersion: string;
  platform: string;
  deviceModel: string;
  osVersion: string;
  isRead: boolean | null;
  isResolved: boolean | null;
  owner: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateFeedbackInput {
  id: string;
  isRead?: boolean;
  isResolved?: boolean;
}

export async function listFeedback(): Promise<Feedback[]> {
  const all: Feedback[] = [];
  let nextToken: string | null = null;
  do {
    const { data, nextToken: newToken } = await client.models.Feedback.list({
      nextToken: nextToken ?? undefined,
    });
    all.push(...(data as unknown as Feedback[]));
    nextToken = newToken ?? null;
  } while (nextToken);
  return all;
}

export async function getFeedback(id: string): Promise<Feedback | null> {
  const { data } = await client.models.Feedback.get({ id });
  return data as unknown as Feedback | null;
}

export async function updateFeedback(input: UpdateFeedbackInput): Promise<Feedback> {
  const { data, errors } = await client.models.Feedback.update(input);
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
  return data as unknown as Feedback;
}
