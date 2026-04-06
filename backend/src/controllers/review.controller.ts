import type { Request, Response } from 'express';
import { ReviewService } from '../services/review.service';
import { ZodError } from 'zod';

export class ReviewController {
  static async list(req: Request, res: Response) {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const { items, total } = await ReviewService.list({
      page,
      limit,
      productId: req.query.productId as string | undefined,
      userId: req.query.userId as string | undefined,
      sortBy: (req.query.sortBy as any) || 'createdAt',
      sortDir: (req.query.sortDir as any) || 'desc',
    });
    res.json({ items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  }

  static async getById(req: Request, res: Response) {
    try {
      res.json(await ReviewService.getById(req.params.id));
    } catch { res.status(404).json({ error: 'Review not found' }); }
  }

  static async create(req: Request, res: Response) {
    try {
      const userId = (req as any).session.userId;
      const review = await ReviewService.create(userId, req.body);
      res.status(201).json(review);
    } catch (err) {
      if (err instanceof ZodError) return res.status(400).json({ error: 'Validation failed', issues: err.flatten().fieldErrors });
      const msg = (err as Error).message;
      if (msg.includes('already reviewed')) return res.status(409).json({ error: msg });
      res.status(400).json({ error: msg });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const userId = (req as any).session.userId;
      res.json(await ReviewService.update(req.params.id, userId, req.body));
    } catch (err) {
      const msg = (err as Error).message;
      if (msg === 'Review not found') return res.status(404).json({ error: msg });
      if (msg === 'Forbidden') return res.status(403).json({ error: msg });
      res.status(400).json({ error: msg });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const userId = (req as any).session.userId;
      await ReviewService.delete(req.params.id, userId);
      res.json({ ok: true });
    } catch (err) {
      const msg = (err as Error).message;
      if (msg === 'Review not found') return res.status(404).json({ error: msg });
      if (msg === 'Forbidden') return res.status(403).json({ error: msg });
      res.status(400).json({ error: msg });
    }
  }
}
