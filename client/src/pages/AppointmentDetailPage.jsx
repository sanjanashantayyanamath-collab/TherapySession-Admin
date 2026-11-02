import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../auth/AuthContext.jsx';
import {
  useAppointment,
  useCancelAppointment,
  useUpdateAppointment,
  useUpdateAttendance,
} from '../api/appointments.js';
import { useAvailability } from '../api/availability.js';
import { normalizeApiError } from '../api/errors.js';
import { NotesDrawer } from '../features/NotesDrawer.jsx';
import {
  contiguousStartTimes,
  endTime,
  formatDateTime,
  isoFromLocal,
  localDateInput,
  formatTime,
  timezoneName,
} from '../features/dateUtils.js';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.jsx';
import { ErrorState } from '../components/ui/ErrorState.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Select } from '../components/ui/Select.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';

function RescheduleDialog({ appointment, open, onClose }) {
  const [date, setDate] = useState(localDateInput(appointment.startTime));
  const [startTime, setStartTime] = useState('');
  const update = useUpdateAppointment();
  const { data, isLoading, refetch } = useAvailability({
    date,
    counsellorId: appointment.counsellorId,
  });
  const slots = useMemo(
    () => contiguousStartTimes(data?.slots, appointment.durationMins),
    [data, appointment.durationMins],
  );
  const submit = async () => {
    try {
      await update.mutateAsync({
        id: appointment._id || appointment.id,
        payload: {
          startTime: isoFromLocal(date, startTime),
          endTime: endTime(
            isoFromLocal(date, startTime),
            appointment.durationMins,
          ),
        },
      });
      toast.success('Appointment rescheduled.');
      onClose();
    } catch (error) {
      const normalized = normalizeApiError(error);
      toast.error(
        normalized.code === 'SLOT_CONFLICT'
          ? 'That slot is no longer available.'
          : normalized.code === 'INVALID_STATE'
            ? 'Only scheduled appointments can be rescheduled.'
            : normalized.message,
      );
      if (normalized.code === 'SLOT_CONFLICT') refetch();
    }
  };
  return (
    <Modal open={open} title="Reschedule appointment" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Times use {timezoneName()}.
        </p>
        <label className="block text-sm">
          Date
          <input
            type="date"
            value={date}
            onChange={(event) => {
              setDate(event.target.value);
              setStartTime('');
            }}
            className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-900"
          />
        </label>
        <Select
          label="Start time"
          value={startTime}
          onChange={(event) => setStartTime(event.target.value)}
        >
          <option value="">Select a time</option>
          {isLoading ? (
            <option>Loading…</option>
          ) : (
            slots.map((slot) => (
              <option
                key={slot}
                value={new Date(slot).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                })}
              >
                {formatTime(slot)}
              </option>
            ))
          )}
        </Select>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!startTime || update.isPending} onClick={submit}>
            Save new time
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function AppointmentDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const appointment = useAppointment(id);
  const attendance = useUpdateAttendance();
  const cancel = useCancelAppointment();
  const [confirm, setConfirm] = useState(null);
  const [reschedule, setReschedule] = useState(false);
  const [notes, setNotes] = useState(false);
  const trigger = useRef(null);
  if (appointment.isLoading) return <Skeleton className="h-80" />;
  if (appointment.isError)
    return (
      <ErrorState
        message="Unable to load appointment."
        onRetry={() => appointment.refetch()}
      />
    );
  const item = appointment.data;
  const itemId = item._id || item.id;
  const started = new Date(item.startTime) <= new Date();
  const actionError = async (action) => {
    try {
      if (action === 'attended' || action === 'no-show') {
        await attendance.mutateAsync({ id: itemId, attendance: action });
        toast.success(
          action === 'attended' ? 'Marked attended.' : 'Marked no-show.',
        );
      } else {
        await cancel.mutateAsync(itemId);
        toast.success('Appointment cancelled.');
        navigate('/appointments');
      }
      setConfirm(null);
    } catch (error) {
      const normalized = normalizeApiError(error);
      toast.error(
        normalized.code === 'INVALID_STATE'
          ? 'This appointment can no longer be changed.'
          : normalized.message,
      );
    }
  };
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <button
          className="text-sm font-semibold text-brand-700"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>
        <h1 className="mt-3 text-3xl font-bold">Appointment detail</h1>
      </div>
      <Card>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-slate-600 dark:text-slate-300">
              Client code
            </dt>
            <dd className="font-semibold">{item.clientCode}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-600 dark:text-slate-300">
              Session type
            </dt>
            <dd>
              <Badge>{item.sessionType}</Badge>
            </dd>
          </div>
          <div>
            <dt className="text-sm text-slate-600 dark:text-slate-300">
              Start
            </dt>
            <dd>{formatDateTime(item.startTime)}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-600 dark:text-slate-300">End</dt>
            <dd>{formatDateTime(item.endTime)}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-600 dark:text-slate-300">
              Status
            </dt>
            <dd>{item.status}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-600 dark:text-slate-300">
              Attendance
            </dt>
            <dd>{item.attendance}</dd>
          </div>
        </dl>
        <div className="mt-6 flex flex-wrap gap-2">
          {item.status === 'scheduled' && (
            <>
              <Button
                disabled={!started}
                onClick={() => setConfirm('attended')}
              >
                Mark attended
              </Button>
              <Button
                variant="ghost"
                disabled={!started}
                onClick={() => setConfirm('no-show')}
              >
                Mark no-show
              </Button>
              <Button variant="ghost" onClick={() => setReschedule(true)}>
                Reschedule
              </Button>
              <Button variant="ghost" onClick={() => setConfirm('cancel')}>
                Cancel
              </Button>
            </>
          )}
          {user?.role === 'counsellor' && (
            <Button
              ref={trigger}
              variant="ghost"
              onClick={() => setNotes(true)}
            >
              Private notes
            </Button>
          )}
        </div>
        {item.status === 'scheduled' && !started && (
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            Attendance actions unlock when the appointment starts.
          </p>
        )}
      </Card>
      <ConfirmDialog
        open={Boolean(confirm)}
        title={
          confirm === 'cancel' ? 'Cancel appointment' : 'Record attendance'
        }
        onClose={() => setConfirm(null)}
        onConfirm={() => actionError(confirm)}
      >
        {confirm === 'cancel'
          ? 'Cancelling within 24 hours is recorded as a late-cancel.'
          : `Mark this appointment ${confirm === 'no-show' ? 'as a no-show' : 'as attended'}?`}
      </ConfirmDialog>
      <RescheduleDialog
        appointment={item}
        open={reschedule}
        onClose={() => setReschedule(false)}
      />
      <NotesDrawer
        appointmentId={itemId}
        open={notes}
        onClose={() => {
          setNotes(false);
          trigger.current?.focus();
        }}
      />
    </div>
  );
}
