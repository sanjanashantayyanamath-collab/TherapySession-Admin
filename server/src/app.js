import express from 'express';
import crypto from 'node:crypto';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { env } from './config/env.js';
import { isDatabaseReady } from './config/database.js';
import {
  applySecurityMiddleware,
  authRateLimiter,
} from './middleware/security.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import availabilityRoutes from './routes/availabilityRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import userRoutes from './routes/userRoutes.js';

export function createApp() {
  const app = express();

  app.set('env', env.NODE_ENV);
  app.use(
    pinoHttp({
      genReqId: (request) => request.get('x-request-id') || crypto.randomUUID(),
      serializers: {
        req: (request) => ({
          id: request.id,
          method: request.method,
          url: request.url,
          remoteAddress: request.remoteAddress,
        }),
      },
      redact: [
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]',
      ],
    }),
  );
  applySecurityMiddleware(app);
  app.use(cookieParser());

  app.get('/healthz', (_request, response) => {
    response.status(200).json({ status: 'ok' });
  });

  app.get('/readyz', (_request, response) => {
    const ready = isDatabaseReady();
    response
      .status(ready ? 200 : 503)
      .json({ status: ready ? 'ready' : 'not_ready' });
  });
  app.use('/api/v1/auth/login', authRateLimiter);
  app.use('/api/v1/auth/refresh', authRateLimiter);
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/appointments', appointmentRoutes);
  app.use('/api/v1/availability', availabilityRoutes);
  app.use('/api/v1/stats', statsRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
