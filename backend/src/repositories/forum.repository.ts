import { prisma } from '../prisma';
import type { ForumCategory, Prisma } from '@prisma/client';

export interface ForumListParams {
  page: number;
  limit: number;
  category?: ForumCategory;
  productId?: string;
  flair?: string;
  sortBy?: 'createdAt' | 'replyCount' | 'viewCount';
  sortDir?: 'asc' | 'desc';
}

export class ForumRepository {
  static async findThreads(params: ForumListParams) {
    const { page, limit, category, productId, flair, sortBy = 'createdAt', sortDir = 'desc' } = params;

    const where: Prisma.ForumThreadWhereInput = {
      ...(category && { category }),
      ...(productId && { productId }),
      ...(flair && { flair }),
    };

    const [items, total] = await Promise.all([
      prisma.forumThread.findMany({
        where,
        orderBy: [
        { isPinned: 'desc' },
        { [sortBy]: sortDir },
      ],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, username: true, avatarUrl: true, reputation: true, role: true, pitCred: true } },
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
        user: { select: { id: true, username: true, avatarUrl: true, reputation: true, role: true, pitCred: true } },
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
        user: { select: { id: true, username: true, avatarUrl: true, reputation: true, role: true, pitCred: true } },
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
   * otherwise create vote and increment. Also adjusts the reply author's
   * pitCred karma (+1 on upvote, -1 on un-upvote). Returns { upvotes, voted }.
   */
  static async toggleUpvote(replyId: string, userId: string) {
    const existing = await prisma.forumVote.findUnique({
      where: { userId_replyId: { userId, replyId } },
    });

    // Get reply author for pitCred adjustment
    const reply = await prisma.forumReply.findUnique({
      where: { id: replyId },
      select: { userId: true },
    });
    const authorId = reply?.userId;

    if (existing) {
      const txOps: any[] = [
        prisma.forumVote.delete({ where: { id: existing.id } }),
        prisma.forumReply.update({ where: { id: replyId }, data: { upvotes: { decrement: 1 } } }),
      ];
      if (authorId) {
        txOps.push(prisma.user.update({ where: { id: authorId }, data: { pitCred: { decrement: 1 } } }));
      }
      await prisma.$transaction(txOps);
      const updated = await prisma.forumReply.findUnique({ where: { id: replyId }, select: { upvotes: true } });
      return { upvotes: updated?.upvotes ?? 0, voted: false };
    }

    const txOps: any[] = [
      prisma.forumVote.create({ data: { userId, replyId } }),
      prisma.forumReply.update({ where: { id: replyId }, data: { upvotes: { increment: 1 } } }),
    ];
    if (authorId) {
      txOps.push(prisma.user.update({ where: { id: authorId }, data: { pitCred: { increment: 1 } } }));
    }
    await prisma.$transaction(txOps);
    const updated = await prisma.forumReply.findUnique({ where: { id: replyId }, select: { upvotes: true } });
    return { upvotes: updated?.upvotes ?? 0, voted: true };
  }

  /**
   * Value-based reply voting (like thread votes): supports up (+1), down (-1),
   * and remove (0). Adjusts the reply's upvotes field and author's pitCred.
   * Returns { score, userVote }.
   */
  static async voteReply(replyId: string, userId: string, value: 1 | -1 | 0) {
    const existing = await prisma.forumVote.findUnique({
      where: { userId_replyId: { userId, replyId } },
    });

    const reply = await prisma.forumReply.findUnique({
      where: { id: replyId },
      select: { userId: true },
    });
    const authorId = reply?.userId;

    if (value === 0 || (existing && existing.value === value)) {
      // Remove vote (toggle off)
      if (existing) {
        const oldValue = existing.value ?? 1; // legacy votes without value field default to 1
        const txOps: any[] = [
          prisma.forumVote.delete({ where: { id: existing.id } }),
          prisma.forumReply.update({ where: { id: replyId }, data: { upvotes: { decrement: oldValue } } }),
        ];
        if (authorId) {
          txOps.push(prisma.user.update({ where: { id: authorId }, data: { pitCred: { decrement: oldValue } } }));
        }
        await prisma.$transaction(txOps);
      }
      const updated = await prisma.forumReply.findUnique({ where: { id: replyId }, select: { upvotes: true } });
      return { score: updated?.upvotes ?? 0, userVote: 0 };
    }

    if (existing) {
      // Change vote direction
      const oldValue = existing.value ?? 1;
      const delta = value - oldValue;
      const txOps: any[] = [
        prisma.forumVote.update({ where: { id: existing.id }, data: { value } }),
        prisma.forumReply.update({ where: { id: replyId }, data: { upvotes: { increment: delta } } }),
      ];
      if (authorId) {
        txOps.push(prisma.user.update({ where: { id: authorId }, data: { pitCred: { increment: delta } } }));
      }
      await prisma.$transaction(txOps);
      const updated = await prisma.forumReply.findUnique({ where: { id: replyId }, select: { upvotes: true } });
      return { score: updated?.upvotes ?? 0, userVote: value };
    }

    // New vote
    const txOps: any[] = [
      prisma.forumVote.create({ data: { userId, replyId, value } }),
      prisma.forumReply.update({ where: { id: replyId }, data: { upvotes: { increment: value } } }),
    ];
    if (authorId) {
      txOps.push(prisma.user.update({ where: { id: authorId }, data: { pitCred: { increment: value } } }));
    }
    await prisma.$transaction(txOps);
    const updated = await prisma.forumReply.findUnique({ where: { id: replyId }, select: { upvotes: true } });
    return { score: updated?.upvotes ?? 0, userVote: value };
  }

  /**
   * Toggle thread vote: upsert or remove vote. Adjusts cached score/upvotes/downvotes
   * and author's pitCred. Returns { score, userVote }.
   */
  static async voteThread(threadId: string, userId: string, value: 1 | -1 | 0) {
    const existing = await prisma.threadVote.findUnique({
      where: { threadId_userId: { threadId, userId } },
    });

    const thread = await prisma.forumThread.findUnique({
      where: { id: threadId },
      select: { userId: true },
    });
    if (!thread) throw new Error('Thread not found');

    const authorId = thread.userId;

    if (value === 0 || (existing && existing.value === value)) {
      // Remove the vote (toggle off)
      if (existing) {
        const oldValue = existing.value;
        await prisma.$transaction([
          prisma.threadVote.delete({ where: { id: existing.id } }),
          prisma.forumThread.update({
            where: { id: threadId },
            data: {
              score: { decrement: oldValue },
              upvotes: oldValue === 1 ? { decrement: 1 } : undefined,
              downvotes: oldValue === -1 ? { decrement: 1 } : undefined,
            },
          }),
          prisma.user.update({
            where: { id: authorId },
            data: { pitCred: { decrement: oldValue } },
          }),
        ]);
      }
      const updated = await prisma.forumThread.findUnique({ where: { id: threadId }, select: { score: true } });
      return { score: updated?.score ?? 0, userVote: 0 };
    }

    if (existing) {
      // Change the vote (e.g., upvote → downvote)
      const delta = value - existing.value;
      await prisma.$transaction([
        prisma.threadVote.update({
          where: { id: existing.id },
          data: { value },
        }),
        prisma.forumThread.update({
          where: { id: threadId },
          data: {
            score: { increment: delta },
            upvotes: value === 1 ? { increment: 1 } : existing.value === 1 ? { decrement: 1 } : undefined,
            downvotes: value === -1 ? { increment: 1 } : existing.value === -1 ? { decrement: 1 } : undefined,
          },
        }),
        prisma.user.update({
          where: { id: authorId },
          data: { pitCred: { increment: delta } },
        }),
      ]);
    } else {
      // Create new vote
      await prisma.$transaction([
        prisma.threadVote.create({ data: { threadId, userId, value } }),
        prisma.forumThread.update({
          where: { id: threadId },
          data: {
            score: { increment: value },
            upvotes: value === 1 ? { increment: 1 } : undefined,
            downvotes: value === -1 ? { increment: 1 } : undefined,
          },
        }),
        prisma.user.update({
          where: { id: authorId },
          data: { pitCred: { increment: value } },
        }),
      ]);
    }

    const updated = await prisma.forumThread.findUnique({ where: { id: threadId }, select: { score: true } });
    return { score: updated?.score ?? 0, userVote: value };
  }

  /** Get user's current vote on a thread. */
  static async getThreadVote(threadId: string, userId: string) {
    const vote = await prisma.threadVote.findUnique({
      where: { threadId_userId: { threadId, userId } },
    });
    return vote?.value ?? 0;
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
