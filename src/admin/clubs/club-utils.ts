import type { Club, ClubMember, DraftCheck, DraftCheckCode, MemberResult } from './club-api';
import { SEND_BATCH_SIZE } from './club-api';

// Pure helpers for the Clubs admin. Mirrors the backend rules in
// apt-backend/amplify/functions/common/club/club-logic.ts so the draft list
// can show feedback immediately; the backend re-validates before sending.

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isActive(m: Pick<ClubMember, 'status'>): boolean {
  return m.status === 'INVITED' || m.status === 'JOINED';
}

export function fullName(m: Pick<ClubMember, 'firstName' | 'lastName'>): string {
  return `${m.firstName} ${m.lastName}`.trim();
}

export function initials(m: Pick<ClubMember, 'firstName' | 'lastName'>): string {
  return `${m.firstName.charAt(0)}${m.lastName.charAt(0)}`.toUpperCase() || '?';
}

/* -------------------------------- Licences -------------------------------- */

/** Licences used: players with status Invited or Joined. Coaches never count. */
export function countLicenses(members: ClubMember[]): number {
  return members.filter((m) => m.role === 'PLAYER' && isActive(m)).length;
}

export function countDraftPlayers(members: ClubMember[]): number {
  return members.filter((m) => m.role === 'PLAYER' && m.status === 'DRAFT').length;
}

export function isOverLimit(club: Pick<Club, 'licenseLimit'>, used: number): boolean {
  return club.licenseLimit !== null && used > club.licenseLimit;
}

/** "32 / 50" or "74 · Obegränsat" (spec §2.2). */
export function licenseLabel(club: Pick<Club, 'licenseLimit'>, used: number): string {
  return club.licenseLimit === null ? `${used} · Obegränsat` : `${used} / ${club.licenseLimit}`;
}

/** A club whose end date has passed (spec §2.1). `today` is YYYY-MM-DD. */
export function isExpired(club: Pick<Club, 'endDate'>, today: string = todayIso()): boolean {
  return club.endDate < today;
}

export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/* ------------------------------ Coach lookup ------------------------------ */

/** Coaches a player can be linked to: sent coaches and draft coaches. */
export function coachCandidates(members: ClubMember[]): ClubMember[] {
  return members
    .filter((m) => m.role === 'COACH' && m.status !== null && m.status !== 'REMOVED')
    .sort((a, b) => fullName(a).localeCompare(fullName(b), 'sv'));
}

/** The coach a draft player points to (coachMemberID, else imported coach email). */
export function resolveCoach(player: ClubMember, members: ClubMember[]): ClubMember | null {
  const candidates = coachCandidates(members);
  if (player.coachMemberID) return candidates.find((m) => m.id === player.coachMemberID) ?? null;
  if (player.coachEmail) {
    const email = normalizeEmail(player.coachEmail);
    return candidates.find((m) => normalizeEmail(m.email) === email) ?? null;
  }
  return null;
}

/* ---------------------------- Draft validation ---------------------------- */

/**
 * Checks that need no server data: required fields, email format, duplicates
 * in the draft list (flagged on every row after the first), missing or unknown
 * coach. "Already in this club", "belongs to another club" and "existing
 * account" come from the backend (validateDrafts).
 */
export function localDraftChecks(members: ClubMember[]): DraftCheck[] {
  const checks: DraftCheck[] = [];
  const add = (memberID: string, code: DraftCheckCode, field: string | null) =>
    checks.push({ memberID, code, severity: 'error', field });

  const drafts = members
    .filter((m) => m.status === 'DRAFT')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  const firstByEmail = new Map<string, string>();
  for (const d of drafts) {
    const email = normalizeEmail(d.email);
    if (email && !firstByEmail.has(email)) firstByEmail.set(email, d.id);
  }

  for (const d of drafts) {
    const email = normalizeEmail(d.email);
    if (!d.firstName.trim()) add(d.id, 'REQUIRED', 'firstName');
    if (!d.lastName.trim()) add(d.id, 'REQUIRED', 'lastName');
    if (!email) add(d.id, 'REQUIRED', 'email');
    else if (!isValidEmail(email)) add(d.id, 'INVALID_EMAIL', 'email');
    else if (firstByEmail.get(email) !== d.id) add(d.id, 'DUPLICATE_IN_LIST', 'email');

    if (d.role === 'PLAYER') {
      if (!d.coachMemberID && !d.coachEmail) add(d.id, 'COACH_REQUIRED', 'coach');
      else if (!resolveCoach(d, members)) add(d.id, 'COACH_NOT_FOUND', 'coach');
    }
  }
  return checks;
}

/**
 * Local checks plus the server's. Server checks for rows that changed since
 * the last server run are dropped (`staleIds`) until it has run again.
 */
export function mergeChecks(local: DraftCheck[], server: DraftCheck[], staleIds: Set<string> = new Set()): DraftCheck[] {
  const merged = [...local];
  const seen = new Set(local.map((c) => `${c.memberID}:${c.code}`));
  for (const c of server) {
    if (staleIds.has(c.memberID)) continue;
    const key = `${c.memberID}:${c.code}`;
    if (!seen.has(key)) {
      merged.push(c);
      seen.add(key);
    }
  }
  return merged;
}

export function checksByMember(checks: DraftCheck[]): Map<string, DraftCheck[]> {
  const map = new Map<string, DraftCheck[]>();
  for (const c of checks) map.set(c.memberID, [...(map.get(c.memberID) ?? []), c]);
  return map;
}

export function hasErrors(checks: DraftCheck[] | undefined): boolean {
  return !!checks?.some((c) => c.severity === 'error');
}

const CHECK_LABELS: Record<DraftCheckCode, string> = {
  REQUIRED: 'Obligatoriskt fält saknas',
  INVALID_EMAIL: 'Ogiltig e-post',
  DUPLICATE_IN_LIST: 'Dubblett i listan',
  ALREADY_IN_CLUB: 'Redan i klubben',
  BELONGS_TO_OTHER_CLUB: 'Tillhör en annan klubb',
  EXISTING_ACCOUNT: 'Befintligt konto – läggs till i klubben',
  COACH_REQUIRED: 'Välj klubbcoach',
  COACH_NOT_FOUND: 'Klubbcoachen finns inte i klubben',
};

export function checkLabel(code: string): string {
  return CHECK_LABELS[code as DraftCheckCode] ?? code;
}

/* --------------------------------- Sending -------------------------------- */

export interface SendPlan {
  coaches: ClubMember[];
  players: ClubMember[];
  /** Draft coaches of the chosen players that aren't chosen themselves. */
  missingDraftCoaches: ClubMember[];
}

/**
 * What "Skicka inbjudningar" will send: the chosen drafts without errors
 * (selected rows, or every draft when nothing is selected).
 */
export function planSend(members: ClubMember[], checks: DraftCheck[], selectedIds: Set<string>): SendPlan {
  const byMember = checksByMember(checks);
  const chosen = members.filter(
    (m) => m.status === 'DRAFT' && (selectedIds.size === 0 || selectedIds.has(m.id)) && !hasErrors(byMember.get(m.id)),
  );
  const coaches = chosen.filter((m) => m.role === 'COACH');
  const players = chosen.filter((m) => m.role === 'PLAYER');
  const chosenIds = new Set(chosen.map((m) => m.id));
  const missing = new Map<string, ClubMember>();
  for (const p of players) {
    const coach = resolveCoach(p, members);
    if (coach && coach.status === 'DRAFT' && !chosenIds.has(coach.id) && !hasErrors(byMember.get(coach.id))) {
      missing.set(coach.id, coach);
    }
  }
  return { coaches, players, missingDraftCoaches: [...missing.values()] };
}

/**
 * Member ids in send order — coaches first so players can link to a coach
 * sent in the same run — split into backend-sized batches.
 */
export function sendBatches(coachIds: string[], playerIds: string[], size: number = SEND_BATCH_SIZE): string[][] {
  const ordered = [...coachIds, ...playerIds];
  const batches: string[][] = [];
  for (let i = 0; i < ordered.length; i += size) batches.push(ordered.slice(i, i + size));
  return batches;
}

/** "Skicka 1 klubbcoach- och 22 spelarinbjudningar till Kvarnby Basket?" */
export function sendSummary(coachCount: number, playerCount: number, clubName: string): string {
  const parts: string[] = [];
  if (coachCount && playerCount) parts.push(`${coachCount} klubbcoach- och ${playerCount} spelarinbjudningar`);
  else if (coachCount) parts.push(`${coachCount} ${coachCount === 1 ? 'klubbcoachinbjudan' : 'klubbcoachinbjudningar'}`);
  else parts.push(`${playerCount} ${playerCount === 1 ? 'spelarinbjudan' : 'spelarinbjudningar'}`);
  return `Skicka ${parts[0]} till ${clubName}?`;
}

const RESULT_MESSAGES: Record<string, string> = {
  COACH_NOT_SENT: 'Klubbcoachen är inte skickad',
  NOT_A_DRAFT: 'Redan skickad',
  MEMBER_NOT_FOUND: 'Raden finns inte längre',
  ACCOUNT_EXISTS_WITHOUT_USER: 'Kontot finns men saknar användarprofil – kontakta utvecklare',
  NEW_COACH_REQUIRED: 'Välj en klubbcoach som tar över spelarna',
  NEW_COACH_NOT_FOUND: 'Den valda klubbcoachen finns inte',
  NOT_INVITED: 'Kan bara skickas igen till inbjudna',
  ALREADY_JOINED: 'Personen har redan anslutit',
  COACH_NOT_FOUND: 'Klubbcoachen finns inte',
  DIFFERENT_CLUB: 'Tillhör en annan klubb',
  NOT_AN_ACTIVE_PLAYER: 'Inte en aktiv spelare',
};

/** Swedish text for a backend result/error code (comma-separated codes allowed). */
export function resultMessage(message: string | null | undefined): string {
  if (!message) return '';
  return message
    .split(',')
    .map((code) => RESULT_MESSAGES[code.trim()] ?? CHECK_LABELS[code.trim() as DraftCheckCode] ?? code.trim())
    .join(', ');
}

export interface SendOutcome {
  sent: number;
  joined: number;
  emailFailed: MemberResult[];
  failed: MemberResult[];
}

export function summarizeResults(results: MemberResult[]): SendOutcome {
  return {
    sent: results.filter((r) => r.status === 'invited').length,
    joined: results.filter((r) => r.status === 'joined').length,
    emailFailed: results.filter((r) => r.status === 'email-failed'),
    failed: results.filter((r) => r.status === 'error'),
  };
}
