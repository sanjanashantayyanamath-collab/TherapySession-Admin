import { Suspense } from 'react';
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
import { DashboardPage } from './pages/DashboardPage.jsx';
import { SchedulePage } from './pages/SchedulePage.jsx';
import { AppointmentsPage } from './pages/AppointmentsPage.jsx';
import { AppointmentDetailPage } from './pages/AppointmentDetailPage.jsx';
import { AdminUsersPage } from './pages/AdminUsersPage.jsx';
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function RouteFallback() {
  return (
    <div className="grid min-h-64 place-items-center">
      <Spinner label="Loading page" />
    </div>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ErrorBoundary>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route element={<ProtectedRoute />}>
                  <Route
                    element={
                      <AppShell>
                        <Outlet />
                      </AppShell>
                    }
                  >
                    <Route index element={<DashboardPage />} />
                    <Route path="schedule" element={<SchedulePage />} />
                    <Route path="appointments" element={<AppointmentsPage />} />
                    <Route
                      path="appointments/:id"
                      element={<AppointmentDetailPage />}
                    />
                    <Route element={<RoleRoute roles={['admin']} />}>
                      <Route path="admin/users" element={<AdminUsersPage />} />
                    </Route>
                  </Route>
                </Route>
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}
