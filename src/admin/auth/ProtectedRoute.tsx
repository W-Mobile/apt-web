import { Navigate } from 'react-router-dom';
import { useAdminAuth } from './AdminAuthProvider';
import { ReactNode } from 'react';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isLoading, isAdmin } = useAdminAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-950 text-white font-sans">Laddar...</div>;
  }

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}
