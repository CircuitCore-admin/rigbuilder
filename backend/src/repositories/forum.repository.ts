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
  static async updateThread(id: string, data: { title?: string; body?: string; link?: string | null; metadata?: unknown; imageUrls?: string[] }) {
    return prisma.forumThread.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.body !== undefined && { body: data.body }),
        ...(data.link !== undefined && { link: data.link }),
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

  // ---------------------------------------------------------------------------
  // Thread Following
  // ---------------------------------------------------------------------------

  /** Toggle follow: if already following, unfollow; else follow. */
  static async toggleFollow(threadId: string, userId: string) {
    const existing = await prisma.threadFollower.findUnique({
      where: { userId_threadId: { userId, threadId } },
    });

    if (existing) {
      await prisma.threadFollower.delete({ where: { id: existing.id } });
      return { following: false };
    }

    await prisma.threadFollower.create({ data: { userId, threadId } });
    return { following: true };
  }

  /** Check if a user is following a thread. */
  static async isFollowing(threadId: string, userId: string) {
    const row = await prisma.threadFollower.findUnique({
      where: { userId_threadId: { userId, threadId } },
    });
    return !!row;
  }

  /** Get all follower user IDs for a thread. */
  static async getFollowerIds(threadId: string): Promise<string[]> {
    const followers = await prisma.threadFollower.findMany({
      where: { threadId },
      select: { userId: true },
    });
    return followers.map((f) => f.userId);
  }

  // ---------------------------------------------------------------------------
  // Notifications
  // ---------------------------------------------------------------------------

  /** Create notification records for multiple users. */
  static async createNotifications(data: { userIds: string[]; type: 'REPLY' | 'MENTION' | 'FOLLOW'; threadId?: string; replyId?: string; message: string }) {
    if (data.userIds.length === 0) return;
    await prisma.notification.createMany({
      data: data.userIds.map((userId) => ({
        userId,
        type: data.type,
        threadId: data.threadId,
        replyId: data.replyId,
        message: data.message,
      })),
    });
  }

  /** Get notifications for a user (paginated, newest first). */
  static async findNotifications(userId: string, params: { page: number; limit: number; unreadOnly?: boolean }) {
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(params.unreadOnly && { isRead: false }),
    };

    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      prisma.notification.count({ where }),
    ]);

    return { items, total };
  }

  /** Mark notifications as read. */
  static async markNotificationsRead(userId: string, ids?: string[]) {
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(ids && { id: { in: ids } }),
    };
    await prisma.notification.updateMany({ where, data: { isRead: true } });
  }
}
