import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Club, ClubMember, DraftCheck } from './club-api';
import { ClubDraftsTab } from './ClubDraftsTab';

const mockCreateDraft = vi.fn();
const mockValidateDrafts = vi.fn();
const mockSendInvitations = vi.fn();
const mockUpdateDraft = vi.fn();
const mockDeleteDrafts = vi.fn();

vi.mock('./club-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./club-api')>()),
  createDraft: (...args: unknown[]) => mockCreateDraft(...args),
  validateDrafts: (...args: unknown[]) => mockValidateDrafts(...args),
  sendInvitations: (...args: unknown[]) => mockSendInvitations(...args),
  updateDraft: (...args: unknown[]) => mockUpdateDraft(...args),
  deleteDrafts: (...args: unknown[]) => mockDeleteDrafts(...args),
}));

vi.mock('../contexts/NavigationGuardContext', () => ({
  useNavigationGuard: () => ({ navigate: vi.fn(), setDirty: vi.fn() }),
}));

const club: Club = {
  id: 'c1',
  name: 'Kvarnby Basket',
  contactName: null,
  contactEmail: null,
  licenseLimit: 50,
  startDate: '2026-09-01',
  endDate: '2027-08-31',
  createdAt: '',
};

let seq = 0;
function member(fields: Partial<ClubMember>): ClubMember {
  seq += 1;
  return {
    id: `m${seq}`,
    clubID: 'c1',
    email: `p${seq}@x.se`,
    firstName: `First${seq}`,
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

function joinedPlayers(n: number): ClubMember[] {
  return Array.from({ length: n }, () => member({ status: 'JOINED' }));
}

describe('ClubDraftsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seq = 0;
    mockValidateDrafts.mockResolvedValue([]);
  });

  it('shows the empty state', () => {
    render(<ClubDraftsTab club={club} members={[]} initialRole="COACH" onChanged={vi.fn()} />);
    expect(screen.getByText(/Inga utkast. Lägg till klubbcoacher eller spelare/)).toBeInTheDocument();
  });

  it('saves a manually added coach as a draft without sending anything', async () => {
    mockCreateDraft.mockResolvedValue(member({ role: 'COACH' }));
    const onChanged = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ClubDraftsTab club={club} members={[]} initialRole="COACH" onChanged={onChanged} />);

    await user.type(screen.getByLabelText('E-post'), 'Sara.Lind@Kvarnbybasket.se');
    await user.type(screen.getByLabelText('Förnamn'), 'Sara');
    await user.type(screen.getByLabelText('Efternamn'), 'Lind');
    await user.click(screen.getByRole('button', { name: 'Lägg till' }));

    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(mockCreateDraft).toHaveBeenCalledWith({
      clubID: 'c1',
      email: 'Sara.Lind@Kvarnbybasket.se',
      firstName: 'Sara',
      lastName: 'Lind',
      role: 'COACH',
      coachMemberID: null,
    });
    expect(mockSendInvitations).not.toHaveBeenCalled();
  });

  it('requires a coach for a manually added player', async () => {
    const user = userEvent.setup();
    const coach = member({ role: 'COACH', status: 'JOINED', firstName: 'Sara', lastName: 'Lind' });
    render(<ClubDraftsTab club={club} members={[coach]} initialRole="PLAYER" onChanged={vi.fn()} />);

    await user.type(screen.getByLabelText('E-post'), 'ida@x.se');
    await user.type(screen.getByLabelText('Förnamn'), 'Ida');
    await user.type(screen.getByLabelText('Efternamn'), 'Svensson');
    await user.click(screen.getByRole('button', { name: 'Lägg till' }));

    expect(screen.getByText('Välj en klubbcoach för spelaren.')).toBeInTheDocument();
    expect(mockCreateDraft).not.toHaveBeenCalled();
    expect(screen.getByRole('option', { name: 'Sara Lind · Ansluten' })).toBeInTheDocument();
  });

  it('shows local and server checks per row', async () => {
    const coach = member({ role: 'COACH', email: 'jonas@x.se', firstName: 'Jonas', lastName: 'Ek' });
    const bad = member({ email: 'omar.haddad@outlook', coachMemberID: coach.id });
    const noCoach = member({ email: 'leo@x.se' });
    const existing = member({ email: 'daniel@x.se', coachMemberID: coach.id });
    const server: DraftCheck[] = [{ memberID: existing.id, code: 'EXISTING_ACCOUNT', severity: 'info', field: 'email' }];
    mockValidateDrafts.mockResolvedValue(server);

    render(<ClubDraftsTab club={club} members={[coach, bad, noCoach, existing]} initialRole="PLAYER" onChanged={vi.fn()} />);

    expect(screen.getByText('Ogiltig e-post')).toBeInTheDocument();
    expect(screen.getAllByText('Välj klubbcoach').length).toBeGreaterThan(0);
    expect(screen.getByText('2 att åtgärda')).toBeInTheDocument();
    expect(await screen.findByText('Befintligt konto – läggs till i klubben')).toBeInTheDocument();
  });

  it('confirms with counts and the licence outcome, then sends coaches first', async () => {
    const coach = member({ role: 'COACH', email: 'jonas@x.se', firstName: 'Jonas', lastName: 'Ek' });
    const p1 = member({ coachMemberID: coach.id });
    const p2 = member({ coachMemberID: coach.id });
    const sent = joinedPlayers(49);
    mockSendInvitations.mockResolvedValue({
      status: 'ok',
      results: [coach, p1, p2].map((m) => ({ memberID: m.id, email: m.email, status: 'invited', message: null })),
    });
    const onChanged = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ClubDraftsTab club={club} members={[...sent, p1, coach, p2]} initialRole="PLAYER" onChanged={onChanged} />);

    const send = screen.getByRole('button', { name: /skicka inbjudningar/i });
    await waitFor(() => expect(send).toBeEnabled());
    await user.click(send);

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Skicka 1 klubbcoach- och 2 spelarinbjudningar till Kvarnby Basket?')).toBeInTheDocument();
    expect(within(dialog).getByText(/Detta ger 51 \/ 50 spelare/)).toBeInTheDocument();
    expect(mockSendInvitations).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: 'Skicka' }));

    await waitFor(() => expect(mockSendInvitations).toHaveBeenCalledWith('c1', [coach.id, p1.id, p2.id]));
    expect(await screen.findByText(/3 inbjudningar skickade/)).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalled();
  });

  it('offers to include the draft coach of selected players', async () => {
    const coach = member({ role: 'COACH', email: 'jonas@x.se', firstName: 'Jonas', lastName: 'Ek' });
    const p1 = member({ coachMemberID: coach.id });
    mockSendInvitations.mockResolvedValue({ status: 'ok', results: [] });
    const user = userEvent.setup();
    render(<ClubDraftsTab club={club} members={[coach, p1]} initialRole="PLAYER" onChanged={vi.fn().mockResolvedValue(undefined)} />);

    await user.click(screen.getByLabelText(`Markera ${p1.email}`));
    const send = screen.getByRole('button', { name: /skicka inbjudningar/i });
    await waitFor(() => expect(send).toBeEnabled());
    await user.click(send);

    const dialog = screen.getByRole('dialog');
    const include = within(dialog).getByRole('checkbox', { name: /Ta med klubbcoach Jonas Ek \(utkast\)/ });
    expect(include).toBeChecked();
    expect(within(dialog).getByText('Skicka 1 klubbcoach- och 1 spelarinbjudningar till Kvarnby Basket?')).toBeInTheDocument();

    // Without the coach the player can't be sent either.
    await user.click(include);
    expect(within(dialog).getByText('Inget att skicka')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Skicka' })).toBeDisabled();
  });

  it('never shows an over-limit warning for an unlimited club', async () => {
    const coach = member({ role: 'COACH', status: 'JOINED' });
    const p1 = member({ coachMemberID: coach.id });
    const user = userEvent.setup();
    render(
      <ClubDraftsTab club={{ ...club, licenseLimit: null }} members={[coach, ...joinedPlayers(80), p1]} initialRole="PLAYER" onChanged={vi.fn()} />,
    );
    const send = screen.getByRole('button', { name: /skicka inbjudningar/i });
    await waitFor(() => expect(send).toBeEnabled());
    await user.click(send);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/80 → 81 · Obegränsat/)).toBeInTheDocument();
    expect(within(dialog).queryByText(/Detta ger/)).not.toBeInTheDocument();
  });
});
