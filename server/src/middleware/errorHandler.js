export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (err.name === 'ValidationError' || err.name === 'StrictModeError') {
    return res.status(400).json({ error: 'Validation failed', details: Object.values(err.errors || { e: err }).map((e) => e.message) });
  }
  if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid id' });
  if (err.code === 11000) {
    return res.status(409).json({ error: 'That counsellor already has an appointment starting at this time' });
  }
  console.error(err); // never leak internals to the client
  res.status(500).json({ error: 'Something went wrong on the server' });
}
