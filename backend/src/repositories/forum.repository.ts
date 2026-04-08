import { prisma } from '../prisma';
import type { ForumCategory, Prisma } from '@prisma/client';

export interface ForumListParams {
  page: number;
  limit: number;
  category?: ForumCategory;
  productId?: string;
  sortBy?: 'createdAt' | 'replyCount' | 'viewCount';
  sortDir?: 'asc' | 'desc';
}

export class ForumRepository {
  static async findThreads(params: ForumListParams) {
    const { page, limit, category, productId, sortBy = 'createdAt', sortDir = 'desc' } = params;

    const where: Prisma.ForumThreadWhereInput = {
      ...(category && { category }),
      ...(productId && { productId }),
    };

    const [items, total] = await Promise.all([
      prisma.forumThread.findMany({
        where,
        orderBy: { [sortBy]: sortDir },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, username: true, avatarUrl: true, reputation: true, role: true } },
        },
      }),
      prisma.forumThread.count({ where }),
    ]);

    return { items, total };
  }

  static async findThreadBySlug(slug: string) {
    return prisma.forumThread.findUnique({
      where: { slug },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true, reputation: true, role: true } },
        product: { select: { id: true, name: true, slug: true, category: true } },
      },
    });
  }

  static async findThreadById(id: string) {
    return prisma.forumThread.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true, reputation: true } },
      },
    });
  }

  static async createThread(data: Prisma.ForumThreadCreateInput) {
    return prisma.forumThread.create({
      data,
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
      },
    });
  }

  static async findReplies(threadId: string) {
    return prisma.forumReply.findMany({
      where: { threadId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true, reputation: true, role: true } },
      },
    });
  }

  static async createReply(data: Prisma.ForumReplyCreateInput) {
    const reply = await prisma.forumReply.create({
      data,
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
      },
    });

    // Increment reply count on thread
    await prisma.forumThread.update({
      where: { id: (data.thread as any).connect.id },
      data: { replyCount: { increment: 1 } },
    });

    return reply;
  }

  static async upvoteReply(replyId: string) {
    return prisma.forumReply.update({
      where: { id: replyId },
      data: { upvotes: { increment: 1 } },
    });
  }

  /** Related discussions for a product (used on product detail pages). */
  static async findRelatedByProduct(productId: string, limit = 5) {
    return prisma.forumThread.findMany({
      where: { productId },
      orderBy: { replyCount: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, username: true } },
      },
    });
  }

  static async incrementViewCount(id: string) {
    return prisma.forumThread.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
  }
}
