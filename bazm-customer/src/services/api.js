async function call(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(json.error || 'Request failed'), { code: json.code });
  return json;
}

export const api = {
  checkout: (body) => call('/api/bookings/checkout', { method: 'POST', body }),
  orderStatus: (orderId, email) =>
    call(`/api/bookings/status?orderId=${encodeURIComponent(orderId)}&email=${encodeURIComponent(email)}`),
  joinWaitlist: (body) => call('/api/waitlist/join', { method: 'POST', body }),
};