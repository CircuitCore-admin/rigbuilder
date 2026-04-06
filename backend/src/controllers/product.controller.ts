import type { Request, Response } from 'express';
import { ProductService, NotFoundError } from '../services/product.service';
import { getSpecFieldsForCategory } from '../validators/product.schema';
import { ZodError } from 'zod';
import type { ProductCategory } from '@prisma/client';

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
}
