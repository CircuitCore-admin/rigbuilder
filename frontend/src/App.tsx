import { Routes, Route } from 'react-router-dom';
import { LoginPage } from './pages/Login/LoginPage';
import { RegisterPage } from './pages/Register/RegisterPage';
import { AdminDashboard } from './pages/Admin/AdminDashboard';
import { RigBuilderPage } from './pages/RigBuilder/RigBuilderPage';
import { SharedBuildPage } from './pages/SharedBuild/SharedBuildPage';
import { HomePage } from './pages/Home/HomePage';
import { ProductDetailPage } from './pages/ProductDetail/ProductDetailPage';
import { GuidesPage } from './pages/Guides/GuidesPage';
import { CommunityPage } from './pages/Community/CommunityPage';
import { LeaderboardPage } from './pages/Leaderboard/LeaderboardPage';
import { MarketplacePage } from './pages/Marketplace/MarketplacePage';
import { MarketplaceMessages } from './pages/Marketplace/MarketplaceMessages';
import { NotificationsPage } from './pages/Notifications/NotificationsPage';
import { ProfilePage } from './pages/Profile/ProfilePage';
import { SettingsPage } from './pages/Settings/SettingsPage';
import { VerifyEmailPage } from './pages/VerifyEmail/VerifyEmailPage';
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
      <div className="appContent">
        <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />

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

        {/* Leaderboards */}
        <Route path="/leaderboards" element={<LeaderboardPage />} />

        {/* Marketplace */}
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/messages" element={<MarketplaceMessages />} />
        <Route path="/messages/:conversationId" element={<MarketplaceMessages />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/marketplace/:id" element={<MarketplacePage />} />

        {/* Profile */}
        <Route path="/profile/:username" element={<ProfilePage />} />

        {/* Settings */}
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

        {/* Configurator (moved from / to /build) */}
        <Route path="/build" element={<RigBuilderPage />} />

        {/* Shared build permalink — fetches from API and renders configurator inline */}
        <Route path="/list/:buildId" element={<SharedBuildPage />} />

        {/* Product detail */}
        <Route path="/products/:slug" element={<ProductDetailPage />} />

        {/* Landing page */}
        <Route path="/" element={<HomePage />} />

        {/* Catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      </div>
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
