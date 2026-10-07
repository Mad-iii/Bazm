import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toLocalInput } from '../lib/format';
import TicketTierForm from './TicketTierForm';
import StallMapBuilder from './StallMapBuilder';

const EMPTY = {
  name: '', description: '', starts_at: '', venue: '', banner_url: '',
  type: 'ticketed', status: 'draft', order_prefix: '', whatsapp_number: '',
  cancellation_policy: '', map_width: 1000, map_height: 600,
};

export default function EventForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const { profile } = useAuth();
  const [f, setF] = useState(EMPTY);
  const [loading, setLoading] = useState(!!id);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const isMaster = profile.role === 'master';

  useEffect(() => {
    if (!id) return;
    supabase.from('events').select('*').eq('id', id).single().then(({ data }) => {
      if (data) setF({ ...data, starts_at: toLocalInput(data.starts_at) });
      setLoading(false);
    });
  }, [id]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function uploadBanner(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const path = `${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
    const { error } = await supabase.storage.from('banners').upload(path, file);
    if (error) return setErr(error.message);
    const { data } = supabase.storage.from('banners').getPublicUrl(path);
    setF((cur) => ({ ...cur, banner_url: data.publicUrl }));
  }

  async function save() {
    setBusy(true); setErr(''); setMsg('');
    const base = {
      name: f.name,
      description: f.description,
      starts_at: f.starts_at ? new Date(f.starts_at).toISOString() : null,
      venue: f.venue,
      banner_url: f.banner_url,
      status: f.status,
      whatsapp_number: f.whatsapp_number,
      cancellation_policy: f.cancellation_policy,
      map_width: Number(f.map_width) || 1000,
      map_height: Number(f.map_height) || 600,
    };

    if (!id) {
      const prefix = f.order_prefix.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (!prefix) { setBusy(false); return setErr('Order prefix is required (e.g. EXP2026)'); }
      const { data, error } = await supabase
        .from('events')
        .insert({ ...base, type: f.type, order_prefix: prefix, created_by: profile.id })
        .select().single();
      setBusy(false);
      if (error) return setErr(error.message);
      nav(`/admin/events/${data.id}`, { replace: true });
    } else {
      const { data, error } = await supabase.from('events').update(base).eq('id', id).select();
      setBusy(false);
      if (error) return setErr(error.message);
      if (!data.length) return setErr('You do not have permission to edit this event.');
      setMsg('Saved');
    }
  }

  async function remove() {
    if (!confirm('Delete this event and ALL its tiers, stalls and bookings?')) return;
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) return setErr(error.message);
    nav('/admin', { replace: true });
  }

  if (loading) return <p>Loading…</p>;

  return (
    <>
      <h1>{id ? 'Edit event' : 'New event'}</h1>
      {err && <div className="error">{err}</div>}
      {msg && <div className="info">{msg}</div>}

      <div className="card" style={{ maxWidth: 640 }}>
        <label>Name</label><input value={f.name} onChange={set('name')} />
        <label>Description</label><textarea rows="4" value={f.description || ''} onChange={set('description')} />
        <label>Date &amp; time</label><input type="datetime-local" value={f.starts_at} onChange={set('starts_at')} />
        <label>Venue</label><input value={f.venue || ''} onChange={set('venue')} />

        <label>Type</label>
        <select value={f.type} onChange={set('type')} disabled={!!id}>
          <option value="ticketed">Ticketed event</option>
          <option value="stall">Stall-based expo</option>
        </select>

        <label>Order ID prefix</label>
        <input value={f.order_prefix} onChange={set('order_prefix')} disabled={!!id} placeholder="EXP2026" />

        <label>Status</label>
        <select value={f.status} onChange={set('status')}>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="closed">Closed</option>
        </select>

        <label>WhatsApp number for payments</label>
        <input value={f.whatsapp_number || ''} onChange={set('whatsapp_number')} placeholder="03001234567" />

        <label>Cancellation / refund policy</label>
        <textarea rows="3" value={f.cancellation_policy || ''} onChange={set('cancellation_policy')} />

        {f.type === 'stall' && (
          <div className="row">
            <div style={{ flex: 1 }}><label>Map width</label><input type="number" value={f.map_width} onChange={set('map_width')} /></div>
            <div style={{ flex: 1 }}><label>Map height</label><input type="number" value={f.map_height} onChange={set('map_height')} /></div>
          </div>
        )}

        <label>Banner</label>
        <input type="file" accept="image/*" onChange={uploadBanner} />
        {f.banner_url && <img src={f.banner_url} alt="" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', marginTop: 8, borderRadius: 8 }} />}

        <div className="row" style={{ marginTop: '1rem' }}>
          <button disabled={busy || !f.name} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
          {id && isMaster && <button className="danger" onClick={remove}>Delete event</button>}
        </div>
      </div>

      {id && f.type === 'ticketed' && <TicketTierForm eventId={id} />}
      {id && f.type === 'stall' && <StallMapBuilder event={{ ...f, id }} />}
    </>
  );
}