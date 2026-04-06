import { prisma } from '../prisma';

export class PriceHistoryRepository {
  /** Get price history for a product within a date range. */
  static async findByProduct(productId: string, options?: {
    currency?: string;
    months?: number;
  }) {
    const currency = options?.currency ?? 'USD';
    const months = options?.months ?? 6;
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    return prisma.priceHistory.findMany({
      where: {
        productId,
        currency,
        recordedAt: { gte: since },
      },
      orderBy: { recordedAt: 'asc' },
    });
  }

  /** Get the latest price for a product from each retailer. */
  static async latestPrices(productId: string, currency = 'USD') {
    // Use raw query for DISTINCT ON (PostgreSQL-specific)
    const results = await prisma.$queryRaw<Array<{
      retailer: string;
      price: number;
      currency: string;
      recorded_at: Date;
    }>>`
      SELECT DISTINCT ON (retailer) retailer, price, currency, recorded_at
      FROM price_history
      WHERE product_id = ${productId} AND currency = ${currency}
      ORDER BY retailer, recorded_at DESC
    `;
    return results;
  }

  /** Record a new price point. */
  static async create(data: {
    productId: string;
    retailer: string;
    price: number;
    currency?: string;
  }) {
    return prisma.priceHistory.create({
      data: {
        productId: data.productId,
        retailer: data.retailer,
        price: data.price,
        currency: data.currency ?? 'USD',
      },
    });
  }
}
