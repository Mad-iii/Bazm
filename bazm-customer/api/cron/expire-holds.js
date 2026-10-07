import { admin } from '../_lib/clients.js';
import { notifyWaitlist } from '../_lib/waitlist.js';

// Vercel Cron sends: Authorization: Bearer <CRON_SECRET>
export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { data: expired } = await admin.rpc('expire_holds');

  await admin
    .from('rate_limits')
    .delete()
    .lt('window_start', new Date(Date.now() - 24 * 3600 * 1000).toISOString());

  const notified = await notifyWaitlist();
  return res.status(200).json({ expired, notified });
}