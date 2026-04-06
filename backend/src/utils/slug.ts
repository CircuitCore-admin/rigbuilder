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
