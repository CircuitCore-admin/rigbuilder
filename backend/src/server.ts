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
  SearchService.initializeIndexes().catch(() => {});
});

export default app;
