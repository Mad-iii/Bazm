import { admin } from './clients.js';
import { sendWaitlistEmail } from './email.js';

// Notifies as many people as there are free spots, first come first served.
export async function notifyWaitlist() {
  let sent = 0;

  // ticket tiers
  const { data: tiers } = await admin
    .from('ticket_tiers')
    .select('id, name, remaining_quantity, events!inner(name, status)')
    .gt('remaining_quantity', 0)
    .eq('events.status', 'published');

  for (const t of tiers || []) {
    const { data: entries } = await admin
      .from('waitlist').select('*')
      .eq('tier_id', t.id).eq('notified', false)
      .order('created_at').limit(t.remaining_quantity);
    for (const w of entries || []) {
      await sendWaitlistEmail(w, t.events.name, t.name).catch(() => {});
      await admin.from('waitlist').update({ notified: true }).eq('id', w.id);
      sent++;
    }
  }

  // stall events (waitlist rows with no tier)
  const { data: free } = await admin.from('stalls').select('event_id').eq('status', 'available');
  const counts = {};
  (free || []).forEach((s) => (counts[s.event_id] = (counts[s.event_id] || 0) + 1));

  for (const [eventId, n] of Object.entries(counts)) {
    const { data: ev } = await admin.from('events').select('name, status').eq('id', eventId).single();
    if (ev?.status !== 'published') continue;
    const { data: entries } = await admin
      .from('waitlist').select('*')
      .eq('event_id', eventId).is('tier_id', null).eq('notified', false)
      .order('created_at').limit(n);
    for (const w of entries || []) {
      await sendWaitlistEmail(w, ev.name, 'A stall').catch(() => {});
      await admin.from('waitlist').update({ notified: true }).eq('id', w.id);
      sent++;
    }
  }
  return sent;
}