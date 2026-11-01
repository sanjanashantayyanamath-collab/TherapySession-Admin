import { createServer } from 'node:http';
import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';

const app = createApp();
const server = createServer(app);

async function start() {
  await connectDatabase();
  server.listen(env.PORT, () => {
    console.log(`TherapySession Admin API listening on port ${env.PORT}`);
  });
}

async function shutdown(signal) {
  console.log(`${signal} received; shutting down.`);
  server.close(async (error) => {
    if (error) {
      console.error('HTTP server shutdown failed.', error);
      process.exitCode = 1;
    }

    await disconnectDatabase();
  });
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));

start().catch((error) => {
  console.error('Server failed to start.', error);
  process.exitCode = 1;
});
