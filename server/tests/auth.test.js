import bcrypt from 'bcryptjs';
import request from 'supertest';
import { createApp } from '../src/app.js';
import User from '../src/models/User.js';
import RefreshToken from '../src/models/RefreshToken.js';
import { authRateLimiter } from '../src/middleware/security.js';

const app = createApp();
const password = 'CorrectHorse1!';

async function createUser(overrides = {}) {
  return User.create({
    name: 'Test User',
    email: 'user@example.invalid',
    passwordHash: await bcrypt.hash(password, 12),
    role: 'counsellor',
    ...overrides,
  });
}

test('logs in, rotates refresh token, and detects reuse', async () => {
  await createUser();
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'user@example.invalid', password });
  expect(login.status).toBe(200);
  const cookie = login.headers['set-cookie'][0];
  const rotated = await request(app)
    .post('/api/v1/auth/refresh')
    .set('Cookie', cookie);
  expect(rotated.status).toBe(200);
  const reused = await request(app)
    .post('/api/v1/auth/refresh')
    .set('Cookie', cookie);
  expect(reused.status).toBe(401);
  expect(reused.body.code).toBe('TOKEN_REUSE');
  expect(await RefreshToken.countDocuments({ revokedAt: { $ne: null } })).toBe(
    3,
  );
});

test('atomically rotates one of ten concurrent refresh requests', async () => {
  const user = await createUser({ email: 'concurrent@example.invalid' });
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: user.email, password });
  const cookie = login.headers['set-cookie'][0];
  authRateLimiter.resetKey('::ffff:127.0.0.1');
  authRateLimiter.resetKey('127.0.0.1');

  const responses = await Promise.all(
    Array.from({ length: 10 }, () =>
      request(app).post('/api/v1/auth/refresh').set('Cookie', cookie),
    ),
  );

  expect(responses.filter((response) => response.status === 200)).toHaveLength(
    1,
  );
  expect(responses.filter((response) => response.status === 401)).toHaveLength(
    9,
  );
  expect(
    responses.filter((response) => response.body.code === 'TOKEN_REUSE'),
  ).toHaveLength(9);
  const original = await RefreshToken.findOne({
    userId: user._id,
    replacedBy: { $ne: null },
  });
  expect(
    await RefreshToken.countDocuments({
      family: original.family,
      revokedAt: null,
    }),
  ).toBe(0);
  authRateLimiter.resetKey('::ffff:127.0.0.1');
  authRateLimiter.resetKey('127.0.0.1');
});

test('uses generic failures and locks after five invalid passwords', async () => {
  await createUser();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const result = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'user@example.invalid', password: 'WrongPassword1!' });
    expect(result.body.message).toBe('Invalid credentials');
  }
  const user = await User.findOne({ email: 'user@example.invalid' });
  expect(user.failedLoginAttempts).toBe(5);
  expect(user.lockUntil).toBeInstanceOf(Date);
});

test('requires admin role for registration and rejects deactivated tokens', async () => {
  const user = await createUser();
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: user.email, password });
  const forbidden = await request(app)
    .post('/api/v1/auth/register')
    .set('Authorization', `Bearer ${login.body.accessToken}`)
    .send({
      name: 'New',
      email: 'new@example.invalid',
      password,
      role: 'counsellor',
    });
  expect(forbidden.status).toBe(403);
  await User.updateOne({ _id: user._id }, { $set: { isActive: false } });
  const me = await request(app)
    .get('/api/v1/auth/me')
    .set('Authorization', `Bearer ${login.body.accessToken}`);
  expect(me.status).toBe(401);
});
