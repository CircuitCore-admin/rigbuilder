import { MeiliSearch } from 'meilisearch';

const MEILISEARCH_URL = process.env.MEILISEARCH_URL ?? 'http://localhost:7700';
const MEILISEARCH_API_KEY = process.env.MEILISEARCH_API_KEY ?? '';

export const meili = new MeiliSearch({
  host: MEILISEARCH_URL,
  apiKey: MEILISEARCH_API_KEY,
});

/** Index names used across the app. */
export const INDEXES = {
  PRODUCTS: 'products',
  BUILDS: 'builds',
  FORUM_THREADS: 'forum_threads',
} as const;
