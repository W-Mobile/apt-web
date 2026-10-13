import { describe, it, expect } from 'vitest';
import type { ClubMember, DraftCheck } from './club-api';
import {
  countLicenses,
  isExpired,
  isOverLimit,
  licenseLabel,
  localDraftChecks,
  mergeChecks,
  planSend,
  resolveCoach,
  resultMessage,
  sendBatches,
  sendSummary,
} from './club-utils';

let seq = 0;
function member(fields: Partial<ClubMember>): ClubMember {
  seq += 1;
  return {
    id: `m${seq}`,
    clubID: 'c1',
    email: `p${seq}@x.se`,
    firstName: 'First',
    lastName: 'Last',
    role: 'PLAYER',
    status: 'DRAFT',
    coachMemberID: null,
    coachEmail: null,
    userID: null,
    invitedAt: null,
    joinedAt: null,
    lastActiveAt: null,
    createdAt: `2026-10-01T00:00:${String(seq).padStart(2, '0')}Z`,
    ...fields,
  };
}

describe('licences', () => {
  it('counts invited and joined players only', () => {
    const members = [
      member({ status: 'INVITED' }),
      member({ status: 'JOINED' }),
      member({ status: 'DRAFT' }),
      member({ status: 'REMOVED' }),
      member({ role: 'COACH', status: 'JOINED' }),
    ];
    expect(countLicenses(members)).toBe(2);
  });

  it('formats limited and unlimited clubs', () => {
    expect(licenseLabel({ licenseLimit: 50 }, 32)).toBe('32 / 50');
    expect(licenseLabel({ licenseLimit: null }, 74)).toBe('74 · Obegränsat');
  });

  it('is over the limit only for limited clubs', () => {
    expect(isOverLimit({ licenseLimit: 50 }, 54)).toBe(true);
    expect(isOverLimit({ licenseLimit: 50 }, 50)).toBe(false);
    expect(isOverLimit({ licenseLimit: null }, 5000)).toBe(false);
  });

  it('marks a club expired after its end date', () => {
    expect(isExpired({ endDate: '2026-09-30' }, '2026-10-01')).toBe(true);
    expect(isExpired({ endDate: '2026-10-01' }, '2026-10-01')).toBe(false);
  });
});

describe('local draft checks', () => {
  const codes = (checks: DraftCheck[], id: string) => checks.filter((c) => c.memberID === id).map((c) => c.code);

  it('flags required fields, invalid email and the second duplicate', () => {
    const coach = member({ role: 'COACH', email: 'coach@x.se' });
    const empty = member({ firstName: ' ', email: '', coachMemberID: coach.id });
    const invalid = member({ email: 'omar.haddad@outlook', coachMemberID: coach.id });
    const first = member({ email: 'maja@x.se', coachMemberID: coach.id });
    const dup = member({ email: 'MAJA@x.se', coachMemberID: coach.id });
    const checks = localDraftChecks([coach, empty, invalid, first, dup]);

    expect(codes(checks, coach.id)).toEqual([]);
    expect(codes(checks, empty.id)).toEqual(['REQUIRED', 'REQUIRED']);
    expect(codes(checks, invalid.id)).toEqual(['INVALID_EMAIL']);
    expect(codes(checks, first.id)).toEqual([]);
    expect(codes(checks, dup.id)).toEqual(['DUPLICATE_IN_LIST']);
  });

  it('requires a coach and resolves coach_email against draft and sent coaches', () => {
    const coach = member({ role: 'COACH', email: 'jonas@x.se', status: 'DRAFT' });
    const noCoach = member({});
    const byEmail = member({ coachEmail: 'Jonas@x.se' });
    const unknown = member({ coachEmail: 'nobody@x.se' });
    const removedCoach = member({ role: 'COACH', email: 'gone@x.se', status: 'REMOVED' });
    const toRemoved = member({ coachMemberID: removedCoach.id });
    const all = [coach, noCoach, byEmail, unknown, removedCoach, toRemoved];
    const checks = localDraftChecks(all);

    expect(codes(checks, noCoach.id)).toEqual(['COACH_REQUIRED']);
    expect(codes(checks, byEmail.id)).toEqual([]);
    expect(resolveCoach(byEmail, all)?.id).toBe(coach.id);
    expect(codes(checks, unknown.id)).toEqual(['COACH_NOT_FOUND']);
    expect(codes(checks, toRemoved.id)).toEqual(['COACH_NOT_FOUND']);
  });

  it('ignores server checks for rows that changed since the server ran', () => {
    const server: DraftCheck[] = [
      { memberID: 'a', code: 'ALREADY_IN_CLUB', severity: 'error', field: 'email' },
      { memberID: 'b', code: 'EXISTING_ACCOUNT', severity: 'info', field: 'email' },
    ];
    const merged = mergeChecks([], server, new Set(['a']));
    expect(merged.map((c) => c.memberID)).toEqual(['b']);
  });
});

describe('send planning', () => {
  it('sends drafts without errors, and offers draft coaches of chosen players', () => {
    const coach = member({ role: 'COACH', email: 'jonas@x.se' });
    const p1 = member({ coachMemberID: coach.id });
    const p2 = member({ coachMemberID: coach.id });
    const broken = member({ email: 'bad' });
    const all = [coach, p1, p2, broken];
    const checks = localDraftChecks(all);

    const everything = planSend(all, checks, new Set());
    expect(everything.coaches.map((m) => m.id)).toEqual([coach.id]);
    expect(everything.players.map((m) => m.id)).toEqual([p1.id, p2.id]);
    expect(everything.missingDraftCoaches).toEqual([]);

    const onlyPlayers = planSend(all, checks, new Set([p1.id, p2.id]));
    expect(onlyPlayers.coaches).toEqual([]);
    expect(onlyPlayers.missingDraftCoaches.map((m) => m.id)).toEqual([coach.id]);
  });

  it('does not offer a coach that is already sent', () => {
    const coach = member({ role: 'COACH', status: 'JOINED' });
    const p = member({ coachMemberID: coach.id });
    expect(planSend([coach, p], [], new Set([p.id])).missingDraftCoaches).toEqual([]);
  });

  it('puts coaches first and splits into batches of 25', () => {
    const coaches = ['c1', 'c2'];
    const players = Array.from({ length: 30 }, (_, i) => `p${i}`);
    const batches = sendBatches(coaches, players);
    expect(batches.map((b) => b.length)).toEqual([25, 7]);
    expect(batches[0].slice(0, 3)).toEqual(['c1', 'c2', 'p0']);
  });

  it('writes the confirmation title in Swedish', () => {
    expect(sendSummary(1, 22, 'Kvarnby Basket')).toBe('Skicka 1 klubbcoach- och 22 spelarinbjudningar till Kvarnby Basket?');
    expect(sendSummary(1, 0, 'Kvarnby Basket')).toBe('Skicka 1 klubbcoachinbjudan till Kvarnby Basket?');
    expect(sendSummary(0, 3, 'Kvarnby Basket')).toBe('Skicka 3 spelarinbjudningar till Kvarnby Basket?');
  });

  it('translates backend codes', () => {
    expect(resultMessage('COACH_NOT_SENT')).toBe('Klubbcoachen är inte skickad');
    expect(resultMessage('INVALID_EMAIL,COACH_REQUIRED')).toBe('Ogiltig e-post, Välj klubbcoach');
    expect(resultMessage('something else')).toBe('something else');
  });
});
