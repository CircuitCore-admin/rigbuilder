import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Markdown from 'react-markdown';
import { api, resolveImageUrl, ensureCsrfToken } from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/Toast/Toast';
import { MarkdownEditor } from '../../components/MarkdownEditor/MarkdownEditor';
import { VerifiedCreatorBadge } from '../../components/VerifiedCreatorBadge/VerifiedCreatorBadge';
import styles from './ProfilePage.module.scss';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserProfile {
  id: string;
  username: string;
  avatarUrl: string | null;
  bannerUrl?: string | null;
  bannerColor?: string | null;
  bio?: string | null;
  location?: string | null;
  role: string;
  isPro?: boolean;
  reputation?: number;
  pitCred?: number;
  sellerRating?: number | null;
  sellerReviewCount?: number;
  completedSales?: number;
  avgResponseMinutes?: number | null;
  discordUsername?: string | null;
  profileVisibility?: string;
  createdAt: string;
  _count?: { forumThreads: number; marketplaceListings: number };
}

interface ForumThread {
  id: string;
  title: string;
  slug: string;
  category: string;
  body: string;
  score: number;
  replyCount: number;
  viewCount: number;
  imageUrls: string[];
  createdAt: string;
  user: { id: string; username: string; avatarUrl: string | null; pitCred?: number; role?: string };
}

interface MarketplaceListing {
  id: string;
  title: string;
  price: number | null;
  currency: string;
  category: string;
  condition: string | null;
  status: string;
  imageUrls: string[];
  createdAt: string;
  user: { id: string; username: string; avatarUrl: string | null; sellerRating?: number | null };
}

interface MarketplaceReview {
  id: string;
  rating: number;
  body: string | null;
  createdAt: string;
  reviewer: { id: string; username: string; avatarUrl: string | null };
  listing: { id: string; title: string };
}

type TabKey = 'overview' | 'posts' | 'marketplace' | 'saved' | 'reviews' | 'guides';

interface UserBadge {
  id: string;
  badge: string;
  awardedAt: string;
}

const BADGE_LABELS: Record<string, string> = {
  FIRST_POST: 'First Post',
  TEN_POSTS: 'Regular',
  FIFTY_POSTS: 'Prolific',
  FIRST_REPLY: 'First Reply',
  HELPFUL: 'Helpful',
  SUPER_HELPFUL: 'Super Helpful',
  TOP_CONTRIBUTOR: 'Top Contributor',
  EXPERT: 'Expert',
  FIRST_SALE: 'First Sale',
  FIVE_SALES: 'Experienced Seller',
  TRUSTED_SELLER: 'Trusted Seller',
  FIRST_PURCHASE: 'First Purchase',
  BIG_SPENDER: 'Big Spender',
  POPULAR: 'Popular',
  INFLUENCER: 'Influencer',
  EARLY_ADOPTER: 'Early Adopter',
  VERIFIED_EMAIL: 'Verified',
  PROFILE_COMPLETE: 'Profile Complete',
  VERIFIED_OWNER: 'Verified Owner',
};

const BADGE_DESCRIPTIONS: Record<string, string> = {
  FIRST_POST: 'Created your first forum thread',
  TEN_POSTS: 'Created 10 forum threads',
  FIFTY_POSTS: 'Created 50 forum threads',
  FIRST_REPLY: 'Posted your first reply',
  HELPFUL: 'Received 10 upvotes on replies',
  SUPER_HELPFUL: 'Received 50 upvotes on replies',
  TOP_CONTRIBUTOR: 'Earned 100+ Pit Cred',
  EXPERT: 'Earned 500+ Pit Cred',
  FIRST_SALE: 'Completed your first sale',
  FIVE_SALES: 'Completed 5 sales',
  TRUSTED_SELLER: '10+ sales with 4.5+ rating',
  FIRST_PURCHASE: 'Made your first purchase',
  BIG_SPENDER: 'Made 5+ purchases',
  POPULAR: 'Gained 10 followers',
  INFLUENCER: 'Gained 50 followers',
  EARLY_ADOPTER: 'Joined during early access',
  VERIFIED_EMAIL: 'Email verified',
  PROFILE_COMPLETE: 'Bio, avatar, and location set',
  VERIFIED_OWNER: 'Verified product owner',
};

const BADGE_ICONS: Record<string, string> = {
  FIRST_POST: '📝', TEN_POSTS: '✍️', FIFTY_POSTS: '🏆',
  FIRST_REPLY: '💬', HELPFUL: '👍', SUPER_HELPFUL: '⭐',
  TOP_CONTRIBUTOR: '🔥', EXPERT: '🧠', VERIFIED_OWNER: '✅',
  FIRST_SALE: '🏷️', FIVE_SALES: '📦', TRUSTED_SELLER: '🛡️',
  FIRST_PURCHASE: '🛒', BIG_SPENDER: '💰',
  POPULAR: '👥', INFLUENCER: '🌟',
  EARLY_ADOPTER: '🚀', VERIFIED_EMAIL: '📧', PROFILE_COMPLETE: '🎯',
};

const CURRENCY_SYMBOLS: Record<string, string> = { GBP: '\u00A3', EUR: '\u20AC', USD: '$', SEK: 'kr ', NOK: 'kr ', DKK: 'kr ', CHF: 'CHF ' };

function formatPrice(price: number | null, currency: string): string {
  if (price === null || price === undefined) return 'Price on request';
  const sym = CURRENCY_SYMBOLS[currency] ?? currency + ' ';
  return `${sym}${price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function renderStars(rating: number): string {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return '\u2605'.repeat(full) + (half ? '\u00BD' : '') + '\u2606'.repeat(empty);
}

// ---------------------------------------------------------------------------
// Profile Page
// ---------------------------------------------------------------------------

export function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user: authUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [reviews, setReviews] = useState<MarketplaceReview[]>([]);
  const [savedListings, setSavedListings] = useState<MarketplaceListing[]>([]);
  const [guides, setGuides] = useState<any[]>([]);

  // Badge state
  const [badges, setBadges] = useState<UserBadge[]>([]);

  // Block state
  const [isBlocked, setIsBlocked] = useState(false);

  // Follow state
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editDiscord, setEditDiscord] = useState('');
  const [editBannerColor, setEditBannerColor] = useState('#1a1a2e');

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const isOwnProfile = authUser?.username === username;

  // Fetch profile
  useEffect(() => {
    if (!username) return;
    setLoading(true);
    api<UserProfile>(`/users/${encodeURIComponent(username)}`)
      .then(p => { setProfile(p); setLoading(false); })
      .catch(() => { setProfile(null); setLoading(false); });
  }, [username]);

  // Check block status
  useEffect(() => {
    if (!authUser || !username || isOwnProfile) return;
    api<{ blocked: boolean }>(`/users/${encodeURIComponent(username)}/block`)
      .then(d => setIsBlocked(d.blocked))
      .catch(() => {});
  }, [authUser, username, isOwnProfile]);

  // Fetch follow data
  useEffect(() => {
    if (!username) return;
    api<{ count: number }>(`/users/${encodeURIComponent(username)}/followers`)
      .then(d => setFollowerCount(d.count))
      .catch(() => {});
    api<{ count: number }>(`/users/${encodeURIComponent(username)}/following`)
      .then(d => setFollowingCount(d.count))
      .catch(() => {});
    if (authUser && !isOwnProfile) {
      api<{ following: boolean }>(`/users/${encodeURIComponent(username)}/is-following`)
        .then(d => setIsFollowing(d.following))
        .catch(() => {});
    }
  }, [username, authUser, isOwnProfile]);

  // Fetch badges
  useEffect(() => {
    if (!username) return;
    api<UserBadge[]>(`/users/${encodeURIComponent(username)}/badges`)
      .then(setBadges)
      .catch(() => {});
  }, [username]);

  const handleToggleBlock = async () => {
    if (!username) return;
    try {
      const result = await api<{ blocked: boolean }>(`/users/${encodeURIComponent(username)}/block`, { method: 'POST' });
      setIsBlocked(result.blocked);
      showToast(result.blocked ? 'User blocked' : 'User unblocked', 'success');
    } catch { showToast('Failed', 'error'); }
  };

  const handleToggleFollow = async () => {
    if (!username) return;
    try {
      const result = await api<{ following: boolean }>(`/users/${encodeURIComponent(username)}/follow`, { method: 'POST' });
      setIsFollowing(result.following);
      setFollowerCount(prev => result.following ? prev + 1 : prev - 1);
    } catch { showToast('Failed to follow', 'error'); }
  };

  // Fetch tab data
  useEffect(() => {
    if (!username || !profile) return;

    if (activeTab === 'posts' || activeTab === 'overview') {
      api<{ items: ForumThread[] }>(`/users/${encodeURIComponent(username)}/threads?limit=10`)
        .then(d => setThreads(d.items))
        .catch(() => {});
    }
    if (activeTab === 'marketplace' || activeTab === 'overview') {
      api<{ items: MarketplaceListing[] }>(`/users/${encodeURIComponent(username)}/listings?limit=10`)
        .then(d => setListings(d.items))
        .catch(() => {});
    }
    if (activeTab === 'reviews' || activeTab === 'overview') {
      api<MarketplaceReview[]>(`/users/${encodeURIComponent(username)}/reviews`)
        .then(r => setReviews(r))
        .catch(() => {});
    }
    if (activeTab === 'saved' && isOwnProfile) {
      api<{ items: MarketplaceListing[] }>('/marketplace/wishlisted')
        .then(d => setSavedListings(d.items))
        .catch(() => {});
    }
    if (activeTab === 'guides') {
      if (isOwnProfile) {
        api<any[]>('/guides/mine')
          .then(setGuides)
          .catch(() => {});
      } else {
        api<{ items: any[] }>(`/guides?authorId=${profile.id}`)
          .then(d => setGuides(d.items ?? []))
          .catch(() => {});
      }
    }
  }, [username, profile, activeTab]);

  // Upload handler
  const handleUpload = useCallback(async (file: File, field: 'avatarUrl' | 'bannerUrl') => {
    const form = new FormData();
    form.append('image', file);
    const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1';
    const csrfToken = await ensureCsrfToken();
    const headers: Record<string, string> = {};
    if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
    try {
      const res = await fetch(`${baseUrl}/uploads`, { method: 'POST', credentials: 'include', headers, body: form });
      if (!res.ok) { showToast('Upload failed', 'error'); return; }
      const data = await res.json() as { url: string };
      await api('/users/profile', { method: 'PUT', body: { [field]: data.url } });
      setProfile(prev => prev ? { ...prev, [field]: data.url } : prev);
      showToast(field === 'avatarUrl' ? 'Avatar updated' : 'Banner updated');
    } catch { showToast('Upload failed', 'error'); }
  }, [showToast]);

  const handleAvatarUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file, 'avatarUrl');
  }, [handleUpload]);

  const handleBannerUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file, 'bannerUrl');
  }, [handleUpload]);

  const handleSaveProfile = async () => {
    try {
      await api('/users/profile', {
        method: 'PUT',
        body: {
          bio: editBio || null,
          location: editLocation || null,
          discordUsername: editDiscord || null,
          bannerColor: editBannerColor,
        },
      });
      setProfile(prev => prev ? {
        ...prev,
        bio: editBio || null,
        location: editLocation || null,
        discordUsername: editDiscord || null,
        bannerColor: editBannerColor,
      } : prev);
      setIsEditing(false);
      showToast('Profile updated');
    } catch { showToast('Failed to update profile', 'error'); }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (loading) {
    return <div className={styles.profilePage}><div className={styles.loadingState}>Loading profile...</div></div>;
  }
  if (!profile) {
    return <div className={styles.profilePage}><div className={styles.loadingState}>User not found</div></div>;
  }

  // Private profile (non-owner view)
  if (profile.profileVisibility === 'PRIVATE' && !isOwnProfile) {
    return (
      <div className={styles.profilePage}>
        <div
          className={styles.profileBanner}
          style={{
            backgroundImage: profile.bannerUrl ? `url(${resolveImageUrl(profile.bannerUrl)})` : undefined,
            backgroundColor: profile.bannerColor ?? '#1a1a2e',
          }}
        />
        <div className={styles.profileHeaderContent}>
          <div className={styles.avatarWrapper}>
            {profile.avatarUrl ? (
              <img src={resolveImageUrl(profile.avatarUrl)} alt="" className={styles.avatarLarge} />
            ) : (
              <div className={styles.avatarPlaceholder}>{profile.username[0].toUpperCase()}</div>
            )}
          </div>
          <div className={styles.profileInfo}>
            <h1 className={styles.profileUsername}>{profile.username}</h1>
            <div className={styles.privateNotice}>This profile is private.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.profilePage}>
      {/* Banner */}
      <div
        className={styles.profileBanner}
        style={{
          backgroundImage: profile.bannerUrl ? `url(${resolveImageUrl(profile.bannerUrl)})` : undefined,
          backgroundColor: profile.bannerColor ?? '#1a1a2e',
        }}
      >
        {isOwnProfile && isEditing && (
          <div className={styles.bannerEditOverlay}>
            <button className={styles.bannerUploadBtn} onClick={() => bannerInputRef.current?.click()}>
              Upload Banner
            </button>
            <input ref={bannerInputRef} type="file" accept="image/*" hidden onChange={handleBannerUpload} />
            <div className={styles.bannerColorPicker}>
              <label>Or pick a color:</label>
              <input type="color" value={editBannerColor} onChange={e => setEditBannerColor(e.target.value)} />
            </div>
          </div>
        )}
      </div>

      {/* Header content */}
      <div className={styles.profileHeaderContent}>
        <div className={styles.avatarWrapper}>
          {profile.avatarUrl ? (
            <img src={resolveImageUrl(profile.avatarUrl)} alt="" className={styles.avatarLarge} />
          ) : (
            <div className={styles.avatarPlaceholder}>{profile.username[0].toUpperCase()}</div>
          )}
          {isOwnProfile && isEditing && (
            <button className={styles.avatarEditBtn} onClick={() => avatarInputRef.current?.click()}>
              Change
            </button>
          )}
          <input ref={avatarInputRef} type="file" accept="image/*" hidden onChange={handleAvatarUpload} />
        </div>

        <div className={styles.profileInfo}>
          <h1 className={styles.profileUsername}>
            {profile.username}
            {profile.role === 'ADMIN' && <span className={styles.roleBadge}>Admin</span>}
            {profile.role === 'MODERATOR' && <span className={styles.roleBadge}>Mod</span>}
            {profile.isPro && <span className={styles.proBadge}>Pro</span>}
            <VerifiedCreatorBadge role={profile.role} />
          </h1>

          <div className={styles.profileMeta}>
            <span>Member since {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            {profile.location && <span>{profile.location}</span>}
            {profile.discordUsername && <span>Discord: {profile.discordUsername}</span>}
          </div>

          {isEditing ? (
            <div className={styles.editBioSection}>
              <MarkdownEditor
                value={editBio}
                onChange={setEditBio}
                placeholder="Tell people about yourself..."
                rows={4}
                maxLength={2000}
              />
              <div className={styles.editLocationRow}>
                <input
                  className={styles.editInput}
                  placeholder="Location (e.g. London, UK)"
                  value={editLocation}
                  onChange={e => setEditLocation(e.target.value)}
                />
                <input
                  className={styles.editInput}
                  placeholder="Discord username"
                  value={editDiscord}
                  onChange={e => setEditDiscord(e.target.value)}
                />
              </div>
              <div className={styles.editActions}>
                <button className={styles.saveBtn} onClick={handleSaveProfile}>Save</button>
                <button className={styles.cancelEditBtn} onClick={() => setIsEditing(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            profile.bio && (
              <div className={styles.profileBio}>
                <Markdown>{profile.bio}</Markdown>
              </div>
            )
          )}

          <div className={styles.profileStats}>
            {profile.pitCred != null && (
              <div className={styles.stat}>
                <span className={styles.statValue}>{profile.pitCred}</span>
                <span className={styles.statLabel}>Pit Cred</span>
              </div>
            )}
            <div className={styles.stat}>
              <span className={styles.statValue}>{profile._count?.forumThreads ?? 0}</span>
              <span className={styles.statLabel}>Posts</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{profile._count?.marketplaceListings ?? 0}</span>
              <span className={styles.statLabel}>Listings</span>
            </div>
            {profile.sellerRating != null && (
              <div className={styles.stat}>
                <span className={styles.statValue}>{renderStars(profile.sellerRating)}</span>
                <span className={styles.statLabel}>{profile.sellerReviewCount ?? 0} reviews</span>
              </div>
            )}
            <div className={styles.stat}>
              <span className={styles.statValue}>{profile.completedSales ?? 0}</span>
              <span className={styles.statLabel}>Sales</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{followerCount}</span>
              <span className={styles.statLabel}>Followers</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{followingCount}</span>
              <span className={styles.statLabel}>Following</span>
            </div>
          </div>

          {badges.length > 0 && (
            <div className={styles.badgeSection}>
              <h3 className={styles.badgeSectionTitle}>Achievements</h3>
              <div className={styles.badgeGrid}>
                {badges.map(b => (
                  <div key={b.id} className={styles.badgeItem} title={BADGE_DESCRIPTIONS[b.badge] ?? b.badge}>
                    <span className={styles.badgeIcon}>{BADGE_ICONS[b.badge] ?? '🏅'}</span>
                    <span className={styles.badgeName}>{BADGE_LABELS[b.badge] ?? b.badge}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isOwnProfile && authUser && (
            <button
              className={`${styles.followBtn} ${isFollowing ? styles.followBtnActive : ''}`}
              onClick={handleToggleFollow}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          )}

          {isOwnProfile && !isEditing && (
            <button className={styles.editProfileBtn} onClick={() => {
              setEditBio(profile.bio ?? '');
              setEditLocation(profile.location ?? '');
              setEditDiscord(profile.discordUsername ?? '');
              setEditBannerColor(profile.bannerColor ?? '#1a1a2e');
              setIsEditing(true);
            }}>
              Edit Profile
            </button>
          )}
          {!isOwnProfile && authUser && (
            <button className={styles.blockBtn} onClick={handleToggleBlock}>
              {isBlocked ? 'Unblock User' : 'Block User'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabBar}>
        {(isOwnProfile
          ? ['overview', 'posts', 'marketplace', 'saved', 'reviews', 'guides'] as const
          : ['overview', 'posts', 'marketplace', 'reviews', 'guides'] as const
        ).map(tab => (
          <button
            key={tab}
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'overview' ? 'Overview' : tab === 'posts' ? 'Forum Posts' : tab === 'marketplace' ? 'Marketplace' : tab === 'saved' ? 'Saved' : tab === 'guides' ? 'Guides' : 'Reviews'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className={styles.tabContent}>
        {/* Overview tab */}
        {activeTab === 'overview' && (
          <>
            {threads.length > 0 && (
              <section className={styles.overviewSection}>
                <div className={styles.overviewSectionHeader}>
                  <h2 className={styles.overviewSectionTitle}>Recent Posts</h2>
                  <button className={styles.viewAllBtn} onClick={() => setActiveTab('posts')}>View all</button>
                </div>
                <div className={styles.threadList}>
                  {threads.slice(0, 5).map(t => (
                    <ThreadCard key={t.id} thread={t} onClick={() => navigate(`/community/${t.slug}`)} />
                  ))}
                </div>
              </section>
            )}
            {listings.length > 0 && (
              <section className={styles.overviewSection}>
                <div className={styles.overviewSectionHeader}>
                  <h2 className={styles.overviewSectionTitle}>Marketplace Listings</h2>
                  <button className={styles.viewAllBtn} onClick={() => setActiveTab('marketplace')}>View all</button>
                </div>
                <div className={styles.listingsGrid}>
                  {listings.slice(0, 4).map(l => (
                    <ListingCard key={l.id} listing={l} onClick={() => navigate(`/marketplace/${l.id}`)} />
                  ))}
                </div>
              </section>
            )}
            {reviews.length > 0 && (
              <section className={styles.overviewSection}>
                <div className={styles.overviewSectionHeader}>
                  <h2 className={styles.overviewSectionTitle}>Recent Reviews</h2>
                  <button className={styles.viewAllBtn} onClick={() => setActiveTab('reviews')}>View all</button>
                </div>
                {reviews.slice(0, 3).map(r => (
                  <ReviewCard key={r.id} review={r} />
                ))}
              </section>
            )}
            {threads.length === 0 && listings.length === 0 && reviews.length === 0 && (
              <div className={styles.emptyState}>No activity yet</div>
            )}
          </>
        )}

        {/* Posts tab */}
        {activeTab === 'posts' && (
          threads.length > 0 ? (
            <div className={styles.threadList}>
              {threads.map(t => (
                <ThreadCard key={t.id} thread={t} onClick={() => navigate(`/community/${t.slug}`)} />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>No forum posts yet</div>
          )
        )}

        {/* Marketplace tab */}
        {activeTab === 'marketplace' && (
          listings.length > 0 ? (
            <div className={styles.listingsGrid}>
              {listings.map(l => (
                <ListingCard key={l.id} listing={l} onClick={() => navigate(`/marketplace/${l.id}`)} />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>No marketplace listings yet</div>
          )
        )}

        {/* Saved tab (own profile only) */}
        {activeTab === 'saved' && isOwnProfile && (
          savedListings.length > 0 ? (
            <div className={styles.listingsGrid}>
              {savedListings.map(l => (
                <ListingCard key={l.id} listing={l} onClick={() => navigate(`/marketplace/${l.id}`)} />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>No saved listings yet</div>
          )
        )}

        {/* Reviews tab */}
        {activeTab === 'reviews' && (
          reviews.length > 0 ? (
            <div className={styles.reviewsList}>
              {reviews.map(r => <ReviewCard key={r.id} review={r} />)}
            </div>
          ) : (
            <div className={styles.emptyState}>No reviews yet</div>
          )
        )}

        {/* Guides tab */}
        {activeTab === 'guides' && (
          guides.length > 0 ? (
            <div className={styles.guidesList}>
              {guides.map((g: any) => (
                <a key={g.id} href={g.isPublished ? `/guides/${g.slug}` : `/guides/edit/${g.id}`} className={styles.guideCard}>
                  <div className={styles.guideCardBody}>
                    <div className={styles.guideCardTop}>
                      <span className={`${styles.guideStatusBadge} ${
                        g.status === 'PUBLISHED' ? styles.statusPublished :
                        g.status === 'PENDING_REVIEW' ? styles.statusPending :
                        g.status === 'REJECTED' ? styles.statusRejected :
                        styles.statusDraft
                      }`}>
                        {g.status === 'PUBLISHED' ? 'Published' :
                         g.status === 'PENDING_REVIEW' ? 'Pending Review' :
                         g.status === 'REJECTED' ? 'Needs Revision' : 'Draft'}
                      </span>
                      <span className={styles.guideMeta}>
                        {g.publishedAt
                          ? new Date(g.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : relativeTime(g.createdAt)}
                      </span>
                    </div>
                    <h3 className={styles.guideCardTitle}>{g.title}</h3>
                    {g.excerpt && <p className={styles.guideCardExcerpt}>{g.excerpt}</p>}
                    {g.rejectionReason && (
                      <p className={styles.guideRejectionNote}>Feedback: {g.rejectionReason}</p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              {isOwnProfile ? 'No guides yet — write your first guide!' : 'No published guides'}
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ThreadCard({ thread: t, onClick }: { thread: ForumThread; onClick: () => void }) {
  return (
    <a href={`/community/${t.slug}`} className={styles.threadRow} onClick={e => { e.preventDefault(); onClick(); }}>
      <div className={styles.threadCardContent}>
        <div className={styles.threadCardTopLine}>
          <span className={styles.categoryPill}>{t.category}</span>
          <span className={styles.threadMeta}>{relativeTime(t.createdAt)}</span>
        </div>
        <span className={styles.threadTitle}>{t.title}</span>
        <span className={styles.threadSnippet}>
          {t.body.replace(/[#*_~`>\[\]()!]/g, '').slice(0, 120)}
          {t.body.length > 120 ? '...' : ''}
        </span>
        <div className={styles.threadFooter}>
          <span>{t.replyCount} {t.replyCount === 1 ? 'reply' : 'replies'}</span>
          <span>{t.viewCount} views</span>
          <span>Score: {t.score}</span>
        </div>
      </div>
      {t.imageUrls?.[0] && (
        <div className={styles.threadCardImages}>
          <img src={resolveImageUrl(t.imageUrls[0])} alt="" className={styles.threadCardImageMain} />
        </div>
      )}
    </a>
  );
}

function ListingCard({ listing: l, onClick }: { listing: MarketplaceListing; onClick: () => void }) {
  return (
    <a href={`/marketplace/${l.id}`} className={styles.gridCard} onClick={e => { e.preventDefault(); onClick(); }}>
      <div className={styles.gridCardImageWrap}>
        {l.imageUrls?.[0] ? (
          <img src={resolveImageUrl(l.imageUrls[0])} alt="" className={styles.gridCardImage} />
        ) : (
          <div className={styles.gridCardNoImage}>No image</div>
        )}
        {l.status !== 'ACTIVE' && (
          <span className={styles.gridCardStatusBadge}>{l.status}</span>
        )}
      </div>
      <div className={styles.gridCardBody}>
        <span className={styles.gridCardTitle}>{l.title}</span>
        <span className={styles.gridCardPrice}>{formatPrice(l.price, l.currency)}</span>
        <span className={styles.gridCardMeta}>
          {l.condition && <span>{l.condition}</span>}
          <span>{relativeTime(l.createdAt)}</span>
        </span>
      </div>
    </a>
  );
}

function ReviewCard({ review: r }: { review: MarketplaceReview }) {
  return (
    <div className={styles.reviewCard}>
      <div className={styles.reviewHeader}>
        <a href={`/profile/${r.reviewer.username}`} className={styles.reviewAuthor}>
          {r.reviewer.avatarUrl && (
            <img src={resolveImageUrl(r.reviewer.avatarUrl)} alt="" className={styles.reviewAvatar} />
          )}
          <span>{r.reviewer.username}</span>
        </a>
        <span className={styles.reviewStars}>{renderStars(r.rating)}</span>
        <span className={styles.reviewTime}>{relativeTime(r.createdAt)}</span>
      </div>
      {r.listing && (
        <a href={`/marketplace/${r.listing.id}`} className={styles.reviewListing}>Re: {r.listing.title}</a>
      )}
      {r.body && <p className={styles.reviewBody}>{r.body}</p>}
    </div>
  );
}
