import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../services/api';
import { downloadCsv, fmtDate, money } from '../lib/format';
import StatusBadge from '../components/StatusBadge';

const STATUSES = ['pending', 'payment_received', 'approved', 'rejected', 'expired'];
const itemLabel = (r) =>
  r.item_type === 'stall' ? `Stall ${r.stalls?.label}` : `${r.quantity} × ${r.ticket_tiers?.name}`;

export default function BookingsTable() {
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ event: '', status: '', q: '', from: '' });
  const [picked, setPicked] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, events(name), ticket_tiers(name), stalls(label)')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) setErr(error.message);
    setRows(data || []);
    setPicked(new Set());
  }, []);

  useEffect(() => { load(); }, [load]);

  const events = useMemo(() => {
    const m = new Map();
    rows.forEach((r) => m.set(r.event_id, r.events?.name));
    return [...m.entries()];
  }, [rows]);

  const shown = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!filters.event || r.event_id === filters.event) &&
        (!filters.status || r.status === filters.status) &&
        (!filters.from || new Date(r.created_at) >= new Date(filters.from)) &&
        (!q ||
          r.order_id.toLowerCase().includes(q) ||
          r.buyer_name.toLowerCase().includes(q) ||
          r.buyer_email.toLowerCase().includes(q) ||
          r.buyer_phone.includes(q))
    );
  }, [rows, filters]);

  const setF = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });

  function toggle(id) {
    const n = new Set(picked);
    n.has(id) ? n.delete(id) : n.add(id);
    setPicked(n);
  }

  async function act(ids, action) {
    if (!ids.length) return;
    if (ids.length > 1 && !confirm(`${action} ${ids.length} bookings?`)) return;
    setBusy(true); setMsg(''); setErr('');
    try {
      const { results } = await api.review(ids, action);
      const failed = results.filter((r) => !r.ok);
      setMsg(`${results.length - failed.length} done${failed.length ? `, ${failed.length} skipped (wrong state or no permission)` : ''}`);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
      load();
    }
  }

  function exportCsv() {
    const list = shown
      .filter((r) => r.status === 'approved')
      .map((r) => ({
        order_id: r.order_id, event: r.events?.name, item: itemLabel(r), name: r.buyer_name,
        company: r.buyer_company, email: r.buyer_email, phone: r.buyer_phone, total: r.total_price,
      }));
    if (!list.length) return setErr('No approved bookings in the current filter');
    downloadCsv('attendees.csv', list);
  }

  return (
    <>
      <div className="spread">
        <h1>Bookings</h1>
        <div className="row">
          <button className="secondary" onClick={load}>Refresh</button>
          <button className="secondary" onClick={exportCsv}>Export approved (CSV)</button>
        </div>
      </div>

      {err && <div className="error">{err}</div>}
      {msg && <div className="info">{msg}</div>}

      <div className="row" style={{ marginBottom: '.8rem' }}>
        <input style={{ maxWidth: 240 }} placeholder="Search order, name, email, phone" value={filters.q} onChange={setF('q')} />
        <select style={{ maxWidth: 200 }} value={filters.event} onChange={setF('event')}>
          <option value="">All events</option>
          {events.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <select style={{ maxWidth: 180 }} value={filters.status} onChange={setF('status')}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <input style={{ maxWidth: 160 }} type="date" value={filters.from} onChange={setF('from')} title="Created from" />
      </div>

      {picked.size > 0 && (
        <div className="row" style={{ marginBottom: '.8rem' }}>
          <strong>{picked.size} selected</strong>
          <button disabled={busy} className="ok small" onClick={() => act([...picked], 'approve')}>Approve</button>
          <button disabled={busy} className="danger small" onClick={() => act([...picked], 'reject')}>Reject</button>
        </div>
      )}

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th />
              <th>Order</th><th>Event</th><th>Item</th><th>Buyer</th><th>Phone</th>
              <th>Total</th><th>Status</th><th>Created</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const open = r.status === 'pending' || r.status === 'payment_received';
              return (
                <tr key={r.id}>
                  <td>{open && <input type="checkbox" style={{ width: 'auto' }} checked={picked.has(r.id)} onChange={() => toggle(r.id)} />}</td>
                  <td>{r.order_id}</td>
                  <td>{r.events?.name}</td>
                  <td>{itemLabel(r)}</td>
                  <td>{r.buyer_name}<br /><span className="muted">{r.buyer_email}</span></td>
                  <td>
                    <a href={`https://wa.me/${r.buyer_phone.replace(/\D/g, '').replace(/^0/, '92')}`} target="_blank" rel="noreferrer">{r.buyer_phone}</a>
                  </td>
                  <td>{money(r.total_price)}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>{fmtDate(r.created_at)}</td>
                  <td className="row">
                    {r.status === 'pending' && <button disabled={busy} className="secondary small" onClick={() => act([r.id], 'payment_received')}>Paid</button>}
                    {open && <button disabled={busy} className="ok small" onClick={() => act([r.id], 'approve')}>Approve</button>}
                    {open && <button disabled={busy} className="danger small" onClick={() => act([r.id], 'reject')}>Reject</button>}
                  </td>
                </tr>
              );
            })}
            {!shown.length && <tr><td colSpan="10" className="muted">No bookings.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}