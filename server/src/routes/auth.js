import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import Admin from '../models/Admin.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { requireAdmin } from '../middleware/auth.js';
import { validateLogin } from '../validate.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
});

router.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { username, password } = validateLogin(req.body);
    const admin = await Admin.findOne({ username }).select('+passwordHash');
    const ok = admin && (await bcrypt.compare(password, admin.passwordHash));
    if (!ok) throw new HttpError(401, 'Invalid username or password');
    const token = jwt.sign({ sub: admin.id, username: admin.username, role: 'admin' }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    });
    res.json({ token, username: admin.username });
  })
);

router.get('/me', requireAdmin, (req, res) => res.json(req.admin));

export default router;
