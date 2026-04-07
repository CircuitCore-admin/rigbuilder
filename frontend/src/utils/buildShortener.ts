// ============================================================================
// Build Shortener — Generates short, non-sequential unique IDs for builds
// Format: 6 chars alphanumeric (e.g. "Xy7Z9k") → rigbuilder.gg/list/Xy7Z9k
// ============================================================================

/**
 * Alphabet for short ID generation.
 * Excludes ambiguous chars (0/O, 1/l/I) for readability.
 */
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';
const ID_LENGTH = 6;

/**
 * Generate a short, random, non-sequential build ID.
 * Uses crypto.getRandomValues for better entropy.
 */
export function generateBuildId(length = ID_LENGTH): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let id = '';
  for (let i = 0; i < length; i++) {
    id += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return id;
}

/**
 * Build the full permalink URL for a saved build.
 */
export function buildPermalink(buildId: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return `${base}/list/${buildId}`;
}
