import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../services/api';
import StatusBadge from '../components/StatusBadge';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [assign, setAssign] = useState([]);
  const [events, setEvents] = useState([]);
  const [f, setF] = useState({ name: '', email: '', password: '', eventIds: [] });
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [u, a, e] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('event_assignments').select('id,user_id,event_id,events(name)'),
      supabase.from('events').select('id,name').order('name'),
    ]);
    setUsers(u.data || []);
    setAssign(a.data || []);
    setEvents(e.data || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create() {
    setBusy(true); setErr(''); setMsg('');
    try {
      await api.createOrganizer(f);
      setF({ name: '', email: '', password: '', eventIds: [] });
      setMsg('Organizer created');
      load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(u) {
    const status = u.status === 'active' ? 'suspended' : 'active';
    const { error } = await supabase.from('profiles').update({ status }).eq('id', u.id);
    if (error) return setErr(error.message);
    load();
  }

  async function remove(u) {
    if (!confirm(`Delete ${u.email}? This cannot be undone.`)) return;
    try { await api.deleteUser(u.id); load(); } catch (e) { setErr(e.message); }
  }

  async function addAssign(userId, eventId) {
    if (!eventId) return;
    const { error } = await supabase.from('event_assignments').insert({ user_id: userId, event_id: eventId });
    if (error) return setErr(error.message);
    load();
  }

  async function removeAssign(id) {
    await supabase.from('event_assignments').delete().eq('id', id);
    load();
  }

  return (
    <>
      <h1>Users</h1>
      {err && <div className="error">{err}</div>}
      {msg && <div className="info">{msg}</div>}

      <div className="card" style={{ maxWidth: 560, marginBottom: '1rem' }}>
        <h2>Create organizer</h2>
        <label>Name</label><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <label>Email</label><input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <label>Temporary password (8+ chars)</label><input type="text" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        <label>Assign events (Ctrl/Cmd-click for multiple)</label>
        <select
          multiple size="4" value={f.eventIds}
          onChange={(e) => setF({ ...f, eventIds: [...e.target.selectedOptions].map((o) => o.value) })}
        >
          {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
        </select>
        <p><button disabled={busy || !f.name || !f.email || f.password.length < 8} onClick={create}>Create</button></p>
      </div>

      <div className="card table-wrap">
        <table>
          <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Events</th><th /></tr></thead>
          <tbody>
            {users.map((u) => {
              const mine = assign.filter((a) => a.user_id === u.id);
              return (
                <tr key={u.id}>
                  <td>{u.name || '—'}<br /><span className="muted">{u.email}</span></td>
                  <td>{u.role}</td>
                  <td><StatusBadge status={u.status} /></td>
                  <td>
                    {u.role === 'organizer' ? (
                      <div className="row">
                        {mine.map((a) => (
                          <span key={a.id} className="badge" style={{ background: '#4f46e5' }}>
                            {a.events?.name} <a style={{ color: '#fff', cursor: 'pointer' }} onClick={() => removeAssign(a.id)}>×</a>
                          </span>
                        ))}
                        <select style={{ width: 150 }} value="" onChange={(e) => addAssign(u.id, e.target.value)}>
                          <option value="">+ assign</option>
                          {events.filter((ev) => !mine.some((a) => a.event_id === ev.id)).map((ev) => (
                            <option key={ev.id} value={ev.id}>{ev.name}</option>
                          ))}
                        </select>
                      </div>
                    ) : 'All'}
                  </td>
                  <td className="row">
                    {u.role !== 'master' && (
                      <>
                        <button className="secondary small" onClick={() => toggleStatus(u)}>
                          {u.status === 'active' ? 'Suspend' : 'Reactivate'}
                        </button>
                        <button className="danger small" onClick={() => remove(u)}>Delete</button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}