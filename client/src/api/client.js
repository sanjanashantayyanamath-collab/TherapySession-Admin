import axios from 'axios';
import { normalizeApiError } from './errors.js';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

let accessToken = null;
let refreshPromise = null;
let onSessionExpired = () => {};

export function setAccessToken(token) {
  accessToken = token;
}

export function clearAccessToken() {
  accessToken = null;
}

export function configureSessionExpiry(callback) {
  onSessionExpired = callback;
}

export function getAccessToken() {
  return accessToken;
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (error.response?.status !== 401 || config?._retry || config?.url?.endsWith('/auth/refresh')) {
      return Promise.reject(normalizeApiError(error));
    }
    config._retry = true;
    try {
      refreshPromise ??= api.post('/auth/refresh').finally(() => {
        refreshPromise = null;
      });
      const response = await refreshPromise;
      setAccessToken(response.data.accessToken);
      config.headers.Authorization = `Bearer ${accessToken}`;
      return api(config);
    } catch (refreshError) {
      clearAccessToken();
      onSessionExpired();
      return Promise.reject(normalizeApiError(refreshError));
    }
  },
);
