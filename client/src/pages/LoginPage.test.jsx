import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginPage } from './LoginPage.jsx';

const login = vi.fn();
const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));
vi.mock('../auth/AuthContext.jsx', () => ({ useAuth: () => ({ login }) }));
vi.mock('react-hot-toast', () => ({ default: { error: toastError } }));

function renderLogin() { return render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><LoginPage /></MemoryRouter></QueryClientProvider>); }

test('validates login fields and submits valid credentials', async () => {
  const user = userEvent.setup();
  const view = renderLogin();
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
  expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
  await user.type(screen.getByRole('textbox', { name: 'Email' }), 'staff@example.invalid');
  await user.type(view.container.querySelector('#password'), 'password');
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
  expect(login).toHaveBeenCalledWith({ email: 'staff@example.invalid', password: 'password' });
});

test('displays login errors returned by the API', async () => {
  const user = userEvent.setup();
  login.mockRejectedValueOnce({ response: { status: 401, data: { message: 'Invalid email or password.' } } });
  renderLogin();
  await user.type(screen.getByRole('textbox', { name: 'Email' }), 'staff@example.invalid');
  await user.type(document.querySelector('#password'), 'wrong-password');
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
  expect(toastError).toHaveBeenCalledWith('Invalid email or password.');
});
