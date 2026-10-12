import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { Club, ClubMember } from './club-api';
import { ClubList, buildClubRows } from './ClubList';

const mockListClubs = vi.fn();
const mockListAllMembers = vi.fn();
const mockNavigate = vi.fn();

vi.mock('./club-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./club-api')>()),
  listClubs: () => mockListClubs(),
  listAllMembers: () => mockListAllMembers(),
}));

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => mockNavigate,
}));

function club(fields: Partial<Club>): Club {
  return { id: 'c1', name: 'Kvarnby Basket', contactName: null, contactEmail: null, licenseLimit: 50, startDate: '2026-09-01', endDate: '2099-08-31', createdAt: '2026-09-14T10:22:00Z', ...fields };
}

function member(fields: Partial<ClubMember>): ClubMember {
  return { id: Math.random().toString(), clubID: 'c1', email: 'x@x.se', firstName: 'A', lastName: 'B', role: 'PLAYER', status: 'JOINED', coachMemberID: null, coachEmail: null, userID: null, invitedAt: null, joinedAt: null, lastActiveAt: null, createdAt: '', ...fields };
}

describe('buildClubRows', () => {
  it('counts licences, coaches and flags over-limit and expired clubs', () => {
    const rows = buildClubRows(
      [club({ id: 'c1', licenseLimit: 1 }), club({ id: 'c2', name: 'Östra Kvarnen', licenseLimit: null, endDate: '2025-01-01' })],
      [
        member({ clubID: 'c1' }),
        member({ clubID: 'c1', status: 'INVITED' }),
        member({ clubID: 'c1', role: 'COACH' }),
        member({ clubID: 'c1', status: 'DRAFT' }),
      ],
      '2026-10-12',
    );
    expect(rows[0]).toMatchObject({ licenses: '2 / 1', coachCount: 1, playerCount: 2, overLimit: true, expired: false });
    expect(rows[1]).toMatchObject({ licenses: '0 · Obegränsat', overLimit: false, expired: true });
  });
});

describe('ClubList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the empty state', async () => {
    mockListClubs.mockResolvedValue([]);
    mockListAllMembers.mockResolvedValue([]);
    render(<MemoryRouter><ClubList /></MemoryRouter>);
    expect(await screen.findByText(/inga klubbar tillagda ännu/i)).toBeInTheDocument();
  });

  it('lists clubs, filters expired ones and opens a club', async () => {
    mockListClubs.mockResolvedValue([club({ id: 'c1' }), club({ id: 'c2', name: 'Östra Kvarnen', endDate: '2020-01-01' })]);
    mockListAllMembers.mockResolvedValue([]);
    const user = userEvent.setup();
    render(<MemoryRouter><ClubList /></MemoryRouter>);

    expect(await screen.findByText('Kvarnby Basket')).toBeInTheDocument();
    expect(screen.getByText('Utgången')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Utgångna' }));
    expect(screen.queryByText('Kvarnby Basket')).not.toBeInTheDocument();
    expect(screen.getByText('Östra Kvarnen')).toBeInTheDocument();

    await user.click(screen.getByText('Östra Kvarnen'));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/admin/clubs/c2'));
  });
});
