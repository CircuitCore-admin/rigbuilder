import { GuideRepository } from '../repositories/guide.repository';
import type { GuideListParams } from '../repositories/guide.repository';
import { slugify } from '../utils/slug';

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class GuideService {
  static async list(params: GuideListParams) {
    return GuideRepository.findMany(params);
  }

  static async getBySlug(slug: string) {
    const guide = await GuideRepository.findBySlug(slug);
    if (!guide) throw new NotFoundError('Guide not found');

    // Resolve product mentions to inject Live Spec Cards
    const mentionedProducts = await GuideRepository.resolveProductMentions(
      guide.productMentions
    );

    return { ...guide, mentionedProducts };
  }

  static async create(data: {
    title: string;
    body: string;
    excerpt?: string;
    category: string;
    authorId: string;
    coverImage?: string;
    tags?: string[];
    productMentions?: string[];
    seoTitle?: string;
    seoDescription?: string;
    isPublished?: boolean;
  }) {
    const slug = slugify(data.title);
    return GuideRepository.create({
      title: data.title,
      slug,
      body: data.body,
      excerpt: data.excerpt,
      category: data.category as any,
      author: { connect: { id: data.authorId } },
      coverImage: data.coverImage,
      tags: data.tags ?? [],
      productMentions: data.productMentions ?? [],
      seoTitle: data.seoTitle ?? data.title,
      seoDescription: data.seoDescription ?? data.excerpt,
      isPublished: data.isPublished ?? false,
      publishedAt: data.isPublished ? new Date() : undefined,
    });
  }

  static async update(id: string, data: Record<string, any>) {
    return GuideRepository.update(id, data);
  }

  static async delete(id: string) {
    return GuideRepository.delete(id);
  }
}
