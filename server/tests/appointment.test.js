import bcrypt from 'bcryptjs';
import request from 'supertest';
import { createApp } from '../src/app.js';
import User from '../src/models/User.js';
import Appointment from '../src/models/Appointment.js';

const app = createApp();
const password = 'CorrectHorse1!';

async function createUser(email, role = 'counsellor') {
  return User.create({
    name: email,
    email,
    passwordHash: await bcrypt.hash(password, 12),
    role,
  });
}

async function login(email) {
  const result = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password });
  return result.body.accessToken;
}

function slot(offsetDays = 1, hour = 10) {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() + offsetDays);
  start.setUTCHours(hour, 0, 0, 0);
  return {
    startTime: start,
    endTime: new Date(start.getTime() + 60 * 60 * 1000),
  };
}

function bodyFor(times, clientCode = 'CL-ABCD') {
  return {
    clientCode,
    startTime: times.startTime.toISOString(),
    endTime: times.endTime.toISOString(),
    sessionType: 'online',
  };
}

test('creates appointments, rejects unknown fields, and allows back-to-back slots', async () => {
  const user = await createUser('a@example.invalid');
  const token = await login(user.email);
  const first = slot();
  const created = await request(app)
    .post('/api/v1/appointments')
    .set('Authorization', `Bearer ${token}`)
    .send(bodyFor(first, 'cl-abcd'));
  expect(created.status).toBe(201);
  expect(created.body.clientCode).toBe('CL-ABCD');
  const unknown = await request(app)
    .post('/api/v1/appointments')
    .set('Authorization', `Bearer ${token}`)
    .send({ ...bodyFor(first), status: 'completed' });
  expect(unknown.status).toBe(400);
  const next = {
    startTime: first.endTime,
    endTime: new Date(first.endTime.getTime() + 60 * 60 * 1000),
  };
  const backToBack = await request(app)
    .post('/api/v1/appointments')
    .set('Authorization', `Bearer ${token}`)
    .send(bodyFor(next, 'CL-EFGH'));
  expect(backToBack.status).toBe(201);
});

test('prevents overlap, isolates counsellors, and handles concurrent booking', async () => {
  const userA = await createUser('a@example.invalid');
  const userB = await createUser('b@example.invalid');
  const tokenA = await login(userA.email);
  const tokenB = await login(userB.email);
  const times = slot();
  const concurrent = await Promise.all(
    Array.from({ length: 10 }, (_, index) =>
      request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${tokenA}`)
        .send(bodyFor(times, `CL-A${String(index).padStart(4, '0')}`)),
    ),
  );
  expect(concurrent.filter((result) => result.status === 201)).toHaveLength(1);
  expect(
    concurrent.filter((result) => result.body.code === 'SLOT_CONFLICT'),
  ).toHaveLength(9);
  const appointment = await Appointment.findOne({ counsellorId: userA._id });
  expect(
    (
      await request(app)
        .get(`/api/v1/appointments/${appointment._id}`)
        .set('Authorization', `Bearer ${tokenB}`)
    ).status,
  ).toBe(404);
  expect(
    (
      await request(app)
        .patch(`/api/v1/appointments/${appointment._id}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({
          startTime: times.startTime.toISOString(),
          endTime: times.endTime.toISOString(),
        })
    ).status,
  ).toBe(404);
  expect(
    (
      await request(app)
        .delete(`/api/v1/appointments/${appointment._id}`)
        .set('Authorization', `Bearer ${tokenB}`)
    ).status,
  ).toBe(404);
});

test('allows one concurrent reschedule, keeps scheduled state, and blocks the new slot', async () => {
  const user = await createUser('a@example.invalid');
  const token = await login(user.email);
  const day = new Date();
  day.setUTCDate(day.getUTCDate() + 1);
  day.setUTCHours(9, 0, 0, 0);
  const appointments = await Appointment.insertMany(
    Array.from({ length: 10 }, (_, index) => {
      const startTime = new Date(day.getTime() + index * 15 * 60 * 1000);
      return {
        counsellorId: user._id,
        clientCode: `CL-R${String(index).padStart(4, '0')}`,
        startTime,
        endTime: new Date(startTime.getTime() + 15 * 60 * 1000),
        durationMins: 15,
        sessionType: 'online',
      };
    }),
  );
  const targetStart = new Date(day.getTime() + 5 * 60 * 60 * 1000);
  const results = await Promise.all(
    appointments.map((appointment) =>
      request(app)
        .patch(`/api/v1/appointments/${appointment._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          startTime: targetStart.toISOString(),
          endTime: new Date(
            targetStart.getTime() + 15 * 60 * 1000,
          ).toISOString(),
        }),
    ),
  );
  expect(results.filter((result) => result.status === 200)).toHaveLength(1);
  expect(
    results.filter((result) => result.body.code === 'SLOT_CONFLICT'),
  ).toHaveLength(9);
  const moved = await Appointment.findOne({ startTime: targetStart });
  expect(moved.status).toBe('scheduled');
  expect(moved.rescheduleCount).toBe(1);
  const availability = await request(app)
    .get(
      `/api/v1/availability?counsellorId=${user._id}&date=${targetStart.toISOString().slice(0, 10)}`,
    )
    .set('Authorization', `Bearer ${token}`);
  expect(
    availability.body.slots.some(
      (slotEntry) => slotEntry.startTime === targetStart.toISOString(),
    ),
  ).toBe(false);
});

test('computes availability and rejects attendance before start', async () => {
  const user = await createUser('a@example.invalid');
  const token = await login(user.email);
  const times = slot();
  const created = await request(app)
    .post('/api/v1/appointments')
    .set('Authorization', `Bearer ${token}`)
    .send(bodyFor(times));
  const date = times.startTime.toISOString().slice(0, 10);
  const availability = await request(app)
    .get(`/api/v1/availability?counsellorId=${user._id}&date=${date}`)
    .set('Authorization', `Bearer ${token}`);
  expect(availability.status).toBe(200);
  expect(
    availability.body.slots.some(
      (entry) => entry.startTime === times.startTime.toISOString(),
    ),
  ).toBe(false);
  const attendance = await request(app)
    .patch(`/api/v1/appointments/${created.body._id}/attendance`)
    .set('Authorization', `Bearer ${token}`)
    .send({ attendance: 'attended' });
  expect(attendance.status).toBe(400);
});

test('rejects state-changing operations for non-scheduled appointments', async () => {
  const user = await createUser('a@example.invalid');
  const token = await login(user.email);
  const past = slot(-1);
  const appointment = await Appointment.create({
    counsellorId: user._id,
    clientCode: 'CL-STAT',
    ...past,
    durationMins: 60,
    sessionType: 'online',
    status: 'completed',
    attendance: 'attended',
  });
  const reschedule = await request(app)
    .patch(`/api/v1/appointments/${appointment._id}`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      startTime: slot().startTime.toISOString(),
      endTime: slot().endTime.toISOString(),
    });
  const attendance = await request(app)
    .patch(`/api/v1/appointments/${appointment._id}/attendance`)
    .set('Authorization', `Bearer ${token}`)
    .send({ attendance: 'no-show' });
  const cancel = await request(app)
    .delete(`/api/v1/appointments/${appointment._id}`)
    .set('Authorization', `Bearer ${token}`);
  expect(reschedule.body.code).toBe('INVALID_STATE');
  expect(attendance.body.code).toBe('INVALID_STATE');
  expect(cancel.body.code).toBe('INVALID_STATE');
});
