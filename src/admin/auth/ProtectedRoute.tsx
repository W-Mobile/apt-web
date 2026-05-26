import { Navigate } from 'react-router-dom';
import { useAdminAuth } from './AdminAuthProvider';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireGroup?: string;
}

export function ProtectedRoute({ children, requireGroup }: ProtectedRouteProps) {
  const { isLoading, isAdmin, isInGroup } = useAdminAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-950 text-white font-sans">Laddar...</div>;
  }

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  if (requireGroup && !isInGroup(requireGroup)) {
    return <Navigate to="/admin/exercises" replace />;
  }

  return <>{children}</>;
}
