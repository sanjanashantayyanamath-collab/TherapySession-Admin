import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

export function RoleRoute({ roles }) {
  const { user } = useAuth();
  return roles.includes(user?.role) ? <Outlet /> : <Navigate to="/" replace />;
}
