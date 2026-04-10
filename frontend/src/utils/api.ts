const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1';

interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

/**
 * Typed fetch wrapper that handles JSON serialisation,
 * credentials, CSRF headers, and error normalisation.
 */
export async function api<T = unknown>(path: string, options: FetchOptions = {}): Promise<T> {
  const { body, headers: extraHeaders, ...rest } = options;
  const method = (rest.method ?? 'GET').toUpperCase();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((extraHeaders as Record<string, string>) ?? {}),
  };

  // For state-mutating requests, ensure CSRF token exists
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrfToken = await ensureCsrfToken();
    if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    headers,
    body: body ? JSON.stringify(body) : undefined,
    ...rest,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, err.error ?? 'Request failed', err.issues);
  }

  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public issues?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getCookie(name: string): string | undefined {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match?.[1];
}

/**
 * Ensure a CSRF token is available. If the cookie is missing,
 * hits the lightweight /csrf endpoint to set it, then re-reads.
 */
export async function ensureCsrfToken(): Promise<string | undefined> {
  let token = getCookie('__csrf');
  if (!token) {
    try {
      await fetch(`${BASE_URL}/csrf`, { credentials: 'include' });
      token = getCookie('__csrf');
    } catch {
      // Continue without token — server will reject if needed
    }
  }
  return token;
}

/**
 * Resolve a potentially relative image URL for use in <img> tags.
 *
 * Upload paths like `/uploads/file.webp` are kept **relative** so the browser
 * fetches them through the Vite dev-server proxy (same-origin) instead of
 * hitting the backend directly (cross-origin).  In production the same-origin
 * server or reverse-proxy serves `/uploads` so relative paths still work.
 *
 * Legacy absolute URLs already stored in the DB (e.g.
 * `http://localhost:4000/uploads/file.webp`) are converted to relative paths
 * so they also go through the proxy.
 */
export function resolveImageUrl(url: string): string {
  if (!url) return url;

  // Absolute URL — extract the /uploads/ path so the request stays same-origin.
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const { pathname } = new URL(url);
      if (pathname.startsWith('/uploads/')) return pathname;
    } catch { /* invalid URL, fall through */ }
    return url;
  }

  // Relative /uploads/ path — keep it relative (Vite proxy / same-origin).
  if (url.startsWith('/uploads/')) return url;

  // Any other relative path — resolve against the API base.
  const base = BASE_URL.replace(/\/api\/v1\/?$/, '');
  return `${base}${url}`;
}
