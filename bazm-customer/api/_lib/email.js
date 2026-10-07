import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.MAIL_FROM;

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export async function sendWaitlistEmail(entry, eventName, itemName) {
  return resend.emails.send({
    from: FROM,
    to: entry.email,
    subject: `Spot available: ${eventName}`,
    html: `<p>Hi ${esc(entry.name)}, ${esc(itemName)} for <b>${esc(eventName)}</b> is available again.
           Book now before it's gone: <a href="${process.env.APP_URL}/events/${entry.event_id}">${process.env.APP_URL}/events/${entry.event_id}</a></p>`,
  });
}