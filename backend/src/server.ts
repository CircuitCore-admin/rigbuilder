import express from 'express';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import * as compressionLib from 'compression';
import * as pinoHttpLib from 'pino-http';
import pino from 'pino';
import { env } from './config/env';
import { corsConfig } from './config/cors';
import { helmetConfig } from './config/helmet';
import { globalLimiter } from './config/rate-limit';
import { csrf } from './middleware/csrf';
import { errorHandler } from './middleware/error-handler';
import routes from './routes';
import { SearchService } from './services/search.service';
import { checkPriceAlerts } from './jobs/check-price-alerts';
import { sendWeeklyDigests } from './jobs/weekly-digest';
import { prisma } from './prisma';
import { meili } from './config/meilisearch';

// CJS packages with `export =` need unwrapping under NodeNext ESM
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compression = ((compressionLib as any).default ?? compressionLib) as unknown as Function;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pinoHttp = ((pinoHttpLib as any).default ?? pinoHttpLib) as unknown as Function;

const app = express();

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------
const logger = pino(
  env.NODE_ENV === 'development'
    ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
    : {},
);

// ---------------------------------------------------------------------------
// Global middleware (order matters)
// ---------------------------------------------------------------------------
app.use(helmetConfig);
app.use(corsConfig);

// Compression (1 KB threshold)
app.use(compression({ threshold: 1024 }));

// Request logging — skip health and CSRF endpoints
app.use(pinoHttp({
  logger,
  autoLogging: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ignore: (req: any) => req.url === '/health' || req.url === '/api/v1/csrf',
  },
}));

app.use(globalLimiter);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(csrf);

// Trust proxy if behind a reverse proxy (nginx, Cloudflare)
app.set('trust proxy', 1);

// ---------------------------------------------------------------------------
// Static file serving — optimized uploads
// ---------------------------------------------------------------------------
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads'), {
  maxAge: '30d',
  immutable: true,
  setHeaders(res) {
    // Allow images to be loaded cross-origin (e.g. frontend on a different port/domain).
    // Helmet defaults to same-origin which blocks <img> loads from other origins.
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  },
}));

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use('/api/v1', routes);

// Deep health check — verifies DB and Meilisearch connectivity
app.get('/health', async (_req, res) => {
  const checks: Record<string, string> = {};
  let healthy = true;

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
    healthy = false;
  }

  try {
    await meili.health();
    checks.meilisearch = 'ok';
  } catch {
    checks.meilisearch = 'error';
    healthy = false;
  }

  res.status(healthy ? 200 : 503).json({ status: healthy ? 'ok' : 'degraded', checks });
});

// ---------------------------------------------------------------------------
// Error handler (must be last)
// ---------------------------------------------------------------------------
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
app.listen(env.PORT, () => {
  console.log(`🏁 RigBuilder API running on port ${env.PORT} [${env.NODE_ENV}]`);
  // Initialize Meilisearch indexes (non-blocking)
  SearchService.initializeIndexes()
    .then(() => {
      // Sync data in background (don't block server start)
      Promise.all([
        SearchService.syncProducts(),
        SearchService.syncBuilds(),
        SearchService.syncForumThreads(),
        SearchService.syncMarketplaceListings(),
        SearchService.syncUsers(),
      ]).catch(err => console.warn('⚠️  Initial Meilisearch sync failed:', err));
    })
    .catch(() => {});

  // Check price alerts every hour
  setInterval(() => {
    checkPriceAlerts().catch(err => console.error('Price alert check failed:', err));
  }, 60 * 60 * 1000);

  // Check for weekly digest sends every minute (fires on Sunday at 9am)
  setInterval(() => {
    const now = new Date();
    if (now.getDay() === 0 && now.getHours() === 9 && now.getMinutes() === 0) {
      sendWeeklyDigests().catch(err => console.error('Digest failed:', err));
    }
  }, 60000);

  // Clean expired sessions every hour
  setInterval(async () => {
    try {
      const deleted = await prisma.session.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      if (deleted.count > 0) console.log(`🧹 Cleaned ${deleted.count} expired sessions`);
    } catch (err) {
      console.error('Session cleanup failed:', err);
    }
  }, 60 * 60 * 1000);
});

export default app;
