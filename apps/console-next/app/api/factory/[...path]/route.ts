import { NextRequest, NextResponse } from 'next/server';

const MAX_BODY_BYTES = 100_000;
const ALLOWED_RESPONSE_HEADERS = ['content-type', 'content-disposition', 'cache-control'];

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function error(status: number, message: string) {
  return NextResponse.json({ error: { message } }, { status, headers: { 'Cache-Control': 'no-store' } });
}

function upstreamBase(): URL | null {
  const value = process.env.FACTORY_CONSOLE_API_BASE || 'http://127.0.0.1:8080/api';
  try {
    const parsed = new URL(value);
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
    ) return null;
    return parsed;
  } catch {
    return null;
  }
}

function safeSegments(path: string[]): string[] | null {
  if (!path.length || path.length > 12) return null;
  const decoded: string[] = [];
  for (const segment of path) {
    try {
      const value = decodeURIComponent(segment);
      if (!/^[A-Za-z0-9._-]{1,128}$/.test(value) || value === '.' || value === '..') return null;
      decoded.push(value);
    } catch {
      return null;
    }
  }
  return decoded;
}

async function proxy(request: NextRequest, path: string[]) {
  if (!['GET', 'POST'].includes(request.method)) return error(405, 'The Console method is not allowed.');
  const token = process.env.FACTORY_CONSOLE_API_TOKEN;
  const base = upstreamBase();
  const segments = safeSegments(path);
  if (!token || !base) return error(503, 'The local Factory control service is unavailable.');
  if (!segments) return error(400, 'The Console request path is invalid.');

  let body: string | undefined;
  if (request.method === 'POST') {
    if (request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
      return error(415, 'Console writes must use application/json.');
    }
    body = await request.text();
    if (!body || new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) return error(400, 'The Console request body is invalid.');
    try {
      if (!Object.prototype.toString.call(JSON.parse(body)).includes('Object')) return error(400, 'The Console request body is invalid.');
    } catch {
      return error(400, 'The Console request body is invalid.');
    }
  }

  const target = new URL(`${base.toString().replace(/\/$/, '')}/${segments.map(encodeURIComponent).join('/')}`);
  try {
    const upstream = await fetch(target, {
      method: request.method,
      body,
      redirect: 'error',
      cache: 'no-store',
      headers: {
        Accept: 'application/json, application/octet-stream',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        Origin: 'http://127.0.0.1:5173',
        'X-Factory-Capability': token,
      },
    });
    const headers = new Headers({ 'Cache-Control': 'no-store' });
    for (const name of ALLOWED_RESPONSE_HEADERS) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new NextResponse(await upstream.arrayBuffer(), { status: upstream.status, headers });
  } catch {
    return error(503, 'The local Factory control service is unavailable.');
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, (await context.params).path);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, (await context.params).path);
}
