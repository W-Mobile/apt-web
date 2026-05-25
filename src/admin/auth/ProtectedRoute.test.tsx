import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';

const mockUseAdminAuth = vi.fn();

vi.mock('./AdminAuthProvider', () => ({
  useAdminAuth: () => mockUseAdminAuth(),
}));

function mockAuth(opts: { isLoading?: boolean; isAdmin?: boolean; groups?: string[] }) {
  const groups = opts.groups ?? [];
  mockUseAdminAuth.mockReturnValue({
    isLoading: opts.isLoading ?? false,
    isAdmin: opts.isAdmin ?? false,
    isInGroup: (g: string) => groups.includes(g),
  });
}

describe('ProtectedRoute', () => {
  it('shows loading while auth is being checked', () => {
    mockAuth({ isLoading: true });
    render(
      <MemoryRouter>
        <ProtectedRoute><p>Secret</p></ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.queryByText('Secret')).not.toBeInTheDocument();
  });

  it('renders children when user is admin', () => {
    mockAuth({ isAdmin: true, groups: ['ADMINS'] });
    render(
      <MemoryRouter>
        <ProtectedRoute><p>Secret</p></ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.getByText('Secret')).toBeInTheDocument();
  });

  it('redirects to /admin/login when not admin', () => {
    mockAuth({ isAdmin: false });
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <ProtectedRoute><p>Secret</p></ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.queryByText('Secret')).not.toBeInTheDocument();
  });

  it('renders children when user is in required group', () => {
    mockAuth({ isAdmin: true, groups: ['ADMINS'] });
    render(
      <MemoryRouter>
        <ProtectedRoute requireGroup="ADMINS"><p>Feedback</p></ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.getByText('Feedback')).toBeInTheDocument();
  });

  it('blocks access when user is admin but not in required group (AMIR cannot access ADMINS-only route)', () => {
    mockAuth({ isAdmin: true, groups: ['AMIR'] });
    render(
      <MemoryRouter initialEntries={['/admin/feedback']}>
        <ProtectedRoute requireGroup="ADMINS"><p>Feedback</p></ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.queryByText('Feedback')).not.toBeInTheDocument();
  });
});
