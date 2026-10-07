import { admin } from '../_lib/clients.js';
import { rateLimit } from '../_lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!(await rateLimit(req, res, 'waitlist', 5, 600))) return;

  const { eventId, tierId, name, email, phone } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!eventId || !String(name || '').trim() || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
    return res.status(400).json({ error: 'Name and a valid email are required' });
  }

  const { data: ev } = await admin
    .from('events').select('id').eq('id', eventId).eq('status', 'published').maybeSingle();
  if (!ev) return res.status(404).json({ error: 'Event not found' });

  let q = admin.from('waitlist').select('id')
    .eq('event_id', eventId).eq('email', cleanEmail).eq('notified', false);
  q = tierId ? q.eq('tier_id', tierId) : q.is('tier_id', null);
  const { data: existing } = await q.limit(1);
  if (existing?.length) return res.status(200).json({ ok: true, already: true });

  const { error } = await admin.from('waitlist').insert({
    event_id: eventId,
    tier_id: tierId || null,
    name: String(name).trim(),
    email: cleanEmail,
    phone: phone || null,
  });
  if (error) return res.status(500).json({ error: 'Could not join waitlist' });
  return res.status(200).json({ ok: true });
}