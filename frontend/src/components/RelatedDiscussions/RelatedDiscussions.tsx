import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import styles from './RelatedDiscussions.module.scss';

interface RelatedThread {
  id: string;
  title: string;
  slug: string;
  category: string;
  replyCount: number;
  createdAt: string;
  user: { id: string; username: string };
}

interface RelatedDiscussionsProps {
  productId: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  TROUBLESHOOTING: 'Troubleshooting',
  BUILD_ADVICE: 'Build Advice',
  DEALS: 'Deals',
  GENERAL: 'General',
};

export function RelatedDiscussions({ productId }: RelatedDiscussionsProps) {
  const [threads, setThreads] = useState<RelatedThread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<RelatedThread[]>(`/forum/related/${productId}?limit=5`)
      .then(setThreads)
      .catch(() => setThreads([]))
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading || threads.length === 0) return null;

  return (
    <aside className={styles.sidebar}>
      <h4 className={styles.title}>Related Discussions</h4>
      <div className={styles.list}>
        {threads.map((thread) => (
          <a key={thread.id} href={`/community/${thread.slug}`} className={styles.item}>
            <span className={styles.itemCategory}>
              {CATEGORY_LABELS[thread.category] ?? thread.category}
            </span>
            <span className={styles.itemTitle}>{thread.title}</span>
            <span className={styles.itemMeta}>
              {thread.replyCount} replies · by {thread.user.username}
            </span>
          </a>
        ))}
      </div>
      <a href={`/community?productId=${productId}`} className={styles.viewAll}>
        View all discussions →
      </a>
    </aside>
  );
}
