import { useEffect, useState } from 'react';
import { getToken, setToken, clearToken } from './api.js';
import Login from './pages/Login.jsx';
import Appointments from './pages/Appointments.jsx';
import Counsellors from './pages/Counsellors.jsx';

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [tab, setTab] = useState('appointments');

  useEffect(() => {
    const out = () => setAuthed(false);
    window.addEventListener('tsa:logout', out);
    return () => window.removeEventListener('tsa:logout', out);
  }, []);

  if (!authed) {
    return (
      <Login
        onLogin={(token) => {
          setToken(token);
          setAuthed(true);
        }}
      />
    );
  }

  return (
    <div className="shell">
      <header className="topbar">
        <h1>TherapySession Admin</h1>
        <nav>
          <button className={tab === 'appointments' ? 'active' : ''} onClick={() => setTab('appointments')}>
            Appointments
          </button>
          <button className={tab === 'counsellors' ? 'active' : ''} onClick={() => setTab('counsellors')}>
            Counsellors
          </button>
        </nav>
        <button
          className="ghost"
          onClick={() => {
            clearToken();
            setAuthed(false);
          }}
        >
          Sign out
        </button>
      </header>
      <main>
        <p className="privacy-note">
          Scheduling data only. Do not enter client names, contact details or session notes — use a client code.
        </p>
        {tab === 'appointments' ? <Appointments /> : <Counsellors />}
      </main>
    </div>
  );
}
