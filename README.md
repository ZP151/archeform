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

The independently exercised starter profiles are Expense Approval, Restaurant
Ordering, Simple Ecommerce, Retail Counter, and Grocery Pickup. They share
platform capabilities but each owns its Graph, compiled artifacts, and
acceptance evidence.

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

## Claude Code execution goal

Claude Code loads the repository rules from `CLAUDE.md`. After the founder
approves the Goal design, invoke `/factory-p0-compiler` to run the bounded
compiler-plugin goal. The Skill creates and maintains its detailed plan and
ledger, records evidence, commits and pushes each green iteration, and stops
rather than changing a shared Graph or lifecycle contract. A feature branch or
isolated worktree is recommended, but the Skill does not hard-code a branch,
remote, or project-specific Git command.
