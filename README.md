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

```powershell
pnpm install
pnpm dev
pnpm test
Copy-Item .env.example .env
pnpm compose:up
```

`compose:up` explicitly reads the repository-root `.env`, even though the
Compose file lives under `infra/`. The OpenAI key remains optional for normal
development; leave it blank unless running a guarded real-model acceptance.
It never becomes persisted product data. Use `pnpm compose:down` to remove the
local Compose resources.

See [the platform architecture](docs/architecture/application-graph-platform.md)
and [the delivery roadmap](docs/roadmap.md).
