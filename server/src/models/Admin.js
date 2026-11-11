import mongoose from 'mongoose';

// Only administrators can sign in. There is deliberately no client/patient login.
const adminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true, strict: 'throw' }
);

export default mongoose.model('Admin', adminSchema);
