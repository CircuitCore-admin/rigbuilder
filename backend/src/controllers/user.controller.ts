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

  /** POST /api/v1/users/:username/block — toggle block */
  static async toggleBlock(req: Request, res: Response) {
    try {
      const session = (req as any).session;
      const target = await prisma.user.findUnique({ where: { username: req.params.username }, select: { id: true } });
      if (!target) return res.status(404).json({ error: 'User not found' });
      if (target.id === session.userId) return res.status(400).json({ error: 'Cannot block yourself' });

      const existing = await prisma.userBlock.findUnique({
        where: { blockerId_blockedId: { blockerId: session.userId, blockedId: target.id } },
      });

      if (existing) {
        await prisma.userBlock.delete({ where: { id: existing.id } });
        res.json({ blocked: false });
      } else {
        await prisma.userBlock.create({ data: { blockerId: session.userId, blockedId: target.id } });
        res.json({ blocked: true });
      }
    } catch { res.status(500).json({ error: 'Failed to toggle block' }); }
  }

  /** GET /api/v1/users/blocked — get blocked users */
  static async getBlockedUsers(req: Request, res: Response) {
    try {
      const session = (req as any).session;
      const blocks = await prisma.userBlock.findMany({
        where: { blockerId: session.userId },
        include: { blocked: { select: { id: true, username: true, avatarUrl: true } } },
      });
      res.json(blocks.map(b => b.blocked));
    } catch { res.status(500).json({ error: 'Failed to fetch blocked users' }); }
  }

  /** GET /api/v1/users/:username/block — check if blocked */
  static async isBlocked(req: Request, res: Response) {
    try {
      const session = (req as any).session;
      if (!session?.userId) return res.json({ blocked: false });
      const target = await prisma.user.findUnique({ where: { username: req.params.username }, select: { id: true } });
      if (!target) return res.status(404).json({ error: 'User not found' });

      const existing = await prisma.userBlock.findUnique({
        where: { blockerId_blockedId: { blockerId: session.userId, blockedId: target.id } },
      });
      res.json({ blocked: !!existing });
    } catch { res.status(500).json({ error: 'Failed to check block status' }); }
  }

  /** POST /api/v1/users/:username/follow — toggle follow */
  static async toggleFollow(req: Request, res: Response) {
    try {
      const session = (req as any).session;
      const target = await prisma.user.findUnique({ where: { username: req.params.username }, select: { id: true } });
      if (!target) return res.status(404).json({ error: 'User not found' });
      if (target.id === session.userId) return res.status(400).json({ error: 'Cannot follow yourself' });

      const existing = await prisma.userFollow.findUnique({
        where: { followerId_followedId: { followerId: session.userId, followedId: target.id } },
      });

      if (existing) {
        await prisma.userFollow.delete({ where: { id: existing.id } });
        res.json({ following: false });
      } else {
        await prisma.userFollow.create({ data: { followerId: session.userId, followedId: target.id } });

        // Notify the followed user
        await prisma.notification.create({
          data: {
            userId: target.id,
            type: 'NEW_FOLLOWER',
            actorId: session.userId,
            message: `${session.username} started following you`,
          },
        }).catch(() => {});

        res.json({ following: true });
      }
    } catch { res.status(500).json({ error: 'Failed to toggle follow' }); }
  }

  /** GET /api/v1/users/:username/followers */
  static async getFollowers(req: Request, res: Response) {
    try {
      const user = await prisma.user.findUnique({ where: { username: req.params.username }, select: { id: true } });
      if (!user) return res.status(404).json({ error: 'User not found' });

      const followers = await prisma.userFollow.findMany({
        where: { followedId: user.id },
        include: { follower: { select: { id: true, username: true, avatarUrl: true, pitCred: true } } },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ count: followers.length, users: followers.map(f => f.follower) });
    } catch { res.status(500).json({ error: 'Failed to fetch followers' }); }
  }

  /** GET /api/v1/users/:username/following */
  static async getFollowing(req: Request, res: Response) {
    try {
      const user = await prisma.user.findUnique({ where: { username: req.params.username }, select: { id: true } });
      if (!user) return res.status(404).json({ error: 'User not found' });

      const following = await prisma.userFollow.findMany({
        where: { followerId: user.id },
        include: { followed: { select: { id: true, username: true, avatarUrl: true, pitCred: true } } },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ count: following.length, users: following.map(f => f.followed) });
    } catch { res.status(500).json({ error: 'Failed to fetch following' }); }
  }

  /** GET /api/v1/users/:username/is-following */
  static async isFollowing(req: Request, res: Response) {
    try {
      const session = (req as any).session;
      if (!session?.userId) return res.json({ following: false });
      const target = await prisma.user.findUnique({ where: { username: req.params.username }, select: { id: true } });
      if (!target) return res.json({ following: false });

      const existing = await prisma.userFollow.findUnique({
        where: { followerId_followedId: { followerId: session.userId, followedId: target.id } },
      });
      res.json({ following: !!existing });
    } catch { res.status(500).json({ error: 'Failed to check follow status' }); }
  }
}
