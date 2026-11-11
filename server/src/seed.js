import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Admin from './models/Admin.js';
import Counsellor from './models/Counsellor.js';

const username = (process.env.SEED_ADMIN_USERNAME || 'admin').toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD;
if (!password || password.length < 8) {
  console.error('Set SEED_ADMIN_PASSWORD (8+ chars) in .env');
  process.exit(1);
}

await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/therapysession_admin');
const existing = await Admin.findOne({ username });
if (existing) console.log(`Admin "${username}" already exists`);
else {
  await Admin.create({ username, passwordHash: await bcrypt.hash(password, 12) });
  console.log(`Created admin "${username}"`);
}
if ((await Counsellor.countDocuments()) === 0) {
  await Counsellor.insertMany([{ name: 'Dr. Asha Rao' }, { name: 'Mr. Kiran Shetty' }]);
  console.log('Added 2 sample counsellors');
}
await mongoose.disconnect();
