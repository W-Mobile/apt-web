import { client } from '../amplify-config';

export type OnboardStatus = 'created' | 'exists' | 'error';

export interface OnboardResult {
  email: string;
  status: OnboardStatus;
  tempPassword?: string | null;
  message?: string | null;
}

// The `adminCreateSubscriber` mutation is implemented in the apt-backend repo
// (branch feat/admin-create-subscriber). Until that deploys and
// `amplify_outputs.json` is refreshed, it is absent from the generated Schema
// types, so the call is typed locally here. Swap for the generated
// `client.mutations.adminCreateSubscriber` typing once available.
interface AdminCreateSubscriberInput {
  email: string;
  subscriberUntil: string;
}

type AdminCreateSubscriberFn = (
  input: AdminCreateSubscriberInput
) => Promise<{ data: OnboardResult | null; errors?: { message: string }[] }>;

export async function createSubscriber(email: string, subscriberUntil: string): Promise<OnboardResult> {
  const mutations = client.mutations as unknown as { adminCreateSubscriber: AdminCreateSubscriberFn };
  const { data, errors } = await mutations.adminCreateSubscriber({ email, subscriberUntil });
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
  if (!data) throw new Error('Inget svar från servern');
  return data;
}
