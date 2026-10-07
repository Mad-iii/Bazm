import { admin } from '../_lib/clients.js';
import { requireMaster } from '../_lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const ctx = await requireMaster(req, res);
  if (!ctx) return;

  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId required' });
  if (userId === ctx.user.id) return res.status(400).json({ error: "You can't delete yourself" });

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return res.status(400).json({ error: error.message });

  await admin.from('audit_log').insert({
    user_id: ctx.user.id,
    action: 'user.delete',
    target_type: 'user',
    target_id: userId,
  });
  return res.status(200).json({ ok: true });
}