import 'dotenv/config';
import mongoose from 'mongoose';
import dns from 'node:dns';
import { createApp } from './app.js';

dns.setServers(['8.8.8.8', '1.1.1.1']);

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.error('JWT_SECRET must be set (16+ characters). Copy .env.example to .env first.');
  process.exit(1);
}

const port = process.env.PORT || 5000;

try {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/therapysession_admin');
  console.log('MongoDB connected');
  createApp().listen(port, () => console.log(`API running on http://localhost:${port}`));
} catch (err) {
  console.error('Failed to start:', err.message);
  process.exit(1);
}
