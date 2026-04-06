import { prisma } from '../prisma';
import type { GuideCategory, Prisma } from '@prisma/client';

export interface GuideListParams {
  page: number;
  limit: number;
  category?: GuideCategory;
  tag?: string;
  published?: boolean;
}

export class GuideRepository {
  static async findMany(params: GuideListParams) {
    const { page, limit, category, tag, published = true } = params;

    const where: Prisma.GuideWhereInput = {
      ...(published !== undefined && { isPublished: published }),
      ...(category && { category }),
      ...(tag && { tags: { has: tag } }),
    };

    const [items, total] = await Promise.all([
      prisma.guide.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          author: { select: { id: true, username: true, avatarUrl: true } },
        },
      }),
      prisma.guide.count({ where }),
    ]);

    return { items, total };
  }

  static async findBySlug(slug: string) {
    return prisma.guide.findUnique({
      where: { slug },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true, bio: true } },
      },
    });
  }

  static async create(data: Prisma.GuideCreateInput) {
    return prisma.guide.create({ data });
  }

  static async update(id: string, data: Prisma.GuideUpdateInput) {
    return prisma.guide.update({ where: { id }, data });
  }

  static async delete(id: string) {
    await prisma.guide.delete({ where: { id } });
  }

  /** Resolve product mentions — fetch products by IDs for Live Spec Cards. */
  static async resolveProductMentions(productIds: string[]) {
    if (productIds.length === 0) return [];
    return prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        slug: true,
        manufacturer: true,
        category: true,
        specs: true,
        affiliateLinks: true,
        avgRating: true,
        reviewCount: true,
        images: true,
      },
    });
  }
}
