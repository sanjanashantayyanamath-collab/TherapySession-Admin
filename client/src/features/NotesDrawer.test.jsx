import { render, screen, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NotesDrawer } from './NotesDrawer.jsx';

const { removeQueries, role } = vi.hoisted(() => ({
  removeQueries: vi.fn(),
  role: { value: 'counsellor' },
}));
const noteState = {
  data: undefined,
  isLoading: false,
  isError: true,
  error: { response: { status: 404 } },
  refetch: vi.fn(),
};
vi.mock('../auth/AuthContext.jsx', () => ({
  useAuth: () => ({ user: { role: role.value } }),
}));
vi.mock('../api/notes.js', () => ({
  useNote: () => noteState,
  useSaveNote: () => ({ mutateAsync: vi.fn() }),
  useDeleteNote: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock('@tanstack/react-query', async () => ({
  ...(await vi.importActual('@tanstack/react-query')),
  useQueryClient: () => ({ removeQueries }),
}));

function renderDrawer() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <NotesDrawer appointmentId="appointment-1" open onClose={vi.fn()} />
    </QueryClientProvider>,
  );
}

test('shows an empty editor for a missing note and does not write storage', () => {
  renderDrawer();
  expect(screen.getByLabelText('Private note content')).toHaveValue('');
  expect(localStorage.length).toBe(0);
  expect(sessionStorage.length).toBe(0);
});

test('clears note content and query cache after five minutes idle', () => {
  vi.useFakeTimers();
  renderDrawer();
  act(() => vi.advanceTimersByTime(5 * 60 * 1000));
  expect(removeQueries).toHaveBeenCalledWith({
    queryKey: ['notes', 'appointment-1'],
  });
  vi.useRealTimers();
});

test('locks after two minutes while the tab is hidden', () => {
  vi.useFakeTimers();
  renderDrawer();
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    value: true,
  });
  act(() => document.dispatchEvent(new window.Event('visibilitychange')));
  act(() => vi.advanceTimersByTime(2 * 60 * 1000));
  expect(removeQueries).toHaveBeenCalledWith({
    queryKey: ['notes', 'appointment-1'],
  });
  vi.useRealTimers();
});

test('never renders notes for admins', () => {
  role.value = 'admin';
  renderDrawer();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  role.value = 'counsellor';
});

test('clears note content and cache when logout changes the role', () => {
  noteState.data = { content: 'private text' };
  const view = renderDrawer();
  expect(screen.getByLabelText('Private note content')).toHaveValue(
    'private text',
  );
  role.value = 'admin';
  view.rerender(
    <QueryClientProvider client={new QueryClient()}>
      <NotesDrawer appointmentId="appointment-1" open onClose={vi.fn()} />
    </QueryClientProvider>,
  );
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(removeQueries).toHaveBeenCalledWith({
    queryKey: ['notes', 'appointment-1'],
  });
  noteState.data = undefined;
  role.value = 'counsellor';
});
