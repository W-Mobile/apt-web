import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';

vi.mock('../auth/AdminAuthProvider', () => ({
  useAdminAuth: () => ({
    user: { username: 'admin@test.com', userId: '123' },
    isAdmin: true,
    logout: vi.fn(),
  }),
}));

describe('AdminLayout', () => {
  it('renders sidebar with nav links', () => {
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
});
