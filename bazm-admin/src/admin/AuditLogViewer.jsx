import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { fmtDate } from '../lib/format';

export default function AuditLogViewer() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    supabase
      .from('audit_log')
      .select('*, profiles(name,email)')
      .order('created_at', { ascending: false })
      .limit(300)
      .then(({ data }) => setRows(data || []));
  }, []);

  const shown = rows.filter((r) => {
    const s = q.toLowerCase();
    return (
      !s ||
      r.action.toLowerCase().includes(s) ||
      (r.profiles?.email || '').toLowerCase().includes(s) ||
      JSON.stringify(r.meta || {}).toLowerCase().includes(s)
    );
  });

  return (
    <>
      <h1>Audit log</h1>
      <input style={{ maxWidth: 320, marginBottom: '.8rem' }} placeholder="Filter by action, user, order ID…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="card table-wrap">
        <table>
          <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Details</th></tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id}>
                <td>{fmtDate(r.created_at)}</td>
                <td>{r.profiles?.name || r.profiles?.email || '—'}</td>
                <td>{r.action}</td>
                <td className="muted">{r.meta ? JSON.stringify(r.meta) : ''}</td>
              </tr>
            ))}
            {!shown.length && <tr><td colSpan="4" className="muted">Nothing logged yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}