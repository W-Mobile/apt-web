import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExtendSubscription } from './ExtendSubscription';

const mockGetSubscriberByEmail = vi.fn();
const mockExtendSubscriber = vi.fn();

vi.mock('./subscription-api', () => ({
  getSubscriberByEmail: (...args: unknown[]) => mockGetSubscriberByEmail(...args),
  extendSubscriber: (...args: unknown[]) => mockExtendSubscriber(...args),
}));

vi.mock('../contexts/NavigationGuardContext', () => ({
  useNavigationGuard: () => ({ navigate: vi.fn(), setDirty: vi.fn() }),
}));

vi.mock('../hooks/useFormDirtyTracking', () => ({
  useFormDirtyTracking: vi.fn(() => false),
}));

describe('ExtendSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: every looked-up email resolves to an existing subscriber.
    mockGetSubscriberByEmail.mockResolvedValue({
      email: 'anna@x.se',
      subscriberUntil: '2026-01-01T23:59:59.999Z',
    });
  });

  async function addEmail(user: ReturnType<typeof userEvent.setup>, email: string) {
    await user.type(screen.getByPlaceholderText('namn@exempel.se'), email);
    await user.click(screen.getByRole('button', { name: /lägg till/i }));
  }

  it('adds a manually entered email and marks it ready once looked up', async () => {
    const user = userEvent.setup();
    render(<ExtendSubscription />);

    await addEmail(user, 'anna@x.se');

    expect(screen.getByDisplayValue('anna@x.se')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /förläng alla \(1\)/i })).toBeInTheDocument();
    });
    // The current end date read from the backend is shown.
    expect(screen.getByText('2026-01-01')).toBeInTheDocument();
  });

  it('shows an invalid-email notice and stages nothing', async () => {
    const user = userEvent.setup();
    render(<ExtendSubscription />);

    await user.type(screen.getByPlaceholderText('namn@exempel.se'), 'not-an-email');
    await user.click(screen.getByRole('button', { name: /lägg till/i }));

    expect(screen.getByText(/inga abonnemang tillagda ännu/i)).toBeInTheDocument();
    expect(screen.getByText(/ogiltig e-postadress/i)).toBeInTheDocument();
  });

  it('marks an unknown email as not-found and excludes it from the extend count', async () => {
    const user = userEvent.setup();
    mockGetSubscriberByEmail.mockResolvedValue(null);
    render(<ExtendSubscription />);

    await addEmail(user, 'ghost@x.se');

    // Exact match targets the row badge, not the "N hittades inte" footer text.
    await waitFor(() => {
      expect(screen.getByText('Hittades inte')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /förläng alla \(0\)/i })).toBeInTheDocument();
  });

  it('imports emails from a CSV file with the default end date', async () => {
    const user = userEvent.setup();
    render(<ExtendSubscription />);

    fireEvent.change(screen.getByLabelText(/^nytt slutdatum$/i), { target: { value: '2027-06-30' } });

    const file = new File(['E-post\nerik@x.se\nlisa@x.se'], 'subs.csv', { type: 'text/csv' });
    await user.upload(screen.getByTestId('csv-input'), file);

    await waitFor(() => {
      expect(screen.getByDisplayValue('erik@x.se')).toBeInTheDocument();
      expect(screen.getByDisplayValue('lisa@x.se')).toBeInTheDocument();
    });
    // Imported rows inherit the default new end date.
    expect(screen.getAllByDisplayValue('2027-06-30').length).toBeGreaterThanOrEqual(2);
  });

  it('shows an error and imports nothing when the email column is missing', async () => {
    const user = userEvent.setup();
    render(<ExtendSubscription />);

    const file = new File(['Namn,Slutdatum\nErik,2026-12-31'], 'subs.csv', { type: 'text/csv' });
    await user.upload(screen.getByTestId('csv-input'), file);

    await waitFor(() => {
      expect(screen.getByText(/saknar en e-post-kolumn/i)).toBeInTheDocument();
    });
    expect(screen.queryByDisplayValue('Erik')).not.toBeInTheDocument();
  });

  it('applies a date chosen on one row to all pending rows when sync is on', async () => {
    const user = userEvent.setup();
    render(<ExtendSubscription />);

    await addEmail(user, 'anna@x.se');
    await addEmail(user, 'erik@x.se');

    const dateInputs = screen.getAllByLabelText(/^nytt slutdatum$/i);
    fireEvent.change(dateInputs[1], { target: { value: '2027-06-30' } });

    expect(screen.getAllByDisplayValue('2027-06-30').length).toBeGreaterThanOrEqual(2);
  });

  it('extends all ready rows and shows status per row', async () => {
    const user = userEvent.setup();
    mockExtendSubscriber.mockResolvedValue({
      email: 'anna@x.se',
      status: 'extended',
      subscriberUntil: '2027-06-30T23:59:59.999Z',
    });
    render(<ExtendSubscription />);

    fireEvent.change(screen.getByLabelText(/^nytt slutdatum$/i), { target: { value: '2027-06-30' } });
    await addEmail(user, 'anna@x.se');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /förläng alla \(1\)/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /förläng alla/i }));

    await waitFor(() => {
      expect(screen.getByText('Förlängd')).toBeInTheDocument();
    });
    expect(mockExtendSubscriber).toHaveBeenCalledWith('anna@x.se', expect.stringContaining('2027-06-30'));
  });

  it('soft-deletes a selected row and restores it via undo', async () => {
    const user = userEvent.setup();
    render(<ExtendSubscription />);

    await addEmail(user, 'anna@x.se');
    expect(screen.getByDisplayValue('anna@x.se')).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: /markera anna@x\.se/i }));
    await user.click(screen.getByRole('button', { name: /ta bort markerade/i }));
    expect(screen.queryByDisplayValue('anna@x.se')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /ångra/i }));
    expect(screen.getByDisplayValue('anna@x.se')).toBeInTheDocument();
  });
});
