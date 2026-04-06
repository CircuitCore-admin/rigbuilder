import { Routes, Route } from 'react-router-dom';
import { LoginPage } from './pages/Login/LoginPage';
import { RegisterPage } from './pages/Register/RegisterPage';
import { AdminDashboard } from './pages/Admin/AdminDashboard';
import { RigBuilderPage } from './pages/RigBuilder/RigBuilderPage';
import { ProtectedRoute } from './components/ProtectedRoute/ProtectedRoute';

/**
 * Root application shell.
 * Defines all page routes and their auth/role guards.
 */
export function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Admin routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole="ADMIN">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* Configurator home */}
      <Route path="/" element={<RigBuilderPage />} />

      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
      <h1 style={{ fontFamily: 'Space Grotesk', fontSize: 48 }}>404</h1>
    </div>
  );
}
