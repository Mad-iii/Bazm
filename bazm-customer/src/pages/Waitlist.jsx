import { useState } from 'react';
import { api } from '../services/api';

export default function Waitlist({ eventId, tierId, onClose }) {
  const [f, setF] = useState({ name: '', email: '', phone: '' });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit() {
    setBusy(true);
    setErr('');
    try {
      await api.joinWaitlist({ eventId, tierId: tierId || null, ...f });
      setDone(true);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Join the waitlist</h2>
        {done ? (
          <>
            <div className="info">You're on the list. We'll email you if a spot opens up.</div>
            <button onClick={onClose}>Close</button>
          </>
        ) : (
          <>
            {err && <div className="error">{err}</div>}
            <label>Name</label><input value={f.name} onChange={set('name')} />
            <label>Email</label><input type="email" value={f.email} onChange={set('email')} />
            <label>Phone (optional)</label><input value={f.phone} onChange={set('phone')} />
            <div className="row" style={{ marginTop: '1rem' }}>
              <button disabled={busy || !f.name || !f.email} onClick={submit}>Join</button>
              <button className="secondary" onClick={onClose}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}