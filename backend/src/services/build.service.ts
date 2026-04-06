import { BuildRepository } from '../repositories/build.repository';
import type { BuildListParams } from '../repositories/build.repository';
import { createBuildSchema, updateBuildSchema } from '../validators/build.schema';
import { slugify } from '../utils/slug';

export class BuildService {
  static async list(params: BuildListParams) {
    return BuildRepository.findMany(params);
  }

  static async getById(id: string) {
    const build = await BuildRepository.findById(id);
    if (!build) throw new Error('Build not found');
    return build;
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
