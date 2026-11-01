import { AppError } from '../utils/AppError.js';

export function notFound(request, _response, next) {
  next(
    new AppError(
      404,
      'NOT_FOUND',
      `Route not found: ${request.method} ${request.path}`,
    ),
  );
}
