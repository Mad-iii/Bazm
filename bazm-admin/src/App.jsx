import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';

import AdminLayout from './admin/AdminLayout';
import MasterDashboard from './admin/MasterDashboard';
import OrganizerDashboard from './admin/OrganizerDashboard';
import EventForm from './admin/EventForm';
import BookingsTable from './admin/BookingsTable';
import UserManagement from './admin/UserManagement';
import AuditLogViewer from './admin/AuditLogViewer';

function AdminHome() {
  const { profile } = useAuth();
  return profile.role === 'master' ? <MasterDashboard /> : <OrganizerDashboard />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminHome />} />
        <Route
          path="events/new"
          element={
            <ProtectedRoute roles={['master']}>
              <EventForm />
            </ProtectedRoute>
          }
        />
        <Route path="events/:id" element={<EventForm />} />
        <Route path="bookings" element={<BookingsTable />} />
        <Route
          path="users"
          element={
            <ProtectedRoute roles={['master']}>
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route path="audit" element={<AuditLogViewer />} />
      </Route>

      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}