import type { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const { sessionId, userId } = await AuthService.register(req.body);
      res.cookie('session_id', sessionId, COOKIE_OPTIONS);
      res.status(201).json({ userId });
    } catch (err: any) {
      if (err.code === 'P2002') {
        return res.status(409).json({ error: 'Username or email already taken' });
      }
      res.status(400).json({ error: err.message });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { sessionId, userId } = await AuthService.login(req.body);
      res.cookie('session_id', sessionId, COOKIE_OPTIONS);
      res.json({ userId });
    } catch {
      res.status(401).json({ error: 'Invalid email or password' });
    }
  }

  static async logout(req: Request, res: Response) {
    const sessionId = req.cookies?.session_id;
    if (sessionId) await AuthService.logout(sessionId);
    res.clearCookie('session_id');
    res.json({ ok: true });
  }

  static async me(req: Request, res: Response) {
    const session = (req as any).session;
    res.json({ userId: session.userId, username: session.username, role: session.role });
  }
}
