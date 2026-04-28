import { createContext, useContext, useCallback, useRef, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface NavigationGuardContextType {
  setDirty: (dirty: boolean) => void;
  navigate: (to: string) => void;
}

const NavigationGuardContext = createContext<NavigationGuardContextType | null>(null);

export function useNavigationGuard() {
  const ctx = useContext(NavigationGuardContext);
  if (!ctx) throw new Error('useNavigationGuard must be used within NavigationGuardProvider');
  return ctx;
}

export function NavigationGuardProvider({ children }: { children: ReactNode }) {
  const routerNavigate = useNavigate();
  const dirtyRef = useRef(false);
  const sentinelRef = useRef(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  const setDirty = useCallback((dirty: boolean) => {
    const wasDirty = dirtyRef.current;
    dirtyRef.current = dirty;

    if (dirty && !wasDirty) {
      // Push a sentinel entry with same URL and same React Router state.
      // When user presses back, this sentinel is popped first.
      // React Router sees delta=0 (same idx) and same URL → no route change.
      window.history.pushState(
        { ...window.history.state, __navGuard: true },
        ''
      );
      sentinelRef.current = true;
    }

    if (!dirty && wasDirty) {
      sentinelRef.current = false;
    }
  }, []);

  const navigate = useCallback((to: string) => {
    if (!dirtyRef.current) {
      routerNavigate(to);
    } else {
      setPendingPath(to);
    }
  }, [routerNavigate]);

  const confirmNavigation = useCallback(() => {
    const path = pendingPath;
    dirtyRef.current = false;
    sentinelRef.current = false;
    setPendingPath(null);

    if (path === '__popstate__') {
      // Go back past both the re-pushed sentinel and the form entry
      window.history.go(-2);
    } else if (path) {
      routerNavigate(path);
    }
  }, [pendingPath, routerNavigate]);

  const cancelNavigation = useCallback(() => {
    // Sentinel was already re-pushed in the popstate handler, just close dialog
    setPendingPath(null);
  }, []);

  // beforeunload — browser native dialog on tab close/refresh
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (dirtyRef.current) {
        e.preventDefault();
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // popstate — browser back/forward buttons
  // When the sentinel entry is popped, React Router sees same URL + delta 0 → no-op.
  // We re-push the sentinel and show the confirmation dialog.
  useEffect(() => {
    function handlePopState() {
      if (dirtyRef.current) {
        // Re-push sentinel to keep blocking
        window.history.pushState(
          { ...window.history.state, __navGuard: true },
          ''
        );
        setPendingPath('__popstate__');
      }
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <NavigationGuardContext.Provider value={{ setDirty, navigate }}>
      {children}
      <ConfirmDialog
        open={pendingPath !== null}
        title="Osparade ändringar"
        message="Du har ändringar som inte sparats. Vill du lämna sidan ändå?"
        confirmLabel="Lämna"
        cancelLabel="Stanna kvar"
        onConfirm={confirmNavigation}
        onCancel={cancelNavigation}
      />
    </NavigationGuardContext.Provider>
  );
}
