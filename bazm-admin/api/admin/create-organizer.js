import { admin } from '../_lib/clients.js';
import { requireMaster } from '../_lib/http.js';

// body: { name, email, password, eventIds: [uuid] }
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const ctx = await requireMaster(req, res);
  if (!ctx) return;

  const { name, email, password, eventIds = [] } = req.body || {};
  if (!name || !email || !password || password.length < 8) {
    return res.status(400).json({ error: 'Name, email and a password (8+ chars) are required' });
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: String(email).trim().toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (error) return res.status(400).json({ error: error.message });

  const userId = data.user.id; // profile row is created by the DB trigger

  if (eventIds.length) {
    const { error: aErr } = await admin
      .from('event_assignments')
      .insert(eventIds.map((event_id) => ({ user_id: userId, event_id })));
    if (aErr) return res.status(500).json({ error: 'User created but assignment failed: ' + aErr.message });
  }

  await admin.from('audit_log').insert({
    user_id: ctx.user.id,
    action: 'user.create_organizer',
    target_type: 'user',
    target_id: userId,
    meta: { email, eventIds },
  });

  return res.status(200).json({ id: userId });
}