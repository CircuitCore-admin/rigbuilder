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

/** Resolve a potentially relative image URL to an absolute one. */
export function resolveImageUrl(url: string): string {
  if (!url) return url;
  // Already absolute
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // Relative path — prefix with API base URL (strip /api/v1 suffix).
  // If BASE_URL is itself relative (e.g. "/api/v1"), the stripped base is empty
  // and the path stays relative, which works when the Vite proxy handles /uploads.
  const base = BASE_URL.replace(/\/api\/v1\/?$/, '');
  return `${base}${url}`;
}
