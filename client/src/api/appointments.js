import { api } from './client.js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys.js';

export async function listAppointments(params) { return (await api.get('/appointments', { params })).data; }
export async function getAppointment(id) { return (await api.get(`/appointments/${id}`)).data; }
export async function createAppointment(payload) { return (await api.post('/appointments', payload)).data; }
export async function updateAppointment(id, payload) { return (await api.patch(`/appointments/${id}`, payload)).data; }
export async function updateAttendance(id, attendance) { return (await api.patch(`/appointments/${id}/attendance`, { attendance })).data; }
export async function cancelAppointment(id) { return (await api.delete(`/appointments/${id}`)).data; }
export function useAppointments(params) { return useQuery({ queryKey: queryKeys.appointments(params), queryFn: () => listAppointments(params) }); }
export function useAppointment(id) { return useQuery({ queryKey: queryKeys.appointment(id), queryFn: () => getAppointment(id), enabled: Boolean(id) }); }
export function useCreateAppointment() { const client = useQueryClient(); return useMutation({ mutationFn: createAppointment, onSuccess: () => client.invalidateQueries({ queryKey: ['appointments'] }) }); }
export function useUpdateAppointment() { const client = useQueryClient(); return useMutation({ mutationFn: ({ id, payload }) => updateAppointment(id, payload), onSuccess: () => client.invalidateQueries({ queryKey: ['appointments'] }) }); }
