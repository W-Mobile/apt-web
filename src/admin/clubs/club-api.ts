import { client } from '../amplify-config';

// Club onboarding (spec: Krav-klubb-onboarding.md). Models and the admin
// mutations live in apt-backend (amplify/data/resource.ts, functions/club-admin).
// The client here is untyped, so the calls are typed locally below.

export type ClubRole = 'COACH' | 'PLAYER';
export type MemberStatus = 'DRAFT' | 'INVITED' | 'JOINED' | 'REMOVED';

export interface Club {
  id: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  /** null = Unlimited */
  licenseLimit: number | null;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  createdAt: string;
}

export interface ClubMember {
  id: string;
  clubID: string;
  email: string;
  firstName: string;
  lastName: string;
  role: ClubRole | null;
  status: MemberStatus | null;
  coachMemberID: string | null;
  coachEmail: string | null;
  userID: string | null;
  invitedAt: string | null;
  joinedAt: string | null;
  lastActiveAt: string | null;
  createdAt: string;
}

export interface ClubInput {
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  licenseLimit: number | null;
  startDate: string;
  endDate: string;
}

export interface DraftInput {
  clubID: string;
  email: string;
  firstName: string;
  lastName: string;
  role: ClubRole;
  coachMemberID?: string | null;
  coachEmail?: string | null;
}

export type DraftPatch = Partial<Pick<ClubMember, 'email' | 'firstName' | 'lastName' | 'role' | 'coachMemberID' | 'coachEmail'>>;

export type DraftCheckCode =
  | 'REQUIRED'
  | 'INVALID_EMAIL'
  | 'DUPLICATE_IN_LIST'
  | 'ALREADY_IN_CLUB'
  | 'BELONGS_TO_OTHER_CLUB'
  | 'EXISTING_ACCOUNT'
  | 'COACH_REQUIRED'
  | 'COACH_NOT_FOUND';

export interface DraftCheck {
  memberID: string;
  code: DraftCheckCode;
  severity: 'error' | 'info';
  field: string | null;
}

export interface MemberResult {
  memberID: string;
  email: string | null;
  status: 'invited' | 'joined' | 'resent' | 'updated' | 'removed' | 'email-failed' | 'error';
  message: string | null;
}

export interface OperationResult {
  status: 'ok' | 'partial' | 'error';
  message: string | null;
  updatedCount: number | null;
  licensesUsed: number | null;
  licenseLimit: number | null;
  results: MemberResult[] | null;
}

/** Max members per adminSendClubInvitations call (backend MAX_SEND_BATCH). */
export const SEND_BATCH_SIZE = 25;

type AmplifyResult<T> = Promise<{ data: T | null; errors?: { message: string }[]; nextToken?: string | null }>;

interface ModelApi<T> {
  list(options?: Record<string, unknown>): AmplifyResult<T[]>;
  get(input: { id: string }): AmplifyResult<T>;
  create(input: Record<string, unknown>): AmplifyResult<T>;
  update(input: Record<string, unknown>, options?: { selectionSet?: string[] }): AmplifyResult<T>;
  delete(input: { id: string }): AmplifyResult<T>;
}

interface ClubModels {
  Club: ModelApi<Club>;
  ClubMember: ModelApi<ClubMember> & {
    listClubMemberByClubID(input: { clubID: string }, options?: Record<string, unknown>): AmplifyResult<ClubMember[]>;
  };
  User: ModelApi<{ id: string }>;
}

interface ClubMutations {
  adminUpdateClub(input: ClubInput & { clubID: string }): AmplifyResult<OperationResult>;
  adminSendClubInvitations(input: { clubID: string; memberIDs: string[] }): AmplifyResult<OperationResult>;
  adminResendClubInvitation(input: { memberID: string }): AmplifyResult<OperationResult>;
  adminChangeClubCoach(input: { memberIDs: string[]; coachMemberID: string }): AmplifyResult<OperationResult>;
  adminRemoveClubMember(input: { memberID: string; newCoachMemberID?: string | null }): AmplifyResult<OperationResult>;
}

interface ClubQueries {
  adminValidateClubDrafts(input: { clubID: string; memberIDs?: string[] }): AmplifyResult<{
    status: string;
    message: string | null;
    checks: DraftCheck[] | null;
  }>;
}

const models = client.models as unknown as ClubModels;
const mutations = client.mutations as unknown as ClubMutations;
const queries = client.queries as unknown as ClubQueries;

function throwOnErrors(errors?: { message: string }[]) {
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
}

async function listAll<T>(fetchPage: (nextToken?: string) => AmplifyResult<T[]>): Promise<T[]> {
  const all: T[] = [];
  let nextToken: string | null | undefined = undefined;
  do {
    const page: Awaited<AmplifyResult<T[]>> = await fetchPage(nextToken ?? undefined);
    throwOnErrors(page.errors);
    all.push(...(page.data ?? []).filter(Boolean));
    nextToken = page.nextToken;
  } while (nextToken);
  return all;
}

/** Turns a backend OperationResult with status 'error' into a thrown Error. */
function unwrapOperation(res: Awaited<AmplifyResult<OperationResult>>): OperationResult {
  throwOnErrors(res.errors);
  if (!res.data) throw new Error('Inget svar från servern');
  if (res.data.status === 'error' && !res.data.results?.length) {
    throw new Error(res.data.message ?? 'Okänt fel');
  }
  return res.data;
}

/* ---------------------------------- Clubs --------------------------------- */

export async function listClubs(): Promise<Club[]> {
  return listAll((nextToken) => models.Club.list({ nextToken, limit: 1000 }));
}

export async function getClub(id: string): Promise<Club | null> {
  const { data, errors } = await models.Club.get({ id });
  throwOnErrors(errors);
  return data;
}

export async function createClub(input: ClubInput): Promise<Club> {
  const { data, errors } = await models.Club.create({ ...input });
  throwOnErrors(errors);
  if (!data) throw new Error('Inget svar från servern');
  return data;
}

/** Edit a club. A changed end date is applied to every member by the backend. */
export async function updateClub(clubID: string, input: ClubInput): Promise<OperationResult> {
  return unwrapOperation(await mutations.adminUpdateClub({ clubID, ...input }));
}

/* --------------------------------- Members -------------------------------- */

export async function listClubMembers(clubID: string): Promise<ClubMember[]> {
  return listAll((nextToken) => models.ClubMember.listClubMemberByClubID({ clubID }, { nextToken, limit: 1000 }));
}

/** Every membership row in every club (for the club list counters). */
export async function listAllMembers(): Promise<ClubMember[]> {
  return listAll((nextToken) => models.ClubMember.list({ nextToken, limit: 1000 }));
}

export async function createDraft(input: DraftInput): Promise<ClubMember> {
  const { data, errors } = await models.ClubMember.create({
    ...input,
    email: input.email.trim().toLowerCase(),
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    coachEmail: input.coachEmail ? input.coachEmail.trim().toLowerCase() : null,
    coachMemberID: input.coachMemberID ?? null,
    status: 'DRAFT',
  });
  throwOnErrors(errors);
  if (!data) throw new Error('Inget svar från servern');
  return data;
}

export async function updateDraft(id: string, patch: DraftPatch): Promise<void> {
  const input: Record<string, unknown> = { id, ...patch };
  if (typeof patch.email === 'string') input.email = patch.email.trim().toLowerCase();
  if (typeof patch.firstName === 'string') input.firstName = patch.firstName.trim();
  if (typeof patch.lastName === 'string') input.lastName = patch.lastName.trim();
  const { errors } = await models.ClubMember.update(input);
  throwOnErrors(errors);
}

export async function deleteDrafts(ids: string[]): Promise<void> {
  for (const id of ids) {
    const { errors } = await models.ClubMember.delete({ id });
    throwOnErrors(errors);
  }
}

/** Edit first/last name of a sent member (email can't change after sending). */
export async function updateMemberName(member: ClubMember, firstName: string, lastName: string): Promise<void> {
  const first = firstName.trim();
  const last = lastName.trim();
  const { errors } = await models.ClubMember.update({ id: member.id, firstName: first, lastName: last });
  throwOnErrors(errors);
  if (member.userID) {
    // Select only id: User has owner-only fields (preferredCategoryID,
    // preferredViewMode) that an admin may not read, and selecting them makes
    // the call return errors even though the update succeeded.
    const res = await models.User.update({ id: member.userID, firstName: first, lastName: last }, { selectionSet: ['id'] });
    throwOnErrors(res.errors);
  }
}

/* ------------------------------ Admin operations -------------------------- */

export async function validateDrafts(clubID: string): Promise<DraftCheck[]> {
  const { data, errors } = await queries.adminValidateClubDrafts({ clubID });
  throwOnErrors(errors);
  if (!data || data.status === 'error') throw new Error(data?.message ?? 'Kunde inte kontrollera utkasten');
  return (data.checks ?? []).filter(Boolean);
}

/** Sends one batch (max SEND_BATCH_SIZE). Use sendInvitationsInBatches for more. */
export async function sendInvitations(clubID: string, memberIDs: string[]): Promise<OperationResult> {
  const res = await mutations.adminSendClubInvitations({ clubID, memberIDs });
  throwOnErrors(res.errors);
  if (!res.data) throw new Error('Inget svar från servern');
  return res.data;
}

export async function resendInvitation(memberID: string): Promise<OperationResult> {
  return unwrapOperation(await mutations.adminResendClubInvitation({ memberID }));
}

export async function changeCoach(memberIDs: string[], coachMemberID: string): Promise<OperationResult> {
  return unwrapOperation(await mutations.adminChangeClubCoach({ memberIDs, coachMemberID }));
}

export async function removeMember(memberID: string, newCoachMemberID?: string | null): Promise<OperationResult> {
  return unwrapOperation(await mutations.adminRemoveClubMember({ memberID, newCoachMemberID: newCoachMemberID ?? null }));
}
