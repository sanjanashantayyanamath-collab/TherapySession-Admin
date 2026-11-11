import { Router } from 'express';
import Counsellor from '../models/Counsellor.js';
import Appointment from '../models/Appointment.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { validateCounsellor } from '../validate.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await Counsellor.find().sort({ name: 1 }));
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = validateCounsellor(req.body);
    res.status(201).json(await Counsellor.create(data));
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = validateCounsellor(req.body, { partial: true });
    const doc = await Counsellor.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!doc) throw new HttpError(404, 'Counsellor not found');
    res.json(doc);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const inUse = await Appointment.exists({ counsellor: req.params.id });
    if (inUse) throw new HttpError(409, 'Counsellor has appointments. Mark them inactive instead of deleting.');
    const doc = await Counsellor.findByIdAndDelete(req.params.id);
    if (!doc) throw new HttpError(404, 'Counsellor not found');
    res.status(204).end();
  })
);

export default router;
