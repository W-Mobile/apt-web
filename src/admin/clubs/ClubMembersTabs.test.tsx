import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Club, ClubMember } from './club-api';
import { ClubCoachesTab } from './ClubCoachesTab';
import { ClubPlayersTab } from './ClubPlayersTab';

const mockResend = vi.fn();
const mockRemove = vi.fn();
const mockChangeCoach = vi.fn();
const mockUpdateName = vi.fn();

vi.mock('./club-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./club-api')>()),
  resendInvitation: (...args: unknown[]) => mockResend(...args),
  removeMember: (...args: unknown[]) => mockRemove(...args),
  changeCoach: (...args: unknown[]) => mockChangeCoach(...args),
  updateMemberName: (...args: unknown[]) => mockUpdateName(...args),
}));

const club: Club = { id: 'c1', name: 'Kvarnby Basket', contactName: null, contactEmail: null, licenseLimit: 50, startDate: '2026-09-01', endDate: '2027-08-31', createdAt: '' };

function member(fields: Partial<ClubMember> & { id: string }): ClubMember {
  return { clubID: 'c1', email: `${fields.id}@x.se`, firstName: fields.id, lastName: 'Test', role: 'PLAYER', status: 'JOINED', coachMemberID: null, coachEmail: null, userID: null, invitedAt: null, joinedAt: null, lastActiveAt: null, createdAt: '', ...fields };
}

const sara = member({ id: 'sara', firstName: 'Sara', lastName: 'Lind', role: 'COACH', status: 'JOINED' });
const jonas = member({ id: 'jonas', firstName: 'Jonas', lastName: 'Ek', role: 'COACH', status: 'INVITED' });
const elin = member({ id: 'elin', firstName: 'Elin', lastName: 'Johansson', coachMemberID: 'sara', lastActiveAt: '2026-10-08T18:42:00Z' });
const noah = member({ id: 'noah', firstName: 'Noah', lastName: 'Bergström', status: 'INVITED', coachMemberID: 'jonas' });
const orphan = member({ id: 'orphan', firstName: 'Utan', lastName: 'Coach', coachMemberID: null });
const gone = member({ id: 'gone', firstName: 'Borta', lastName: 'Spelare', status: 'REMOVED' });
const lucas = member({ id: 'lucas', firstName: 'Lucas', lastName: 'Nilsson', status: 'DECLINED', coachMemberID: 'jonas', declinedAt: '2026-10-19T10:00:00Z' });
const members = [sara, jonas, elin, noah, orphan, gone, lucas];

const ok = { status: 'ok', message: null, updatedCount: 1, licensesUsed: null, licenseLimit: null, results: [] };

describe('ClubCoachesTab', () => {
  beforeEach(() => vi.clearAllMocks());

  it('offers resend only to invited coaches', async () => {
    mockResend.mockResolvedValue(ok);
    const onChanged = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ClubCoachesTab club={club} members={members} onChanged={onChanged} onInviteCoach={vi.fn()} />);

    expect(screen.getAllByRole('button', { name: 'Skicka inbjudan igen' })).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Skicka inbjudan igen' }));
    await waitFor(() => expect(mockResend).toHaveBeenCalledWith('jonas'));
    expect(await screen.findByText('Ny inbjudan skickad till Jonas Ek.')).toBeInTheDocument();
  });

  it('requires a new coach before removing a coach with players', async () => {
    mockRemove.mockResolvedValue(ok);
    const user = userEvent.setup();
    render(<ClubCoachesTab club={club} members={members} onChanged={vi.fn().mockResolvedValue(undefined)} onInviteCoach={vi.fn()} />);

    const saraCard = screen.getByText('Sara Lind').closest('div')!.parentElement!;
    await user.click(within(saraCard).getByRole('button', { name: 'Ta bort' }));
    const dialog = screen.getByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: 'Ta bort och flytta' });
    expect(confirm).toBeDisabled();

    await user.selectOptions(within(dialog).getByLabelText(/Flytta spelaren till/), 'jonas');
    await user.click(confirm);
    await waitFor(() => expect(mockRemove).toHaveBeenCalledWith('sara', 'jonas'));
  });

  it('warns that players lose their coach when no other coach exists', async () => {
    const user = userEvent.setup();
    render(<ClubCoachesTab club={club} members={[sara, elin]} onChanged={vi.fn()} onInviteCoach={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Ta bort' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/markeras Ingen klubbcoach/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Ta bort' })).toBeEnabled();
  });
});

describe('ClubPlayersTab', () => {
  beforeEach(() => vi.clearAllMocks());

  it('hides removed players by default and flags players without a coach', async () => {
    const user = userEvent.setup();
    render(<ClubPlayersTab club={club} members={members} onChanged={vi.fn()} />);

    expect(screen.getByText('Elin Johansson')).toBeInTheDocument();
    expect(screen.queryByText('Borta Spelare')).not.toBeInTheDocument();
    expect(screen.getByText('Ingen klubbcoach')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Borttagen' }));
    expect(screen.getByText('Borta Spelare')).toBeInTheDocument();
  });

  it('filters by coach', async () => {
    const user = userEvent.setup();
    render(<ClubPlayersTab club={club} members={members} onChanged={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Jonas Ek' }));
    expect(screen.getByText('Noah Bergström')).toBeInTheDocument();
    expect(screen.queryByText('Elin Johansson')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ingen' }));
    expect(screen.getByText('Utan Coach')).toBeInTheDocument();
  });

  it('changes coach for selected players', async () => {
    mockChangeCoach.mockResolvedValue(ok);
    const user = userEvent.setup();
    render(<ClubPlayersTab club={club} members={members} onChanged={vi.fn().mockResolvedValue(undefined)} />);

    await user.click(screen.getByLabelText('Markera elin@x.se'));
    await user.click(screen.getByLabelText('Markera noah@x.se'));
    await user.click(screen.getByRole('button', { name: /Byt klubbcoach/ }));
    const dialog = screen.getByRole('dialog');
    await user.selectOptions(within(dialog).getByLabelText('Ny klubbcoach'), 'sara');
    await user.click(within(dialog).getByRole('button', { name: 'Byt klubbcoach' }));
    await waitFor(() => expect(mockChangeCoach).toHaveBeenCalledWith(['elin', 'noah'], 'sara'));
  });

  it('removes a player after confirmation', async () => {
    mockRemove.mockResolvedValue(ok);
    const user = userEvent.setup();
    render(<ClubPlayersTab club={club} members={members} onChanged={vi.fn().mockResolvedValue(undefined)} />);

    await user.click(screen.getByRole('button', { name: 'Åtgärder för elin@x.se' }));
    expect(screen.queryByRole('menuitem', { name: 'Skicka inbjudan igen' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('menuitem', { name: 'Ta bort från klubben' }));
    expect(mockRemove).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Ta bort' }));
    await waitFor(() => expect(mockRemove).toHaveBeenCalledWith('elin'));
  });

  it('shows players who declined and can invite them again', async () => {
    mockResend.mockResolvedValue(ok);
    const user = userEvent.setup();
    render(<ClubPlayersTab club={club} members={members} onChanged={vi.fn().mockResolvedValue(undefined)} />);

    const row = screen.getByText('Lucas Nilsson').closest('tr')!;
    expect(within(row).getByText('Tackat nej')).toBeInTheDocument();
    // A declined player has no licence and no active coach link.
    expect(within(row).queryByRole('checkbox')).not.toBeInTheDocument();

    await user.click(within(row).getByRole('button', { name: 'Åtgärder för lucas@x.se' }));
    expect(screen.queryByRole('menuitem', { name: 'Byt klubbcoach' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('menuitem', { name: 'Skicka inbjudan igen' }));
    await waitFor(() => expect(mockResend).toHaveBeenCalledWith('lucas'));
  });

  it('filters on Tackat nej', async () => {
    const user = userEvent.setup();
    render(<ClubPlayersTab club={club} members={members} onChanged={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Tackat nej' }));
    expect(screen.getByText('Lucas Nilsson')).toBeInTheDocument();
    expect(screen.queryByText('Elin Johansson')).not.toBeInTheDocument();
  });
});
