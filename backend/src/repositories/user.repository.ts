import { prisma } from '../prisma';

const PUBLIC_SELECT = {
  id: true,
  username: true,
  avatarUrl: true,
  bio: true,
  location: true,
  role: true,
  isPro: true,
  reputation: true,
  createdAt: true,
} as const;

export class UserRepository {
  static async findByUsername(username: string) {
    return prisma.user.findUnique({ where: { username }, select: PUBLIC_SELECT });
  }

  static async findById(id: string) {
    return prisma.user.findUnique({ where: { id }, select: PUBLIC_SELECT });
  }

  static async updateProfile(id: string, data: { username?: string; bio?: string; location?: string; avatarUrl?: string | null }) {
    return prisma.user.update({ where: { id }, data, select: PUBLIC_SELECT });
  }
}
