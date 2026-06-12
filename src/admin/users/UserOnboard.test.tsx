import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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
    const dateInput = screen.getByLabelText(/^slutdatum$/i);
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
    await user.type(screen.getByLabelText(/^slutdatum$/i), '2026-12-31');
    await user.type(screen.getByLabelText(/^e-post$/i), 'anna@x.se');
    await user.click(screen.getByRole('button', { name: /lägg till/i }));

    await user.click(screen.getByRole('button', { name: /skapa alla/i }));

    await waitFor(() => {
      expect(screen.getByText('Skapad')).toBeInTheDocument();
    });
    expect(mockCreateSubscriber).toHaveBeenCalledWith('anna@x.se', expect.stringContaining('2026-12-31'));
  });

  async function addUser(user: ReturnType<typeof userEvent.setup>, email: string) {
    await user.type(screen.getByPlaceholderText('namn@exempel.se'), email);
    await user.click(screen.getByRole('button', { name: /lägg till/i }));
  }

  it('applies a date chosen on one row to all pending rows when sync is on', async () => {
    const user = userEvent.setup();
    render(<UserOnboard />);

    await addUser(user, 'anna@x.se');
    await addUser(user, 'erik@x.se');

    // Row date inputs share the "Slutdatum" label with the quick field (index 0).
    const dateInputs = screen.getAllByLabelText(/^slutdatum$/i);
    fireEvent.change(dateInputs[1], { target: { value: '2026-12-31' } });

    // Both rows (and the quick field) now hold the chosen date.
    expect(screen.getAllByDisplayValue('2026-12-31').length).toBeGreaterThanOrEqual(2);
  });

  it('keeps row dates independent when sync is unchecked', async () => {
    const user = userEvent.setup();
    render(<UserOnboard />);

    await user.click(screen.getByLabelText(/samma slutdatum för alla/i));
    await addUser(user, 'anna@x.se');
    await addUser(user, 'erik@x.se');

    const dateInputs = screen.getAllByLabelText(/^slutdatum$/i);
    fireEvent.change(dateInputs[1], { target: { value: '2026-12-31' } });

    // Only the edited row carries the date; the others stay untouched.
    expect(screen.getAllByDisplayValue('2026-12-31')).toHaveLength(1);
  });

  it('syncs all rows to the current date when sync is re-enabled', async () => {
    const user = userEvent.setup();
    render(<UserOnboard />);

    const syncToggle = screen.getByLabelText(/samma slutdatum för alla/i);
    await user.click(syncToggle); // turn off
    await addUser(user, 'anna@x.se');
    await addUser(user, 'erik@x.se');

    // Set the quick-field date while sync is off — rows stay empty.
    fireEvent.change(screen.getAllByLabelText(/^slutdatum$/i)[0], { target: { value: '2026-12-31' } });
    expect(screen.queryByDisplayValue('2026-12-31')).toBeInTheDocument(); // only the quick field

    await user.click(syncToggle); // turn back on → propagate to all rows

    expect(screen.getAllByDisplayValue('2026-12-31').length).toBeGreaterThanOrEqual(3);
  });

  it('soft-deletes a row and shows an undo affordance', async () => {
    const user = userEvent.setup();
    render(<UserOnboard />);

    await addUser(user, 'anna@x.se');
    expect(screen.getByDisplayValue('anna@x.se')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /ta bort rad/i }));

    // The editable email field is gone; an undo affordance takes its place.
    expect(screen.queryByDisplayValue('anna@x.se')).not.toBeInTheDocument();
    expect(screen.getByText(/borttagen — tas inte med/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ångra/i })).toBeInTheDocument();
  });

  it('restores a removed row when undo is clicked', async () => {
    const user = userEvent.setup();
    render(<UserOnboard />);

    await addUser(user, 'anna@x.se');
    await user.click(screen.getByRole('button', { name: /ta bort rad/i }));
    await user.click(screen.getByRole('button', { name: /ångra/i }));

    expect(screen.getByDisplayValue('anna@x.se')).toBeInTheDocument();
    expect(screen.queryByText(/borttagen — tas inte med/i)).not.toBeInTheDocument();
  });

  it('excludes pending-delete rows from the create count', async () => {
    const user = userEvent.setup();
    render(<UserOnboard />);

    await addUser(user, 'anna@x.se');
    await addUser(user, 'erik@x.se');
    expect(screen.getByRole('button', { name: /skapa alla \(2\)/i })).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /ta bort rad/i })[0]);

    expect(screen.getByRole('button', { name: /skapa alla \(1\)/i })).toBeInTheDocument();
  });
});
