import { api } from './client.js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys.js';

export async function listUsers(params) {
  return (await api.get('/users', { params })).data;
}
export async function deactivateUser(id) {
  return (await api.patch(`/users/${id}/deactivate`)).data;
}
export async function registerCounsellor(payload) {
  return (await api.post('/auth/register', { ...payload, role: 'counsellor' }))
    .data;
}
export function useUsers(params) {
  return useQuery({
    queryKey: queryKeys.users(params),
    queryFn: () => listUsers(params),
  });
}
export function useDeactivateUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: deactivateUser,
    onSuccess: () => client.invalidateQueries({ queryKey: ['users'] }),
  });
}
export function useRegisterCounsellor() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: registerCounsellor,
    onSuccess: () => client.invalidateQueries({ queryKey: ['users'] }),
  });
}
