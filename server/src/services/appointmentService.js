import mongoose from 'mongoose';
import Appointment from '../models/Appointment.js';
import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { writeAudit } from '../utils/audit.js';
import { validateBusinessSlot } from '../utils/time.js';

function toDates(input) {
  const startTime = new Date(input.startTime);
  const endTime = new Date(input.endTime);
  return { startTime, endTime, durationMins: (endTime - startTime) / 60_000 };
}

function assertSlot(startTime, endTime, durationMins, allowPast = false) {
  if (!allowPast && startTime <= new Date()) {
    throw new AppError(
      400,
      'PAST_APPOINTMENT',
      'Appointments cannot be booked in the past.',
    );
  }
  if (
    !Number.isInteger(durationMins) ||
    durationMins < 15 ||
    durationMins > 120 ||
    durationMins % 15 !== 0
  ) {
    throw new AppError(
      400,
      'INVALID_SLOT',
      'Duration must be between 15 and 120 minutes in 15-minute increments.',
    );
  }
  if (!validateBusinessSlot(startTime, endTime)) {
    throw new AppError(
      400,
      'OUTSIDE_BUSINESS_HOURS',
      'Appointment must use a 15-minute grid within business hours.',
    );
  }
}

async function assertCounsellor(counsellorId) {
  const user = await User.findOne({
    _id: counsellorId,
    role: 'counsellor',
    isActive: true,
  }).lean();
  if (!user)
    throw new AppError(
      400,
      'INVALID_COUNSELLOR',
      'Counsellor is invalid or inactive.',
    );
}

function scopedId(user, id) {
  return user.role === 'admin'
    ? { _id: id }
    : { _id: id, counsellorId: user._id };
}

async function acquireBookingLock(counsellorId, session) {
  const result = await User.updateOne(
    { _id: counsellorId, role: 'counsellor', isActive: true },
    { $inc: { bookingVersion: 1 } },
    { session },
  );
  if (result.matchedCount !== 1) {
    throw new AppError(
      400,
      'INVALID_COUNSELLOR',
      'Counsellor is invalid or inactive.',
    );
  }
}

export async function createAppointment(input, user, ip) {
  if (user.role === 'counsellor' && input.counsellorId) {
    throw new AppError(
      400,
      'COUNSELLOR_NOT_ALLOWED',
      'Counsellors cannot provide counsellorId.',
    );
  }
  const counsellorId =
    user.role === 'admin' ? input.counsellorId : user._id.toString();
  if (!counsellorId)
    throw new AppError(
      400,
      'COUNSELLOR_REQUIRED',
      'counsellorId is required for admin bookings.',
    );
  await assertCounsellor(counsellorId);
  const dates = toDates(input);
  assertSlot(dates.startTime, dates.endTime, dates.durationMins);
  const session = await mongoose.startSession();
  try {
    let appointment;
    await session.withTransaction(async () => {
      await acquireBookingLock(counsellorId, session);
      const conflict = await Appointment.findOne({
        counsellorId,
        status: 'scheduled',
        startTime: { $lt: dates.endTime },
        endTime: { $gt: dates.startTime },
      }).session(session);
      if (conflict)
        throw new AppError(
          409,
          'SLOT_CONFLICT',
          'Appointment overlaps an existing scheduled appointment.',
        );
      [appointment] = await Appointment.create(
        [{ ...input, counsellorId, ...dates }],
        { session },
      );
      await writeAudit({
        actorId: user._id,
        action: 'appointment.create',
        resourceType: 'appointment',
        resourceId: appointment._id.toString(),
        ip,
        session,
      });
    });
    return appointment;
  } finally {
    await session.endSession();
  }
}

export async function listAppointments(query, user) {
  const filter = user.role === 'admin' ? {} : { counsellorId: user._id };
  if (query.counsellorId && user.role === 'admin')
    filter.counsellorId = query.counsellorId;
  if (query.from || query.to) {
    filter.startTime = {
      ...(query.from && { $gte: new Date(query.from) }),
      ...(query.to && { $lte: new Date(query.to) }),
    };
  }
  for (const field of ['status', 'attendance', 'clientCode']) {
    if (query[field]) filter[field] = query[field];
  }
  const [data, total] = await Promise.all([
    Appointment.find(filter)
      .sort(query.sort)
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),
    Appointment.countDocuments(filter),
  ]);
  return { data, meta: { page: query.page, limit: query.limit, total } };
}

export async function getAppointment(id, user) {
  const appointment = await Appointment.findOne(scopedId(user, id)).lean();
  if (!appointment)
    throw new AppError(404, 'NOT_FOUND', 'Appointment not found.');
  return appointment;
}

export async function reschedule(id, input, user, ip) {
  const dates = toDates(input);
  assertSlot(dates.startTime, dates.endTime, dates.durationMins);
  const session = await mongoose.startSession();
  try {
    let appointment;
    await session.withTransaction(async () => {
      appointment = await Appointment.findOne(scopedId(user, id)).session(
        session,
      );
      if (!appointment)
        throw new AppError(404, 'NOT_FOUND', 'Appointment not found.');
      if (appointment.status !== 'scheduled') {
        throw new AppError(
          409,
          'INVALID_STATE',
          'Only scheduled appointments can be rescheduled.',
        );
      }
      await acquireBookingLock(appointment.counsellorId, session);
      const conflict = await Appointment.findOne({
        _id: { $ne: appointment._id },
        counsellorId: appointment.counsellorId,
        status: 'scheduled',
        startTime: { $lt: dates.endTime },
        endTime: { $gt: dates.startTime },
      }).session(session);
      if (conflict)
        throw new AppError(
          409,
          'SLOT_CONFLICT',
          'Appointment overlaps an existing scheduled appointment.',
        );
      Object.assign(appointment, dates, {
        rescheduledAt: new Date(),
        rescheduleCount: appointment.rescheduleCount + 1,
      });
      await appointment.save({ session });
      await writeAudit({
        actorId: user._id,
        action: 'appointment.update',
        resourceType: 'appointment',
        resourceId: id,
        ip,
        session,
      });
    });
    return appointment;
  } finally {
    await session.endSession();
  }
}

export async function changeAttendance(id, attendance, user, ip) {
  const appointment = await Appointment.findOne(scopedId(user, id));
  if (!appointment)
    throw new AppError(404, 'NOT_FOUND', 'Appointment not found.');
  if (appointment.status !== 'scheduled') {
    throw new AppError(
      409,
      'INVALID_STATE',
      'Only scheduled appointments can have attendance recorded.',
    );
  }
  if (appointment.startTime > new Date())
    throw new AppError(
      400,
      'TOO_EARLY',
      'Attendance can only be recorded after the appointment starts.',
    );
  appointment.attendance = attendance;
  appointment.status = 'completed';
  await appointment.save();
  await writeAudit({
    actorId: user._id,
    action: 'appointment.attendance',
    resourceType: 'appointment',
    resourceId: id,
    ip,
  });
  return appointment;
}

export async function cancel(id, user, ip) {
  const appointment = await Appointment.findOne(scopedId(user, id));
  if (!appointment)
    throw new AppError(404, 'NOT_FOUND', 'Appointment not found.');
  if (appointment.status !== 'scheduled') {
    throw new AppError(
      409,
      'INVALID_STATE',
      'Only scheduled appointments can be cancelled.',
    );
  }
  appointment.status = 'cancelled';
  appointment.cancelledAt = new Date();
  if (appointment.startTime.getTime() - Date.now() <= 24 * 60 * 60 * 1000)
    appointment.attendance = 'late-cancel';
  await appointment.save();
  await writeAudit({
    actorId: user._id,
    action: 'appointment.cancel',
    resourceType: 'appointment',
    resourceId: id,
    ip,
  });
  return appointment;
}
