import { z } from 'zod';

const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'must be a valid identifier');
const isoDate = z.string().datetime({ offset: true });
const baseAppointment = {
  clientCode: z
    .string()
    .transform((value) => value.toUpperCase())
    .pipe(z.string().regex(/^CL-[A-Z0-9]{4,8}$/)),
  startTime: isoDate,
  endTime: isoDate,
  sessionType: z.enum(['in-person', 'online', 'phone']),
};

export const createAppointmentSchema = z.object({
  body: z
    .object({ counsellorId: objectId.optional(), ...baseAppointment })
    .strict(),
});

export const updateAppointmentSchema = z.object({
  params: z.object({ id: objectId }).strict(),
  body: z.object({ startTime: isoDate, endTime: isoDate }).strict(),
});

export const attendanceSchema = z.object({
  params: z.object({ id: objectId }).strict(),
  body: z
    .object({ attendance: z.enum(['attended', 'no-show', 'late-cancel']) })
    .strict(),
});

export const appointmentIdSchema = z.object({
  params: z.object({ id: objectId }).strict(),
});

export const appointmentListSchema = z.object({
  query: z
    .object({
      from: isoDate.optional(),
      to: isoDate.optional(),
      status: z.enum(['scheduled', 'completed', 'cancelled']).optional(),
      attendance: z
        .enum(['pending', 'attended', 'no-show', 'late-cancel'])
        .optional(),
      clientCode: z
        .string()
        .regex(/^CL-[A-Z0-9]{4,8}$/)
        .optional(),
      counsellorId: objectId.optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(50).default(20),
      sort: z
        .enum(['startTime', '-startTime', 'createdAt', '-createdAt'])
        .default('startTime'),
    })
    .strict(),
});

export const availabilitySchema = z.object({
  query: z
    .object({
      counsellorId: objectId,
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
    .strict(),
});

export const statsSchema = z.object({
  query: z
    .object({
      from: isoDate,
      to: isoDate,
      counsellorId: objectId.optional(),
    })
    .strict(),
});
