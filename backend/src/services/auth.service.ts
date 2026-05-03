import * as argon2 from 'argon2';
import crypto from 'node:crypto';
import { prisma } from '../prisma';
import { EmailService } from './email.service';
import type { RegisterInput, LoginInput } from '../validators/auth.schema';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536,  // 64 MB
  timeCost: 3,
  parallelism: 4,
};

export class AuthService {
  /**
   * Register a new user. Returns the created session ID.
   * @throws if username or email already exists.
   */
  static async register(input: RegisterInput): Promise<{ sessionId: string; userId: string }> {
    const passwordHash = await argon2.hash(input.password, ARGON2_OPTIONS);

    const user = await prisma.user.create({
      data: {
        username: input.username,
        email: input.email.toLowerCase(),
        passwordHash,
      },
    });

    const sessionId = await this.createSession(user.id);

    // Send verification email (fire-and-forget)
    EmailService.sendVerificationEmail(user.id, input.email, input.username).catch(err => {
      console.error('Failed to send verification email:', err);
    });

    return { sessionId, userId: user.id };
  }

  /**
   * Authenticate an existing user. Returns the session ID.
   * @throws on invalid credentials (generic message to prevent enumeration).
   */
  static async login(input: LoginInput): Promise<{ sessionId: string; userId: string }> {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!user) throw new Error('Invalid email or password');

    const valid = await argon2.verify(user.passwordHash, input.password);
    if (!valid) throw new Error('Invalid email or password');

    const sessionId = await this.createSession(user.id);
    return { sessionId, userId: user.id };
  }

  /** Destroy a session (logout). */
  static async logout(sessionId: string): Promise<void> {
    await prisma.session.deleteMany({ where: { id: sessionId } });
  }

  /** Create a cryptographic session token and persist it. */
  private static async createSession(userId: string): Promise<string> {
    const sessionId = crypto.randomBytes(32).toString('hex');
    await prisma.session.create({
      data: {
        id: sessionId,
        userId,
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      },
    });
    return sessionId;
  }

  /** Request a password reset email. Always returns success to prevent email enumeration. */
  static async requestPasswordReset(email: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return;

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetExpiry: expiry },
    });

    await EmailService.sendPasswordResetEmail(user.id, user.email, user.username, token);
  }

  /** Reset a user's password using a valid reset token. Invalidates all existing sessions. */
  static async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findFirst({ where: { passwordResetToken: token } });
    if (!user) throw new Error('Invalid or expired reset link');
    if (user.passwordResetExpiry && user.passwordResetExpiry < new Date()) {
      throw new Error('Reset link has expired. Please request a new one.');
    }

    const passwordHash = await argon2.hash(newPassword, ARGON2_OPTIONS);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, passwordResetToken: null, passwordResetExpiry: null },
    });
    await prisma.session.deleteMany({ where: { userId: user.id } });
  }
}
