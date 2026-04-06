import type { Request, Response } from 'express';
import { prisma } from '../prisma';
import { z } from 'zod';

const createCommentSchema = z.object({
  body: z.string().min(1).max(2000),
  parentId: z.string().optional(),
});

export class CommentController {
  /** List comments for a commentable entity (paginated, threaded) */
  static async list(req: Request, res: Response) {
    const { type, id } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));

    if (!['build', 'product'].includes(type)) {
      return res.status(400).json({ error: 'Invalid commentable type' });
    }

    const where = {
      commentableType: type,
      commentableId: id,
      parentId: null as string | null,
    };

    const [items, total] = await Promise.all([
      prisma.comment.findMany({
        where,
        include: {
          user: { select: { id: true, username: true, avatarUrl: true } },
          replies: {
            include: {
              user: { select: { id: true, username: true, avatarUrl: true } },
            },
            orderBy: { createdAt: 'asc' },
            take: 5,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.comment.count({ where }),
    ]);

    res.json({
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }

  /** Create a new comment */
  static async create(req: Request, res: Response) {
    try {
      const userId = (req as any).session.userId;
      const { type, id } = req.params;
      const data = createCommentSchema.parse(req.body);

      if (!['build', 'product'].includes(type)) {
        return res.status(400).json({ error: 'Invalid commentable type' });
      }

      const comment = await prisma.comment.create({
        data: {
          user: { connect: { id: userId } },
          commentableType: type,
          commentableId: id,
          body: data.body,
          ...(data.parentId ? { parent: { connect: { id: data.parentId } } } : {}),
          ...(type === 'build' ? { build: { connect: { id } } } : {}),
        },
        include: {
          user: { select: { id: true, username: true, avatarUrl: true } },
        },
      });

      res.status(201).json(comment);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation failed', issues: err.flatten().fieldErrors });
      }
      res.status(400).json({ error: (err as Error).message });
    }
  }

  /** Delete a comment (own only) */
  static async delete(req: Request, res: Response) {
    try {
      const userId = (req as any).session.userId;
      const { commentId } = req.params;

      const comment = await prisma.comment.findUnique({ where: { id: commentId } });
      if (!comment) return res.status(404).json({ error: 'Comment not found' });
      if (comment.userId !== userId) return res.status(403).json({ error: 'Forbidden' });

      await prisma.comment.delete({ where: { id: commentId } });
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
}
