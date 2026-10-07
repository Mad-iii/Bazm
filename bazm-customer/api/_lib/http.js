import { admin } from './clients.js';

export function getIp(req) {
  return (
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

export async function rateLimit(req, res, name, max, windowSec) {
  const { data, error } = await admin.rpc('check_rate_limit', {
    p_key: `${name}:${getIp(req)}`,
    p_max: max,
    p_window_seconds: windowSec,
  });
  if (error) return true;
  if (!data) {
    res.status(429).json({ error: 'Too many requests. Please slow down.' });
    return false;
  }
  return true;
}

export async function verifyCaptcha(token, ip) {
  if (!process.env.TURNSTILE_SECRET) return true;
  if (!token) return false;
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET, response: token, remoteip: ip }),
  });
  return (await r.json()).success === true;
}