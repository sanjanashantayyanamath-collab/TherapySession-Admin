import { asyncHandler } from '../utils/asyncHandler.js';
import { getStats } from '../services/statsService.js';

export const stats = asyncHandler(async (request, response) => {
  response.json(await getStats(request.query, request.user));
});
