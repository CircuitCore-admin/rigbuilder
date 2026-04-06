import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './BuildCard.module.scss';
import type { Build } from '../../types/build';

interface BuildCardProps {
  build: Build;
}

const PLATFORM_LABELS: Record<string, string> = {
  PC: 'PC',
  PLAYSTATION: 'PS',
  XBOX: 'Xbox',
};

const DISCIPLINE_COLORS: Record<string, string> = {
  FORMULA: '#FF3366',
  GT: '#00FFA3',
  RALLY: '#FFB020',
  DRIFT: '#6E56FF',
  OVAL: '#00B4D8',
  TRUCK: '#FF8C42',
  MULTI: '#C8C8D8',
};

export function BuildCard({ build }: BuildCardProps) {
  const navigate = useNavigate();
  const heroImage = build.images?.[0];
  const wheelbase = build.parts.find((p) => p.categorySlot === 'WHEELBASE');
  const pedals = build.parts.find((p) => p.categorySlot === 'PEDALS');

  const handleClick = useCallback(() => {
    navigate(`/builds/${build.id}`);
  }, [navigate, build.id]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick],
  );

  return (
    <article className={styles.card} onClick={handleClick} onKeyDown={handleKeyDown} role="link" tabIndex={0}>
      {/* Hero image */}
      <div className={styles.imageWrap}>
        {heroImage ? (
          <img src={heroImage} alt={build.name} className={styles.heroImage} loading="lazy" />
        ) : (
          <div className={styles.placeholder}>
            <span className={styles.placeholderIcon}>🏎️</span>
          </div>
        )}
        {build.isFeatured && <span className={styles.featuredBadge}>Featured</span>}
        <div className={styles.costBadge}>
          £{build.totalCost.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        <h3 className={styles.title}>{build.name}</h3>
        <span className={styles.owner}>by {build.user.username}</span>

        {/* Key components */}
        <div className={styles.components}>
          {wheelbase && (
            <span className={styles.componentTag} title="Wheelbase">
              🔧 {wheelbase.product.name.split(' ').slice(0, 3).join(' ')}
            </span>
          )}
          {pedals && (
            <span className={styles.componentTag} title="Pedals">
              🦶 {pedals.product.name.split(' ').slice(0, 3).join(' ')}
            </span>
          )}
        </div>

        {/* Disciplines */}
        {build.disciplines.length > 0 && (
          <div className={styles.tags}>
            {build.disciplines.map((d) => (
              <span
                key={d}
                className={styles.disciplineTag}
                style={{ '--tag-color': DISCIPLINE_COLORS[d] ?? '#C8C8D8' } as React.CSSProperties}
              >
                {d.charAt(0) + d.slice(1).toLowerCase()}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className={styles.footer}>
          <div className={styles.stats}>
            <span className={styles.stat}>▲ {build.upvoteCount}</span>
            <span className={styles.stat}>👁 {build.viewCount}</span>
          </div>
          <div className={styles.platforms}>
            {build.platforms.map((p) => (
              <span key={p} className={styles.platformBadge}>
                {PLATFORM_LABELS[p] ?? p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
