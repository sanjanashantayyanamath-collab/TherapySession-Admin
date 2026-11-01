import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginPage } from './LoginPage.jsx';

const login = vi.fn();
vi.mock('../auth/AuthContext.jsx', () => ({ useAuth: () => ({ login }) }));

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
