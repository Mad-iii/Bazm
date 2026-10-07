import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ roles, children }) {
  const { session, profile, loading, signOut } = useAuth();

  if (loading) return <div className="container">Loading…</div>;
  if (!session) return <Navigate to="/login" replace />;
  if (!profile) return <div className="container">Loading…</div>;
  if (profile.status === 'suspended') {
    return (
      <div className="container">
        <div className="error">Your account is suspended. Contact the administrator.</div>
        <button onClick={signOut}>Sign out</button>
      </div>
    );
  }
  if (roles && !roles.includes(profile.role)) return <Navigate to="/admin" replace />;
  return children;
}