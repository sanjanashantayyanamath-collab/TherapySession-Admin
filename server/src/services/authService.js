import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import AuditLog from '../models/AuditLog.js';
import { AppError } from '../utils/AppError.js';
import { createAccessToken } from '../utils/jwt.js';

const dummyHash =
  '$2b$12$C6UzMDM.H6dfI/f/IKcEe.8Z2K3S6e5w3Q5Qp6u6J9w5w8Yw7w7w7';

export async function login({ email, password, ip }) {
  const user = await User.findOne({ email: email.toLowerCase() }).select(
    '+passwordHash',
  );
  const passwordHash = user?.passwordHash ?? dummyHash;
  const validPassword = await bcrypt.compare(password, passwordHash);
  const locked = user?.lockUntil && user.lockUntil > new Date();
  if (!user || !validPassword || locked || !user.isActive) {
    if (user && !locked && !validPassword) {
      const attempts = user.failedLoginAttempts + 1;
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            failedLoginAttempts: attempts >= 5 ? 5 : attempts,
            lockUntil:
              attempts >= 5 ? new Date(Date.now() + 15 * 60_000) : null,
          },
        },
      );
    }
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid credentials');
  }
  await User.updateOne(
    { _id: user._id },
    { $set: { failedLoginAttempts: 0, lockUntil: null } },
  );
  const refresh = await createRefreshToken(user._id);
  await AuditLog.create({
    actorId: user._id,
    action: 'login',
    resourceType: 'auth',
    resourceId: user._id.toString(),
    ip,
  });
  return {
    accessToken: createAccessToken(user),
    refreshToken: refresh.rawToken,
    user: publicUser(user),
  };
}

export async function refresh(rawToken, ip) {
  if (!rawToken)
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication required.');
  const hash = hashToken(rawToken);
  const now = new Date();
  const candidate = await RefreshToken.findOne({ tokenHash: hash }).select(
    '+tokenHash',
  );
  if (!candidate)
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication required.');
  if (candidate.expiresAt <= now)
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication required.');
  const user = await User.findById(candidate.userId);
  if (!user || !user.isActive)
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication required.');
  const replacement = await createRefreshToken(user._id, candidate.family);
  const token = await RefreshToken.findOneAndUpdate(
    { tokenHash: hash, revokedAt: null },
    { $set: { revokedAt: now } },
    { new: true },
  ).select('+tokenHash');
  if (!token) {
    await RefreshToken.updateMany(
      { family: candidate.family, revokedAt: null },
      { $set: { revokedAt: now } },
    );
    await RefreshToken.updateOne(
      { _id: replacement.document._id, revokedAt: null },
      { $set: { revokedAt: now } },
    );
    throw new AppError(401, 'TOKEN_REUSE', 'Refresh token reuse detected.');
  }
  await RefreshToken.updateOne(
    { _id: token._id },
    { $set: { replacedBy: replacement.document._id } },
  );
  await AuditLog.create({
    actorId: user._id,
    action: 'refresh',
    resourceType: 'auth',
    resourceId: user._id.toString(),
    ip,
  });
  return {
    accessToken: createAccessToken(user),
    refreshToken: replacement.rawToken,
  };
}

export async function revoke(rawToken) {
  if (rawToken)
    await RefreshToken.updateOne(
      { tokenHash: hashToken(rawToken), revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
}

export async function revokeAllForUser(userId) {
  await RefreshToken.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
}

async function createRefreshToken(userId, family = crypto.randomUUID()) {
  const rawToken = crypto.randomBytes(48).toString('base64url');
  const document = await RefreshToken.create({
    userId,
    tokenHash: hashToken(rawToken),
    family,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });
  return { rawToken, document };
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function publicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
  };
}
