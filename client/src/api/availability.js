import { api } from './client.js';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './queryKeys.js';

export async function getAvailability(params) { return (await api.get('/availability', { params })).data; }
export function useAvailability(params) { return useQuery({ queryKey: queryKeys.availability(params), queryFn: () => getAvailability(params), enabled: Boolean(params?.date) }); }
