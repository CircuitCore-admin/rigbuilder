import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import styles from './BuildPage.module.scss';
import { api } from '../../utils/api';
import { useBuildStore } from '../../stores/buildStore';
import type { Build } from '../../types/build';

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; username: string; avatarUrl?: string };
  replies?: Comment[];
}

const RATING_LABELS: Record<string, string> = {
  comfort: 'Comfort',
  immersion: 'Immersion',
  difficulty: 'Build Difficulty',
  noise: 'Noise Level',
};

export function BuildPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [build, setBuild] = useState<Build | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [upvoted, setUpvoted] = useState(false);
  const [upvoteCount, setUpvoteCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Fetch build data
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api<Build>(`/builds/${id}`),
      api<{ upvoted: boolean }>(`/upvotes/build/${id}`).catch(() => ({ upvoted: false })),
      api<{ items: Comment[] }>(`/comments/build/${id}?limit=50`).catch(() => ({ items: [] })),
    ])
      .then(([buildData, upvoteData, commentData]) => {
        setBuild(buildData);
        setUpvoted(upvoteData.upvoted);
        setUpvoteCount(buildData.upvoteCount);
        setComments(commentData.items);
      })
      .catch(() => setError('Build not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleClone = useCallback(() => {
    if (!build) return;
    useBuildStore.getState().cloneBuild(build);
    navigate('/');
  }, [build, navigate]);

  const handleUpvote = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api<{ upvoted: boolean; upvoteCount?: number }>(`/upvotes/build/${id}`, { method: 'POST' });
      setUpvoted(res.upvoted);
      if (res.upvoteCount != null) setUpvoteCount(res.upvoteCount);
    } catch {
      // Not logged in or error
    }
  }, [id]);

  const handlePostComment = useCallback(async () => {
    if (!id || !newComment.trim()) return;
    setSubmittingComment(true);
    try {
      const comment = await api<Comment>(`/comments/build/${id}`, {
        method: 'POST',
        body: { body: newComment.trim() },
      });
      setComments((prev) => [comment, ...prev]);
      setNewComment('');
    } catch {
      // Not logged in or error
    } finally {
      setSubmittingComment(false);
    }
  }, [id, newComment]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Loading build…</span>
        </div>
      </div>
    );
  }

  if (error || !build) {
    return (
      <div className={styles.page}>
        <div className={styles.errorState}>
          <h2>Build not found</h2>
          <Link to="/builds" className={styles.backLink}>← Back to Gallery</Link>
        </div>
      </div>
    );
  }

  const images = build.images ?? [];
  const ratings = build.ratings ?? {};

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <header className={styles.topBar}>
        <Link to="/" className={styles.logo}>
          Rig<span>Builder</span>
        </Link>
        <nav className={styles.nav}>
          <Link to="/builds" className={styles.navLink}>Builds</Link>
          <Link to="/" className={styles.navLink}>Configurator</Link>
        </nav>
      </header>

      {/* Breadcrumb */}
      <div className={styles.container}>
        <div className={styles.breadcrumb}>
          <Link to="/builds">Gallery</Link>
          <span className={styles.breadcrumbSep}>/</span>
          <span>{build.name}</span>
        </div>

        {/* Hero section */}
        <div className={styles.heroSection}>
          <div className={styles.heroInfo}>
            <h1 className={styles.buildName}>{build.name}</h1>
            <div className={styles.ownerRow}>
              <div className={styles.avatar}>
                {build.user.avatarUrl ? (
                  <img src={build.user.avatarUrl} alt="" className={styles.avatarImg} />
                ) : (
                  <span className={styles.avatarFallback}>
                    {build.user.username.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <span className={styles.ownerName}>{build.user.username}</span>
                <span className={styles.buildDate}>
                  {new Date(build.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>

            <div className={styles.metaRow}>
              <span className={styles.metaItem}>
                <span className={styles.metaLabel}>Total Cost</span>
                <span className={styles.metaValue}>
                  £{build.totalCost.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                </span>
              </span>
              <span className={styles.metaItem}>
                <span className={styles.metaLabel}>Components</span>
                <span className={styles.metaValue}>{build.parts.length}</span>
              </span>
              <span className={styles.metaItem}>
                <span className={styles.metaLabel}>Views</span>
                <span className={styles.metaValue}>{build.viewCount}</span>
              </span>
            </div>

            {/* Tags */}
            <div className={styles.tagRow}>
              {build.disciplines.map((d) => (
                <span key={d} className={styles.tag}>{d.charAt(0) + d.slice(1).toLowerCase()}</span>
              ))}
              {build.platforms.map((p) => (
                <span key={p} className={`${styles.tag} ${styles.platformTag}`}>
                  {p === 'PLAYSTATION' ? 'PlayStation' : p === 'XBOX' ? 'Xbox' : p}
                </span>
              ))}
            </div>

            {/* Actions */}
            <div className={styles.actions}>
              <button type="button" className={styles.cloneBtn} onClick={handleClone}>
                🔄 Clone this Build
              </button>
              <button
                type="button"
                className={`${styles.upvoteBtn} ${upvoted ? styles.upvoteActive : ''}`}
                onClick={handleUpvote}
              >
                ▲ {upvoteCount}
              </button>
            </div>
          </div>
        </div>

        {/* Photo Gallery - Masonry */}
        {images.length > 0 && (
          <section className={styles.gallerySection}>
            <h2 className={styles.sectionTitle}>Beauty Shots</h2>
            <div className={styles.masonry}>
              {images.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  className={styles.masonryItem}
                  onClick={() => setLightboxIndex(i)}
                >
                  <img src={src} alt={`${build.name} photo ${i + 1}`} loading="lazy" />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Lightbox */}
        {lightboxIndex !== null && images.length > 0 && (
          <div className={styles.lightbox} onClick={() => setLightboxIndex(null)}>
            <div className={styles.lightboxInner} onClick={(e) => e.stopPropagation()}>
              <button type="button" className={styles.lightboxClose} onClick={() => setLightboxIndex(null)}>
                ✕
              </button>
              <img
                src={images[lightboxIndex]}
                alt={`${build.name} photo ${lightboxIndex + 1}`}
                className={styles.lightboxImg}
              />
              <div className={styles.lightboxNav}>
                <button
                  type="button"
                  disabled={lightboxIndex <= 0}
                  onClick={() => setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : i))}
                >
                  ← Prev
                </button>
                <span>{lightboxIndex + 1} / {images.length}</span>
                <button
                  type="button"
                  disabled={lightboxIndex >= images.length - 1}
                  onClick={() => setLightboxIndex((i) => (i !== null && i < images.length - 1 ? i + 1 : i))}
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Part List */}
        <section className={styles.partsSection}>
          <h2 className={styles.sectionTitle}>Component List</h2>
          <div className={styles.partList}>
            <div className={styles.partHeader}>
              <span>Category</span>
              <span>Product</span>
              <span className={styles.hideOnMobile}>Price Paid</span>
              <span className={styles.hideOnMobile}></span>
            </div>
            {build.parts.map((bp) => (
              <div key={bp.id} className={styles.partRow}>
                <span className={styles.partCategory}>
                  {bp.categorySlot.replace('_', ' ')}
                </span>
                <div className={styles.partInfo}>
                  <span className={styles.partName}>{bp.product.name}</span>
                  <span className={styles.partManufacturer}>{bp.product.manufacturer}</span>
                </div>
                <span className={`${styles.partPrice} ${styles.hideOnMobile}`}>
                  {bp.pricePaid != null
                    ? `£${bp.pricePaid.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`
                    : '—'}
                </span>
                <div className={`${styles.partActions} ${styles.hideOnMobile}`}>
                  {bp.product.affiliateLinks && (
                    <span className={styles.buyLink}>Buy →</span>
                  )}
                </div>
              </div>
            ))}
            <div className={styles.partTotal}>
              <span>Total</span>
              <span className={styles.totalPrice}>
                £{build.totalCost.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </section>

        {/* Build Ratings */}
        {Object.keys(ratings).length > 0 && (
          <section className={styles.ratingsSection}>
            <h2 className={styles.sectionTitle}>Build Ratings</h2>
            <div className={styles.ratingBars}>
              {Object.entries(RATING_LABELS).map(([key, label]) => {
                const value = (ratings as Record<string, number>)[key];
                if (value == null) return null;
                return (
                  <div key={key} className={styles.ratingRow}>
                    <span className={styles.ratingLabel}>{label}</span>
                    <div className={styles.ratingTrack}>
                      <div
                        className={styles.ratingFill}
                        style={{ width: `${(value / 5) * 100}%` }}
                      />
                    </div>
                    <span className={styles.ratingValue}>{value}/5</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Build Story */}
        {build.description && (
          <section className={styles.storySection}>
            <h2 className={styles.sectionTitle}>The Build Story</h2>
            <div
              className={styles.storyContent}
              dangerouslySetInnerHTML={{ __html: build.description }}
            />
          </section>
        )}

        {/* Comments */}
        <section className={styles.commentsSection}>
          <h2 className={styles.sectionTitle}>Comments ({comments.length})</h2>

          {/* New comment form */}
          <div className={styles.commentForm}>
            <textarea
              className={styles.commentInput}
              placeholder="Share your thoughts on this build..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
            />
            <button
              type="button"
              className={styles.commentSubmit}
              disabled={!newComment.trim() || submittingComment}
              onClick={handlePostComment}
            >
              {submittingComment ? 'Posting...' : 'Post Comment'}
            </button>
          </div>

          {/* Comment list */}
          <div className={styles.commentList}>
            {comments.map((c) => (
              <div key={c.id} className={styles.commentItem}>
                <div className={styles.commentHeader}>
                  <div className={styles.commentAvatar}>
                    {c.user.avatarUrl ? (
                      <img src={c.user.avatarUrl} alt="" />
                    ) : (
                      <span>{c.user.username.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <span className={styles.commentAuthor}>{c.user.username}</span>
                  <span className={styles.commentDate}>
                    {new Date(c.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <p className={styles.commentBody}>{c.body}</p>

                {/* Replies */}
                {c.replies && c.replies.length > 0 && (
                  <div className={styles.replies}>
                    {c.replies.map((r) => (
                      <div key={r.id} className={styles.replyItem}>
                        <div className={styles.commentHeader}>
                          <span className={styles.commentAuthor}>{r.user.username}</span>
                          <span className={styles.commentDate}>
                            {new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                        <p className={styles.commentBody}>{r.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
