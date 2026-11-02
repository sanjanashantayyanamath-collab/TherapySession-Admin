import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useAuth } from '../auth/AuthContext.jsx';
import { useAvailability } from '../api/availability.js';
import { useCreateAppointment } from '../api/appointments.js';
import { useUsers } from '../api/users.js';
import { applyFieldErrors, normalizeApiError } from '../api/errors.js';
import {
  contiguousStartTimes,
  endTime,
  isoFromLocal,
  looksLikePersonalIdentifier,
  localDateInput,
  formatTime,
} from './dateUtils.js';
import { Modal } from '../components/ui/Modal.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Select } from '../components/ui/Select.jsx';

const schema = z.object({
  clientCode: z
    .string()
    .regex(/^CL-[A-Z0-9]{4,8}$/, 'Use a code like CL-AB12.'),
  date: z.string().min(1, 'Choose a date.'),
  duration: z.enum(['30', '45', '60', '90']),
  startTime: z.string().min(1, 'Choose a start time.'),
  sessionType: z.enum(['in-person', 'online', 'phone']),
  counsellorId: z.string().optional(),
});

export function BookingDialog({
  open,
  onClose,
  initialDate = localDateInput(),
  initialStartTime = '',
}) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { data: users } = useUsers({ page: 1, limit: 50 });
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      clientCode: '',
      date: initialDate,
      duration: '60',
      startTime: initialStartTime,
      sessionType: 'in-person',
      counsellorId: '',
    },
  });
  const { getValues, setValue } = form;
  const date = form.watch('date');
  const duration = form.watch('duration');
  const clientCode = form.watch('clientCode');
  const counsellorId = isAdmin ? form.watch('counsellorId') : user?.id;
  const {
    data: availability,
    isLoading: availabilityLoading,
    isError: availabilityError,
    refetch,
  } = useAvailability({
    date: open ? date : '',
    counsellorId: open ? counsellorId : '',
  });
  const create = useCreateAppointment();
  const slots = useMemo(
    () => contiguousStartTimes(availability?.slots, duration),
    [availability, duration],
  );

  useEffect(() => {
    if (open && isAdmin && !getValues('counsellorId') && users?.data?.length) {
      setValue(
        'counsellorId',
        users.data.find((item) => item.role === 'counsellor' && item.isActive)
          ?.id ||
          users.data.find((item) => item.role === 'counsellor' && item.isActive)
            ?._id ||
          '',
      );
    }
  }, [open, isAdmin, users, getValues, setValue]);

  useEffect(() => {
    if (initialStartTime) setValue('startTime', initialStartTime);
  }, [initialStartTime, setValue]);

  const submit = async (values) => {
    if (looksLikePersonalIdentifier(values.clientCode)) {
      form.setError('clientCode', {
        type: 'privacy',
        message:
          'Use a pseudonymous client code, not a name, phone number, or email.',
      });
      return;
    }
    try {
      const start = isoFromLocal(values.date, values.startTime);
      await create.mutateAsync({
        clientCode: values.clientCode.toUpperCase(),
        startTime: start,
        endTime: endTime(start, values.duration),
        sessionType: values.sessionType,
        ...(isAdmin && { counsellorId: values.counsellorId }),
      });
      toast.success('Appointment booked.');
      form.reset();
      onClose();
    } catch (error) {
      const normalized = normalizeApiError(error);
      applyFieldErrors(normalized, form.setError);
      toast.error(
        normalized.code === 'SLOT_CONFLICT'
          ? 'That slot was just booked. Availability has been refreshed.'
          : normalized.code === 'PAST_APPOINTMENT'
            ? 'Choose a future start time.'
            : normalized.code === 'OUTSIDE_BUSINESS_HOURS'
              ? 'Choose a time within business hours.'
              : normalized.message,
      );
      if (normalized.code === 'SLOT_CONFLICT') refetch();
    }
  };

  return (
    <Modal open={open} title="Book appointment" onClose={onClose}>
      <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
        <Input
          label="Client code"
          autoComplete="off"
          {...form.register('clientCode', {
            setValueAs: (value) => value.toUpperCase(),
          })}
          error={form.formState.errors.clientCode?.message}
        />
        {looksLikePersonalIdentifier(clientCode) && (
          <p role="alert" className="text-sm text-amber-700">
            Use a pseudonymous client code, not a name, phone number, or email.
          </p>
        )}
        <button
          type="button"
          className="text-sm font-semibold text-brand-700 underline"
          onClick={() =>
            form.setValue(
              'clientCode',
              `CL-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
            )
          }
        >
          Generate code
        </button>
        {isAdmin && (
          <Select
            label="Counsellor"
            {...form.register('counsellorId')}
            error={form.formState.errors.counsellorId?.message}
          >
            <option value="">Select counsellor</option>
            {(users?.data || [])
              .filter((item) => item.role === 'counsellor' && item.isActive)
              .map((item) => (
                <option key={item.id || item._id} value={item.id || item._id}>
                  {item.name}
                </option>
              ))}
          </Select>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Date"
            type="date"
            {...form.register('date')}
            error={form.formState.errors.date?.message}
          />
          <Select label="Duration" {...form.register('duration')}>
            <option value="30">30 minutes</option>
            <option value="45">45 minutes</option>
            <option value="60">60 minutes</option>
            <option value="90">90 minutes</option>
          </Select>
        </div>
        <Select
          label="Start time"
          {...form.register('startTime')}
          error={form.formState.errors.startTime?.message}
        >
          <option value="">Select a start time</option>
          {availabilityLoading ? (
            <option>Loading available times…</option>
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
        {availabilityError && (
          <p role="alert" className="text-sm text-red-700">
            Unable to load availability.{' '}
            <button
              type="button"
              className="underline"
              onClick={() => refetch()}
            >
              Retry
            </button>
          </p>
        )}
        {!availabilityLoading && !availabilityError && !slots.length && (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            No contiguous times are available for this duration.
          </p>
        )}
        <Select label="Session type" {...form.register('sessionType')}>
          <option value="in-person">In person</option>
          <option value="online">Online</option>
          <option value="phone">Phone</option>
        </Select>
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Times use your browser timezone. The API receives UTC.
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={form.formState.isSubmitting || create.isPending}>
            Book appointment
          </Button>
        </div>
      </form>
    </Modal>
  );
}
