import type { Request, Response } from 'express';
import { prisma } from '../prisma';

export class UpvoteController {
  /** Toggle upvote — idempotent. Returns { upvoted: boolean, upvoteCount: number } */
  static async toggle(req: Request, res: Response) {
    const userId = (req as any).session.userId;
    const { type, id } = req.params;

    if (!['build', 'review'].includes(type)) {
      return res.status(400).json({ error: 'Invalid upvoteable type' });
    }

    // Verify the target entity exists
    if (type === 'build') {
      const build = await prisma.build.findUnique({ where: { id }, select: { id: true } });
      if (!build) return res.status(404).json({ error: 'Build not found' });
    } else {
      const review = await prisma.review.findUnique({ where: { id }, select: { id: true } });
      if (!review) return res.status(404).json({ error: 'Review not found' });
    }

    const existing = await prisma.upvote.findUnique({
      where: {
        userId_upvoteableType_upvoteableId: {
          userId,
          upvoteableType: type,
          upvoteableId: id,
        },
      },
    });

    if (existing) {
      await prisma.upvote.delete({ where: { id: existing.id } });
      if (type === 'build') {
        await prisma.build.update({
          where: { id },
          data: { upvoteCount: { decrement: 1 } },
        });
        const build = await prisma.build.findUnique({ where: { id }, select: { upvoteCount: true } });
        return res.json({ upvoted: false, upvoteCount: build?.upvoteCount ?? 0 });
      }
      return res.json({ upvoted: false });
    }

    await prisma.upvote.create({
      data: {
        user: { connect: { id: userId } },
        upvoteableType: type,
        upvoteableId: id,
        ...(type === 'build' ? { build: { connect: { id } } } : {}),
      },
    });

    if (type === 'build') {
      await prisma.build.update({
        where: { id },
        data: { upvoteCount: { increment: 1 } },
      });
      const build = await prisma.build.findUnique({ where: { id }, select: { upvoteCount: true } });
      return res.json({ upvoted: true, upvoteCount: build?.upvoteCount ?? 0 });
    }

    return res.json({ upvoted: true });
  }

  /** Check if the current user has upvoted a given entity */
  static async status(req: Request, res: Response) {
    const userId = (req as any).session?.userId;
    if (!userId) return res.json({ upvoted: false });

    const { type, id } = req.params;
    const existing = await prisma.upvote.findUnique({
      where: {
        userId_upvoteableType_upvoteableId: {
          userId,
          upvoteableType: type,
          upvoteableId: id,
        },
      },
    });

    res.json({ upvoted: !!existing });
  }
}
