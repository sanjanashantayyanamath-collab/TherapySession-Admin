import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAppointment, validateCounsellor, validateLogin } from '../src/validate.js';

const base = {
  counsellor: '507f1f77bcf86cd799439011',
  clientRef: 'C-1042',
  startTime: '2026-11-20T10:00:00Z',
  endTime: '2026-11-20T10:50:00Z',
};

test('accepts a valid appointment', () => {
  const out = validateAppointment(base);
  assert.equal(out.clientRef, 'C-1042');
});

test('rejects private notes / unexpected fields', () => {
  assert.throws(() => validateAppointment({ ...base, notes: 'client discussed anxiety' }), /Unexpected fields/);
  assert.throws(() => validateAppointment({ ...base, phone: '999' }), /Unexpected fields/);
});

test('rejects full-name style clientRef', () => {
  assert.throws(() => validateAppointment({ ...base, clientRef: 'Jane Doe' }), /Validation failed/);
});

test('rejects end before start and overly long sessions', () => {
  assert.throws(() => validateAppointment({ ...base, endTime: '2026-11-20T09:00:00Z' }), /Validation failed/);
  assert.throws(() => validateAppointment({ ...base, endTime: '2026-11-20T16:00:00Z' }), /Validation failed/);
});

test('rejects bad status and mode', () => {
  assert.throws(() => validateAppointment({ ...base, status: 'done' }), /Validation failed/);
  assert.throws(() => validateAppointment({ ...base, mode: 'phone' }), /Validation failed/);
});

test('counsellor and login validation', () => {
  assert.throws(() => validateCounsellor({ name: 'A' }), /Validation failed/);
  assert.throws(() => validateCounsellor({ name: 'Dr X', email: 'x@y.com' }), /Unexpected fields/);
  assert.deepEqual(validateLogin({ username: ' Admin ', password: 'x' }), { username: 'admin', password: 'x' });
  assert.throws(() => validateLogin({ username: 'a' }), /required/);
});
