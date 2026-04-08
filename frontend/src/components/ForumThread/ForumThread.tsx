import { useState, useEffect, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { api } from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';
import { VerifiedCreatorBadge } from '../VerifiedCreatorBadge/VerifiedCreatorBadge';
import styles from './ForumThread.module.scss';

interface ThreadUser {
  id: string;
  username: string;
  avatarUrl: string | null;
  reputation: number;
  role?: string;
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
  createdAt: string;
  user: ThreadUser;
  product: ThreadProduct | null;
}

interface ForumThreadProps {
  slug: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  TROUBLESHOOTING: 'Troubleshooting',
  BUILD_ADVICE: 'Build Advice',
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

export function ForumThread({ slug }: ForumThreadProps) {
  const { user: authUser } = useAuth();
  const [thread, setThread] = useState<Thread | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyBody, setReplyBody] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api<Thread>(`/forum/${slug}`),
      api<Reply[]>(`/forum/${slug}/replies`),
    ])
      .then(([t, r]) => { setThread(t); setReplies(r); })
      .catch(() => setThread(null))
      .finally(() => setLoading(false));
  }, [slug]);

  const nestedReplies = useMemo(() => buildReplyTree(replies), [replies]);

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
    } catch { /* silently fail */ }
    finally { setSubmitting(false); }
  };

  const handleUpvote = async (replyId: string) => {
    try {
      const updated = await api<Reply>(`/forum/replies/${replyId}/upvote`, { method: 'POST' });
      setReplies((prev) =>
        prev.map((r) => (r.id === replyId ? { ...r, upvotes: updated.upvotes } : r))
      );
    } catch { /* silently fail */ }
  };

  if (loading) return <div className={styles.loading}>Loading discussion…</div>;
  if (!thread) return <div className={styles.notFound}>Discussion not found</div>;

  return (
    <div className={styles.container}>
      <header className={styles.threadHeader}>
        <span className={styles.categoryTag}>
          {CATEGORY_LABELS[thread.category] ?? thread.category}
        </span>
        <h1 className={styles.threadTitle}>{thread.title}</h1>
        <div className={styles.threadMeta}>
          <UserBadge user={thread.user} />
          <span className={styles.metaDot}>·</span>
          <time className={styles.metaTime}>
            {new Date(thread.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </time>
          <span className={styles.metaDot}>·</span>
          <span className={styles.metaStat}>{thread.viewCount} views</span>
          <span className={styles.metaDot}>·</span>
          <span className={styles.metaStat}>{thread.replyCount} replies</span>
        </div>
        {thread.product && (
          <a href={`/products/${thread.product.slug}`} className={styles.linkedProduct}>
            📦 {thread.product.name}
          </a>
        )}
      </header>

      <div
        className={styles.threadBody}
        dangerouslySetInnerHTML={{
          __html: DOMPurify.sanitize(thread.body, {
            ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre', 'blockquote'],
            ALLOWED_ATTR: ['href', 'target', 'rel'],
          }),
        }}
      />

      <section className={styles.repliesSection}>
        <h3 className={styles.repliesTitle}>
          {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
        </h3>

        <div className={styles.replyList}>
          {nestedReplies.map((reply) => (
            <ReplyNode key={reply.id} reply={reply} depth={0} onReply={(id) => setReplyingTo(id)} onUpvote={handleUpvote} />
          ))}
        </div>

        {authUser ? (
          <div className={styles.replyForm}>
            {replyingTo && (
              <div className={styles.replyingTo}>
                Replying to a comment
                <button className={styles.cancelReply} onClick={() => setReplyingTo(null)}>Cancel</button>
              </div>
            )}
            <textarea
              className={styles.replyTextarea}
              placeholder="Write your reply (Markdown supported)…"
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              rows={4}
            />
            <button
              className={styles.submitReply}
              onClick={handleSubmitReply}
              disabled={submitting || !replyBody.trim()}
            >
              {submitting ? 'Posting…' : 'Post Reply'}
            </button>
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
  reply, depth, onReply, onUpvote,
}: {
  reply: Reply & { children?: Reply[] };
  depth: number;
  onReply: (id: string) => void;
  onUpvote: (id: string) => void;
}) {
  const maxDepth = 4;
  const badges = getBadges(reply.user.reputation, reply.user.role);

  return (
    <div className={styles.replyNode} style={{ marginLeft: Math.min(depth, maxDepth) * 24 }}>
      <div className={styles.reply}>
        <div className={styles.replyHeader}>
          <UserBadge user={reply.user} />
          <VerifiedCreatorBadge role={reply.user.role} />
          {badges.map((badge) => (
            <span key={badge} className={styles.badge}>{badge}</span>
          ))}
          <time className={styles.replyTime}>
            {new Date(reply.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </time>
        </div>
        <div
          className={styles.replyBody}
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(reply.body, {
              ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre'],
              ALLOWED_ATTR: ['href', 'target', 'rel'],
            }),
          }}
        />
        <div className={styles.replyActions}>
          <button className={styles.upvoteBtn} onClick={() => onUpvote(reply.id)}>▲ {reply.upvotes}</button>
          <button className={styles.replyBtn} onClick={() => onReply(reply.id)}>Reply</button>
        </div>
      </div>
      {reply.children?.map((child) => (
        <ReplyNode key={child.id} reply={child} depth={depth + 1} onReply={onReply} onUpvote={onUpvote} />
      ))}
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
