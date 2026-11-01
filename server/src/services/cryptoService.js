import crypto from 'node:crypto';
import { env, getNoteEncryptionKeys } from '../config/env.js';

const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export function encryptNote(content, appointmentId, counsellorId) {
  const keyVersion = env.NOTES_ENCRYPTION_CURRENT_VERSION;
  const key = getNoteEncryptionKeys().get(keyVersion);
  const iv = crypto.randomBytes(IV_LENGTH);
  const aad = `${appointmentId}:${counsellorId}:${keyVersion}`;
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(aad));
  const ciphertext = Buffer.concat([
    cipher.update(content, 'utf8'),
    cipher.final(),
  ]);
  return {
    ciphertext,
    iv,
    authTag: cipher.getAuthTag(),
    keyVersion,
  };
}

export function decryptNote(note) {
  const key = getNoteEncryptionKeys().get(note.keyVersion);
  if (
    !key ||
    note.iv.length !== IV_LENGTH ||
    note.authTag.length !== AUTH_TAG_LENGTH
  ) {
    throw new Error('Invalid note encryption metadata');
  }
  const aad = `${note.appointmentId}:${note.counsellorId}:${note.keyVersion}`;
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, note.iv);
  decipher.setAAD(Buffer.from(aad));
  decipher.setAuthTag(note.authTag);
  return Buffer.concat([
    decipher.update(note.ciphertext),
    decipher.final(),
  ]).toString('utf8');
}
