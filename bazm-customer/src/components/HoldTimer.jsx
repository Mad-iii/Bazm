import { useEffect, useState } from 'react';

export default function HoldTimer({ expiresAt, onExpire }) {
  const calc = () => Math.max(0, new Date(expiresAt) - Date.now());
  const [left, setLeft] = useState(calc);

  useEffect(() => {
    const t = setInterval(() => {
      const l = Math.max(0, new Date(expiresAt) - Date.now());
      setLeft(l);
      if (l === 0) {
        clearInterval(t);
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [expiresAt, onExpire]);

  const m = Math.floor(left / 60000);
  const s = Math.floor((left % 60000) / 1000);
  return (
    <span className={'timer' + (left < 120000 ? ' urgent' : '')}>
      {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  );
}