import type { Request, Response } from 'express';
import { SearchService } from '../services/search.service';

export class SearchController {
  /** GET /api/v1/search?q=...&category=...&limit=... */
  static async instantSearch(req: Request, res: Response) {
    const query = (req.query.q as string) ?? '';
    if (!query.trim()) {
      return res.json({ products: [], builds: [], threads: [] });
    }
    const results = await SearchService.instantSearch(query, {
      category: req.query.category as string | undefined,
      limit: parseInt(req.query.limit as string) || 5,
    });
    res.json(results);
  }

  /** POST /api/v1/search/sync — Admin-only full re-sync. */
  static async syncAll(_req: Request, res: Response) {
    await Promise.all([
      SearchService.syncProducts(),
      SearchService.syncBuilds(),
      SearchService.syncForumThreads(),
    ]);
    res.json({ ok: true, message: 'All indexes synced' });
  }
}
