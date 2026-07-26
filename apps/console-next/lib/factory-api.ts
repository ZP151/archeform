export class FactoryApi {
  private readonly base: string;
  private capability = '';

  constructor(base?: string) {
    const configured = typeof window !== 'undefined'
      ? (window as Window & { FACTORY_API_BASE?: string }).FACTORY_API_BASE
      : undefined;
    this.base = base || configured || 'http://127.0.0.1:8080/api';
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
