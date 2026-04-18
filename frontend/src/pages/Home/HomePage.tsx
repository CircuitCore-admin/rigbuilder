import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HomeHero } from '../../components/HomeHero/HomeHero';
import { BuildCard, type BuildCardData } from '../../components/BuildCard/BuildCard';
import { FeaturedPostCard, type FeaturedPostCardData } from '../../components/FeaturedPostCard/FeaturedPostCard';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { api } from '../../utils/api';
import styles from './HomePage.module.scss';

// ---------------------------------------------------------------------------
// Mock data (fallback when API returns nothing)
// ---------------------------------------------------------------------------

const MOCK_FEATURED_BUILD = {
  title: 'The Midnight Apex',
  author: 'DriftKing_42',
  quote: '"I wanted something that felt like stepping into a real GT cockpit — every component was chosen to maximize immersion."',
  thumbnail: undefined as string | undefined,
  href: '/builds/featured-1',
};

const QUIZ_OPTIONS = [
  { id: 'casual', label: 'Casual', emoji: '🎮', description: 'Weekend fun, couch-friendly' },
  { id: 'competitive', label: 'Competitive', emoji: '🏁', description: 'Precision & low-latency' },
  { id: 'vr', label: 'VR Racer', emoji: '🥽', description: 'Full immersion in VR' },
  { id: 'motion', label: 'Motion Sim', emoji: '🎢', description: 'Hydraulics & motion platforms' },
];

const MOCK_TRENDING_BUILDS: BuildCardData[] = [
  { id: 'b1', title: 'Budget Beast GT', author: 'SimSavvy', upvotes: 284, componentCount: 6, totalPrice: 1450, thumbnail: undefined },
  { id: 'b2', title: 'Pro Drift Station', author: 'YamatoDD', upvotes: 217, componentCount: 8, totalPrice: 4200, thumbnail: undefined },
  { id: 'b3', title: 'Compact VR Cockpit', author: 'VRacer99', upvotes: 196, componentCount: 5, totalPrice: 2100, thumbnail: undefined },
  { id: 'b4', title: 'Endurance Rig MK2', author: 'LeMansLover', upvotes: 183, componentCount: 7, totalPrice: 3800, thumbnail: undefined },
  { id: 'b5', title: 'Motion Platform Alpha', author: 'GForceGuru', upvotes: 171, componentCount: 8, totalPrice: 6500, thumbnail: undefined },
  { id: 'b6', title: 'F1 Replica Setup', author: 'OpenWheelFan', upvotes: 159, componentCount: 7, totalPrice: 5200, thumbnail: undefined },
];

const MOCK_FEATURED_GUIDES: FeaturedPostCardData[] = [
  { id: 'g1', title: 'Best Load Cell Pedals 2026', excerpt: 'We tested 12 load cell pedals from budget to pro-tier to find the best brake feel.', category: 'Buyer\'s Guide', href: '/guides/best-load-cell-pedals-2026' },
  { id: 'g2', title: 'Direct Drive vs Belt Drive: The Real Difference', excerpt: 'Is upgrading to DD worth it? We break down force feedback, latency, and value.', category: 'Comparison', href: '/guides/dd-vs-belt-drive' },
  { id: 'g3', title: 'How to Mount a Triple Screen Setup', excerpt: 'Step-by-step guide to aligning, mounting, and configuring triple monitors for sim racing.', category: 'Tutorial', href: '/guides/triple-screen-setup' },
];

const MOCK_RECENT_REVIEWS: FeaturedPostCardData[] = [
  { id: 'r1', title: 'Fanatec CSL DD Review', excerpt: 'Entry-level direct drive that punches above its weight.', category: 'Wheelbase', href: '/reviews/fanatec-csl-dd', rating: 4 },
  { id: 'r2', title: 'Heusinkveld Sprint Pedals', excerpt: 'Industrial-grade load cells for the serious sim racer.', category: 'Pedals', href: '/reviews/heusinkveld-sprint', rating: 5 },
  { id: 'r3', title: 'Trak Racer TR160S MK5', excerpt: 'Rock-solid aluminium profile cockpit at a fair price.', category: 'Cockpit', href: '/reviews/trak-racer-tr160s', rating: 4 },
  { id: 'r4', title: 'Samsung Odyssey G9 (2025)', excerpt: 'Ultra-wide immersion — but is the curve too aggressive?', category: 'Display', href: '/reviews/samsung-odyssey-g9', rating: 4 },
];

const CATEGORY_LABELS: Record<string, string> = {
  WHEELBASE: 'Wheel Bases',
  PEDALS: 'Pedals',
  COCKPIT: 'Cockpits',
  WHEEL_RIM: 'Wheel Rims',
  SEAT: 'Seats',
  SHIFTER: 'Shifters',
  DISPLAY: 'Displays',
  EXTRAS: 'Accessories',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HomeData {
  featuredBuild: any | null;
  trendingBuilds: any[];
  recentGuides: any[];
  recentReviews: any[];
  recentListings: any[];
  categoryCounts: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HomePage() {
  const revealRef = useScrollReveal<HTMLDivElement>();
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<HomeData>('/landing/homepage')
      .then(setHomeData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Map API data to component-compatible formats, with mock fallback
  const featuredBuild = homeData?.featuredBuild
    ? {
        title: homeData.featuredBuild.name,
        author: homeData.featuredBuild.user?.username ?? 'Unknown',
        quote: homeData.featuredBuild.description
          ? `"${homeData.featuredBuild.description.replace(/<[^>]+>/g, '').slice(0, 200)}"`
          : '"A carefully crafted sim racing rig."',
        thumbnail: homeData.featuredBuild.images?.[0],
        href: `/list/${homeData.featuredBuild.id}`,
      }
    : MOCK_FEATURED_BUILD;

  const trendingBuilds: BuildCardData[] =
    homeData?.trendingBuilds && homeData.trendingBuilds.length > 0
      ? homeData.trendingBuilds.map((b: any) => ({
          id: b.id,
          title: b.name,
          author: b.user?.username ?? 'Unknown',
          upvotes: b.upvoteCount ?? 0,
          componentCount: b.parts?.length ?? 0,
          totalPrice: b.totalCost ?? 0,
          thumbnail: b.images?.[0],
        }))
      : MOCK_TRENDING_BUILDS;

  const featuredGuides: FeaturedPostCardData[] =
    homeData?.recentGuides && homeData.recentGuides.length > 0
      ? homeData.recentGuides.map((g: any) => ({
          id: g.id,
          title: g.title,
          excerpt: g.excerpt ?? '',
          category: g.category ?? 'Guide',
          href: `/guides/${g.slug}`,
          thumbnail: g.coverImage ?? undefined,
        }))
      : MOCK_FEATURED_GUIDES;

  const recentReviews: FeaturedPostCardData[] =
    homeData?.recentReviews && homeData.recentReviews.length > 0
      ? homeData.recentReviews.map((r: any) => ({
          id: r.id,
          title: `${r.product?.name ?? 'Product'} Review`,
          excerpt: r.pros?.slice(0, 120) ?? '',
          category: r.product?.category ?? 'Review',
          href: `/products/${r.product?.slug ?? r.productId}`,
          rating: Math.round((r.ratingOverall ?? 5) / 2),
        }))
      : MOCK_RECENT_REVIEWS;

  return (
    <div className={styles.page} ref={revealRef}>
      {/* Hero */}
      <HomeHero />

      {/* ── Build of the Week ── */}
      <section className={styles.section} data-reveal="">
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Build of the Week</h2>

          <div className={styles.featuredBuild}>
            <div className={styles.featuredImage}>
              {featuredBuild.thumbnail ? (
                <img src={featuredBuild.thumbnail} alt={featuredBuild.title} loading="lazy" />
              ) : (
                <div className={styles.featuredPlaceholder} aria-hidden="true">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <rect x="6" y="6" width="36" height="36" rx="6" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="18" cy="18" r="4" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M6 34l10-8 6 5 10-10 10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>

            <div className={styles.featuredBody}>
              <h3 className={styles.featuredTitle}>{featuredBuild.title}</h3>
              <span className={styles.featuredAuthor}>by {featuredBuild.author}</span>
              <blockquote className={styles.featuredQuote}>{featuredBuild.quote}</blockquote>
              <Link to={featuredBuild.href} className={styles.featuredLink}>
                View Full Part List →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Quick Start Quiz ── */}
      <section className={styles.section} data-reveal="">
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>What kind of racer are you?</h2>
          <p className={styles.sectionSubtitle}>Pick your style and we&apos;ll suggest a starter build.</p>

          <div className={styles.quizGrid}>
            {QUIZ_OPTIONS.map((opt) => (
              <Link to={`/build?profile=${opt.id}`} key={opt.id} className={styles.quizCard}>
                <span className={styles.quizEmoji} aria-hidden="true">{opt.emoji}</span>
                <span className={styles.quizLabel}>{opt.label}</span>
                <span className={styles.quizDesc}>{opt.description}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trending Builds ── */}
      <section className={styles.section} data-reveal="">
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Trending Builds</h2>
            <Link to="/builds" className={styles.viewAll}>View All →</Link>
          </div>

          <div className={styles.buildGrid}>
            {trendingBuilds.map((build) => (
              <BuildCard key={build.id} build={build} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Guides ── */}
      <section className={styles.section} data-reveal="">
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Featured Guides</h2>
            <Link to="/guides" className={styles.viewAll}>View All →</Link>
          </div>

          <div className={styles.guidesGrid}>
            {featuredGuides.map((guide) => (
              <FeaturedPostCard key={guide.id} post={guide} variant="guide" />
            ))}
          </div>
        </div>
      </section>

      {/* ── Recent Reviews ── */}
      <section className={styles.section} data-reveal="">
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Recent Reviews</h2>
            <Link to="/reviews" className={styles.viewAll}>View All →</Link>
          </div>

          <div className={styles.reviewsGrid}>
            {recentReviews.map((review) => (
              <FeaturedPostCard key={review.id} post={review} variant="review" />
            ))}
          </div>
        </div>
      </section>

      {/* ── Browse by Category ── */}
      <section className={styles.section} data-reveal="">
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Browse by Category</h2>
          <div className={styles.categoryGrid}>
            {['WHEELBASE', 'PEDALS', 'COCKPIT', 'WHEEL_RIM', 'SEAT', 'SHIFTER', 'DISPLAY', 'EXTRAS'].map(cat => (
              <Link key={cat} to={`/category/${cat.toLowerCase()}`} className={styles.categoryLink}>
                <span className={styles.categoryLinkName}>{CATEGORY_LABELS[cat]}</span>
                <span className={styles.categoryLinkCount}>
                  {homeData?.categoryCounts?.[cat] ?? '—'} products
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Latest Marketplace Listings ── */}
      {homeData?.recentListings && homeData.recentListings.length > 0 && (
        <section className={styles.section} data-reveal="">
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Latest Marketplace Listings</h2>
              <Link to="/marketplace" className={styles.viewAll}>View All →</Link>
            </div>
            <div className={styles.reviewsGrid}>
              {homeData.recentListings.map((listing: any) => (
                <Link key={listing.id} to={`/marketplace/${listing.id}`} className={styles.listingCard}>
                  <h3 className={styles.listingTitle}>{listing.title}</h3>
                  {listing.price && (
                    <span className={styles.listingPrice}>£{Number(listing.price).toLocaleString('en-GB')}</span>
                  )}
                  <span className={styles.listingMeta}>by {listing.user?.username ?? 'Unknown'}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default HomePage;
