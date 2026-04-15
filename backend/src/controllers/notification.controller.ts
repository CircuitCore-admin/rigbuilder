import type { Request, Response } from 'express';
import { prisma } from '../prisma';

/**
 * Unified notification controller — merges forum and marketplace notifications
 * into a single API surface.
 */
export class NotificationController {
  /** GET /api/v1/notifications — unified paginated list */
  static async getNotifications(req: Request, res: Response) {
    const session = (req as any).session;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const unreadOnly = req.query.unread === 'true';

    const forumWhere = { userId: session.userId, ...(unreadOnly && { isRead: false }) };
    const marketWhere = { userId: session.userId, ...(unreadOnly && { read: false }) };

    const [forumNotifs, marketNotifs, forumTotal, marketTotal] = await Promise.all([
      prisma.notification.findMany({
        where: forumWhere,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.marketplaceNotification.findMany({
        where: marketWhere,
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          listing: { select: { id: true, title: true } },
        },
      }),
      prisma.notification.count({ where: forumWhere }),
      prisma.marketplaceNotification.count({ where: marketWhere }),
    ]);

    // Normalise both into a common shape, merge and sort
    const all = [
      ...forumNotifs.map((n) => ({
        id: n.id,
        source: 'forum' as const,
        type: n.type,
        message: n.message,
        read: n.isRead,
        threadId: n.threadId,
        replyId: n.replyId,
        listingId: null as string | null,
        createdAt: n.createdAt,
      })),
      ...marketNotifs.map((n) => ({
        id: n.id,
        source: 'marketplace' as const,
        type: n.type,
        message: n.message,
        read: n.read,
        threadId: null as string | null,
        replyId: null as string | null,
        listingId: n.listingId,
        createdAt: n.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    const total = forumTotal + marketTotal;

    res.json({ items: all, total, page, limit });
  }

  /** GET /api/v1/notifications/unread-count — lightweight count endpoint */
  static async getUnreadCount(req: Request, res: Response) {
    const session = (req as any).session;
    const [forumCount, marketCount, messageCount] = await Promise.all([
      prisma.notification.count({ where: { userId: session.userId, isRead: false } }),
      prisma.marketplaceNotification.count({ where: { userId: session.userId, read: false } }),
      prisma.marketplaceMessage.count({
        where: { recipientId: session.userId, readAt: null },
      }),
    ]);
    res.json({ notifications: forumCount + marketCount, messages: messageCount });
  }

  /** PUT /api/v1/notifications/read — mark notifications as read */
  static async markRead(req: Request, res: Response) {
    const session = (req as any).session;
    const { ids, source, all: markAll } = req.body;

    if (markAll) {
      await Promise.all([
        prisma.notification.updateMany({
          where: { userId: session.userId, isRead: false },
          data: { isRead: true },
        }),
        prisma.marketplaceNotification.updateMany({
          where: { userId: session.userId, read: false },
          data: { read: true },
        }),
      ]);
    } else if (Array.isArray(ids) && ids.length > 0 && source === 'forum') {
      await prisma.notification.updateMany({
        where: { id: { in: ids }, userId: session.userId },
        data: { isRead: true },
      });
    } else if (Array.isArray(ids) && ids.length > 0 && source === 'marketplace') {
      await prisma.marketplaceNotification.updateMany({
        where: { id: { in: ids }, userId: session.userId },
        data: { read: true },
      });
    }

    res.json({ ok: true });
  }
}
