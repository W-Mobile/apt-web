import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';

const mockUseAdminAuth = vi.fn();

vi.mock('../auth/AdminAuthProvider', () => ({
  useAdminAuth: () => mockUseAdminAuth(),
}));

function mockAuth(groups: string[]) {
  mockUseAdminAuth.mockReturnValue({
    user: { username: 'admin@test.com', userId: '123' },
    isAdmin: true,
    groups,
    isInGroup: (g: string) => groups.includes(g),
    logout: vi.fn(),
  });
}

describe('AdminLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders sidebar with nav links', () => {
    mockAuth(['ADMINS']);
    render(
      <MemoryRouter>
        <AdminLayout>
          <p>Page content</p>
        </AdminLayout>
      </MemoryRouter>
    );

    expect(screen.getByText('Exercises')).toBeInTheDocument();
    expect(screen.getByText('Workouts')).toBeInTheDocument();
    expect(screen.getByText('Program')).toBeInTheDocument();
    expect(screen.getByText('Page content')).toBeInTheDocument();
  });

  it('shows Feedback nav item for users in ADMINS group', () => {
    mockAuth(['ADMINS']);
    render(
      <MemoryRouter>
        <AdminLayout><p>x</p></AdminLayout>
      </MemoryRouter>
    );
    expect(screen.getByText('Feedback')).toBeInTheDocument();
  });

  it('hides Feedback nav item for users not in ADMINS group (e.g. AMIR)', () => {
    mockAuth(['AMIR']);
    render(
      <MemoryRouter>
        <AdminLayout><p>x</p></AdminLayout>
      </MemoryRouter>
    );
    expect(screen.queryByText('Feedback')).not.toBeInTheDocument();
    expect(screen.getByText('Exercises')).toBeInTheDocument();
  });
});
