import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: { type: String, required: true, maxlength: 100 },
    resourceType: { type: String, required: true, maxlength: 100 },
    resourceId: { type: String, required: true, maxlength: 100 },
    ip: { type: String, required: true, maxlength: 100 },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false },
);

export default mongoose.model('AuditLog', auditLogSchema);
