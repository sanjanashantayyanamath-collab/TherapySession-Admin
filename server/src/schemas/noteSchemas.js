import { z } from 'zod';

const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'must be a valid identifier');

export const noteIdSchema = z.object({
  params: z.object({ id: objectId }).strict(),
});

export const noteBodySchema = z.object({
  params: z.object({ id: objectId }).strict(),
  body: z
    .object({
      content: z
        .string()
        .trim()
        .min(1)
        .max(5000)
        .refine(
          (value) =>
            [...value].every((character) => {
              const code = character.codePointAt(0);
              return (
                code === 0x09 ||
                code === 0x0a ||
                (code > 0x1f && code !== 0x7f)
              );
            }),
          {
            message:
              'must not contain control characters except newline and tab',
          },
        ),
    })
    .strict(),
});
