import { z } from 'zod';

const password = z
  .string()
  .min(12)
  .regex(/[a-z]/, 'must contain a lowercase letter')
  .regex(/[A-Z]/, 'must contain an uppercase letter')
  .regex(/[0-9]/, 'must contain a number')
  .regex(/[^A-Za-z0-9]/, 'must contain a special character');

export const loginSchema = z.object({
  body: z.object({ email: z.string().email().max(254), password }),
});

export const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(120),
    email: z.string().email().max(254),
    password,
    role: z.literal('counsellor'),
  }),
});
