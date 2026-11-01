import { AppError } from '../utils/AppError.js';

export function errorHandler(error, request, response, _next) {
  const isProduction = request.app.get('env') === 'production';
  const status = error instanceof AppError ? error.status : 500;
  const code = error instanceof AppError ? error.code : 'INTERNAL_ERROR';
  const message =
    error instanceof AppError
      ? error.message
      : isProduction
        ? 'An unexpected error occurred.'
        : error.message;

  if (status >= 500) {
    request.log.error({ err: error }, 'Unhandled application error');
  }

  const payload = { status, code, message };
  if (error instanceof AppError && error.details !== undefined) {
    payload.details = error.details;
  }

  response.status(status).json(payload);
}
