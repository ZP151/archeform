---
title: "ADR-0024: Post-v0.1 Local Operability Profile"
status: "Accepted"
date: "2026-08-31"
authors: "Archeform Tech Lead"
tags: ["architecture", "operability", "onboarding", "ci", "acceptance"]
supersedes: ""
superseded_by: ""
---

# ADR-0024: Post-v0.1 Local Operability Profile

## Status and founder gate

Proposed | **Accepted** | Rejected | Superseded | Deprecated

Recommendation: **migrate** additively from prose- and release-specific local
setup to one executable local operability contract while **keeping** the
current accepted Golden technology profile and all delivered product
contracts.

**Accepted on 2026-09-01** by the founder in the controlling conversation. The
founder also directed execution under a long-running goal. PM must record this
decision, freeze each implementation path manifest, and authorize each task
before its writer begins.

## Context

`factory-pilot v0.1.0` delivered the Restaurant V3 product, including Describe,
the curated Restaurant template, editable customer and merchant surfaces,
immutable Publish and Compilation, generated verification, preview, and guarded
real-model release acceptance. The current repository still lacks one supported
path from a clean checkout through toolchain validation, deterministic local
template acceptance, and verified cleanup.

The root manifest supports Node `>=22.11.0 <23`, declares
`packageManager: pnpm@9.0.0`, and identifies pnpm 9 as the accepted package
manager line. There is no committed Node selector or GitHub CI workflow. The
existing `e2e/restaurant-v3.spec.ts` is the guarded Describe release journey;
the existing Home and template Playwright specs use mocked boundaries and do
not prove a real full-stack template product journey.

The immediate cohort is one to five invited technical evaluators or design
partners who can use a terminal but should not need to understand Graph,
database, policy-engine, package, or Docker internals. The target remains local
only. Hosted or multi-user operation, production identity and tenant isolation,
cloud deployment, domains, fleet operations, production observability,
production payments, workflow editing, new Graph or capability families, new
providers, and new Compose topology remain excluded.

## Current accepted Golden profile

- **CUR-001**: Node remains supported at `>=22.11.0 <23`; the three tracked
  application Dockerfiles continue to use the accepted floating-major
  `node:22-alpine` image.
- **CUR-002**: `packageManager` remains exactly `pnpm@9.0.0`; pnpm 9 remains the
  accepted package-manager line, and `pnpm-lock.yaml` remains authoritative for
  exact package resolutions.
- **CUR-003**: The accepted supported manifest values and exact lockfile
  resolutions remain: TypeScript `^5.7.2` / `5.9.3`, Puck `^0.22.3` / `0.22.3`,
  XYFlow `^12.3.6` / `12.11.2`, Next.js `^15.1.0` / `15.5.22`, React and React
  DOM `^19.0.0` / `19.2.8`, NestJS Common/Core/Platform Express `^10.4.15` /
  `10.4.22`, Prisma Client and CLI `^6.1.0` / `6.19.3`, BullMQ `^5.34.10` /
  `5.81.2`, and compiler-worker ioredis `^5.4.2` / `5.11.1`.
- **CUR-004**: Mutable Draft -> immutable Published Revision -> immutable
  Compilation remains unchanged. Compilers never consume a mutable Draft.
- **CUR-005**: Application Graph V1/V2/V3, Product Recipe V1/V2, Snapshot V1/V2,
  capability, API, generated Restaurant runtime, and existing Compose topology
  contracts remain unchanged.
- **CUR-006**: PostgreSQL remains `postgres:16-alpine`, Redis remains
  `redis:7-alpine`, and application images remain `node:22-alpine`. These are
  accepted floating-major image tags, not exact patch or digest pins; this ADR
  does not misrepresent them as exact versions.

## Accepted additive operability contract

- **PRO-001**: The accepted contract is ADR-0024's local-operability command and
  evidence surface. It is not a replacement or candidate Golden technology
  profile. The current accepted Golden profile above remains independently
  authoritative throughout migration, rollback, and later work.
- **PRO-002**: The exact local selector is Node `22.11.0`; the supported range
  remains `>=22.11.0 <23`. The exact package-manager executable is
  `pnpm@9.0.0`; `packageManager` remains exactly `pnpm@9.0.0` and
  `engines.pnpm` remains `>=9`.
- **PRO-003**: The CI compatibility lanes are exact Node `22.11.0` and the
  current resolved Node `22.x` patch. The only accepted CI actions are
  `actions/checkout` at commit
  `3d3c42e5aac5ba805825da76410c181273ba90b1` (`v7.0.1`) and
  `actions/setup-node` at commit
  `820762786026740c76f36085b0efc47a31fe5020` (`v7.0.0`).
- **PRO-004**: No package, lockfile resolution, Docker image, service topology,
  Graph/API/data identifier, compiler target, generated template, catalog
  entry, or deployment target is part of the accepted migration.

## Decision

### Additive supported toolchain profile

- **DEC-001**: Add `.node-version` containing exactly `22.11.0` followed by one
  newline. This selects the minimum supported Node runtime for local onboarding;
  it does not narrow or widen `engines.node`.
- **DEC-002**: Verify two Node lanes in CI: exact `22.11.0` and floating-major
  `22.x`. Each run records the resolved safe `process.version` so the evidence
  identifies the exact runtime used by the floating lane.
- **DEC-003**: Enable exactly `pnpm@9.0.0` through Node Corepack. Do not add
  `pnpm/action-setup`, another package-manager action, or a new package for
  version parsing, process execution, orchestration, or tests.
- **DEC-004**: Keep `pnpm-lock.yaml` byte-identical. Any dependency or lockfile
  change stops this iteration and requires separate governance and PM scope.
- **DEC-005**: Freeze the additive root commands as `pnpm doctor`, mapped to
  `node scripts/doctor.mjs local`; `pnpm doctor:toolchain`, mapped to
  `node scripts/doctor.mjs toolchain`; and `pnpm accept:local`, mapped to
  `node scripts/local-product-acceptance.mjs`. These command names are the
  supported evaluator and evidence interface.

### Read-only local doctor

- **DOC-001**: Add a cross-platform `node scripts/doctor.mjs` preflight with
  exact `toolchain` and `local` scopes. An unknown or omitted scope fails with
  bounded usage text rather than guessing intent.
- **DOC-002**: `toolchain` checks the Node manifest range, the exact active
  `pnpm@9.0.0` declared by `packageManager`, Git availability, and
  repository-root identity.
- **DOC-003**: `local` performs every toolchain check plus Docker client and
  server availability, Docker Compose availability, root `.env` presence, and
  required environment-variable names.
- **DOC-004**: The doctor prints only check names, safe tool versions, missing
  variable names, and bounded remediation. It never prints environment values,
  `.env` lines, child-process environments, credentials, raw prompts, or raw
  provider responses.
- **DOC-005**: The doctor returns zero only when every selected check passes and
  otherwise returns non-zero before installation, Compose mutation, or product
  runtime work begins.

### Credential-free GitHub CI

- **CIC-001**: Add one GitHub Actions workflow with workflow-level
  `permissions: contents: read`. It must not use `pull_request_target`, request
  write permission, persist credentials, publish artifacts, mutate repository
  contents, or deploy.
- **CIC-002**: Use only these official actions, verified from their upstream
  refs on 2026-08-31 and pinned to full commit SHAs:
  `actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1`
  (`v7.0.1`) and
  `actions/setup-node@820762786026740c76f36085b0efc47a31fe5020`
  (`v7.0.0`).
- **CIC-003**: For both Node lanes, CI runs Corepack activation for
  `pnpm@9.0.0`, `pnpm install --frozen-lockfile`, the toolchain doctor, Prisma
  client generation with a syntactically valid non-routable placeholder, and
  the repository formatting, typecheck, test, build, third-party notice, and
  source-study gates.
- **CIC-004**: CI receives no model, Docker, database, production, deployment,
  or repository-write credential. It does not start Docker, call a model
  provider, Publish a product, create a repository release, or claim product
  acceptance.
- **CIC-005**: GitHub CI is deterministic regression evidence only. The local
  isolated journey defined below is the product-acceptance authority.

### Repeatable local Restaurant acceptance

- **ACC-001**: Add one cross-platform Node runner that generates a unique
  run-owned Compose project name, loopback ports, Redis password, internal
  worker token, and local Restaurant demo table token in memory. It neither
  writes nor prints generated secret values.
- **ACC-002**: The runner uses the existing Compose topology unchanged, waits
  for service health, invokes a dedicated full-stack Restaurant template
  Playwright spec, and attempts teardown exactly once on normal completion,
  command failure, test failure, cleanup failure, or interruption.
- **ACC-003**: The deterministic journey begins at the real Workbench Home
  `Start from a template` entry and uses no route mocking. It proves curated
  template discovery and instantiation, editable customer and merchant preview
  state, at least one persisted Draft edit, immutable Publish, digest-bound
  Compilation, customer/merchant/shared-state/cleanup verification evidence,
  running generated customer and merchant surfaces, one customer order through
  merchant fulfilment, desktop and 390-by-844 accessibility, explicit preview
  stop, and empty run-owned resources.
- **ACC-004**: Product acceptance rejects fixture mode and requires no
  `OPENAI_API_KEY`. The existing guarded Describe journey remains a separate
  environment-only release gate, never falls back to fixture mode, and is not
  rerun for every deterministic local acceptance.
- **ACC-005**: Cleanup is part of the acceptance result. Any remaining run-owned
  container, network, volume, or preview directory changes the final result to
  failure. Safe diagnostics may identify only bounded run-owned resource names
  and command statuses.
- **ACC-006**: Existing Workbench, Control Plane, compiler worker, compiler,
  Graph, capabilities, recipes, generated Restaurant runtime, and lifecycle
  contracts are consumed unchanged. A required change to any such contract
  aborts this implementation and returns to PM and Tech Lead review.

### Local-only boundary and next-decision gate

- **NXT-001**: This migration remains local-only for one to five invited local
  evaluators. It grants no external-user, shared-environment, hosted, domain,
  production, or deployment authority.
- **NXT-002**: Only after every verification and delivery gate in this ADR is
  accepted may PM ask the founder to choose the next phase: identity/tenant or
  hosted deployment. They must not begin in parallel or be inferred from this
  ADR.
- **NXT-003**: Identity/tenant and hosted deployment each require their own
  later proposed ADR, explicit founder acceptance, and PM-recorded
  implementation authorization. Selecting either first does not pre-approve
  the other.

## API, data, catalog, supply-chain, security, and operability effects

- **API-001**: No API, request/response, event, schema, identifier,
  serialization, compatibility, Graph, or lifecycle contract changes.
- **API-002**: Existing versioned Graph/API/data artifacts remain
  byte-compatible and frozen/unchanged. No compatibility shim, downgrade,
  conversion, or client migration is authorized.
- **ADP-001**: No editor, model-provider, Git, compiler, runtime-provider, or
  deployment adapter changes; the acceptance runner invokes existing adapters
  only through their accepted local boundaries.
- **DAT-001**: No database migration, durable-data conversion, seed migration,
  or persistent acceptance state is introduced.
- **CAT-001**: No capability, UI registry, recipe, compiler-target, generated
  template, package, or runtime catalog coordinate changes.
- **SUP-001**: The two GitHub actions are new CI supply-chain inputs. Their
  official repositories, tag-to-commit verification, exact SHAs, and licenses
  must be retained in the repository's required provenance record. No mutable
  action tag may replace the full SHA.
- **SEC-001**: The browser remains untrusted, provider credentials remain
  environment-only, and CI has no product credential. Safe evidence excludes
  credentials, environment values, raw prompts, raw responses, and request
  bodies.
- **SEC-002**: Local Docker access remains privileged local infrastructure, not
  a production-safe boundary. All services and generated previews bind through
  the existing loopback and isolation controls; this ADR grants no deployment
  authority.
- **OPS-001**: The supported local contract gains an exact selector, preflight,
  regression workflow, and deterministic acceptance runner. It adds no managed
  service, queue, provider integration, deployment target, or Compose service.

## Consequences

### Positive

- **POS-001**: A clean supported checkout can fail early with secret-safe,
  actionable toolchain diagnostics instead of failing during install or
  runtime startup.
- **POS-002**: Exact-minimum and current-major CI lanes continuously check the
  declared Node 22 support range while Corepack enforces the declared pnpm
  version.
- **POS-003**: The real curated-template path becomes repeatable without model
  cost or nondeterminism and proves the existing product through cleanup.
- **POS-004**: CI, local product acceptance, and guarded real-model release
  acceptance remain separate authorities with explicit claims.

### Negative

- **NEG-001**: The floating `22.x` lane may expose new upstream Node patch drift;
  evidence must record its resolved version, and failures require triage before
  changing supported versions.
- **NEG-002**: Full local acceptance requires privileged Docker access and is
  slower and more failure-prone than unit or mocked browser tests.
- **NEG-003**: Cross-platform process, signal, port, and cleanup handling adds
  orchestration code that requires hostile and interruption-focused tests.
- **NEG-004**: Pinning GitHub actions to full SHAs improves integrity but
  requires deliberate provenance review and explicit updates for new releases.

## Alternatives considered

### Move directly to a hosted Private Beta

- **ALT-001**: Add identity, tenant, deployment, secret-management,
  observability, support, and rollback infrastructure now.
- **ALT-002**: **Rejected.** This crosses several unaccepted security,
  provider, deployment, and operational boundaries before local onboarding is
  repeatable.

### Expand Graph, capabilities, or providers first

- **ALT-003**: Continue product breadth while retaining manual local setup and
  release-specific acceptance.
- **ALT-004**: **Rejected.** The shipped Restaurant product already proves the
  governed generation path; more architecture surface does not close the
  supported-user journey.

### Run guarded real-model acceptance in GitHub CI

- **ALT-005**: Store a model credential in GitHub and run the Describe journey
  on every workflow execution.
- **ALT-006**: **Rejected.** This widens the credential and provider boundary,
  adds nondeterminism and cost, and confuses regression CI with product release
  acceptance.

### Use fixture-mode Describe as deterministic acceptance

- **ALT-007**: Replace the real-model boundary with fixture interpretation in
  the acceptance journey.
- **ALT-008**: **Rejected.** The threat model explicitly prohibits fixture mode
  as an acceptance fallback. The real curated template provides a deterministic
  product path without misrepresenting the Describe boundary.

### Add a pnpm setup action or helper dependencies

- **ALT-009**: Add `pnpm/action-setup` or version/process/orchestration packages.
- **ALT-010**: **Rejected.** Corepack and Node built-ins satisfy the bounded
  contract without another dependency, license, lockfile, or supply-chain
  surface.

## Migration, rollback, and abort conditions

- **MIG-001**: After explicit founder acceptance and PM authorization, deliver
  the supported toolchain doctor first, then credential-free CI, then the
  serialized local product-acceptance runner and real template journey.
- **MIG-002**: CI consumes only the accepted U1 doctor command. The end-to-end
  smoke path remains serialized integration work even when other paths appear
  disjoint.
- **ROL-001**: The controller rolls back by first disabling the new workflow,
  then non-force reverting only the accepted implementation commits that add
  `.node-version`, `.github/workflows/ci.yml`, `scripts/doctor.mjs`,
  `scripts/doctor.test.mjs`, `scripts/local-product-acceptance.mjs`,
  `scripts/local-product-acceptance.test.mjs`,
  `e2e/restaurant-template-acceptance.spec.ts`, the three additive
  `package.json` scripts, and their bounded README/acceptance documentation.
  Existing unrelated files and commits are preserved; no data or Graph
  rollback is required.
- **ROL-002**: Workflow disablement or removal stops future CI executions. The
  workflow produces no deployable artifact, release, or repository mutation.
- **ABT-001**: Abort on any required Graph, API, lifecycle, compiler, generated
  runtime, capability, recipe, package dependency, lockfile, Dockerfile, or
  Compose topology change.
- **ABT-002**: Abort if CI requires a secret, Docker daemon, provider call,
  repository write, artifact publication, mutable action tag, or deployment
  permission.
- **ABT-003**: Abort if local acceptance requires a model key, fixture fallback,
  non-loopback exposure, persisted generated secrets, raw model evidence, or
  cleanup that cannot prove zero run-owned resources.
- **IRR-001**: No irreversible repository, data, infrastructure, or deployment
  action is authorized. Completed GitHub job logs are externally retained
  evidence and therefore must contain safe summaries only.

## Ownership, frozen boundaries, and delivery

- **OWN-001**: PM owns product scope, iteration state, and implementation
  authorization. Platform/Tech Lead owns the operability contract. Integration
  owns acceptance implementation. QA owns test evidence. The controller alone
  owns normal commit, push, and integration mutations.
- **OWN-002**: Founder acceptance is recorded on 2026-09-01. PM authorizes only
  the current ledger task after reconciling its state and exact path manifest;
  existing product contracts remain `frozen/unchanged`.
- **OWN-003**: U1 owns only `.node-version`, `package.json`,
  `scripts/doctor.mjs`, and `scripts/doctor.test.mjs`. U2 owns only
  `.github/workflows/ci.yml` and required action-pin provenance. U3 owns only
  the PM-frozen runner, runner test, dedicated template acceptance spec,
  additive package scripts, README, and acceptance record paths.
- **OWN-004**: `package.json`, generated templates, shared Graph/API contracts,
  Compose topology, migrations, and end-to-end smoke paths are serialized
  integration boundaries. A shared-contract change stops all dependent work
  and returns to the contract owner.
- **OWN-005**: This ADR authorizes no frontend/backend product work. The
  existing versioned Graph/API/data artifacts are frozen enough for unchanged
  consumption, but not for disjoint frontend/backend modifications. Any such
  modification requires a named contract owner, a separately versioned frozen
  artifact, and a new PM wave after applicable governance; the shared contract,
  generated templates, Compose topology, and end-to-end smoke path remain
  serialized.
- **DEL-001**: Each task requires focused RED/GREEN evidence and independent
  review. The final iteration requires supported Node 22 QA, deterministic
  isolated acceptance with empty cleanup, final review with P0/P1 = 0/0, PM
  acceptance, controller-only non-force delivery, local/upstream equality, and
  a clean worktree.
- **DEL-002**: This decision creates neither a repository release nor cloud
  deployment authority. Integration into `main` follows
  `docs/delivery-policy.md`; a later release requires its separate release gate.

## Verification plan

- **VER-001**: Validate the decision record with
  `pnpm exec prettier --check docs/adr/adr-0024-post-v0.1-local-operability-profile.md`.
- **VER-002**: U1 focused evidence runs `node --test scripts/doctor.test.mjs`,
  `node scripts/doctor.mjs toolchain`, and
  `node scripts/doctor.mjs local`, proving supported and unsupported Node,
  pnpm, Git, Docker, Compose, repository-root, environment-name, remediation,
  exit-code, and secret-redaction behavior.
- **VER-003**: Each CI Node lane runs `corepack enable`,
  `corepack prepare pnpm@9.0.0 --activate`,
  `pnpm install --frozen-lockfile`, the toolchain doctor, Prisma generation,
  `pnpm format:check`, `pnpm typecheck`, `pnpm test`, `pnpm build`,
  `pnpm verify:third-party`, and `pnpm verify:source-studies`.
- **VER-004**: U3 focused evidence runs
  `node --test scripts/local-product-acceptance.test.mjs`, followed by the
  frozen `pnpm accept:local` command for the isolated template product
  acceptance. The result must include Compose build/start health, real-browser
  template entry, Publish, Compilation, verification, order, fulfilment,
  desktop/narrow accessibility, preview stop, and zero run-owned resources.
- **VER-005**: Fresh relevant Workbench, Control Plane, compiler-worker,
  compiler, Graph, capabilities, and product-recipe tests, typechecks, and
  builds pass with no credential, raw model material, or sensitive environment
  value in tracked changes or acceptance evidence.
- **VER-006**: CI evidence records exact resolved Node and pnpm versions for
  both matrix lanes. Local acceptance evidence records only bounded tool
  versions, safe run identity, step statuses, accessibility counts, digests,
  and cleanup counts.
- **VER-007**: One disposable clean checkout with no `node_modules` or prior
  run-owned Compose/preview resources runs, in order, Node `22.11.0`,
  `corepack enable`, `corepack prepare pnpm@9.0.0 --activate`,
  `pnpm install --frozen-lockfile`, `pnpm doctor`, `pnpm build`, and
  `pnpm accept:local`. Acceptance is measurable only when the browser journey
  passes and the runner reports zero run-owned containers, networks, volumes,
  and preview directories after teardown.
- **VER-008**: Before delivery, `git diff --exit-code -- pnpm-lock.yaml` proves
  the lockfile is unchanged, `git diff --check` passes, the action SHAs are
  rechecked against their official upstream tags, and the PM ledger records
  the exact commands, exit codes, resolved Node/pnpm versions, browser result,
  and four zero cleanup counts without secret or raw-model material.

## References

- **REF-001**: `AGENTS.md`.
- **REF-002**: `docs/tech-governance.md`.
- **REF-003**: `docs/threat-model.md`.
- **REF-004**: `docs/delivery-policy.md`.
- **REF-005**:
  `docs/superpowers/specs/2026-08-31-post-v0.1-local-restaurant-readiness-design.md`.
- **REF-006**:
  `docs/superpowers/ledgers/2026-08-31-post-v0.1-local-restaurant-readiness.md`.
- **REF-007**: `docs/adr/adr-0012-curated-template-draft-preview-lifecycle.md`.
- **REF-008**: `docs/adr/adr-0023-v3-publish-compilation-launch-closure.md`.
- **REF-009**: `docs/releases/factory-pilot-v0.1.0.md`.
