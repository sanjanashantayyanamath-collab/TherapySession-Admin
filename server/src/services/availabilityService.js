import { DateTime } from 'luxon';
import Appointment from '../models/Appointment.js';
import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';
import { dayBounds } from '../utils/time.js';

export async function getAvailability(counsellorId, date) {
  const counsellor = await User.findOne({
    _id: counsellorId,
    role: 'counsellor',
    isActive: true,
  }).lean();
  if (!counsellor)
    throw new AppError(404, 'NOT_FOUND', 'Availability not found.');
  const bounds = dayBounds(date);
  const appointments = await Appointment.find({
    counsellorId,
    status: 'scheduled',
    startTime: { $lt: bounds.end },
    endTime: { $gt: bounds.start },
  })
    .sort('startTime')
    .lean();
  const slots = [];
  const now = new Date();
  let cursor = DateTime.fromISO(
    `${date}T${String(env.WORK_START_HOUR).padStart(2, '0')}:00`,
    { zone: env.WORK_TZ },
  );
  const end = DateTime.fromISO(
    `${date}T${String(env.WORK_END_HOUR).padStart(2, '0')}:00`,
    { zone: env.WORK_TZ },
  );
  while (cursor < end) {
    const slotEnd = cursor.plus({ minutes: 15 });
    const start = cursor.toUTC().toJSDate();
    const finish = slotEnd.toUTC().toJSDate();
    const booked = appointments.some(
      (appointment) =>
        appointment.startTime < finish && appointment.endTime > start,
    );
    if (!booked && finish > now)
      slots.push({
        startTime: start.toISOString(),
        endTime: finish.toISOString(),
      });
    cursor = slotEnd;
  }
  return { date, counsellorId, slots };
}
