import mongoose from 'mongoose';

export const STATUSES = ['scheduled', 'attended', 'missed', 'cancelled'];
export const MODES = ['in-person', 'online'];

/**
 * PRIVACY BY DESIGN
 * -----------------
 * This schema holds scheduling metadata ONLY. There is intentionally:
 *   - no notes / diagnosis / session content field
 *   - no client contact details (phone, email, address)
 *   - no client full name: `clientRef` is a pseudonymous code (e.g. "C-1042")
 *     that counsellors map to the real client in their own private system.
 * `strict: 'throw'` makes Mongoose reject any extra field outright.
 */
const appointmentSchema = new mongoose.Schema(
  {
    counsellor: { type: mongoose.Schema.Types.ObjectId, ref: 'Counsellor', required: true, index: true },
    clientRef: { type: String, required: true, trim: true, match: /^[A-Za-z0-9-]{2,20}$/ },
    startTime: { type: Date, required: true, index: true },
    endTime: { type: Date, required: true },
    mode: { type: String, enum: MODES, default: 'in-person' },
    status: { type: String, enum: STATUSES, default: 'scheduled', index: true },
  },
  { timestamps: true, strict: 'throw' }
);

appointmentSchema.index({ counsellor: 1, startTime: 1 }, { unique: true });

export default mongoose.model('Appointment', appointmentSchema);
