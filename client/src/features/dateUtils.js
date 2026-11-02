export function localDateInput(date = new Date()) {
  const resolvedDate = date instanceof Date ? date : new Date(date);
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(resolvedDate);
  return `${parts.find((part) => part.type === 'year').value}-${parts.find((part) => part.type === 'month').value}-${parts.find((part) => part.type === 'day').value}`;
}

export function formatDateTime(value, options = {}) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
    ...options,
  }).format(new Date(value));
}

export function formatTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function timezoneName() {
  return (
    new Intl.DateTimeFormat(undefined, { timeZoneName: 'long' })
      .formatToParts(new Date())
      .find((part) => part.type === 'timeZoneName')?.value ||
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
}

export function isoFromLocal(date, time) {
  return new Date(`${date}T${time}:00`).toISOString();
}

export function endTime(start, duration) {
  return new Date(
    new Date(start).getTime() + Number(duration) * 60_000,
  ).toISOString();
}

export function rangeFor(period) {
  const to = new Date();
  const from = new Date(to);
  if (period === 'month') from.setDate(1);
  else if (period === 'last30') from.setDate(from.getDate() - 29);
  else {
    const day = from.getDay() || 7;
    from.setDate(from.getDate() - day + 1);
  }
  from.setHours(0, 0, 0, 0);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function looksLikePersonalIdentifier(value) {
  const trimmed = value.trim();
  return (
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed) ||
    /^\+?[\d\s().-]{7,}$/.test(trimmed) ||
    /^[A-Za-z]+(?:[\s'-]+[A-Za-z]+)+$/.test(trimmed)
  );
}

export function contiguousStartTimes(slots = [], duration) {
  const required = Number(duration) / 15;
  return slots
    .filter((slot, index) => {
      for (let offset = 1; offset < required; offset += 1) {
        const current = new Date(slots[index + offset]?.startTime).getTime();
        const expected =
          new Date(slot.startTime).getTime() + offset * 15 * 60_000;
        if (!slots[index + offset] || current !== expected) return false;
      }
      return true;
    })
    .map((slot) => slot.startTime);
}
