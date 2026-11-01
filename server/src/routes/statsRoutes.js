import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { stats } from '../controllers/statsController.js';
import { statsSchema } from '../schemas/appointmentSchemas.js';

const router = Router();
router.get('/', authenticate, validate(statsSchema), stats);
export default router;
