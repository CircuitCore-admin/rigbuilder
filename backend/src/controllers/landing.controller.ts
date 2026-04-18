import type { Request, Response } from 'express';
import { prisma } from '../prisma';

const VALID_CATEGORIES = ['WHEELBASE', 'WHEEL_RIM', 'PEDALS', 'COCKPIT', 'SEAT', 'SHIFTER', 'DISPLAY', 'EXTRAS'];

function getCategoryLabel(cat: string): string {
  const map: Record<string, string> = {
    WHEELBASE: 'Wheel Base', WHEEL_RIM: 'Wheel Rim', PEDALS: 'Pedals',
    COCKPIT: 'Rig/Cockpit', SEAT: 'Seat', SHIFTER: 'Shifter',
    DISPLAY: 'Monitor', EXTRAS: 'Accessories',
  };
  return map[cat] ?? cat;
}

export class LandingController {
  /** GET /api/v1/landing/:category — aggregated data for category landing pages */
  static async getCategoryData(req: Request, res: Response) {
    const category = req.params.category.toUpperCase();
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const [
      topProducts,
      recentReviews,
      relatedThreads,
      activeListings,
      relatedGuides,
      productCount,
      avgPrice,
    ] = await Promise.all([
      prisma.product.findMany({
        where: { category: category as any },
        orderBy: { avgRating: 'desc' },
        take: 8,
        select: { id: true, name: true, slug: true, manufacturer: true, avgRating: true, reviewCount: true, images: true, affiliateLinks: true },
      }),
      prisma.review.findMany({
        where: { product: { category: category as any } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          user: { select: { id: true, username: true, avatarUrl: true } },
          product: { select: { id: true, name: true, slug: true } },
        },
      }),
      prisma.forumThread.findMany({
        where: {
          OR: [
            { product: { category: category as any } },
            { category: 'BUILD_ADVICE' },
          ],
        },
        orderBy: { replyCount: 'desc' },
        take: 5,
        include: { user: { select: { id: true, username: true } } },
      }),
      prisma.marketplaceListing.findMany({
        where: { category: getCategoryLabel(category), status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: { user: { select: { id: true, username: true } } },
      }),
      prisma.guide.findMany({
        where: { isPublished: true, tags: { hasSome: [category.toLowerCase()] } },
        orderBy: { viewCount: 'desc' },
        take: 3,
        select: { id: true, title: true, slug: true, excerpt: true, coverImage: true },
      }),
      prisma.product.count({ where: { category: category as any } }),
      prisma.priceHistory.aggregate({
        where: { product: { category: category as any }, currency: 'GBP' },
        _avg: { price: true },
      }),
    ]);

    res.json({
      category,
      stats: { productCount, avgPrice: avgPrice._avg.price },
      topProducts,
      recentReviews,
      relatedThreads,
      activeListings,
      relatedGuides,
    });
  }

  /** GET /api/v1/homepage — aggregated data for the homepage */
  static async getHomepageData(_req: Request, res: Response) {
    const [featuredBuild, trendingBuilds, recentGuides, recentReviews, recentListings, categoryCounts] = await Promise.all([
      prisma.build.findFirst({
        where: { isPublic: true, isFeatured: true },
        orderBy: { upvoteCount: 'desc' },
        include: {
          user: { select: { id: true, username: true } },
          parts: { include: { product: { select: { name: true, category: true } } } },
        },
      }),
      prisma.build.findMany({
        where: { isPublic: true },
        orderBy: { upvoteCount: 'desc' },
        take: 6,
        include: { user: { select: { id: true, username: true } } },
      }),
      prisma.guide.findMany({
        where: { isPublished: true },
        orderBy: { publishedAt: 'desc' },
        take: 3,
        include: { author: { select: { id: true, username: true } } },
      }),
      prisma.review.findMany({
        orderBy: { createdAt: 'desc' },
        take: 4,
        include: {
          user: { select: { id: true, username: true } },
          product: { select: { id: true, name: true, slug: true, category: true } },
        },
      }),
      prisma.marketplaceListing.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        take: 4,
        include: { user: { select: { id: true, username: true } } },
      }),
      prisma.product.groupBy({
        by: ['category'],
        _count: { id: true },
      }),
    ]);

    const categoryCountMap: Record<string, number> = {};
    for (const row of categoryCounts) {
      categoryCountMap[row.category] = row._count.id;
    }

    res.json({ featuredBuild, trendingBuilds, recentGuides, recentReviews, recentListings, categoryCounts: categoryCountMap });
  }
}
