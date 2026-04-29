import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminLogin } from './AdminLogin';

const mockLogin = vi.fn();
const mockNavigate = vi.fn();
const mockResetPassword = vi.fn();
const mockConfirmResetPassword = vi.fn();

vi.mock('./AdminAuthProvider', () => ({
  useAdminAuth: () => ({
    login: mockLogin,
    isAdmin: false,
    isLoading: false,
    error: null,
  }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('aws-amplify/auth', () => ({
  resetPassword: (...args: unknown[]) => mockResetPassword(...args),
  confirmResetPassword: (...args: unknown[]) => mockConfirmResetPassword(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockResetPassword.mockResolvedValue({});
  mockConfirmResetPassword.mockResolvedValue({});
});

describe('AdminLogin', () => {
  it('renders email and password fields with submit button', () => {
    render(<AdminLogin />);
    expect(screen.getByLabelText(/e-post/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Lösenord')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logga in/i })).toBeInTheDocument();
  });

  it('calls login with email and password on submit', async () => {
    render(<AdminLogin />);
    await userEvent.type(screen.getByLabelText(/e-post/i), 'admin@test.com');
    await userEvent.type(screen.getByLabelText('Lösenord'), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: /logga in/i }));

    expect(mockLogin).toHaveBeenCalledWith('admin@test.com', 'secret123', false);
  });

  it('shows "Glömt lösenord?" link on login view', () => {
    render(<AdminLogin />);
    expect(screen.getByText('Glömt lösenord?')).toBeInTheDocument();
  });

  describe('Forgot password flow', () => {
    it('navigates to request code view when clicking "Glömt lösenord?"', async () => {
      render(<AdminLogin />);
      await userEvent.click(screen.getByText('Glömt lösenord?'));

      expect(screen.getByText('Återställ lösenord')).toBeInTheDocument();
      expect(screen.getByText('Skicka kod')).toBeInTheDocument();
      expect(screen.queryByText('Logga in')).not.toBeInTheDocument();
    });

    it('pre-fills email from login form into request code view', async () => {
      render(<AdminLogin />);
      await userEvent.type(screen.getByLabelText(/e-post/i), 'admin@test.com');
      await userEvent.click(screen.getByText('Glömt lösenord?'));

      expect(screen.getByLabelText(/e-post/i)).toHaveValue('admin@test.com');
    });

    it('goes back to login view when clicking "Tillbaka"', async () => {
      render(<AdminLogin />);
      await userEvent.click(screen.getByText('Glömt lösenord?'));
      await userEvent.click(screen.getByText('Tillbaka'));

      expect(screen.getByRole('button', { name: /logga in/i })).toBeInTheDocument();
    });

    it('calls resetPassword and navigates to reset view on success', async () => {
      render(<AdminLogin />);
      await userEvent.click(screen.getByText('Glömt lösenord?'));
      await userEvent.type(screen.getByLabelText(/e-post/i), 'admin@test.com');
      await userEvent.click(screen.getByText('Skicka kod'));

      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalledWith({ username: 'admin@test.com' });
        expect(screen.getByRole('heading', { name: 'Nytt lösenord' })).toBeInTheDocument();
      });
    });

    it('shows error when resetPassword fails', async () => {
      mockResetPassword.mockRejectedValue(new Error('User not found'));
      render(<AdminLogin />);
      await userEvent.click(screen.getByText('Glömt lösenord?'));
      await userEvent.type(screen.getByLabelText(/e-post/i), 'admin@test.com');
      await userEvent.click(screen.getByText('Skicka kod'));

      await waitFor(() => {
        expect(screen.getByText('User not found')).toBeInTheDocument();
      });
    });

    it('shows error when passwords do not match', async () => {
      render(<AdminLogin />);
      await userEvent.click(screen.getByText('Glömt lösenord?'));
      await userEvent.type(screen.getByLabelText(/e-post/i), 'admin@test.com');
      await userEvent.click(screen.getByText('Skicka kod'));

      await waitFor(() => expect(screen.getByRole('heading', { name: 'Nytt lösenord' })).toBeInTheDocument());

      await userEvent.type(screen.getByLabelText('Verifieringskod'), '123456');
      await userEvent.type(screen.getByLabelText('Nytt lösenord'), 'Password1!');
      await userEvent.type(screen.getByLabelText('Bekräfta lösenord'), 'Different1!');
      await userEvent.click(screen.getByText('Återställ lösenord'));

      expect(screen.getByText('Lösenorden matchar inte.')).toBeInTheDocument();
      expect(mockConfirmResetPassword).not.toHaveBeenCalled();
    });

    it('shows error when password is too short', async () => {
      render(<AdminLogin />);
      await userEvent.click(screen.getByText('Glömt lösenord?'));
      await userEvent.type(screen.getByLabelText(/e-post/i), 'admin@test.com');
      await userEvent.click(screen.getByText('Skicka kod'));

      await waitFor(() => expect(screen.getByRole('heading', { name: 'Nytt lösenord' })).toBeInTheDocument());

      await userEvent.type(screen.getByLabelText('Verifieringskod'), '123456');
      await userEvent.type(screen.getByLabelText('Nytt lösenord'), 'Short1!');
      await userEvent.type(screen.getByLabelText('Bekräfta lösenord'), 'Short1!');
      await userEvent.click(screen.getByText('Återställ lösenord'));

      expect(screen.getByText('Lösenordet måste vara minst 8 tecken.')).toBeInTheDocument();
      expect(mockConfirmResetPassword).not.toHaveBeenCalled();
    });

    it('calls confirmResetPassword and returns to login with success message', async () => {
      render(<AdminLogin />);
      await userEvent.click(screen.getByText('Glömt lösenord?'));
      await userEvent.type(screen.getByLabelText(/e-post/i), 'admin@test.com');
      await userEvent.click(screen.getByText('Skicka kod'));

      await waitFor(() => expect(screen.getByRole('heading', { name: 'Nytt lösenord' })).toBeInTheDocument());

      await userEvent.type(screen.getByLabelText('Verifieringskod'), '123456');
      await userEvent.type(screen.getByLabelText('Nytt lösenord'), 'NewPass1!');
      await userEvent.type(screen.getByLabelText('Bekräfta lösenord'), 'NewPass1!');
      await userEvent.click(screen.getByText('Återställ lösenord'));

      await waitFor(() => {
        expect(mockConfirmResetPassword).toHaveBeenCalledWith({
          username: 'admin@test.com',
          newPassword: 'NewPass1!',
          confirmationCode: '123456',
        });
        expect(screen.getByText('Lösenordet har återställts. Du kan nu logga in.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /logga in/i })).toBeInTheDocument();
      });
    });

    it('shows error when confirmResetPassword fails', async () => {
      mockConfirmResetPassword.mockRejectedValue(new Error('Invalid code'));
      render(<AdminLogin />);
      await userEvent.click(screen.getByText('Glömt lösenord?'));
      await userEvent.type(screen.getByLabelText(/e-post/i), 'admin@test.com');
      await userEvent.click(screen.getByText('Skicka kod'));

      await waitFor(() => expect(screen.getByRole('heading', { name: 'Nytt lösenord' })).toBeInTheDocument());

      await userEvent.type(screen.getByLabelText('Verifieringskod'), '999999');
      await userEvent.type(screen.getByLabelText('Nytt lösenord'), 'NewPass1!');
      await userEvent.type(screen.getByLabelText('Bekräfta lösenord'), 'NewPass1!');
      await userEvent.click(screen.getByText('Återställ lösenord'));

      await waitFor(() => {
        expect(screen.getByText('Invalid code')).toBeInTheDocument();
      });
    });
  });
});
