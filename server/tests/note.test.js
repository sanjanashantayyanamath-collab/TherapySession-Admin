import bcrypt from 'bcryptjs';
import request from 'supertest';
import { createApp } from '../src/app.js';
import User from '../src/models/User.js';
import Appointment from '../src/models/Appointment.js';
import PrivateNote from '../src/models/PrivateNote.js';
import AuditLog from '../src/models/AuditLog.js';
import { env } from '../src/config/env.js';
import { rekeyNotes } from '../src/services/noteService.js';

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

async function createAppointment(user, status = 'scheduled') {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() + 1);
  start.setUTCHours(10, 0, 0, 0);
  return Appointment.create({
    counsellorId: user._id,
    clientCode: `CL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    startTime: start,
    endTime: new Date(start.getTime() + 60 * 60 * 1000),
    durationMins: 60,
    sessionType: 'online',
    status,
  });
}

test('round trips unicode and emoji, stores no plaintext, and sets no-store headers', async () => {
  const user = await createUser('notes@example.invalid');
  const appointment = await createAppointment(user);
  const token = await login(user.email);
  const content = 'Session summary: café ☕️ — calm progress 🚀';

  const written = await request(app)
    .put(`/api/v1/appointments/${appointment._id}/note`)
    .set('Authorization', `Bearer ${token}`)
    .send({ content });
  expect(written.status).toBe(200);
  expect(written.body.content).toBe(content);
  expect(written.headers['cache-control']).toBe('no-store');
  expect(written.headers.pragma).toBe('no-cache');

  const raw = await PrivateNote.findOne({
    appointmentId: appointment._id,
  }).lean();
  expect(raw).toBeTruthy();
  expect(JSON.stringify(raw)).not.toContain(content);
  expect(raw.ciphertext.toString('utf8')).not.toContain(content);

  const read = await request(app)
    .get(`/api/v1/appointments/${appointment._id}/note`)
    .set('Authorization', `Bearer ${token}`);
  expect(read.status).toBe(200);
  expect(read.body).toEqual({
    content,
    updatedAt: expect.any(String),
    retainUntil: expect.any(String),
  });
  expect(read.body).not.toHaveProperty('ciphertext');
  expect(read.headers['cache-control']).toBe('no-store');
});

test('rejects tampered ciphertext, auth tag, and AAD-bound appointment', async () => {
  const user = await createUser('tamper@example.invalid');
  const first = await createAppointment(user);
  const second = await createAppointment(user);
  const token = await login(user.email);
  await request(app)
    .put(`/api/v1/appointments/${first._id}/note`)
    .set('Authorization', `Bearer ${token}`)
    .send({ content: 'private text' });

  const original = await PrivateNote.findOne({
    appointmentId: first._id,
  }).lean();
  for (const field of ['ciphertext', 'authTag']) {
    await PrivateNote.updateOne(
      { _id: original._id },
      {
        $set: {
          [field]: Buffer.from(original[field]).map((byte, index) =>
            index === 0 ? byte ^ 1 : byte,
          ),
        },
      },
    );
    const response = await request(app)
      .get(`/api/v1/appointments/${first._id}/note`)
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(500);
    expect(response.body.code).toBe('NOTE_UNREADABLE');
    await PrivateNote.updateOne(
      { _id: original._id },
      { $set: { [field]: original[field] } },
    );
  }

  await PrivateNote.updateOne(
    { _id: original._id },
    { $set: { appointmentId: second._id } },
  );
  const aadFailure = await request(app)
    .get(`/api/v1/appointments/${second._id}/note`)
    .set('Authorization', `Bearer ${token}`);
  expect(aadFailure.status).toBe(500);
  expect(aadFailure.body.code).toBe('NOTE_UNREADABLE');
});

test('enforces author-only access with identical 404 responses', async () => {
  const owner = await createUser('owner@example.invalid');
  const other = await createUser('other@example.invalid');
  const admin = await createUser('admin@example.invalid', 'admin');
  const appointment = await createAppointment(owner);
  const ownerToken = await login(owner.email);
  const otherToken = await login(other.email);
  const adminToken = await login(admin.email);
  await request(app)
    .put(`/api/v1/appointments/${appointment._id}/note`)
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ content: 'secret' });

  const otherRead = await request(app)
    .get(`/api/v1/appointments/${appointment._id}/note`)
    .set('Authorization', `Bearer ${otherToken}`);
  const adminRead = await request(app)
    .get(`/api/v1/appointments/${appointment._id}/note`)
    .set('Authorization', `Bearer ${adminToken}`);
  const otherWrite = await request(app)
    .put(`/api/v1/appointments/${appointment._id}/note`)
    .set('Authorization', `Bearer ${otherToken}`)
    .send({ content: 'nope' });
  const otherDelete = await request(app)
    .delete(`/api/v1/appointments/${appointment._id}/note`)
    .set('Authorization', `Bearer ${otherToken}`);
  const unauthenticated = await request(app).get(
    `/api/v1/appointments/${appointment._id}/note`,
  );

  expect(otherRead.body).toEqual(adminRead.body);
  expect(otherRead.status).toBe(404);
  expect(otherWrite.status).toBe(404);
  expect(otherDelete.status).toBe(404);
  expect(unauthenticated.status).toBe(401);
});

test('rejects cancelled notes, invalid content, and refreshes retention on replacement', async () => {
  const user = await createUser('validation@example.invalid');
  const cancelled = await createAppointment(user, 'cancelled');
  const scheduled = await createAppointment(user);
  const token = await login(user.email);
  const cancelledResponse = await request(app)
    .put(`/api/v1/appointments/${cancelled._id}/note`)
    .set('Authorization', `Bearer ${token}`)
    .send({ content: 'not allowed' });
  expect(cancelledResponse.body.code).toBe('INVALID_STATE');
  const tooLong = await request(app)
    .put(`/api/v1/appointments/${scheduled._id}/note`)
    .set('Authorization', `Bearer ${token}`)
    .send({ content: 'x'.repeat(5001) });
  const control = await request(app)
    .put(`/api/v1/appointments/${scheduled._id}/note`)
    .set('Authorization', `Bearer ${token}`)
    .send({ content: 'bad\u0000text' });
  expect(tooLong.body.code).toBe('VALIDATION_ERROR');
  expect(control.body.code).toBe('VALIDATION_ERROR');

  await request(app)
    .put(`/api/v1/appointments/${scheduled._id}/note`)
    .set('Authorization', `Bearer ${token}`)
    .send({ content: 'first' });
  const before = await PrivateNote.findOne({
    appointmentId: scheduled._id,
  }).lean();
  await new Promise((resolve) => setTimeout(resolve, 5));
  await request(app)
    .put(`/api/v1/appointments/${scheduled._id}/note`)
    .set('Authorization', `Bearer ${token}`)
    .send({ content: 'second' });
  const after = await PrivateNote.findOne({
    appointmentId: scheduled._id,
  }).lean();
  expect(after._id.toString()).toBe(before._id.toString());
  expect(after.updatedAt.getTime()).toBeGreaterThan(before.updatedAt.getTime());
  expect(
    await PrivateNote.countDocuments({ appointmentId: scheduled._id }),
  ).toBe(1);
});

test('supports key rotation and rekey migration', async () => {
  const user = await createUser('rotate@example.invalid');
  const appointment = await createAppointment(user);
  const token = await login(user.email);
  await request(app)
    .put(`/api/v1/appointments/${appointment._id}/note`)
    .set('Authorization', `Bearer ${token}`)
    .send({ content: 'rotatable' });
  expect(
    (await PrivateNote.findOne({ appointmentId: appointment._id })).keyVersion,
  ).toBe(1);

  env.NOTES_ENCRYPTION_CURRENT_VERSION = 2;
  const rotatedRead = await request(app)
    .get(`/api/v1/appointments/${appointment._id}/note`)
    .set('Authorization', `Bearer ${token}`);
  expect(rotatedRead.body.content).toBe('rotatable');
  await rekeyNotes();
  expect(
    (await PrivateNote.findOne({ appointmentId: appointment._id })).keyVersion,
  ).toBe(2);
  env.NOTES_ENCRYPTION_CURRENT_VERSION = 1;
});

test('writes note audit events without note content and validates request IDs', async () => {
  const user = await createUser('audit@example.invalid');
  const appointment = await createAppointment(user);
  const token = await login(user.email);
  const content = 'audit secret';
  const response = await request(app)
    .put(`/api/v1/appointments/${appointment._id}/note`)
    .set('Authorization', `Bearer ${token}`)
    .set('x-request-id', 'valid-request-123')
    .send({ content });
  expect(response.status).toBe(200);
  expect(response.headers['x-request-id']).toBe('valid-request-123');
  const invalidRequestId = await request(app)
    .get(`/api/v1/appointments/${appointment._id}/note`)
    .set('Authorization', `Bearer ${token}`)
    .set('x-request-id', 'bad value');
  await request(app)
    .get(`/api/v1/appointments/${appointment._id}/note`)
    .set('Authorization', `Bearer ${token}`);
  await request(app)
    .delete(`/api/v1/appointments/${appointment._id}/note`)
    .set('Authorization', `Bearer ${token}`);
  expect(invalidRequestId.headers['x-request-id']).not.toBe('bad value');
  expect(invalidRequestId.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  const audits = await AuditLog.find({
    resourceId: appointment._id.toString(),
  }).lean();
  expect(audits.map((entry) => entry.action)).toEqual(
    expect.arrayContaining(['note.write', 'note.read', 'note.delete']),
  );
  expect(JSON.stringify(audits)).not.toContain(content);
});
