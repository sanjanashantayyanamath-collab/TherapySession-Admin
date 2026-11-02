import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { useAppointments, useUpdateAttendance } from '../api/appointments.js';
import { useStats } from '../api/stats.js';
import { useUsers } from '../api/users.js';
import { normalizeApiError } from '../api/errors.js';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { ErrorState } from '../components/ui/ErrorState.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { formatTime, rangeFor, localDateInput } from '../features/dateUtils.js';

function isStarted(value) {
  return new Date(value) <= new Date();
}

export function DashboardPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState('week');
  const [counsellorId, setCounsellorId] = useState('');
  const range = rangeFor(period);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const appointments = useAppointments({
    from: todayStart.toISOString(),
    to: todayEnd.toISOString(),
    page: 1,
    limit: 50,
    ...(user?.role === 'admin' && counsellorId && { counsellorId }),
  });
  const stats = useStats({
    ...range,
    ...(user?.role === 'admin' && counsellorId && { counsellorId }),
  });
  const users = useUsers({ page: 1, limit: 50 });
  const attendance = useUpdateAttendance();
  const todays = (appointments.data?.data || []).filter(
    (item) => item.startTime?.slice(0, 10) === localDateInput(),
  );
  const chartMax = Math.max(
    ...(stats.data?.sessionsPerWeek || []).map((item) => item.sessions),
    1,
  );
  const updateAttendance = async (id, value) => {
    try {
      await attendance.mutateAsync({ id, attendance: value });
      toast.success(
        value === 'attended' ? 'Marked attended.' : 'Marked no-show.',
      );
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    }
  };
  const statCards = useMemo(
    () => [
      ['Completed', stats.data?.completed],
      [
        'Attendance rate',
        `${Math.round((stats.data?.attendanceRate || 0) * 100)}%`,
      ],
      ['No-show rate', `${Math.round((stats.data?.noShowRate || 0) * 100)}%`],
      ['Late-cancels', stats.data?.lateCancels],
      ['Cancelled', stats.data?.cancelled],
    ],
    [stats.data],
  );
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">
            Dashboard
          </p>
          <h1 className="text-3xl font-bold">Today’s sessions</h1>
        </div>
        <div className="flex gap-2">
          <label className="text-sm">
            Range
            <select
              aria-label="Stats range"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              className="ml-2 rounded-lg border p-2 dark:bg-slate-900"
            >
              <option value="week">This week</option>
              <option value="month">This month</option>
              <option value="last30">Last 30 days</option>
            </select>
          </label>
          {user?.role === 'admin' && (
            <label className="text-sm">
              Counsellor
              <select
                aria-label="Counsellor filter"
                value={counsellorId}
                onChange={(event) => setCounsellorId(event.target.value)}
                className="ml-2 rounded-lg border p-2 dark:bg-slate-900"
              >
                <option value="">All counsellors</option>
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
      </div>
      <section aria-label="Today's sessions">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Today</h2>
            <Link
              className="text-sm font-semibold text-brand-700"
              to="/schedule"
            >
              Open schedule
            </Link>
          </div>
          {appointments.isLoading && (
            <div className="mt-4 space-y-3">
              <Skeleton />
              <Skeleton />
              <Skeleton />
            </div>
          )}
          {appointments.isError && (
            <ErrorState onRetry={() => appointments.refetch()} />
          )}
          {!appointments.isLoading &&
            !appointments.isError &&
            !todays.length && (
              <div className="mt-4">
                <EmptyState
                  title="No sessions today"
                  description="Your schedule is clear."
                />
              </div>
            )}
          {todays.map((appointment) => (
            <div
              key={appointment._id || appointment.id}
              className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
            >
              <div>
                <Link
                  className="font-semibold text-brand-700"
                  to={`/appointments/${appointment._id || appointment.id}`}
                >
                  {formatTime(appointment.startTime)} · {appointment.clientCode}
                </Link>
                <div className="mt-1 flex gap-2">
                  <Badge>{appointment.sessionType}</Badge>
                  <Badge>{appointment.attendance}</Badge>
                </div>
              </div>
              {appointment.status === 'scheduled' &&
                isStarted(appointment.startTime) && (
                  <div className="flex gap-2">
                    <Button
                      disabled={attendance.isPending}
                      onClick={() =>
                        updateAttendance(
                          appointment._id || appointment.id,
                          'attended',
                        )
                      }
                    >
                      Mark attended
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={attendance.isPending}
                      onClick={() =>
                        updateAttendance(
                          appointment._id || appointment.id,
                          'no-show',
                        )
                      }
                    >
                      No-show
                    </Button>
                  </div>
                )}
            </div>
          ))}
        </Card>
      </section>
      <section aria-label="Statistics">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Statistics</h2>
          {stats.isError && (
            <span className="text-sm text-red-700">
              Unable to load statistics
            </span>
          )}
        </div>
        {stats.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {statCards.map(([label]) => (
              <Card key={label}>
                <Skeleton />
                <Skeleton className="mt-3 h-8 w-20" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {statCards.map(([label, value]) => (
              <Card key={label}>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {label}
                </p>
                <p className="mt-2 text-2xl font-bold">{value ?? '—'}</p>
              </Card>
            ))}
          </div>
        )}
      </section>
      <Card>
        <h2 className="text-lg font-semibold">Sessions per week</h2>
        {stats.isLoading ? (
          <Skeleton className="mt-4 h-48" />
        ) : (
          <div className="mt-4">
            <svg
              role="img"
              aria-label="Sessions per week bar chart"
              viewBox="0 0 600 220"
              className="h-52 w-full"
            >
              <line x1="30" y1="190" x2="580" y2="190" stroke="currentColor" />
              <g>
                {(stats.data?.sessionsPerWeek || []).map((item, index) => {
                  const height = (item.sessions / chartMax) * 150;
                  return (
                    <g key={item.week}>
                      <rect
                        x={50 + index * 90}
                        y={190 - height}
                        width="50"
                        height={height}
                        fill="#0f766e"
                      />
                      <text
                        x={75 + index * 90}
                        y="210"
                        textAnchor="middle"
                        fontSize="12"
                      >
                        {item.week}
                      </text>
                      <text
                        x={75 + index * 90}
                        y={180 - height}
                        textAnchor="middle"
                        fontSize="12"
                      >
                        {item.sessions}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
            <table className="sr-only">
              <caption>Sessions per week data</caption>
              <thead>
                <tr>
                  <th>Week</th>
                  <th>Sessions</th>
                </tr>
              </thead>
              <tbody>
                {(stats.data?.sessionsPerWeek || []).map((item) => (
                  <tr key={item.week}>
                    <td>{item.week}</td>
                    <td>{item.sessions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
