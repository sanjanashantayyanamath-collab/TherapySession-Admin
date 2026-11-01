import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, requireRole } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, registerSchema } from '../schemas/authSchemas.js';
import {
  loginController,
  logoutController,
  meController,
  refreshController,
  registerController,
} from '../controllers/authController.js';
import { AppError } from '../utils/AppError.js';

const router = Router();

router.post('/login', validate(loginSchema), asyncHandler(loginController));
router.post('/refresh', asyncHandler(refreshController));
router.post('/logout', asyncHandler(logoutController));
router.get('/me', authenticate, meController);
router.post(
  '/register',
  authenticate,
  requireRole('admin'),
  validate(registerSchema),
  asyncHandler(registerController),
);
router.use((_request, _response, next) =>
  next(new AppError(404, 'NOT_FOUND', 'Auth route not found.')),
);

export default router;
