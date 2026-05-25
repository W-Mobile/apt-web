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

export interface AdminUser {
  id: string;
  owner: string;
  email: string;
}

export async function listUsers(): Promise<AdminUser[]> {
  const all: AdminUser[] = [];
  let nextToken: string | null = null;
  do {
    const { data, nextToken: newToken } = await client.models.User.list({
      nextToken: nextToken ?? undefined,
    });
    all.push(...(data as unknown as AdminUser[]));
    nextToken = newToken ?? null;
  } while (nextToken);
  return all;
}

export async function getUserByOwnerSub(sub: string): Promise<AdminUser | null> {
  const { data } = await client.models.User.list({
    filter: { owner: { eq: sub } },
    limit: 1,
  });
  const first = (data as unknown as AdminUser[] | undefined)?.[0];
  return first ?? null;
}

export function buildEmailMap(users: AdminUser[]): Map<string, string> {
  return new Map(users.map((u) => [u.owner, u.email]));
}

export function displayEmailFor(emailMap: Map<string, string>, sub: string): string {
  return emailMap.get(sub) ?? `${sub.slice(0, 8)}…`;
}
