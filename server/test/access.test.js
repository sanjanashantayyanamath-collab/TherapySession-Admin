import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'test-secret-1234567890';
const { createApp } = await import('../src/app.js');

let server;
let base;
test.before(() => {
  server = createApp().listen(0);
  base = `http://localhost:${server.address().port}`;
});
test.after(() => server.close());

const call = async (path, opts) => {
  const r = await fetch(base + path, opts);
  return { status: r.status, body: await r.json().catch(() => null) };
};
const adminToken = () => jwt.sign({ sub: '1', role: 'admin', username: 'a' }, process.env.JWT_SECRET);

test('health is public', async () => {
  assert.equal((await call('/api/health')).status, 200);
});

test('admin routes need a valid admin token', async () => {
  assert.equal((await call('/api/appointments')).status, 401);
  assert.equal((await call('/api/appointments', { headers: { Authorization: 'Bearer nope' } })).status, 401);
  const nonAdmin = jwt.sign({ sub: '1', role: 'user' }, process.env.JWT_SECRET);
  assert.equal((await call('/api/counsellors', { headers: { Authorization: `Bearer ${nonAdmin}` } })).status, 403);
});

test('private notes are rejected at the API boundary', async () => {
  const r = await call('/api/appointments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      counsellor: '507f1f77bcf86cd799439011',
      clientRef: 'C-1',
      startTime: '2026-11-20T10:00:00Z',
      endTime: '2026-11-20T11:00:00Z',
      notes: 'private',
    }),
  });
  assert.equal(r.status, 400);
  assert.match(r.body.error, /Unexpected fields/);
});

test('unknown routes return 404 JSON', async () => {
  assert.equal((await call('/api/nope')).status, 404);
});
