import type { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { ZodError } from 'zod';

export class UserController {
  static async getById(req: Request, res: Response) {
    try {
      res.json(await UserService.getById(req.params.id));
    } catch { res.status(404).json({ error: 'User not found' }); }
  }

  static async getByUsername(req: Request, res: Response) {
    try {
      res.json(await UserService.getByUsername(req.params.username));
    } catch { res.status(404).json({ error: 'User not found' }); }
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
