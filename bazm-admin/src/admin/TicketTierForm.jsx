import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { money } from '../lib/format';

const EMPTY = { id: null, name: '', price: '', total_quantity: '' };

export default function TicketTierForm({ eventId }) {
  const [tiers, setTiers] = useState([]);
  const [f, setF] = useState(EMPTY);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase.from('ticket_tiers').select('*').eq('event_id', eventId).order('price');
    setTiers(data || []);
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function save() {
    setErr('');
    const price = Number(f.price);
    const total = parseInt(f.total_quantity, 10);
    if (!f.name || isNaN(price) || isNaN(total) || price < 0 || total < 0) return setErr('Check name, price and quantity');

    let error;
    if (f.id) {
      const old = tiers.find((t) => t.id === f.id);
      const remaining = Math.max(0, old.remaining_quantity + (total - old.total_quantity));
      ({ error } = await supabase
        .from('ticket_tiers')
        .update({ name: f.name, price, total_quantity: total, remaining_quantity: remaining })
        .eq('id', f.id));
    } else {
      ({ error } = await supabase
        .from('ticket_tiers')
        .insert({ event_id: eventId, name: f.name, price, total_quantity: total, remaining_quantity: total }));
    }
    if (error) return setErr(error.message);
    setF(EMPTY);
    load();
  }

  async function remove(id) {
    if (!confirm('Delete this tier?')) return;
    const { error } = await supabase.from('ticket_tiers').delete().eq('id', id);
    if (error) return setErr('Cannot delete a tier that already has bookings.');
    load();
  }

  return (
    <div className="card" style={{ marginTop: '1rem', maxWidth: 640 }}>
      <h2>Ticket tiers</h2>
      {err && <div className="error">{err}</div>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Price</th><th>Total</th><th>Left</th><th /></tr></thead>
          <tbody>
            {tiers.map((t) => (
              <tr key={t.id}>
                <td>{t.name}</td><td>{money(t.price)}</td><td>{t.total_quantity}</td><td>{t.remaining_quantity}</td>
                <td className="row">
                  <button className="secondary small" onClick={() => setF({ id: t.id, name: t.name, price: t.price, total_quantity: t.total_quantity })}>Edit</button>
                  <button className="danger small" onClick={() => remove(t.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={{ marginTop: '1rem' }}>{f.id ? 'Edit tier' : 'Add tier'}</h3>
      <div className="row">
        <input style={{ flex: 2 }} placeholder="Name (VIP)" value={f.name} onChange={set('name')} />
        <input style={{ flex: 1 }} type="number" placeholder="Price" value={f.price} onChange={set('price')} />
        <input style={{ flex: 1 }} type="number" placeholder="Quantity" value={f.total_quantity} onChange={set('total_quantity')} />
      </div>
      <div className="row" style={{ marginTop: '.5rem' }}>
        <button onClick={save}>{f.id ? 'Update' : 'Add'}</button>
        {f.id && <button className="secondary" onClick={() => setF(EMPTY)}>Cancel</button>}
      </div>
    </div>
  );
}