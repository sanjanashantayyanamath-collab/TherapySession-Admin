import { useQuery } from '@tanstack/react-query';
import { Card } from '../components/ui/Card.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { ErrorState } from '../components/ui/ErrorState.jsx';
import { listAppointments } from '../api/appointments.js';
import { getStats } from '../api/stats.js';
import { listUsers } from '../api/users.js';
import { queryKeys } from '../api/queryKeys.js';

export function PlaceholderPage({ title, description, kind }) {
  const query = useQuery({
    queryKey: queryKeys[kind] ? queryKeys[kind]({ page: 1, limit: 20 }) : [kind],
    queryFn: kind === 'appointments' ? () => listAppointments({ page: 1, limit: 20 }) : kind === 'stats' ? () => getStats({ from: new Date(Date.now() - 86400000).toISOString(), to: new Date().toISOString() }) : kind === 'users' ? () => listUsers({ page: 1, limit: 20 }) : undefined,
    enabled: Boolean(kind),
  });
  return <div className="mx-auto max-w-6xl"><h1 className="text-3xl font-bold">{title}</h1><p className="mt-2 text-slate-600 dark:text-slate-300">{description}</p><Card className="mt-6">{query.isLoading ? <div className="space-y-3"><Skeleton /><Skeleton /><Skeleton /></div> : query.isError ? <ErrorState /> : <EmptyState title="Coming in the next phase" description="The API connection is ready. This workspace will be expanded in Phase 6." />}</Card></div>;
}
