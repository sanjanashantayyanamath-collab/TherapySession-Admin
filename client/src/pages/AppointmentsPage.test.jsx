import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppointmentsPage } from './AppointmentsPage.jsx';

const { setParams } = vi.hoisted(() => ({ setParams: vi.fn() }));
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useSearchParams: () => [new globalThis.URLSearchParams(), setParams],
}));
vi.mock('../auth/AuthContext.jsx', () => ({
  useAuth: () => ({ user: { role: 'counsellor', id: 'c1' } }),
}));
vi.mock('../api/users.js', () => ({
  useUsers: () => ({ data: { data: [] } }),
}));
vi.mock('../api/appointments.js', () => ({
  useAppointments: () => ({
    data: { data: [], meta: { total: 0 } },
    isLoading: false,
    isError: false,
  }),
  useCreateAppointment: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

test('syncs appointment filters to the URL', () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <AppointmentsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  fireEvent.change(screen.getByLabelText('Status filter'), {
    target: { value: 'completed' },
  });
  expect(setParams).toHaveBeenCalled();
});
