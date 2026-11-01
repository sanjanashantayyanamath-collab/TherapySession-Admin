import { DateTime } from 'luxon';
import { env } from '../config/env.js';

export function validateBusinessSlot(start, end) {
  const localStart = DateTime.fromJSDate(start, { zone: 'utc' }).setZone(
    env.WORK_TZ,
  );
  const localEnd = DateTime.fromJSDate(end, { zone: 'utc' }).setZone(
    env.WORK_TZ,
  );
  if (!localStart.isValid || !localEnd.isValid) return false;
  if (
    localStart.minute % 15 !== 0 ||
    localStart.second !== 0 ||
    localStart.millisecond !== 0 ||
    localEnd.minute % 15 !== 0 ||
    localEnd.second !== 0 ||
    localEnd.millisecond !== 0
  )
    return false;
  return (
    localStart.hour >= env.WORK_START_HOUR &&
    (localEnd.hour < env.WORK_END_HOUR ||
      (localEnd.hour === env.WORK_END_HOUR && localEnd.minute === 0)) &&
    localEnd > localStart &&
    localStart.hasSame(localEnd, 'day')
  );
}

export function dayBounds(dateValue) {
  const day = DateTime.fromISO(dateValue, { zone: env.WORK_TZ });
  if (!day.isValid) throw new Error('date must be YYYY-MM-DD');
  return {
    start: day.startOf('day').toUTC().toJSDate(),
    end: day.endOf('day').toUTC().toJSDate(),
  };
}
