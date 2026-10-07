import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { fmtDate, money } from '../lib/format';
import StatusBadge from '../components/StatusBadge';

export default function OrderStatus() {
  const [params] = useSearchParams();
  const [orderId, setOrderId] = useState(params.get('orderId') || '');
  const [email, setEmail] = useState(params.get('email') || '');
  const [res, setRes] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function lookup() {
    setBusy(true);
    setErr('');
    setRes(null);
    try {
      setRes(await api.orderStatus(orderId, email));
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 480, margin: '1rem auto' }}>
      <h1>Check your order</h1>
      <label>Order ID</label>
      <input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="EXP2026-0042" />
      <label>Email used at booking</label>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <p><button disabled={busy || !orderId || !email} onClick={lookup}>Check status</button></p>

      {err && <div className="error">{err}</div>}
      {res && (
        <div>
          <div className="spread"><h2>{res.orderId}</h2><StatusBadge status={res.status} /></div>
          <p>{res.event?.name}<br /><span className="muted">{fmtDate(res.event?.starts_at)} · {res.event?.venue}</span></p>
          <p>{res.item} · {money(res.totalPrice)}</p>
          {res.status === 'pending' && <p className="muted">Waiting for your payment proof. Send it on WhatsApp.</p>}
          {res.status === 'payment_received' && <p className="muted">Payment received. Verification in progress.</p>}
          {res.status === 'approved' && <p className="muted">Approved. Check your email for the confirmation.</p>}
          {res.status === 'expired' && <p className="muted">This hold expired and the item was released.</p>}
        </div>
      )}
    </div>
  );
}