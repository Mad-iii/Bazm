import { useState } from 'react';

export default function BookingForm({ showCompany, busy, onSubmit, submitLabel = 'Continue to WhatsApp' }) {
  const [f, setF] = useState({ name: '', company: '', email: '', phone: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  function handle(e) {
    e.preventDefault();
    onSubmit(f);
  }

  return (
    <div>
      <label>Full name</label>
      <input value={f.name} onChange={set('name')} />
      {showCompany && (
        <>
          <label>Company / category</label>
          <input value={f.company} onChange={set('company')} />
        </>
      )}
      <label>Email</label>
      <input type="email" value={f.email} onChange={set('email')} />
      <label>Phone / WhatsApp</label>
      <input type="tel" placeholder="03001234567" value={f.phone} onChange={set('phone')} />
      <div style={{ marginTop: '1rem' }}>
        <button disabled={busy || !f.name || !f.email || !f.phone} onClick={handle}>
          {busy ? 'Reserving…' : submitLabel}
        </button>
      </div>
    </div>
  );
}