import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

export async function authenticate(request, _response, next) {
  try {
    const header = request.get('authorization');
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token)
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required.');
    const payload = jwt.verify(token, env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(payload.sub).lean();
    if (!user || !user.isActive)
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required.');
    request.user = user;
    return next();
  } catch (error) {
    return next(
      error instanceof AppError
        ? error
        : new AppError(401, 'UNAUTHORIZED', 'Authentication required.'),
    );
  }
}

export function requireRole(...roles) {
  return (request, _response, next) => {
    if (!request.user || !roles.includes(request.user.role)) {
      return next(new AppError(403, 'FORBIDDEN', 'Insufficient permissions.'));
    }
    return next();
  };
}
