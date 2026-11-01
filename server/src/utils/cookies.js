import { env } from '../config/env.js';

export const refreshCookieName = 'refreshToken';
export const refreshCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api/v1/auth',
};

export function setRefreshCookie(response, token) {
  response.cookie(refreshCookieName, token, {
    ...refreshCookieOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

export function clearRefreshCookie(response) {
  response.clearCookie(refreshCookieName, refreshCookieOptions);
}
