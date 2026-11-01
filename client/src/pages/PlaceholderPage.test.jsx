import { render, screen } from '@testing-library/react';
import { PlaceholderPage } from './PlaceholderPage.jsx';

vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ isLoading: false, isError: false }) }));

test('renders a placeholder page heading', () => {
  render(<PlaceholderPage title="Dashboard" description="Overview" />);
  expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
});
