import crypto from 'node:crypto';

/**
 * Generates a URL-safe slug from a product/build name.
 * Appends a short random suffix to guarantee uniqueness.
 *
 * @example slugify('Fanatec CSL DD (8 Nm)') → 'fanatec-csl-dd-8-nm-a3f2'
 */
export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);

  const suffix = crypto.randomBytes(2).toString('hex');
  return `${base}-${suffix}`;
}

/**
 * Generate a short, random, URL-safe ID for build permalinks.
 * 6 alphanumeric characters (excludes ambiguous: 0/O, 1/l/I).
 *
 * @example generateShortId() → 'Xy7Z9k'
 */
const SHORT_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';
const SHORT_ID_LENGTH = 6;

export function generateShortId(length = SHORT_ID_LENGTH): string {
  const maxValid = Math.floor(256 / SHORT_ALPHABET.length) * SHORT_ALPHABET.length;
  let id = '';
  while (id.length < length) {
    const bytes = crypto.randomBytes(length - id.length + 4); // extra to compensate for rejections
    for (let i = 0; i < bytes.length && id.length < length; i++) {
      if (bytes[i] < maxValid) {
        id += SHORT_ALPHABET[bytes[i] % SHORT_ALPHABET.length];
      }
    }
  }
  return id;
}
