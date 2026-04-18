import { prisma } from '../prisma';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT ?? '587'),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const APP_URL = process.env.APP_URL ?? 'http://localhost:5173';
const FROM_EMAIL = process.env.FROM_EMAIL ?? 'noreply@rigbuilder.com';

export async function sendWeeklyDigests() {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const users = await prisma.user.findMany({
    where: {
      digestFrequency: 'WEEKLY',
      emailVerified: true,
      OR: [
        { lastDigestSentAt: null },
        { lastDigestSentAt: { lt: oneWeekAgo } },
      ],
    },
    select: { id: true, email: true, username: true, interests: true },
  });

  for (const user of users) {
    try {
      const [newListings, trendingThreads] = await Promise.all([
        prisma.marketplaceListing.findMany({
          where: {
            status: 'ACTIVE',
            createdAt: { gte: oneWeekAgo },
            ...(user.interests.length > 0 && { category: { in: user.interests } }),
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, title: true, price: true, currency: true, category: true },
        }),
        prisma.forumThread.findMany({
          where: { createdAt: { gte: oneWeekAgo } },
          orderBy: { replyCount: 'desc' },
          take: 5,
          select: { title: true, slug: true, replyCount: true, category: true },
        }),
      ]);

      if (newListings.length === 0 && trendingThreads.length === 0) continue;

      const listingHtml = newListings.map(l => {
        const sym = l.currency === 'GBP' ? '£' : l.currency === 'EUR' ? '€' : '$';
        return `<li><a href="${APP_URL}/marketplace/${l.id}" style="color: #00FFA3;">${escapeHtml(l.title)}</a> — ${sym}${l.price ?? 'Offers'}</li>`;
      }).join('');

      const threadHtml = trendingThreads.map(t =>
        `<li><a href="${APP_URL}/community/${t.slug}" style="color: #00FFA3;">${escapeHtml(t.title)}</a> (${t.replyCount} replies)</li>`
      ).join('');

      await transporter.sendMail({
        from: `"RigBuilder" <${FROM_EMAIL}>`,
        to: user.email,
        subject: 'Your RigBuilder Weekly Digest',
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #f8f9fa;">
            <h1 style="font-size: 22px; color: #111;">Hey ${escapeHtml(user.username)}, here's your weekly roundup</h1>

            ${newListings.length > 0 ? `
              <h2 style="font-size: 16px; color: #333; margin-top: 24px;">New Marketplace Listings</h2>
              <ul style="padding-left: 20px; color: #555;">${listingHtml}</ul>
            ` : ''}

            ${trendingThreads.length > 0 ? `
              <h2 style="font-size: 16px; color: #333; margin-top: 24px;">Trending Discussions</h2>
              <ul style="padding-left: 20px; color: #555;">${threadHtml}</ul>
            ` : ''}

            <p style="margin-top: 32px;">
              <a href="${APP_URL}" style="display: inline-block; padding: 12px 24px; background: #00FFA3; color: #05050A; font-weight: 600; text-decoration: none; border-radius: 8px;">
                Visit RigBuilder
              </a>
            </p>

            <p style="font-size: 12px; color: #999; margin-top: 32px;">
              You're receiving this because you signed up for weekly digests.
              <a href="${APP_URL}/settings" style="color: #999;">Manage preferences</a>
            </p>
          </div>
        `,
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { lastDigestSentAt: new Date() },
      });
    } catch (err) {
      console.error(`Failed to send digest to ${user.email}:`, err);
    }
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
