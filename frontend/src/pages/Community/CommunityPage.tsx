import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../utils/api';
import { ForumThread } from '../../components/ForumThread/ForumThread';
import { useAuth } from '../../hooks/useAuth';
import { VerifiedCreatorBadge } from '../../components/VerifiedCreatorBadge/VerifiedCreatorBadge';
import styles from './CommunityPage.module.scss';

interface ThreadListItem {
  id: string;
  title: string;
  slug: string;
  category: string;
  viewCount: number;
  replyCount: number;
  createdAt: string;
  user: { id: string; username: string; avatarUrl: string | null; reputation: number; role?: string };
}

interface PaginatedThreads {
  items: ThreadListItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const FORUM_CATEGORIES = [
  { value: '', label: 'All Topics' },
  { value: 'TROUBLESHOOTING', label: 'Troubleshooting' },
  { value: 'BUILD_ADVICE', label: 'Build Advice' },
  { value: 'DEALS', label: 'Deals' },
  { value: 'GENERAL', label: 'General' },
];

export function CommunityPage() {
  const { slug } = useParams<{ slug: string }>();
  if (slug) return <ForumThread slug={slug} />;
  return <CommunityListView />;
}

function CommunityListView() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [threads, setThreads] = useState<ThreadListItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const category = searchParams.get('category') ?? '';
  const page = parseInt(searchParams.get('page') ?? '1') || 1;

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (category) params.set('category', category);

    api<PaginatedThreads>(`/forum?${params}`)
      .then((data) => { setThreads(data.items); setTotalPages(data.pagination.totalPages); })
      .catch(() => setThreads([]))
      .finally(() => setLoading(false));
  }, [category, page]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Community</h1>
          <p className={styles.subtitle}>Discuss hardware, share advice, and find deals</p>
        </div>
        {user && <a href="/community/new" className={styles.newThread}>+ New Thread</a>}
      </header>

      <div className={styles.filters}>
        {FORUM_CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            className={`${styles.filterBtn} ${category === cat.value ? styles.active : ''}`}
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              if (cat.value) next.set('category', cat.value); else next.delete('category');
              next.set('page', '1');
              setSearchParams(next);
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.loadingState}>Loading discussions…</div>
      ) : threads.length === 0 ? (
        <div className={styles.emptyState}>No discussions found</div>
      ) : (
        <div className={styles.threadList}>
          {threads.map((thread) => (
            <a key={thread.id} href={`/community/${thread.slug}`} className={styles.threadRow}>
              <div className={styles.threadInfo}>
                <span className={styles.threadCategory}>
                  {FORUM_CATEGORIES.find((c) => c.value === thread.category)?.label ?? thread.category}
                </span>
                <h3 className={styles.threadTitle}>{thread.title}</h3>
                <span className={styles.threadMeta}>
                  by {thread.user.username} <VerifiedCreatorBadge role={thread.user.role} /> · {new Date(thread.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <div className={styles.threadStats}>
                <span className={styles.stat}>
                  <span className={styles.statNum}>{thread.replyCount}</span>
                  <span className={styles.statLabel}>replies</span>
                </span>
                <span className={styles.stat}>
                  <span className={styles.statNum}>{thread.viewCount}</span>
                  <span className={styles.statLabel}>views</span>
                </span>
              </div>
            </a>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className={styles.pagination}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              className={`${styles.pageBtn} ${p === page ? styles.activePage : ''}`}
              onClick={() => { const next = new URLSearchParams(searchParams); next.set('page', String(p)); setSearchParams(next); }}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
