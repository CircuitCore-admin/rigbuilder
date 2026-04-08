import { ForumRepository } from '../repositories/forum.repository';
import type { ForumListParams } from '../repositories/forum.repository';
import { slugify } from '../utils/slug';

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ForumService {
  static async listThreads(params: ForumListParams) {
    return ForumRepository.findThreads(params);
  }

  static async getThreadBySlug(slug: string) {
    const thread = await ForumRepository.findThreadBySlug(slug);
    if (!thread) throw new NotFoundError('Thread not found');

    // Fire-and-forget view count increment
    ForumRepository.incrementViewCount(thread.id).catch(() => {});

    return thread;
  }

  static async getThreadById(id: string) {
    return ForumRepository.findThreadById(id);
  }

  static async createThread(data: {
    title: string;
    body: string;
    category: string;
    userId: string;
    productId?: string;
    metadata?: Record<string, unknown>;
    imageUrls?: string[];
  }) {
    const slug = slugify(data.title) + '-' + Date.now().toString(36);

    return ForumRepository.createThread({
      title: data.title,
      slug,
      body: data.body,
      category: data.category as any,
      user: { connect: { id: data.userId } },
      ...(data.productId && { product: { connect: { id: data.productId } } }),
      ...(data.metadata && { metadata: data.metadata }),
      ...(data.imageUrls?.length && { imageUrls: data.imageUrls }),
    });
  }

  static async getReplies(threadId: string) {
    return ForumRepository.findReplies(threadId);
  }

  static async createReply(data: {
    threadId: string;
    userId: string;
    body: string;
    parentId?: string;
  }) {
    return ForumRepository.createReply({
      body: data.body,
      thread: { connect: { id: data.threadId } },
      user: { connect: { id: data.userId } },
      ...(data.parentId && { parent: { connect: { id: data.parentId } } }),
    });
  }

  static async upvoteReply(replyId: string) {
    return ForumRepository.upvoteReply(replyId);
  }

  static async toggleUpvote(replyId: string, userId: string) {
    return ForumRepository.toggleUpvote(replyId, userId);
  }

  static async updateThread(id: string, data: { title?: string; body?: string; metadata?: Record<string, unknown>; imageUrls?: string[] }) {
    return ForumRepository.updateThread(id, data);
  }

  static async deleteThread(id: string) {
    return ForumRepository.deleteThread(id);
  }

  static async getRelatedDiscussions(productId: string, limit?: number) {
    return ForumRepository.findRelatedByProduct(productId, limit);
  }
}
