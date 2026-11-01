import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { listUsers, deactivateUser } from '../controllers/userController.js';
import { userIdSchema, userListSchema } from '../schemas/userSchemas.js';

const router = Router();
router.use(authenticate, requireRole('admin'));
router.get('/', validate(userListSchema), listUsers);
router.patch('/:id/deactivate', validate(userIdSchema), deactivateUser);
export default router;
