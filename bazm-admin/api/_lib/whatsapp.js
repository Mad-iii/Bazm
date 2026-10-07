// Assumes Pakistan numbers: 0300... becomes 92300...
export function normalizePhone(p) {
  let d = String(p || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0')) d = '92' + d.slice(1);
  return d;
}

export function waLink(number, text) {
  return `https://wa.me/${normalizePhone(number)}?text=${encodeURIComponent(text)}`;
}

// WhatsApp Business Cloud API. Free-form text only delivers inside a 24h customer
// window; outside it you need an approved template message.
export async function sendWhatsApp(to, text) {
  const { WHATSAPP_TOKEN, WHATSAPP_PHONE_ID } = process.env;
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) return { skipped: true };
  try {
    const r = await fetch(`https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: normalizePhone(to),
        type: 'text',
        text: { body: text },
      }),
    });
    return { ok: r.ok };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}