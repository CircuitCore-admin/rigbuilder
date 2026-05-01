import { NavLink, useLocation } from 'react-router-dom';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../Toast/Toast';
import { api } from '../../utils/api';
import styles from './Navbar.module.scss';

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getNotificationLink(n: { source: string; type: string; threadId?: string | null; listingId?: string | null }): string {
  if (n.source === 'forum') {
    return n.threadId ? `/community/${n.threadId}` : '/community';
  }
  if (n.type === 'NEW_MESSAGE') return '/messages';
  if (n.listingId) return `/marketplace/${n.listingId}`;
  return '/marketplace';
}

interface NavNotification {
  id: string;
  source: 'forum' | 'marketplace';
  type: string;
  message: string;
  read: boolean;
  threadId: string | null;
  listingId: string | null;
  createdAt: string;
}

/**
 * Global navigation bar — sticky "frosted glass" top bar on desktop,
 * bottom tab bar on mobile.
 *
 * "Build" uses --accent-primary (green / tool-like) to signal designing,
 * while "Marketplace" uses --accent-secondary (purple / shop-like) to signal shopping.
 */
export function Navbar() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [notifications, setNotifications] = useState<NavNotification[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
      setDropdownOpen(false);
    }
  }, []);

  useEffect(() => {
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen, handleClickOutside]);

  // Poll for unread counts (notifications + messages) via unified endpoint
  useEffect(() => {
    if (!user) return;
    const fetchCounts = () => {
      api<{ notifications: number; messages: number }>('/notifications/unread-count')
        .then(data => {
          setUnreadNotifs(data.notifications);
          setUnreadMessages(data.messages);
        })
        .catch(() => {});
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 15000);
    return () => clearInterval(interval);
  }, [user]);

  // Close notification dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpenNotifs = () => {
    const opening = !showNotifDropdown;
    setShowNotifDropdown(opening);
    if (opening) {
      api<{ items: NavNotification[] }>('/notifications?limit=10')
        .then(data => setNotifications(Array.isArray(data.items) ? data.items : []))
        .catch(() => setNotifications([]));
    }
  };

  const handleMarkAllRead = () => {
    api('/notifications/read', { method: 'PUT', body: { all: true } }).catch(() => {});
    setUnreadNotifs(0);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <>
      <a href="#main-content" className={styles.skipLink}>Skip to content</a>
      {/* Email verification banner */}
      {user && user.emailVerified === false && (
        <div className={styles.verifyBanner}>
          <span>Please verify your email to access all features.</span>
          <button
            className={styles.resendBtn}
            onClick={async () => {
              try {
                await api('/auth/resend-verification', { method: 'POST' });
                showToast('Verification email sent!', 'success');
              } catch { showToast('Failed to send', 'error'); }
            }}
          >
            Resend Email
          </button>
        </div>
      )}

      {/* ── Desktop / Tablet top bar ── */}
      <header className={styles.topBar}>
        <div className={styles.inner}>
          {/* Logo */}
          <NavLink to="/" className={styles.logo} aria-label="RigBuilder home">
            Rig<span>Builder</span>
          </NavLink>

          {/* Primary links */}
          <nav className={styles.primaryNav} aria-label="Main navigation">
            <NavLink
              to="/build"
              className={({ isActive }) =>
                `${styles.navLink} ${styles.buildLink} ${isActive ? styles.active : ''}`
              }
            >
              <svg className={styles.navIcon} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M2 12.5l3-3 2 2 4-4 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="1.5" y="1.5" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.4" />
              </svg>
              Build
            </NavLink>

            <NavLink
              to="/marketplace"
              className={({ isActive }) =>
                `${styles.navLink} ${styles.marketplaceLink} ${isActive ? styles.active : ''}`
              }
            >
              <svg className={styles.navIcon} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M1 5h14v8.5a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 011 13.5V5z" stroke="currentColor" strokeWidth="1.4" />
                <path d="M4 5V3.5A2.5 2.5 0 016.5 1h3A2.5 2.5 0 0112 3.5V5" stroke="currentColor" strokeWidth="1.4" />
              </svg>
              Marketplace
            </NavLink>

            <NavLink
              to="/builds"
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.active : ''}`
              }
            >
              Builds
            </NavLink>

            <NavLink
              to="/compare"
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.active : ''}`
              }
            >
              Compare
            </NavLink>

            <NavLink
              to="/community"
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.active : ''}`
              }
            >
              Community
            </NavLink>

            <NavLink
              to="/blog"
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.active : ''}`
              }
            >
              News
            </NavLink>
          </nav>

          {/* Secondary (right) */}
          <div className={styles.secondaryNav}>
            <button type="button" className={styles.searchBtn} aria-label="Search" onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M12 12l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>

            {user && (
              <div className={styles.navActions}>
                {/* Messages */}
                <a href="/messages" className={styles.navIconBtn}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                  </svg>
                  {unreadMessages > 0 && (
                    <span className={styles.navBadge}>{unreadMessages > 99 ? '99+' : unreadMessages}</span>
                  )}
                </a>

                {/* Notifications */}
                <div className={styles.notifWrapper} ref={notifRef} role="region" aria-label="Notifications">
                  <button
                    type="button"
                    className={styles.navIconBtn}
                    onClick={handleOpenNotifs}
                    aria-expanded={showNotifDropdown}
                    aria-label={unreadNotifs > 0 ? `Notifications, ${unreadNotifs} unread` : 'Notifications'}
                    aria-haspopup="true"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                      <path d="M13.73 21a2 2 0 01-3.46 0"/>
                    </svg>
                    {unreadNotifs > 0 && (
                      <span className={styles.navBadge}>{unreadNotifs > 99 ? '99+' : unreadNotifs}</span>
                    )}
                  </button>

                  {showNotifDropdown && (
                    <div className={styles.notifDropdown} role="menu" aria-label="Notifications">
                      <div className={styles.notifDropdownHeader}>
                        <h3>Notifications</h3>
                        {unreadNotifs > 0 && (
                          <button type="button" className={styles.markAllRead} onClick={handleMarkAllRead}>Mark all read</button>
                        )}
                      </div>
                      <div className={styles.notifDropdownList}>
                        {notifications.length === 0 ? (
                          <div className={styles.notifEmpty}>No notifications</div>
                        ) : (
                          notifications.map(n => (
                            <a
                              key={n.id}
                              href={getNotificationLink(n)}
                              role="menuitem"
                              className={`${styles.notifItem} ${!n.read ? styles.notifItemUnread : ''}`}
                              onClick={() => {
                                api('/notifications/read', { method: 'PUT', body: { ids: [n.id], source: n.source } }).catch(() => {});
                                setShowNotifDropdown(false);
                              }}
                            >
                              <div className={styles.notifMessage}>{n.message}</div>
                              <div className={styles.notifTime}>{relativeTime(n.createdAt)}</div>
                            </a>
                          ))
                        )}
                      </div>
                      <a href="/notifications" className={styles.notifViewAll} onClick={() => setShowNotifDropdown(false)}>View all notifications</a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {user ? (
              <div className={styles.userDropdownWrapper} ref={dropdownRef}>
                <button
                  type="button"
                  className={styles.userDropdownTrigger}
                  onClick={() => setDropdownOpen(prev => !prev)}
                >
                  <span className={styles.username}>{user.username}</span>
                  <svg width="12" height="12" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="M6 8L10 12L14 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {dropdownOpen && (
                  <div className={styles.userDropdown}>
                    <a href={`/profile/${user.username}`} className={styles.userDropdownItem} onClick={() => setDropdownOpen(false)}>
                      My Profile
                    </a>
                    <a href="/settings" className={styles.userDropdownItem} onClick={() => setDropdownOpen(false)}>
                      Settings
                    </a>
                    <button
                      type="button"
                      className={styles.userDropdownItem}
                      onClick={() => { setDropdownOpen(false); void logout(); }}
                    >
                      Log Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.authGroup}>
                <NavLink to="/login" className={styles.btnGhost}>Sign In</NavLink>
                <NavLink to="/register" className={styles.btnJoin}>Join</NavLink>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Mobile bottom tab bar ── */}
      <nav className={styles.mobileBar} aria-label="Mobile navigation">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `${styles.tab} ${isActive ? styles.tabActive : ''}`}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M3 8l7-5 7 5v8a1 1 0 01-1 1H4a1 1 0 01-1-1V8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
          <span>Home</span>
        </NavLink>

        <NavLink
          to="/build"
          className={({ isActive }) => `${styles.tab} ${styles.tabBuild} ${isActive ? styles.tabActive : ''}`}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M2 14.5l4-4 3 3 5-5 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Build</span>
        </NavLink>

        <NavLink
          to="/marketplace"
          className={({ isActive }) => `${styles.tab} ${styles.tabMarketplace} ${isActive ? styles.tabActive : ''}`}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M2 7h16v9a2 2 0 01-2 2H4a2 2 0 01-2-2V7z" stroke="currentColor" strokeWidth="1.5" />
            <path d="M6 7V5a4 4 0 018 0v2" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <span>Shop</span>
        </NavLink>

        <NavLink
          to="/community"
          className={({ isActive }) => `${styles.tab} ${styles.tabCommunity} ${isActive ? styles.tabActive : ''}`}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="7" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="14" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M1 17c0-3 2.5-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span>Community</span>
        </NavLink>

        <NavLink
          to={user ? `/profile/${user.username}` : '/login'}
          className={({ isActive }) => `${styles.tab} ${isActive ? styles.tabActive : ''}`}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="10" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
            <path d="M2 18c0-3.5 3.5-6 8-6s8 2.5 8 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span>{user ? 'Account' : 'Sign In'}</span>
        </NavLink>
      </nav>
    </>
  );
}

export default Navbar;
