const TOKEN_KEY = 'tsa_token';

export const getToken = () => sessionStorage.getItem(TOKEN_KEY);
export const setToken = (t) => sessionStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => sessionStorage.removeItem(TOKEN_KEY);

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Cannot reach the server. Is the API running?', 0);
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && path !== '/auth/login') {
      clearToken();
      window.dispatchEvent(new Event('tsa:logout'));
    }
    throw new ApiError(data.error || 'Request failed', res.status, data.details);
  }
  return data;
}

export const api = {
  login: (username, password) => request('/auth/login', { method: 'POST', body: { username, password } }),
  counsellors: () => request('/counsellors'),
  addCounsellor: (b) => request('/counsellors', { method: 'POST', body: b }),
  updateCounsellor: (id, b) => request(`/counsellors/${id}`, { method: 'PUT', body: b }),
  appointments: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return request(`/appointments${qs ? `?${qs}` : ''}`);
  },
  summary: () => request('/appointments/stats/summary'),
  addAppointment: (b) => request('/appointments', { method: 'POST', body: b }),
  updateAppointment: (id, b) => request(`/appointments/${id}`, { method: 'PUT', body: b }),
  setStatus: (id, status) => request(`/appointments/${id}/status`, { method: 'PATCH', body: { status } }),
  deleteAppointment: (id) => request(`/appointments/${id}`, { method: 'DELETE' }),
};

export const errorText = (e) => [e.message, ...(Array.isArray(e.details) ? e.details : [])].join(' — ');
