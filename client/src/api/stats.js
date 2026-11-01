import { api } from './client.js';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './queryKeys.js';

export async function getStats(params) { return (await api.get('/stats', { params })).data; }
export function useStats(params) { return useQuery({ queryKey: queryKeys.stats(params), queryFn: () => getStats(params), enabled: Boolean(params?.from && params?.to) }); }
