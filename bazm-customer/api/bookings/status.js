import { admin } from '../_lib/clients.js';
import { rateLimit } from '../_lib/http.js';

// Requires Order ID + email, so people can't enumerate other buyers' orders.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!(await rateLimit(req, res, 'status', 20, 60))) return;

  const orderId = String(req.query.orderId || '').trim().toUpperCase();
  const email = String(req.query.email || '').trim().toLowerCase();
  if (!orderId || !email) return res.status(400).json({ error: 'Order ID and email are required' });

  const { data, error } = await admin
    .from('bookings')
    .select('order_id, status, item_type, quantity, total_price, hold_expires_at, created_at, events(name, starts_at, venue), ticket_tiers(name), stalls(label)')
    .eq('order_id', orderId)
    .eq('buyer_email', email)
    .maybeSingle();

  if (error) return res.status(500).json({ error: 'Lookup failed' });
  if (!data) return res.status(404).json({ error: 'No order found with those details' });

  return res.status(200).json({
    orderId: data.order_id,
    status: data.status,
    event: data.events,
    item: data.item_type === 'stall' ? `Stall ${data.stalls?.label}` : `${data.quantity} x ${data.ticket_tiers?.name}`,
    totalPrice: data.total_price,
    holdExpiresAt: data.hold_expires_at,
    createdAt: data.created_at,
  });
}