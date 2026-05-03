import { GuideRepository } from '../repositories/guide.repository';
import type { GuideListParams } from '../repositories/guide.repository';
import { slugify } from '../utils/slug';
import { prisma } from '../prisma';

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
      status: 'DRAFT',
      isPublished: false,
    });
  }

  static async update(id: string, data: Record<string, any>) {
    return GuideRepository.update(id, data);
  }

  static async delete(id: string) {
    return GuideRepository.delete(id);
  }

  /** Submit draft for review */
  static async submitForReview(guideId: string, userId: string) {
    const guide = await prisma.guide.findUnique({ where: { id: guideId } });
    if (!guide) throw new NotFoundError('Guide not found');
    if (guide.authorId !== userId) throw new Error('Not authorized');
    if (guide.status !== 'DRAFT' && guide.status !== 'REJECTED') throw new Error('Can only submit drafts or rejected guides');

    return prisma.guide.update({
      where: { id: guideId },
      data: { status: 'PENDING_REVIEW' },
    });
  }

  /** Admin/mod: approve and publish */
  static async publish(guideId: string, _reviewerId: string, role: string) {
    if (role !== 'ADMIN' && role !== 'MODERATOR') throw new Error('Not authorized');
    const guide = await prisma.guide.findUnique({ where: { id: guideId } });
    if (!guide) throw new NotFoundError('Guide not found');

    return prisma.guide.update({
      where: { id: guideId },
      data: { status: 'PUBLISHED', isPublished: true, publishedAt: new Date(), rejectionReason: null },
    });
  }

  /** Admin/mod: reject with reason */
  static async reject(guideId: string, _reviewerId: string, role: string, reason: string) {
    if (role !== 'ADMIN' && role !== 'MODERATOR') throw new Error('Not authorized');
    const guide = await prisma.guide.findUnique({ where: { id: guideId } });
    if (!guide) throw new NotFoundError('Guide not found');

    // Notify the author
    await prisma.notification.create({
      data: {
        userId: guide.authorId,
        type: 'REPLY',
        message: `Your guide "${guide.title}" needs revisions: ${reason}`,
      },
    }).catch(() => {});

    return prisma.guide.update({
      where: { id: guideId },
      data: { status: 'REJECTED', rejectionReason: reason, isPublished: false },
    });
  }

  /** Get guides pending review (admin/mod) */
  static async getPendingReview() {
    return prisma.guide.findMany({
      where: { status: 'PENDING_REVIEW' },
      orderBy: { createdAt: 'asc' },
      include: { author: { select: { id: true, username: true, avatarUrl: true } } },
    });
  }

  /** Get user's own guides (all statuses) */
  static async getMyGuides(userId: string) {
    return prisma.guide.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, username: true, avatarUrl: true } } },
    });
  }
}
