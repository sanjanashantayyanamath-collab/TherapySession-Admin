import AuditLog from '../models/AuditLog.js';

export function writeAudit({
  actorId,
  action,
  resourceType,
  resourceId,
  ip,
  session,
}) {
  return AuditLog.create([{ actorId, action, resourceType, resourceId, ip }], {
    session,
  });
}
