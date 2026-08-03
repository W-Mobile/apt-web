import { client } from '../amplify-config';

export type ExtendStatus = 'extended' | 'too-early' | 'not-found' | 'error';

export interface ExtendResult {
  email: string;
  status: ExtendStatus;
  previousUntil?: string | null;
  subscriberUntil?: string | null;
  message?: string | null;
}

export interface SubscriberLookup {
  email: string;
  subscriberUntil: string | null;
}

// Look up an existing subscriber by email to read their current end date. Reads
// the User model directly (ADMINS-authorised, same access path feedback-api uses
// for listUsers). Returns null when no user matches the email.
//
// There is no secondary index on `email`, so this is a filtered scan. IMPORTANT:
// Amplify's `limit` caps how many rows DynamoDB evaluates BEFORE the filter is
// applied, not how many results come back — a `limit: 1` scan returns [] unless
// the target happens to be the first row. We therefore omit `limit` and page
// through `nextToken` until the match is found (or the table is exhausted).
export async function getSubscriberByEmail(email: string): Promise<SubscriberLookup | null> {
  const target = email.trim().toLowerCase();
  let nextToken: string | null = null;
  do {
    const { data, errors, nextToken: newToken } = await client.models.User.list({
      filter: { email: { eq: target } },
      nextToken: nextToken ?? undefined,
    });
    if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
    const first = (data as unknown as SubscriberLookup[] | undefined)?.[0];
    if (first) return { email: first.email, subscriberUntil: first.subscriberUntil ?? null };
    nextToken = newToken ?? null;
  } while (nextToken);
  return null;
}

// The `adminExtendSubscriber` mutation is implemented in the apt-backend repo.
// Until the local `amplify_outputs.json` is refreshed with it, it is absent from
// the generated Schema types, so the call is typed locally here. Swap for the
// generated `client.mutations.adminExtendSubscriber` typing once available.
interface AdminExtendSubscriberInput {
  email: string;
  subscriberUntil: string;
}

type AdminExtendSubscriberFn = (
  input: AdminExtendSubscriberInput
) => Promise<{ data: ExtendResult | null; errors?: { message: string }[] }>;

export async function extendSubscriber(
  email: string,
  subscriberUntil: string
): Promise<ExtendResult> {
  const mutations = client.mutations as unknown as { adminExtendSubscriber: AdminExtendSubscriberFn };
  const { data, errors } = await mutations.adminExtendSubscriber({ email, subscriberUntil });
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
  if (!data) throw new Error('Inget svar från servern');
  return data;
}
