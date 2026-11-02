import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminUsersPage } from './AdminUsersPage.jsx';

const { mutateAsync } = vi.hoisted(() => ({
  mutateAsync: vi.fn().mockResolvedValue({}),
}));
vi.mock('../auth/AuthContext.jsx', () => ({
  useAuth: () => ({ user: { id: 'admin-1', role: 'admin' } }),
}));
vi.mock('../api/users.js', () => ({
  useUsers: () => ({
    data: {
      data: [
        {
          id: 'user-1',
          name: 'Counsellor',
          email: 'c@example.com',
          role: 'counsellor',
          isActive: true,
        },
      ],
      meta: { total: 1 },
    },
    isLoading: false,
    isError: false,
  }),
  useDeactivateUser: () => ({ mutateAsync, isPending: false }),
  useRegisterCounsellor: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

test('deactivates a user after confirmation', async () => {
  render(
    <MemoryRouter>
      <AdminUsersPage />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
  await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith('user-1'));
});
