import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppointmentDetailPage } from './AppointmentDetailPage.jsx';

vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useParams: () => ({ id: 'appointment-1' }),
  useNavigate: () => vi.fn(),
}));
vi.mock('../auth/AuthContext.jsx', () => ({
  useAuth: () => ({ user: { role: 'counsellor' } }),
}));
vi.mock('../api/appointments.js', () => ({
  useAppointment: () => ({
    data: {
      id: 'appointment-1',
      clientCode: 'CL-AB12',
      startTime: new Date(Date.now() + 3600000).toISOString(),
      endTime: new Date(Date.now() + 7200000).toISOString(),
      durationMins: 60,
      sessionType: 'online',
      status: 'scheduled',
      attendance: 'pending',
      counsellorId: 'c1',
    },
    isLoading: false,
    isError: false,
  }),
  useUpdateAttendance: () => ({ mutateAsync: vi.fn() }),
  useCancelAppointment: () => ({ mutateAsync: vi.fn() }),
  useUpdateAppointment: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock('../api/availability.js', () => ({
  useAvailability: () => ({
    data: { slots: [] },
    isLoading: false,
    refetch: vi.fn(),
  }),
}));
vi.mock('../api/notes.js', () => ({
  useNote: () => ({ data: undefined, isLoading: false, isError: false }),
  useSaveNote: () => ({ mutateAsync: vi.fn() }),
  useDeleteNote: () => ({ mutateAsync: vi.fn() }),
}));

test('disables attendance before the appointment start time', () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <AppointmentDetailPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  expect(screen.getByRole('button', { name: 'Mark attended' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Mark no-show' })).toBeDisabled();
});
