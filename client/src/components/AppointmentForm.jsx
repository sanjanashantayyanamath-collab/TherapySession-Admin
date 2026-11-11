import { useState } from 'react';
import { api, errorText } from '../api.js';

// datetime-local needs local "YYYY-MM-DDTHH:mm"
const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function AppointmentForm({ counsellors, initial, onSaved, onCancel }) {
  const editing = !!initial;
  const [form, setForm] = useState({
    counsellor: initial?.counsellor?._id || '',
    clientRef: initial?.clientRef || '',
    startTime: toLocalInput(initial?.startTime),
    endTime: toLocalInput(initial?.endTime),
    mode: initial?.mode || 'in-person',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!form.counsellor) return setError('Choose a counsellor.');
    if (!/^[A-Za-z0-9-]{2,20}$/.test(form.clientRef)) return setError('Client code: 2-20 letters, digits or hyphens (e.g. C-1042). No names.');
    if (!form.startTime || !form.endTime) return setError('Start and end time are required.');
    if (new Date(form.endTime) <= new Date(form.startTime)) return setError('End time must be after start time.');
    const body = {
      ...form,
      startTime: new Date(form.startTime).toISOString(),
      endTime: new Date(form.endTime).toISOString(),
    };
    setBusy(true);
    try {
      if (editing) await api.updateAppointment(initial._id, body);
      else await api.addAppointment(body);
      onSaved();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form className="card modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>{editing ? 'Edit appointment' : 'New appointment'}</h2>
        <label>
          Counsellor
          <select value={form.counsellor} onChange={set('counsellor')}>
            <option value="">Select…</option>
            {counsellors
              .filter((c) => c.active || c._id === form.counsellor)
              .map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
          </select>
        </label>
        <label>
          Client code
          <input value={form.clientRef} onChange={set('clientRef')} placeholder="e.g. C-1042" maxLength={20} />
        </label>
        <div className="grid2">
          <label>
            Start
            <input type="datetime-local" value={form.startTime} onChange={set('startTime')} />
          </label>
          <label>
            End
            <input type="datetime-local" value={form.endTime} onChange={set('endTime')} />
          </label>
        </div>
        <label>
          Mode
          <select value={form.mode} onChange={set('mode')}>
            <option value="in-person">In person</option>
            <option value="online">Online</option>
          </select>
        </label>
        {error && <div className="alert" role="alert">{error}</div>}
        <div className="row end">
          <button type="button" className="ghost" onClick={onCancel}>Cancel</button>
          <button className="primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
}
