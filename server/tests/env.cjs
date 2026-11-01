process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/placeholder';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.ACCESS_TOKEN_SECRET = 'access-secret-that-is-long-enough-123';
process.env.REFRESH_TOKEN_SECRET = 'refresh-secret-that-is-long-enough-456';
process.env.NOTES_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
process.env.NOTES_ENCRYPTION_KEYS = JSON.stringify({
  1: Buffer.alloc(32, 7).toString('base64'),
  2: Buffer.alloc(32, 8).toString('base64'),
});
process.env.NOTES_ENCRYPTION_CURRENT_VERSION = '1';
