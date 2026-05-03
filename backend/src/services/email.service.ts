import nodemailer from 'nodemailer';
import crypto from 'crypto';

/** Escape HTML special characters to prevent XSS in email templates */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT ?? '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const APP_URL = process.env.APP_URL ?? 'http://localhost:5173';
const FROM_EMAIL = process.env.FROM_EMAIL ?? 'noreply@rigbuilder.com';

export class EmailService {
  /** Generate a verification token and store it on the user */
  static async sendVerificationEmail(userId: string, email: string, username: string): Promise<void> {
    const { prisma } = await import('../prisma');
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.user.update({
      where: { id: userId },
      data: { emailVerifyToken: token, emailVerifyExpiry: expiry },
    });

    const verifyUrl = `${APP_URL}/verify-email?token=${encodeURIComponent(token)}`;

    try {
      await transporter.sendMail({
        from: `"RigBuilder" <${FROM_EMAIL}>`,
        to: email,
        subject: 'Verify your RigBuilder account',
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
            <h1 style="font-size: 24px; color: #111;">Welcome to RigBuilder, ${escapeHtml(username)}!</h1>
            <p style="font-size: 16px; color: #444; line-height: 1.6;">
              Please verify your email address to unlock all features including marketplace listings and messaging.
            </p>
            <a href="${verifyUrl}" style="display: inline-block; padding: 12px 32px; background: #00FFA3; color: #05050A; font-weight: 600; font-size: 16px; text-decoration: none; border-radius: 8px; margin: 16px 0;">
              Verify Email
            </a>
            <p style="font-size: 14px; color: #888; margin-top: 24px;">
              This link expires in 24 hours. If you didn't create this account, you can ignore this email.
            </p>
            <p style="font-size: 12px; color: #aaa; margin-top: 32px;">
              RigBuilder &mdash; Sim Racing Hardware Platform
            </p>
          </div>
        `,
      });
    } catch (err) {
      console.error('Failed to send verification email:', err);
      // Don't throw — user can still use the platform, just with limitations
    }
  }

  /** Verify the token and mark email as verified */
  static async verifyEmail(token: string): Promise<{ success: boolean; error?: string }> {
    const { prisma } = await import('../prisma');
    const user = await prisma.user.findFirst({
      where: { emailVerifyToken: token },
    });

    if (!user) return { success: false, error: 'Invalid verification link' };
    if (user.emailVerified) return { success: true }; // Already verified
    if (user.emailVerifyExpiry && user.emailVerifyExpiry < new Date()) {
      return { success: false, error: 'Verification link has expired. Please request a new one.' };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifyToken: null,
        emailVerifyExpiry: null,
      },
    });

    return { success: true };
  }

  /** Resend verification email */
  static async resendVerification(userId: string): Promise<void> {
    const { prisma } = await import('../prisma');
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, username: true, emailVerified: true },
    });
    if (!user) throw new Error('User not found');
    if (user.emailVerified) throw new Error('Email already verified');

    await EmailService.sendVerificationEmail(user.id, user.email, user.username);
  }

  /** Send a password reset email with a one-time token link */
  static async sendPasswordResetEmail(userId: string, email: string, username: string, token: string): Promise<void> {
    const resetUrl = `${APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
    try {
      await transporter.sendMail({
        from: `"RigBuilder" <${FROM_EMAIL}>`,
        to: email,
        subject: 'Reset your RigBuilder password',
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
            <h1 style="font-size: 24px; color: #111;">Password Reset</h1>
            <p style="font-size: 16px; color: #444; line-height: 1.6;">
              Hi ${escapeHtml(username)}, we received a request to reset your RigBuilder password.
            </p>
            <a href="${resetUrl}" style="display: inline-block; padding: 12px 32px; background: #00FFA3; color: #05050A; font-weight: 600; font-size: 16px; text-decoration: none; border-radius: 8px; margin: 16px 0;">
              Reset Password
            </a>
            <p style="font-size: 14px; color: #888; margin-top: 24px;">
              This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
            </p>
            <p style="font-size: 12px; color: #aaa; margin-top: 32px;">
              RigBuilder &mdash; Sim Racing Hardware Platform
            </p>
          </div>
        `,
      });
    } catch (err) {
      console.error('Failed to send password reset email:', err);
    }
  }
}
