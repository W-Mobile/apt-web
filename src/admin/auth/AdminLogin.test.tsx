import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminLogin } from './AdminLogin';

const mockLogin = vi.fn();
const mockNavigate = vi.fn();

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

describe('AdminLogin', () => {
  it('renders email and password fields with submit button', () => {
    render(<AdminLogin />);
    expect(screen.getByLabelText(/e-post/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/lösenord/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logga in/i })).toBeInTheDocument();
  });

  it('calls login with email and password on submit', async () => {
    render(<AdminLogin />);
    await userEvent.type(screen.getByLabelText(/e-post/i), 'admin@test.com');
    await userEvent.type(screen.getByLabelText(/lösenord/i), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: /logga in/i }));

    expect(mockLogin).toHaveBeenCalledWith('admin@test.com', 'secret123');
  });
});
