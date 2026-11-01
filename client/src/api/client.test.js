import axios from 'axios';
import { api, clearAccessToken, configureSessionExpiry, getAccessToken, setAccessToken } from './client.js';

vi.mock('axios', async () => {
  const actual = await vi.importActual('axios');
  return actual;
});

test('keeps access token out of browser storage', () => {
  setAccessToken('memory-token');
  expect(getAccessToken()).toBe('memory-token');
  expect(localStorage.getItem('accessToken')).toBeNull();
  expect(sessionStorage.getItem('accessToken')).toBeNull();
  clearAccessToken();
});

test('exports configured axios client with credentials', () => {
  expect(api.defaults.withCredentials).toBe(true);
  configureSessionExpiry(() => {});
  expect(axios).toBeDefined();
});
