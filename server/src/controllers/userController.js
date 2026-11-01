import { asyncHandler } from '../utils/asyncHandler.js';
import * as service from '../services/userService.js';

export const listUsers = asyncHandler(async (request, response) => {
  response.json(await service.listUsers(request.query));
});

export const deactivateUser = asyncHandler(async (request, response) => {
  response.json(
    await service.deactivateUser(request.params.id, request.user, request.ip),
  );
});
