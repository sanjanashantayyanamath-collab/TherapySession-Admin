import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import counsellorRoutes from './routes/counsellors.js';
import appointmentRoutes from './routes/appointments.js';
import { requireAdmin } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
  app.use(express.json({ limit: '10kb' }));

  app.get('/api/health', (req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRoutes);
  // Everything below is admin-only.
  app.use('/api/counsellors', requireAdmin, counsellorRoutes);
  app.use('/api/appointments', requireAdmin, appointmentRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
