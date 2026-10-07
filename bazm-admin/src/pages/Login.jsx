import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { session, signIn } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (session) nav('/admin', { replace: true }); }, [session, nav]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await signIn(email, password);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" style={{ maxWidth: 380, margin: '2rem auto' }} onSubmit={submit}>
      <h1>Sign in</h1>
      {err && <div className="error">{err}</div>}
      <label>Email</label>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <label>Password</label>
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <p><button disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button></p>
    </form>
  );
}