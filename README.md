<div align="center">

# Archeform · 元象

**The source form of software.**

Build full-stack applications from requirements, visual editing, or AI — with
a versioned Application Graph as the source of truth.

[Architecture](docs/architecture/application-graph-platform.md) ·
[Roadmap](docs/roadmap.md) ·
[Project status](docs/project-status.md)

</div>

## What is Archeform?

Archeform is a graph-first verified application factory. It turns application
intent into a structured, versioned **Application Graph** that defines the
application's pages, domain model, policies, workflows, integrations, and
experience.

The graph is the product definition. Generated code is a compiled artifact.

```text
Requirement / visual editor / AI proposal
                    ↓
           Application Graph
                    ↓
        Draft → Publish → immutable Published Graph
                    ↓
              Compilation
                    ↓
   Simulator · Web · API · Database · Policy · Tests · Docs
                    ↓
        Independent generated-app verification
```

## Why Archeform?

Most application builders treat generated source code as the final state.
Archeform keeps the durable meaning of an application in a structured Graph;
editors, AI models, compiler targets, frameworks, and runtime providers work
around that Graph through constrained adapters.

This makes application generation:

- **Versioned** — intent evolves through explicit Graph revisions.
- **Reviewable** — changes can be inspected before publication.
- **Deterministic** — immutable Published Graphs are the only compilation input.
- **Multi-target** — one Graph can produce UI, API, database, policy, tests,
  and documentation.
- **Verifiable** — generated applications are exercised independently of the
  editor that created them.

## How it works

### 1. Compose

Start from a business requirement, a visual editing session, or a constrained
AI proposal. The result is represented as a mutable Draft Graph.

### 2. Review and publish

Draft changes remain reviewable and mutable. Publishing validates the selected
revision and creates an immutable Published Graph.

### 3. Compile

Compilers consume only the immutable Published Graph and produce deterministic
application artifacts. Current targets and outputs include:

- Next.js web applications
- NestJS REST APIs
- Prisma / PostgreSQL schemas and migrations
- Authorization policies
- Application workflows
- Tests and API documentation
- ERDs and permission matrices
- Browser role simulators

### 4. Verify

Compilation success is not treated as proof that an application works. The
verification direction is:

```text
Compile
  ↓
Isolated boot → migration → health → API
  ↓
Role journeys → authorization denial → idempotency → cleanup
  ↓
Safe diagnosis and a reviewable Draft Diff
```

Verification must preserve the lifecycle boundary: it may propose a new Draft
change, but it does not patch generated source, runtime state, Published
Graphs, or completed Compilations.

## Workbench

Archeform includes a visual Workbench for inspecting and composing Application
Graphs. Visual editing and graph visualization are replaceable adapters; the
Application Graph remains the persisted business model and source of truth.

## Starter profiles

The repository currently exercises several independent starter application
profiles:

| Profile             | Example domain         |
| ------------------- | ---------------------- |
| Expense Approval    | Approval workflow      |
| Restaurant Ordering | Hospitality commerce   |
| Simple Ecommerce    | Online commerce        |
| Retail Counter      | Point-of-sale workflow |
| Grocery Pickup      | Pickup fulfilment      |

Profiles share platform capabilities while keeping their own Graphs, compiled
artifacts, and acceptance evidence.

## Quick start

### Requirements

- Node.js `>=22.11.0 <23`
- pnpm `>=9`
- Docker with Docker Compose `>=2.24.4` for local infrastructure and isolated
  acceptance flows

### Install

```powershell
git clone https://github.com/ZP151/archeform.git
cd archeform
corepack enable
corepack prepare pnpm@9.0.0 --activate
pnpm run doctor:toolchain
pnpm install --frozen-lockfile
Copy-Item .env.example .env
pnpm run doctor
pnpm accept:local
```

The repository-root `.env` is used for local configuration. The supported local
acceptance creates an isolated Restaurant application, edits a Draft, publishes
an immutable revision, compiles and verifies it, exercises the generated
customer and merchant journeys, checks accessibility, and removes its local
resources. It does not require fixture mode or an OpenAI API key.

Leave `OPENAI_API_KEY` blank unless you are separately running a guarded
real-model acceptance. Credentials, prompts, and model responses are not
persisted as product data.

### Run the Workbench

```powershell
pnpm dev
```

### Start local infrastructure

```powershell
pnpm compose:up
```

Stop and remove local Compose resources with:

```powershell
pnpm compose:down
```

## Development checks

Run the main repository checks with:

```powershell
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Run browser end-to-end tests with:

```powershell
pnpm test:e2e
```

Formatting and provenance checks are also available:

```powershell
pnpm format:check
pnpm verify:third-party
pnpm verify:source-studies
```

## Architecture

Archeform follows a Graph-first lifecycle:

```text
Mutable Draft
     ↓
Validated Published Graph
     ↓
Immutable Compilation
     ↓
Generated application
     ↓
Independent verification
```

Editors, AI providers, compiler targets, frameworks, and runtime providers are
adapters around this lifecycle rather than alternative sources of truth.

Read the full [Application Graph Platform architecture](docs/architecture/application-graph-platform.md)
for the contracts and boundaries behind this model.

## Project status

Archeform is under active development. The current product focus is a bounded,
evidence-backed path from business requirement to runnable local preview:

```text
Discuss → RequirementSpec → Plan → Graph Diff → Draft
       → Simulate → Publish → Compile → Verify → Preview
```

The current work is not a production-readiness claim. Starter applications
are local generated prototypes, and acceptance evidence is scoped to the
specific profile and verification path that produced it.

See the [delivery roadmap](docs/roadmap.md) and [evidence-backed project status](docs/project-status.md)
for the current goals, gates, and known boundaries.

## Repository principles

- Graph > generated source
- Published revision > mutable runtime state
- Explicit capability > profile-specific behavior
- Verification > compilation success
- Adapters > framework ownership

Before changing architecture, review [AGENTS.md](AGENTS.md),
[CLAUDE.md](CLAUDE.md), and the linked architecture and roadmap documents.

## License

Archeform is released under the [MIT License](LICENSE).

<div align="center">

**Application intent → Graph → Verified software**

</div>
