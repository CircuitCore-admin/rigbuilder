import type { Request, Response } from 'express';
import { prisma } from '../prisma';

const BLOG_CATEGORIES = ['NEWS', 'PRODUCT_LAUNCH', 'FIRMWARE', 'ESPORTS', 'PLATFORM_UPDATE', 'EDITORIAL'];

export class BlogController {
  /** GET /api/v1/blog — list published posts */
  static async list(req: Request, res: Response) {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(20, parseInt(req.query.limit as string) || 10);
    const category = req.query.category as string | undefined;
    const featured = req.query.featured === 'true';

    const where: any = { isPublished: true };
    if (category && BLOG_CATEGORIES.includes(category)) where.category = category;
    if (featured) where.isFeatured = true;

    const [items, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { author: { select: { id: true, username: true, avatarUrl: true } } },
      }),
      prisma.blogPost.count({ where }),
    ]);

    res.json({ items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  }

  /** GET /api/v1/blog/:slug */
  static async getBySlug(req: Request, res: Response) {
    const post = await prisma.blogPost.findUnique({
      where: { slug: req.params.slug },
      include: { author: { select: { id: true, username: true, avatarUrl: true } } },
    });
    if (!post || (!post.isPublished && !(req as any).session?.role?.match(/ADMIN|MODERATOR/))) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Increment view count (fire-and-forget)
    prisma.blogPost.update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

    res.json(post);
  }

  /** POST /api/v1/blog — admin/mod only */
  static async create(req: Request, res: Response) {
    const session = (req as any).session;
    if (session.role !== 'ADMIN' && session.role !== 'MODERATOR') {
      return res.status(403).json({ error: 'Only admins can create blog posts' });
    }

    const { title, excerpt, body, category, coverImage, tags, isPublished, isFeatured, seoTitle, seoDescription } = req.body;
    if (!title || !body || !category) return res.status(400).json({ error: 'Title, body, and category required' });
    if (!BLOG_CATEGORIES.includes(category)) return res.status(400).json({ error: 'Invalid category' });

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36);

    const post = await prisma.blogPost.create({
      data: {
        title,
        slug,
        excerpt: excerpt ?? null,
        body,
        category,
        coverImage: coverImage ?? null,
        authorId: session.userId,
        tags: tags ?? [],
        isPublished: isPublished ?? false,
        isFeatured: isFeatured ?? false,
        publishedAt: isPublished ? new Date() : null,
        seoTitle: seoTitle ?? null,
        seoDescription: seoDescription ?? null,
      },
      include: { author: { select: { id: true, username: true, avatarUrl: true } } },
    });
    res.status(201).json(post);
  }

  /** PUT /api/v1/blog/:id — admin/mod only */
  static async update(req: Request, res: Response) {
    const session = (req as any).session;
    if (session.role !== 'ADMIN' && session.role !== 'MODERATOR') {
      return res.status(403).json({ error: 'Only admins can edit blog posts' });
    }

    const existing = await prisma.blogPost.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Post not found' });

    const { title, excerpt, body, category, coverImage, tags, isPublished, isFeatured, seoTitle, seoDescription } = req.body;
    const data: any = {};
    if (title !== undefined) data.title = title;
    if (excerpt !== undefined) data.excerpt = excerpt;
    if (body !== undefined) data.body = body;
    if (category !== undefined) {
      if (!BLOG_CATEGORIES.includes(category)) return res.status(400).json({ error: 'Invalid category' });
      data.category = category;
    }
    if (coverImage !== undefined) data.coverImage = coverImage;
    if (tags !== undefined) data.tags = tags;
    if (isFeatured !== undefined) data.isFeatured = isFeatured;
    if (seoTitle !== undefined) data.seoTitle = seoTitle;
    if (seoDescription !== undefined) data.seoDescription = seoDescription;
    if (isPublished !== undefined) {
      data.isPublished = isPublished;
      if (isPublished && !existing.publishedAt) data.publishedAt = new Date();
    }

    const post = await prisma.blogPost.update({
      where: { id: req.params.id },
      data,
      include: { author: { select: { id: true, username: true, avatarUrl: true } } },
    });
    res.json(post);
  }

  /** DELETE /api/v1/blog/:id — admin/mod only */
  static async delete(req: Request, res: Response) {
    const session = (req as any).session;
    if (session.role !== 'ADMIN' && session.role !== 'MODERATOR') {
      return res.status(403).json({ error: 'Only admins can delete blog posts' });
    }

    const existing = await prisma.blogPost.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Post not found' });

    await prisma.blogPost.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  }
}
