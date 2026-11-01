import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './AuthContext.jsx';
import * as authApi from '../api/auth.js';

vi.mock('../api/auth.js', () => ({
  refresh: vi.fn().mockRejectedValue(new Error('No session')),
  me: vi.fn(),
  logout: vi.fn().mockResolvedValue(undefined),
  login: vi.fn(),
}));

function createWrapper(queryClient) {
  return ({ children }) => <QueryClientProvider client={queryClient}><AuthProvider>{children}</AuthProvider></QueryClientProvider>;
}

test('logout clears the query cache', async () => {
  const queryClient = new QueryClient();
  queryClient.setQueryData(['appointments'], [{ id: 'appointment-1' }]);
  const { result } = renderHook(() => useAuth(), { wrapper: createWrapper(queryClient) });
  await waitFor(() => expect(result.current.initializing).toBe(false));

  await act(() => result.current.logout());

  expect(authApi.logout).toHaveBeenCalled();
  expect(queryClient.getQueryData(['appointments'])).toBeUndefined();
});
