import Appointment from '../models/Appointment.js';
import { env } from '../config/env.js';

export async function getStats({ from, to, counsellorId }, user) {
  const match = {
    startTime: { $gte: new Date(from), $lte: new Date(to) },
  };
  if (user.role === 'admin' && counsellorId) match.counsellorId = counsellorId;
  if (user.role !== 'admin') match.counsellorId = user._id;
  const [summary, weekly] = await Promise.all([
    Appointment.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          attended: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'completed'] },
                    { $eq: ['$attendance', 'attended'] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          noShow: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'completed'] },
                    { $eq: ['$attendance', 'no-show'] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          lateCancels: {
            $sum: { $cond: [{ $eq: ['$attendance', 'late-cancel'] }, 1, 0] },
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
          },
        },
      },
    ]),
    Appointment.aggregate([
      { $match: { ...match, status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%G-W%V',
              date: '$startTime',
              timezone: env.WORK_TZ,
            },
          },
          sessions: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, week: '$_id', sessions: 1 } },
    ]),
  ]);
  const result = summary[0] ?? {
    total: 0,
    completed: 0,
    attended: 0,
    noShow: 0,
    lateCancels: 0,
    cancelled: 0,
  };
  return {
    total: result.total,
    completed: result.completed,
    attended: result.attended,
    noShow: result.noShow,
    lateCancels: result.lateCancels,
    cancelled: result.cancelled,
    attendanceRate: result.completed ? result.attended / result.completed : 0,
    noShowRate: result.completed ? result.noShow / result.completed : 0,
    sessionsPerWeek: weekly,
  };
}
