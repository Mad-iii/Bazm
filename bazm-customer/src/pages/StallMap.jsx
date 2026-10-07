import StallNode from '../components/StallNode';

export default function StallMap({ event, stalls, onSelect }) {
  return (
    <div>
      <div className="legend" style={{ marginBottom: '.5rem' }}>
        <span><i style={{ background: '#bbf7d0' }} /> Available</span>
        <span><i style={{ background: '#fde68a' }} /> Held</span>
        <span><i style={{ background: '#fecaca' }} /> Booked</span>
        <span><i style={{ background: '#e5e7eb' }} /> Blocked</span>
      </div>
      <div className="map-wrap">
        <svg viewBox={`0 0 ${event.map_width} ${event.map_height}`}>
          {stalls.map((s) => (
            <StallNode key={s.id} stall={s} disabled={s.status !== 'available'} onClick={onSelect} />
          ))}
        </svg>
      </div>
    </div>
  );
}