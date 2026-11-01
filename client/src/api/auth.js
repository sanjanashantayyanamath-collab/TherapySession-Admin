import { api } from './client.js';

/** @param {{email: string, password: string}} credentials */
export async function login(credentials) {
  return (await api.post('/auth/login', credentials)).data;
}

export async function refresh() {
  return (await api.post('/auth/refresh')).data;
}

export async function logout() {
  await api.post('/auth/logout');
}

export async function me() {
  return (await api.get('/auth/me')).data;
}
