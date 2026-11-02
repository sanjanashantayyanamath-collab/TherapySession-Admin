import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client.js';

export async function getNote(id) {
  return (await api.get(`/appointments/${id}/note`)).data;
}
export async function saveNote({ id, content }) {
  return (await api.put(`/appointments/${id}/note`, { content })).data;
}
export async function deleteNote(id) {
  return (await api.delete(`/appointments/${id}/note`)).data;
}

export function useNote(id, enabled) {
  return useQuery({
    queryKey: ['notes', id],
    queryFn: () => getNote(id),
    enabled: Boolean(id && enabled),
    gcTime: 0,
    staleTime: 0,
    retry: (count, error) => error?.response?.status !== 404 && count < 1,
  });
}

export function useSaveNote() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: saveNote,
    onSuccess: (data, variables) =>
      client.setQueryData(['notes', variables.id], data),
  });
}

export function useDeleteNote() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: deleteNote,
    onSuccess: (_, id) => client.removeQueries({ queryKey: ['notes', id] }),
  });
}
