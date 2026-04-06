import type { Request, Response } from 'express';
import { PriceHistoryService } from '../services/price-history.service';

export class PriceHistoryController {
  /** GET /api/v1/price-history/:productId */
  static async getHistory(req: Request, res: Response) {
    const { productId } = req.params;
    const currency = (req.query.currency as string) ?? 'USD';
    const months = parseInt(req.query.months as string) || 6;

    const history = await PriceHistoryService.getHistory(productId, currency, months);
    res.json(history);
  }

  /** GET /api/v1/price-history/:productId/latest */
  static async getLatest(req: Request, res: Response) {
    const { productId } = req.params;
    const currency = (req.query.currency as string) ?? 'USD';

    const prices = await PriceHistoryService.getLatestPrices(productId, currency);
    res.json(prices);
  }
}
