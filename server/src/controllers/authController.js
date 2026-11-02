import {
  clearRefreshCookie,
  refreshCookieName,
  setRefreshCookie,
} from '../utils/cookies.js';
import { login, refresh, revoke } from '../services/authService.js';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

export async function loginController(request, response) {
  const result = await login({ ...request.body, ip: request.ip });
  setRefreshCookie(response, result.refreshToken);
  response
    .status(200)
    .json({ accessToken: result.accessToken, user: result.user });
}

export async function refreshController(request, response) {
  const result = await refresh(request.cookies[refreshCookieName], request.ip);
  setRefreshCookie(response, result.refreshToken);
  response.status(200).json({ accessToken: result.accessToken });
}

export async function logoutController(request, response) {
  await revoke(request.cookies[refreshCookieName]);
  clearRefreshCookie(response);
  response.status(204).send();
}

export function meController(request, response) {
  const { _id, name, email, role, isActive } = request.user;
  response.json({ id: _id, name, email, role, isActive });
}

export async function registerController(request, response) {
  const passwordHash = await bcrypt.hash(request.body.password, 12);
  const user = await User.create({ ...request.body, passwordHash });
  response.status(201).json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    },
  });
}
