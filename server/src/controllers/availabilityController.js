import { asyncHandler } from '../utils/asyncHandler.js';
import { getAvailability } from '../services/availabilityService.js';
import { AppError } from '../utils/AppError.js';

export const availability = asyncHandler(async (request, response) => {
  if (
    request.user.role !== 'admin' &&
    request.query.counsellorId !== request.user._id.toString()
  ) {
    throw new AppError(404, 'NOT_FOUND', 'Availability not found.');
  }
  response.json(
    await getAvailability(request.query.counsellorId, request.query.date),
  );
});
