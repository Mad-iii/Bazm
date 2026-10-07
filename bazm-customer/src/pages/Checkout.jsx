import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import HoldTimer from '../components/HoldTimer';
import { money } from '../lib/format';

export default function Checkout() {
  const { state } = useLocation();
  const [expired, setExpired] = useState(false);

  let order = state?.order;
  if (!order) {
    try { order = JSON.parse(sessionStorage.getItem('lastOrder')); } catch { order = null; }
  }
  if (!order) return <p>No active order. <Link to="/">Browse events</Link></p>;

  return (
    <div className="card" style={{ maxWidth: 520, margin: '1rem auto' }}>
      <h1>Order reserved ✅</h1>
      <p className="muted">{order.eventName}</p>
      <h2 style={{ letterSpacing: 1 }}>{order.orderId}</h2>
      <p>{order.item} · <strong>{money(order.totalPrice)}</strong></p>

      {expired ? (
        <div className="error">Your hold expired. If you already paid, message us on WhatsApp with your Order ID.</div>
      ) : (
        <>
          <p className="muted">Complete payment within</p>
          <HoldTimer expiresAt={order.holdExpiresAt} onExpire={() => setExpired(true)} />
        </>
      )}

      <p style={{ marginTop: '1rem' }}>
        <a className="btn ok" href={order.whatsappUrl} target="_blank" rel="noreferrer">
          Send payment proof on WhatsApp
        </a>
      </p>
      <p className="muted">
        Save your Order ID. Track approval any time on the{' '}
        <Link to="/status">order status page</Link>.
      </p>
    </div>
  );
}