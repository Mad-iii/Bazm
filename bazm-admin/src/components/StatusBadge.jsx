const COLORS = {
  pending: '#b45309', payment_received: '#1d4ed8', approved: '#15803d',
  rejected: '#b91c1c', expired: '#6b7280',
  draft: '#6b7280', published: '#15803d', closed: '#b91c1c',
  active: '#15803d', suspended: '#b91c1c',
};

export default function StatusBadge({ status }) {
  return (
    <span className="badge" style={{ background: COLORS[status] || '#6b7280' }}>
      {String(status).replace('_', ' ')}
    </span>
  );
}