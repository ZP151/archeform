const PROXY_PREFIX = '/api/factory';

export class FactoryApiError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'FactoryApiError';
    this.code = code;
  }
}

function proxyPath(path: string): string {
  if (!path.startsWith('/') || path.includes('?') || path.includes('#') || path.includes('://')) {
    throw new Error('The Console request path is invalid.');
  }
  const normalized = path.replace(/^\/api(?=\/)/, '');
  const segments = normalized.slice(1).split('/');
  if (!normalized || !normalized.startsWith('/') || segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new Error('The Console request path is invalid.');
  }
  return `${PROXY_PREFIX}${normalized}`;
}

export class FactoryApi {
  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers);
    if (options.method && options.method !== 'GET') headers.set('Content-Type', 'application/json');
    const response = await fetch(proxyPath(path), { ...options, headers, cache: 'no-store' });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new FactoryApiError(body?.error?.message || 'The Factory control service is unavailable.', body?.error?.code);
    return body as T;
  }

  async artifact(path: string): Promise<Blob> {
    const response = await fetch(proxyPath(path), { cache: 'no-store' });
    if (!response.ok) throw new Error('Artifact download failed.');
    return response.blob();
  }
}
