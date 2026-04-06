import { prisma } from '../prisma';
import type { Prisma, Build } from '@prisma/client';

export interface BuildListParams {
  page: number;
  limit: number;
  userId?: string;
  search?: string;
  minBudget?: number;
  maxBudget?: number;
  disciplines?: string[];
  platforms?: string[];
  sortBy?: 'createdAt' | 'upvoteCount' | 'totalCost';
  sortDir?: 'asc' | 'desc';
}

export class BuildRepository {
  static async findMany(params: BuildListParams) {
    const { page, limit, userId, search, minBudget, maxBudget, disciplines, platforms, sortBy = 'createdAt', sortDir = 'desc' } = params;

    const where: Prisma.BuildWhereInput = {
      isPublic: userId ? undefined : true,
      ...(userId && { userId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...((minBudget != null || maxBudget != null) && {
        totalCost: {
          ...(minBudget != null && { gte: minBudget }),
          ...(maxBudget != null && { lte: maxBudget }),
        },
      }),
      ...(disciplines && disciplines.length > 0 && {
        disciplines: { hasSome: disciplines as any },
      }),
      ...(platforms && platforms.length > 0 && {
        platforms: { hasSome: platforms as any },
      }),
    };

    const [items, total] = await Promise.all([
      prisma.build.findMany({
        where,
        include: {
          user: { select: { id: true, username: true, avatarUrl: true } },
          parts: { include: { product: { select: { id: true, name: true, category: true, images: true } } } },
        },
        orderBy: { [sortBy]: sortDir },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.build.count({ where }),
    ]);

    return { items, total };
  }

  static async findById(id: string) {
    return prisma.build.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
        parts: { include: { product: true } },
      },
    });
  }

  static async create(userId: string, data: Prisma.BuildCreateInput, parts: { productId: string; categorySlot: any; pricePaid?: number; notes?: string }[]) {
    return prisma.build.create({
      data: {
        ...data,
        user: { connect: { id: userId } },
        parts: {
          create: parts.map((p) => ({
            product: { connect: { id: p.productId } },
            categorySlot: p.categorySlot,
            pricePaid: p.pricePaid,
            notes: p.notes,
          })),
        },
      },
      include: { parts: { include: { product: true } } },
    });
  }

  static async update(id: string, data: Prisma.BuildUpdateInput) {
    return prisma.build.update({ where: { id }, data });
  }

  static async delete(id: string) {
    await prisma.build.delete({ where: { id } });
  }
}
