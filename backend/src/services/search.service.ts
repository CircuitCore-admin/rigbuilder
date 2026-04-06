import { meili, INDEXES } from '../config/meilisearch';
import { prisma } from '../prisma';

/** Sim-racing terminology synonyms for better search relevance. */
const SIM_RACING_SYNONYMS = [
  ['wheelbase', 'wheel base', 'dd', 'direct drive'],
  ['pedals', 'pedal set', 'brake pedals', 'load cell'],
  ['cockpit', 'rig', 'frame', 'sim rig', 'chassis'],
  ['shifter', 'gear shifter', 'h-pattern', 'sequential'],
  ['wheel', 'wheel rim', 'steering wheel', 'rim'],
  ['display', 'monitor', 'vr', 'vr headset', 'triple monitor'],
  ['seat', 'bucket seat', 'racing seat'],
  ['bundle', 'kit', 'combo', 'package', 'starter kit'],
  ['fanatec', 'clubsport', 'csl', 'podium'],
  ['logitech', 'g29', 'g923', 'g pro'],
  ['thrustmaster', 't300', 't500', 't-gt'],
  ['simucube', 'sc2', 'sport', 'pro', 'ultimate'],
  ['moza', 'r9', 'r16', 'r21'],
];

export class SearchService {
  /**
   * Configure Meilisearch indexes with ranking rules optimized for
   * sim-racing terminology. Called once at app startup.
   */
  static async initializeIndexes(): Promise<void> {
    try {
      const productsIndex = meili.index(INDEXES.PRODUCTS);
      await productsIndex.updateSettings({
        searchableAttributes: [
          'name',
          'manufacturer',
          'category',
          'subcategory',
          'slug',
          'bundleCategories',
        ],
        filterableAttributes: ['category', 'manufacturer', 'platforms', 'isBundle', 'avgRating'],
        sortableAttributes: ['avgRating', 'reviewCount', 'buildCount', 'name', 'createdAt'],
        rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'],
        synonyms: Object.fromEntries(
          SIM_RACING_SYNONYMS.flatMap((group) =>
            group.map((term) => [term, group.filter((t) => t !== term)])
          )
        ),
        typoTolerance: { minWordSizeForTypos: { oneTypo: 3, twoTypos: 6 } },
      });

      const buildsIndex = meili.index(INDEXES.BUILDS);
      await buildsIndex.updateSettings({
        searchableAttributes: ['name', 'description', 'disciplines', 'userName'],
        filterableAttributes: ['isPublic', 'disciplines', 'platforms', 'spaceType'],
        sortableAttributes: ['upvoteCount', 'viewCount', 'totalCost', 'createdAt'],
      });

      const forumIndex = meili.index(INDEXES.FORUM_THREADS);
      await forumIndex.updateSettings({
        searchableAttributes: ['title', 'body', 'category', 'userName'],
        filterableAttributes: ['category', 'productId'],
        sortableAttributes: ['replyCount', 'viewCount', 'createdAt'],
      });
    } catch (err) {
      console.warn('⚠️  Meilisearch init skipped (not reachable):', (err as Error).message);
    }
  }

  /** Sync all products to Meilisearch. */
  static async syncProducts(): Promise<void> {
    const products = await prisma.product.findMany();
    const docs = products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      manufacturer: p.manufacturer,
      category: p.category,
      subcategory: p.subcategory,
      platforms: p.platforms,
      avgRating: p.avgRating,
      reviewCount: p.reviewCount,
      buildCount: p.buildCount,
      images: p.images,
      affiliateLinks: p.affiliateLinks,
      isBundle: p.name.toLowerCase().includes('bundle') || p.name.toLowerCase().includes('kit'),
      bundleCategories: extractBundleCategories(p.name, p.category),
      createdAt: p.createdAt.toISOString(),
    }));
    try {
      await meili.index(INDEXES.PRODUCTS).addDocuments(docs);
    } catch (err) {
      console.warn('⚠️  Product sync to Meilisearch failed:', (err as Error).message);
    }
  }

  /** Sync a single product (for create/update hooks). */
  static async syncProduct(productId: string): Promise<void> {
    const p = await prisma.product.findUnique({ where: { id: productId } });
    if (!p) return;
    try {
      await meili.index(INDEXES.PRODUCTS).addDocuments([{
        id: p.id, name: p.name, slug: p.slug, manufacturer: p.manufacturer,
        category: p.category, subcategory: p.subcategory, platforms: p.platforms,
        avgRating: p.avgRating, reviewCount: p.reviewCount, buildCount: p.buildCount,
        images: p.images, affiliateLinks: p.affiliateLinks,
        isBundle: p.name.toLowerCase().includes('bundle') || p.name.toLowerCase().includes('kit'),
        bundleCategories: extractBundleCategories(p.name, p.category),
        createdAt: p.createdAt.toISOString(),
      }]);
    } catch (err) {
      console.warn('⚠️  Single product sync failed:', (err as Error).message);
    }
  }

  /** Remove a product from the search index. */
  static async removeProduct(productId: string): Promise<void> {
    try { await meili.index(INDEXES.PRODUCTS).deleteDocument(productId); }
    catch (err) { console.warn('⚠️  Product removal from index failed:', (err as Error).message); }
  }

  /** Sync all public builds to Meilisearch. */
  static async syncBuilds(): Promise<void> {
    const builds = await prisma.build.findMany({
      where: { isPublic: true },
      include: { user: { select: { username: true } } },
    });
    const docs = builds.map((b) => ({
      id: b.id, name: b.name, slug: b.slug, description: b.description ?? '',
      disciplines: b.disciplines, platforms: b.platforms, spaceType: b.spaceType,
      totalCost: b.totalCost, upvoteCount: b.upvoteCount, viewCount: b.viewCount,
      isPublic: b.isPublic, userName: b.user.username, images: b.images,
      createdAt: b.createdAt.toISOString(),
    }));
    try { await meili.index(INDEXES.BUILDS).addDocuments(docs); }
    catch (err) { console.warn('⚠️  Build sync to Meilisearch failed:', (err as Error).message); }
  }

  /** Sync all forum threads to Meilisearch. */
  static async syncForumThreads(): Promise<void> {
    const threads = await prisma.forumThread.findMany({
      include: { user: { select: { username: true } } },
    });
    const docs = threads.map((t) => ({
      id: t.id, title: t.title, slug: t.slug, body: t.body, category: t.category,
      productId: t.productId, userName: t.user.username,
      replyCount: t.replyCount, viewCount: t.viewCount,
      createdAt: t.createdAt.toISOString(),
    }));
    try { await meili.index(INDEXES.FORUM_THREADS).addDocuments(docs); }
    catch (err) { console.warn('⚠️  Forum sync to Meilisearch failed:', (err as Error).message); }
  }

  /**
   * Unified instant search across products, builds, and forum threads.
   * Rate-limit strategy: 30 req/min on the endpoint + 200ms frontend debounce.
   * Response capped at 15 items total (5 per index).
   */
  static async instantSearch(query: string, options?: { category?: string; limit?: number }) {
    const limit = Math.min(options?.limit ?? 5, 20);
    try {
      const results = await meili.multiSearch({
        queries: [
          {
            indexUid: INDEXES.PRODUCTS, q: query, limit,
            ...(options?.category && { filter: `category = "${options.category}"` }),
          },
          { indexUid: INDEXES.BUILDS, q: query, limit, filter: 'isPublic = true' },
          { indexUid: INDEXES.FORUM_THREADS, q: query, limit },
        ],
      });
      return {
        products: results.results[0]?.hits ?? [],
        builds: results.results[1]?.hits ?? [],
        threads: results.results[2]?.hits ?? [],
      };
    } catch (err) {
      console.warn('⚠️  Meilisearch query failed, falling back to DB:', (err as Error).message);
      return SearchService.fallbackSearch(query, limit);
    }
  }

  /** Database fallback when Meilisearch is unavailable. */
  private static async fallbackSearch(query: string, limit: number) {
    const [products, builds, threads] = await Promise.all([
      prisma.product.findMany({
        where: { OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { manufacturer: { contains: query, mode: 'insensitive' } },
        ]},
        take: limit,
      }),
      prisma.build.findMany({
        where: { isPublic: true, OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ]},
        take: limit,
      }),
      prisma.forumThread.findMany({
        where: { OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { body: { contains: query, mode: 'insensitive' } },
        ]},
        take: limit,
      }),
    ]);
    return { products, builds, threads };
  }
}

/**
 * Extract component categories from a bundle product name.
 * e.g., "Logitech G29 Racing Bundle" → ['WHEELBASE', 'PEDALS', 'WHEEL_RIM']
 */
function extractBundleCategories(name: string, primaryCategory: string): string[] {
  const categories = [primaryCategory];
  const lower = name.toLowerCase();
  const categoryKeywords: Record<string, string[]> = {
    WHEELBASE: ['wheelbase', 'wheel base', 'direct drive', 'dd'],
    PEDALS: ['pedal', 'pedals', 'brake', 'load cell'],
    WHEEL_RIM: ['wheel', 'rim', 'steering'],
    COCKPIT: ['cockpit', 'rig', 'frame'],
    SHIFTER: ['shifter', 'gear'],
    DISPLAY: ['monitor', 'display', 'vr'],
    SEAT: ['seat', 'bucket'],
    EXTRAS: ['shaker', 'button box', 'handbrake'],
  };
  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    if (cat !== primaryCategory && keywords.some((kw) => lower.includes(kw))) {
      categories.push(cat);
    }
  }
  if ((lower.includes('bundle') || lower.includes('kit')) && primaryCategory === 'WHEELBASE') {
    if (!categories.includes('PEDALS')) categories.push('PEDALS');
    if (!categories.includes('WHEEL_RIM')) categories.push('WHEEL_RIM');
  }
  return categories;
}
