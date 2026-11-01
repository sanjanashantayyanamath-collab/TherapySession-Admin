import bcrypt from 'bcrypt';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { env } from '../src/config/env.js';
import User from '../src/models/User.js';
import Appointment from '../src/models/Appointment.js';
import { DateTime } from 'luxon';

const seedUsers = [
  {
    name: 'System Admin',
    email: 'admin@example.invalid',
    role: 'admin',
    password: env.ADMIN_SEED_PASSWORD,
  },
  {
    name: 'Counsellor One',
    email: 'counsellor1@example.invalid',
    role: 'counsellor',
    password: env.COUNSELLOR_ONE_SEED_PASSWORD,
  },
  {
    name: 'Counsellor Two',
    email: 'counsellor2@example.invalid',
    role: 'counsellor',
    password: env.COUNSELLOR_TWO_SEED_PASSWORD,
  },
];

if (seedUsers.some((user) => !user.password))
  throw new Error('All seed passwords must be configured.');
await connectDatabase();
for (const user of seedUsers) {
  await User.updateOne(
    { email: user.email },
    {
      $set: {
        name: user.name,
        role: user.role,
        passwordHash: await bcrypt.hash(user.password, 12),
        isActive: true,
      },
    },
    { upsert: true },
  );
}
const counsellors = await User.find({ role: 'counsellor' })
  .sort({ email: 1 })
  .limit(2);
const tomorrow = DateTime.now()
  .setZone(env.WORK_TZ)
  .plus({ days: 1 })
  .set({
    hour: env.WORK_START_HOUR + 1,
    minute: 0,
    second: 0,
    millisecond: 0,
  });
const pastStart = tomorrow.minus({ days: 7 });
const futureStart = tomorrow;
const sampleAppointments = [
  {
    counsellorId: counsellors[0]._id,
    clientCode: 'CL-DEMO1',
    startTime: pastStart.toUTC().toJSDate(),
    endTime: pastStart.plus({ hours: 1 }).toUTC().toJSDate(),
    durationMins: 60,
    sessionType: 'online',
    status: 'completed',
    attendance: 'attended',
  },
  {
    counsellorId: counsellors[1]._id,
    clientCode: 'CL-DEMO2',
    startTime: futureStart.toUTC().toJSDate(),
    endTime: futureStart.plus({ hours: 1 }).toUTC().toJSDate(),
    durationMins: 60,
    sessionType: 'in-person',
    status: 'scheduled',
    attendance: 'pending',
  },
];
await Appointment.deleteMany({ clientCode: { $in: ['CL-DEMO1', 'CL-DEMO2'] } });
await Appointment.insertMany(sampleAppointments);
await disconnectDatabase();
console.log('Seed complete.');
