import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeToggle } from './ThemeToggle.jsx';

test('toggles the document theme', async () => {
  const user = userEvent.setup();
  render(<ThemeToggle />);
  expect(document.documentElement).not.toHaveClass('dark');
  await user.click(screen.getByRole('button', { name: 'Use dark theme' }));
  expect(document.documentElement).toHaveClass('dark');
  expect(localStorage.getItem('theme')).toBe('dark');
  await user.click(screen.getByRole('button', { name: 'Use light theme' }));
  expect(document.documentElement).not.toHaveClass('dark');
});
