import type { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type OwnedModel = 'build' | 'review' | 'comment';

/**
 * Middleware factory that enforces row-level ownership.
 * Rejects UPDATE/DELETE if the resource doesn't belong to the session user.
 *
 * Usage:
 * ```ts
 * router.put('/builds/:id', authenticate, ownership('build'), controller.update);
 * ```
 */
export function ownership(model: OwnedModel) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).session?.userId;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const resourceId = req.params.id;
    if (!resourceId) return res.status(400).json({ error: 'Missing resource ID' });

    let ownerId: string | null = null;

    switch (model) {
      case 'build': {
        const row = await prisma.build.findUnique({ where: { id: resourceId }, select: { userId: true } });
        ownerId = row?.userId ?? null;
        break;
      }
      case 'review': {
        const row = await prisma.review.findUnique({ where: { id: resourceId }, select: { userId: true } });
        ownerId = row?.userId ?? null;
        break;
      }
      case 'comment': {
        const row = await prisma.comment.findUnique({ where: { id: resourceId }, select: { userId: true } });
        ownerId = row?.userId ?? null;
        break;
      }
    }

    if (!ownerId) return res.status(404).json({ error: 'Resource not found' });
    if (ownerId !== userId) return res.status(403).json({ error: 'Forbidden — you do not own this resource' });

    next();
  };
}
