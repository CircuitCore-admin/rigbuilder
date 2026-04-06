import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';

/**
 * Validates the session cookie against the sessions table.
 * Attaches `req.session` with `{ userId, sessionId }` on success.
 */
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.cookies?.session_id;
  if (!sessionId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: { select: { id: true, username: true, role: true } } },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.session.delete({ where: { id: sessionId } });
    res.clearCookie('session_id');
    return res.status(401).json({ error: 'Session expired' });
  }

  (req as any).session = {
    sessionId: session.id,
    userId: session.userId,
    username: session.user.username,
    role: session.user.role,
  };

  next();
}

/** Optional auth — attaches session if present, continues either way. */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const sessionId = req.cookies?.session_id;
  if (!sessionId) return next();

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: { select: { id: true, username: true, role: true } } },
  });

  if (session && session.expiresAt >= new Date()) {
    (req as any).session = {
      sessionId: session.id,
      userId: session.userId,
      username: session.user.username,
      role: session.user.role,
    };
  }

  next();
}
