import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { availability } from '../controllers/availabilityController.js';
import { availabilitySchema } from '../schemas/appointmentSchemas.js';

const router = Router();
router.get('/', authenticate, validate(availabilitySchema), availability);
export default router;
