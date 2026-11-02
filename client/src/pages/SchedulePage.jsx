import { useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppointments } from '../api/appointments.js';
import { BookingDialog } from '../features/BookingDialog.jsx';
import { formatTime, localDateInput } from '../features/dateUtils.js';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { ErrorState } from '../components/ui/ErrorState.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';

function monday(date) {
  const result = new Date(date);
  const day = result.getDay() || 7;
  result.setDate(result.getDate() - day + 1);
  result.setHours(0, 0, 0, 0);
  return result;
}
function dateKey(date) {
  return date.toISOString().slice(0, 10);
}
const WORK_START_HOUR = Number(import.meta.env.VITE_WORK_START_HOUR ?? 9);
const WORK_END_HOUR = Number(import.meta.env.VITE_WORK_END_HOUR ?? 17);

export function SchedulePage() {
  const [params, setParams] = useSearchParams();
  const [booking, setBooking] = useState({
    open: false,
    date: localDateInput(),
    start: '',
  });
  const trigger = useRef(null);
  const weekStart = monday(
    params.get('start')
      ? new Date(`${params.get('start')}T00:00:00`)
      : new Date(),
  );
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + index);
    return day;
  });
  const appointments = useAppointments({
    from: weekStart.toISOString(),
    to: weekEnd.toISOString(),
    page: 1,
    limit: 50,
  });
  const byDay = useMemo(
    () =>
      (appointments.data?.data || []).reduce((result, item) => {
        (result[item.startTime.slice(0, 10)] ||= []).push(item);
        return result;
      }, {}),
    [appointments.data],
  );
  const move = (offset) => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + offset);
    setParams({ start: dateKey(next) });
  };
  const today = () => setParams({ start: dateKey(monday(new Date())) });
  const close = () => {
    setBooking({ open: false, date: localDateInput(), start: '' });
    trigger.current?.focus();
  };
  const openSlot = (day, hour) => {
    setBooking({
      open: true,
      date: dateKey(day),
      start: `${String(hour).padStart(2, '0')}:00`,
    });
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">
            Schedule
          </p>
          <h1 className="text-3xl font-bold">Week view</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={() => move(-7)}
            aria-label="Previous week"
          >
            <ChevronLeft />
          </Button>
          <Button variant="ghost" onClick={today}>
            Today
          </Button>
          <Button
            variant="ghost"
            onClick={() => move(7)}
            aria-label="Next week"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
      {appointments.isLoading && <Skeleton className="h-96" />}
      {appointments.isError && (
        <ErrorState onRetry={() => appointments.refetch()} />
      )}
      {!appointments.isLoading && !appointments.isError && (
        <Card>
          <div className="hidden overflow-x-auto lg:block">
            <div className="grid min-w-[980px] grid-cols-7 divide-x">
              {days.map((day) => (
                <div key={dateKey(day)} className="min-h-[560px]">
                  <h2 className="sticky top-0 border-b bg-white p-3 text-center text-sm font-semibold dark:bg-slate-900">
                    {new Intl.DateTimeFormat(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    }).format(day)}
                  </h2>
                  <div className="relative">
                    {Array.from(
                      { length: WORK_END_HOUR - WORK_START_HOUR },
                      (_, index) => WORK_START_HOUR + index,
                    ).map((hour) => (
                      <button
                        key={hour}
                        type="button"
                        className="flex h-16 w-full border-b border-dashed p-1 text-left text-xs text-slate-500 hover:bg-brand-50"
                        onClick={() => openSlot(day, hour)}
                      >
                        {hour}:00
                      </button>
                    ))}
                    {(byDay[dateKey(day)] || []).map((item) => (
                      <Link
                        key={item._id || item.id}
                        to={`/appointments/${item._id || item.id}`}
                        className="absolute left-1 right-1 z-10 rounded border border-brand-700 bg-brand-50 p-1 text-xs text-brand-900 dark:bg-slate-800 dark:text-white"
                        style={{
                          top: `${Math.max(0, (new Date(item.startTime).getHours() - WORK_START_HOUR) * 64)}px`,
                          minHeight: `${Math.max(36, (item.durationMins / 15) * 16)}px`,
                        }}
                      >
                        <strong>{formatTime(item.startTime)}</strong>
                        <br />
                        {item.clientCode}
                        <br />
                        {item.status} · {item.attendance}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3 lg:hidden">
            {days.flatMap((day) =>
              (byDay[dateKey(day)] || []).map((item) => (
                <Link
                  key={item._id || item.id}
                  className="block rounded-lg border p-4"
                  to={`/appointments/${item._id || item.id}`}
                >
                  <div className="flex justify-between font-semibold">
                    <span>
                      {new Intl.DateTimeFormat(undefined, {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
                      }).format(day)}
                    </span>
                    <span>{formatTime(item.startTime)}</span>
                  </div>
                  <p className="mt-2">
                    {item.clientCode} · {item.sessionType}
                  </p>
                  <Badge>
                    {item.status} · {item.attendance}
                  </Badge>
                </Link>
              )),
            )}
            {!appointments.data?.data?.length && (
              <EmptyState
                title="No appointments this week"
                description="Use the desktop grid or book from the appointments page."
              />
            )}
          </div>
        </Card>
      )}
      <BookingDialog
        open={booking.open}
        onClose={close}
        initialDate={booking.date}
        initialStartTime={booking.start}
      />
    </div>
  );
}
