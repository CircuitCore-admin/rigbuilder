import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import styles from './BuildGalleryPage.module.scss';
import { BuildCard } from '../../components/BuildCard/BuildCard';
import { api } from '../../utils/api';
import type { Build, BuildGalleryFilters, Discipline } from '../../types/build';
import type { Platform, PaginatedResponse } from '../../types/product';

const DISCIPLINE_OPTIONS: Discipline[] = ['FORMULA', 'GT', 'RALLY', 'DRIFT', 'OVAL', 'TRUCK', 'MULTI'];
const PLATFORM_OPTIONS: Platform[] = ['PC', 'PLAYSTATION', 'XBOX'];

const BUDGET_PRESETS = [
  { label: 'Under £500', min: 0, max: 500 },
  { label: '£500–£1,000', min: 500, max: 1000 },
  { label: '£1,000–£2,500', min: 1000, max: 2500 },
  { label: '£2,500–£5,000', min: 2500, max: 5000 },
  { label: '£5,000+', min: 5000, max: undefined },
];

export function BuildGalleryPage() {
  const [builds, setBuilds] = useState<Build[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<BuildGalleryFilters>({
    sortBy: 'createdAt',
    sortDir: 'desc',
  });

  const fetchBuilds = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '12');
      if (filters.sortBy) params.set('sortBy', filters.sortBy);
      if (filters.sortDir) params.set('sortDir', filters.sortDir);
      if (filters.search) params.set('search', filters.search);
      if (filters.minBudget != null) params.set('minBudget', String(filters.minBudget));
      if (filters.maxBudget != null) params.set('maxBudget', String(filters.maxBudget));
      if (filters.disciplines?.length) params.set('disciplines', filters.disciplines.join(','));
      if (filters.platforms?.length) params.set('platforms', filters.platforms.join(','));

      const res = await api<PaginatedResponse<Build>>(`/builds?${params.toString()}`);
      setBuilds(res.items);
      setTotalPages(res.pagination.totalPages);
    } catch (err) {
      console.error('Failed to fetch builds:', err);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchBuilds();
  }, [fetchBuilds]);

  const toggleDiscipline = (d: Discipline) => {
    setPage(1);
    setFilters((prev) => {
      const current = prev.disciplines ?? [];
      return {
        ...prev,
        disciplines: current.includes(d) ? current.filter((x) => x !== d) : [...current, d],
      };
    });
  };

  const togglePlatform = (p: Platform) => {
    setPage(1);
    setFilters((prev) => {
      const current = prev.platforms ?? [];
      return {
        ...prev,
        platforms: current.includes(p) ? current.filter((x) => x !== p) : [...current, p],
      };
    });
  };

  const setBudget = (min?: number, max?: number) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, minBudget: min, maxBudget: max }));
  };

  const clearFilters = () => {
    setPage(1);
    setFilters({ sortBy: 'createdAt', sortDir: 'desc' });
  };

  const hasActiveFilters = !!(
    filters.disciplines?.length ||
    filters.platforms?.length ||
    filters.minBudget != null ||
    filters.maxBudget != null ||
    filters.search
  );

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <header className={styles.topBar}>
        <Link to="/" className={styles.logo}>
          Rig<span>Builder</span>
        </Link>
        <nav className={styles.nav}>
          <Link to="/builds" className={`${styles.navLink} ${styles.active}`}>Builds</Link>
          <Link to="/" className={styles.navLink}>Configurator</Link>
          <Link to="/login" className={styles.navLink}>Sign In</Link>
        </nav>
      </header>

      {/* Page header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Build Gallery</h1>
          <p className={styles.subtitle}>Explore community rigs for inspiration, or clone one as your starting point.</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className={styles.filterBar}>
        {/* Search */}
        <div className={styles.searchWrap}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search builds..."
            value={filters.search ?? ''}
            onChange={(e) => {
              setPage(1);
              setFilters((prev) => ({ ...prev, search: e.target.value || undefined }));
            }}
          />
        </div>

        {/* Budget */}
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Budget</span>
          <div className={styles.filterOptions}>
            {BUDGET_PRESETS.map((bp) => (
              <button
                key={bp.label}
                type="button"
                className={`${styles.filterChip} ${
                  filters.minBudget === bp.min && filters.maxBudget === bp.max ? styles.chipActive : ''
                }`}
                onClick={() => {
                  if (filters.minBudget === bp.min && filters.maxBudget === bp.max) {
                    setBudget(undefined, undefined);
                  } else {
                    setBudget(bp.min, bp.max);
                  }
                }}
              >
                {bp.label}
              </button>
            ))}
          </div>
        </div>

        {/* Disciplines */}
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Discipline</span>
          <div className={styles.filterOptions}>
            {DISCIPLINE_OPTIONS.map((d) => (
              <button
                key={d}
                type="button"
                className={`${styles.filterChip} ${
                  filters.disciplines?.includes(d) ? styles.chipActive : ''
                }`}
                onClick={() => toggleDiscipline(d)}
              >
                {d.charAt(0) + d.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Platforms */}
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Platform</span>
          <div className={styles.filterOptions}>
            {PLATFORM_OPTIONS.map((p) => (
              <button
                key={p}
                type="button"
                className={`${styles.filterChip} ${
                  filters.platforms?.includes(p) ? styles.chipActive : ''
                }`}
                onClick={() => togglePlatform(p)}
              >
                {p === 'PLAYSTATION' ? 'PlayStation' : p === 'XBOX' ? 'Xbox' : p}
              </button>
            ))}
          </div>
        </div>

        {/* Sort + Clear */}
        <div className={styles.filterActions}>
          <select
            className={styles.sortSelect}
            value={`${filters.sortBy}-${filters.sortDir}`}
            onChange={(e) => {
              const [sortBy, sortDir] = e.target.value.split('-') as [BuildGalleryFilters['sortBy'], BuildGalleryFilters['sortDir']];
              setFilters((prev) => ({ ...prev, sortBy, sortDir }));
            }}
          >
            <option value="createdAt-desc">Newest First</option>
            <option value="createdAt-asc">Oldest First</option>
            <option value="upvoteCount-desc">Most Popular</option>
            <option value="totalCost-desc">Highest Budget</option>
            <option value="totalCost-asc">Lowest Budget</option>
          </select>
          {hasActiveFilters && (
            <button type="button" className={styles.clearBtn} onClick={clearFilters}>
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Loading builds…</span>
        </div>
      ) : builds.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>🏗️</span>
          <h2>No builds found</h2>
          <p>Try adjusting your filters or be the first to share your rig!</p>
        </div>
      ) : (
        <>
          <div className={styles.grid}>
            {builds.map((build) => (
              <BuildCard key={build.id} build={build} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                type="button"
                className={styles.pageBtn}
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Prev
              </button>
              <span className={styles.pageInfo}>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className={styles.pageBtn}
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
