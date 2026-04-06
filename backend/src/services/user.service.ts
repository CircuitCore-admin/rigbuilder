import { UserRepository } from '../repositories/user.repository';
import { updateProfileSchema } from '../validators/user.schema';

export class UserService {
  static async getByUsername(username: string) {
    const user = await UserRepository.findByUsername(username);
    if (!user) throw new Error('User not found');
    return user;
  }

  static async getById(id: string) {
    const user = await UserRepository.findById(id);
    if (!user) throw new Error('User not found');
    return user;
  }

  static async updateProfile(userId: string, raw: unknown) {
    const data = updateProfileSchema.parse(raw);
    return UserRepository.updateProfile(userId, data);
  }
}
