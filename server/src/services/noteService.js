import Appointment from '../models/Appointment.js';
import PrivateNote from '../models/PrivateNote.js';
import { AppError } from '../utils/AppError.js';
import { writeAudit } from '../utils/audit.js';
import { decryptNote, encryptNote } from './cryptoService.js';
import { env } from '../config/env.js';

function notFound() {
  return new AppError(404, 'NOT_FOUND', 'Note not found.');
}

async function getOwnedAppointment(id, user) {
  if (user.role !== 'counsellor') throw notFound();
  const appointment = await Appointment.findOne({
    _id: id,
    counsellorId: user._id,
  }).lean();
  if (!appointment) throw notFound();
  return appointment;
}

function retainUntil(appointment) {
  return new Date(
    appointment.endTime.getTime() +
      env.NOTE_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
}

function publicNote(content, note) {
  return { content, updatedAt: note.updatedAt, retainUntil: note.retainUntil };
}

export async function readNote(id, user, ip, log) {
  const appointment = await getOwnedAppointment(id, user);
  const note = await PrivateNote.findOne({
    appointmentId: appointment._id,
    counsellorId: user._id,
  });
  if (!note) throw notFound();
  let content;
  try {
    content = decryptNote(note);
  } catch (error) {
    log.error(
      { err: error, appointmentId: id },
      'Private note decryption failed',
    );
    throw new AppError(
      500,
      'NOTE_UNREADABLE',
      'Private note could not be decrypted.',
    );
  }
  await writeAudit({
    actorId: user._id,
    action: 'note.read',
    resourceType: 'appointment',
    resourceId: id,
    ip,
  });
  return publicNote(content, note);
}

export async function writeNote(id, content, user, ip) {
  const appointment = await getOwnedAppointment(id, user);
  if (!['scheduled', 'completed'].includes(appointment.status)) {
    throw new AppError(
      409,
      'INVALID_STATE',
      'Notes cannot be written for cancelled appointments.',
    );
  }
  const encrypted = encryptNote(
    content,
    appointment._id.toString(),
    user._id.toString(),
  );
  const note = await PrivateNote.findOneAndUpdate(
    { appointmentId: appointment._id },
    {
      $set: {
        counsellorId: user._id,
        ...encrypted,
        retainUntil: retainUntil(appointment),
      },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );
  await writeAudit({
    actorId: user._id,
    action: 'note.write',
    resourceType: 'appointment',
    resourceId: id,
    ip,
  });
  return publicNote(content, note);
}

export async function deleteNote(id, user, ip) {
  const appointment = await getOwnedAppointment(id, user);
  const note = await PrivateNote.findOneAndDelete({
    appointmentId: appointment._id,
    counsellorId: user._id,
  });
  if (!note) throw notFound();
  await writeAudit({
    actorId: user._id,
    action: 'note.delete',
    resourceType: 'appointment',
    resourceId: id,
    ip,
  });
}

export async function rekeyNotes() {
  const cursor = PrivateNote.find().cursor();
  for await (const note of cursor) {
    const content = decryptNote(note);
    const encrypted = encryptNote(
      content,
      note.appointmentId.toString(),
      note.counsellorId.toString(),
    );
    await PrivateNote.updateOne({ _id: note._id }, { $set: encrypted });
  }
}
