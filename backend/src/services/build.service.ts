import { BuildRepository } from '../repositories/build.repository';
import type { BuildListParams } from '../repositories/build.repository';
import { createBuildSchema, updateBuildSchema } from '../validators/build.schema';
import { slugify } from '../utils/slug';
import { toTitleCase } from '../utils/format';

export class BuildService {
  static async list(params: BuildListParams) {
    return BuildRepository.findMany(params);
  }

  static async getById(id: string) {
    const build = await BuildRepository.findById(id);
    if (!build) throw new Error('Build not found');
    return build;
  }

  /**
   * Retrieve a build by its ID or slug (short permalink ID) and format
   * string spec values to Title Case for frontend consumption.
   */
  static async getByShortId(id: string) {
    const build = await BuildRepository.findById(id);
    if (!build) throw new Error('Build not found');

    // Format spec values: convert snake_case strings to Title Case
    const parts = build.parts.map((part) => {
      const product = part.product;
      const rawSpecs = (product.specs ?? {}) as Record<string, unknown>;
      const formattedSpecs: Record<string, unknown> = {};

      for (const [key, val] of Object.entries(rawSpecs)) {
        formattedSpecs[key] =
          typeof val === 'string' && /[_A-Z]/.test(val) ? toTitleCase(val) : val;
      }

      return {
        ...part,
        product: {
          ...product,
          specs: formattedSpecs,
        },
      };
    });

    return { ...build, parts };
  }

  static async create(userId: string, raw: unknown) {
    const data = createBuildSchema.parse(raw);
    const slug = slugify(data.name);

    const totalCost = data.parts.reduce((sum, p) => sum + (p.pricePaid ?? 0), 0);

    return BuildRepository.create(
      userId,
      {
        name: data.name,
        slug,
        description: data.description,
        spaceType: data.spaceType,
        disciplines: data.disciplines,
        platforms: data.platforms,
        totalCost,
        ratings: data.ratings ?? undefined,
        images: data.images,
        isPublic: data.isPublic,
        user: { connect: { id: userId } },
      },
      data.parts,
    );
  }

  static async update(id: string, userId: string, raw: unknown) {
    const existing = await BuildRepository.findById(id);
    if (!existing) throw new Error('Build not found');
    if (existing.userId !== userId) throw new Error('Forbidden');

    const data = updateBuildSchema.parse(raw);
    return BuildRepository.update(id, {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.ratings !== undefined && { ratings: data.ratings }),
      ...(data.images !== undefined && { images: data.images }),
      ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
    });
  }

  static async delete(id: string, userId: string) {
    const existing = await BuildRepository.findById(id);
    if (!existing) throw new Error('Build not found');
    if (existing.userId !== userId) throw new Error('Forbidden');
    await BuildRepository.delete(id);
  }
}
