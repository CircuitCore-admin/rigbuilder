import express from 'express';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { corsConfig } from './config/cors';
import { helmetConfig } from './config/helmet';
import { globalLimiter } from './config/rate-limit';
import { csrf } from './middleware/csrf';
import { sanitize } from './middleware/sanitize';
import { errorHandler } from './middleware/error-handler';
import routes from './routes';
import { SearchService } from './services/search.service';
import { checkPriceAlerts } from './jobs/check-price-alerts';
import { sendWeeklyDigests } from './jobs/weekly-digest';

const app = express();

// ---------------------------------------------------------------------------
// Global middleware (order matters)
// ---------------------------------------------------------------------------
app.use(helmetConfig);
app.use(corsConfig);
app.use(globalLimiter);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(csrf);
app.use(sanitize);

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

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

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
});

export default app;
