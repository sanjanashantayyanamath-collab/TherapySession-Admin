import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

test('health and readiness endpoints expose liveness separately', async () => {
  const health = await request(app).get('/healthz');
  const ready = await request(app).get('/readyz');
  expect(health.status).toBe(200);
  expect(health.body).toEqual({ status: 'ok' });
  expect(ready.status).toBe(200);
  expect(ready.body).toEqual({ status: 'ready' });
});

test('maps invalid JSON and validation errors', async () => {
  const invalidJson = await request(app)
    .post('/api/v1/auth/login')
    .set('Content-Type', 'application/json')
    .send('{"email":');
  expect(invalidJson.body.code).toBe('INVALID_JSON');
  const validation = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'bad', password: 'short' });
  expect(validation.status).toBe(400);
  expect(validation.body.code).toBe('VALIDATION_ERROR');
  expect(validation.body.details).toEqual(expect.any(Array));
});
