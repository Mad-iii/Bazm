import { useState } from 'react';
import { money } from '../lib/format';

export default function TicketTierCard({ tier, onBuy, onWaitlist }) {
  const [qty, setQty] = useState(1);
  const soldOut = tier.remaining_quantity <= 0;
  const max = Math.min(10, tier.remaining_quantity);

  return (
    <div className="card">
      <div className="spread">
        <h3>{tier.name}</h3>
        <strong>{money(tier.price)}</strong>
      </div>
      <p className="muted">
        {soldOut ? 'Sold out' : `${tier.remaining_quantity} left`}
      </p>
      {soldOut ? (
        <button className="secondary" onClick={() => onWaitlist(tier)}>Join waitlist</button>
      ) : (
        <div className="row">
          <select style={{ width: 80 }} value={qty} onChange={(e) => setQty(Number(e.target.value))}>
            {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <button onClick={() => onBuy(tier, qty)}>Buy · {money(tier.price * qty)}</button>
        </div>
      )}
    </div>
  );
}