import { lazy, Suspense } from 'react';
import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './auth/AuthContext.jsx';
import { ProtectedRoute } from './auth/ProtectedRoute.jsx';
import { RoleRoute } from './auth/RoleRoute.jsx';
import { AppShell } from './components/AppShell.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { Spinner } from './components/ui/Spinner.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';
import { PrivacyPage } from './pages/PrivacyPage.jsx';

const PlaceholderPage = lazy(() => import('./pages/PlaceholderPage.jsx').then((module) => ({ default: module.PlaceholderPage })));
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } });

function RouteFallback() { return <div className="grid min-h-64 place-items-center"><Spinner label="Loading page" /></div>; }

export function App() {
  return <QueryClientProvider client={queryClient}><BrowserRouter><AuthProvider><ErrorBoundary><Suspense fallback={<RouteFallback />}><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/privacy" element={<PrivacyPage />} />
    <Route element={<ProtectedRoute />}><Route element={<AppShell><Outlet /></AppShell>}>
      <Route index element={<PlaceholderPage title="Dashboard" description="Today’s sessions and attendance at a glance." kind="stats" />} />
      <Route path="schedule" element={<PlaceholderPage title="Schedule" description="Your upcoming schedule will appear here." kind="appointments" />} />
      <Route path="appointments" element={<PlaceholderPage title="Appointments" description="Browse appointment metadata without clinical information." kind="appointments" />} />
      <Route path="appointments/:id" element={<PlaceholderPage title="Appointment detail" description="Appointment details will be available in Phase 6." />} />
      <Route element={<RoleRoute roles={['admin']} />}><Route path="admin/users" element={<PlaceholderPage title="Manage counsellors" description="Admin staff management will be expanded in Phase 6." kind="users" />} /></Route>
    </Route></Route>
    <Route path="*" element={<NotFoundPage />} />
  </Routes></Suspense></ErrorBoundary></AuthProvider></BrowserRouter><Toaster position="top-right" /></QueryClientProvider>;
}
