import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
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
  if (slug === 'new') return <NewThreadForm />;
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

// ---------------------------------------------------------------------------
// New Thread Form
// ---------------------------------------------------------------------------

const THREAD_CATEGORIES = [
  { value: 'GENERAL', label: 'General' },
  { value: 'BUILD_ADVICE', label: 'Build Advice' },
  { value: 'TROUBLESHOOTING', label: 'Troubleshooting' },
  { value: 'DEALS', label: 'Deals' },
];

interface CreatedThread {
  id: string;
  slug: string;
}

function NewThreadForm() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('GENERAL');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.loginRequired}>
          <h2 className={styles.formTitle}>Create a New Thread</h2>
          <p className={styles.loginMessage}>
            You must be logged in to create a thread.
          </p>
          <a href="/login" className={styles.loginLink}>Log In</a>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim() || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const thread = await api<CreatedThread>('/forum', {
        method: 'POST',
        body: { title: title.trim(), body: body.trim(), category },
      });
      navigate(`/community/${thread.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create thread. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.formHeader}>
        <a href="/community" className={styles.backLink}>← Back to Community</a>
        <h1 className={styles.formTitle}>New Thread</h1>
        <p className={styles.formSubtitle}>Start a new discussion with the community</p>
      </header>

      <form className={styles.threadForm} onSubmit={handleSubmit}>
        {error && <div className={styles.formError}>{error}</div>}

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="thread-category">Category</label>
          <select
            id="thread-category"
            className={styles.fieldSelect}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {THREAD_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="thread-title">Title</label>
          <input
            id="thread-title"
            type="text"
            className={styles.fieldInput}
            placeholder="What's your thread about?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            required
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="thread-body">Body</label>
          <textarea
            id="thread-body"
            className={styles.fieldTextarea}
            placeholder="Share the details… (basic HTML formatting supported)"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            required
          />
        </div>

        <div className={styles.formActions}>
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={submitting || !title.trim() || !body.trim()}
          >
            {submitting ? 'Creating…' : 'Create Thread'}
          </button>
        </div>
      </form>
    </div>
  );
}
