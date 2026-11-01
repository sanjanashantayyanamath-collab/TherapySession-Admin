import { asyncHandler } from '../utils/asyncHandler.js';
import * as service from '../services/appointmentService.js';

export const createAppointment = asyncHandler(async (request, response) => {
  response
    .status(201)
    .json(
      await service.createAppointment(request.body, request.user, request.ip),
    );
});

export const listAppointments = asyncHandler(async (request, response) => {
  response.json(await service.listAppointments(request.query, request.user));
});

export const getAppointment = asyncHandler(async (request, response) => {
  response.json(await service.getAppointment(request.params.id, request.user));
});

export const updateAppointment = asyncHandler(async (request, response) => {
  response.json(
    await service.reschedule(
      request.params.id,
      request.body,
      request.user,
      request.ip,
    ),
  );
});

export const updateAttendance = asyncHandler(async (request, response) => {
  response.json(
    await service.changeAttendance(
      request.params.id,
      request.body.attendance,
      request.user,
      request.ip,
    ),
  );
});

export const deleteAppointment = asyncHandler(async (request, response) => {
  response.json(
    await service.cancel(request.params.id, request.user, request.ip),
  );
});
