import type { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { prisma } from '../prisma';
import * as argon2 from 'argon2';

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

  static async changePassword(req: Request, res: Response) {
    const userId = (req as any).session?.userId;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required' });
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    try {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
      if (!user) return res.status(404).json({ error: 'User not found' });

      const valid = await argon2.verify(user.passwordHash, currentPassword);
      if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

      const newHash = await argon2.hash(newPassword, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4 });
      await prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: 'Failed to change password' });
    }
  }
}
