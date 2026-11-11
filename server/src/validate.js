import { HttpError } from './middleware/errorHandler.js';
import { STATUSES, MODES } from './models/Appointment.js';

const CLIENT_REF = /^[A-Za-z0-9-]{2,20}$/;

/** Rejects any key not in `allowed` — blocks attempts to smuggle in notes or personal data. */
export function rejectUnknown(body, allowed) {
  const extra = Object.keys(body || {}).filter((k) => !allowed.includes(k));
  if (extra.length) {
    throw new HttpError(400, 'Unexpected fields. Only scheduling data is accepted.', extra);
  }
}

const toDate = (v) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

export function validateAppointment(body, { partial = false } = {}) {
  rejectUnknown(body, ['counsellor', 'clientRef', 'startTime', 'endTime', 'mode', 'status']);
  const errors = [];
  const out = {};

  if (!partial || body.counsellor !== undefined) {
    if (!/^[a-f\d]{24}$/i.test(String(body.counsellor || ''))) errors.push('counsellor must be a valid id');
    else out.counsellor = body.counsellor;
  }
  if (!partial || body.clientRef !== undefined) {
    if (!CLIENT_REF.test(String(body.clientRef || ''))) {
      errors.push('clientRef must be 2-20 letters, digits or hyphens (use a code, not a name)');
    } else out.clientRef = String(body.clientRef).trim();
  }
  if (!partial || body.startTime !== undefined) {
    const d = toDate(body.startTime);
    if (!d) errors.push('startTime must be a valid date'); else out.startTime = d;
  }
  if (!partial || body.endTime !== undefined) {
    const d = toDate(body.endTime);
    if (!d) errors.push('endTime must be a valid date'); else out.endTime = d;
  }
  if (body.mode !== undefined) {
    if (!MODES.includes(body.mode)) errors.push(`mode must be one of: ${MODES.join(', ')}`); else out.mode = body.mode;
  }
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) errors.push(`status must be one of: ${STATUSES.join(', ')}`); else out.status = body.status;
  }
  if (out.startTime && out.endTime && out.endTime <= out.startTime) errors.push('endTime must be after startTime');
  if (out.startTime && out.endTime && out.endTime - out.startTime > 4 * 3600 * 1000) errors.push('A session cannot exceed 4 hours');

  if (errors.length) throw new HttpError(400, 'Validation failed', errors);
  return out;
}

export function validateCounsellor(body, { partial = false } = {}) {
  rejectUnknown(body, ['name', 'active']);
  const errors = [];
  const out = {};
  if (!partial || body.name !== undefined) {
    const name = String(body.name || '').trim();
    if (name.length < 2 || name.length > 80) errors.push('name must be 2-80 characters'); else out.name = name;
  }
  if (body.active !== undefined) {
    if (typeof body.active !== 'boolean') errors.push('active must be true or false'); else out.active = body.active;
  }
  if (errors.length) throw new HttpError(400, 'Validation failed', errors);
  return out;
}

export function validateLogin(body) {
  rejectUnknown(body, ['username', 'password']);
  if (typeof body.username !== 'string' || typeof body.password !== 'string' || !body.username || !body.password) {
    throw new HttpError(400, 'Username and password are required');
  }
  return { username: body.username.trim().toLowerCase(), password: body.password };
}
