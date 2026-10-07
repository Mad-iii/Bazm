import { supabase } from '../lib/supabase';

async function call(path, body) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(json.error || 'Request failed'), { code: json.code });
  return json;
}

export const api = {
  review: (ids, action, notes) => call('/api/bookings/review', { ids, action, notes }),
  createOrganizer: (body) => call('/api/admin/create-organizer', body),
  deleteUser: (userId) => call('/api/admin/delete-user', { userId }),
};