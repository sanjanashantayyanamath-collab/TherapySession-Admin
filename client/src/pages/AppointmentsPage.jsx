import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import { useAppointments } from '../api/appointments.js';
import { useUsers } from '../api/users.js';
import { BookingDialog } from '../features/BookingDialog.jsx';
import { formatDateTime } from '../features/dateUtils.js';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { ErrorState } from '../components/ui/ErrorState.jsx';
import { Pagination } from '../components/ui/Pagination.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';

export function AppointmentsPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [bookingOpen, setBookingOpen] = useState(false);
  const trigger = useRef(null);
  const page = Number(params.get('page') || 1);
  const query = {
    page,
    limit: 20,
    sort: params.get('sort') || 'startTime',
    ...(params.get('from') && {
      from: new Date(`${params.get('from')}T00:00:00`).toISOString(),
    }),
    ...(params.get('to') && {
      to: new Date(`${params.get('to')}T23:59:59.999`).toISOString(),
    }),
    ...(params.get('status') && { status: params.get('status') }),
    ...(params.get('attendance') && { attendance: params.get('attendance') }),
    ...(params.get('clientCode') && {
      clientCode: params.get('clientCode').toUpperCase(),
    }),
    ...(user?.role === 'admin' &&
      params.get('counsellorId') && {
        counsellorId: params.get('counsellorId'),
      }),
  };
  const appointments = useAppointments(query);
  const users = useUsers({ page: 1, limit: 50 });
  const totalPages = Math.max(
    1,
    Math.ceil((appointments.data?.meta?.total || 0) / 20),
  );
  const update = (key, value) => {
    const next = new globalThis.URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.set('page', '1');
    setParams(next);
  };
  const closeBooking = () => {
    setBookingOpen(false);
    trigger.current?.focus();
  };
  const rows = appointments.data?.data || [];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">
            Appointments
          </p>
          <h1 className="text-3xl font-bold">Appointment list</h1>
        </div>
        <Button ref={trigger} onClick={() => setBookingOpen(true)}>
          <Plus size={18} /> Book appointment
        </Button>
      </div>
      <Card>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <label className="text-sm">
            From
            <input
              aria-label="From date"
              type="date"
              value={params.get('from') || ''}
              onChange={(event) => update('from', event.target.value)}
              className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-900"
            />
          </label>
          <label className="text-sm">
            To
            <input
              aria-label="To date"
              type="date"
              value={params.get('to') || ''}
              onChange={(event) => update('to', event.target.value)}
              className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-900"
            />
          </label>
          <label className="text-sm">
            Status
            <select
              aria-label="Status filter"
              value={params.get('status') || ''}
              onChange={(event) => update('status', event.target.value)}
              className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-900"
            >
              <option value="">All statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
          <label className="text-sm">
            Attendance
            <select
              aria-label="Attendance filter"
              value={params.get('attendance') || ''}
              onChange={(event) => update('attendance', event.target.value)}
              className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-900"
            >
              <option value="">All attendance</option>
              <option value="pending">Pending</option>
              <option value="attended">Attended</option>
              <option value="no-show">No-show</option>
              <option value="late-cancel">Late-cancel</option>
            </select>
          </label>
          <label className="text-sm">
            Client code
            <input
              aria-label="Client code search"
              value={params.get('clientCode') || ''}
              onChange={(event) =>
                update('clientCode', event.target.value.toUpperCase())
              }
              placeholder="CL-AB12"
              className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-900"
            />
          </label>
          {user?.role === 'admin' && (
            <label className="text-sm">
              Counsellor
              <select
                aria-label="Counsellor filter"
                value={params.get('counsellorId') || ''}
                onChange={(event) => update('counsellorId', event.target.value)}
                className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-900"
              >
                <option value="">All</option>
                {(users.data?.data || [])
                  .filter((item) => item.role === 'counsellor')
                  .map((item) => (
                    <option
                      key={item.id || item._id}
                      value={item.id || item._id}
                    >
                      {item.name}
                    </option>
                  ))}
              </select>
            </label>
          )}
        </div>
      </Card>
      {appointments.isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      )}
      {appointments.isError && (
        <ErrorState onRetry={() => appointments.refetch()} />
      )}
      {!appointments.isLoading && !appointments.isError && !rows.length && (
        <EmptyState
          title="No appointments found"
          description="Try adjusting the filters or book a new appointment."
        />
      )}
      {!!rows.length && (
        <Card>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-slate-600 dark:text-slate-300">
                  <th className="p-3">
                    <button
                      onClick={() =>
                        update(
                          'sort',
                          query.sort === 'startTime'
                            ? '-startTime'
                            : 'startTime',
                        )
                      }
                    >
                      Start
                    </button>
                  </th>
                  <th className="p-3">Client code</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Attendance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr
                    key={item._id || item.id}
                    className="border-b last:border-0"
                  >
                    <td className="p-3">
                      <Link
                        className="font-semibold text-brand-700"
                        to={`/appointments/${item._id || item.id}`}
                      >
                        {formatDateTime(item.startTime)}
                      </Link>
                    </td>
                    <td className="p-3">{item.clientCode}</td>
                    <td className="p-3">
                      <Badge>{item.sessionType}</Badge>
                    </td>
                    <td className="p-3">{item.status}</td>
                    <td className="p-3">{item.attendance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">
            {rows.map((item) => (
              <Link
                className="block rounded-lg border p-4"
                key={item._id || item.id}
                to={`/appointments/${item._id || item.id}`}
              >
                <div className="flex justify-between font-semibold">
                  <span>{item.clientCode}</span>
                  <span>{item.status}</span>
                </div>
                <p className="mt-2 text-sm">
                  {formatDateTime(item.startTime)} · {item.sessionType}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Attendance: {item.attendance}
                </p>
              </Link>
            ))}
          </div>
          <div className="mt-4">
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={(next) => {
                const nextParams = new globalThis.URLSearchParams(params);
                nextParams.set('page', String(next));
                setParams(nextParams);
              }}
            />
          </div>
        </Card>
      )}
      <BookingDialog open={bookingOpen} onClose={closeBooking} />
    </div>
  );
}
