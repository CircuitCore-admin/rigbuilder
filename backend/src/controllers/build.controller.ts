import type { Request, Response } from 'express';
import { BuildService } from '../services/build.service';
import { ZodError } from 'zod';
import { prisma } from '../prisma';
import { BUILD_TEMPLATES } from '../config/build-templates';

export class BuildController {
  /** GET /api/v1/builds/compare?ids=id1,id2 */
  static async compare(req: Request, res: Response) {
    const idsParam = req.query.ids as string;
    if (!idsParam) return res.status(400).json({ error: 'Provide build IDs as ?ids=id1,id2' });

    const ids = idsParam.split(',').slice(0, 3);
    if (ids.length < 2) return res.status(400).json({ error: 'Need at least 2 builds to compare' });

    const builds = await prisma.build.findMany({
      where: { id: { in: ids }, isPublic: true },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
        parts: {
          include: {
            product: {
              select: {
                id: true, name: true, slug: true, manufacturer: true, category: true,
                specs: true, images: true, avgRating: true, affiliateLinks: true,
              },
            },
          },
        },
      },
    });

    if (builds.length < 2) return res.status(404).json({ error: 'One or more builds not found or not public' });

    res.json(builds);
  }

  /** GET /api/v1/builds/templates */
  static async getTemplates(_req: Request, res: Response) {
    res.json(BUILD_TEMPLATES);
  }

  static async list(req: Request, res: Response) {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const { items, total } = await BuildService.list({
      page,
      limit,
      search: req.query.search as string | undefined,
      sortBy: (req.query.sortBy as any) || 'createdAt',
      sortDir: (req.query.sortDir as any) || 'desc',
    });
    res.json({ items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  }

  static async getById(req: Request, res: Response) {
    try {
      const build = await BuildService.getByShortId(req.params.id);
      res.json(build);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg === 'Build not found') {
        return res.status(404).json({ error: msg });
      }
      console.error('❌ getById error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const userId = (req as any).session.userId;
      const build = await BuildService.create(userId, req.body);
      res.status(201).json(build);
    } catch (err) {
      if (err instanceof ZodError) return res.status(400).json({ error: 'Validation failed', issues: err.flatten().fieldErrors });
      res.status(400).json({ error: (err as Error).message });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const userId = (req as any).session.userId;
      const build = await BuildService.update(req.params.id, userId, req.body);
      res.json(build);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg === 'Build not found') return res.status(404).json({ error: msg });
      if (msg === 'Forbidden') return res.status(403).json({ error: msg });
      res.status(400).json({ error: msg });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const userId = (req as any).session.userId;
      await BuildService.delete(req.params.id, userId);
      res.json({ ok: true });
    } catch (err) {
      const msg = (err as Error).message;
      if (msg === 'Build not found') return res.status(404).json({ error: msg });
      if (msg === 'Forbidden') return res.status(403).json({ error: msg });
      res.status(400).json({ error: msg });
    }
  }
}
