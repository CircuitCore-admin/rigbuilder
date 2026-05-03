import type { Request, Response } from 'express';
import { ProductService, NotFoundError } from '../services/product.service';
import { getSpecFieldsForCategory } from '../validators/product.schema';
import { ZodError } from 'zod';
import type { ProductCategory } from '@prisma/client';
import { prisma } from '../prisma';

export class ProductController {
  // -----------------------------------------------------------------------
  // Public reads
  // -----------------------------------------------------------------------

  static async list(req: Request, res: Response) {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const { items, total } = await ProductService.list({
      page,
      limit,
      search: req.query.search as string | undefined,
      category: req.query.category as ProductCategory | undefined,
      manufacturer: req.query.manufacturer as string | undefined,
      sortBy: (req.query.sortBy as any) || 'createdAt',
      sortDir: (req.query.sortDir as any) || 'desc',
    });

    res.json({
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }

  static async getById(req: Request, res: Response) {
    try {
      const product = await ProductService.getById(req.params.id);
      res.json(product);
    } catch (err) {
      if (err instanceof NotFoundError) return res.status(404).json({ error: err.message });
      throw err;
    }
  }

  static async getBySlug(req: Request, res: Response) {
    try {
      const product = await ProductService.getBySlug(req.params.slug);
      res.json(product);
    } catch (err) {
      if (err instanceof NotFoundError) return res.status(404).json({ error: err.message });
      throw err;
    }
  }

  /** Returns the dynamic spec field definitions for a category. */
  static async getSpecFields(req: Request, res: Response) {
    const category = req.params.category as string;
    const fields = getSpecFieldsForCategory(category.toUpperCase());
    res.json(fields);
  }

  // -----------------------------------------------------------------------
  // Admin writes
  // -----------------------------------------------------------------------

  static async create(req: Request, res: Response) {
    try {
      const product = await ProductService.create(req.body);
      res.status(201).json(product);
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ error: 'Validation failed', issues: err.flatten().fieldErrors });
      }
      if (err instanceof Error) return res.status(400).json({ error: err.message });
      throw err;
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const product = await ProductService.update(req.params.id, req.body);
      res.json(product);
    } catch (err) {
      if (err instanceof NotFoundError) return res.status(404).json({ error: err.message });
      if (err instanceof ZodError) {
        return res.status(400).json({ error: 'Validation failed', issues: err.flatten().fieldErrors });
      }
      if (err instanceof Error) return res.status(400).json({ error: err.message });
      throw err;
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      await ProductService.delete(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      if (err instanceof NotFoundError) return res.status(404).json({ error: err.message });
      throw err;
    }
  }

  static async getManufacturers(_req: Request, res: Response) {
    const manufacturers = await ProductService.getManufacturers();
    res.json(manufacturers);
  }

  // -----------------------------------------------------------------------
  // Product Comparison
  // -----------------------------------------------------------------------

  /** GET /api/v1/products/compare?slugs=slug1,slug2,slug3 */
  static async compare(req: Request, res: Response) {
    const slugsParam = req.query.slugs as string;
    if (!slugsParam) return res.status(400).json({ error: 'Provide product slugs as ?slugs=slug1,slug2,slug3' });

    const slugs = slugsParam.split(',').slice(0, 4); // Max 4 products
    if (slugs.length < 2) return res.status(400).json({ error: 'Need at least 2 products' });

    const products = await prisma.product.findMany({
      where: { slug: { in: slugs } },
      include: {
        reviews: {
          select: { ratingOverall: true, subRatings: true, wouldBuyAgain: true },
          take: 50,
        },
        _count: { select: { reviews: true, buildParts: true } },
      },
    });

    if (products.length < 2) return res.status(404).json({ error: 'One or more products not found' });

    // Get latest prices for each product
    const productsWithPrices = await Promise.all(
      products.map(async (p) => {
        const latestPrice = await prisma.priceHistory.findFirst({
          where: { productId: p.id },
          orderBy: { recordedAt: 'desc' },
        });
        return { ...p, latestPrice };
      })
    );

    res.json(productsWithPrices);
  }

  // -----------------------------------------------------------------------
  // Price Alerts
  // -----------------------------------------------------------------------

  /** POST /api/v1/products/:slug/price-alert */
  static async setPriceAlert(req: Request, res: Response) {
    const session = (req as any).session;
    const { targetPrice, currency } = req.body;
    if (!targetPrice || targetPrice <= 0) return res.status(400).json({ error: 'Target price required' });

    const product = await prisma.product.findUnique({ where: { slug: req.params.slug } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const alert = await prisma.priceAlert.upsert({
      where: { userId_productId: { userId: session.userId, productId: product.id } },
      create: { userId: session.userId, productId: product.id, targetPrice, currency: currency ?? 'GBP' },
      update: { targetPrice, currency: currency ?? 'GBP', triggered: false },
    });
    res.json(alert);
  }

  /** DELETE /api/v1/products/:slug/price-alert */
  static async removePriceAlert(req: Request, res: Response) {
    const session = (req as any).session;
    const product = await prisma.product.findUnique({ where: { slug: req.params.slug } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    await prisma.priceAlert.deleteMany({
      where: { userId: session.userId, productId: product.id },
    });
    res.json({ ok: true });
  }

  /** GET /api/v1/products/:slug/price-alert */
  static async getPriceAlert(req: Request, res: Response) {
    const session = (req as any).session;
    if (!session?.userId) return res.json({ alert: null });

    const product = await prisma.product.findUnique({ where: { slug: req.params.slug } });
    if (!product) return res.json({ alert: null });

    const alert = await prisma.priceAlert.findUnique({
      where: { userId_productId: { userId: session.userId, productId: product.id } },
    });
    res.json({ alert });
  }
}
