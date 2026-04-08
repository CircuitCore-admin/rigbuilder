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

  /**
   * Toggle upvote: if user already voted, remove vote and decrement;
   * otherwise create vote and increment. Returns { upvotes, voted }.
   */
  static async toggleUpvote(replyId: string, userId: string) {
    const existing = await prisma.forumVote.findUnique({
      where: { userId_replyId: { userId, replyId } },
    });

    if (existing) {
      await prisma.$transaction([
        prisma.forumVote.delete({ where: { id: existing.id } }),
        prisma.forumReply.update({ where: { id: replyId }, data: { upvotes: { decrement: 1 } } }),
      ]);
      const reply = await prisma.forumReply.findUnique({ where: { id: replyId }, select: { upvotes: true } });
      return { upvotes: reply?.upvotes ?? 0, voted: false };
    }

    await prisma.$transaction([
      prisma.forumVote.create({ data: { userId, replyId } }),
      prisma.forumReply.update({ where: { id: replyId }, data: { upvotes: { increment: 1 } } }),
    ]);
    const reply = await prisma.forumReply.findUnique({ where: { id: replyId }, select: { upvotes: true } });
    return { upvotes: reply?.upvotes ?? 0, voted: true };
  }

  /** Update a thread (for edit by owner or staff). */
  static async updateThread(id: string, data: { title?: string; body?: string; metadata?: unknown; imageUrls?: string[] }) {
    return prisma.forumThread.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.body !== undefined && { body: data.body }),
        ...(data.metadata !== undefined && { metadata: data.metadata as any }),
        ...(data.imageUrls !== undefined && { imageUrls: data.imageUrls }),
      },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
      },
    });
  }

  /** Delete a thread (for delete by owner or staff). */
  static async deleteThread(id: string) {
    return prisma.forumThread.delete({ where: { id } });
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
