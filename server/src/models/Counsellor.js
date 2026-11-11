import mongoose from 'mongoose';

// Minimal counsellor record: just enough to own appointment slots.
const counsellorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, strict: 'throw' }
);

export default mongoose.model('Counsellor', counsellorSchema);
