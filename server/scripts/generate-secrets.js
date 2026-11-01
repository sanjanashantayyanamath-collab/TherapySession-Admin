import crypto from 'node:crypto';

console.log(
  `ACCESS_TOKEN_SECRET=${crypto.randomBytes(48).toString('base64url')}`,
);
console.log(
  `REFRESH_TOKEN_SECRET=${crypto.randomBytes(48).toString('base64url')}`,
);
console.log(
  `NOTES_ENCRYPTION_KEY=${crypto.randomBytes(32).toString('base64')}`,
);
