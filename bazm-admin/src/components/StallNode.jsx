const FILL = { available: '#bbf7d0', held: '#fde68a', booked: '#fecaca', blocked: '#e5e7eb' };
const STROKE = { available: '#16a34a', held: '#d97706', booked: '#dc2626', blocked: '#9ca3af' };

export default function StallNode({ stall, selected, disabled, onClick, onPointerDown }) {
  const { x, y, w, h, label, status } = stall;
  return (
    <g
      onClick={() => !disabled && onClick?.(stall)}
      onPointerDown={onPointerDown}
      style={{ cursor: onPointerDown ? 'move' : disabled ? 'not-allowed' : 'pointer' }}
    >
      <rect
        x={x} y={y} width={w} height={h} rx="4"
        fill={FILL[status]} stroke={selected ? '#4f46e5' : STROKE[status]} strokeWidth={selected ? 3 : 1}
      />
      <text
        x={x + w / 2} y={y + h / 2} textAnchor="middle" dominantBaseline="middle"
        fontSize="14" fill="#111827" style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {label}
      </text>
    </g>
  );
}