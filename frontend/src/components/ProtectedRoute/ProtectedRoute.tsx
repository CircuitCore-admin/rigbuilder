import { Navigate } from 'react-router-dom';
import { useAuth, type UserRole } from '../../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** If set, user must have this role. */
  requiredRole?: UserRole;
}

/**
 * Route guard component. Redirects to /login if unauthenticated,
 * or to / if role requirement is not met.
 */
export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (requiredRole && user.role !== requiredRole) return <Navigate to="/" replace />;

  return <>{children}</>;
}
