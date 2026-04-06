import type { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';

const CSRF_COOKIE = '__csrf';
const CSRF_HEADER = 'x-csrf-token';

/**
 * Double-submit cookie CSRF protection.
 *
 * On GET requests: sets an HttpOnly CSRF cookie if missing.
 * On state-mutating requests (POST/PUT/PATCH/DELETE): validates
 * that the X-CSRF-Token header matches the cookie value.
 */
export function csrf(req: Request, res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    if (!req.cookies?.[CSRF_COOKIE]) {
      const token = crypto.randomBytes(32).toString('hex');
      res.cookie(CSRF_COOKIE, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 1000, // 1 hour
      });
    }
    return next();
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.headers[CSRF_HEADER];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  next();
}
