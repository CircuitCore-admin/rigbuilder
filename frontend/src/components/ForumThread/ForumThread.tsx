import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Markdown from 'react-markdown';
import { api, resolveImageUrl } from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';
import { VerifiedCreatorBadge } from '../VerifiedCreatorBadge/VerifiedCreatorBadge';
import { EmbedBuildCard } from '../EmbedBuildCard/EmbedBuildCard';
import { MarkdownEditor } from '../MarkdownEditor/MarkdownEditor';
import { useToast } from '../Toast/Toast';
import { CloseIcon, ChevronLeftIcon, ChevronRightIcon, UpArrowIcon, DownArrowIcon, ChatIcon, EyeIcon, ShareIcon } from '../Icons/ForumIcons';
import styles from './ForumThread.module.scss';

interface ThreadUser {
  id: string;
  username: string;
  avatarUrl: string | null;
  reputation: number;
  role?: string;
  pitCred?: number;
}

interface ThreadProduct {
  id: string;
  name: string;
  slug: string;
  category: string;
}

interface Reply {
  id: string;
  threadId: string;
  userId: string;
  body: string;
  parentId: string | null;
  upvotes: number;
  createdAt: string;
  user: ThreadUser;
  children?: Reply[];
}

interface Thread {
  id: string;
  title: string;
  slug: string;
  body: string;
  category: string;
  userId: string;
  viewCount: number;
  replyCount: number;
  score: number;
  upvotes: number;
  downvotes: number;
  createdAt: string;
  user: ThreadUser;
  product: ThreadProduct | null;
  metadata?: Record<string, unknown>;
  imageUrls?: string[];
  link?: string | null;
}

interface ForumThreadProps {
  slug: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  TROUBLESHOOTING: 'Troubleshooting',
  BUILD_ADVICE: 'Build Advice',
  DIY_MODS: 'DIY Mods',
  SHOWROOM: 'Showroom',
  TELEMETRY: 'Telemetry',
  DEALS: 'Deals',
  GENERAL: 'General',
};

function getBadges(reputation: number, role?: string): string[] {
  const badges: string[] = [];
  if (role === 'ADMIN' || role === 'MODERATOR') badges.push('Staff');
  if (role === 'MANUFACTURER') badges.push('Verified Owner');
  if (role === 'CREATOR') badges.push('Verified Creator');
  if (reputation >= 100) badges.push('Top Contributor');
  if (reputation >= 50) badges.push('Expert');
  else if (reputation >= 10) badges.push('Helpful');
  return badges;
}

// ---------------------------------------------------------------------------
// Lightbox Modal
// ---------------------------------------------------------------------------

function LightboxModal({
  images,
  startIndex,
  onClose,
}: {
  images: string[];
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [transitioning, setTransitioning] = useState(false);

  const navigate = useCallback((newIndex: number) => {
    setTransitioning(true);
    setTimeout(() => {
      setIndex(newIndex);
      setTransitioning(false);
    }, 150);
  }, []);

  const goPrev = useCallback(() => navigate(index > 0 ? index - 1 : images.length - 1), [index, images.length, navigate]);
  const goNext = useCallback(() => navigate(index < images.length - 1 ? index + 1 : 0), [index, images.length, navigate]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, goPrev, goNext]);

  return (
    <div className={styles.lightbox} onClick={onClose}>
      <button className={styles.lightboxClose} onClick={onClose}><CloseIcon size={24} /></button>
      {images.length > 1 && (
        <button
          className={`${styles.lightboxArrow} ${styles.lightboxArrowLeft}`}
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
        >
          <ChevronLeftIcon size={24} />
        </button>
      )}
      <img
        src={resolveImageUrl(images[index])}
        alt={`Photo ${index + 1}`}
        className={`${styles.lightboxImage} ${transitioning ? styles.lightboxImageFade : ''}`}
        onClick={(e) => e.stopPropagation()}
      />
      {images.length > 1 && (
        <>
          <button
            className={`${styles.lightboxArrow} ${styles.lightboxArrowRight}`}
            onClick={(e) => { e.stopPropagation(); goNext(); }}
          >
            <ChevronRightIcon size={24} />
          </button>
          <span className={styles.lightboxCounter}>{index + 1} of {images.length}</span>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ForumThread({ slug }: ForumThreadProps) {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [thread, setThread] = useState<Thread | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyBody, setReplyBody] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [inlineReplyId, setInlineReplyId] = useState<string | null>(null);
  const [inlineReplyBody, setInlineReplyBody] = useState('');
  const [threadScore, setThreadScore] = useState(0);
  const [userVote, setUserVote] = useState<1 | -1 | 0>(0);
  const [replyVotes, setReplyVotes] = useState<Record<string, { score: number; userVote: 0 | 1 | -1 }>>({});
  const [collapsedReplies, setCollapsedReplies] = useState<Set<string>>(new Set());
  const [replySort, setReplySort] = useState<'top' | 'newest' | 'oldest'>('top');
  const [threadVoting, setThreadVoting] = useState(false);
  const [replyVotingIds, setReplyVotingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    api<{ thread: Thread; replies: Reply[]; userVote?: number; following?: boolean }>(`/forum/${slug}/full`)
      .then(({ thread: t, replies: r, userVote: uv, following: f }) => {
        setThread(t);
        setReplies(r);
        setThreadScore(t.score ?? 0);
        if (uv !== undefined) setUserVote(uv as 0 | 1 | -1);
        if (f !== undefined) setIsFollowing(f);
        // Initialize reply vote state from server data
        const voteMap: Record<string, { score: number; userVote: 0 | 1 | -1 }> = {};
        for (const reply of r) {
          voteMap[reply.id] = { score: reply.upvotes, userVote: 0 };
        }
        setReplyVotes(voteMap);
      })
      .catch(() => setThread(null))
      .finally(() => setLoading(false));
  }, [slug]);

  const nestedReplies = useMemo(() => {
    // Sort flat replies before building tree
    const sorted = [...replies].sort((a, b) => {
      if (replySort === 'top') return b.upvotes - a.upvotes;
      if (replySort === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    return buildReplyTree(sorted);
  }, [replies, replySort]);

  const handleSubmitReply = async () => {
    if (!replyBody.trim() || submitting) return;
    setSubmitting(true);
    try {
      const newReply = await api<Reply>(`/forum/${slug}/replies`, {
        method: 'POST',
        body: { body: replyBody, parentId: replyingTo ?? undefined },
      });
      setReplies((prev) => [...prev, newReply]);
      setReplyBody('');
      setReplyingTo(null);
      showToast('Reply posted', 'success');
    } catch { /* silently fail */ }
    finally { setSubmitting(false); }
  };

  const handleSubmitInlineReply = async () => {
    if (!inlineReplyBody.trim() || submitting || !inlineReplyId) return;
    setSubmitting(true);
    try {
      const newReply = await api<Reply>(`/forum/${slug}/replies`, {
        method: 'POST',
        body: { body: inlineReplyBody, parentId: inlineReplyId },
      });
      setReplies((prev) => [...prev, newReply]);
      setInlineReplyBody('');
      setInlineReplyId(null);
      setReplyingTo(null);
      showToast('Reply posted', 'success');
    } catch { /* silently fail */ }
    finally { setSubmitting(false); }
  };

  const handleCancelInlineReply = () => {
    setInlineReplyId(null);
    setInlineReplyBody('');
    setReplyingTo(null);
  };

  const handleReplyToComment = (id: string) => {
    setInlineReplyId(id);
    setReplyingTo(id);
    setInlineReplyBody('');
  };

  const handleReplyVote = async (replyId: string, clickedValue: 1 | -1) => {
    if (!authUser) {
      showToast('Log in to vote', 'error');
      return;
    }
    if (replyVotingIds.has(replyId)) return;
    setReplyVotingIds(prev => new Set(prev).add(replyId));

    const current = replyVotes[replyId] ?? { score: 0, userVote: 0 };
    let sendValue: 0 | 1 | -1;
    if (current.userVote === clickedValue) {
      sendValue = 0;
    } else {
      sendValue = clickedValue;
    }

    const scoreDelta = sendValue - current.userVote;

    // Optimistic update
    setReplyVotes(prev => ({
      ...prev,
      [replyId]: { score: current.score + scoreDelta, userVote: sendValue as 0 | 1 | -1 },
    }));

    try {
      const result = await api<{ score: number; userVote: number }>(`/forum/replies/${replyId}/vote`, {
        method: 'POST',
        body: { value: sendValue },
      });
      setReplyVotes(prev => ({
        ...prev,
        [replyId]: { score: result.score, userVote: result.userVote as 0 | 1 | -1 },
      }));
    } catch (err) {
      setReplyVotes(prev => ({ ...prev, [replyId]: current }));
      const message = err instanceof Error ? err.message : 'Vote failed';
      showToast(message, 'error');
    } finally {
      setReplyVotingIds(prev => {
        const next = new Set(prev);
        next.delete(replyId);
        return next;
      });
    }
  };

  const handleShareReply = (replyId: string) => {
    if (!thread) return;
    const url = `${window.location.origin}/community/${thread.slug}#reply-${replyId}`;
    navigator.clipboard.writeText(url).then(() => {
      showToast('Link copied to clipboard', 'success');
    }).catch(() => {
      showToast('Failed to copy link', 'error');
    });
  };

  const toggleCollapseReply = useCallback((replyId: string) => {
    setCollapsedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(replyId)) next.delete(replyId);
      else next.add(replyId);
      return next;
    });
  }, []);

  const handleDelete = async () => {
    if (!thread) return;
    if (!window.confirm('Are you sure you want to delete this thread?')) return;
    try {
      await api(`/forum/${thread.id}`, { method: 'DELETE' });
      showToast('Thread deleted', 'success');
      navigate('/community');
    } catch { /* silently fail */ }
  };

  const handleStartEdit = () => {
    if (!thread) return;
    setEditTitle(thread.title);
    setEditBody(thread.body);
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!thread || saving) return;
    setSaving(true);
    try {
      const updated = await api<Thread>(`/forum/${thread.id}`, {
        method: 'PUT',
        body: { title: editTitle.trim(), body: editBody.trim() },
      });
      setThread(updated);
      setEditing(false);
      showToast('Thread updated', 'success');
    } catch { /* silently fail */ }
    finally { setSaving(false); }
  };

  const handleToggleFollow = async () => {
    if (!thread || followLoading) return;
    setFollowLoading(true);
    try {
      const result = await api<{ following: boolean }>(`/forum/threads/${thread.id}/follow`, { method: 'POST' });
      setIsFollowing(result.following);
    } catch { /* silently fail */ }
    finally { setFollowLoading(false); }
  };

  const handleThreadVote = async (clickedValue: 1 | -1) => {
    if (!thread || !authUser || threadVoting) return;
    setThreadVoting(true);

    // Determine what value to send: toggle off if clicking same direction, otherwise apply
    let sendValue: 0 | 1 | -1;
    if (userVote === clickedValue) {
      sendValue = 0; // Toggle off — user clicked the same arrow
    } else {
      sendValue = clickedValue; // Apply new vote
    }

    const prevScore = threadScore;
    const prevVote = userVote;

    // Optimistic update
    const scoreDelta = sendValue - prevVote;
    setUserVote(sendValue as 0 | 1 | -1);
    setThreadScore(prevScore + scoreDelta);

    try {
      const result = await api<{ score: number; userVote: number }>(`/forum/threads/${thread.id}/vote`, {
        method: 'POST',
        body: { value: sendValue },
      });
      setThreadScore(result.score);
      setUserVote(result.userVote as 0 | 1 | -1);
    } catch (err) {
      setUserVote(prevVote);
      setThreadScore(prevScore);
      showToast(err instanceof Error ? err.message : 'Vote failed', 'error');
    } finally {
      setThreadVoting(false);
    }
  };

  const handleShareThread = () => {
    if (!thread) return;
    const url = `${window.location.origin}/community/${thread.slug}`;
    navigator.clipboard.writeText(url).then(() => {
      showToast('Link copied to clipboard', 'success');
    }).catch(() => {
      showToast('Failed to copy link', 'error');
    });
  };

  const canModify = thread && authUser && (
    authUser.userId === thread.userId ||
    authUser.role === 'ADMIN' ||
    authUser.role === 'MODERATOR'
  );

  // Resolve the username of the reply being replied to
  const replyingToUsername = replyingTo
    ? replies.find((r) => r.id === replyingTo)?.user.username ?? null
    : null;

  if (loading) return <div className={styles.loading}>Loading discussion…</div>;
  if (!thread) return <div className={styles.notFound}>Discussion not found</div>;

  return (
    <div className={styles.container}>
      {editing ? (
        <div className={styles.editForm}>
          <input
            type="text"
            className={styles.editInput}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
          />
          <MarkdownEditor value={editBody} onChange={setEditBody} rows={8} />
          <div className={styles.editActions}>
            <button
              className={styles.saveBtn}
              onClick={handleSaveEdit}
              disabled={saving || !editTitle.trim() || !editBody.trim()}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button className={styles.cancelBtn} onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.threadLayout}>
          {/* Vote column */}
          <div className={styles.voteColumn}>
            <button
              className={`${styles.voteBtn} ${styles.voteBtnUp} ${userVote === 1 ? styles.voteBtnUpActive : ''}`}
              onClick={() => handleThreadVote(1)}
              disabled={threadVoting}
              title="Upvote"
            >
              <UpArrowIcon size={18} />
            </button>
            <span className={styles.voteScore}>{threadScore}</span>
            <button
              className={`${styles.voteBtn} ${styles.voteBtnDown} ${userVote === -1 ? styles.voteBtnDownActive : ''}`}
              onClick={() => handleThreadVote(-1)}
              disabled={threadVoting}
              title="Downvote"
            >
              <DownArrowIcon size={18} />
            </button>
          </div>

          {/* Thread content */}
          <div className={styles.threadContent}>
            <div className={styles.threadTopLine}>
              <span className={styles.categoryTag}>
                {CATEGORY_LABELS[thread.category] ?? thread.category}
              </span>
              <span className={styles.threadMetaText}>
                Posted by <UserBadge user={thread.user} />
                {thread.user.pitCred != null && (
                  <span className={styles.pitCredBadge}>{Math.max(0, thread.user.pitCred)} PC</span>
                )}
                <span className={styles.metaDot}>·</span>
                <time>{new Date(thread.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</time>
              </span>
            </div>

            <h1 className={styles.threadTitle}>{thread.title}</h1>

            {thread.product && (
              <a href={`/products/${thread.product.slug}`} className={styles.linkedProduct}>
                {thread.product.name}
              </a>
            )}
            {thread.link && (
              <a href={thread.link} target="_blank" rel="noopener noreferrer" className={styles.threadLink}>
                {thread.link}
              </a>
            )}

            <div className={styles.threadBody}>
              <Markdown>{thread.body}</Markdown>
            </div>

            {/* Actions bar (Reddit-style) */}
            <div className={styles.threadActionsBar}>
              <span className={styles.actionItem}>
                <ChatIcon size={14} /> {thread.replyCount} {thread.replyCount === 1 ? 'Comment' : 'Comments'}
              </span>
              <span className={styles.actionItem}>
                <EyeIcon size={14} /> {thread.viewCount} Views
              </span>
              <button className={styles.actionBtn} onClick={handleShareThread}>
                <ShareIcon size={14} /> Share
              </button>
              {authUser && (
                <button
                  className={`${styles.actionBtn} ${isFollowing ? styles.actionBtnActive : ''}`}
                  onClick={handleToggleFollow}
                  disabled={followLoading}
                >
                  {followLoading ? '…' : isFollowing ? '✓ Following' : '+ Follow'}
                </button>
              )}
              {canModify && (
                <>
                  <button className={`${styles.actionBtn} ${styles.actionBtnEdit}`} onClick={handleStartEdit}>Edit</button>
                  <button className={`${styles.actionBtn} ${styles.actionBtnDanger}`} onClick={handleDelete}>Delete</button>
                </>
              )}
            </div>

            {/* Mobile vote display (inline) */}
            <div className={styles.mobileVoteRow}>
              <button
                className={`${styles.voteBtn} ${styles.voteBtnUp} ${userVote === 1 ? styles.voteBtnUpActive : ''}`}
                onClick={() => handleThreadVote(1)}
                disabled={threadVoting}
              >
                <UpArrowIcon size={16} />
              </button>
              <span className={styles.voteScore}>{threadScore}</span>
              <button
                className={`${styles.voteBtn} ${styles.voteBtnDown} ${userVote === -1 ? styles.voteBtnDownActive : ''}`}
                onClick={() => handleThreadVote(-1)}
                disabled={threadVoting}
              >
                <DownArrowIcon size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      <ThreadMetadata
        thread={thread}
        lightboxIndex={lightboxIndex}
        setLightboxIndex={setLightboxIndex}
      />

      {lightboxIndex !== null && thread.imageUrls && thread.imageUrls.length > 0 && (
        <LightboxModal
          images={thread.imageUrls}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      <section className={styles.repliesSection}>
        <h3 className={styles.repliesTitle}>
          {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
        </h3>

        <div className={styles.replySortRow}>
          <span className={styles.replySortLabel}>Sort by:</span>
          {(['top', 'newest', 'oldest'] as const).map((opt) => (
            <button
              key={opt}
              className={`${styles.replySortBtn} ${replySort === opt ? styles.replySortBtnActive : ''}`}
              onClick={() => setReplySort(opt)}
            >
              {opt === 'top' ? 'Top' : opt === 'newest' ? 'Newest' : 'Oldest'}
            </button>
          ))}
        </div>

        <div className={styles.replyList}>
          {nestedReplies.map((reply) => (
            <ReplyNode
              key={reply.id}
              reply={reply}
              depth={0}
              onReply={handleReplyToComment}
              onVote={handleReplyVote}
              onShareReply={handleShareReply}
              replyVotes={replyVotes}
              replyVotingIds={replyVotingIds}
              collapsedReplies={collapsedReplies}
              toggleCollapse={toggleCollapseReply}
              inlineReplyId={inlineReplyId}
              inlineReplyBody={inlineReplyBody}
              onInlineReplyBodyChange={setInlineReplyBody}
              onInlineReplySubmit={handleSubmitInlineReply}
              onInlineReplyCancel={handleCancelInlineReply}
              submitting={submitting}
            />
          ))}
        </div>

        {authUser ? (
          <div className={styles.replyForm}>
            {inlineReplyId ? (
              <div className={styles.replyDisabled}>Replying to a comment above…</div>
            ) : (
              <>
                {replyingTo && replyingToUsername && (
                  <div className={styles.replyingTo}>
                    Replying to <span className={styles.replyingToUsername}>@{replyingToUsername}</span>
                    <button className={styles.cancelReply} onClick={() => setReplyingTo(null)}>Cancel</button>
                  </div>
                )}
                <MarkdownEditor
                  value={replyBody}
                  onChange={setReplyBody}
                  rows={4}
                  placeholder="Write your reply (Markdown supported)…"
                />
                <button
                  className={styles.submitReply}
                  onClick={handleSubmitReply}
                  disabled={submitting || !replyBody.trim()}
                >
                  {submitting ? 'Posting…' : 'Post Reply'}
                </button>
              </>
            )}
          </div>
        ) : (
          <div className={styles.loginPrompt}>
            <a href="/login">Log in</a> to join the discussion
          </div>
        )}
      </section>
    </div>
  );
}

function ReplyNode({
  reply, depth, onReply, onVote, onShareReply, replyVotes, replyVotingIds, collapsedReplies, toggleCollapse,
  inlineReplyId, inlineReplyBody, onInlineReplyBodyChange,
  onInlineReplySubmit, onInlineReplyCancel, submitting,
}: {
  reply: Reply & { children?: Reply[] };
  depth: number;
  onReply: (id: string) => void;
  onVote: (id: string, value: 1 | -1) => void;
  onShareReply: (id: string) => void;
  replyVotes: Record<string, { score: number; userVote: 0 | 1 | -1 }>;
  replyVotingIds: Set<string>;
  collapsedReplies: Set<string>;
  toggleCollapse: (id: string) => void;
  inlineReplyId: string | null;
  inlineReplyBody: string;
  onInlineReplyBodyChange: (val: string) => void;
  onInlineReplySubmit: () => void;
  onInlineReplyCancel: () => void;
  submitting: boolean;
}) {
  const badges = getBadges(reply.user.reputation, reply.user.role);
  const showInlineForm = inlineReplyId === reply.id;
  const isCollapsed = collapsedReplies.has(reply.id);
  const vote = replyVotes[reply.id] ?? { score: reply.upvotes, userVote: 0 };
  const timeAgo = new Date(reply.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className={styles.replyNode} id={`reply-${reply.id}`}>
      <div className={styles.replyThreadContainer}>
        {/* Clickable collapse line */}
        <div className={styles.replyCollapseColumn}>
          <div
            className={styles.replyThreadLine}
            onClick={() => toggleCollapse(reply.id)}
            title="Collapse thread"
          />
        </div>

        {/* Reply content */}
        <div className={styles.replyContentColumn}>
          {isCollapsed ? (
            <div className={styles.replyCollapsed} onClick={() => toggleCollapse(reply.id)}>
              <UserBadge user={reply.user} />
              <span className={styles.collapsedMeta}>{vote.score} points · {timeAgo}</span>
              <span className={styles.collapsedExpand}>[+] expand</span>
            </div>
          ) : (
            <>
              <div className={styles.reply}>
                <div className={styles.replyHeader}>
                  <UserBadge user={reply.user} />
                  <VerifiedCreatorBadge role={reply.user.role} />
                  {badges.map((badge) => (
                    <span key={badge} className={styles.badge}>{badge}</span>
                  ))}
                  {reply.user.pitCred != null && (
                    <span className={styles.pitCredBadge}>{Math.max(0, reply.user.pitCred)} PC</span>
                  )}
                  <time className={styles.replyTime}>{timeAgo}</time>
                </div>
                <div className={styles.replyBody}>
                  <Markdown>{reply.body}</Markdown>
                </div>
                <div className={styles.replyActions}>
                  <button
                    className={`${styles.replyVoteBtn} ${styles.replyVoteBtnUp} ${vote.userVote === 1 ? styles.replyVoteBtnUpActive : ''}`}
                    onClick={() => onVote(reply.id, 1)}
                    disabled={replyVotingIds.has(reply.id)}
                    title="Upvote"
                  >
                    <UpArrowIcon size={14} />
                  </button>
                  <span className={styles.replyVoteScore}>{vote.score}</span>
                  <button
                    className={`${styles.replyVoteBtn} ${styles.replyVoteBtnDown} ${vote.userVote === -1 ? styles.replyVoteBtnDownActive : ''}`}
                    onClick={() => onVote(reply.id, -1)}
                    disabled={replyVotingIds.has(reply.id)}
                    title="Downvote"
                  >
                    <DownArrowIcon size={14} />
                  </button>
                  <button className={styles.replyActionBtn} onClick={() => onReply(reply.id)}>
                    <ChatIcon size={14} /> Reply
                  </button>
                  <button className={styles.replyActionBtn} onClick={() => onShareReply(reply.id)}>
                    <ShareIcon size={14} /> Share
                  </button>
                </div>
              </div>
              {showInlineForm && (
                <div className={styles.inlineReplyForm}>
                  <MarkdownEditor
                    value={inlineReplyBody}
                    onChange={onInlineReplyBodyChange}
                    rows={3}
                    placeholder="Write your reply…"
                  />
                  <div className={styles.inlineReplyActions}>
                    <button
                      className={styles.inlineSubmit}
                      onClick={onInlineReplySubmit}
                      disabled={submitting || !inlineReplyBody.trim()}
                    >
                      {submitting ? 'Posting…' : 'Post Reply'}
                    </button>
                    <button className={styles.inlineCancel} onClick={onInlineReplyCancel}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              {reply.children?.map((child) => (
                <ReplyNode
                  key={child.id}
                  reply={child}
                  depth={depth + 1}
                  onReply={onReply}
                  onVote={onVote}
                  onShareReply={onShareReply}
                  replyVotes={replyVotes}
                  replyVotingIds={replyVotingIds}
                  collapsedReplies={collapsedReplies}
                  toggleCollapse={toggleCollapse}
                  inlineReplyId={inlineReplyId}
                  inlineReplyBody={inlineReplyBody}
                  onInlineReplyBodyChange={onInlineReplyBodyChange}
                  onInlineReplySubmit={onInlineReplySubmit}
                  onInlineReplyCancel={onInlineReplyCancel}
                  submitting={submitting}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function UserBadge({ user }: { user: ThreadUser }) {
  return (
    <span className={styles.userBadge}>
      {user.avatarUrl && <img src={user.avatarUrl} alt="" className={styles.userAvatar} />}
      <span className={styles.userName}>{user.username}</span>
      <VerifiedCreatorBadge role={user.role} />
    </span>
  );
}

// ---------------------------------------------------------------------------
// Thread Metadata renderer
// ---------------------------------------------------------------------------

function ImageGallery({
  imageUrls,
  onImageClick,
}: {
  imageUrls: string[];
  onImageClick: (index: number) => void;
}) {
  return (
    <div className={styles.metadataSection}>
      <h4 className={styles.metadataTitle}>Gallery</h4>
      <div className={styles.imageGallery}>
        {imageUrls.map((url, i) => (
          <img
            key={i}
            src={resolveImageUrl(url)}
            alt={`Photo ${i + 1}`}
            className={`${styles.galleryImage} ${styles.galleryImageClickable}`}
            onClick={() => onImageClick(i)}
          />
        ))}
      </div>
    </div>
  );
}

function ThreadMetadata({
  thread,
  lightboxIndex: _lightboxIndex,
  setLightboxIndex,
}: {
  thread: Thread;
  lightboxIndex: number | null;
  setLightboxIndex: (index: number | null) => void;
}) {
  const { metadata, imageUrls, category } = thread;

  if (category === 'BUILD_ADVICE' && metadata?.buildPermalink) {
    return (
      <>
        <div className={styles.metadataSection}>
          <h4 className={styles.metadataTitle}>Linked Build</h4>
          <EmbedBuildCard permalink={String(metadata.buildPermalink)} />
        </div>
        {imageUrls && imageUrls.length > 0 && (
          <ImageGallery imageUrls={imageUrls} onImageClick={setLightboxIndex} />
        )}
      </>
    );
  }

  if (category === 'DIY_MODS' && metadata) {
    const tools = Array.isArray(metadata.toolsRequired) ? metadata.toolsRequired as string[] : [];
    const bom = Array.isArray(metadata.billOfMaterials)
      ? (metadata.billOfMaterials as { item: string; quantity: string }[])
      : [];

    if (tools.length === 0 && bom.length === 0) {
      if (imageUrls && imageUrls.length > 0) {
        return <ImageGallery imageUrls={imageUrls} onImageClick={setLightboxIndex} />;
      }
      return null;
    }

    return (
      <>
        <div className={styles.metadataSection}>
          {tools.length > 0 && (
            <>
              <h4 className={styles.metadataTitle}>Tools Required</h4>
              <ul className={styles.toolsList}>
                {tools.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </>
          )}
          {bom.length > 0 && (
            <>
              <h4 className={styles.metadataTitle}>Bill of Materials</h4>
              <table className={styles.bomTable}>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {bom.map((row, i) => (
                    <tr key={i}>
                      <td>{row.item}</td>
                      <td>{row.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
        {imageUrls && imageUrls.length > 0 && (
          <ImageGallery imageUrls={imageUrls} onImageClick={setLightboxIndex} />
        )}
      </>
    );
  }

  if (category === 'SHOWROOM' && imageUrls && imageUrls.length > 0) {
    return (
      <ImageGallery imageUrls={imageUrls} onImageClick={setLightboxIndex} />
    );
  }

  if (category === 'TELEMETRY' && metadata?.codeSnippet) {
    return (
      <>
        <div className={styles.metadataSection}>
          {!!metadata.profileType && (
            <span className={styles.profileBadge}>{String(metadata.profileType)}</span>
          )}
          <h4 className={styles.metadataTitle}>Configuration</h4>
          <pre className={styles.codeBlock}>{String(metadata.codeSnippet)}</pre>
        </div>
        {imageUrls && imageUrls.length > 0 && (
          <ImageGallery imageUrls={imageUrls} onImageClick={setLightboxIndex} />
        )}
      </>
    );
  }

  if (category === 'DEALS' && metadata) {
    const status = metadata.dealStatus ? String(metadata.dealStatus) : null;
    const price = metadata.price != null ? Number(metadata.price) : null;
    const currency = metadata.currency ? String(metadata.currency) : 'USD';

    if (!status && price == null) {
      if (imageUrls && imageUrls.length > 0) {
        return <ImageGallery imageUrls={imageUrls} onImageClick={setLightboxIndex} />;
      }
      return null;
    }

    return (
      <>
        <div className={styles.metadataSection}>
          <div className={styles.dealInfo}>
            {status && (
              <span
                className={`${styles.dealBadge} ${
                  status === 'Active' ? styles.dealActive : styles.dealExpired
                }`}
              >
                {status}
              </span>
            )}
            {price != null && (
              <span className={styles.dealPrice}>
                {currency} {price.toFixed(2)}
              </span>
            )}
          </div>
        </div>
        {imageUrls && imageUrls.length > 0 && (
          <ImageGallery imageUrls={imageUrls} onImageClick={setLightboxIndex} />
        )}
      </>
    );
  }

  // Fallback: show gallery for any category with images
  if (imageUrls && imageUrls.length > 0) {
    return <ImageGallery imageUrls={imageUrls} onImageClick={setLightboxIndex} />;
  }

  return null;
}

function buildReplyTree(replies: Reply[]): (Reply & { children: Reply[] })[] {
  const map = new Map<string, Reply & { children: Reply[] }>();
  const roots: (Reply & { children: Reply[] })[] = [];
  for (const reply of replies) map.set(reply.id, { ...reply, children: [] });
  for (const reply of replies) {
    const node = map.get(reply.id)!;
    if (reply.parentId && map.has(reply.parentId)) map.get(reply.parentId)!.children.push(node);
    else roots.push(node);
  }
  return roots;
}
