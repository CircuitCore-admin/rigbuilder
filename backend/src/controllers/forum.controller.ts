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
    const reply = await ForumService.upvoteReply(req.params.id);
    res.json(reply);
  }

  /** GET /api/v1/forum/related/:productId */
  static async relatedDiscussions(req: Request, res: Response) {
    const limit = parseInt(req.query.limit as string) || 5;
    const threads = await ForumService.getRelatedDiscussions(req.params.productId, limit);
    res.json(threads);
  }
}
