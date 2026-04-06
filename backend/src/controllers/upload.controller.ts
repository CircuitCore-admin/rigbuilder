import type { Request, Response } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';

const signedUrlSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().regex(/^image\/(jpeg|png|webp|avif)$/),
  size: z.number().max(10 * 1024 * 1024), // 10MB max
});

/**
 * Generates pre-signed upload URLs for S3/R2.
 * In production, this would use the AWS SDK or Cloudflare R2 API.
 * For now, returns a mock structure that the frontend can integrate with.
 */
export class UploadController {
  static async getSignedUrl(req: Request, res: Response) {
    try {
      const data = signedUrlSchema.parse(req.body);
      const userId = (req as any).session.userId;

      // Generate a unique key for the upload
      const ext = data.contentType.split('/')[1];
      const key = `uploads/${userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

      const bucket = process.env.STORAGE_BUCKET ?? 'rigbuilder-uploads';
      const region = process.env.STORAGE_REGION ?? 'auto';

      // In production, generate actual pre-signed URL via S3/R2 SDK:
      // const command = new PutObjectCommand({ Bucket, Key: key, ContentType: data.contentType });
      // const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

      res.json({
        key,
        uploadUrl: `https://${bucket}.${region}.r2.cloudflarestorage.com/${key}`,
        publicUrl: `https://cdn.rigbuilder.io/${key}`,
        expiresIn: 300,
        variants: {
          thumb: `https://cdn.rigbuilder.io/${key}?w=400`,
          medium: `https://cdn.rigbuilder.io/${key}?w=800`,
          large: `https://cdn.rigbuilder.io/${key}?w=1200`,
        },
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation failed', issues: err.flatten().fieldErrors });
      }
      res.status(400).json({ error: (err as Error).message });
    }
  }
}
