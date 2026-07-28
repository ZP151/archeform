# Factory Pilot

Factory Pilot is an open Application Graph platform. A business requirement,
visual editing session, or AI proposal becomes a versioned Application Graph.
Published Graphs compile into a browser simulator, a Next.js web application, a
NestJS API, PostgreSQL migrations, policies, tests, and documentation.

## Architecture

```text
Requirement / AI / visual editors
            ↓
Factory Application Graph
            ↓
Draft → Publish → immutable Compilation
            ↓
Simulator + Web + API + Database + Tests + Docs
```

The first independent profiles are Expense Approval, Restaurant Ordering, and
Simple Ecommerce. They share platform capabilities but each owns its Graph,
compiled artifacts, and acceptance evidence.

## Local development

```bash
pnpm install
pnpm dev
pnpm test
docker compose -f infra/docker-compose.yml up --build
```

Copy `.env.example` to `.env` only when you need local service or real AI
configuration. The OpenAI key is optional for normal development and never
becomes persisted product data.

See [the platform architecture](docs/architecture/application-graph-platform.md)
and [the delivery roadmap](docs/roadmap.md).
