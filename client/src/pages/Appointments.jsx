import { useCallback, useEffect, useState } from 'react';
import { api, errorText } from '../api.js';
import AppointmentForm from '../components/AppointmentForm.jsx';

const fmt = (iso) =>
  new Date(iso).toLocaleString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function Appointments() {
  const [items, setItems] = useState([]);
  const [counsellors, setCounsellors] = useState([]);
  const [summary, setSummary] = useState([]);
  const [filters, setFilters] = useState({ counsellor: '', status: '', from: '', to: '' });
  const [form, setForm] = useState(null); // null | {} | appointment
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError('');
    try {
      const params = { ...filters };
      if (params.from) params.from = new Date(params.from).toISOString();
      if (params.to) params.to = new Date(`${params.to}T23:59:59`).toISOString();
      const [a, c, s] = await Promise.all([api.appointments(params), api.counsellors(), api.summary()]);
      setItems(a);
      setCounsellors(c);
      setSummary(s);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const setF = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));

  async function changeStatus(id, status) {
    try {
      await api.setStatus(id, status);
      load();
    } catch (e) {
      setError(errorText(e));
    }
  }

  async function remove(id) {
    if (!window.confirm('Delete this appointment? This cannot be undone.')) return;
    try {
      await api.deleteAppointment(id);
      load();
    } catch (e) {
      setError(errorText(e));
    }
  }

  return (
    <section>
      <div className="between">
        <h2>Appointments</h2>
        <button className="primary" onClick={() => setForm({})}>+ New appointment</button>
      </div>

      {summary.length > 0 && (
        <div className="stats">
          {summary.map((s) => (
            <div className="card stat" key={s.counsellorId}>
              <strong>{s.name}</strong>
              <div className="chips">
                <span className="badge scheduled">{s.scheduled} scheduled</span>
                <span className="badge attended">{s.attended} attended</span>
                <span className="badge missed">{s.missed} missed</span>
                <span className="badge cancelled">{s.cancelled} cancelled</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card filters">
        <select value={filters.counsellor} onChange={setF('counsellor')} aria-label="Counsellor">
          <option value="">All counsellors</option>
          {counsellors.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <select value={filters.status} onChange={setF('status')} aria-label="Status">
          <option value="">Any status</option>
          {['scheduled', 'attended', 'missed', 'cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="date" value={filters.from} onChange={setF('from')} aria-label="From date" />
        <input type="date" value={filters.to} onChange={setF('to')} aria-label="To date" />
        <button className="ghost" onClick={() => setFilters({ counsellor: '', status: '', from: '', to: '' })}>Clear</button>
      </div>

      {error && <div className="alert" role="alert">{error}</div>}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="muted">No appointments match these filters.</p>
      ) : (
        <div className="table-wrap card">
          <table>
            <thead>
              <tr><th>When</th><th>Counsellor</th><th>Client code</th><th>Mode</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a._id}>
                  <td data-label="When">{fmt(a.startTime)} – {new Date(a.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  <td data-label="Counsellor">{a.counsellor?.name || '—'}</td>
                  <td data-label="Client code">{a.clientRef}</td>
                  <td data-label="Mode">{a.mode}</td>
                  <td data-label="Status">
                    <select className={`badge ${a.status}`} value={a.status} onChange={(e) => changeStatus(a._id, e.target.value)} aria-label="Change status">
                      {['scheduled', 'attended', 'missed', 'cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="actions">
                    <button className="ghost" onClick={() => setForm(a)}>Edit</button>
                    <button className="ghost danger" onClick={() => remove(a._id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <AppointmentForm
          counsellors={counsellors}
          initial={form._id ? form : null}
          onCancel={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            load();
          }}
        />
      )}
    </section>
  );
}
