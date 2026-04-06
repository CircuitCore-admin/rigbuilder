import { ReviewRepository } from '../repositories/review.repository';
import type { ReviewListParams } from '../repositories/review.repository';
import { createReviewSchema, updateReviewSchema } from '../validators/review.schema';

export class ReviewService {
  static async list(params: ReviewListParams) {
    return ReviewRepository.findMany(params);
  }

  static async getById(id: string) {
    const review = await ReviewRepository.findById(id);
    if (!review) throw new Error('Review not found');
    return review;
  }

  static async create(userId: string, raw: unknown) {
    const data = createReviewSchema.parse(raw);

    // One review per user per product
    const existing = await ReviewRepository.findByUserAndProduct(userId, data.productId);
    if (existing) throw new Error('You have already reviewed this product');

    const review = await ReviewRepository.create({
      user: { connect: { id: userId } },
      product: { connect: { id: data.productId } },
      ratingOverall: data.ratingOverall,
      subRatings: data.subRatings ?? undefined,
      ownershipDuration: data.ownershipDuration,
      upgradedFrom: data.upgradedFromProductId
        ? { connect: { id: data.upgradedFromProductId } }
        : undefined,
      pros: data.pros,
      cons: data.cons,
      wouldBuyAgain: data.wouldBuyAgain,
      images: data.images,
    });

    // Refresh aggregate rating on the product
    await ReviewRepository.refreshProductRating(data.productId);
    return review;
  }

  static async update(id: string, userId: string, raw: unknown) {
    const existing = await ReviewRepository.findById(id);
    if (!existing) throw new Error('Review not found');
    if (existing.userId !== userId) throw new Error('Forbidden');

    const data = updateReviewSchema.parse(raw);
    const review = await ReviewRepository.update(id, {
      ...(data.ratingOverall !== undefined && { ratingOverall: data.ratingOverall }),
      ...(data.subRatings !== undefined && { subRatings: data.subRatings }),
      ...(data.pros !== undefined && { pros: data.pros }),
      ...(data.cons !== undefined && { cons: data.cons }),
      ...(data.wouldBuyAgain !== undefined && { wouldBuyAgain: data.wouldBuyAgain }),
      ...(data.images !== undefined && { images: data.images }),
    });

    await ReviewRepository.refreshProductRating(existing.productId);
    return review;
  }

  static async delete(id: string, userId: string) {
    const existing = await ReviewRepository.findById(id);
    if (!existing) throw new Error('Review not found');
    if (existing.userId !== userId) throw new Error('Forbidden');

    await ReviewRepository.delete(id);
    await ReviewRepository.refreshProductRating(existing.productId);
  }
}
