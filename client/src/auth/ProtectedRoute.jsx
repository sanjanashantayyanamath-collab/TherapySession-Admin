import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';

export function ProtectedRoute() {
  const { initializing, isAuthenticated } = useAuth();
  const location = useLocation();
  if (initializing) return <div className="grid min-h-screen place-items-center"><Spinner label="Restoring session" /></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}
