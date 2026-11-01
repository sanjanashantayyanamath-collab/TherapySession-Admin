import { AppError } from '../utils/AppError.js';
import mongoose from 'mongoose';
import { ZodError } from 'zod';

export function errorHandler(error, request, response, next) {
  void next;
  const isProduction = request.app.get('env') === 'production';
  const mapped = mapError(error);
  const status = mapped.status;
  const code = mapped.code;
  const message =
    mapped.message ||
    (isProduction ? 'An unexpected error occurred.' : error.message);

  if (status >= 500) {
    request.log.error({ err: error }, 'Unhandled application error');
  }

  const payload = { status, code, message };
  if (mapped.details !== undefined) {
    payload.details = mapped.details;
  }

  response.status(status).json(payload);
}

function mapError(error) {
  if (error instanceof AppError) {
    return error;
  }
  if (error instanceof SyntaxError && 'body' in error) {
    return {
      status: 400,
      code: 'INVALID_JSON',
      message: 'Request body contains invalid JSON.',
    };
  }
  if (error.status === 413 || error.type === 'entity.too.large') {
    return {
      status: 413,
      code: 'PAYLOAD_TOO_LARGE',
      message: 'Request payload is too large.',
    };
  }
  if (error instanceof ZodError) {
    return {
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed.',
      details: error.issues.map((issue) => ({
        path: issue.path,
        message: issue.message,
      })),
    };
  }
  if (
    error instanceof mongoose.Error.ValidationError ||
    error instanceof mongoose.Error.CastError
  ) {
    return {
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed.',
    };
  }
  if (error?.code === 11000) {
    return {
      status: 409,
      code: 'CONFLICT',
      message: 'Resource already exists.',
    };
  }
  return { status: 500, code: 'INTERNAL_ERROR', message: undefined };
}
