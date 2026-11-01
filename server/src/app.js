import express from 'express';
import pinoHttp from 'pino-http';
import { AppError } from './utils/AppError.js';
import { env } from './config/env.js';
import { applySecurityMiddleware } from './middleware/security.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.set('env', env.NODE_ENV);
  app.use(
    pinoHttp({
      redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
    }),
  );
  applySecurityMiddleware(app);

  app.get('/healthz', (_request, response) => {
    response.status(200).json({ status: 'ok' });
  });

  app.use('/api/v1', (_request, _response, next) => {
    next(new AppError(404, 'NOT_FOUND', 'API route not found.'));
  });
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
