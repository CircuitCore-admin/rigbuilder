import { NavLink, useLocation } from 'react-router-dom';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../utils/api';
import styles from './Navbar.module.scss';

/**
 * Global navigation bar — sticky "frosted glass" top bar on desktop,
 * bottom tab bar on mobile.
 *
 * "Build" uses --accent-primary (green / tool-like) to signal designing,
 * while "Marketplace" uses --accent-secondary (purple / shop-like) to signal shopping.
 */
export function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);

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

  // Poll for unread message count
  useEffect(() => {
    if (!user) return;
    const fetchUnread = () => {
      api<{ unreadCount: number }[]>('/marketplace/conversations')
        .then(convos => {
          const total = (Array.isArray(convos) ? convos : []).reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);
          setUnreadMessages(total);
        })
        .catch(() => {});
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <>
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
          </nav>

          {/* Secondary (right) */}
          <div className={styles.secondaryNav}>
            <button type="button" className={styles.searchBtn} aria-label="Search">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M12 12l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>

            {user && (
              <a href="/messages" className={styles.navIconBtn}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
                {unreadMessages > 0 && (
                  <span className={styles.navBadge}>{unreadMessages > 99 ? '99+' : unreadMessages}</span>
                )}
              </a>
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
