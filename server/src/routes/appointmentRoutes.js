import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import * as controller from '../controllers/appointmentController.js';
import {
  appointmentIdSchema,
  appointmentListSchema,
  attendanceSchema,
  createAppointmentSchema,
  updateAppointmentSchema,
} from '../schemas/appointmentSchemas.js';

const router = Router();
router.use(authenticate);
router.post(
  '/',
  validate(createAppointmentSchema),
  controller.createAppointment,
);
router.get('/', validate(appointmentListSchema), controller.listAppointments);
router.get('/:id', validate(appointmentIdSchema), controller.getAppointment);
router.patch(
  '/:id',
  validate(updateAppointmentSchema),
  controller.updateAppointment,
);
router.patch(
  '/:id/attendance',
  validate(attendanceSchema),
  controller.updateAttendance,
);
router.delete(
  '/:id',
  validate(appointmentIdSchema),
  controller.deleteAppointment,
);
export default router;
