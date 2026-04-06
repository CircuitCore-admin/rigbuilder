import { PriceHistoryRepository } from '../repositories/price-history.repository';

export class PriceHistoryService {
  static async getHistory(productId: string, currency?: string, months?: number) {
    return PriceHistoryRepository.findByProduct(productId, { currency, months });
  }

  static async getLatestPrices(productId: string, currency?: string) {
    return PriceHistoryRepository.latestPrices(productId, currency);
  }

  static async recordPrice(data: {
    productId: string;
    retailer: string;
    price: number;
    currency?: string;
  }) {
    return PriceHistoryRepository.create(data);
  }
}
