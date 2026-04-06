import type { Request, Response, NextFunction } from 'express';

/**
 * RBAC guard — rejects non-ADMIN users with 403.
 * Must be placed AFTER the `authenticate` middleware in the chain.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const session = (req as any).session;

  if (!session) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (session.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}
