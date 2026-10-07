import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import StallNode from '../components/StallNode';

export default function StallMapBuilder({ event }) {
  const svgRef = useRef(null);
  const [stalls, setStalls] = useState([]);
  const [sel, setSel] = useState(null);
  const [drag, setDrag] = useState(null);
  const [grid, setGrid] = useState({ rows: 3, cols: 5, prefix: 'A', price: 10000 });
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase.from('stalls').select('*').eq('event_id', event.id).order('label');
    setStalls(data || []);
  }, [event.id]);

  useEffect(() => { load(); }, [load]);

  const selected = stalls.find((s) => s.id === sel);

  const toSvg = (e) => {
    const svg = svgRef.current;
    const p = svg.createSVGPoint();
    p.x = e.clientX; p.y = e.clientY;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  };

  function startDrag(e, s) {
    e.stopPropagation();
    svgRef.current.setPointerCapture(e.pointerId);
    const p = toSvg(e);
    setSel(s.id);
    setDrag({ id: s.id, dx: p.x - s.x, dy: p.y - s.y });
  }

  function onMove(e) {
    if (!drag) return;
    const p = toSvg(e);
    const snap = (v) => Math.max(0, Math.round(v / 10) * 10);
    setStalls((cur) =>
      cur.map((s) => (s.id === drag.id ? { ...s, x: snap(p.x - drag.dx), y: snap(p.y - drag.dy) } : s))
    );
  }

  async function endDrag() {
    if (!drag) return;
    const s = stalls.find((x) => x.id === drag.id);
    setDrag(null);
    await supabase.from('stalls').update({ x: s.x, y: s.y }).eq('id', s.id);
  }

  function nextLabel(prefix = 'S') {
    let n = stalls.length + 1;
    const used = new Set(stalls.map((s) => s.label));
    while (used.has(`${prefix}${n}`)) n++;
    return `${prefix}${n}`;
  }

  async function addStall() {
    setErr('');
    const { data, error } = await supabase
      .from('stalls')
      .insert({ event_id: event.id, label: nextLabel(), price: Number(grid.price) || 0, x: 20, y: 20 })
      .select().single();
    if (error) return setErr(error.message);
    setStalls((c) => [...c, data]);
    setSel(data.id);
  }

  async function generateGrid() {
    setErr('');
    const rows = [];
    const used = new Set(stalls.map((s) => s.label));
    let n = 1;
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        while (used.has(`${grid.prefix}${n}`)) n++;
        rows.push({
          event_id: event.id, label: `${grid.prefix}${n}`, price: Number(grid.price) || 0,
          x: 20 + c * 100, y: 20 + r * 80,
        });
        used.add(`${grid.prefix}${n}`);
      }
    }
    const { error } = await supabase.from('stalls').insert(rows);
    if (error) return setErr(error.message);
    load();
  }

  const edit = (k) => (e) =>
    setStalls((cur) => cur.map((s) => (s.id === sel ? { ...s, [k]: e.target.value } : s)));

  async function saveSelected() {
    setErr(''); setMsg('');
    const s = selected;
    const { error } = await supabase.from('stalls').update({
      label: s.label, price: Number(s.price) || 0, size_label: s.size_label, category: s.category,
      w: Number(s.w) || 80, h: Number(s.h) || 60, status: s.status,
    }).eq('id', s.id);
    if (error) return setErr(error.message);
    setMsg('Stall saved');
  }

  async function removeSelected() {
    if (!confirm(`Delete stall ${selected.label}?`)) return;
    const { error } = await supabase.from('stalls').delete().eq('id', selected.id);
    if (error) return setErr('Cannot delete a stall that has bookings. Mark it blocked instead.');
    setSel(null);
    load();
  }

  const locked = selected && (selected.status === 'held' || selected.status === 'booked');

  return (
    <div className="card" style={{ marginTop: '1rem' }}>
      <h2>Stall map</h2>
      {err && <div className="error">{err}</div>}
      {msg && <div className="info">{msg}</div>}

      <div className="row" style={{ marginBottom: '.5rem' }}>
        <button onClick={addStall}>+ Add stall</button>
        <span className="muted">or generate a grid:</span>
        <input style={{ width: 60 }} type="number" value={grid.rows} onChange={(e) => setGrid({ ...grid, rows: +e.target.value })} title="rows" />
        <span>×</span>
        <input style={{ width: 60 }} type="number" value={grid.cols} onChange={(e) => setGrid({ ...grid, cols: +e.target.value })} title="cols" />
        <input style={{ width: 70 }} value={grid.prefix} onChange={(e) => setGrid({ ...grid, prefix: e.target.value })} title="label prefix" />
        <input style={{ width: 100 }} type="number" value={grid.price} onChange={(e) => setGrid({ ...grid, price: e.target.value })} title="price" />
        <button className="secondary" onClick={generateGrid}>Generate</button>
      </div>
      <p className="muted">Drag stalls to position them. Click one to edit it.</p>

      <div className="map-wrap">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${event.map_width} ${event.map_height}`}
          onPointerMove={onMove}
          onPointerUp={endDrag}
          onClick={() => setSel(null)}
        >
          {stalls.map((s) => (
            <StallNode
              key={s.id}
              stall={s}
              selected={s.id === sel}
              onClick={() => setSel(s.id)}
              onPointerDown={(e) => startDrag(e, s)}
            />
          ))}
        </svg>
      </div>

      {selected && (
        <div style={{ marginTop: '1rem', maxWidth: 480 }}>
          <h3>Stall {selected.label}</h3>
          <div className="row">
            <div style={{ flex: 1 }}><label>Label</label><input value={selected.label} onChange={edit('label')} /></div>
            <div style={{ flex: 1 }}><label>Price</label><input type="number" value={selected.price} onChange={edit('price')} /></div>
          </div>
          <div className="row">
            <div style={{ flex: 1 }}><label>Size label</label><input value={selected.size_label || ''} onChange={edit('size_label')} placeholder="3m × 3m" /></div>
            <div style={{ flex: 1 }}><label>Category</label><input value={selected.category || ''} onChange={edit('category')} /></div>
          </div>
          <div className="row">
            <div style={{ flex: 1 }}><label>Width</label><input type="number" value={selected.w} onChange={edit('w')} /></div>
            <div style={{ flex: 1 }}><label>Height</label><input type="number" value={selected.h} onChange={edit('h')} /></div>
          </div>
          <label>Status</label>
          {locked ? (
            <p className="muted">{selected.status} (managed by bookings)</p>
          ) : (
            <select value={selected.status} onChange={edit('status')}>
              <option value="available">Available</option>
              <option value="blocked">Blocked</option>
            </select>
          )}
          <div className="row" style={{ marginTop: '.8rem' }}>
            <button onClick={saveSelected}>Save stall</button>
            <button className="danger" onClick={removeSelected}>Delete</button>
          </div>
        </div>
      )}
    </div>
  );
}