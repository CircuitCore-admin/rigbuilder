import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import { ForumThread } from '../../components/ForumThread/ForumThread';
import { EmbedBuildCard } from '../../components/EmbedBuildCard/EmbedBuildCard';
import { useAuth } from '../../hooks/useAuth';
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
  slug: string;
  category: string;
  viewCount: number;
  replyCount: number;
  createdAt: string;
  imageUrls?: string[];
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
    reputation: number;
    role?: string;
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

// ---------------------------------------------------------------------------
// Dashboard — two-column layout
// ---------------------------------------------------------------------------

function CommunityDashboard({ threadSlug }: { threadSlug?: string }) {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [threads, setThreads] = useState<ThreadListItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const activeCategory = (searchParams.get('category') ?? '') as '' | BlueprintCategory;
  const page = parseInt(searchParams.get('page') ?? '1') || 1;

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (activeCategory) params.set('category', activeCategory);

    api<PaginatedThreads>(`/forum?${params}`)
      .then((data) => {
        setThreads(data.items);
        setTotalPages(data.pagination.totalPages);
      })
      .catch(() => setThreads([]))
      .finally(() => setLoading(false));
  }, [activeCategory, page]);

  const setCategory = useCallback(
    (cat: string) => {
      const next = new URLSearchParams(searchParams);
      if (cat) next.set('category', cat);
      else next.delete('category');
      next.set('page', '1');
      setSearchParams(next);
    },
    [searchParams, setSearchParams],
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
            <span className={styles.categoryIcon}>🗂️</span>
            <span className={styles.categoryLabel}>All Topics</span>
          </button>

          {CATEGORY_LIST.map((key) => {
            const cfg = CATEGORY_BLUEPRINTS[key];
            const isActive = activeCategory === key;
            return (
              <button
                key={key}
                className={`${styles.categoryItem} ${isActive ? styles.categoryActive : ''}`}
                onClick={() => setCategory(key)}
                style={isActive ? { borderLeftColor: cfg.color } : undefined}
              >
                <span className={styles.categoryIcon}>{cfg.icon}</span>
                <span className={styles.categoryLabel}>{cfg.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ---------- Main feed ---------- */}
      <main className={styles.feed}>
        {threadSlug ? (
          <ForumThread slug={threadSlug} />
        ) : loading ? (
          <div className={styles.loadingState}>Loading discussions…</div>
        ) : threads.length === 0 ? (
          <div className={styles.emptyState}>No discussions found</div>
        ) : isShowroom ? (
          <div className={styles.showroomGrid}>
            {threads.map((t) => (
              <a key={t.id} href={`/community/${t.slug}`} className={styles.showroomCard}>
                {t.imageUrls?.[0] && (
                  <img
                    src={t.imageUrls[0]}
                    alt={`Showroom photo for ${t.title}`}
                    className={styles.showroomImage}
                  />
                )}
                <div className={styles.showroomInfo}>
                  <h3 className={styles.showroomTitle}>{t.title}</h3>
                  <span className={styles.showroomAuthor}>
                    {t.user.username}
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

              return (
                <a key={t.id} href={`/community/${t.slug}`} className={styles.threadRow}>
                  <span
                    className={styles.categoryPill}
                    style={{ background: `${color}cc` }}
                  >
                    {catLabel}
                  </span>
                  <span className={styles.threadTitle}>{t.title}</span>
                  <span className={styles.threadAuthor}>
                    {t.user.avatarUrl && (
                      <img
                        src={t.user.avatarUrl}
                        alt=""
                        className={styles.threadAvatar}
                      />
                    )}
                    {t.user.username}
                  </span>
                  <span className={styles.replyPill}>{t.replyCount}</span>
                  <span className={styles.threadTime}>
                    {relativeTime(t.createdAt)}
                  </span>
                </a>
              );
            })}
          </div>
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
            return (
              <div key={key} className={styles.topCategoryRow}>
                <span className={styles.topCategoryIcon}>{cfg.icon}</span>
                {cfg.label}
              </div>
            );
          })}
        </div>

        <div className={styles.sidebarCard}>
          <h3 className={styles.sidebarCardTitle}>Site Stats</h3>
          <div className={styles.statRow}>
            <span className={styles.statValue}>12.4k</span>
            <span className={styles.statLabel}>Members</span>
          </div>
          <div className={styles.statRow}>
            <span className={styles.statValue}>342</span>
            <span className={styles.statLabel}>Active</span>
          </div>
          <div className={styles.statRow}>
            <span className={styles.statValue}>8.9k</span>
            <span className={styles.statLabel}>Posts</span>
          </div>
        </div>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------
// New Thread Form — blueprint-driven
// ---------------------------------------------------------------------------

function NewThreadForm() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);
  const [category, setCategory] = useState<BlueprintCategory | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [metadata, setMetadata] = useState<Record<string, unknown>>({});
  const [imageUrls, setImageUrls] = useState<string[]>(['']);
  const [bomEntries, setBomEntries] = useState<BomEntry[]>([{ item: '', quantity: '1' }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1';
      const csrfToken = document.cookie.match(/(?:^|; )__csrf=([^;]*)/)?.[1];
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
      setImageUrls((prev) => {
        const filtered = prev.filter((u) => u.trim().length > 0);
        return [...filtered, data.url];
      });
    } catch {
      setError('Image upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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
                <span className={styles.categoryCardIcon}>{cfg.icon}</span>
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
        },
      });
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
          {blueprint?.icon} {blueprint?.label}
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
          <textarea
            id="thread-body"
            className={styles.fieldTextarea}
            placeholder="Share the details… (Markdown supported: **bold**, *italic*, `code`, > quote)"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            required
          />
        </div>

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
            {metadata.buildPermalink && !isPermalinkValid && (
              <span className={styles.fieldHint}>Must start with /list/</span>
            )}
            {metadata.buildPermalink && isPermalinkValid && (
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
            <span className={styles.fieldLabel}>Images (optional)</span>
            {imageUrls.map((url, i) => (
              <div key={i} className={styles.urlRow}>
                <input
                  type="url"
                  className={styles.fieldInput}
                  placeholder="https://…"
                  value={url}
                  onChange={(e) => {
                    const next = [...imageUrls];
                    next[i] = e.target.value;
                    setImageUrls(next);
                  }}
                />
                {imageUrls.length > 1 && (
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => setImageUrls(imageUrls.filter((_, j) => j !== i))}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <div className={styles.uploadRow}>
              <button
                type="button"
                className={styles.addBtn}
                onClick={() => setImageUrls([...imageUrls, ''])}
              >
                + Add URL
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleImageUpload}
              />
              <button
                type="button"
                className={styles.uploadBtn}
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? 'Uploading…' : '📁 Upload Image'}
              </button>
              {uploading && <span className={styles.uploadStatus}>Uploading…</span>}
            </div>
            {imageUrls.filter((u) => u.trim()).length > 0 && (
              <div className={styles.imagePreview}>
                {imageUrls.filter((u) => u.trim()).map((url, i) => (
                  <img key={i} src={url} alt={`Preview ${i + 1}`} className={styles.previewThumb} />
                ))}
              </div>
            )}
          </div>

        <div className={styles.formActions}>
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
