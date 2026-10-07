import { Resend } from 'resend';
import { qrBuffer } from './qr.js';
import { sendWhatsApp } from './whatsapp.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.MAIL_FROM;

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export async function notifyApproved(booking, event, itemLabel) {
  const isTicket = booking.item_type === 'ticket';
  const when = event.starts_at ? new Date(event.starts_at).toLocaleString('en-PK') : 'TBA';
  const attachments = [];
  let qrHtml = '';

  if (isTicket) {
    const png = await qrBuffer(`${booking.order_id}|${booking.qr_token}`);
    attachments.push({ filename: `ticket-${booking.order_id}.png`, content: png, contentId: 'ticketqr' });
    qrHtml = `<p><img src="cid:ticketqr" width="220" height="220" alt="QR ticket" /></p>
              <p style="color:#666">Show this QR code at the entrance.</p>`;
  }

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
      <h2>Booking confirmed ✅</h2>
      <p>Hi ${esc(booking.buyer_name)}, your payment is verified.</p>
      <table cellpadding="6">
        <tr><td><b>Order ID</b></td><td>${esc(booking.order_id)}</td></tr>
        <tr><td><b>Event</b></td><td>${esc(event.name)}</td></tr>
        <tr><td><b>${isTicket ? 'Tickets' : 'Stall'}</b></td><td>${esc(itemLabel)}</td></tr>
        <tr><td><b>Date</b></td><td>${esc(when)}</td></tr>
        <tr><td><b>Venue</b></td><td>${esc(event.venue || 'TBA')}</td></tr>
        <tr><td><b>Total paid</b></td><td>PKR ${Number(booking.total_price).toLocaleString()}</td></tr>
      </table>
      ${qrHtml}
    </div>`;

  const out = {};
  try {
    const r = await resend.emails.send({
      from: FROM,
      to: booking.buyer_email,
      subject: `Confirmed: ${event.name} (${booking.order_id})`,
      html,
      attachments,
    });
    out.email = r.error ? { ok: false, error: r.error.message } : { ok: true };
  } catch (e) {
    out.email = { ok: false, error: e.message };
  }

  out.whatsapp = await sendWhatsApp(
    booking.buyer_phone,
    `✅ Booking confirmed\nOrder: ${booking.order_id}\n${event.name}\n${itemLabel}\nWe've emailed your ${isTicket ? 'QR ticket' : 'confirmation'}.`
  );
  return out;
}

export async function sendWaitlistEmail(entry, eventName, itemName) {
  return resend.emails.send({
    from: FROM,
    to: entry.email,
    subject: `Spot available: ${eventName}`,
    html: `<p>Hi ${esc(entry.name)}, ${esc(itemName)} for <b>${esc(eventName)}</b> is available again.
           Book now before it's gone: <a href="${process.env.APP_URL}/events/${entry.event_id}">${process.env.APP_URL}/events/${entry.event_id}</a></p>`,
  });
}