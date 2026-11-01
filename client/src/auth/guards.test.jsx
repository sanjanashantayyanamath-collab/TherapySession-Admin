import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProtectedRoute } from './ProtectedRoute.jsx';
import { RoleRoute } from './RoleRoute.jsx';

let auth = { initializing: false, isAuthenticated: false, user: null };
vi.mock('./AuthContext.jsx', () => ({ useAuth: () => auth }));

function renderRoutes() {
  return render(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={['/private']}><Routes><Route element={<ProtectedRoute />}><Route path="/private" element={<span>private</span>} /></Route><Route path="/login" element={<span>login</span>} /></Routes></MemoryRouter></QueryClientProvider>);
}

test('redirects unauthenticated users', () => {
  renderRoutes();
  expect(screen.getByText('login')).toBeInTheDocument();
});

test('role route hides admin page from counsellors', () => {
  auth = { initializing: false, isAuthenticated: true, user: { role: 'counsellor' } };
  render(<MemoryRouter initialEntries={['/admin']}><Routes><Route element={<RoleRoute roles={['admin']} />}><Route path="/admin" element={<span>admin</span>} /></Route><Route path="/" element={<span>home</span>} /></Routes></MemoryRouter>);
  expect(screen.getByText('home')).toBeInTheDocument();
});
