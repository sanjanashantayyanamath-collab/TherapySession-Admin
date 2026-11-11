import { Router } from 'express';
import mongoose from 'mongoose';
import Appointment, { STATUSES } from '../models/Appointment.js';
import Counsellor from '../models/Counsellor.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { validateAppointment } from '../validate.js';

const router = Router();

async function assertNoOverlap({ counsellor, startTime, endTime }, ignoreId) {
  const clash = await Appointment.findOne({
    counsellor,
    status: { $ne: 'cancelled' },
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
    ...(ignoreId ? { _id: { $ne: ignoreId } } : {}),
  });
  if (clash) throw new HttpError(409, 'This slot overlaps another appointment for the same counsellor');
}

// List with filters: ?counsellor=&status=&from=&to=
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { counsellor, status, from, to } = req.query;
    const q = {};
    if (counsellor) {
      if (!mongoose.isValidObjectId(counsellor)) throw new HttpError(400, 'Invalid counsellor id');
      q.counsellor = counsellor;
    }
    if (status) {
      if (!STATUSES.includes(status)) throw new HttpError(400, 'Invalid status filter');
      q.status = status;
    }
    if (from || to) {
      q.startTime = {};
      if (from) {
        const d = new Date(from);
        if (Number.isNaN(d.getTime())) throw new HttpError(400, 'Invalid from date');
        q.startTime.$gte = d;
      }
      if (to) {
        const d = new Date(to);
        if (Number.isNaN(d.getTime())) throw new HttpError(400, 'Invalid to date');
        q.startTime.$lte = d;
      }
    }
    const items = await Appointment.find(q).populate('counsellor', 'name').sort({ startTime: 1 }).limit(500);
    res.json(items);
  })
);

// Attendance summary per counsellor
router.get(
  '/stats/summary',
  asyncHandler(async (req, res) => {
    const rows = await Appointment.aggregate([
      { $group: { _id: { counsellor: '$counsellor', status: '$status' }, count: { $sum: 1 } } },
    ]);
    const counsellors = await Counsellor.find().select('name');
    const names = Object.fromEntries(counsellors.map((c) => [c.id, c.name]));
    const byId = {};
    for (const r of rows) {
      const id = String(r._id.counsellor);
      byId[id] ??= { counsellorId: id, name: names[id] || 'Unknown', scheduled: 0, attended: 0, missed: 0, cancelled: 0 };
      byId[id][r._id.status] = r.count;
    }
    res.json(Object.values(byId));
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = validateAppointment(req.body);
    const c = await Counsellor.findById(data.counsellor);
    if (!c || !c.active) throw new HttpError(400, 'Counsellor not found or inactive');
    await assertNoOverlap(data);
    const doc = await Appointment.create(data);
    res.status(201).json(await doc.populate('counsellor', 'name'));
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const patch = validateAppointment(req.body, { partial: true });
    const existing = await Appointment.findById(req.params.id);
    if (!existing) throw new HttpError(404, 'Appointment not found');
    const merged = {
      counsellor: patch.counsellor ?? existing.counsellor,
      startTime: patch.startTime ?? existing.startTime,
      endTime: patch.endTime ?? existing.endTime,
    };
    if (merged.endTime <= merged.startTime) throw new HttpError(400, 'endTime must be after startTime');
    await assertNoOverlap(merged, existing.id);
    existing.set(patch);
    await existing.save();
    res.json(await existing.populate('counsellor', 'name'));
  })
);

// Quick attendance update
router.patch(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const { status } = validateAppointment({ status: req.body?.status }, { partial: true });
    if (!status) throw new HttpError(400, 'status is required');
    const doc = await Appointment.findByIdAndUpdate(req.params.id, { status }, { new: true }).populate('counsellor', 'name');
    if (!doc) throw new HttpError(404, 'Appointment not found');
    res.json(doc);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const doc = await Appointment.findByIdAndDelete(req.params.id);
    if (!doc) throw new HttpError(404, 'Appointment not found');
    res.status(204).end();
  })
);

export default router;
