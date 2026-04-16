import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, resolveImageUrl } from '../../utils/api';
import styles from './LeaderboardPage.module.scss';

interface ContributorUser {
  id: string;
  username: string;
  avatarUrl: string | null;
  pitCred: number;
  role: string;
  _count?: { forumThreads: number; forumReplies: number };
}

interface SellerUser {
  id: string;
  username: string;
  avatarUrl: string | null;
  completedSales: number;
  sellerRating: number | null;
  sellerReviewCount: number;
}

interface HelperUser {
  id: string;
  username: string;
  avatarUrl: string | null;
  pitCred: number;
  totalUpvotes: number;
}

type TabKey = 'contributors' | 'sellers' | 'helpers';

export function LeaderboardPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('contributors');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api<any[]>(`/leaderboards/${activeTab}?limit=50`)
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [activeTab]);

  const getMetric = (user: any) => {
    if (activeTab === 'contributors') return `${(user as ContributorUser).pitCred} PC`;
    if (activeTab === 'sellers') return `${(user as SellerUser).completedSales} sales`;
    return `${(user as HelperUser).totalUpvotes} upvotes`;
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Leaderboards</h1>

      <div className={styles.tabBar}>
        <button
          className={`${styles.tab} ${activeTab === 'contributors' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('contributors')}
        >Top Contributors</button>
        <button
          className={`${styles.tab} ${activeTab === 'sellers' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('sellers')}
        >Top Sellers</button>
        <button
          className={`${styles.tab} ${activeTab === 'helpers' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('helpers')}
        >Most Helpful</button>
      </div>

      {loading ? (
        <div className={styles.loadingState}>Loading...</div>
      ) : data.length === 0 ? (
        <div className={styles.emptyState}>No data yet</div>
      ) : (
        <div className={styles.leaderboardList}>
          {data.map((user, idx) => (
            <button
              key={user.id}
              className={styles.leaderboardRow}
              onClick={() => navigate(`/profile/${user.username}`)}
            >
              <span className={`${styles.rank} ${idx < 3 ? styles[`rank${idx + 1}` as keyof typeof styles] : ''}`}>
                {idx + 1}
              </span>
              <div className={styles.leaderboardAvatar}>
                {user.avatarUrl ? (
                  <img src={resolveImageUrl(user.avatarUrl)} alt="" />
                ) : (
                  <span>{user.username[0]?.toUpperCase()}</span>
                )}
              </div>
              <div className={styles.leaderboardInfo}>
                <span className={styles.leaderboardName}>{user.username}</span>
              </div>
              <span className={styles.leaderboardMetric}>
                {getMetric(user)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
