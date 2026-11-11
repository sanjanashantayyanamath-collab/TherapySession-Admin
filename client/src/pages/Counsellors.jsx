import { useEffect, useState } from 'react';
import { api, errorText } from '../api.js';

export default function Counsellors() {
  const [list, setList] = useState([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () =>
    api
      .counsellors()
      .then(setList)
      .catch((e) => setError(errorText(e)))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  async function add(e) {
    e.preventDefault();
    setError('');
    try {
      await api.addCounsellor({ name });
      setName('');
      load();
    } catch (err) {
      setError(errorText(err));
    }
  }

  async function toggle(c) {
    setError('');
    try {
      await api.updateCounsellor(c._id, { active: !c.active });
      load();
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <section>
      <h2>Counsellors</h2>
      {error && <div className="alert" role="alert">{error}</div>}
      <form className="row card" onSubmit={add}>
        <input placeholder="Counsellor name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        <button className="primary">Add counsellor</button>
      </form>
      {loading ? (
        <p className="muted">Loading…</p>
      ) : list.length === 0 ? (
        <p className="muted">No counsellors yet.</p>
      ) : (
        <ul className="plain card">
          {list.map((c) => (
            <li key={c._id} className="between">
              <span>
                {c.name} {!c.active && <span className="badge cancelled">inactive</span>}
              </span>
              <button className="ghost" onClick={() => toggle(c)}>{c.active ? 'Deactivate' : 'Activate'}</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
