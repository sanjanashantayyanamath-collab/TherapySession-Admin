import User from '../models/User.js';
import { revokeAllForUser } from './authService.js';
import { AppError } from '../utils/AppError.js';
import { writeAudit } from '../utils/audit.js';

export async function listUsers({ page, limit }) {
  const [data, total] = await Promise.all([
    User.find()
      .select('name email role isActive createdAt updatedAt')
      .sort('name')
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(),
  ]);
  return { data, meta: { page, limit, total } };
}

export async function deactivateUser(id, actor, ip) {
  if (id === actor._id.toString())
    throw new AppError(
      400,
      'SELF_DEACTIVATION',
      'You cannot deactivate yourself.',
    );
  const user = await User.findById(id);
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found.');
  user.isActive = false;
  await user.save();
  await revokeAllForUser(user._id);
  await writeAudit({
    actorId: actor._id,
    action: 'user.deactivate',
    resourceType: 'user',
    resourceId: id,
    ip,
  });
  return { id: user._id, isActive: user.isActive };
}
