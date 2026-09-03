---
title: "ADR-0026: CI Dependency Cache Authority Boundary"
status: "Accepted"
date: "2026-09-01"
authors: "Archeform Tech Lead"
tags: ["architecture", "ci", "security", "operability", "supply-chain"]
supersedes: ""
superseded_by: ""
amends_if_accepted: "ADR-0024 CIC-001 through CIC-005 and the active readiness plan's U2 cache requirement only"
---

# ADR-0026: CI Dependency Cache Authority Boundary

## Status and founder gate

Proposed | **Accepted** | Rejected | Superseded | Deprecated

Recommendation: **migrate** the proposed U2 workflow from bidirectional pnpm
dependency caching to no dependency-cache restore or save, while **keeping**
the current accepted Golden technology profile, pinned action SHAs, CI matrix,
permissions, and verification command sequence unchanged.

**Accepted on 2026-09-01** by the founder. The acceptance authorizes the
bounded U2 plan reconciliation and cache-removal repair described by this ADR;
it grants no additional repository, release, deployment, provider, product, or
cloud authority.

- **GAT-001**: This proposal is not approval. The founder must explicitly
  accept or reject ADR-0026 before PM authorizes any U2 repair, commit, push, or
  GitHub execution that depends on this decision.
- **GAT-002**: ADR-0024 remains accepted historical authority. If ADR-0026 is
  accepted, it narrows only the dependency-cache interpretation of ADR-0024's
  credential-free CI contract; every other ADR-0024 and ADR-0025 decision
  remains accepted and unchanged.
- **GAT-003**: Plan prose, an implementation report, an uncommitted workflow,
  or the recommendation in this ADR cannot be treated as founder acceptance.

## Context and reproduced evidence

- **CTX-001**: The active U2 plan requires
  `actions/setup-node` input `cache: pnpm` while also prohibiting cache-save
  code and describing CI as read-only deterministic regression evidence. The
  U2 report consequently claims no cache-save authority even though the
  workflow contains that input.
- **CTX-002**: The exact pinned action is
  `actions/setup-node@820762786026740c76f36085b0efc47a31fe5020`
  (`v7.0.0`). Its `action.yml` declares
  `post: 'dist/cache-save/index.js'` with `post-if: success()`.
- **CTX-003**: At that pinned commit, enabling a supported `cache` input stores
  package-manager cache state during setup. On a successful job, the post
  action calls the bundled `@actions/cache` `saveCache` operation unless the
  primary key was already restored. For pnpm, the cached path is the global
  pnpm store rather than `node_modules`.
- **CTX-004**: The cache key is derived from runner OS, architecture, package
  manager, and the dependency-file hash. A cache miss can therefore create a
  new repository-scoped GitHub Actions cache entry after the verification
  commands complete.
- **CTX-005**: Workflow-level `permissions: contents: read` and checkout
  `persist-credentials: false` constrain repository-token and checkout
  authority, but they do not disable the runner-provided Actions cache-service
  channel. A fork pull request can receive read-only cache authority, while
  trusted events such as `push` can save a cache. Thus “no explicit cache-save
  step” is not equivalent to “no cache save.”
- **CTX-006**: The workflow and provenance record are currently uncommitted U2
  candidate changes. The task report records that no push or GitHub execution
  was performed, so no cache mutation from this candidate workflow has been
  observed or accepted.
- **CTX-007**: GitHub documents that dependency caches are not signed or
  verified, may be readable by pull-request runs within documented branch
  scope, and can contain files later used by workflow commands. This is a
  separate supply-chain and mutable-evidence boundary even when a frozen
  lockfile still governs dependency resolution.

## Current accepted Golden technology profile

- **CUR-001**: Node remains supported at `>=22.11.0 <23`; local selection is
  exactly `22.11.0`; the three application Dockerfiles retain the
  floating-major `node:22-alpine` tag.
- **CUR-002**: `packageManager` remains exactly `pnpm@9.0.0`,
  `engines.pnpm` remains `>=9`, and `pnpm-lock.yaml` remains authoritative for
  exact package resolutions.
- **CUR-003**: The accepted package coordinates remain TypeScript `^5.7.2`
  resolved to `5.9.3`; Puck `^0.22.3` / `0.22.3`; XYFlow `^12.3.6` /
  `12.11.2`; Next.js `^15.1.0` / `15.5.22`; React and React DOM `^19.0.0` /
  `19.2.8`; NestJS Common/Core/Platform Express `^10.4.15` / `10.4.22`;
  Prisma Client and CLI `^6.1.0` / `6.19.3`; BullMQ `^5.34.10` / `5.81.2`;
  and compiler-worker ioredis `^5.4.2` / `5.11.1`.
- **CUR-004**: PostgreSQL remains `postgres:16-alpine`, Redis remains
  `redis:7-alpine`, and the accepted Docker Compose topology remains
  unchanged. These image tags and `node:22-alpine` are floating-major
  constraints, not exact patch or digest pins.
- **CUR-005**: Mutable Draft -> immutable Published Revision -> immutable
  Compilation remains unchanged. Compilers never consume a mutable Draft.
- **CUR-006**: Application Graph V1/V2/V3, Product Recipe V1/V2, Snapshot
  V1/V2, API, capability, compiler target, generated Restaurant runtime,
  provider, adapter, and deployment contracts remain unchanged.
- **CUR-007**: The accepted CI action coordinates remain
  `actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1`
  (`v7.0.1`) and
  `actions/setup-node@820762786026740c76f36085b0efc47a31fe5020`
  (`v7.0.0`). ADR-0024 accepts workflow-level `contents: read`, checkout with
  no persisted credentials, no repository mutation or deployment, and no
  product or write credential.

## Proposed operability profile

This proposed profile is distinct from, and does not replace, the current
accepted Golden technology profile above.

- **PRO-001**: Keep every `CUR-*` runtime, package, image, action, lifecycle,
  API, data, compiler, generated-runtime, capability, provider, and Compose
  coordinate exactly unchanged.
- **PRO-002**: Configure the pinned `actions/setup-node` invocation with only
  `node-version: ${{ matrix.node }}` for the present package-manager concern.
  Remove `cache: pnpm`; do not add `cache-dependency-path` or an implicit or
  explicit dependency-cache substitute.
- **PRO-003**: With pnpm as the declared package manager and no `cache` input,
  the pinned action does not restore the pnpm store, records no pnpm cache
  state for its post action, and performs no dependency-cache save.
- **PRO-004**: Keep `on: [push, pull_request]`, `permissions: contents: read`,
  `persist-credentials: false`, `fail-fast: false`, and matrix values
  `22.11.0` and `22.x` unchanged.
- **PRO-005**: Keep this exact command order unchanged: `corepack enable`;
  `corepack prepare pnpm@9.0.0 --activate`; version reporting;
  `pnpm install --frozen-lockfile`; `pnpm run doctor:toolchain`; Prisma client
  generation with the existing non-routable placeholder; formatting;
  typecheck; test; build; third-party verification; source-study verification.

## Decision

- **DEC-001 — Migrate**: Remove `cache: pnpm` from the proposed U2 workflow.
  Do not explicitly authorize dependency-cache restore or save in this
  readiness iteration.
- **DEC-002 — Preserve authority boundaries**: “Read-only CI” means no
  repository mutation, artifact publication, deployment, or dependency-cache
  mutation. It does not claim that the ephemeral hosted runner performs no
  local writes during installation, generation, build, or test.
- **DEC-003 — Preserve deterministic inputs**: Continue to use exact
  `pnpm@9.0.0`, the byte-identical `pnpm-lock.yaml`, and
  `pnpm install --frozen-lockfile`. Network fetches may vary in latency or
  availability, but package selection and integrity remain lockfile-governed
  without hidden cross-run pnpm-store state.
- **DEC-004 — No restore-only expansion**: Do not add `actions/cache/restore`
  in this proposal. Restore-only caching would avoid saves but would add
  another action coordinate and continue consuming mutable repository-scoped
  cache state; it requires a separately justified governance decision.
- **DEC-005 — No delivery authority**: This proposal creates no commit, push,
  GitHub run, repository release, external resource, or deployment authority.

## API, data, adapter, catalog, license, and supply-chain effects

- **API-001**: No API, request/response, event, schema, serialization,
  identifier, compatibility, Graph, or lifecycle contract changes.
- **DAT-001**: No database migration, durable-data conversion, seed change,
  cache-backed application behavior, or persistent product-state effect.
- **ADP-001**: No editor, AI, Git, compiler, runtime-provider, or deployment
  adapter change. GitHub Actions remains CI infrastructure, not an Application
  Graph adapter or provider authority.
- **CAT-001**: No capability, UI registry, recipe, compiler-target, generated
  template, package, runtime, or provider catalog coordinate changes.
- **LIC-001**: The action set, exact SHAs, and MIT license notices remain
  unchanged. No new package, action, source intake, image, or license notice is
  introduced.
- **SUP-001**: Removing dependency caching narrows the effective supply-chain
  surface by eliminating restoration of unsigned pnpm-store bytes from a
  repository-scoped cache. Registry downloads remain verified through the
  frozen lockfile and package-manager integrity mechanisms.

## Security and operability effects

- **SEC-001**: CI continues to receive no model, Docker, database, production,
  deployment, or repository-write credential. No credential, environment
  value, raw prompt, raw response, or request body may enter logs or evidence.
- **SEC-002**: No Actions dependency-cache entry is restored into the runner or
  saved after a successful job. This removes cache poisoning, cache-content
  disclosure, cache-retention, and cache-eviction concerns from U2's accepted
  authority boundary.
- **SEC-003**: Browser, tenant, provider, queue, compiler, generated-preview,
  and local Docker-socket trust boundaries remain unchanged. This ADR grants
  no production or deployment authority.
- **OPS-001**: Both Node lanes perform a cold pnpm-store population on every
  hosted run. Expected costs are longer installation time, repeated registry
  bandwidth, and greater sensitivity to registry availability.
- **OPS-002**: CI behavior becomes easier to audit: no successful run can
  create dependency-cache state whose later restoration affects another run.
  The workflow remains regression evidence, not product acceptance.

## Consequences

### Positive

- **POS-001**: Workflow behavior matches the accepted no-mutation claim instead
  of relying on the absence of a hand-written cache-save step.
- **POS-002**: Each run proves frozen installation and repository gates without
  consuming unsigned cross-run pnpm-store state.
- **POS-003**: No new action, package, permission, credential, provenance row,
  lockfile change, or compatibility surface is required.
- **POS-004**: Rollback and incident reasoning remain bounded because the U2
  workflow creates no dependency-cache object.

### Negative

- **NEG-001**: CI dependency installation will generally be slower than a
  cache hit and will consume more registry bandwidth.
- **NEG-002**: Registry or network degradation can fail both lanes even when a
  previously populated cache could have allowed installation to proceed.
- **NEG-003**: The active plan, task brief, provenance purpose, report, review
  evidence, and PM ledger must be reconciled before U2 can be accepted; the
  current report's cache-free claim is not valid evidence as written.

## Alternatives considered

### Keep bidirectional `setup-node` pnpm caching

- **ALT-001**: Retain `cache: pnpm`, explicitly authorize cache restore and
  successful post-job save through the GitHub Actions cache service, and amend
  the read-only boundary accordingly.
- **ALT-002**: **Rejected.** The current iteration values minimal authority and
  deterministic auditability over an unmeasured installation-time benefit.
  Authorization would add mutable external state, retention and poisoning
  considerations, evidence requirements, and operational ownership without a
  measured need.

### Add a pinned restore-only cache action

- **ALT-003**: Disable setup-node dependency caching and add a full-SHA-pinned
  `actions/cache/restore` step for the pnpm store.
- **ALT-004**: **Rejected.** This prevents saves but adds a third action and
  provenance coordinate, retains unsigned cache restoration, and cannot warm a
  cache within this workflow. It expands scope without satisfying the current
  no-cache boundary.

### Cache only on selected trusted events

- **ALT-005**: Split restore and save behavior by event, allowing trusted
  default-branch pushes to populate cache entries while pull requests restore
  them.
- **ALT-006**: **Rejected.** Event-conditional authority complicates the single
  two-lane workflow, preserves mutable cross-run state, and requires cache
  provenance, lifecycle, poisoning, observability, and rollback controls not
  justified for local-readiness regression CI.

### Disable automatic caching explicitly

- **ALT-007**: Remove `cache: pnpm` and also add
  `package-manager-cache: false`.
- **ALT-008**: **Rejected for this exact pin.** At pinned setup-node `v7.0.0`,
  automatic package-manager caching applies only when npm is declared; the
  repository declares pnpm. Removing the explicit pnpm cache input is
  sufficient and produces the smallest reconciled workflow. A future action
  or package-manager change requires new governance rather than anticipatory
  compatibility configuration.

## Migration, rollback, and abort conditions

- **MIG-001**: After explicit founder acceptance and PM authorization, remove
  only `cache: pnpm` from `.github/workflows/ci.yml` for this decision. Preserve
  the action SHAs, matrix, permissions, checkout setting, and command sequence.
- **MIG-002**: Update `docs/third-party-sources.md` so setup-node's purpose is
  Node runtime selection without a caching claim. Do not alter its repository,
  tag, SHA, license, or verification command.
- **MIG-003**: PM must reconcile the active plan, U2 brief, U2 report, any U2
  review artifact, PM ledger, and project status to the accepted no-cache
  contract before resuming U2. The plan and brief must remove the
  `cache: pnpm` mandate; the report and review must be regenerated or amended
  so their claims match the final workflow. ADR acceptance alone does not
  silently rewrite those artifacts.
- **ROL-001**: Before delivery, rejection or rollback leaves U2 blocked and the
  uncommitted candidate workflow must not be pushed as accepted evidence.
- **ROL-002**: After accepted implementation, disable or non-force revert only
  the U2 workflow/provenance changes if CI is harmful. Reintroducing dependency
  cache restore or save is not an automatic rollback; it requires a new
  proposed ADR, explicit founder acceptance, and PM authorization.
- **ROL-003**: Existing repository caches, if any were created by unrelated
  workflows, are outside this ADR. Removing `cache: pnpm` prevents this
  workflow from reading or writing them; this proposal does not authorize
  cache deletion.
- **ABT-001**: Abort if implementation requires a package, lockfile, Node or
  pnpm version, action SHA, permission, credential, event, command-order,
  Dockerfile, Compose topology, Graph/API/data, compiler, generated-runtime,
  capability, provider, or deployment change.
- **ABT-002**: Abort if either Node lane restores or saves dependency-cache
  state, or if a new cache action or service is required.
- **IRR-001**: No irreversible repository, data, provider, infrastructure, or
  deployment step is proposed. GitHub job logs, once delivered, remain
  externally retained evidence and must contain bounded safe material only.

## Ownership, frozen contracts, and serialized integration

- **OWN-001**: Platform/Tech Lead owns the CI operability contract. PM owns
  task state, plan reconciliation, and implementation authorization. Platform
  owns the U2 workflow and provenance implementation. QA owns independent
  execution evidence. The controller alone owns commit, push, and integration
  mutations.
- **OWN-002**: This ADR authorizes no frontend or backend product work. The
  existing versioned Graph/API/data artifacts remain frozen enough for
  unchanged consumption by disjoint work, but not for parallel modifications;
  any modification requires a named contract owner and a separately versioned,
  explicitly frozen artifact before PM may authorize disjoint writers.
- **OWN-003**: Generated templates, shared API/data contracts, Compose
  topology, migrations, and end-to-end smoke tests remain serialized
  integration work. A shared-contract change stops parallel work and returns
  it to the contract owner.
- **OWN-004**: U2 remains blocked at the governance gate until founder decision
  and PM reconciliation. U3 remains planned and serialized behind accepted U2;
  this proposal does not authorize U3.

## Measurable verification plan

- **VER-001**: Validate this proposal with
  `pnpm exec prettier --check docs/adr/adr-0026-ci-dependency-cache-authority.md`
  and `git diff --check`.
- **VER-002**: Before U2 delivery, assert `.github/workflows/ci.yml` contains
  the exact accepted checkout and setup-node SHAs, matrix values `22.11.0` and
  `22.x`, workflow-level `contents: read`, and
  `persist-credentials: false`; assert it has zero `cache:`,
  `cache-dependency-path`, `actions/cache`, secret, write-permission,
  artifact-upload, publish, deploy, Docker, and `pull_request_target` entries.
- **VER-003**: Assert the command list and order remain byte-for-byte equivalent
  to ADR-0024 CIC-003 and `PRO-005`, including exact pnpm `9.0.0`, explicit
  `pnpm run doctor:toolchain`, frozen install, and the existing Prisma
  placeholder. Run `git diff --exit-code -- pnpm-lock.yaml`.
- **VER-004**: Run focused Prettier and `git diff --check` on the final U2
  workflow, provenance record, and reconciled governance artifacts. The final
  changed-path manifest must contain only PM-authorized paths.
- **VER-005**: After independent review and controller-authorized non-force
  delivery, observe one `push` run and one `pull_request` run where applicable.
  Both Node lanes must pass every configured command, and setup-node output
  must contain no pnpm dependency-cache restore or save result.
- **VER-006**: The U2 review must report specification compliance and P0/P1
  `0/0`. PM records the exact action SHAs, resolved Node and pnpm versions,
  lane results, cache-absence assertions, review verdict, and changed-path
  manifest in
  `docs/superpowers/ledgers/2026-08-31-post-v0.1-local-restaurant-readiness.md`.
  Evidence must contain no credential, environment value, raw prompt, raw
  response, or request body.
- **VER-007**: Re-run `pnpm verify:third-party` and
  `pnpm verify:source-studies`; both must pass with the action provenance
  retained and no new action, package, or license coordinate.

## References

- **REF-001**: `AGENTS.md`.
- **REF-002**: `docs/tech-governance.md`.
- **REF-003**: `docs/threat-model.md`.
- **REF-004**: `docs/adr/adr-0024-post-v0.1-local-operability-profile.md`.
- **REF-005**:
  `docs/adr/adr-0025-explicit-pnpm-script-invocation-for-local-doctor.md`.
- **REF-006**:
  `docs/superpowers/plans/2026-09-01-post-v0.1-local-restaurant-readiness.md`.
- **REF-007**:
  `docs/superpowers/ledgers/2026-08-31-post-v0.1-local-restaurant-readiness.md`.
- **REF-008**:
  `.superpowers/sdd/2026-09-01-post-v0.1-local-restaurant-readiness/task-2-brief.md`.
- **REF-009**:
  `.superpowers/sdd/2026-09-01-post-v0.1-local-restaurant-readiness/task-2-report.md`.
- **REF-010**: Pinned setup-node `action.yml`,
  <https://github.com/actions/setup-node/blob/820762786026740c76f36085b0efc47a31fe5020/action.yml>.
- **REF-011**: Pinned setup-node cache-save source,
  <https://github.com/actions/setup-node/blob/820762786026740c76f36085b0efc47a31fe5020/src/cache-save.ts>.
- **REF-012**: Pinned setup-node cache-restore source,
  <https://github.com/actions/setup-node/blob/820762786026740c76f36085b0efc47a31fe5020/src/cache-restore.ts>.
- **REF-013**: GitHub dependency-caching reference, consulted 2026-09-01,
  <https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching>.
