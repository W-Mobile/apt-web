import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { signIn as amplifySignIn, signOut as amplifySignOut, fetchAuthSession, getCurrentUser, fetchUserAttributes } from 'aws-amplify/auth';

interface AdminUser {
  username: string;
  userId: string;
  displayName: string;
  email: string;
}

interface AdminAuthContextType {
  user: AdminUser | null;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export function useAdminAuth(): AdminAuthContextType {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return context;
}

async function isUserInAdminsGroup(): Promise<boolean> {
  const session = await fetchAuthSession();
  const groups = (session.tokens?.accessToken?.payload?.['cognito:groups'] as string[] | undefined) ?? [];
  return groups.includes('ADMINS') || groups.includes('AMIR');
}

async function buildAdminUser(baseUser: { username: string; userId: string }): Promise<AdminUser> {
  try {
    const attrs = await fetchUserAttributes();
    const givenName = attrs.given_name ?? '';
    const familyName = attrs.family_name ?? '';
    const displayName = [givenName, familyName].filter(Boolean).join(' ');
    return {
      ...baseUser,
      displayName: displayName || baseUser.username,
      email: attrs.email ?? baseUser.username,
    };
  } catch {
    return { ...baseUser, displayName: baseUser.username, email: baseUser.username };
  }
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkExistingSession() {
      try {
        const currentUser = await getCurrentUser();
        const admin = await isUserInAdminsGroup();
        if (admin) {
          setUser(await buildAdminUser(currentUser));
          setIsAdmin(true);
        } else {
          await amplifySignOut();
        }
      } catch {
        // Not signed in — expected
      } finally {
        setIsLoading(false);
      }
    }
    checkExistingSession();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      await amplifySignIn({ username: email, password });
      const admin = await isUserInAdminsGroup();
      if (!admin) {
        await amplifySignOut();
        setError('Du har inte admin-behörighet.');
        return;
      }
      const currentUser = await getCurrentUser();
      setUser(await buildAdminUser(currentUser));
      setIsAdmin(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Inloggningen misslyckades.');
    }
  }, []);

  const logout = useCallback(async () => {
    await amplifySignOut();
    setUser(null);
    setIsAdmin(false);
  }, []);

  return (
    <AdminAuthContext.Provider value={{ user, isAdmin, isLoading, error, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}
