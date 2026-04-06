import { Routes, Route } from 'react-router-dom';
import { LoginPage } from './pages/Login/LoginPage';
import { RegisterPage } from './pages/Register/RegisterPage';
import { AdminDashboard } from './pages/Admin/AdminDashboard';
import { RigBuilderPage } from './pages/RigBuilder/RigBuilderPage';
import { HomePage } from './pages/Home/HomePage';
import { GuidesPage } from './pages/Guides/GuidesPage';
import { CommunityPage } from './pages/Community/CommunityPage';
import { ProtectedRoute } from './components/ProtectedRoute/ProtectedRoute';
import { CommandPalette } from './components/CommandPalette/CommandPalette';
import { Navbar } from './components/Navbar/Navbar';

/**
 * Root application shell.
 * Defines all page routes and their auth/role guards.
 */
export function App() {
  return (
    <>
      <Navbar />
      <CommandPalette />
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

        {/* Guides */}
        <Route path="/guides" element={<GuidesPage />} />
        <Route path="/guides/:slug" element={<GuidesPage />} />

        {/* Community Forum */}
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/community/:slug" element={<CommunityPage />} />

        {/* Configurator (moved from / to /build) */}
        <Route path="/build" element={<RigBuilderPage />} />

        {/* Landing page */}
        <Route path="/" element={<HomePage />} />

        {/* Catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
      <h1 style={{ fontFamily: 'Space Grotesk', fontSize: 48 }}>404</h1>
    </div>
  );
}
