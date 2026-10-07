import { admin } from '../_lib/clients.js';
import { rateLimit, getIp, verifyCaptcha } from '../_lib/http.js';
import { waLink, sendWhatsApp } from '../_lib/whatsapp.js';

const ERRORS = {
  EVENT_UNAVAILABLE: [404, 'This event is not available'],
  TIER_NOT_FOUND: [404, 'Ticket tier not found'],
  SOLD_OUT: [409, 'Sold out. Join the waitlist.'],
  BAD_QUANTITY: [400, 'Quantity must be between 1 and 10'],
  STALL_NOT_FOUND: [404, 'Stall not found'],
  STALL_UNAVAILABLE: [409, 'Someone just took this stall'],
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!(await rateLimit(req, res, 'checkout', 6, 600))) return;

  const b = req.body || {};
  const name = String(b.name || '').trim();
  const email = String(b.email || '').trim().toLowerCase();
  const phone = String(b.phone || '').trim();

  if (!b.eventId || !name || !/^\S+@\S+\.\S+$/.test(email) || phone.replace(/\D/g, '').length < 10) {
    return res.status(400).json({ error: 'Name, a valid email and phone are required' });
  }
  if (!(await verifyCaptcha(b.captchaToken, getIp(req)))) {
    return res.status(400).json({ error: 'Captcha failed' });
  }

  const holdMinutes = Number(process.env.HOLD_MINUTES || 20);

  const call =
    b.type === 'stall'
      ? admin.rpc('create_stall_booking', {
          p_event_id: b.eventId,
          p_stall_id: b.stallId,
          p_name: name,
          p_company: String(b.company || '').trim(),
          p_email: email,
          p_phone: phone,
          p_hold_minutes: holdMinutes,
        })
      : admin.rpc('create_ticket_booking', {
          p_event_id: b.eventId,
          p_tier_id: b.tierId,
          p_quantity: Number(b.quantity) || 1,
          p_name: name,
          p_email: email,
          p_phone: phone,
          p_hold_minutes: holdMinutes,
        });

  const { data: booking, error } = await call;
  if (error) {
    const code = Object.keys(ERRORS).find((c) => error.message.includes(c));
    if (code) return res.status(ERRORS[code][0]).json({ error: ERRORS[code][1], code });
    console.error(error);
    return res.status(500).json({ error: 'Could not create booking' });
  }

  const { data: ev } = await admin
    .from('events').select('name, whatsapp_number').eq('id', booking.event_id).single();

  let item;
  if (booking.item_type === 'stall') {
    const { data: s } = await admin.from('stalls').select('label').eq('id', booking.stall_id).single();
    item = `Stall ${s.label}`;
  } else {
    const { data: t } = await admin.from('ticket_tiers').select('name').eq('id', booking.tier_id).single();
    item = `${booking.quantity} x ${t.name}`;
  }

  const text =
    `Hi! I'd like to confirm my order.\n` +
    `Order ID: ${booking.order_id}\n` +
    `Event: ${ev.name}\n` +
    `Item: ${item}\n` +
    `Total: PKR ${Number(booking.total_price).toLocaleString()}\n` +
    `I'm sending my payment proof below.`;

  // best-effort automated ack (needs WhatsApp Business API; ignored otherwise)
  sendWhatsApp(phone, `We received your order ${booking.order_id}. Please send your payment proof here.`).catch(() => {});

  return res.status(200).json({
    orderId: booking.order_id,
    item,
    eventName: ev.name,
    totalPrice: booking.total_price,
    holdExpiresAt: booking.hold_expires_at,
    whatsappUrl: waLink(ev.whatsapp_number || process.env.DEFAULT_WHATSAPP, text),
  });
}