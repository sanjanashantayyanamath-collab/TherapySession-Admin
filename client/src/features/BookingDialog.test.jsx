import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BookingDialog } from './BookingDialog.jsx';

const { mutateAsync, refetch, toastError } = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  refetch: vi.fn(),
  toastError: vi.fn(),
}));
function renderBooking(props) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <BookingDialog {...props} />
    </QueryClientProvider>,
  );
}

vi.mock('../auth/AuthContext.jsx', () => ({
  useAuth: () => ({ user: { id: 'counsellor-1', role: 'counsellor' } }),
}));
vi.mock('../api/users.js', () => ({
  useUsers: () => ({ data: { data: [] } }),
}));
vi.mock('../api/availability.js', () => ({
  useAvailability: () => ({
    data: {
      slots: [
        { startTime: '2099-11-02T09:00:00.000Z' },
        { startTime: '2099-11-02T09:15:00.000Z' },
        { startTime: '2099-11-02T09:30:00.000Z' },
        { startTime: '2099-11-02T09:45:00.000Z' },
      ],
    },
    isLoading: false,
    isError: false,
    refetch,
  }),
}));
vi.mock('../api/appointments.js', () => ({
  useCreateAppointment: () => ({ mutateAsync, isPending: false }),
}));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: toastError },
}));

test('shows and blocks a personal identifier in the client code field', async () => {
  const user = userEvent.setup();
  renderBooking({ open: true, onClose: vi.fn() });
  await user.type(screen.getByLabelText('Client code'), 'Jane Doe');
  expect(screen.getByRole('alert')).toHaveTextContent(
    'pseudonymous client code',
  );
  await user.click(screen.getByRole('button', { name: 'Book appointment' }));
  expect(mutateAsync).not.toHaveBeenCalled();
});

test('refreshes availability and reports a slot conflict', async () => {
  const user = userEvent.setup();
  mutateAsync.mockRejectedValueOnce({
    response: {
      status: 409,
      data: { code: 'SLOT_CONFLICT', message: 'Conflict' },
    },
  });
  renderBooking({ open: true, onClose: vi.fn(), initialDate: '2099-11-02' });
  await user.type(screen.getByLabelText('Client code'), 'CL-AB12');
  await user.selectOptions(screen.getByLabelText('Duration'), '30');
  await user.selectOptions(screen.getByLabelText('Session type'), 'online');
  const startTime = screen.getByLabelText('Start time');
  await waitFor(() => expect(startTime.options.length).toBeGreaterThan(1));
  await user.selectOptions(startTime, startTime.options[1].value);
  expect(screen.getByLabelText('Client code')).toHaveValue('CL-AB12');
  expect(screen.getByLabelText('Duration')).toHaveValue('30');
  expect(screen.getByLabelText('Session type')).toHaveValue('online');
  expect(screen.getByLabelText('Date')).toHaveValue('2099-11-02');
  expect(startTime).toHaveValue(startTime.options[1].value);
  await user.click(screen.getByRole('button', { name: 'Book appointment' }));
  await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
  await waitFor(() => expect(refetch).toHaveBeenCalled());
  expect(toastError).toHaveBeenCalledWith(
    expect.stringContaining('just booked'),
  );
});
