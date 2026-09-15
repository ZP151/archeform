---
title: "ADR-0037: Local Developer Regression Lanes"
status: "Proposed"
date: "2026-09-07"
authors: "Tech Lead"
tags: ["architecture", "decision", "developer-tooling", "verification"]
supersedes: ""
superseded_by: ""
---

# ADR-0037: Local Developer Regression Lanes

## Status

**Proposed** | Accepted | Rejected | Superseded | Deprecated

This document is a Tech Lead proposal. It is not founder acceptance,
implementation authority, a release decision, or evidence that the proposed
commands pass. The Tech Lead stops after this proposal. The founder must accept
or reject it, directly or through the exact standing independent-review policy
in `docs/tech-governance.md`; PM must then record the decision and authorize any
implementation work.

## Recommendation

**Keep** the current accepted Golden technology profile and existing
verification authorities. Add only a provider-free local developer helper with
fixed `smoke` and `product` regression lanes and a non-executing `--dry-run`
mode. Do not add an `affected` or `full` lane in this proposal.

## Context

- **CTX-001**: The founder's 2026-09-07 direction requests faster regression
  feedback for consumer application-generation correction, delivery planning,
  and product tracking. A short developer loop is useful, but it cannot weaken
  or rename repository CI, release, QA, or acceptance gates.
- **CTX-002**: The root scripts already expose the authoritative full test task
  as `pnpm test`, implemented by `turbo run test --concurrency=4`. `turbo.json`
  makes every selected `test` task depend on upstream `^build` tasks. The
  GitHub workflow separately runs toolchain Doctor, Prisma generation, format,
  typecheck, full tests, build, third-party notice verification, and source-
  study verification on Node `22.11.0` and current Node `22.x`.
- **CTX-003**: Existing provider-free Node test surfaces are
  `scripts/doctor.test.mjs` and `scripts/local-product-acceptance.test.mjs`.
  Existing product-focused package tests are owned by `@factory/graph`,
  `@factory/adapters`, `@factory/capabilities`, `@factory/compiler`, and
  `@factory/workbench`.
- **CTX-004**: `scripts/local-product-acceptance.mjs` already exports
  `executeCommand`. It executes with `shell: false`, bounds captured output,
  supports timeouts and abort signals, and proves termination of the spawned
  process tree or process group. Its established Windows pnpm invocation is
  `cmd.exe /d /s /c pnpm` followed only by fixed arguments.
- **CTX-005**: The active PM ledger records the Candidate durable-winner race as
  visible, blocked, and parked rather than resolved. A convenience lane must
  not skip, disable, retry away, reclassify, or claim to close that failure.
- **CTX-006**: This helper is developer convenience. It is not a new product
  operability contract, a release gate, an end-to-end acceptance path, or a
  substitute for controller delivery evidence.

## Current Accepted Golden Profile

The current accepted Golden profile remains distinct from the proposal in this
ADR. Its executable authorities are `package.json`, `pnpm-lock.yaml`, the
tracked Dockerfiles, and `infra/docker-compose.yml`:

- **CUR-001**: Node.js `>=22.11.0 <23`, with `.node-version` at `22.11.0` and
  tracked images at the floating-major `node:22-alpine`; pnpm is declared as
  `pnpm@9.0.0`. The inspected developer environment is Node `22.23.2` and pnpm
  `9.0.0`; that observation does not create a new pin.
- **CUR-002**: TypeScript has manifest range `^5.7.2` and exact lock resolution
  `5.9.3`. Next.js has `^15.1.0` / `15.5.22`; React and React DOM each have
  `^19.0.0` / `19.2.8`; Puck has `^0.22.3` / `0.22.3`; XYFlow has `^12.3.6` /
  `12.11.2`.
- **CUR-003**: NestJS common, core, and platform-express each have `^10.4.15` /
  `10.4.22`; Prisma CLI and client each have `^6.1.0` / `6.19.3`; BullMQ has
  `^5.34.10` / `5.81.2`; compiler-worker ioredis has `^5.4.2` / `5.11.1`.
- **CUR-004**: PostgreSQL stays on floating-major `postgres:16-alpine`, Redis
  stays on floating-major `redis:7-alpine`, and the existing Docker Compose
  topology is unchanged.
- **CUR-005**: The immutable Draft -> Published Graph -> Compilation lifecycle,
  TypeScript compiler targets, generated Next.js/React templates, and currently
  implemented `factory.application-graph/v1` serialized Graph contract remain
  unchanged. ADR-0009's accepted additive V2 decision is not treated as
  evidence that V2 is implemented or frozen.

## Proposed Developer Verification Profile

The proposed profile is additive tooling outside the accepted Golden profile.
If accepted, it keeps every Golden-profile coordinate above unchanged.

- **PRO-001**: Add `scripts/regression.mjs`, implemented only with Node.js
  standard-library APIs and the existing exported `executeCommand` helper. Add
  `scripts/regression.test.mjs` using `node:test` and `node:assert/strict`.
- **PRO-002**: Accept exactly one lane, `smoke` or `product`, and optionally the
  exact flag `--dry-run`. Reject missing, unknown, duplicate, reordered, or
  additional arguments with a bounded usage message, nonzero exit, and zero
  child commands.
- **PRO-003**: The exact supported invocations are
  `node scripts/regression.mjs smoke`,
  `node scripts/regression.mjs product`, and either invocation with
  `--dry-run` as the final argument. No path, package, test name, command,
  executable, environment key, retry count, or free-form passthrough input is
  accepted.
- **PRO-004**: The `smoke` lane runs these existing tests sequentially and
  stops nonzero on the first failure without an automatic retry:
  `node --test scripts/doctor.test.mjs`, then
  `node --test scripts/local-product-acceptance.test.mjs`.
- **PRO-005**: The `product` lane runs one existing Turbo selection:
  `pnpm exec turbo run test --filter=@factory/graph --filter=@factory/adapters
--filter=@factory/capabilities --filter=@factory/compiler
--filter=@factory/workbench --concurrency=4`. Turbo remains responsible for
  the already-declared upstream `^build` dependencies. On Windows, invoke the
  exact fixed pnpm arguments through the established
  `cmd.exe /d /s /c pnpm` adapter; on POSIX, invoke `pnpm` directly. Both paths
  call `executeCommand` with `shell: false`.
- **PRO-006**: `--dry-run` executes no child. It prints the selected lane and
  fixed command identifiers/argument arrays in order so a developer can audit
  selection before execution.
- **PRO-007**: Normal execution returns nonzero for spawn errors, timeouts,
  uncertain termination, signals, or any selected command failure. It performs
  no automatic retry, fallback, test exclusion, or success coercion.
- **PRO-008**: Output is a bounded safe summary containing only a schema
  identifier, lane, dry-run boolean, fixed step identifiers, integer exit
  codes, and final status. It never echoes captured child stdout/stderr,
  environment values, credentials, raw prompts, or raw provider responses. A
  failed summary names the fixed direct command a developer may rerun manually.
- **PRO-009**: Child environments remain provider-free: do not forward
  `OPENAI_API_KEY` or `OPENAI_MODEL`, and do not enable a provider, external
  network action, or acceptance fallback. The selected tests continue to own
  their existing local fixtures and mocks.

## Existing Full Gates Remain Direct and Unchanged

- **GAT-001**: Do not implement a `full` regression-helper lane. A wrapper would
  duplicate established tooling and could be mistaken for a new acceptance or
  release authority.
- **GAT-002**: Developers and controllers continue to invoke the existing full
  repository gates directly: `pnpm run doctor:toolchain`, the required Prisma
  generation step where the active ledger or workflow requires it,
  `pnpm format:check`, `pnpm typecheck`, `pnpm test`, `pnpm build`,
  `pnpm verify:third-party`, and `pnpm verify:source-studies`.
- **GAT-003**: Existing local product acceptance remains the explicit
  `pnpm accept:local` path when its active ledger requires it. This proposal
  does not invoke Docker, Compose, Playwright acceptance, a model provider,
  hosting, Product Publish, deployment, or repository release.
- **GAT-004**: A green `smoke` or `product` lane is rapid feedback only. It
  cannot satisfy QA, release review, CI, merged-`main`, or delivery-policy
  gates. A failure in the Candidate race or any other existing full-suite test
  remains visible and nonzero; this ADR authorizes no skip, disable,
  reclassification, or retry-until-green behavior.

## API, Data, Adapter, and Catalog Compatibility

- **COM-001**: No Graph, REST, queue, event, database, Prisma, schema,
  serialization, generated-source, template, capability, UI registry, package
  identifier, or compatibility contract changes.
- **COM-002**: No adapter behavior changes. The Windows pnpm process adapter is
  reused exactly for fixed allowlisted arguments; the helper provides no shell
  string or arbitrary execution surface.
- **COM-003**: No catalog entry, registry key, asset, recipe, source-study,
  provenance record, or license notice is added or modified.
- **COM-004**: No package manifest, `pnpm-lock.yaml`, `turbo.json`, GitHub
  workflow, Compose file, Dockerfile, or product source file changes.

## Security and Operability Effects

### Positive

- **POS-001**: Fixed allowlisted commands and argument rejection prevent
  requirements, model-shaped data, or callers from selecting executables,
  paths, packages, tests, providers, or shell syntax.
- **POS-002**: Reusing the tested command primitive retains bounded capture,
  explicit deadlines, interruption handling, and fail-closed process-tree
  termination without adding a supervisor, daemon, dependency, or runtime
  service.
- **POS-003**: Provider-free environment handling and summary-only output keep
  credentials and prohibited raw model material out of logs and evidence.
- **POS-004**: The two lane names give developers quick, repeatable feedback
  while preserving the full repository and release gates as the only broad
  authorities.

### Negative

- **NEG-001**: The lanes intentionally cover only selected existing suites, so
  green output cannot establish full repository correctness or release
  readiness.
- **NEG-002**: Reusing `executeCommand` couples the helper to an exported
  function in the local acceptance module. Any future change to that primitive
  requires its existing focused tests plus the new regression-helper tests.
- **NEG-003**: Summary-only output requires a developer to rerun the named
  fixed command directly to inspect ordinary test-runner diagnostics.
- **NEG-004**: The product lane can still be materially slower than a single
  package test because Turbo builds upstream dependencies before the selected
  package suites.

## Alternatives Considered

### Keep Existing Commands Without a Helper

- **ALT-001**: **Description**: Continue requiring developers to remember and
  compose every focused command manually.
- **ALT-002**: **Rejection Reason**: This preserves architecture but does not
  provide the requested consistent selection, dry-run audit, safe summary, or
  rapid regression entry point.

### Add Affected-File Command Inference

- **ALT-003**: **Description**: Inspect Git state and infer packages or tests
  from changed files.
- **ALT-004**: **Rejection Reason**: Dependency and integration impact is not
  reducible to file names without a new selection contract. It risks false
  confidence and adds repository-state parsing beyond the requested bounded
  helper.

### Add a Full Wrapper Lane

- **ALT-005**: **Description**: Add `full` to run the current CI/release command
  sequence through the helper.
- **ALT-006**: **Rejection Reason**: It duplicates existing direct authorities,
  would require continuing synchronization with workflow and delivery policy,
  and could imply that a convenience script is release evidence.

### Add a New Test Runner, Package, or Turbo Task

- **ALT-007**: **Description**: Install an affected-test package or add new root
  manifest and Turbo tasks.
- **ALT-008**: **Rejection Reason**: Existing Node, pnpm, Vitest, and Turbo
  capabilities are sufficient. A dependency, lockfile, workflow, or task-graph
  change would expand supply-chain and governance scope without measurable
  benefit for this slice.

## Ownership and Contract Freeze

- **OWN-001**: PM remains product-scope and task-state owner. Platform/Tech Lead
  owns this developer-tooling contract. One PM-assigned integration writer owns
  both implementation paths because they share one CLI contract.
- **OWN-002**: The only prospective implementation paths are
  `scripts/regression.mjs` and `scripts/regression.test.mjs`. This ADR file is
  the only Tech Lead proposal path.
- **OWN-003**: No frontend/backend request, response, event, or data artifact is
  introduced, so no new versioned API/data contract artifact is needed. All
  existing product contracts remain frozen and unchanged; there is no disjoint
  frontend/backend parallel wave to authorize.
- **OWN-004**: Shared Graph/API contracts, generated templates, Compose
  topology, migrations, and end-to-end smoke/acceptance paths remain serialized
  integration work outside this proposal.

## Migration, Rollback, and Abort Conditions

- **MIG-001**: After founder acceptance and PM authorization, first add failing
  focused tests for the frozen argument grammar, exact command selection,
  provider-free environment, bounded summaries, nonzero propagation,
  interruption/timeout behavior, and zero-execution dry-run. Then implement the
  helper without changing any manifest or shared contract.
- **MIG-002**: Adoption is opt-in. Existing CI, developer commands, acceptance,
  and release processes require no conversion. No stored data, generated
  artifact, registry entry, cache, container, or external resource is migrated.
- **ROL-001**: Roll back through a normal non-force revert of exactly the two
  helper files. There is no persistent state or cleanup migration. Existing
  direct commands remain usable before, during, and after rollback.
- **ABT-001**: Abort implementation on any dependency, manifest, lockfile,
  workflow, Turbo, Docker, Compose, provider, hosting, catalog, API/data,
  generated-template, product-code, deployment, publish, or release change.
- **ABT-002**: Abort on arbitrary command/path/test input, shell interpolation,
  unbounded captured or reported output, credential/raw-model exposure,
  automatic retry, skipped or reclassified existing failures, uncertain
  process termination reported as success, or any claim that a lane replaces a
  full gate.

## Measurable Verification Plan

- **VER-001**: RED: `node --test scripts/regression.test.mjs` must fail because
  the helper or required behavior is absent before implementation. Preserve the
  first failure as evidence; do not retry until green without a corresponding
  implementation change.
- **VER-002**: GREEN: `node --test scripts/regression.test.mjs` must prove exact
  smoke/product selection on POSIX and Windows, fixed ordering, no shell,
  allowlisted arguments only, provider-variable removal, first-failure nonzero,
  timeout/interruption nonzero, no retry, bounded safe output, unknown-input
  rejection, and dry-run with zero spawn calls.
- **VER-003**: Existing command primitive regression:
  `node --test scripts/local-product-acceptance.test.mjs` must remain green.
- **VER-004**: Execute `node scripts/regression.mjs smoke --dry-run` and
  `node scripts/regression.mjs product --dry-run`; each must print only its
  exact fixed selection, perform zero test/build commands, and exit zero.
- **VER-005**: Execute `node scripts/regression.mjs smoke`; it must run both
  exact Node test files and return zero only when both pass. Execute
  `node scripts/regression.mjs product`; it must run the five exact package test
  tasks with Turbo's upstream builds and return zero only when all selected
  tasks pass.
- **VER-006**: Static gates must pass:
  `pnpm exec prettier --check scripts/regression.mjs
scripts/regression.test.mjs docs/adr/adr-0037-local-regression-lanes.md` and
  `git diff --check`.
- **VER-007**: Prove path and dependency containment: the implementation diff
  contains exactly the two prospective script paths, `git diff --exit-code --
package.json pnpm-lock.yaml turbo.json .github/workflows/ci.yml
infra/docker-compose.yml` exits zero, and a sensitive-pattern scan reports
  counts only.
- **VER-008**: The existing full gates in GAT-002 and any active-ledger local
  acceptance/release commands remain separately required. Their command, exit,
  commit, host, Node/pnpm versions, Candidate-race result, and bounded safe
  evidence are recorded by PM in the active task ledger; helper output alone is
  insufficient evidence.

## Irreversible Steps and Residual Risk

- **RSK-001**: There are no irreversible steps, external resources, paid
  actions, cloud actions, migrations, or deployments in this proposal.
- **RSK-002**: A targeted lane can miss failures outside its fixed selection.
  Existing CI, QA, acceptance, and release gates own that residual risk; they
  remain mandatory at their current delivery checkpoints.
- **RSK-003**: The parked Candidate race remains owned by its existing PM and
  security governance record. This proposal neither expands nor accepts that
  risk.

## References

- **REF-001**: `AGENTS.md`
- **REF-002**: `docs/tech-governance.md`
- **REF-003**: `docs/threat-model.md`
- **REF-004**:
  `docs/superpowers/ledgers/2026-08-31-post-v0.1-local-restaurant-readiness.md`
- **REF-005**: `docs/delivery-policy.md`
- **REF-006**: `docs/adr/adr-0024-post-v0.1-local-operability-profile.md`
- **REF-007**:
  `docs/adr/adr-0025-explicit-pnpm-script-invocation-for-local-doctor.md`
- **REF-008**: `docs/adr/adr-0026-ci-dependency-cache-authority.md`
- **REF-009**:
  `docs/adr/adr-0030-candidate-conformance-durable-winner-convergence.md`
- **REF-010**: `package.json`, `pnpm-lock.yaml`, `turbo.json`,
  `.github/workflows/ci.yml`, `scripts/doctor.test.mjs`,
  `scripts/local-product-acceptance.mjs`, and
  `scripts/local-product-acceptance.test.mjs`
