import { admin, userClient } from './clients.js';

export function getIp(req) {
  return (
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

export function bearer(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

// returns { user, profile, client } or sends the error response and returns null
export async function requireUser(req, res) {
  const token = bearer(req);
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) {
    res.status(401).json({ error: 'Invalid session' });
    return null;
  }
  const { data: profile } = await admin.from('profiles').select('*').eq('id', data.user.id).single();
  if (!profile || profile.status !== 'active') {
    res.status(403).json({ error: 'Account suspended or missing' });
    return null;
  }
  return { user: data.user, profile, client: userClient(token) };
}

export async function requireMaster(req, res) {
  const ctx = await requireUser(req, res);
  if (!ctx) return null;
  if (ctx.profile.role !== 'master') {
    res.status(403).json({ error: 'Master only' });
    return null;
  }
  return ctx;
}

// DB-backed limiter (serverless has no shared memory). Fails open if the DB call errors.
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

// optional Cloudflare Turnstile; skipped if TURNSTILE_SECRET isn't set
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