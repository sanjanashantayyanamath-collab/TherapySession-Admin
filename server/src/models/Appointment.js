import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
    counsellorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    clientCode: {
      type: String,
      required: true,
      uppercase: true,
      match: /^CL-[A-Z0-9]{4,8}$/,
      maxlength: 11,
    },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    durationMins: { type: Number, required: true, min: 15, max: 120 },
    sessionType: {
      type: String,
      enum: ['in-person', 'online', 'phone'],
      required: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled'],
      default: 'scheduled',
      required: true,
    },
    attendance: {
      type: String,
      enum: ['pending', 'attended', 'no-show', 'late-cancel'],
      default: 'pending',
      required: true,
    },
    cancelledAt: { type: Date, default: null },
    rescheduledAt: { type: Date, default: null },
    rescheduleCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

appointmentSchema.index({ counsellorId: 1, startTime: 1 });
appointmentSchema.index({ counsellorId: 1, status: 1, startTime: 1 });
appointmentSchema.pre('validate', function validateTimes(next) {
  if (this.endTime <= this.startTime)
    this.invalidate('endTime', 'must be after startTime');
  const duration = (this.endTime.getTime() - this.startTime.getTime()) / 60_000;
  if (duration !== this.durationMins)
    this.invalidate(
      'durationMins',
      'must equal the time difference in minutes',
    );
  next();
});

export default mongoose.model('Appointment', appointmentSchema);
