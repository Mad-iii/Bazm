import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { api } from '../services/api';
import { fmtDate, money } from '../lib/format';
import TicketTierCard from '../components/TicketTierCard';
import BookingForm from '../components/BookingForm';
import StallMap from './StallMap';
import Waitlist from './Waitlist';

const DEFAULT_POLICY = 'Payments are verified manually. Refunds and cancellations are at the organizer\'s discretion.';

export default function EventDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [event, setEvent] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [stalls, setStalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState(null);
  const [wait, setWait] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    const { data: ev } = await supabase
      .from('events').select('*').eq('id', id).eq('status', 'published').maybeSingle();
    setEvent(ev);
    if (ev?.type === 'ticketed') {
      const { data } = await supabase.from('ticket_tiers').select('*').eq('event_id', id).order('price');
      setTiers(data || []);
    } else if (ev) {
      const { data } = await supabase.from('stalls').select('*').eq('event_id', id);
      setStalls(data || []);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // live stock / stall status
  useEffect(() => {
    if (!event) return;
    const isStall = event.type === 'stall';
    const setter = isStall ? setStalls : setTiers;
    const ch = supabase
      .channel(`live-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: isStall ? 'stalls' : 'ticket_tiers', filter: `event_id=eq.${id}` },
        (p) =>
          setter((cur) =>
            p.eventType === 'DELETE'
              ? cur.filter((r) => r.id !== p.old.id)
              : cur.some((r) => r.id === p.new.id)
              ? cur.map((r) => (r.id === p.new.id ? p.new : r))
              : [...cur, p.new]
          )
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [event, id]);

  async function submit(form) {
    setBusy(true);
    setErr('');
    try {
      const payload =
        sel.type === 'stall'
          ? { type: 'stall', eventId: id, stallId: sel.stall.id, ...form }
          : { type: 'ticket', eventId: id, tierId: sel.tier.id, quantity: sel.quantity, ...form };
      const order = await api.checkout(payload);
      sessionStorage.setItem('lastOrder', JSON.stringify(order));
      nav('/checkout', { state: { order } });
    } catch (e) {
      setErr(e.message);
      if (e.code === 'SOLD_OUT' || e.code === 'STALL_UNAVAILABLE') await load();
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p>Loading…</p>;
  if (!event) return <p>Event not found.</p>;

  const noStallsLeft = event.type === 'stall' && stalls.length > 0 && !stalls.some((s) => s.status === 'available');

  return (
    <>
      {event.banner_url && (
        <img src={event.banner_url} alt="" style={{ width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: 12 }} />
      )}
      <h1>{event.name}</h1>
      <p className="muted">{fmtDate(event.starts_at)} · {event.venue}</p>
      <p style={{ whiteSpace: 'pre-wrap' }}>{event.description}</p>

      {event.type === 'ticketed' ? (
        <div className="grid">
          {tiers.map((t) => (
            <TicketTierCard
              key={t.id}
              tier={t}
              onBuy={(tier, quantity) => { setErr(''); setSel({ type: 'ticket', tier, quantity }); }}
              onWaitlist={(tier) => setWait({ tierId: tier.id })}
            />
          ))}
          {!tiers.length && <p className="muted">Tickets not on sale yet.</p>}
        </div>
      ) : (
        <>
          <StallMap event={event} stalls={stalls} onSelect={(stall) => { setErr(''); setSel({ type: 'stall', stall }); }} />
          {noStallsLeft && (
            <p><button className="secondary" onClick={() => setWait({ tierId: null })}>All stalls taken. Join waitlist</button></p>
          )}
        </>
      )}

      {sel && (
        <div className="modal-bg" onClick={() => setSel(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            {sel.type === 'stall' ? (
              <>
                <h2>Stall {sel.stall.label}</h2>
                <p className="muted">
                  {[sel.stall.size_label, sel.stall.category].filter(Boolean).join(' · ') || 'Standard stall'}
                </p>
                <p><strong>{money(sel.stall.price)}</strong></p>
              </>
            ) : (
              <>
                <h2>{sel.quantity} × {sel.tier.name}</h2>
                <p><strong>{money(sel.tier.price * sel.quantity)}</strong></p>
              </>
            )}
            <p className="muted" style={{ fontSize: '.8rem' }}>
              Cancellation policy: {event.cancellation_policy || DEFAULT_POLICY}
            </p>
            {err && <div className="error">{err}</div>}
            <BookingForm showCompany={sel.type === 'stall'} busy={busy} onSubmit={submit} />
            <button className="secondary" style={{ marginTop: '.5rem' }} onClick={() => setSel(null)}>Cancel</button>
          </div>
        </div>
      )}

      {wait && <Waitlist eventId={id} tierId={wait.tierId} onClose={() => setWait(null)} />}
    </>
  );
}