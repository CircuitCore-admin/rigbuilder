import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../utils/api';
import styles from './NotificationsPage.module.scss';

interface NotificationItem {
  id: string;
  source: 'forum' | 'marketplace';
  type: string;
  message: string;
  read: boolean;
  threadId: string | null;
  replyId: string | null;
  listingId: string | null;
  createdAt: string;
}

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

function getNotificationLink(n: NotificationItem): string {
  if (n.source === 'forum') {
    return n.threadId ? `/community/${n.threadId}` : '/community';
  }
  if (n.type === 'NEW_MESSAGE') return '/messages';
  if (n.listingId) return `/marketplace/${n.listingId}`;
  return '/marketplace';
}

function getNotificationIcon(n: NotificationItem): string {
  if (n.source === 'forum') {
    if (n.type === 'REPLY') return 'reply';
    if (n.type === 'MENTION') return 'mention';
    if (n.type === 'FOLLOW') return 'follow';
  }
  if (n.type === 'NEW_OFFER') return 'offer';
  if (n.type === 'OFFER_ACCEPTED') return 'accepted';
  if (n.type === 'OFFER_REJECTED') return 'rejected';
  if (n.type === 'NEW_MESSAGE') return 'message';
  if (n.type === 'REVIEW_RECEIVED') return 'review';
  return 'default';
}

export function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const limit = 20;

  const fetchNotifications = useCallback(() => {
    if (!user) return;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filter === 'unread') params.set('unread', 'true');
    api<{ items: NotificationItem[]; total: number }>(`/notifications?${params}`)
      .then(data => {
        setNotifications(Array.isArray(data.items) ? data.items : []);
        setTotal(data.total ?? 0);
      })
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, [user, page, filter]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const handleMarkAllRead = () => {
    api('/notifications/read', { method: 'PUT', body: { all: true } }).catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleMarkRead = (n: NotificationItem) => {
    if (n.read) return;
    api('/notifications/read', { method: 'PUT', body: { ids: [n.id], source: n.source } }).catch(() => {});
    setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item));
  };

  const totalPages = Math.ceil(total / limit);
  const hasUnread = notifications.some(n => !n.read);

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <p>Please sign in to view notifications.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Notifications</h1>
        <div className={styles.headerActions}>
          {hasUnread && (
            <button type="button" className={styles.markAllBtn} onClick={handleMarkAllRead}>
              Mark all as read
            </button>
          )}
        </div>
      </div>

      <div className={styles.filterTabs}>
        <button
          type="button"
          className={`${styles.filterTab} ${filter === 'all' ? styles.filterTabActive : ''}`}
          onClick={() => { setFilter('all'); setPage(1); }}
        >
          All
        </button>
        <button
          type="button"
          className={`${styles.filterTab} ${filter === 'unread' ? styles.filterTabActive : ''}`}
          onClick={() => { setFilter('unread'); setPage(1); }}
        >
          Unread
        </button>
      </div>

      <div className={styles.list}>
        {loading && notifications.length === 0 ? (
          <div className={styles.emptyState}><p>Loading notifications…</p></div>
        ) : notifications.length === 0 ? (
          <div className={styles.emptyState}>
            <p>{filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}</p>
          </div>
        ) : (
          notifications.map(n => (
            <a
              key={n.id}
              href={getNotificationLink(n)}
              className={`${styles.notifRow} ${!n.read ? styles.notifRowUnread : ''}`}
              onClick={() => handleMarkRead(n)}
            >
              <div className={styles.notifIcon} data-type={getNotificationIcon(n)}>
                {n.source === 'forum' ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 01-3.46 0"/>
                  </svg>
                )}
              </div>
              <div className={styles.notifContent}>
                <span className={styles.notifMsg}>{n.message}</span>
                <div className={styles.notifMeta}>
                  <span className={styles.notifSource}>{n.source === 'forum' ? 'Forum' : 'Marketplace'}</span>
                  <span className={styles.notifDot} />
                  <span className={styles.notifDate}>{relativeTime(n.createdAt)}</span>
                </div>
              </div>
              {!n.read && <div className={styles.unreadDot} />}
            </a>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            type="button"
            className={styles.pageBtn}
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </button>
          <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
          <button
            type="button"
            className={styles.pageBtn}
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default NotificationsPage;
