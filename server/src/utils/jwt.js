import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function createAccessToken(user) {
  return jwt.sign({ role: user.role }, env.ACCESS_TOKEN_SECRET, {
    subject: user._id.toString(),
    expiresIn: '15m',
  });
}
