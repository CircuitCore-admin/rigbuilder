import { prisma } from '../prisma';
import type { Prisma, Review } from '@prisma/client';

export interface ReviewListParams {
  page: number;
  limit: number;
  productId?: string;
  userId?: string;
  sortBy?: 'createdAt' | 'ratingOverall';
  sortDir?: 'asc' | 'desc';
}

export class ReviewRepository {
  static async findMany(params: ReviewListParams) {
    const { page, limit, productId, userId, sortBy = 'createdAt', sortDir = 'desc' } = params;

    const where: Prisma.ReviewWhereInput = {
      ...(productId && { productId }),
      ...(userId && { userId }),
    };

    const [items, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          user: { select: { id: true, username: true, avatarUrl: true } },
          product: { select: { id: true, name: true, slug: true, category: true } },
          upgradedFrom: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { [sortBy]: sortDir },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.review.count({ where }),
    ]);

    return { items, total };
  }

  static async findById(id: string) {
    return prisma.review.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
        product: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  static async findByUserAndProduct(userId: string, productId: string) {
    return prisma.review.findUnique({
      where: { userId_productId: { userId, productId } },
    });
  }

  static async create(data: Prisma.ReviewCreateInput): Promise<Review> {
    return prisma.review.create({ data });
  }

  static async update(id: string, data: Prisma.ReviewUpdateInput): Promise<Review> {
    return prisma.review.update({ where: { id }, data });
  }

  static async delete(id: string) {
    await prisma.review.delete({ where: { id } });
  }

  /** Recalculate product average rating after review mutation. */
  static async refreshProductRating(productId: string) {
    const agg = await prisma.review.aggregate({
      where: { productId },
      _avg: { ratingOverall: true },
      _count: true,
    });

    await prisma.product.update({
      where: { id: productId },
      data: {
        avgRating: agg._avg.ratingOverall ?? null,
        reviewCount: agg._count,
      },
    });
  }
}
