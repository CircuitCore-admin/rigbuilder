import type { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { prisma } from '../prisma';
import { ZodError } from 'zod';

export class UserController {
  static async getById(req: Request, res: Response) {
    try {
      res.json(await UserService.getById(req.params.id));
    } catch { res.status(404).json({ error: 'User not found' }); }
  }

  static async getByUsername(req: Request, res: Response) {
    try {
      const profile = await UserService.getByUsername(req.params.username);
      if (!profile) return res.status(404).json({ error: 'User not found' });

      // Privacy check
      if (profile.profileVisibility === 'PRIVATE') {
        const session = (req as any).session;
        if (!session?.userId || session.userId !== profile.id) {
          return res.json({
            id: profile.id, username: profile.username, avatarUrl: profile.avatarUrl,
            bannerUrl: profile.bannerUrl, bannerColor: profile.bannerColor,
            role: profile.role, profileVisibility: 'PRIVATE', createdAt: profile.createdAt,
            sellerRating: profile.sellerRating, sellerReviewCount: profile.sellerReviewCount,
          });
        }
      }
      res.json(profile);
    } catch { res.status(404).json({ error: 'User not found' }); }
  }

  static async getUserThreads(req: Request, res: Response) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(20, parseInt(req.query.limit as string) || 10);
      const user = await prisma.user.findUnique({ where: { username: req.params.username }, select: { id: true } });
      if (!user) return res.status(404).json({ error: 'User not found' });

      const [items, total] = await Promise.all([
        prisma.forumThread.findMany({
          where: { userId: user.id, isAnonymous: false },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit, take: limit,
          include: { user: { select: { id: true, username: true, avatarUrl: true, pitCred: true, role: true } } },
        }),
        prisma.forumThread.count({ where: { userId: user.id, isAnonymous: false } }),
      ]);
      res.json({ items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    } catch { res.status(500).json({ error: 'Failed to fetch threads' }); }
  }

  static async getUserListings(req: Request, res: Response) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(20, parseInt(req.query.limit as string) || 10);
      const user = await prisma.user.findUnique({ where: { username: req.params.username }, select: { id: true } });
      if (!user) return res.status(404).json({ error: 'User not found' });

      const [items, total] = await Promise.all([
        prisma.marketplaceListing.findMany({
          where: { userId: user.id, status: { in: ['ACTIVE', 'RESERVED', 'SOLD', 'FOUND'] } },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit, take: limit,
          include: { user: { select: { id: true, username: true, avatarUrl: true, sellerRating: true } } },
        }),
        prisma.marketplaceListing.count({ where: { userId: user.id, status: { in: ['ACTIVE', 'RESERVED', 'SOLD', 'FOUND'] } } }),
      ]);
      res.json({ items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    } catch { res.status(500).json({ error: 'Failed to fetch listings' }); }
  }

  static async getUserReviews(req: Request, res: Response) {
    try {
      const user = await prisma.user.findUnique({ where: { username: req.params.username }, select: { id: true } });
      if (!user) return res.status(404).json({ error: 'User not found' });

      const reviews = await prisma.marketplaceReview.findMany({
        where: { sellerId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          reviewer: { select: { id: true, username: true, avatarUrl: true } },
          listing: { select: { id: true, title: true } },
        },
      });
      res.json(reviews);
    } catch { res.status(500).json({ error: 'Failed to fetch reviews' }); }
  }

  static async updateProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).session.userId;
      res.json(await UserService.updateProfile(userId, req.body));
    } catch (err) {
      if (err instanceof ZodError) return res.status(400).json({ error: 'Validation failed', issues: err.flatten().fieldErrors });
      res.status(400).json({ error: (err as Error).message });
    }
  }
}
