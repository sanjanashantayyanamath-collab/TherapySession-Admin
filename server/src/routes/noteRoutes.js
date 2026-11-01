import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { noteRateLimiter } from '../middleware/security.js';
import { getNote, putNote, deleteNote } from '../controllers/noteController.js';
import { noteBodySchema, noteIdSchema } from '../schemas/noteSchemas.js';

const router = Router();
router.use(
  '/:id/note',
  (request, response, next) => {
    response.set({ 'Cache-Control': 'no-store', Pragma: 'no-cache' });
    next();
  },
  authenticate,
  noteRateLimiter,
);
router.get('/:id/note', validate(noteIdSchema), getNote);
router.put('/:id/note', validate(noteBodySchema), putNote);
router.delete('/:id/note', validate(noteIdSchema), deleteNote);

export default router;
