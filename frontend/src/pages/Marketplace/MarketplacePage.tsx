import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import Markdown from 'react-markdown';
import { api, resolveImageUrl, ensureCsrfToken } from '../../utils/api';
import { MarkdownEditor } from '../../components/MarkdownEditor/MarkdownEditor';
import { EmbedBuildCard } from '../../components/EmbedBuildCard/EmbedBuildCard';
import { useToast } from '../../components/Toast/Toast';
import { useAuth } from '../../hooks/useAuth';
import {
  MARKETPLACE_DISCLAIMERS,
  MARKETPLACE_CATEGORIES,
  LISTING_TYPE_LABELS,
  CONDITION_LABELS,
  CURRENCY_SYMBOLS,
} from '../../constants/marketplace';
import styles from './MarketplacePage.module.scss';

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

interface ListingUser {
  id: string;
  username: string;
  avatarUrl: string | null;
  sellerRating: number | null;
  sellerReviewCount: number;
  createdAt?: string;
}

interface ListingItem {
  id: string;
  title: string;
  type: string;
  status: string;
  price: number | null;
  minimumOffer: number | null;
  currency: string;
  pricingType: string;
  condition: string | null;
  category: string;
  description: string;
  imageUrls: string[];
  country: string;
  region: string | null;
  shippingOptions: string[];
  discordUsername: string | null;
  productId: string | null;
  viewCount: number;
  isPremium: boolean;
  premiumUntil: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  user: ListingUser;
  product?: { id: string; name: string; slug: string; category: string; images?: string[] } | null;
}

interface PaginatedListings {
  items: ListingItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface Offer {
  id: string;
  amount: number;
  currency: string;
  message: string | null;
  status: string;
  createdAt: string;
  user: { id: string; username: string; avatarUrl: string | null };
}

interface Review {
  id: string;
  rating: number;
  body: string | null;
  createdAt: string;
  reviewer: { id: string; username: string; avatarUrl: string | null };
}

interface Conversation {
  id: string;
  listingId: string;
  listingTitle: string;
  listingImageUrl: string | null;
  otherUser: { id: string; username: string; avatarUrl: string | null };
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatPrice(price: number | null, currency: string): string {
  if (price === null || price === undefined) return 'Price on request';
  const sym = CURRENCY_SYMBOLS[currency] ?? currency + ' ';
  return `${sym}${price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function renderStars(rating: number | null): string {
  if (rating === null || rating === undefined) return '☆☆☆☆☆';
  const full = Math.floor(rating);
  const half = rating - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}

// In-memory cache for listing list
const listingCache: Record<string, { data: PaginatedListings; timestamp: number }> = {};
const CACHE_TTL = 30_000;

// ---------------------------------------------------------------------------
// Root page — route by param
// ---------------------------------------------------------------------------

export function MarketplacePage() {
  const { id } = useParams<{ id: string }>();
  const { conversationId } = useParams<{ conversationId: string }>();
  const location = useLocation();

  // /marketplace/messages/:conversationId
  if (location.pathname.startsWith('/marketplace/messages')) {
    return <MarketplaceMessages conversationId={conversationId} />;
  }
  if (id === 'new') return <CreateListingPage />;
  if (id === 'messages') return <MarketplaceMessages />;
  if (id) return <ListingDetailPage listingId={id} />;
  return <MarketplaceDashboard />;
}

// ---------------------------------------------------------------------------
// Dashboard — three-column layout
// ---------------------------------------------------------------------------

function MarketplaceDashboard() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Listing data
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalListings, setTotalListings] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Sort
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'views'>('newest');

  // View mode
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [categoryFilters, setCategoryFilters] = useState<Set<string>>(new Set());
  const [conditionFilters, setConditionFilters] = useState<Set<string>>(new Set());
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [priceCurrency, setPriceCurrency] = useState('GBP');
  const [countryFilter, setCountryFilter] = useState('');
  const [shipsNationally, setShipsNationally] = useState(false);
  const [shipsInternationally, setShipsInternationally] = useState(false);
  const [localPickup, setLocalPickup] = useState(false);
  const [showSold, setShowSold] = useState(false);

  // Mobile filter drawer
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const page = parseInt(searchParams.get('page') ?? '1') || 1;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Re-fetch on nav
  useEffect(() => {
    setRefreshKey(k => k + 1);
  }, [location.pathname]);

  // Fetch listings
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '24');
    if (sortBy === 'newest') { params.set('sortBy', 'createdAt'); params.set('sortDir', 'desc'); }
    else if (sortBy === 'price_asc') { params.set('sortBy', 'price'); params.set('sortDir', 'asc'); }
    else if (sortBy === 'price_desc') { params.set('sortBy', 'price'); params.set('sortDir', 'desc'); }
    else if (sortBy === 'views') { params.set('sortBy', 'viewCount'); params.set('sortDir', 'desc'); }
    if (typeFilter) params.set('type', typeFilter);
    if (categoryFilters.size > 0) params.set('category', Array.from(categoryFilters).join(','));
    if (conditionFilters.size > 0) params.set('condition', Array.from(conditionFilters).join(','));
    if (priceMin) params.set('priceMin', priceMin);
    if (priceMax) params.set('priceMax', priceMax);
    if (priceCurrency) params.set('currency', priceCurrency);
    if (countryFilter) params.set('country', countryFilter);
    const shippingArr: string[] = [];
    if (localPickup) shippingArr.push('LOCAL_PICKUP');
    if (shipsNationally) shippingArr.push('NATIONAL_SHIPPING');
    if (shipsInternationally) shippingArr.push('INTERNATIONAL_SHIPPING');
    if (shippingArr.length > 0) params.set('shippingOptions', shippingArr.join(','));
    if (showSold) params.set('status', 'SOLD');
    if (debouncedSearch) params.set('search', debouncedSearch);

    const cacheKey = params.toString();
    const cached = listingCache[cacheKey];
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setListings(cached.data.items);
      setTotalPages(cached.data.pagination.totalPages);
      if (totalListings === null) setTotalListings(cached.data.pagination.total);
      setLoading(false);
      return;
    }

    setLoading(true);
    api<PaginatedListings>(`/marketplace?${params}`)
      .then(data => {
        listingCache[cacheKey] = { data, timestamp: Date.now() };
        setListings(data.items);
        setTotalPages(data.pagination.totalPages);
        if (totalListings === null) setTotalListings(data.pagination.total);
      })
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, [page, sortBy, typeFilter, categoryFilters, conditionFilters, priceMin, priceMax, priceCurrency, countryFilter, shipsNationally, shipsInternationally, localPickup, showSold, debouncedSearch, refreshKey]);

  const setPage = useCallback((p: number) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(p));
    setSearchParams(next);
  }, [searchParams, setSearchParams]);

  const toggleCategory = (cat: string) => {
    setCategoryFilters(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const toggleCondition = (cond: string) => {
    setConditionFilters(prev => {
      const next = new Set(prev);
      if (next.has(cond)) next.delete(cond); else next.add(cond);
      return next;
    });
  };

  const clearFilters = () => {
    setTypeFilter('');
    setCategoryFilters(new Set());
    setConditionFilters(new Set());
    setPriceMin('');
    setPriceMax('');
    setCountryFilter('');
    setShipsNationally(false);
    setShipsInternationally(false);
    setLocalPickup(false);
    setShowSold(false);
  };

  const hasFilters = typeFilter || categoryFilters.size > 0 || conditionFilters.size > 0 || priceMin || priceMax || countryFilter || shipsNationally || shipsInternationally || localPickup || showSold;

  // Sidebar filter content (reused for desktop and mobile drawer)
  const filterContent = (
    <>
      {/* Type filter */}
      <div className={styles.filterSection}>
        <h4 className={styles.filterTitle}>Listing Type</h4>
        <div className={styles.filterGroup}>
          <button
            className={`${styles.filterChip} ${typeFilter === '' ? styles.filterChipActive : ''}`}
            onClick={() => setTypeFilter('')}
          >All</button>
          {Object.entries(LISTING_TYPE_LABELS).map(([key, { label, color }]) => (
            <button
              key={key}
              className={`${styles.filterChip} ${typeFilter === key ? styles.filterChipActive : ''}`}
              onClick={() => setTypeFilter(typeFilter === key ? '' : key)}
              style={typeFilter === key ? { borderColor: color, color } : undefined}
            >{label}</button>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className={styles.filterSection}>
        <h4 className={styles.filterTitle}>Category</h4>
        <div className={styles.filterCheckboxes}>
          {MARKETPLACE_CATEGORIES.map(cat => (
            <label key={cat} className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={categoryFilters.has(cat)}
                onChange={() => toggleCategory(cat)}
                className={styles.checkbox}
              />
              <span>{cat}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Condition */}
      <div className={styles.filterSection}>
        <h4 className={styles.filterTitle}>Condition</h4>
        <div className={styles.filterCheckboxes}>
          {Object.entries(CONDITION_LABELS).map(([key, label]) => (
            <label key={key} className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={conditionFilters.has(key)}
                onChange={() => toggleCondition(key)}
                className={styles.checkbox}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Price range */}
      <div className={styles.filterSection}>
        <h4 className={styles.filterTitle}>Price Range</h4>
        <div className={styles.priceRangeRow}>
          <input
            type="number"
            className={styles.priceInput}
            placeholder="Min"
            value={priceMin}
            onChange={e => setPriceMin(e.target.value)}
            min="0"
          />
          <span className={styles.priceSep}>–</span>
          <input
            type="number"
            className={styles.priceInput}
            placeholder="Max"
            value={priceMax}
            onChange={e => setPriceMax(e.target.value)}
            min="0"
          />
        </div>
        <select
          className={styles.currencySelect}
          value={priceCurrency}
          onChange={e => setPriceCurrency(e.target.value)}
        >
          <option value="GBP">£ GBP</option>
          <option value="EUR">€ EUR</option>
          <option value="USD">$ USD</option>
        </select>
      </div>

      {/* Country */}
      <div className={styles.filterSection}>
        <h4 className={styles.filterTitle}>Location</h4>
        <input
          type="text"
          className={styles.filterInput}
          placeholder="Country…"
          value={countryFilter}
          onChange={e => setCountryFilter(e.target.value)}
        />
      </div>

      {/* Shipping */}
      <div className={styles.filterSection}>
        <h4 className={styles.filterTitle}>Shipping</h4>
        <div className={styles.filterCheckboxes}>
          <label className={styles.checkboxLabel}>
            <input type="checkbox" checked={localPickup} onChange={() => setLocalPickup(!localPickup)} className={styles.checkbox} />
            <span>Local Pickup</span>
          </label>
          <label className={styles.checkboxLabel}>
            <input type="checkbox" checked={shipsNationally} onChange={() => setShipsNationally(!shipsNationally)} className={styles.checkbox} />
            <span>Ships Nationally</span>
          </label>
          <label className={styles.checkboxLabel}>
            <input type="checkbox" checked={shipsInternationally} onChange={() => setShipsInternationally(!shipsInternationally)} className={styles.checkbox} />
            <span>Ships Internationally</span>
          </label>
        </div>
      </div>

      {/* Show sold */}
      <div className={styles.filterSection}>
        <label className={styles.checkboxLabel}>
          <input type="checkbox" checked={showSold} onChange={() => setShowSold(!showSold)} className={styles.checkbox} />
          <span>Show Sold / Found</span>
        </label>
      </div>

      {hasFilters && (
        <button className={styles.clearFiltersBtn} onClick={clearFilters}>
          Clear All Filters
        </button>
      )}
    </>
  );

  return (
    <div className={styles.dashboard}>
      {/* ---------- Left sidebar (filters) ---------- */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}>Marketplace</h2>
        </div>
        {filterContent}
      </aside>

      {/* ---------- Mobile filter bar ---------- */}
      <div className={styles.mobileTopBar}>
        <button className={styles.mobileFilterBtn} onClick={() => setShowMobileFilters(true)}>
          ☰ Filters {hasFilters ? `(${[typeFilter ? 1 : 0, categoryFilters.size, conditionFilters.size].reduce((a, b) => a + b, 0)})` : ''}
        </button>
        <div className={styles.mobileViewToggle}>
          <button
            className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.viewBtnActive : ''}`}
            onClick={() => setViewMode('grid')}
            aria-label="Grid view"
          >▦</button>
          <button
            className={`${styles.viewBtn} ${viewMode === 'list' ? styles.viewBtnActive : ''}`}
            onClick={() => setViewMode('list')}
            aria-label="List view"
          >☰</button>
        </div>
      </div>

      {/* Mobile filter drawer */}
      {showMobileFilters && (
        <div className={styles.filterDrawerOverlay} onClick={() => setShowMobileFilters(false)}>
          <div className={styles.filterDrawer} onClick={e => e.stopPropagation()}>
            <div className={styles.filterDrawerHeader}>
              <h3 className={styles.filterDrawerTitle}>Filters</h3>
              <button className={styles.filterDrawerClose} onClick={() => setShowMobileFilters(false)}>×</button>
            </div>
            <div className={styles.filterDrawerContent}>
              {filterContent}
            </div>
          </div>
        </div>
      )}

      {/* ---------- Main content ---------- */}
      <main className={styles.feed}>
        {/* Search */}
        <div className={styles.searchRow}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search listings…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className={styles.searchClear} onClick={() => setSearchQuery('')}>×</button>
          )}
        </div>

        {/* Sort + View toggle */}
        <div className={styles.controlsRow}>
          <div className={styles.sortRow}>
            {([['newest', 'Newest'], ['price_asc', 'Price ↑'], ['price_desc', 'Price ↓'], ['views', 'Most Viewed']] as const).map(([key, label]) => (
              <button
                key={key}
                className={`${styles.sortPill} ${sortBy === key ? styles.sortPillActive : ''}`}
                onClick={() => setSortBy(key)}
              >{label}</button>
            ))}
          </div>
          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.viewBtnActive : ''}`}
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
            >▦</button>
            <button
              className={`${styles.viewBtn} ${viewMode === 'list' ? styles.viewBtnActive : ''}`}
              onClick={() => setViewMode('list')}
              aria-label="List view"
            >☰</button>
          </div>
        </div>

        {/* Listings */}
        {loading ? (
          <div className={styles.loadingState}>Loading listings…</div>
        ) : listings.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>📦</span>
            <h3 className={styles.emptyTitle}>No listings found</h3>
            <p className={styles.emptyText}>Try adjusting your filters or search terms</p>
            {user && (
              <a href="/marketplace/new" className={styles.emptyAction}>Create a Listing</a>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className={styles.listingGrid}>
            {listings.map(listing => (
              <ListingCard key={listing.id} listing={listing} mode="grid" />
            ))}
          </div>
        ) : (
          <div className={styles.listingList}>
            {listings.map(listing => (
              <ListingCard key={listing.id} listing={listing} mode="list" />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className={styles.pagination}>
            {page > 1 && (
              <button className={styles.pageBtn} onClick={() => setPage(page - 1)}>‹</button>
            )}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .reduce<(number | string)[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                typeof p === 'string' ? (
                  <span key={`ellipsis-${i}`} className={styles.pageEllipsis}>…</span>
                ) : (
                  <button
                    key={p}
                    className={`${styles.pageBtn} ${p === page ? styles.activePage : ''}`}
                    onClick={() => setPage(p)}
                  >{p}</button>
                ),
              )}
            {page < totalPages && (
              <button className={styles.pageBtn} onClick={() => setPage(page + 1)}>›</button>
            )}
          </div>
        )}
      </main>

      {/* ---------- Right sidebar ---------- */}
      <aside className={styles.rightSidebar}>
        {user && (
          <a href="/marketplace/new" className={styles.createListingBtn}>
            + Create Listing
          </a>
        )}

        {user && (
          <a href="/marketplace/messages" className={styles.messagesBtn}>
            ✉ Messages
          </a>
        )}

        <div className={styles.sidebarCard}>
          <h3 className={styles.sidebarCardTitle}>Safety Tips</h3>
          <ul className={styles.safetyList}>
            {MARKETPLACE_DISCLAIMERS.safetyTips.slice(0, 5).map((tip, i) => (
              <li key={i} className={styles.safetyItem}>{tip}</li>
            ))}
          </ul>
        </div>

        <div className={styles.sidebarCard}>
          <h3 className={styles.sidebarCardTitle}>Marketplace Rules</h3>
          <ol className={styles.rulesList} style={{ counterReset: 'rule-counter' }}>
            <li className={styles.ruleItem}>All items must be sim-racing related</li>
            <li className={styles.ruleItem}>Accurately describe item condition</li>
            <li className={styles.ruleItem}>No counterfeit or stolen goods</li>
            <li className={styles.ruleItem}>One listing per item</li>
            <li className={styles.ruleItem}>Mark as sold when completed</li>
          </ol>
        </div>

        {totalListings !== null && (
          <div className={styles.sidebarCard}>
            <h3 className={styles.sidebarCardTitle}>Stats</h3>
            <div className={styles.statRow}>
              <span className={styles.statValue}>{totalListings.toLocaleString()}</span>
              <span className={styles.statLabel}>Listings</span>
            </div>
          </div>
        )}
      </aside>

      {/* ---------- Mobile FAB ---------- */}
      {user && (
        <a href="/marketplace/new" className={styles.mobileFab} aria-label="Create listing">
          +
        </a>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Listing Card (Grid & List mode)
// ---------------------------------------------------------------------------

function ListingCard({ listing, mode }: { listing: ListingItem; mode: 'grid' | 'list' }) {
  const typeInfo = LISTING_TYPE_LABELS[listing.type] ?? { label: listing.type, color: '#7878A0' };
  const condLabel = CONDITION_LABELS[listing.condition] ?? listing.condition;
  const isSold = listing.status === 'SOLD' || listing.status === 'FOUND';

  if (mode === 'grid') {
    return (
      <a href={`/marketplace/${listing.id}`} className={`${styles.gridCard} ${listing.isPremium ? styles.gridCardPremium : ''} ${isSold ? styles.gridCardSold : ''}`}>
        <div className={styles.gridCardImageWrap}>
          {listing.imageUrls.length > 0 ? (
            <img src={resolveImageUrl(listing.imageUrls[0])} alt={listing.title} className={styles.gridCardImage} />
          ) : (
            <div className={styles.gridCardNoImage}>📷</div>
          )}
          <span className={styles.typeBadge} style={{ background: typeInfo.color, color: '#05050A' }}>
            {typeInfo.label}
          </span>
          {listing.isPremium && <span className={styles.premiumBadge}>⚡ Boosted</span>}
          {isSold && <span className={styles.soldOverlay}>SOLD</span>}
          {listing.imageUrls.length > 1 && (
            <span className={styles.imageCount}>📷 {listing.imageUrls.length}</span>
          )}
        </div>
        <div className={styles.gridCardBody}>
          <h3 className={styles.gridCardTitle}>{listing.title}</h3>
          <div className={styles.gridCardPrice}>{formatPrice(listing.price, listing.currency)}</div>
          <div className={styles.gridCardMeta}>
            <span className={styles.conditionTag}>{condLabel}</span>
            {listing.country && <span className={styles.locationTag}>📍 {listing.country}{listing.region ? `, ${listing.region}` : ''}</span>}
          </div>
          <div className={styles.gridCardFooter}>
            <span className={styles.gridCardSeller}>{listing.user.username}</span>
            {listing.user.sellerRating !== null && (
              <span className={styles.gridCardRating}>{renderStars(listing.user.sellerRating)}</span>
            )}
            <span className={styles.gridCardTime}>{relativeTime(listing.createdAt)}</span>
          </div>
        </div>
      </a>
    );
  }

  // List mode
  return (
    <a href={`/marketplace/${listing.id}`} className={`${styles.listRow} ${listing.isPremium ? styles.listRowPremium : ''} ${isSold ? styles.listRowSold : ''}`}>
      <div className={styles.listRowImageWrap}>
        {listing.imageUrls.length > 0 ? (
          <img src={resolveImageUrl(listing.imageUrls[0])} alt={listing.title} className={styles.listRowImage} />
        ) : (
          <div className={styles.listRowNoImage}>📷</div>
        )}
      </div>
      <div className={styles.listRowContent}>
        <div className={styles.listRowTopLine}>
          <span className={styles.typeBadge} style={{ background: typeInfo.color, color: '#05050A' }}>{typeInfo.label}</span>
          <span className={styles.conditionTag}>{condLabel}</span>
          {isSold && <span className={styles.soldTag}>SOLD</span>}
        </div>
        <h3 className={styles.listRowTitle}>{listing.title}</h3>
        <div className={styles.listRowDetails}>
          {listing.country && <span>📍 {listing.country}</span>}
          <span>{listing.user.username}</span>
          <span>{relativeTime(listing.createdAt)}</span>
        </div>
      </div>
      <div className={styles.listRowPrice}>{formatPrice(listing.price, listing.currency)}</div>
    </a>
  );
}

// ---------------------------------------------------------------------------
// Create Listing Page
// ---------------------------------------------------------------------------

function CreateListingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step state
  const [step, setStep] = useState<1 | 2>(1);
  const [listingType, setListingType] = useState<string>('');

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [price, setPrice] = useState('');
  const [minimumOffer, setMinimumOffer] = useState('');
  const [currency, setCurrency] = useState('GBP');
  const [pricingType, setPricingType] = useState('FIXED');
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [shippingOptions, setShippingOptions] = useState<Set<string>>(new Set(['LOCAL_PICKUP']));
  const [discordUsername, setDiscordUsername] = useState('');
  const [buildPermalink, setBuildPermalink] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Image upload states
  const [dragActive, setDragActive] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [addUrlValue, setAddUrlValue] = useState('');
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Draft
  const DRAFT_KEY = 'rigbuilder-draft-marketplace';
  const [showDraftBanner, setShowDraftBanner] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) setShowDraftBanner(true);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (listingType) {
        const draft = { listingType, title, description, category, condition, price, minimumOffer, currency, pricingType, country, region, shippingOptions: Array.from(shippingOptions), discordUsername, buildPermalink, imageUrls };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [listingType, title, description, category, condition, price, minimumOffer, currency, pricingType, country, region, shippingOptions, discordUsername, buildPermalink, imageUrls]);

  const restoreDraft = () => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (!saved) return;
      const d = JSON.parse(saved);
      if (d.listingType) { setListingType(d.listingType); setStep(2); }
      if (d.title) setTitle(d.title);
      if (d.description) setDescription(d.description);
      if (d.category) setCategory(d.category);
      if (d.condition) setCondition(d.condition);
      if (d.price) setPrice(d.price);
      if (d.minimumOffer) setMinimumOffer(d.minimumOffer);
      if (d.currency) setCurrency(d.currency);
      if (d.pricingType) setPricingType(d.pricingType);
      if (d.country) setCountry(d.country);
      if (d.region) setRegion(d.region);
      if (d.shippingOptions) setShippingOptions(new Set(d.shippingOptions));
      if (d.discordUsername) setDiscordUsername(d.discordUsername);
      if (d.buildPermalink) setBuildPermalink(d.buildPermalink);
      if (d.imageUrls) setImageUrls(d.imageUrls);
    } catch {
      console.warn('Failed to restore draft');
    }
    setShowDraftBanner(false);
  };

  const discardDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setShowDraftBanner(false);
  };

  // Image upload
  const uploadImage = async (file: File): Promise<string | null> => {
    const csrfToken = await ensureCsrfToken();
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/v1/uploads', {
      method: 'POST',
      credentials: 'include',
      headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
      body: form,
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.url;
  };

  const handleImageFiles = async (files: FileList | File[]) => {
    const fileArr = Array.from(files);
    if (fileArr.length === 0) return;

    for (const file of fileArr) {
      setUploadingCount(c => c + 1);
      try {
        const url = await uploadImage(file);
        if (url) {
          setImageUrls(prev => [...prev, url]);
          showToast('Image uploaded');
        } else {
          setUploadErrors(prev => [...prev, `Failed to upload ${file.name}`]);
        }
      } catch {
        setUploadErrors(prev => [...prev, `Failed to upload ${file.name}`]);
      } finally {
        setUploadingCount(c => c - 1);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragActive(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setDragActive(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length > 0) handleImageFiles(e.dataTransfer.files);
  };

  const handleAddUrl = () => {
    const url = addUrlValue.trim();
    if (!url) return;
    try { new URL(url); } catch { setUploadErrors(prev => [...prev, 'Invalid URL']); return; }
    setImageUrls(prev => [...prev, url]);
    setAddUrlValue('');
  };

  const handleThumbDragStart = (idx: number) => setDragIdx(idx);
  const handleThumbDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setImageUrls(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    setDragIdx(idx);
  };
  const handleThumbDragEnd = () => setDragIdx(null);

  const isPermalinkValid = !buildPermalink || buildPermalink.startsWith('/list/');
  const canSubmit = title.trim().length >= 3 && description.trim().length >= 10 && category && (listingType === 'LOOKING_FOR' || condition) && country.trim().length > 0 && shippingOptions.size > 0 && termsAccepted && !submitting && isPermalinkValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    try {
      const listing = await api<{ id: string }>('/marketplace', {
        method: 'POST',
        body: {
          type: listingType,
          title: title.trim(),
          description: description.trim(),
          category,
          condition: condition || null,
          price: price ? Number(price) : null,
          minimumOffer: minimumOffer ? Number(minimumOffer) : null,
          currency,
          pricingType,
          country: country.trim(),
          region: region.trim() || null,
          shippingOptions: Array.from(shippingOptions),
          discordUsername: discordUsername.trim() || null,
          buildPermalink: buildPermalink.trim() || null,
          imageUrls: imageUrls.length > 0 ? imageUrls : [],
        },
      });
      showToast('Listing created!', 'success');
      localStorage.removeItem(DRAFT_KEY);
      Object.keys(listingCache).forEach(k => delete listingCache[k]);
      navigate(`/marketplace/${listing.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create listing');
    } finally {
      setSubmitting(false);
    }
  };

  // Login gate
  if (!user) {
    return (
      <div className={styles.formContainer}>
        <div className={styles.loginRequired}>
          <h2 className={styles.formTitle}>Create a Listing</h2>
          <p className={styles.loginMessage}>You must be logged in to create a listing.</p>
          <a href="/login" className={styles.loginLink}>Log In</a>
        </div>
      </div>
    );
  }

  // Step 1: Type selection
  if (step === 1 || !listingType) {
    return (
      <div className={styles.formContainer}>
        {showDraftBanner && (
          <div className={styles.draftBanner}>
            <span>You have an unsaved draft. Restore it?</span>
            <button className={styles.draftRestore} onClick={restoreDraft}>Restore</button>
            <button className={styles.draftDiscard} onClick={discardDraft}>Discard</button>
          </div>
        )}

        <header className={styles.formHeader}>
          <a href="/marketplace" className={styles.backLink}>← Back to Marketplace</a>
          <h1 className={styles.formTitle}>New Listing</h1>
          <p className={styles.formSubtitle}>What would you like to do?</p>
        </header>

        <div className={styles.typeGrid}>
          {Object.entries(LISTING_TYPE_LABELS).map(([key, { label, color }]) => (
            <button
              key={key}
              className={styles.typeCard}
              style={{ borderColor: color }}
              onClick={() => { setListingType(key); setStep(2); }}
            >
              <span className={styles.typeCardIcon}>
                {key === 'SELLING' ? '💰' : key === 'LOOKING_FOR' ? '🔍' : '🔄'}
              </span>
              <span className={styles.typeCardLabel}>{label}</span>
              <span className={styles.typeCardDesc}>
                {key === 'SELLING' ? 'List an item for sale' : key === 'LOOKING_FOR' ? 'Post what you need' : 'Trade items with others'}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Step 2: Full form
  return (
    <div className={styles.formContainer}>
      {showDraftBanner && (
        <div className={styles.draftBanner}>
          <span>You have an unsaved draft. Restore it?</span>
          <button className={styles.draftRestore} onClick={restoreDraft}>Restore</button>
          <button className={styles.draftDiscard} onClick={discardDraft}>Discard</button>
        </div>
      )}

      <header className={styles.formHeader}>
        <button className={styles.backLink} onClick={() => { setStep(1); setListingType(''); }}>
          ← Change type
        </button>
        <h1 className={styles.formTitle}>
          {LISTING_TYPE_LABELS[listingType]?.label ?? 'New'} Listing
        </h1>
        <p className={styles.formSubtitle}>Fill in the details below</p>
      </header>

      <form className={styles.listingForm} onSubmit={handleSubmit}>
        {error && <div className={styles.formError}>{error}</div>}

        {/* Title */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="listing-title">Title</label>
          <input
            id="listing-title"
            type="text"
            className={styles.fieldInput}
            placeholder="e.g. Fanatec CSL DD 8Nm"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={200}
            required
          />
        </div>

        {/* Category + Condition row */}
        <div className={styles.fieldRow}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="listing-category">Category</label>
            <select
              id="listing-category"
              className={styles.fieldSelect}
              value={category}
              onChange={e => setCategory(e.target.value)}
              required
            >
              <option value="">Select…</option>
              {MARKETPLACE_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {listingType !== 'LOOKING_FOR' && (
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="listing-condition">Condition</label>
              <select
                id="listing-condition"
                className={styles.fieldSelect}
                value={condition}
                onChange={e => setCondition(e.target.value)}
                required
              >
                <option value="">Select…</option>
                {Object.entries(CONDITION_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Price + Currency */}
        {listingType !== 'LOOKING_FOR' && (
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="listing-price">Price</label>
            <div className={styles.priceRow}>
              <input
                id="listing-price"
                type="number"
                min="0"
                step="0.01"
                className={styles.fieldInput}
                placeholder="0.00"
                value={price}
                onChange={e => setPrice(e.target.value)}
              />
              <select
                className={`${styles.fieldSelect} ${styles.currencyInput}`}
                value={currency}
                onChange={e => setCurrency(e.target.value)}
              >
                <option value="GBP">£ GBP</option>
                <option value="EUR">€ EUR</option>
                <option value="USD">$ USD</option>
              </select>
            </div>
          </div>
        )}

        {/* Description */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="listing-desc">Description</label>
          <MarkdownEditor
            id="listing-desc"
            value={description}
            onChange={setDescription}
            placeholder="Describe the item, its condition, any accessories included…"
            rows={8}
            required
            maxLength={10000}
          />
        </div>

        {/* Location */}
        <div className={styles.fieldRow}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="listing-country">Country <span className={styles.fieldRequired}>*</span></label>
            <input
              id="listing-country"
              type="text"
              className={styles.fieldInput}
              placeholder="e.g. United Kingdom"
              value={country}
              onChange={e => setCountry(e.target.value)}
              required
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="listing-region">Region <span className={styles.fieldOptional}>(optional)</span></label>
            <input
              id="listing-region"
              type="text"
              className={styles.fieldInput}
              placeholder="e.g. London, South East"
              value={region}
              onChange={e => setRegion(e.target.value)}
            />
          </div>
        </div>

        {/* Pricing Type */}
        <div className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>Pricing</span>
          <div className={styles.pricingTypeRow}>
            {['FIXED', 'NEGOTIABLE', 'OPEN_TO_OFFERS', 'AUCTION'].map(pt => (
              <label key={pt} className={`${styles.radioLabel} ${pricingType === pt ? styles.radioActive : ''}`}>
                <input
                  type="radio"
                  name="pricingType"
                  value={pt}
                  checked={pricingType === pt}
                  onChange={() => setPricingType(pt)}
                  className={styles.radioInput}
                />
                <span>{pt === 'OPEN_TO_OFFERS' ? 'Open to Offers' : pt.charAt(0) + pt.slice(1).toLowerCase()}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Minimum Offer */}
        {(pricingType === 'NEGOTIABLE' || pricingType === 'OPEN_TO_OFFERS' || pricingType === 'AUCTION') && (
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="listing-min-offer">
              Minimum Offer <span className={styles.fieldOptional}>(optional)</span>
            </label>
            <input
              id="listing-min-offer"
              type="number"
              min="0"
              step="0.01"
              className={styles.fieldInput}
              placeholder="0.00"
              value={minimumOffer}
              onChange={e => setMinimumOffer(e.target.value)}
            />
          </div>
        )}

        {/* Discord Username */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="listing-discord">
            Discord Username <span className={styles.fieldOptional}>(optional)</span>
          </label>
          <input
            id="listing-discord"
            type="text"
            className={styles.fieldInput}
            placeholder="@username"
            value={discordUsername}
            onChange={e => setDiscordUsername(e.target.value)}
          />
        </div>

        {/* Shipping options */}
        <div className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>Shipping / Pickup <span className={styles.fieldRequired}>*</span></span>
          <div className={styles.shippingOptions}>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" checked={shippingOptions.has('LOCAL_PICKUP')} onChange={() => { const n = new Set(shippingOptions); if (n.has('LOCAL_PICKUP')) n.delete('LOCAL_PICKUP'); else n.add('LOCAL_PICKUP'); setShippingOptions(n); }} className={styles.checkbox} />
              <span>Local Pickup</span>
            </label>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" checked={shippingOptions.has('NATIONAL_SHIPPING')} onChange={() => { const n = new Set(shippingOptions); if (n.has('NATIONAL_SHIPPING')) n.delete('NATIONAL_SHIPPING'); else n.add('NATIONAL_SHIPPING'); setShippingOptions(n); }} className={styles.checkbox} />
              <span>National Shipping</span>
            </label>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" checked={shippingOptions.has('INTERNATIONAL_SHIPPING')} onChange={() => { const n = new Set(shippingOptions); if (n.has('INTERNATIONAL_SHIPPING')) n.delete('INTERNATIONAL_SHIPPING'); else n.add('INTERNATIONAL_SHIPPING'); setShippingOptions(n); }} className={styles.checkbox} />
              <span>International Shipping</span>
            </label>
          </div>
        </div>

        {/* Build permalink */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="listing-permalink">
            RigBuilder Permalink <span className={styles.fieldOptional}>(optional)</span>
          </label>
          <input
            id="listing-permalink"
            type="text"
            className={`${styles.fieldInput} ${buildPermalink && !isPermalinkValid ? styles.fieldInvalid : ''}`}
            placeholder="/list/abc123"
            value={buildPermalink}
            onChange={e => setBuildPermalink(e.target.value)}
          />
          {buildPermalink && !isPermalinkValid && (
            <span className={styles.fieldHint}>Must start with /list/</span>
          )}
          {buildPermalink && isPermalinkValid && buildPermalink.trim() && (
            <EmbedBuildCard permalink={buildPermalink} />
          )}
        </div>

        {/* Images */}
        <div className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>Images <span className={styles.fieldOptional}>(recommended)</span></span>

          <div
            className={`${styles.dropZone} ${dragActive ? styles.dropZoneActive : ''}`}
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <span className={styles.dropZoneIcon}>📤</span>
            <span className={styles.dropZoneText}>Drop images here or click to upload</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={e => e.target.files && handleImageFiles(e.target.files)}
            />
          </div>

          {/* URL input */}
          <div className={styles.urlAddRow}>
            <input
              type="url"
              className={styles.fieldInput}
              placeholder="Or add image by URL…"
              value={addUrlValue}
              onChange={e => setAddUrlValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddUrl())}
            />
            <button type="button" className={styles.addBtn} onClick={handleAddUrl}>Add</button>
          </div>

          {uploadErrors.length > 0 && (
            <div className={styles.uploadErrorList}>
              {uploadErrors.map((err, i) => (
                <div key={i} className={styles.uploadError}>{err}</div>
              ))}
            </div>
          )}

          {(imageUrls.length > 0 || uploadingCount > 0) && (
            <div className={styles.thumbRow}>
              {imageUrls.map((url, i) => (
                <div
                  key={`${url}-${i}`}
                  className={`${styles.thumbCard} ${dragIdx === i ? styles.thumbDragging : ''}`}
                  draggable
                  onDragStart={() => handleThumbDragStart(i)}
                  onDragOver={e => handleThumbDragOver(e, i)}
                  onDragEnd={handleThumbDragEnd}
                >
                  <img src={resolveImageUrl(url)} alt={`Image ${i + 1}`} className={styles.thumbImg} />
                  <button
                    type="button"
                    className={styles.thumbRemove}
                    onClick={() => setImageUrls(imageUrls.filter((_, j) => j !== i))}
                  >×</button>
                </div>
              ))}
              {Array.from({ length: uploadingCount }).map((_, i) => (
                <div key={`uploading-${i}`} className={styles.thumbCard}>
                  <div className={styles.thumbLoading}>⏳</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Premium boost (disabled) */}
        <div className={styles.fieldGroup}>
          <div className={styles.premiumToggle}>
            <label className={styles.premiumToggleLabel}>
              <input type="checkbox" disabled className={styles.checkbox} />
              <span className={styles.premiumToggleText}>
                <span className={styles.premiumLockIcon}>🔒</span>
                Boost Listing
                <span className={styles.premiumComingSoon}>Premium feature — coming soon</span>
              </span>
            </label>
          </div>
        </div>

        {/* Terms */}
        <div className={styles.termsSection}>
          <label className={styles.termsLabel}>
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={() => setTermsAccepted(!termsAccepted)}
              className={styles.checkbox}
            />
            <span className={styles.termsText}>
              I have read and agree to the marketplace terms. I understand that RigBuilder is not a party to any transaction.
            </span>
          </label>
          <details className={styles.termsDetails}>
            <summary className={styles.termsSummary}>View full terms</summary>
            <p className={styles.termsBody}>{MARKETPLACE_DISCLAIMERS.termsOfUse}</p>
          </details>
        </div>

        <div className={styles.formActions}>
          <button type="submit" className={styles.submitBtn} disabled={!canSubmit}>
            {submitting ? 'Creating…' : 'Create Listing'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Listing Detail Page
// ---------------------------------------------------------------------------

function ListingDetailPage({ listingId }: { listingId: string }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [listing, setListing] = useState<ListingItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Image gallery
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  // Offers
  const [offers, setOffers] = useState<Offer[]>([]);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [offerSubmitting, setOfferSubmitting] = useState(false);

  // Reviews
  const [reviews, setReviews] = useState<Review[]>([]);

  // Report modal
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);

  // Owner controls
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Contact seller
  const [contactMessage, setContactMessage] = useState('');
  const [contactSending, setContactSending] = useState(false);

  useEffect(() => {
    setLoading(true);
    api<ListingItem>(`/marketplace/${listingId}`)
      .then(data => {
        setListing(data);
        setActiveImageIdx(0);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load listing'))
      .finally(() => setLoading(false));
  }, [listingId]);

  // Fetch offers and reviews
  useEffect(() => {
    if (!listing) return;
    api<Offer[]>(`/marketplace/${listingId}/offers`).then(d => setOffers(d)).catch(() => {});
    if (listing.user?.id) {
      api<Review[]>(`/marketplace/users/${listing.user.id}/reviews`).then(d => setReviews(d)).catch(() => {});
    }
  }, [listing, listingId]);

  const isOwner = user && listing && user.userId === listing.user.id;
  const isSold = listing?.status === 'SOLD' || listing?.status === 'FOUND';
  const typeInfo = listing ? (LISTING_TYPE_LABELS[listing.type] ?? { label: listing.type, color: '#7878A0' }) : null;

  const handleStatusUpdate = async (newStatus: string) => {
    if (!listing) return;
    setStatusUpdating(true);
    try {
      await api(`/marketplace/${listing.id}/status`, { method: 'POST', body: { status: newStatus } });
      setListing(prev => prev ? { ...prev, status: newStatus } : prev);
      showToast(`Listing marked as ${newStatus.toLowerCase()}`, 'success');
    } catch {
      showToast('Failed to update status', 'error');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!listing || !window.confirm('Are you sure you want to delete this listing?')) return;
    try {
      await api(`/marketplace/${listing.id}`, { method: 'DELETE' });
      showToast('Listing deleted', 'success');
      Object.keys(listingCache).forEach(k => delete listingCache[k]);
      navigate('/marketplace');
    } catch {
      showToast('Failed to delete listing', 'error');
    }
  };

  const handleOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerAmount || offerSubmitting) return;
    setOfferSubmitting(true);
    try {
      const offer = await api<Offer>(`/marketplace/${listingId}/offers`, {
        method: 'POST',
        body: { amount: Number(offerAmount), currency: listing?.currency ?? 'GBP', message: offerMessage || null },
      });
      setOffers(prev => [offer, ...prev]);
      setShowOfferForm(false);
      setOfferAmount('');
      setOfferMessage('');
      showToast('Offer sent!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to send offer', 'error');
    } finally {
      setOfferSubmitting(false);
    }
  };

  const handleOfferAction = async (offerId: string, action: 'accept' | 'reject') => {
    try {
      await api(`/marketplace/offers/${offerId}`, { method: 'PUT', body: { status: action === 'accept' ? 'ACCEPTED' : 'REJECTED' } });
      setOffers(prev => prev.map(o => o.id === offerId ? { ...o, status: action === 'accept' ? 'ACCEPTED' : 'REJECTED' } : o));
      showToast(`Offer ${action}ed`, 'success');
    } catch {
      showToast(`Failed to ${action} offer`, 'error');
    }
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportReason || reportSubmitting) return;
    setReportSubmitting(true);
    try {
      await api(`/marketplace/${listingId}/report`, {
        method: 'POST',
        body: { reason: reportReason, details: reportDetails || null },
      });
      setShowReport(false);
      setReportReason('');
      setReportDetails('');
      showToast('Report submitted', 'success');
    } catch {
      showToast('Failed to submit report', 'error');
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleContactSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactMessage.trim() || contactSending) return;
    setContactSending(true);
    try {
      await api('/marketplace/messages', {
        method: 'POST',
        body: { listingId, recipientId: listing?.user.id, body: contactMessage.trim() },
      });
      setContactMessage('');
      showToast('Message sent!', 'success');
    } catch {
      showToast('Failed to send message', 'error');
    } finally {
      setContactSending(false);
    }
  };

  if (loading) return <div className={styles.loadingState}>Loading listing…</div>;
  if (error || !listing) {
    return (
      <div className={styles.errorState}>
        <h2>Listing not found</h2>
        <p>{error ?? 'This listing may have been removed'}</p>
        <a href="/marketplace" className={styles.backLink}>← Back to Marketplace</a>
      </div>
    );
  }

  return (
    <div className={styles.detailContainer}>
      <a href="/marketplace" className={styles.backLink}>← Back to Marketplace</a>

      <div className={styles.detailLayout}>
        {/* Left: Images */}
        <div className={styles.detailGallery}>
          {listing.imageUrls.length > 0 ? (
            <>
              <div className={styles.galleryMain}>
                <img
                  src={resolveImageUrl(listing.imageUrls[activeImageIdx])}
                  alt={listing.title}
                  className={styles.galleryMainImage}
                />
                {isSold && <div className={styles.gallerySoldOverlay}>SOLD</div>}
              </div>
              {listing.imageUrls.length > 1 && (
                <div className={styles.galleryThumbs}>
                  {listing.imageUrls.map((url, i) => (
                    <button
                      key={i}
                      className={`${styles.galleryThumb} ${i === activeImageIdx ? styles.galleryThumbActive : ''}`}
                      onClick={() => setActiveImageIdx(i)}
                    >
                      <img src={resolveImageUrl(url)} alt={`${listing.title} ${i + 1}`} />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className={styles.galleryNoImage}>
              <span>📷</span>
              <span>No images</span>
            </div>
          )}
        </div>

        {/* Right: Info */}
        <div className={styles.detailInfo}>
          <div className={styles.detailBadges}>
            {typeInfo && (
              <span className={styles.typeBadge} style={{ background: typeInfo.color, color: '#05050A' }}>
                {typeInfo.label}
              </span>
            )}
            <span className={styles.conditionTag}>{CONDITION_LABELS[listing.condition] ?? listing.condition}</span>
            <span className={styles.categoryTag}>{listing.category}</span>
            {listing.isPremium && <span className={styles.premiumBadge}>⚡ Boosted</span>}
            {isSold && <span className={styles.soldTag}>{listing.status}</span>}
          </div>

          <h1 className={styles.detailTitle}>{listing.title}</h1>

          {listing.price !== null && (
            <div className={styles.detailPrice}>{formatPrice(listing.price, listing.currency)}</div>
          )}

          {/* Shipping pills */}
          <div className={styles.detailShipping}>
            {listing.shippingOptions?.includes('LOCAL_PICKUP') && <span className={styles.shippingPill}>📍 Local Pickup</span>}
            {listing.shippingOptions?.includes('NATIONAL_SHIPPING') && <span className={styles.shippingPill}>📦 National Shipping</span>}
            {listing.shippingOptions?.includes('INTERNATIONAL_SHIPPING') && <span className={styles.shippingPill}>🌍 International Shipping</span>}
          </div>

          {/* Location + dates */}
          <div className={styles.detailMeta}>
            {listing.country && <span>📍 {listing.country}{listing.region ? `, ${listing.region}` : ''}</span>}
            <span>Listed {relativeTime(listing.createdAt)}</span>
            <span>👁 {listing.viewCount} views</span>
          </div>

          {/* Description */}
          <div className={styles.detailDescription}>
            <h3 className={styles.detailSectionTitle}>Description</h3>
            <div className={styles.markdownContent}>
              <Markdown>{listing.description ?? ''}</Markdown>
            </div>
          </div>

          {/* Build link - detect /list/ permalink from description */}
          {(() => {
            const match = listing.description?.match(/\/list\/[a-zA-Z0-9]+/);
            return match ? (
              <div className={styles.detailBuildLink}>
                <h3 className={styles.detailSectionTitle}>Linked Build</h3>
                <EmbedBuildCard permalink={match[0]} />
              </div>
            ) : null;
          })()}

          {/* Seller card */}
          <div className={styles.sellerCard}>
            <div className={styles.sellerInfo}>
              <div className={styles.sellerAvatar}>
                {listing.user.avatarUrl ? (
                  <img src={resolveImageUrl(listing.user.avatarUrl)} alt={listing.user.username} />
                ) : (
                  <span>{listing.user.username[0].toUpperCase()}</span>
                )}
              </div>
              <div>
                <div className={styles.sellerName}>{listing.user.username}</div>
                <div className={styles.sellerRating}>
                  {listing.user.sellerRating !== null ? (
                    <>{renderStars(listing.user.sellerRating)} ({listing.user.sellerReviewCount})</>
                  ) : (
                    <span className={styles.sellerNoRating}>No ratings yet</span>
                  )}
                </div>
              </div>
            </div>

            {/* Contact form */}
            {user && !isOwner && !isSold && (
              <form className={styles.contactForm} onSubmit={handleContactSeller}>
                <textarea
                  className={styles.contactTextarea}
                  placeholder="Send a message to the seller…"
                  value={contactMessage}
                  onChange={e => setContactMessage(e.target.value)}
                  rows={3}
                  maxLength={2000}
                />
                <button type="submit" className={styles.contactBtn} disabled={!contactMessage.trim() || contactSending}>
                  {contactSending ? 'Sending…' : 'Send Message'}
                </button>
              </form>
            )}
          </div>

          {/* Make offer (non-owner, not sold) */}
          {user && !isOwner && !isSold && listing.type === 'SELLING' && (
            <div className={styles.offerSection}>
              {!showOfferForm ? (
                <button className={styles.makeOfferBtn} onClick={() => setShowOfferForm(true)}>
                  💰 Make an Offer
                </button>
              ) : (
                <form className={styles.offerForm} onSubmit={handleOfferSubmit}>
                  <h4 className={styles.offerFormTitle}>Make an Offer</h4>
                  <div className={styles.priceRow}>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={styles.fieldInput}
                      placeholder="Your offer"
                      value={offerAmount}
                      onChange={e => setOfferAmount(e.target.value)}
                      required
                    />
                    <span className={styles.offerCurrency}>{CURRENCY_SYMBOLS[listing.currency] ?? listing.currency}</span>
                  </div>
                  <textarea
                    className={styles.contactTextarea}
                    placeholder="Optional message…"
                    value={offerMessage}
                    onChange={e => setOfferMessage(e.target.value)}
                    rows={2}
                  />
                  <div className={styles.offerFormActions}>
                    <button type="button" className={styles.cancelBtn} onClick={() => setShowOfferForm(false)}>Cancel</button>
                    <button type="submit" className={styles.submitBtn} disabled={offerSubmitting}>
                      {offerSubmitting ? 'Sending…' : 'Send Offer'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Offers list (owner view) */}
          {isOwner && offers.length > 0 && (
            <div className={styles.offersSection}>
              <h3 className={styles.detailSectionTitle}>Offers ({offers.length})</h3>
              {offers.map(offer => (
                <div key={offer.id} className={styles.offerCard}>
                  <div className={styles.offerCardHeader}>
                    <span className={styles.offerUser}>{offer.user.username}</span>
                    <span className={styles.offerAmount}>{formatPrice(offer.amount, offer.currency)}</span>
                    <span className={`${styles.offerStatus} ${styles[`offerStatus${offer.status}`]}`}>{offer.status}</span>
                  </div>
                  {offer.message && <p className={styles.offerMessage}>{offer.message}</p>}
                  <span className={styles.offerTime}>{relativeTime(offer.createdAt)}</span>
                  {offer.status === 'PENDING' && (
                    <div className={styles.offerActions}>
                      <button className={styles.acceptBtn} onClick={() => handleOfferAction(offer.id, 'accept')}>Accept</button>
                      <button className={styles.rejectBtn} onClick={() => handleOfferAction(offer.id, 'reject')}>Reject</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Owner controls */}
          {isOwner && (
            <div className={styles.ownerControls}>
              <h3 className={styles.detailSectionTitle}>Manage Listing</h3>
              <div className={styles.ownerActions}>
                {!isSold && (
                  <>
                    <button
                      className={styles.statusBtn}
                      onClick={() => handleStatusUpdate('SOLD')}
                      disabled={statusUpdating}
                    >Mark as Sold</button>
                    <button
                      className={styles.bumpBtn}
                      onClick={async () => {
                        try {
                          await api(`/marketplace/${listing.id}/extend`, { method: 'POST' });
                          showToast('Listing extended by 31 days!', 'success');
                        } catch {
                          showToast('Failed to extend listing', 'error');
                        }
                      }}
                    >⏳ Extend</button>
                  </>
                )}
                {isSold && (
                  <button
                    className={styles.statusBtn}
                    onClick={() => handleStatusUpdate('ACTIVE')}
                    disabled={statusUpdating}
                  >Reactivate</button>
                )}
                <button className={styles.deleteBtn} onClick={handleDelete}>Delete</button>
              </div>
            </div>
          )}

          {/* Reviews */}
          {reviews.length > 0 && (
            <div className={styles.reviewsSection}>
              <h3 className={styles.detailSectionTitle}>Reviews ({reviews.length})</h3>
              {reviews.map(review => (
                <div key={review.id} className={styles.reviewCard}>
                  <div className={styles.reviewHeader}>
                    <span className={styles.reviewUser}>{review.reviewer.username}</span>
                    <span className={styles.reviewStars}>{renderStars(review.rating)}</span>
                    <span className={styles.reviewTime}>{relativeTime(review.createdAt)}</span>
                  </div>
                  {review.comment && <p className={styles.reviewComment}>{review.comment}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Report */}
          {user && !isOwner && (
            <div className={styles.reportSection}>
              <button className={styles.reportBtn} onClick={() => setShowReport(true)}>
                ⚑ Report this listing
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Report modal */}
      {showReport && (
        <div className={styles.modalOverlay} onClick={() => setShowReport(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Report Listing</h3>
              <button className={styles.modalClose} onClick={() => setShowReport(false)}>×</button>
            </div>
            <form onSubmit={handleReport}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Reason</label>
                <select
                  className={styles.fieldSelect}
                  value={reportReason}
                  onChange={e => setReportReason(e.target.value)}
                  required
                >
                  <option value="">Select a reason…</option>
                  <option value="FRAUD">Suspected fraud / scam</option>
                  <option value="PROHIBITED">Prohibited item</option>
                  <option value="MISREPRESENTED">Item misrepresented</option>
                  <option value="DUPLICATE">Duplicate listing</option>
                  <option value="OFFENSIVE">Offensive content</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Details (optional)</label>
                <textarea
                  className={styles.contactTextarea}
                  placeholder="Provide additional context…"
                  value={reportDetails}
                  onChange={e => setReportDetails(e.target.value)}
                  rows={4}
                />
              </div>
              <p className={styles.reportDisclaimer}>{MARKETPLACE_DISCLAIMERS.reportDisclaimer}</p>
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowReport(false)}>Cancel</button>
                <button type="submit" className={styles.submitBtn} disabled={!reportReason || reportSubmitting}>
                  {reportSubmitting ? 'Submitting…' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

function MarketplaceMessages({ conversationId }: { conversationId?: string }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvos, setLoadingConvos] = useState(true);

  const [activeConvo, setActiveConvo] = useState<string | null>(conversationId ?? null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Fetch conversations
  useEffect(() => {
    if (!user) return;
    setLoadingConvos(true);
    api<{ items: Conversation[] }>('/marketplace/conversations')
      .then(d => setConversations(d.items))
      .catch(() => {})
      .finally(() => setLoadingConvos(false));
  }, [user]);

  // Fetch messages for active conversation
  useEffect(() => {
    if (!activeConvo) { setMessages([]); return; }
    setLoadingMessages(true);
    api<{ items: Message[] }>(`/marketplace/conversations/${activeConvo}/messages`)
      .then(d => {
        setMessages(d.items);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      })
      .catch(() => {})
      .finally(() => setLoadingMessages(false));
  }, [activeConvo]);

  // Poll for new messages every 10 seconds
  useEffect(() => {
    if (!activeConvo) return;
    const interval = setInterval(() => {
      api<{ items: Message[] }>(`/marketplace/conversations/${activeConvo}/messages`)
        .then(d => {
          setMessages(prev => {
            if (d.items.length !== prev.length) {
              setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
              return d.items;
            }
            return prev;
          });
        })
        .catch(() => {});
    }, 10_000);
    return () => clearInterval(interval);
  }, [activeConvo]);

  // Also poll conversations for unread counts
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      api<{ items: Conversation[] }>('/marketplace/conversations')
        .then(d => setConversations(d.items))
        .catch(() => {});
    }, 30_000);
    return () => clearInterval(interval);
  }, [user]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConvo || sending) return;
    setSending(true);
    try {
      const msg = await api<Message>(`/marketplace/conversations/${activeConvo}/messages`, {
        method: 'POST',
        body: { body: newMessage.trim() },
      });
      setMessages(prev => [...prev, msg]);
      setNewMessage('');
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch {
      showToast('Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return (
      <div className={styles.formContainer}>
        <div className={styles.loginRequired}>
          <h2 className={styles.formTitle}>Messages</h2>
          <p className={styles.loginMessage}>You must be logged in to view messages.</p>
          <a href="/login" className={styles.loginLink}>Log In</a>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.messagesContainer}>
      <header className={styles.messagesHeader}>
        <a href="/marketplace" className={styles.backLink}>← Marketplace</a>
        <h1 className={styles.messagesTitle}>Messages</h1>
      </header>

      <div className={styles.messagesLayout}>
        {/* Conversation list */}
        <aside className={styles.convoList}>
          {loadingConvos ? (
            <div className={styles.loadingState}>Loading…</div>
          ) : conversations.length === 0 ? (
            <div className={styles.emptyConvos}>No conversations yet</div>
          ) : (
            conversations.map(convo => (
              <button
                key={convo.id}
                className={`${styles.convoItem} ${activeConvo === convo.id ? styles.convoItemActive : ''}`}
                onClick={() => {
                  setActiveConvo(convo.id);
                  navigate(`/marketplace/messages/${convo.id}`, { replace: true });
                }}
              >
                <div className={styles.convoAvatar}>
                  {convo.otherUser.avatarUrl ? (
                    <img src={resolveImageUrl(convo.otherUser.avatarUrl)} alt="" />
                  ) : (
                    <span>{convo.otherUser.username[0].toUpperCase()}</span>
                  )}
                </div>
                <div className={styles.convoDetails}>
                  <div className={styles.convoTopLine}>
                    <span className={styles.convoUsername}>{convo.otherUser.username}</span>
                    {convo.lastMessageAt && (
                      <span className={styles.convoTime}>{relativeTime(convo.lastMessageAt)}</span>
                    )}
                  </div>
                  <div className={styles.convoListing}>{convo.listingTitle}</div>
                  {convo.lastMessage && (
                    <div className={styles.convoPreview}>
                      {convo.lastMessage.length > 60 ? convo.lastMessage.slice(0, 60) + '…' : convo.lastMessage}
                    </div>
                  )}
                </div>
                {convo.unreadCount > 0 && (
                  <span className={styles.unreadBadge}>{convo.unreadCount}</span>
                )}
              </button>
            ))
          )}
        </aside>

        {/* Message view */}
        <div className={styles.messageView}>
          {!activeConvo ? (
            <div className={styles.noConvoSelected}>
              <span>✉</span>
              <p>Select a conversation to view messages</p>
            </div>
          ) : loadingMessages ? (
            <div className={styles.loadingState}>Loading messages…</div>
          ) : (
            <>
              <div className={styles.messagesList}>
                {messages.map(msg => {
                  const isMine = msg.senderId === user.userId;
                  return (
                    <div key={msg.id} className={`${styles.messageBubble} ${isMine ? styles.messageMine : styles.messageTheirs}`}>
                      <div className={styles.messageBody}>{msg.body}</div>
                      <div className={styles.messageTime}>{relativeTime(msg.createdAt)}</div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <form className={styles.messageInputForm} onSubmit={handleSend}>
                <input
                  type="text"
                  className={styles.messageInput}
                  placeholder="Type a message…"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  maxLength={2000}
                />
                <button type="submit" className={styles.sendBtn} disabled={!newMessage.trim() || sending}>
                  {sending ? '…' : '➤'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
