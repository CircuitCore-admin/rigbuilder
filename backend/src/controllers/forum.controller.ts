import type { Request, Response } from 'express';
import { ForumService, NotFoundError } from '../services/forum.service';
import { ForumRepository } from '../repositories/forum.repository';
import { prisma } from '../prisma';
import type { ForumCategory } from '@prisma/client';

export class ForumController {
  /** GET /api/v1/forum */
  static async listThreads(req: Request, res: Response) {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const { items, total } = await ForumService.listThreads({
      page,
      limit,
      category: req.query.category as ForumCategory | undefined,
      productId: req.query.productId as string | undefined,
      flair: req.query.flair as string | undefined,
      sortBy: (req.query.sortBy as any) || 'createdAt',
      sortDir: (req.query.sortDir as any) || 'desc',
    });

    // Allow browsers to cache the list briefly
    res.set('Cache-Control', 'public, max-age=10, stale-while-revalidate=30');
    res.json({
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }

  /** Check whether this IP should count as a new view (in-memory, 5-minute window). */
  private static shouldIncrementView(req: Request, threadId: string): boolean {
    const viewKey = `view:${threadId}:${req.ip}`;
    if (!req.app.locals.recentViews) {
      req.app.locals.recentViews = new Set<string>();
    }
    const recentViews = req.app.locals.recentViews as Set<string>;

    if (!recentViews.has(viewKey)) {
      recentViews.add(viewKey);
      setTimeout(() => { recentViews.delete(viewKey); }, 5 * 60 * 1000);
      return true;
    }
    return false;
  }

  /** GET /api/v1/forum/:slug */
  static async getThread(req: Request, res: Response) {
    try {
      const thread = await ForumService.getThreadBySlug(req.params.slug);
      if (ForumController.shouldIncrementView(req, thread.id)) {
        await ForumRepository.incrementViewCount(thread.id);
        thread.viewCount += 1;
      }
      res.json(thread);
    } catch (err) {
      if (err instanceof NotFoundError) return res.status(404).json({ error: err.message });
      throw err;
    }
  }

  /** GET /api/v1/forum/:slug/full — returns thread + replies + user context in one response. */
  static async getThreadFull(req: Request, res: Response) {
    try {
      const thread = await ForumService.getThreadBySlug(req.params.slug);

      // Increment view count before response so client sees the updated value
      if (ForumController.shouldIncrementView(req, thread.id)) {
        await ForumRepository.incrementViewCount(thread.id);
        thread.viewCount += 1;
      }

      const replies = await ForumService.getReplies(thread.id);

      // Include user-specific context if authenticated
      const session = (req as any).session;
      let userVote = 0;
      let following = false;

      if (session?.userId) {
        const [voteResult, followResult] = await Promise.all([
          ForumService.getThreadVote(thread.id, session.userId).catch(() => ({ userVote: 0 })),
          ForumService.isFollowing(thread.id, session.userId).catch(() => false),
        ]);
        userVote = voteResult.userVote ?? 0;
        following = followResult as boolean;
      }

      res.json({ thread, replies, userVote, following });
    } catch (err) {
      if (err instanceof NotFoundError) return res.status(404).json({ error: err.message });
      throw err;
    }
  }

  /** POST /api/v1/forum */
  static async createThread(req: Request, res: Response) {
    const session = (req as any).session;
    const thread = await ForumService.createThread({
      title: req.body.title,
      body: req.body.body,
      category: req.body.category,
      userId: session.userId,
      productId: req.body.productId,
      link: req.body.link,
      metadata: req.body.metadata,
      imageUrls: req.body.imageUrls,
      isAnonymous: req.body.isAnonymous === true,
      flair: req.body.flair ?? null,
      poll: req.body.poll,
    });
    res.status(201).json(thread);
  }

  /** GET /api/v1/forum/:slug/replies */
  static async getReplies(req: Request, res: Response) {
    try {
      const thread = await ForumService.getThreadBySlug(req.params.slug);
      const replies = await ForumService.getReplies(thread.id);
      res.json(replies);
    } catch (err) {
      if (err instanceof NotFoundError) return res.status(404).json({ error: err.message });
      throw err;
    }
  }

  /** POST /api/v1/forum/:slug/replies */
  static async createReply(req: Request, res: Response) {
    try {
      const thread = await ForumService.getThreadBySlug(req.params.slug);
      const session = (req as any).session;
      const reply = await ForumService.createReply({
        threadId: thread.id,
        userId: session.userId,
        body: req.body.body,
        parentId: req.body.parentId,
      });
      res.status(201).json(reply);
    } catch (err) {
      if (err instanceof NotFoundError) return res.status(404).json({ error: err.message });
      throw err;
    }
  }

  /** POST /api/v1/forum/replies/:id/upvote */
  static async upvoteReply(req: Request, res: Response) {
    const session = (req as any).session;
    if (!session?.userId) {
      // Fallback to legacy increment for unauthenticated (should not reach here due to middleware)
      const reply = await ForumService.upvoteReply(req.params.id);
      return res.json(reply);
    }
    const result = await ForumService.toggleUpvote(req.params.id, session.userId);
    res.json(result);
  }

  /** POST /api/v1/forum/replies/:id/vote — value-based reply voting (up/down/remove) */
  static async voteReply(req: Request, res: Response) {
    const session = (req as any).session;
    if (!session?.userId) return res.status(401).json({ error: 'Authentication required' });

    const rawValue = req.body.value ?? 1; // Default to upvote for backward compat
    const numValue = typeof rawValue === 'string' ? parseInt(rawValue, 10) : rawValue;
    if (numValue !== 1 && numValue !== -1 && numValue !== 0) {
      return res.status(400).json({ error: 'value must be 1, -1, or 0' });
    }

    try {
      const result = await ForumService.voteReply(req.params.id, session.userId, numValue);
      res.json(result);
    } catch (err) {
      console.error('voteReply error:', err);
      res.status(500).json({ error: 'Failed to process vote' });
    }
  }

  /** PUT /api/v1/forum/:id */
  static async updateThread(req: Request, res: Response) {
    const session = (req as any).session;
    const threadId = req.params.id;

    // Fetch thread to check ownership
    const thread = await ForumService.getThreadById(threadId);
    if (!thread) return res.status(404).json({ error: 'Thread not found' });

    const isStaff = session.role === 'ADMIN' || session.role === 'MODERATOR';
    if (thread.userId !== session.userId && !isStaff) {
      return res.status(403).json({ error: 'You do not have permission to edit this thread' });
    }

    const updated = await ForumService.updateThread(threadId, {
      title: req.body.title,
      body: req.body.body,
      link: req.body.link,
      metadata: req.body.metadata,
      imageUrls: req.body.imageUrls,
    });
    res.json(updated);
  }

  /** DELETE /api/v1/forum/:id */
  static async deleteThread(req: Request, res: Response) {
    const session = (req as any).session;
    const threadId = req.params.id;

    const thread = await ForumService.getThreadById(threadId);
    if (!thread) return res.status(404).json({ error: 'Thread not found' });

    const isStaff = session.role === 'ADMIN' || session.role === 'MODERATOR';
    if (thread.userId !== session.userId && !isStaff) {
      return res.status(403).json({ error: 'You do not have permission to delete this thread' });
    }

    await ForumService.deleteThread(threadId);
    res.json({ success: true });
  }

  /** GET /api/v1/forum/related/:productId */
  static async relatedDiscussions(req: Request, res: Response) {
    const limit = parseInt(req.query.limit as string) || 5;
    const threads = await ForumService.getRelatedDiscussions(req.params.productId, limit);
    res.json(threads);
  }

  // ---------------------------------------------------------------------------
  // Thread Voting
  // ---------------------------------------------------------------------------

  /** POST /api/v1/forum/threads/:id/vote */
  static async voteThread(req: Request, res: Response) {
    const session = (req as any).session;
    if (!session?.userId) return res.status(401).json({ error: 'Authentication required' });

    const threadId = req.params.id;
    const { value } = req.body;
    const numValue = typeof value === 'string' ? parseInt(value, 10) : value;
    if (numValue !== 1 && numValue !== -1 && numValue !== 0) {
      return res.status(400).json({ error: 'value must be 1, -1, or 0' });
    }

    try {
      const result = await ForumService.voteThread(threadId, session.userId, numValue);
      res.json(result);
    } catch (err) {
      console.error('voteThread error:', err);
      res.status(500).json({ error: 'Failed to process vote' });
    }
  }

  /** GET /api/v1/forum/threads/:id/vote */
  static async getThreadVote(req: Request, res: Response) {
    const session = (req as any).session;
    if (!session?.userId) return res.json({ userVote: 0 });

    const result = await ForumService.getThreadVote(req.params.id, session.userId);
    res.json(result);
  }

  // ---------------------------------------------------------------------------
  // Follow
  // ---------------------------------------------------------------------------

  /** POST /api/v1/forum/threads/:id/follow */
  static async toggleFollow(req: Request, res: Response) {
    const session = (req as any).session;
    const threadId = req.params.id;

    const thread = await ForumService.getThreadById(threadId);
    if (!thread) return res.status(404).json({ error: 'Thread not found' });

    const result = await ForumService.toggleFollow(threadId, session.userId);
    res.json(result);
  }

  /** GET /api/v1/forum/threads/:id/following */
  static async isFollowing(req: Request, res: Response) {
    const session = (req as any).session;
    const following = await ForumService.isFollowing(req.params.id, session.userId);
    res.json({ following });
  }

  // ---------------------------------------------------------------------------
  // Notifications
  // ---------------------------------------------------------------------------

  /** GET /api/v1/forum/notifications */
  static async getNotifications(req: Request, res: Response) {
    const session = (req as any).session;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const unreadOnly = req.query.unread === 'true';

    const { items, total } = await ForumService.getNotifications(session.userId, { page, limit, unreadOnly });
    res.json({
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }

  /** PUT /api/v1/forum/notifications/read */
  static async markNotificationsRead(req: Request, res: Response) {
    const session = (req as any).session;
    const ids = req.body.ids as string[] | undefined;
    await ForumService.markNotificationsRead(session.userId, ids);
    res.json({ success: true });
  }

  /** PUT /api/v1/forum/:slug/pin */
  static async togglePin(req: Request, res: Response) {
    const session = (req as any).session;
    if (session.role !== 'ADMIN' && session.role !== 'MODERATOR') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const thread = await prisma.forumThread.findUnique({ where: { slug: req.params.slug } });
    if (!thread) return res.status(404).json({ error: 'Thread not found' });

    const updated = await prisma.forumThread.update({
      where: { slug: req.params.slug },
      data: { isPinned: !thread.isPinned },
    });
    res.json({ isPinned: updated.isPinned });
  }

  /** PUT /api/v1/forum/:slug/lock */
  static async toggleLock(req: Request, res: Response) {
    const session = (req as any).session;
    if (session.role !== 'ADMIN' && session.role !== 'MODERATOR') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const thread = await prisma.forumThread.findUnique({ where: { slug: req.params.slug } });
    if (!thread) return res.status(404).json({ error: 'Thread not found' });

    const updated = await prisma.forumThread.update({
      where: { slug: req.params.slug },
      data: { isLocked: !thread.isLocked },
    });
    res.json({ isLocked: updated.isLocked });
  }

  /** PUT /api/v1/forum/:slug/flair */
  static async updateFlair(req: Request, res: Response) {
    const session = (req as any).session;
    const { flair } = req.body;
    const validFlairs = ['SOLVED', 'QUESTION', 'WIP', 'REVIEW', 'PSA', 'GUIDE', null];
    if (!validFlairs.includes(flair)) return res.status(400).json({ error: 'Invalid flair' });

    const thread = await prisma.forumThread.findUnique({ where: { slug: req.params.slug } });
    if (!thread) return res.status(404).json({ error: 'Thread not found' });

    // Only author, admin, or mod can change flair
    const isStaff = session.role === 'ADMIN' || session.role === 'MODERATOR';
    if (thread.userId !== session.userId && !isStaff) {
      return res.status(403).json({ error: 'Only the author or staff can change flair' });
    }

    const updated = await prisma.forumThread.update({
      where: { slug: req.params.slug },
      data: { flair },
    });
    res.json({ flair: updated.flair });
  }

  // ---------------------------------------------------------------------------
  // Poll Endpoints
  // ---------------------------------------------------------------------------

  /** POST /api/v1/forum/polls/:pollId/vote */
  static async votePoll(req: Request, res: Response) {
    const session = (req as any).session;
    const { optionId } = req.body;
    if (!optionId) return res.status(400).json({ error: 'Option ID required' });

    const option = await prisma.forumPollOption.findUnique({
      where: { id: optionId },
      include: { poll: true },
    });
    if (!option) return res.status(404).json({ error: 'Option not found' });
    if (option.pollId !== req.params.pollId) return res.status(400).json({ error: 'Option does not belong to this poll' });

    // Check if poll expired
    if (option.poll.expiresAt && option.poll.expiresAt < new Date()) {
      return res.status(400).json({ error: 'This poll has ended' });
    }

    // Check if user already voted on any option in this poll
    const existingVote = await prisma.forumPollVote.findFirst({
      where: {
        userId: session.userId,
        option: { pollId: req.params.pollId },
      },
    });

    if (existingVote) {
      // Change vote
      if (existingVote.optionId === optionId) {
        return res.status(400).json({ error: 'Already voted for this option' });
      }
      await prisma.$transaction([
        prisma.forumPollVote.delete({ where: { id: existingVote.id } }),
        prisma.forumPollOption.update({ where: { id: existingVote.optionId }, data: { votes: { decrement: 1 } } }),
        prisma.forumPollVote.create({ data: { optionId, userId: session.userId } }),
        prisma.forumPollOption.update({ where: { id: optionId }, data: { votes: { increment: 1 } } }),
      ]);
    } else {
      await prisma.$transaction([
        prisma.forumPollVote.create({ data: { optionId, userId: session.userId } }),
        prisma.forumPollOption.update({ where: { id: optionId }, data: { votes: { increment: 1 } } }),
      ]);
    }

    // Return updated poll
    const poll = await prisma.forumPoll.findUnique({
      where: { id: req.params.pollId },
      include: { options: { orderBy: { votes: 'desc' } } },
    });
    res.json(poll);
  }

  /** GET /api/v1/forum/polls/:pollId/my-vote */
  static async getMyPollVote(req: Request, res: Response) {
    const session = (req as any).session;
    if (!session?.userId) return res.json({ votedOptionId: null });

    const vote = await prisma.forumPollVote.findFirst({
      where: { userId: session.userId, option: { pollId: req.params.pollId } },
    });
    res.json({ votedOptionId: vote?.optionId ?? null });
  }
}
