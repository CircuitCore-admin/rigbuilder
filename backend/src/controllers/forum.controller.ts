import type { Request, Response } from 'express';
import { ForumService, NotFoundError } from '../services/forum.service';
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
      sortBy: (req.query.sortBy as any) || 'createdAt',
      sortDir: (req.query.sortDir as any) || 'desc',
    });

    res.json({
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }

  /** GET /api/v1/forum/:slug */
  static async getThread(req: Request, res: Response) {
    try {
      const thread = await ForumService.getThreadBySlug(req.params.slug);
      res.json(thread);
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
}
