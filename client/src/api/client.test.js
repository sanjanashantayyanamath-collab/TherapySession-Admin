import axios, { AxiosError } from 'axios';
import { afterEach } from 'vitest';
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

describe('access token refresh', () => {
  const originalAdapter = api.defaults.adapter;

  afterEach(() => {
    api.defaults.adapter = originalAdapter;
    clearAccessToken();
    configureSessionExpiry(() => {});
  });

  test('shares one refresh request between parallel unauthorized requests', async () => {
    const calls = [];
    api.defaults.adapter = async (config) => {
      calls.push(config.url);
      if (config.url === '/auth/refresh') return { config, data: { accessToken: 'refreshed-token' }, headers: {}, status: 200, statusText: 'OK' };
      if (config.headers.Authorization === 'Bearer refreshed-token') return { config, data: { ok: true }, headers: {}, status: 200, statusText: 'OK' };
      throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, { status: 401, data: {} });
    };
    setAccessToken('expired-token');

    await expect(Promise.all([api.get('/private-a'), api.get('/private-b')])).resolves.toEqual([
      expect.objectContaining({ data: { ok: true } }),
      expect.objectContaining({ data: { ok: true } }),
    ]);
    expect(calls.filter((url) => url === '/auth/refresh')).toHaveLength(1);
  });

  test('clears the token and expires the session when refresh fails', async () => {
    const onExpired = vi.fn();
    configureSessionExpiry(onExpired);
    const calls = [];
    api.defaults.adapter = async (config) => {
      calls.push(config.url);
      if (config.url === '/auth/refresh') throw new AxiosError('Refresh failed', 'ERR_BAD_REQUEST', config, null, { status: 401, data: {} });
      throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, { status: 401, data: {} });
    };
    setAccessToken('expired-token');

    await expect(Promise.allSettled([api.get('/private-a'), api.get('/private-b')])).resolves.toHaveLength(2);
    expect(calls.filter((url) => url === '/auth/refresh')).toHaveLength(1);
    expect(getAccessToken()).toBeNull();
    expect(onExpired).toHaveBeenCalledTimes(2);
  });
});
