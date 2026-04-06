import type { Request, Response } from 'express';
import { GuideService, NotFoundError } from '../services/guide.service';
import type { GuideCategory } from '@prisma/client';

export class GuideController {
  /** GET /api/v1/guides */
  static async list(req: Request, res: Response) {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const { items, total } = await GuideService.list({
      page,
      limit,
      category: req.query.category as GuideCategory | undefined,
      tag: req.query.tag as string | undefined,
      published: req.query.published !== 'false',
    });

    res.json({
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }

  /** GET /api/v1/guides/:slug */
  static async getBySlug(req: Request, res: Response) {
    try {
      const guide = await GuideService.getBySlug(req.params.slug);
      res.json(guide);
    } catch (err) {
      if (err instanceof NotFoundError) return res.status(404).json({ error: err.message });
      throw err;
    }
  }

  /** POST /api/v1/guides */
  static async create(req: Request, res: Response) {
    const session = (req as any).session;
    const guide = await GuideService.create({
      ...req.body,
      authorId: session.userId,
    });
    res.status(201).json(guide);
  }

  /** PUT /api/v1/guides/:id */
  static async update(req: Request, res: Response) {
    try {
      const guide = await GuideService.update(req.params.id, req.body);
      res.json(guide);
    } catch (err) {
      if (err instanceof NotFoundError) return res.status(404).json({ error: err.message });
      throw err;
    }
  }

  /** DELETE /api/v1/guides/:id */
  static async delete(req: Request, res: Response) {
    try {
      await GuideService.delete(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      if (err instanceof NotFoundError) return res.status(404).json({ error: err.message });
      throw err;
    }
  }
}
