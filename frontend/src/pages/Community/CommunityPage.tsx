import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { api, resolveImageUrl, ensureCsrfToken } from '../../utils/api';
import { ForumThread } from '../../components/ForumThread/ForumThread';
import { EmbedBuildCard } from '../../components/EmbedBuildCard/EmbedBuildCard';
import { MarkdownEditor } from '../../components/MarkdownEditor/MarkdownEditor';
import { useToast } from '../../components/Toast/Toast';
import { useAuth } from '../../hooks/useAuth';
import { ThreadCardSkeleton } from '../../components/Skeleton/Skeleton';
import {
  FolderIcon, SearchIcon, UploadIcon, ImageIcon, ChatIcon, EyeIcon, UpArrowIcon, DownArrowIcon,
} from '../../components/Icons/ForumIcons';
import { CATEGORY_ICONS } from '../../components/Icons/ForumIcons';
import {
  CATEGORY_BLUEPRINTS,
  CATEGORY_LIST,
  type BlueprintCategory,
  type CategoryConfig,
} from '../../utils/threadBlueprints';
import styles from './CommunityPage.module.scss';

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

interface ThreadListItem {
  id: string;
  title: string;
  body?: string;
  slug: string;
  category: string;
  viewCount: number;
  replyCount: number;
  score?: number;
  flair?: string | null;
  poll?: { id: string; question: string } | null;
  createdAt: string;
  imageUrls?: string[];
  isPinned?: boolean;
  isLocked?: boolean;
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
    reputation: number;
    role?: string;
    pitCred?: number;
  };
}

interface PaginatedThreads {
  items: ThreadListItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface BomEntry {
  item: string;
  quantity: string;
}

interface CreatedThread {
  id: string;
  slug: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CATEGORY_COLORS: Record<string, string> = {
  BUILD_ADVICE: '#00FFA3',
  DIY_MODS: '#FFB020',
  SHOWROOM: '#6E56FF',
  TELEMETRY: '#00B8FF',
  DEALS: '#FF3366',
  GENERAL: '#7878A0',
};

const FLAIR_LABELS: Record<string, string> = {
  SOLVED: 'Solved',
  QUESTION: 'Question',
  WIP: 'WIP',
  REVIEW: 'Review',
  PSA: 'PSA',
  GUIDE: 'Guide',
};

const FLAIR_OPTIONS = [
  { value: null, label: 'No Flair' },
  { value: 'QUESTION', label: 'Question' },
  { value: 'WIP', label: 'Work in Progress' },
  { value: 'REVIEW', label: 'Review' },
  { value: 'PSA', label: 'PSA' },
  { value: 'GUIDE', label: 'Guide' },
];

const SNIPPET_MAX_LENGTH = 120;

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

// ---------------------------------------------------------------------------
// Root page – routes by slug
// ---------------------------------------------------------------------------

export function CommunityPage() {
  const { slug } = useParams<{ slug: string }>();
  if (slug === 'new') return <NewThreadForm />;
  return <CommunityDashboard threadSlug={slug} />;
}

// Simple in-memory cache for the thread list to prevent refetch on back navigation
const threadListCache: Record<string, { data: PaginatedThreads; timestamp: number }> = {};
const CACHE_TTL = 30_000; // 30 seconds

// ---------------------------------------------------------------------------
// Dashboard — two-column layout
// ---------------------------------------------------------------------------

function CommunityDashboard({ threadSlug }: { threadSlug?: string }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [threads, setThreads] = useState<ThreadListItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const activeCategory = (searchParams.get('category') ?? '') as '' | BlueprintCategory;
  const page = parseInt(searchParams.get('page') ?? '1') || 1;

  const [sortBy, setSortBy] = useState<'createdAt' | 'replyCount' | 'viewCount'>('createdAt');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [totalPosts, setTotalPosts] = useState<number | null>(null);
  const [selectedFlair, setSelectedFlair] = useState<string | null>(null);

  // Thread list voting state
  const [listVotes, setListVotes] = useState<Record<string, { score: number; userVote: 0 | 1 | -1 }>>({});
  const [listVoting, setListVoting] = useState<Set<string>>(new Set());

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Re-fetch whenever pathname changes (e.g., navigating back from thread to feed)
  useEffect(() => {
    if (!threadSlug) setRefreshKey((k) => k + 1);
  }, [location.pathname, threadSlug]);

  useEffect(() => {
    const cacheKey = `${activeCategory}-${page}-${sortBy}-${selectedFlair ?? ''}`;
    const cached = threadListCache[cacheKey];

    const initVoteState = (items: ThreadListItem[]) => {
      const votes: Record<string, { score: number; userVote: 0 | 1 | -1 }> = {};
      for (const t of items) {
        votes[t.id] = { score: t.score ?? 0, userVote: 0 };
      }
      setListVotes(prev => ({ ...prev, ...votes }));
    };

    // Use cache if fresh (< 30 seconds old)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      let items = cached.data.items;
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        items = items.filter(t => t.title.toLowerCase().includes(q));
      }
      setThreads(items);
      initVoteState(items);
      setTotalPages(cached.data.pagination.totalPages);
      if (totalPosts === null) setTotalPosts(cached.data.pagination.total);
      setLoading(false);
      return;
    }

    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20', sortBy, sortDir: 'desc' });
    if (activeCategory) params.set('category', activeCategory);
    if (selectedFlair) params.set('flair', selectedFlair);

    api<PaginatedThreads>(`/forum?${params}`)
      .then((data) => {
        threadListCache[cacheKey] = { data, timestamp: Date.now() };
        let items = data.items;
        if (debouncedSearch) {
          const q = debouncedSearch.toLowerCase();
          items = items.filter(t => t.title.toLowerCase().includes(q));
        }
        setThreads(items);
        initVoteState(items);
        setTotalPages(data.pagination.totalPages);
        if (totalPosts === null) setTotalPosts(data.pagination.total);
      })
      .catch(() => setThreads([]))
      .finally(() => setLoading(false));
  }, [activeCategory, page, sortBy, debouncedSearch, selectedFlair, refreshKey]);

  const setCategory = useCallback(
    (cat: string) => {
      if (threadSlug) {
        // Navigate away from thread view back to the feed with category filter
        navigate(`/community${cat ? `?category=${cat}` : ''}`);
        return;
      }
      const next = new URLSearchParams(searchParams);
      if (cat) next.set('category', cat);
      else next.delete('category');
      next.set('page', '1');
      setSearchParams(next);
    },
    [searchParams, setSearchParams, threadSlug, navigate],
  );

  const setPage = useCallback(
    (p: number) => {
      const next = new URLSearchParams(searchParams);
      next.set('page', String(p));
      setSearchParams(next);
    },
    [searchParams, setSearchParams],
  );

  const isShowroom = activeCategory === 'SHOWROOM';

  const handleListVote = async (e: React.MouseEvent, threadId: string, clickedValue: 1 | -1) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      showToast('Log in to vote', 'error');
      return;
    }
    if (listVoting.has(threadId)) return;
    setListVoting(prev => new Set(prev).add(threadId));

    const current = listVotes[threadId] ?? { score: 0, userVote: 0 };
    const sendValue = current.userVote === clickedValue ? 0 : clickedValue;
    const delta = sendValue - current.userVote;

    setListVotes(prev => ({
      ...prev,
      [threadId]: { score: current.score + delta, userVote: sendValue as 0 | 1 | -1 },
    }));

    try {
      const result = await api<{ score: number; userVote: number }>(`/forum/threads/${threadId}/vote`, {
        method: 'POST',
        body: { value: sendValue },
      });
      setListVotes(prev => ({
        ...prev,
        [threadId]: { score: result.score, userVote: result.userVote as 0 | 1 | -1 },
      }));
    } catch {
      setListVotes(prev => ({ ...prev, [threadId]: current }));
      showToast('Vote failed', 'error');
    } finally {
      setListVoting(prev => {
        const next = new Set(prev);
        next.delete(threadId);
        return next;
      });
    }
  };

  return (
    <div className={styles.dashboard}>
      {/* ---------- Sidebar ---------- */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}>Community</h2>
          {user && (
            <a href="/community/new" className={styles.newThreadBtn}>
              + New
            </a>
          )}
        </div>

        <nav className={styles.categoryNav}>
          <button
            className={`${styles.categoryItem} ${activeCategory === '' ? styles.categoryActive : ''}`}
            onClick={() => setCategory('')}
          >
            <span className={styles.categoryIcon}><FolderIcon size={16} /></span>
            <span className={styles.categoryLabel}>All Topics</span>
          </button>

          {CATEGORY_LIST.map((key) => {
            const cfg = CATEGORY_BLUEPRINTS[key];
            const isActive = activeCategory === key;
            const IconComponent = CATEGORY_ICONS[key];
            return (
              <button
                key={key}
                className={`${styles.categoryItem} ${isActive ? styles.categoryActive : ''}`}
                onClick={() => setCategory(key)}
                style={isActive ? { borderLeftColor: cfg.color } : undefined}
              >
                <span className={styles.categoryIcon}>{IconComponent && <IconComponent size={16} />}</span>
                <span className={styles.categoryLabel}>{cfg.label}</span>
              </button>
            );
          })}
        </nav>

        <div className={styles.flairFilter}>
          {Object.entries(FLAIR_LABELS).map(([key, label]) => (
            <button
              key={key}
              className={`${styles.flairFilterPill} ${selectedFlair === key ? styles.flairFilterPillActive : ''}`}
              onClick={() => setSelectedFlair(selectedFlair === key ? null : key)}
            >
              {label}
            </button>
          ))}
        </div>
      </aside>

      {/* ---------- Mobile category bar ---------- */}
      <div className={styles.mobileCategoryBar}>
        <button
          className={`${styles.mobileCategoryPill} ${activeCategory === '' ? styles.mobileCategoryPillActive : ''}`}
          onClick={() => setCategory('')}
        >
          <FolderIcon size={14} /> All
        </button>
        {CATEGORY_LIST.map((key) => {
          const cfg = CATEGORY_BLUEPRINTS[key];
          const IconComponent = CATEGORY_ICONS[key];
          return (
            <button
              key={key}
              className={`${styles.mobileCategoryPill} ${activeCategory === key ? styles.mobileCategoryPillActive : ''}`}
              onClick={() => setCategory(key)}
            >
              {IconComponent && <IconComponent size={14} />} {cfg.label}
            </button>
          );
        })}
      </div>

      {/* ---------- Main feed ---------- */}
      <main className={styles.feed}>
        {threadSlug ? (
          <ForumThread slug={threadSlug} />
        ) : (
          <>
            {/* Search */}
            <div className={styles.searchRow}>
              <span className={styles.searchIcon}><SearchIcon size={14} /></span>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search threads…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className={styles.searchClear} onClick={() => setSearchQuery('')}>×</button>
              )}
            </div>

            {/* Sort pills */}
            <div className={styles.sortRow}>
              {([['createdAt', 'Latest'], ['replyCount', 'Most Replies'], ['viewCount', 'Most Viewed']] as const).map(([key, label]) => (
                <button
                  key={key}
                  className={`${styles.sortPill} ${sortBy === key ? styles.sortPillActive : ''}`}
                  onClick={() => setSortBy(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className={styles.skeletonList}>
                {Array.from({ length: 5 }).map((_, i) => <ThreadCardSkeleton key={i} />)}
              </div>
            ) : threads.length === 0 ? (
              <div className={styles.emptyState}>No discussions found</div>
            ) : isShowroom ? (
              <div className={styles.showroomGrid}>
                {threads.map((t) => (
                  <a key={t.id} href={`/community/${t.slug}`} className={styles.showroomCard}>
                    <div className={styles.showroomImageWrap}>
                      {t.imageUrls?.[0] && (
                        <img
                          src={resolveImageUrl(t.imageUrls[0])}
                          alt={`Showroom photo for ${t.title}`}
                          className={styles.showroomImage}
                          loading="lazy"
                          decoding="async"
                        />
                      )}
                      {t.imageUrls && t.imageUrls.length > 1 && (
                        <span className={styles.imageCountBadge}><ImageIcon size={12} /> {t.imageUrls.length}</span>
                      )}
                    </div>
                    <div className={styles.showroomInfo}>
                      <h3 className={styles.showroomTitle}>{t.title}</h3>
                      <span className={styles.showroomAuthor}>
                        {t.user.id === 'anonymous' ? <em>Anonymous</em> : (
                          <a href={`/profile/${t.user.username}`} className={styles.threadCardAuthorLink} onClick={e => e.stopPropagation()}>
                            {t.user.username}
                          </a>
                        )}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className={styles.threadList}>
                {threads.map((t) => {
                  const color = CATEGORY_COLORS[t.category] ?? '#7878A0';
                  const catLabel =
                    CATEGORY_BLUEPRINTS[t.category as BlueprintCategory]?.label ?? t.category;
                  const vote = listVotes[t.id] ?? { score: t.score ?? 0, userVote: 0 };

                  return (
                    <a
                      key={t.id}
                      href={`/community/${t.slug}`}
                      className={styles.threadRow}
                    >
                      <div className={styles.threadCardVote}>
                        <button
                          className={`${styles.threadVoteBtn} ${vote.userVote === 1 ? styles.threadVoteBtnUpActive : ''}`}
                          onClick={(e) => handleListVote(e, t.id, 1)}
                          disabled={listVoting.has(t.id)}
                        >
                          <UpArrowIcon size={14} />
                        </button>
                        <span className={styles.threadVoteScore}>{vote.score}</span>
                        <button
                          className={`${styles.threadVoteBtn} ${vote.userVote === -1 ? styles.threadVoteBtnDownActive : ''}`}
                          onClick={(e) => handleListVote(e, t.id, -1)}
                          disabled={listVoting.has(t.id)}
                        >
                          <DownArrowIcon size={14} />
                        </button>
                      </div>
                      <div className={styles.threadCardContent}>
                        <div className={styles.threadCardTopLine}>
                          <span
                            className={styles.categoryPill}
                            style={{ background: `${color}cc` }}
                          >
                            {catLabel}
                          </span>
                          {t.isPinned && (
                            <span className={styles.pinnedBadge}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
                              </svg>
                              Pinned
                            </span>
                          )}
                          {t.isLocked && (
                            <span className={styles.lockedBadge}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                <path d="M7 11V7a5 5 0 0110 0v4"/>
                              </svg>
                              Locked
                            </span>
                          )}
                          {t.flair && (
                            <span className={`${styles.flairBadge} ${styles[`flair${t.flair}`]}`}>
                              {FLAIR_LABELS[t.flair]}
                            </span>
                          )}
                          {t.poll && <span className={styles.pollIndicator}>Poll</span>}
                          <span className={styles.threadCardMeta}>
                            Posted by {t.user.id === 'anonymous' ? <em>Anonymous</em> : (
                              <a href={`/profile/${t.user.username}`} className={styles.threadCardAuthorLink} onClick={e => e.stopPropagation()}>
                                {t.user.username}
                              </a>
                            )}
                            {t.user.id !== 'anonymous' && t.user.pitCred != null && t.user.pitCred > 0 && (
                              <span className={styles.pitCredSmall}> · {t.user.pitCred} PC</span>
                            )}
                            {' · '}
                            {relativeTime(t.createdAt)}
                          </span>
                        </div>
                        <span className={styles.threadTitle}>{t.title}</span>
                        {t.body && (
                          <span className={styles.threadSnippet}>
                            {t.body.length > SNIPPET_MAX_LENGTH ? t.body.slice(0, SNIPPET_MAX_LENGTH) + '…' : t.body}
                          </span>
                        )}
                        <div className={styles.threadFooter}>
                          <span className={styles.threadFooterItem}>
                            <ChatIcon size={13} /> {t.replyCount} Comments
                          </span>
                          <span className={styles.threadFooterItem}>
                            <EyeIcon size={13} /> {t.viewCount} Views
                          </span>
                        </div>
                      </div>
                      {t.imageUrls && t.imageUrls.length > 0 && (
                        <div className={styles.threadCardImages}>
                          <img
                            src={resolveImageUrl(t.imageUrls[0])}
                            alt=""
                            className={styles.threadCardImageMain}
                          />
                          {t.imageUrls.length > 1 && (
                            <div className={styles.threadCardImageStack}>
                              {t.imageUrls.slice(1, 3).map((url, i) => (
                                <img
                                  key={i}
                                  src={resolveImageUrl(url)}
                                  alt=""
                                  className={styles.threadCardImageSmall}
                                />
                              ))}
                              {t.imageUrls.length > 3 && (
                                <div className={styles.threadCardImageMore}>
                                  +{t.imageUrls.length - 3}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </a>
                  );
                })}
              </div>
            )}
          </>
        )}

        {!threadSlug && totalPages > 1 && (
          <div className={styles.pagination}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                className={`${styles.pageBtn} ${p === page ? styles.activePage : ''}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}
          </div>
        )}

      </main>

      {/* ---------- Right sidebar ---------- */}
      <aside className={styles.rightSidebar}>
        <div className={styles.sidebarCard}>
          <h3 className={styles.sidebarCardTitle}>About This Community</h3>
          <p className={styles.aboutText}>
            The sim racing community hub — share your builds, get advice, discuss mods, and connect with fellow racing enthusiasts.
          </p>
        </div>

        <div className={styles.sidebarCard}>
          <h3 className={styles.sidebarCardTitle}>Community Rules</h3>
          <ol className={styles.rulesList} style={{ counterReset: 'rule-counter' }}>
            <li className={styles.ruleItem}>Be respectful and constructive</li>
            <li className={styles.ruleItem}>No spam or self-promotion</li>
            <li className={styles.ruleItem}>Stay on topic for each category</li>
            <li className={styles.ruleItem}>Share your own work, credit others</li>
            <li className={styles.ruleItem}>No buying/selling outside Deals</li>
          </ol>
        </div>

        <div className={styles.sidebarCard}>
          <h3 className={styles.sidebarCardTitle}>Top Categories</h3>
          {CATEGORY_LIST.slice(0, 4).map((key) => {
            const cfg = CATEGORY_BLUEPRINTS[key];
            const IconComponent = CATEGORY_ICONS[key];
            return (
              <div key={key} className={styles.topCategoryRow}>
                <span className={styles.topCategoryIcon}>{IconComponent && <IconComponent size={14} />}</span>
                {cfg.label}
              </div>
            );
          })}
        </div>

        <div className={styles.sidebarCard}>
          <h3 className={styles.sidebarCardTitle}>Site Stats</h3>
          <div className={styles.statRow}>
            <span className={styles.statValue}>{totalPosts !== null ? totalPosts.toLocaleString() : '—'}</span>
            <span className={styles.statLabel}>Posts</span>
          </div>
          <div className={styles.statRow}>
            {/* TODO: Add members/active endpoint */}
            <span className={styles.statValue}>—</span>
            <span className={styles.statLabel}>Members</span>
          </div>
          <div className={styles.statRow}>
            <span className={styles.statValue}>—</span>
            <span className={styles.statLabel}>Active</span>
          </div>
        </div>

        <div className={styles.sidebarCard}>
          <h3 className={styles.sidebarCardTitle}>Leaderboards</h3>
          <a href="/leaderboards" className={styles.sidebarLink} onClick={e => { e.preventDefault(); navigate('/leaderboards'); }}>
            View Leaderboards →
          </a>
        </div>
      </aside>

      {/* ---------- Mobile FAB ---------- */}
      {user && (
        <a href="/community/new" className={styles.mobileFab} aria-label="New thread">
          +
        </a>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// New Thread Form — blueprint-driven
// ---------------------------------------------------------------------------

function NewThreadForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [step, setStep] = useState<1 | 2>(1);
  const [category, setCategory] = useState<BlueprintCategory | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [metadata, setMetadata] = useState<Record<string, unknown>>({});
  const [imageUrls, setImageUrls] = useState<string[]>(['']);
  const [bomEntries, setBomEntries] = useState<BomEntry[]>([{ item: '', quantity: '1' }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [flair, setFlair] = useState<string | null>(null);
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image upload states
  const [dragActive, setDragActive] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [uploadingIndexes, setUploadingIndexes] = useState<Set<number>>(new Set());
  const [addUrlValue, setAddUrlValue] = useState('');
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // Draft states
  const DRAFT_KEY = 'rigbuilder-draft-thread';
  const [showDraftBanner, setShowDraftBanner] = useState(false);

  // On mount, check for draft
  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) setShowDraftBanner(true);
  }, []);

  // Save draft on changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      const draft = { category, title, body, metadata, imageUrls };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }, 1000);
    return () => clearTimeout(timer);
  }, [category, title, body, metadata, imageUrls]);

  const restoreDraft = () => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (!saved) return;
      const draft = JSON.parse(saved);
      if (draft.category) { setCategory(draft.category); setStep(2); }
      if (draft.title) setTitle(draft.title);
      if (draft.body) setBody(draft.body);
      if (draft.metadata) setMetadata(draft.metadata);
      if (draft.imageUrls) setImageUrls(draft.imageUrls);
    } catch (err) {
      console.warn('Failed to restore draft:', err);
    }
    setShowDraftBanner(false);
  };

  const discardDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setShowDraftBanner(false);
  };

  const handleImageFiles = async (files: FileList | File[]) => {
    const fileArr = Array.from(files);
    if (fileArr.length === 0) return;

    for (const file of fileArr) {
      const placeholderIdx = imageUrls.length;
      setImageUrls(prev => [...prev.filter(u => u.trim()), '']);
      setUploadingIndexes(prev => new Set(prev).add(placeholderIdx));

      try {
        const formData = new FormData();
        formData.append('image', file);
        const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1';

        // Ensure CSRF token exists before upload
        const csrfToken = await ensureCsrfToken();
        const headers: Record<string, string> = {};
        if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
        const res = await fetch(`${baseUrl}/uploads`, {
          method: 'POST',
          credentials: 'include',
          headers,
          body: formData,
        });
        if (!res.ok) throw new Error('Upload failed');
        const data = await res.json() as { url: string };
        setImageUrls(prev => {
          const next = [...prev];
          const emptyIdx = next.indexOf('');
          if (emptyIdx >= 0) next[emptyIdx] = data.url;
          else next.push(data.url);
          return next;
        });
        showToast('Image uploaded');
      } catch {
        setUploadErrors(prev => [...prev, `Failed to upload ${file.name}`]);
        setImageUrls(prev => prev.filter(u => u !== ''));
      } finally {
        setUploadingIndexes(prev => {
          const next = new Set(prev);
          next.delete(placeholderIdx);
          return next;
        });
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragActive(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setDragActive(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length > 0) handleImageFiles(e.dataTransfer.files);
  };

  const handleAddUrl = () => {
    const url = addUrlValue.trim();
    if (!url) return;
    try { new URL(url); } catch { setUploadErrors(prev => [...prev, 'Invalid URL']); return; }
    setImageUrls(prev => [...prev.filter(u => u.trim()), url]);
    setAddUrlValue('');
  };

  const handleThumbDragStart = (idx: number) => setDragIdx(idx);
  const handleThumbDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setImageUrls(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    setDragIdx(idx);
  };
  const handleThumbDragEnd = () => setDragIdx(null);

  // Login gate
  if (!user) {
    return (
      <div className={styles.formContainer}>
        <div className={styles.loginRequired}>
          <h2 className={styles.formTitle}>Create a New Thread</h2>
          <p className={styles.loginMessage}>You must be logged in to create a thread.</p>
          <a href="/login" className={styles.loginLink}>Log In</a>
        </div>
      </div>
    );
  }

  const blueprint: CategoryConfig | null = category
    ? CATEGORY_BLUEPRINTS[category]
    : null;

  // ----- Step 1: pick category -----
  if (step === 1 || !category) {
    return (
      <div className={styles.formContainer}>
        <header className={styles.formHeader}>
          <a href="/community" className={styles.backLink}>← Back to Community</a>
          <h1 className={styles.formTitle}>New Thread</h1>
          <p className={styles.formSubtitle}>Choose a category to get started</p>
        </header>

        <div className={styles.categoryGrid}>
          {CATEGORY_LIST.map((key) => {
            const cfg = CATEGORY_BLUEPRINTS[key];
            const IconComponent = CATEGORY_ICONS[key];
            return (
              <button
                key={key}
                className={styles.categoryCard}
                style={{ borderColor: cfg.color }}
                onClick={() => {
                  setCategory(key);
                  // Seed defaults from blueprint
                  const defaults: Record<string, unknown> = {};
                  for (const f of cfg.fields) {
                    if (f.defaultValue !== undefined) defaults[f.key] = f.defaultValue;
                  }
                  setMetadata(defaults);
                  setStep(2);
                }}
              >
                <span className={styles.categoryCardIcon}>{IconComponent && <IconComponent size={28} />}</span>
                <span className={styles.categoryCardLabel}>{cfg.label}</span>
                <span className={styles.categoryCardDesc}>{cfg.description}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ----- Validation -----
  const isPermalinkValid =
    category !== 'BUILD_ADVICE' ||
    !metadata.buildPermalink ||
    String(metadata.buildPermalink).startsWith('/list/');

  const hasRequiredImages =
    category !== 'SHOWROOM' || imageUrls.some((u) => u.trim().length > 0);

  const canSubmit =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    isPermalinkValid &&
    hasRequiredImages &&
    !submitting;

  // ----- Submit -----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    const meta: Record<string, unknown> = { ...metadata };

    // Pack BOM for DIY_MODS
    if (category === 'DIY_MODS') {
      const tools = String(meta.toolsRequired ?? '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      if (tools.length > 0) meta.toolsRequired = tools;
      const bom = bomEntries.filter((e) => e.item.trim());
      if (bom.length > 0) meta.billOfMaterials = bom;
    }

    const filteredImages = imageUrls.map((u) => u.trim()).filter(Boolean);

    try {
      const thread = await api<CreatedThread>('/forum', {
        method: 'POST',
        body: {
          title: title.trim(),
          body: body.trim(),
          category,
          metadata: Object.keys(meta).length > 0 ? meta : undefined,
          imageUrls: filteredImages.length > 0 ? filteredImages : undefined,
          isAnonymous: isAnonymous || undefined,
          flair: flair || undefined,
          ...(showPoll && pollQuestion.trim() && pollOptions.filter(o => o.trim()).length >= 2 && {
            poll: {
              question: pollQuestion.trim(),
              options: pollOptions.filter(o => o.trim()),
            },
          }),
        },
      });
      showToast('Thread created');
      localStorage.removeItem(DRAFT_KEY);
      // Clear thread list cache so fresh data loads
      Object.keys(threadListCache).forEach(k => delete threadListCache[k]);
      navigate(`/community/${thread.slug}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create thread. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ----- Step 2: dynamic form -----
  return (
    <div className={styles.formContainer}>
      {showDraftBanner && (
        <div className={styles.draftBanner}>
          <span>You have an unsaved draft. Restore it?</span>
          <button className={styles.draftRestore} onClick={restoreDraft}>Restore</button>
          <button className={styles.draftDiscard} onClick={discardDraft}>Discard</button>
        </div>
      )}

      <header className={styles.formHeader}>
        <button
          className={styles.backLink}
          onClick={() => {
            setStep(1);
            setCategory(null);
          }}
        >
          ← Change category
        </button>
        <h1 className={styles.formTitle}>
          {category && CATEGORY_ICONS[category] && (() => { const I = CATEGORY_ICONS[category]; return <I size={24} />; })()} {blueprint?.label}
        </h1>
        <p className={styles.formSubtitle}>{blueprint?.description}</p>
      </header>

      <form className={styles.threadForm} onSubmit={handleSubmit}>
        {error && <div className={styles.formError}>{error}</div>}

        {/* Title */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="thread-title">
            Title
          </label>
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

        {/* Body */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="thread-body">
            Body
          </label>
          <MarkdownEditor
            id="thread-body"
            value={body}
            onChange={setBody}
            placeholder="Share the details…"
            rows={8}
            required
          />
        </div>

        {/* Flair selector */}
        <div className={styles.flairSelector}>
          <label className={styles.fieldLabel}>Flair (optional)</label>
          <div className={styles.flairOptions}>
            {FLAIR_OPTIONS.map(opt => (
              <button
                key={opt.value ?? 'none'}
                type="button"
                className={`${styles.flairPill} ${flair === opt.value ? styles.flairPillActive : ''} ${opt.value ? styles[`flair${opt.value}`] : ''}`}
                onClick={() => setFlair(flair === opt.value ? null : opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Poll creator */}
        <div className={styles.pollToggle}>
          <button
            type="button"
            className={`${styles.pollToggleBtn} ${showPoll ? styles.pollToggleBtnActive : ''}`}
            onClick={() => setShowPoll(!showPoll)}
          >
            {showPoll ? 'Remove Poll' : 'Add Poll'}
          </button>
        </div>

        {showPoll && (
          <div className={styles.pollCreator}>
            <input
              className={styles.pollQuestionInput}
              placeholder="Poll question..."
              value={pollQuestion}
              onChange={e => setPollQuestion(e.target.value)}
              maxLength={200}
            />
            <div className={styles.pollOptionsList}>
              {pollOptions.map((opt, i) => (
                <div key={i} className={styles.pollOptionRow}>
                  <input
                    className={styles.pollOptionInput}
                    placeholder={`Option ${i + 1}`}
                    value={opt}
                    onChange={e => setPollOptions(pollOptions.map((o, j) => j === i ? e.target.value : o))}
                    maxLength={100}
                  />
                  {pollOptions.length > 2 && (
                    <button type="button" className={styles.pollRemoveBtn} onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}>×</button>
                  )}
                </div>
              ))}
            </div>
            {pollOptions.length < 6 && (
              <button type="button" className={styles.pollAddBtn} onClick={() => setPollOptions([...pollOptions, ''])}>+ Add Option</button>
            )}
          </div>
        )}

        {/* --- Category-specific fields --- */}

        {category === 'BUILD_ADVICE' && (
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="field-permalink">
              RigBuilder Permalink
            </label>
            <input
              id="field-permalink"
              type="text"
              className={`${styles.fieldInput} ${
                metadata.buildPermalink && !isPermalinkValid ? styles.fieldInvalid : ''
              }`}
              placeholder="/list/abc123"
              value={String(metadata.buildPermalink ?? '')}
              onChange={(e) =>
                setMetadata((m) => ({ ...m, buildPermalink: e.target.value }))
              }
            />
            {!!metadata.buildPermalink && !isPermalinkValid && (
              <span className={styles.fieldHint}>Must start with /list/</span>
            )}
            {!!metadata.buildPermalink && isPermalinkValid && (
              <EmbedBuildCard permalink={String(metadata.buildPermalink)} />
            )}
          </div>
        )}

        {category === 'DIY_MODS' && (
          <>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="field-tools">
                Tools Required
              </label>
              <textarea
                id="field-tools"
                className={`${styles.fieldTextarea} ${styles.monoTextarea}`}
                placeholder="One tool per line"
                value={String(metadata.toolsRequired ?? '')}
                onChange={(e) =>
                  setMetadata((m) => ({ ...m, toolsRequired: e.target.value }))
                }
                rows={4}
              />
            </div>

            <div className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Bill of Materials</span>
              {bomEntries.map((entry, i) => (
                <div key={i} className={styles.bomRow}>
                  <input
                    type="text"
                    className={styles.fieldInput}
                    placeholder="Item name"
                    value={entry.item}
                    onChange={(e) => {
                      const next = [...bomEntries];
                      next[i] = { ...next[i], item: e.target.value };
                      setBomEntries(next);
                    }}
                  />
                  <input
                    type="text"
                    className={`${styles.fieldInput} ${styles.bomQty}`}
                    placeholder="Qty"
                    value={entry.quantity}
                    onChange={(e) => {
                      const next = [...bomEntries];
                      next[i] = { ...next[i], quantity: e.target.value };
                      setBomEntries(next);
                    }}
                  />
                  {bomEntries.length > 1 && (
                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={() => setBomEntries(bomEntries.filter((_, j) => j !== i))}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className={styles.addBtn}
                onClick={() => setBomEntries([...bomEntries, { item: '', quantity: '1' }])}
              >
                + Add item
              </button>
            </div>
          </>
        )}

        {category === 'TELEMETRY' && (
          <>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="field-profile">
                Profile Type
              </label>
              <select
                id="field-profile"
                className={styles.fieldSelect}
                value={String(metadata.profileType ?? 'SimHub')}
                onChange={(e) =>
                  setMetadata((m) => ({ ...m, profileType: e.target.value }))
                }
              >
                <option value="SimHub">SimHub</option>
                <option value="LFE">LFE</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="field-code">
                Configuration
              </label>
              <textarea
                id="field-code"
                className={`${styles.fieldTextarea} ${styles.monoTextarea}`}
                placeholder="Paste your JSON / settings here…"
                value={String(metadata.codeSnippet ?? '')}
                onChange={(e) =>
                  setMetadata((m) => ({ ...m, codeSnippet: e.target.value }))
                }
                rows={8}
              />
            </div>
          </>
        )}

        {category === 'DEALS' && (
          <>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="field-deal-status">
                Deal Status
              </label>
              <select
                id="field-deal-status"
                className={styles.fieldSelect}
                value={String(metadata.dealStatus ?? 'Active')}
                onChange={(e) =>
                  setMetadata((m) => ({ ...m, dealStatus: e.target.value }))
                }
              >
                <option value="Active">Active</option>
                <option value="Expired">Expired</option>
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="field-price">
                Price
              </label>
              <div className={styles.priceRow}>
                <input
                  id="field-price"
                  type="number"
                  min="0"
                  step="0.01"
                  className={styles.fieldInput}
                  placeholder="0.00"
                  value={metadata.price !== undefined ? String(metadata.price) : ''}
                  onChange={(e) =>
                    setMetadata((m) => ({
                      ...m,
                      price: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                />
                <input
                  type="text"
                  className={`${styles.fieldInput} ${styles.currencyInput}`}
                  placeholder="USD"
                  value={String(metadata.currency ?? 'USD')}
                  onChange={(e) =>
                    setMetadata((m) => ({ ...m, currency: e.target.value }))
                  }
                />
              </div>
            </div>
          </>
        )}

        <div className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>
            Images {category === 'SHOWROOM' ? '(at least 1 required)' : '(optional)'}
          </span>

          {/* Drop zone */}
          <div
            className={`${styles.dropZone} ${dragActive ? styles.dropZoneActive : ''}`}
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <span className={styles.dropZoneIcon}><UploadIcon size={24} /></span>
            <span className={styles.dropZoneText}>Drop images here or click to upload</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => e.target.files && handleImageFiles(e.target.files)}
            />
          </div>

          {/* URL input */}
          <div className={styles.urlAddRow}>
            <input
              type="url"
              className={styles.fieldInput}
              placeholder="Or add image by URL…"
              value={addUrlValue}
              onChange={(e) => setAddUrlValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddUrl())}
            />
            <button type="button" className={styles.addBtn} onClick={handleAddUrl}>
              Add
            </button>
          </div>

          {/* Error messages */}
          {uploadErrors.length > 0 && (
            <div className={styles.uploadErrorList}>
              {uploadErrors.map((err, i) => (
                <div key={i} className={styles.uploadError}>{err}</div>
              ))}
            </div>
          )}

          {/* Thumbnail row */}
          {(imageUrls.filter(u => u.trim()).length > 0 || uploadingIndexes.size > 0) && (
            <div className={styles.thumbRow}>
              {imageUrls.map((url, i) => {
                if (!url.trim()) return (
                  <div key={i} className={styles.thumbCard}>
                    <div className={styles.thumbLoading}>⏳</div>
                  </div>
                );
                return (
                  <div
                    key={`${url}-${i}`}
                    className={`${styles.thumbCard} ${dragIdx === i ? styles.thumbDragging : ''}`}
                    draggable
                    onDragStart={() => handleThumbDragStart(i)}
                    onDragOver={(e) => handleThumbDragOver(e, i)}
                    onDragEnd={handleThumbDragEnd}
                  >
                    <img src={resolveImageUrl(url)} alt={`Image ${i + 1}`} className={styles.thumbImg} loading="lazy" decoding="async" />
                    <button
                      type="button"
                      className={styles.thumbRemove}
                      onClick={() => setImageUrls(imageUrls.filter((_, j) => j !== i))}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={styles.formActions}>
          <label className={styles.anonymousToggle}>
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={e => setIsAnonymous(e.target.checked)}
            />
            <div>
              <span className={styles.anonymousToggleLabel}>Post as Anonymous</span>
              <span className={styles.anonymousToggleHint}>Your identity will be hidden from other users</span>
            </div>
          </label>
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={!canSubmit}
          >
            {submitting ? 'Creating…' : 'Create Thread'}
          </button>
        </div>
      </form>
    </div>
  );
}
