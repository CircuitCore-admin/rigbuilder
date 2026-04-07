import { prisma } from '../prisma.js';
import type { Prisma, Build } from '@prisma/client';

export interface BuildListParams {
  page: number;
  limit: number;
  userId?: string;
  search?: string;
  sortBy?: 'createdAt' | 'upvoteCount' | 'totalCost';
  sortDir?: 'asc' | 'desc';
}

export class BuildRepository {
  static async findMany(params: BuildListParams) {
    const { page, limit, userId, search, sortBy = 'createdAt', sortDir = 'desc' } = params;

    const where: Prisma.BuildWhereInput = {
      isPublic: userId ? undefined : true,
      ...(userId && { userId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
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
    console.log('🔍 findById called with:', JSON.stringify(id));

    const build = await prisma.build.findFirst({
      where: {
        OR: [
          { id },
          { slug: { equals: id, mode: 'insensitive' } },
        ],
      },
      include: {
        parts: {
          include: {
            product: true,
          },
        },
      },
    });

    console.log('🔍 DB Result:', build ? `Found build id=${build.id} slug=${build.slug}` : 'null');

    return build;
  }

  static async create(userId: string, data: any, parts: any[]) {
  const productIds = parts.map(p => p.productId);
  
  // 1. Verify all products exist before starting the transaction
  const existingProducts = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true }
  });

  const existingIds = existingProducts.map(p => p.id);
  const missingIds = productIds.filter(id => !existingIds.includes(id));

  if (missingIds.length > 0) {
    console.error('❌ Build creation failed. Missing Product IDs:', missingIds);
    throw new Error(`Invalid products: ${missingIds.join(', ')}. Please clear your build and re-add parts.`);
  }

  // 2. Proceed with creation if all IDs are valid
  return prisma.build.create({
    data: {
      ...data,
      user: { connect: { id: userId } },
      parts: {
        create: parts.map(p => ({
          product: { connect: { id: p.productId } },
          categorySlot: p.categorySlot,
          pricePaid: p.pricePaid,
          notes: p.notes
        }))
      }
    },
    include: { parts: { include: { product: true } } }
  });
}

  static async update(id: string, data: Prisma.BuildUpdateInput) {
    return prisma.build.update({ where: { id }, data });
  }

  static async delete(id: string) {
    await prisma.build.delete({ where: { id } });
  }
}
