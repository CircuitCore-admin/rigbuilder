import type { Request, Response } from 'express';
import { prisma } from '../prisma';

export class LeaderboardController {
  /** GET /api/v1/leaderboards/contributors — Top by Pit Cred */
  static async topContributors(req: Request, res: Response) {
    try {
      const limit = Math.min(50, parseInt(req.query.limit as string) || 20);

      const users = await prisma.user.findMany({
        where: { profileVisibility: 'PUBLIC', pitCred: { gt: 0 } },
        orderBy: { pitCred: 'desc' },
        take: limit,
        select: {
          id: true, username: true, avatarUrl: true, pitCred: true, role: true,
          _count: { select: { forumThreads: true, forumReplies: true } },
        },
      });
      res.json(users);
    } catch { res.status(500).json({ error: 'Failed to fetch leaderboard' }); }
  }

  /** GET /api/v1/leaderboards/sellers — Top sellers by completed sales */
  static async topSellers(req: Request, res: Response) {
    try {
      const limit = Math.min(50, parseInt(req.query.limit as string) || 20);

      const users = await prisma.user.findMany({
        where: { profileVisibility: 'PUBLIC', completedSales: { gt: 0 } },
        orderBy: { completedSales: 'desc' },
        take: limit,
        select: {
          id: true, username: true, avatarUrl: true,
          completedSales: true, sellerRating: true, sellerReviewCount: true,
        },
      });
      res.json(users);
    } catch { res.status(500).json({ error: 'Failed to fetch leaderboard' }); }
  }

  /** GET /api/v1/leaderboards/helpers — Most helpful (most upvotes on replies) */
  static async topHelpers(req: Request, res: Response) {
    try {
      const limit = Math.min(50, parseInt(req.query.limit as string) || 20);

      const helpers = await prisma.$queryRaw`
        SELECT u.id, u.username, u.avatar_url AS "avatarUrl", u.pit_cred AS "pitCred",
               COALESCE(SUM(CASE WHEN fv.value = 1 THEN 1 ELSE 0 END), 0)::int AS "totalUpvotes"
        FROM users u
        LEFT JOIN forum_replies fr ON fr.user_id = u.id
        LEFT JOIN forum_votes fv ON fv.reply_id = fr.id
        WHERE u.profile_visibility = 'PUBLIC'
        GROUP BY u.id
        HAVING COALESCE(SUM(CASE WHEN fv.value = 1 THEN 1 ELSE 0 END), 0) > 0
        ORDER BY "totalUpvotes" DESC
        LIMIT ${limit}
      `;
      res.json(helpers);
    } catch { res.status(500).json({ error: 'Failed to fetch leaderboard' }); }
  }
}
