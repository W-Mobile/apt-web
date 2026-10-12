import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Club } from './club-api';
import { ClubFormModal } from './ClubFormModal';

const mockCreateClub = vi.fn();
const mockUpdateClub = vi.fn();

vi.mock('./club-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./club-api')>()),
  createClub: (...args: unknown[]) => mockCreateClub(...args),
  updateClub: (...args: unknown[]) => mockUpdateClub(...args),
}));

const existing: Club = {
  id: 'c1',
  name: 'Kvarnby Basket',
  contactName: 'Petra Nyberg',
  contactEmail: 'petra@kvarnbybasket.se',
  licenseLimit: 50,
  startDate: '2026-09-01',
  endDate: '2027-08-31',
  createdAt: '',
};

describe('ClubFormModal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a limited club', async () => {
    mockCreateClub.mockResolvedValue({ ...existing, id: 'new' });
    const onSaved = vi.fn();
    const user = userEvent.setup();
    render(<ClubFormModal club={null} onClose={vi.fn()} onSaved={onSaved} />);

    await user.type(screen.getByLabelText('Klubbnamn'), 'Kvarnby Basket');
    await user.type(screen.getByLabelText('Antal spelarlicenser'), '50');
    await user.type(screen.getByLabelText('Startdatum'), '2026-09-01');
    await user.type(screen.getByLabelText('Slutdatum'), '2027-08-31');
    await user.click(screen.getByRole('button', { name: 'Skapa klubb' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(mockCreateClub).toHaveBeenCalledWith({
      name: 'Kvarnby Basket',
      contactName: null,
      contactEmail: null,
      licenseLimit: 50,
      startDate: '2026-09-01',
      endDate: '2027-08-31',
    });
  });

  it('hides the number for Unlimited and saves null', async () => {
    mockUpdateClub.mockResolvedValue({ status: 'ok' });
    const user = userEvent.setup();
    render(<ClubFormModal club={existing} licensesUsed={54} activeMembers={57} onClose={vi.fn()} onSaved={vi.fn()} />);

    await user.click(screen.getByRole('radio', { name: 'Obegränsat' }));
    expect(screen.queryByLabelText('Antal spelarlicenser')).not.toBeInTheDocument();
    expect(screen.getByText(/Tidigare: Begränsat, 50 spelare. Klubben har 54./)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Spara ändringar' }));
    await waitFor(() => expect(mockUpdateClub).toHaveBeenCalledWith('c1', expect.objectContaining({ licenseLimit: null })));
  });

  it('explains a new end date and blocks an end date before the start', async () => {
    const user = userEvent.setup();
    render(<ClubFormModal club={existing} activeMembers={57} onClose={vi.fn()} onSaved={vi.fn()} />);

    const end = screen.getByLabelText('Slutdatum');
    await user.clear(end);
    await user.type(end, '2027-12-31');
    expect(screen.getByText(/Nytt slutdatum gäller alla 57 medlemmar. Tidigare 2027-08-31./)).toBeInTheDocument();

    await user.clear(end);
    await user.type(end, '2026-01-01');
    expect(screen.getByText(/Slutdatumet måste vara efter startdatumet/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Spara ändringar' })).toBeDisabled();
  });
});
