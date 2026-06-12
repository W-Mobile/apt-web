import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserOnboard } from './UserOnboard';

const mockCreateSubscriber = vi.fn();

vi.mock('./user-api', () => ({
  createSubscriber: (...args: unknown[]) => mockCreateSubscriber(...args),
}));

vi.mock('../contexts/NavigationGuardContext', () => ({
  useNavigationGuard: () => ({ navigate: vi.fn(), setDirty: vi.fn() }),
}));

vi.mock('../hooks/useFormDirtyTracking', () => ({
  useFormDirtyTracking: vi.fn(() => false),
}));

describe('UserOnboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds a manually entered user as a table row', async () => {
    const user = userEvent.setup();
    render(<UserOnboard />);

    await user.type(screen.getByLabelText(/^e-post$/i), 'anna@x.se');
    await user.click(screen.getByRole('button', { name: /lägg till/i }));

    expect(screen.getByDisplayValue('anna@x.se')).toBeInTheDocument();
  });

  it('imports emails from a CSV file with the default end date', async () => {
    const user = userEvent.setup();
    render(<UserOnboard />);

    // Set a default end date via the quick-add row first.
    const dateInput = screen.getByLabelText(/slutdatum/i);
    await user.type(dateInput, '2026-12-31');
    await user.type(screen.getByLabelText(/^e-post$/i), 'anna@x.se');
    await user.click(screen.getByRole('button', { name: /lägg till/i }));

    const file = new File(['erik@x.se\nlisa@x.se'], 'users.csv', { type: 'text/csv' });
    await user.upload(screen.getByTestId('csv-input'), file);

    await waitFor(() => {
      expect(screen.getByDisplayValue('erik@x.se')).toBeInTheDocument();
      expect(screen.getByDisplayValue('lisa@x.se')).toBeInTheDocument();
    });
    // Imported rows inherit the default end date.
    const dates = screen.getAllByDisplayValue('2026-12-31');
    expect(dates.length).toBeGreaterThanOrEqual(2);
  });

  it('creates all queued users and shows status per row', async () => {
    const user = userEvent.setup();
    mockCreateSubscriber.mockResolvedValue({
      email: 'anna@x.se',
      status: 'created',
      tempPassword: 'Temp123!',
    });

    render(<UserOnboard />);
    await user.type(screen.getByLabelText(/slutdatum/i), '2026-12-31');
    await user.type(screen.getByLabelText(/^e-post$/i), 'anna@x.se');
    await user.click(screen.getByRole('button', { name: /lägg till/i }));

    await user.click(screen.getByRole('button', { name: /skapa alla/i }));

    await waitFor(() => {
      expect(screen.getByText('Skapad')).toBeInTheDocument();
    });
    expect(mockCreateSubscriber).toHaveBeenCalledWith('anna@x.se', expect.stringContaining('2026-12-31'));
  });
});
