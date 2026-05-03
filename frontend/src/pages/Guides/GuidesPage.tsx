import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { api } from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';
import { GuideTemplate } from '../../components/GuideTemplate/GuideTemplate';
import styles from './GuidesPage.module.scss';

interface GuideListItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  category: string;
  coverImage: string | null;
  tags: string[];
  publishedAt: string | null;
  author: { id: string; username: string; avatarUrl: string | null };
}

interface PaginatedGuides {
  items: GuideListItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const CATEGORIES = [
  { value: '', label: 'All Guides' },
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'BUYING', label: 'Buying Guides' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'SETUP', label: 'Setup' },
  { value: 'DIY', label: 'DIY' },
  { value: 'COMPARISON', label: 'Comparison' },
  { value: 'TUTORIAL', label: 'Tutorial' },
];

export function GuidesPage() {
  const { slug } = useParams<{ slug: string }>();
  if (slug) return <GuideTemplate slug={slug} />;
  return <GuidesListView />;
}

function GuidesListView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [guides, setGuides] = useState<GuideListItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const category = searchParams.get('category') ?? '';
  const page = parseInt(searchParams.get('page') ?? '1') || 1;

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '12' });
    if (category) params.set('category', category);

    api<PaginatedGuides>(`/guides?${params}`)
      .then((data) => { setGuides(data.items); setTotalPages(data.pagination.totalPages); })
      .catch(() => setGuides([]))
      .finally(() => setLoading(false));
  }, [category, page]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <h1 className={styles.title}>Guides & Articles</h1>
            <p className={styles.subtitle}>Expert guides on sim racing hardware, setup tips, and maintenance</p>
          </div>
          {user && (
            <Link to="/guides/new" className={styles.writeGuideBtn}>Write a Guide</Link>
          )}
        </div>
      </header>

      <div className={styles.filters}>
        {CATEGORIES.map((cat) => (
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
        <div className={styles.loadingState}>Loading guides…</div>
      ) : guides.length === 0 ? (
        <div className={styles.emptyState}>No guides found</div>
      ) : (
        <div className={styles.grid}>
          {guides.map((guide) => (
            <a key={guide.id} href={`/guides/${guide.slug}`} className={styles.card}>
              {guide.coverImage && <img src={guide.coverImage} alt="" className={styles.cardImage} loading="lazy" decoding="async" />}
              <div className={styles.cardBody}>
                <span className={styles.cardCategory}>
                  {CATEGORIES.find((c) => c.value === guide.category)?.label ?? guide.category}
                </span>
                <h3 className={styles.cardTitle}>{guide.title}</h3>
                {guide.excerpt && <p className={styles.cardExcerpt}>{guide.excerpt}</p>}
                <div className={styles.cardMeta}>
                  <span>{guide.author.username}</span>
                  {guide.publishedAt && (
                    <time>{new Date(guide.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</time>
                  )}
                </div>
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
