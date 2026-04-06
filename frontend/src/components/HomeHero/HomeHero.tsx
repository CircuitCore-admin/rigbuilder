import { useNavigate } from 'react-router-dom';
import styles from './HomeHero.module.scss';

/**
 * HomeHero — high-impact landing section with headline, CTA, and quick search.
 */
export function HomeHero() {
  const navigate = useNavigate();

  return (
    <section className={styles.hero}>
      {/* Background gradient overlay */}
      <div className={styles.backdrop} aria-hidden="true" />

      <div className={styles.content}>
        <h1 className={styles.headline}>
          Design your dream rig.
          <br />
          <span className={styles.headlineAccent}>Learn from real builds.</span>
        </h1>

        <p className={styles.subtext}>
          Configure, compare, and share sim racing setups with the largest
          community of builders.
        </p>

        <button
          type="button"
          className={styles.cta}
          onClick={() => navigate('/build')}
        >
          Start Your Build
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
            className={styles.ctaArrow}
          >
            <path
              d="M3 8h10M9 4l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* Quick search bar */}
        <div className={styles.searchWrap}>
          <svg
            className={styles.searchIcon}
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="8.5" cy="8.5" r="6" stroke="currentColor" strokeWidth="1.5" />
            <path d="M13 13l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Search wheelbases, pedals, rigs..."
            aria-label="Quick search for parts and builds"
          />
        </div>
      </div>
    </section>
  );
}

export default HomeHero;
