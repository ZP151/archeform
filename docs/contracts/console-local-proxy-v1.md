# Console Local Proxy v1

## Status

Frozen on 2026-07-27. Contract owner: `integration`.

## Browser contract

- Browser requests use the relative prefix `/api/factory` only.
- Allowed methods are `GET` and `POST`.
- The suffix is a non-empty, slash-separated Factory API path without `..`,
  encoded separators, query text, fragments, credentials, or an absolute URL.
- Browser writes use `Content-Type: application/json` and a JSON object no
  larger than 100KB. Browser code never sets `X-Factory-Capability`.
- The proxy returns upstream response status and safe response bytes. If its
  own configuration or validation fails, it returns an `error.message` that
  does not disclose a token, configured base, or request body.

## Server-to-server contract

- The Next Route Handler reads `FACTORY_CONSOLE_API_BASE` and
  `FACTORY_CONSOLE_API_TOKEN` only from its process environment.
- The default base is `http://127.0.0.1:8080/api`; an override must be an
  exact `http://127.0.0.1:<port>/api` URL.
- It sends `Origin: http://127.0.0.1:5173` and the existing
  `X-Factory-Capability` header upstream. It may not add actor identity or
  alter Factory API routes, request bodies, or authorization semantics.
- Upstream redirects are rejected. Only selected response headers
  (`Content-Type`, `Content-Disposition`, `Cache-Control`) are forwarded.

## Compatibility

The Factory API's existing `/api/**` contract remains authoritative. The
proxy is an internal Console transport adapter and is not a public API.
