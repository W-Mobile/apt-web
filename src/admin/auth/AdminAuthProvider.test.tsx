import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminAuthProvider, useAdminAuth } from './AdminAuthProvider';

// Mock aws-amplify/auth
vi.mock('aws-amplify/auth', () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  fetchAuthSession: vi.fn(),
  getCurrentUser: vi.fn(),
}));

import { signIn, signOut, fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';

function TestConsumer() {
  const { user, isAdmin, isLoading, login, logout } = useAdminAuth();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="is-admin">{String(isAdmin)}</span>
      <span data-testid="user">{user?.username ?? 'none'}</span>
      <button onClick={() => login('admin@test.com', 'pass123')}>Login</button>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
}

describe('AdminAuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts in loading state and resolves to unauthenticated', async () => {
    vi.mocked(getCurrentUser).mockRejectedValue(new Error('not signed in'));

    render(
      <AdminAuthProvider>
        <TestConsumer />
      </AdminAuthProvider>
    );

    // Initially loading
    expect(screen.getByTestId('loading')).toHaveTextContent('true');

    // Resolves to not admin
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
    expect(screen.getByTestId('is-admin')).toHaveTextContent('false');
    expect(screen.getByTestId('user')).toHaveTextContent('none');
  });

  it('login calls signIn and checks ADMINS group', async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error('not signed in'));
    vi.mocked(signIn).mockResolvedValue({ isSignedIn: true, nextStep: { signInStep: 'DONE' } });
    vi.mocked(fetchAuthSession).mockResolvedValue({
      tokens: {
        accessToken: {
          payload: {
            'cognito:groups': ['ADMINS'],
          },
        },
      },
    });
    vi.mocked(getCurrentUser).mockResolvedValue({ username: 'admin@test.com', userId: '123' });

    render(
      <AdminAuthProvider>
        <TestConsumer />
      </AdminAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    await userEvent.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByTestId('is-admin')).toHaveTextContent('true');
    });
    expect(signIn).toHaveBeenCalledWith({ username: 'admin@test.com', password: 'pass123' });
  });

  it('rejects non-ADMINS users after login', async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error('not signed in'));
    vi.mocked(signIn).mockResolvedValue({ isSignedIn: true, nextStep: { signInStep: 'DONE' } });
    vi.mocked(fetchAuthSession).mockResolvedValue({
      tokens: {
        accessToken: {
          payload: {
            'cognito:groups': ['SUBSCRIBERS'],
          },
        },
      },
    });
    vi.mocked(signOut).mockResolvedValue(undefined);

    render(
      <AdminAuthProvider>
        <TestConsumer />
      </AdminAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    await userEvent.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(signOut).toHaveBeenCalled();
    });
    expect(screen.getByTestId('is-admin')).toHaveTextContent('false');
  });
});
