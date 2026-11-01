import { asyncHandler } from '../utils/asyncHandler.js';
import * as service from '../services/noteService.js';

function noStore(response) {
  response.set({ 'Cache-Control': 'no-store', Pragma: 'no-cache' });
}

export const getNote = asyncHandler(async (request, response) => {
  noStore(response);
  response.json(
    await service.readNote(
      request.params.id,
      request.user,
      request.ip,
      request.log,
    ),
  );
});

export const putNote = asyncHandler(async (request, response) => {
  noStore(response);
  response.json(
    await service.writeNote(
      request.params.id,
      request.body.content,
      request.user,
      request.ip,
    ),
  );
});

export const deleteNote = asyncHandler(async (request, response) => {
  noStore(response);
  await service.deleteNote(request.params.id, request.user, request.ip);
  response.status(204).send();
});
