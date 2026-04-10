import helmet from 'helmet';
import { env } from './env';

// Build the list of allowed image origins from CORS_ORIGIN
const allowedImgOrigins = env.CORS_ORIGIN.split(',')
  .map((o: string) => o.trim())
  .filter(Boolean);

export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      imgSrc: ["'self'", 'data:', 'blob:', ...allowedImgOrigins],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      connectSrc: ["'self'", ...allowedImgOrigins],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: env.NODE_ENV === 'production',
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});
