const FACTORY_API_BASE_ERROR = 'Factory API base must be http://127.0.0.1:<port>/api.';

export function validateFactoryApiBase(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(FACTORY_API_BASE_ERROR);
  }
  const port = Number(parsed.port);
  if (
    parsed.protocol !== 'http:' ||
    parsed.hostname !== '127.0.0.1' ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535 ||
    parsed.pathname !== '/api' ||
    parsed.search ||
    parsed.hash ||
    parsed.username ||
    parsed.password
  ) {
    throw new Error(FACTORY_API_BASE_ERROR);
  }
  return `http://127.0.0.1:${port}/api`;
}

export class FactoryApi {
  private readonly base: string;
  private capability = '';

  constructor(base?: string) {
    const configured = typeof window !== 'undefined'
      ? (window as Window & { FACTORY_API_BASE?: string }).FACTORY_API_BASE
      : undefined;
    this.base = validateFactoryApiBase(base || configured || 'http://127.0.0.1:8080/api');
  }

  setCapability(value: string) { this.capability = value; }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');
    if (this.capability) headers.set('X-Factory-Capability', this.capability);
    const response = await fetch(`${this.base}${path}`, { ...options, headers });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.error?.message || 'Unable to reach the local control plane.');
    return body as T;
  }

  async artifact(path: string) {
    const headers = new Headers();
    if (this.capability) headers.set('X-Factory-Capability', this.capability);
    const response = await fetch(`${this.base}${path.replace(/^\/api/, '')}`, { headers });
    if (!response.ok) throw new Error('Artifact download failed.');
    return response.blob();
  }
}
