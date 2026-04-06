import { prisma } from '../prisma';
import type { Prisma, Product, ProductCategory } from '@prisma/client';

export interface ProductListParams {
  page: number;
  limit: number;
  search?: string;
  category?: ProductCategory;
  manufacturer?: string;
  sortBy?: 'name' | 'createdAt' | 'avgRating';
  sortDir?: 'asc' | 'desc';
}

export class ProductRepository {
  /** Paginated + filterable product list. */
  static async findMany(params: ProductListParams): Promise<{ items: Product[]; total: number }> {
    const { page, limit, search, category, manufacturer, sortBy = 'createdAt', sortDir = 'desc' } = params;

    const where: Prisma.ProductWhereInput = {
      ...(category && { category }),
      ...(manufacturer && { manufacturer: { equals: manufacturer, mode: 'insensitive' } }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { manufacturer: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { [sortBy]: sortDir },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return { items, total };
  }

  static async findById(id: string): Promise<Product | null> {
    return prisma.product.findUnique({ where: { id } });
  }

  static async findBySlug(slug: string): Promise<Product | null> {
    return prisma.product.findUnique({ where: { slug } });
  }

  static async create(data: Prisma.ProductCreateInput): Promise<Product> {
    return prisma.product.create({ data });
  }

  static async update(id: string, data: Prisma.ProductUpdateInput): Promise<Product> {
    return prisma.product.update({ where: { id }, data });
  }

  static async delete(id: string): Promise<void> {
    await prisma.product.delete({ where: { id } });
  }

  /** Returns distinct manufacturer names for filter dropdowns. */
  static async distinctManufacturers(): Promise<string[]> {
    const rows = await prisma.product.findMany({
      distinct: ['manufacturer'],
      select: { manufacturer: true },
      orderBy: { manufacturer: 'asc' },
    });
    return rows.map((r) => r.manufacturer);
  }
}
