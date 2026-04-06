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

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((extraHeaders as Record<string, string>) ?? {}),
  };

  // Read CSRF token from cookie for state-mutating requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes((rest.method ?? 'GET').toUpperCase())) {
    const csrfToken = getCookie('__csrf');
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
