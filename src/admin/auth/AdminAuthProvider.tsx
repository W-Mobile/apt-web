import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { signIn as amplifySignIn, signOut as amplifySignOut, fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';

interface AdminUser {
  username: string;
  userId: string;
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
          setUser({ username: currentUser.username, userId: currentUser.userId });
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
      setUser({ username: currentUser.username, userId: currentUser.userId });
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
