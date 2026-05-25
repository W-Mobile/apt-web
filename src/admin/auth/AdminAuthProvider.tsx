import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { signIn as amplifySignIn, signOut as amplifySignOut, fetchAuthSession, getCurrentUser, fetchUserAttributes } from 'aws-amplify/auth';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';
import { defaultStorage, sessionStorage } from 'aws-amplify/utils';

interface AdminUser {
  username: string;
  userId: string;
  displayName: string;
  email: string;
}

interface AdminAuthContextType {
  user: AdminUser | null;
  isAdmin: boolean;
  groups: string[];
  isInGroup: (group: string) => boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
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

async function fetchUserGroups(): Promise<string[]> {
  const session = await fetchAuthSession();
  return (session.tokens?.accessToken?.payload?.['cognito:groups'] as string[] | undefined) ?? [];
}

function hasAdminAccess(groups: string[]): boolean {
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
  const [groups, setGroups] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkExistingSession() {
      try {
        const remembered = localStorage.getItem('admin_remember_me') === 'true';
        cognitoUserPoolsTokenProvider.setKeyValueStorage(remembered ? defaultStorage : sessionStorage);
        const currentUser = await getCurrentUser();
        const userGroups = await fetchUserGroups();
        if (hasAdminAccess(userGroups)) {
          setUser(await buildAdminUser(currentUser));
          setGroups(userGroups);
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

  const login = useCallback(async (email: string, password: string, rememberMe = false) => {
    setError(null);
    try {
      cognitoUserPoolsTokenProvider.setKeyValueStorage(rememberMe ? defaultStorage : sessionStorage);
      await amplifySignIn({ username: email, password });
      const userGroups = await fetchUserGroups();
      if (!hasAdminAccess(userGroups)) {
        await amplifySignOut();
        setError('Du har inte admin-behörighet.');
        return;
      }
      const currentUser = await getCurrentUser();
      setUser(await buildAdminUser(currentUser));
      setGroups(userGroups);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Inloggningen misslyckades.');
    }
  }, []);

  const logout = useCallback(async () => {
    await amplifySignOut();
    setUser(null);
    setGroups([]);
  }, []);

  const isAdmin = hasAdminAccess(groups);
  const isInGroup = useCallback((group: string) => groups.includes(group), [groups]);

  return (
    <AdminAuthContext.Provider value={{ user, isAdmin, groups, isInGroup, isLoading, error, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}
