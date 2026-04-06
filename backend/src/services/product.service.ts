import { ProductRepository } from '../repositories/product.repository';
import type { ProductListParams } from '../repositories/product.repository';
import {
  createProductSchema,
  updateProductSchema,
  validateSpecsForCategory,
} from '../validators/product.schema';
import { slugify } from '../utils/slug';
import type { Product } from '@prisma/client';

export class ProductService {
  /**
   * List products with filtering, search, and pagination.
   */
  static async list(params: ProductListParams) {
    return ProductRepository.findMany(params);
  }

  static async getById(id: string) {
    const product = await ProductRepository.findById(id);
    if (!product) throw new NotFoundError('Product not found');
    return product;
  }

  static async getBySlug(slug: string) {
    const product = await ProductRepository.findBySlug(slug);
    if (!product) throw new NotFoundError('Product not found');
    return product;
  }

  /**
   * Create a product with two-phase validation:
   * 1. Base schema validates the envelope (name, category, etc.)
   * 2. Category-specific spec schema validates the JSONB specs field.
   */
  static async create(raw: unknown): Promise<Product> {
    // Phase 1: envelope validation
    const data = createProductSchema.parse(raw);

    // Phase 2: category-discriminated spec validation
    const validatedSpecs = validateSpecsForCategory(data.category, data.specs);

    const slug = slugify(data.name);

    return ProductRepository.create({
      name: data.name,
      slug,
      manufacturer: data.manufacturer,
      category: data.category,
      subcategory: data.subcategory,
      specs: validatedSpecs,
      releaseYear: data.releaseYear,
      weight: data.weight,
      dimensions: data.dimensions ?? undefined,
      platforms: data.platforms,
      affiliateLinks: data.affiliateLinks,
      images: data.images,
    });
  }

  /**
   * Update a product. If category or specs change, re-validates specs.
   */
  static async update(id: string, raw: unknown): Promise<Product> {
    const existing = await ProductRepository.findById(id);
    if (!existing) throw new NotFoundError('Product not found');

    const data = updateProductSchema.parse(raw);

    // If specs are being updated, validate against the (possibly new) category
    let validatedSpecs = undefined;
    if (data.specs) {
      const category = data.category ?? existing.category;
      validatedSpecs = validateSpecsForCategory(category, data.specs);
    }

    return ProductRepository.update(id, {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.manufacturer !== undefined && { manufacturer: data.manufacturer }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.subcategory !== undefined && { subcategory: data.subcategory }),
      ...(validatedSpecs && { specs: validatedSpecs }),
      ...(data.releaseYear !== undefined && { releaseYear: data.releaseYear }),
      ...(data.weight !== undefined && { weight: data.weight }),
      ...(data.dimensions !== undefined && { dimensions: data.dimensions }),
      ...(data.platforms !== undefined && { platforms: data.platforms }),
      ...(data.affiliateLinks !== undefined && { affiliateLinks: data.affiliateLinks }),
      ...(data.images !== undefined && { images: data.images }),
    });
  }

  static async delete(id: string): Promise<void> {
    const existing = await ProductRepository.findById(id);
    if (!existing) throw new NotFoundError('Product not found');
    await ProductRepository.delete(id);
  }

  static async getManufacturers(): Promise<string[]> {
    return ProductRepository.distinctManufacturers();
  }
}

/** Custom error for 404 responses. */
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}
