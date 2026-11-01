import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  MONGODB_URI: z.string().min(1),
  CORS_ORIGIN: z.string().url(),
  ACCESS_TOKEN_SECRET: z.string().min(32),
  REFRESH_TOKEN_SECRET: z.string().min(32),
  NOTES_ENCRYPTION_KEY: z.string().refine((value) => {
    try {
      const decoded = Buffer.from(value, 'base64');
      return decoded.length === 32 && decoded.toString('base64') === value;
    } catch {
      return false;
    }
  }, 'must be base64 encoding of exactly 32 bytes'),
  NOTES_ENCRYPTION_KEYS: z.string().optional(),
  NOTES_ENCRYPTION_CURRENT_VERSION: z.coerce
    .number()
    .int()
    .positive()
    .default(1),
  NOTE_RETENTION_DAYS: z.coerce.number().int().positive().default(90),
  TRUST_PROXY: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  ADMIN_SEED_PASSWORD: z.string().min(12).optional(),
  COUNSELLOR_ONE_SEED_PASSWORD: z.string().min(12).optional(),
  COUNSELLOR_TWO_SEED_PASSWORD: z.string().min(12).optional(),
  WORK_START_HOUR: z.coerce.number().int().min(0).max(23).default(9),
  WORK_END_HOUR: z.coerce.number().int().min(1).max(24).default(17),
  WORK_TZ: z.string().min(1).default('UTC'),
});

const parsedEnv = envSchema
  .superRefine((value, context) => {
    if (value.ACCESS_TOKEN_SECRET === value.REFRESH_TOKEN_SECRET) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['REFRESH_TOKEN_SECRET'],
        message: 'must differ from ACCESS_TOKEN_SECRET',
      });
    }
    if (value.WORK_END_HOUR <= value.WORK_START_HOUR) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['WORK_END_HOUR'],
        message: 'must be after WORK_START_HOUR',
      });
    }
  })
  .safeParse(process.env);

if (!parsedEnv.success) {
  const issues = parsedEnv.error.issues
    .map(
      (issue) => `${issue.path.join('.') || 'environment'}: ${issue.message}`,
    )
    .join('; ');
  throw new Error(`Invalid environment configuration: ${issues}`);
}

export const env = parsedEnv.data;

export function getNoteEncryptionKeys() {
  const rawKeys = env.NOTES_ENCRYPTION_KEYS
    ? JSON.parse(env.NOTES_ENCRYPTION_KEYS)
    : { [env.NOTES_ENCRYPTION_CURRENT_VERSION]: env.NOTES_ENCRYPTION_KEY };
  const entries = Object.entries(rawKeys).map(([version, value]) => {
    const key = Buffer.from(value, 'base64');
    if (key.length !== 32 || key.toString('base64') !== value) {
      throw new Error(`Invalid note encryption key for version ${version}`);
    }
    return [Number(version), key];
  });
  if (
    !entries.some(
      ([version]) => version === env.NOTES_ENCRYPTION_CURRENT_VERSION,
    )
  ) {
    throw new Error('Current note encryption key version is not configured');
  }
  return new Map(entries);
}
