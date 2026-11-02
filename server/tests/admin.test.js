import bcrypt from 'bcryptjs';
import request from 'supertest';
import { createApp } from '../src/app.js';
import User from '../src/models/User.js';
import RefreshToken from '../src/models/RefreshToken.js';
import Appointment from '../src/models/Appointment.js';

const app = createApp();
const password = 'CorrectHorse1!';

async function createUser(email, role) {
  return User.create({
    name: email,
    email,
    passwordHash: await bcrypt.hash(password, 12),
    role,
  });
}

async function login(email) {
  return (
    await request(app).post('/api/v1/auth/login').send({ email, password })
  ).body.accessToken;
}

test('admin lists users and appointments, and stats contain no client-level data', async () => {
  const admin = await createUser('admin@example.invalid', 'admin');
  const counsellor = await createUser('c@example.invalid', 'counsellor');
  await Appointment.create({
    counsellorId: counsellor._id,
    clientCode: 'CL-ABCD',
    startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
    endTime: new Date(Date.now() - 60 * 60 * 1000),
    durationMins: 60,
    sessionType: 'online',
    status: 'completed',
    attendance: 'attended',
  });
  await Appointment.create({
    counsellorId: counsellor._id,
    clientCode: 'CL-EFGH',
    startTime: new Date(Date.now() - 3 * 60 * 60 * 1000),
    endTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
    durationMins: 60,
    sessionType: 'online',
    status: 'completed',
    attendance: 'no-show',
  });
  await Appointment.create({
    counsellorId: counsellor._id,
    clientCode: 'CL-IJKL',
    startTime: new Date(Date.now() - 4 * 60 * 60 * 1000),
    endTime: new Date(Date.now() - 3 * 60 * 60 * 1000),
    durationMins: 60,
    sessionType: 'online',
    status: 'cancelled',
    attendance: 'late-cancel',
  });
  const auth = await login(admin.email);
  const [users, appointments, stats] = await Promise.all([
    request(app)
      .get('/api/v1/users?limit=50')
      .set('Authorization', `Bearer ${auth}`),
    request(app)
      .get('/api/v1/appointments?limit=50')
      .set('Authorization', `Bearer ${auth}`),
    request(app)
      .get(
        `/api/v1/stats?from=${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}&to=${new Date().toISOString()}`,
      )
      .set('Authorization', `Bearer ${auth}`),
  ]);
  expect(users.status).toBe(200);
  expect(users.body.data[0]).not.toHaveProperty('passwordHash');
  expect(users.body.data[0]).not.toHaveProperty('lockUntil');
  expect(appointments.body.meta.total).toBe(3);
  expect(stats.body.total).toBe(3);
  expect(stats.body.completed).toBe(2);
  expect(stats.body.cancelled).toBe(1);
  expect(stats.body.lateCancels).toBe(1);
  expect(stats.body.attendanceRate).toBe(0.5);
  expect(stats.body.noShowRate).toBe(0.5);
  expect(stats.body).not.toHaveProperty('clientCode');
});

test('deactivation revokes refresh tokens and enforces pagination cap', async () => {
  const admin = await createUser('admin@example.invalid', 'admin');
  const target = await createUser('c@example.invalid', 'counsellor');
  const auth = await login(admin.email);
  const targetLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: target.email, password });
  expect(
    (
      await request(app)
        .get('/api/v1/users?limit=51')
        .set('Authorization', `Bearer ${auth}`)
    ).status,
  ).toBe(400);
  const result = await request(app)
    .patch(`/api/v1/users/${target._id}/deactivate`)
    .set('Authorization', `Bearer ${auth}`);
  expect(result.status).toBe(200);
  expect(
    await RefreshToken.countDocuments({
      userId: target._id,
      revokedAt: { $ne: null },
    }),
  ).toBe(1);
  expect(
    (
      await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', targetLogin.headers['set-cookie'][0])
    ).status,
  ).toBe(401);
});
