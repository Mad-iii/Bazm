import { admin } from '../_lib/clients.js';
import { requireUser } from '../_lib/http.js';
import { notifyApproved } from '../_lib/email.js';

// body: { ids: [uuid], action: 'payment_received' | 'approve' | 'reject', notes? }
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const ctx = await requireUser(req, res);
  if (!ctx) return;

  const { ids, action, notes } = req.body || {};
  if (!Array.isArray(ids) || !ids.length || ids.length > 100) {
    return res.status(400).json({ error: 'Provide 1-100 booking ids' });
  }
  if (!['payment_received', 'approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }

  const results = [];
  for (const id of ids) {
    // runs as the user, so can_manage_event() inside the function enforces isolation
    const { data: booking, error } = await ctx.client.rpc('review_booking', {
      p_booking_id: id,
      p_action: action,
      p_notes: notes || null,
    });

    if (error) {
      results.push({ id, ok: false, error: error.message });
      continue;
    }

    let notify = null;
    if (action === 'approve') {
      const { data: ev } = await admin.from('events').select('*').eq('id', booking.event_id).single();
      let label;
      if (booking.item_type === 'stall') {
        const { data: s } = await admin.from('stalls').select('label').eq('id', booking.stall_id).single();
        label = `Stall ${s.label}`;
      } else {
        const { data: t } = await admin.from('ticket_tiers').select('name').eq('id', booking.tier_id).single();
        label = `${booking.quantity} x ${t.name}`;
      }
      notify = await notifyApproved(booking, ev, label);
    }
    results.push({ id, ok: true, status: booking.status, notify });
  }

  return res.status(200).json({ results });
}