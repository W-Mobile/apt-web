import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';

const mockUseAdminAuth = vi.fn();

vi.mock('./AdminAuthProvider', () => ({
  useAdminAuth: () => mockUseAdminAuth(),
}));

describe('ProtectedRoute', () => {
  it('shows loading while auth is being checked', () => {
    mockUseAdminAuth.mockReturnValue({ isLoading: true, isAdmin: false });
    render(
      <MemoryRouter>
        <ProtectedRoute><p>Secret</p></ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.queryByText('Secret')).not.toBeInTheDocument();
  });

  it('renders children when user is admin', () => {
    mockUseAdminAuth.mockReturnValue({ isLoading: false, isAdmin: true });
    render(
      <MemoryRouter>
        <ProtectedRoute><p>Secret</p></ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.getByText('Secret')).toBeInTheDocument();
  });

  it('redirects to /admin/login when not admin', () => {
    mockUseAdminAuth.mockReturnValue({ isLoading: false, isAdmin: false });
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <ProtectedRoute><p>Secret</p></ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.queryByText('Secret')).not.toBeInTheDocument();
  });
});
