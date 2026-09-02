---
title: "ADR-0033: Local Acceptance Preview Profile Activation"
status: "Accepted"
date: "2026-09-02"
authors: "Archeform Tech Lead"
tags:
  [
    "architecture",
    "compiler-worker",
    "docker-compose",
    "security",
    "operability",
    "acceptance",
  ]
supersedes: ""
superseded_by: ""
amends_if_accepted: "ADR-0032 ROL-001 activation path only"
---

# ADR-0033: Local Acceptance Preview Profile Activation

## Status and founder gate

Proposed | **Accepted** | Rejected | Superseded | Deprecated

Recommendation: **experiment** with one bounded, reversible, local-only
activation adapter for the acceptance profile already required by accepted
ADR-0032.

Accepted by PM on 2026-09-02 under the founder's standing independent-review
authorization in `docs/tech-governance.md`. Separate qualified read-only
reviewer `/root/review_adr_0033` first reported P0/P1/P2 `0/1/0`, then verified
the cleanup-only recovery repair with P0/P1/P2 `0/0/0`, bounded/reversible
`yes`, material ambiguity `no`, and exactly
`APPROVED_FOR_STANDING_ACCEPTANCE: yes`. The accepted ADR SHA-256 is
`14799e07661bdcf63a3c9fc5f9eceb4c5871d0716da5fda21284bb2b6197f11c`.

This acceptance grants no repository release, Product Publish, provider call, paid
resource, cloud action, deployment, credential exposure, security-boundary
weakening, destructive migration, or irreversible step.

## Context and reproduced activation gap

- **CTX-001**: Accepted ADR-0032 requires the generated Restaurant Compose
  artifact to register loopback-only `kitchen` and `cashier` services under the
  exact Compose profile name `acceptance`, activated only by `pnpm
accept:local`. Normal generated previews must retain their current default
  services and behavior.
- **CTX-002**: `scripts/local-product-acceptance.mjs` creates the trusted local
  acceptance environment and sets `FACTORY_E2E_ISOLATED=1`. Its current
  acceptance-only Compose override replaces the four outer-stack port mappings
  with exact loopback bindings, but it does not inject a preview-profile signal
  into `compiler-worker`.
- **CTX-003**: The tracked shared outer topology in
  `infra/docker-compose.yml` passes only the existing Redis, worker-token,
  artifact-root, Control Plane URL, and Restaurant demo-token inputs to
  `compiler-worker`. It has no acceptance-profile setting and must remain
  unchanged.
- **CTX-004**: `apps/compiler-worker/src/preview-runner.ts` currently builds a
  bounded child environment containing the Factory Compose project, generated
  `web`/`api` port inputs when starting, the existing optional Restaurant demo
  token, and Docker CLI lookup variables. Its argument-array commands invoke
  `docker compose` without `--profile` for `up`, `port`, readiness `exec`,
  failed-start `down`, and explicit stop `down`.
- **CTX-005**: The Control Plane preview-start request body is intentionally
  strict and empty. The authenticated queue dispatch and preview runtime
  request contain the immutable Compilation and preview identity, not an
  operator-selected runtime profile. Adding a body or queue field would change
  a frozen API or cross-process contract for an acceptance-only concern.
- **CTX-006**: Making `kitchen` or `cashier` a default generated service would
  silently change resource use and behavior for every normal preview. Leaving
  the profile unselected would make the ADR-0032 live merchant journey
  unreachable. A private outer-runner-to-worker activation boundary is
  therefore an implementation prerequisite for ADR-0032.

## Current accepted Golden technology profile

The following accepted Golden profile remains in force independently of this
proposal. This section describes current authority; it does not treat the
proposed activation profile as accepted.

- **CUR-001**: The runtime remains Node `>=22.11.0 <23`; the supported local
  selection is Node `22.11.0`; the three tracked application Dockerfiles use
  the floating-major image `node:22-alpine`. The package manager declaration is
  exactly `pnpm@9.0.0`, and `pnpm-lock.yaml` format `9.0` is the exact resolved
  dependency authority.
- **CUR-002**: Root TypeScript remains `^5.7.2` with lockfile resolution
  `5.9.3`. The Workbench remains Next `^15.1.0` / `15.5.22`, React and React DOM
  `^19.0.0` / `19.2.8`, Puck `^0.22.3` / `0.22.3`, and XYFlow `^12.3.6` /
  `12.11.2`.
- **CUR-003**: The Control Plane remains NestJS `^10.4.15` / `10.4.22`, Prisma
  `^6.1.0` / `6.19.3`, and BullMQ `^5.34.10` / `5.81.2`. The compiler worker
  remains BullMQ `^5.34.10` / `5.81.2` and ioredis `^5.4.2` / `5.11.1`.
- **CUR-004**: PostgreSQL remains the floating-major image
  `postgres:16-alpine`, Redis remains `redis:7-alpine`, and Docker Compose
  remains the accepted local topology adapter. Local acceptance requires
  Docker Compose at least `2.24.4`; the latest accepted U3 evidence used
  Compose `5.3.1`. These are operability constraints, not a newly proposed
  package or image pin.
- **CUR-005**: `package.json`, workspace manifests, `pnpm-lock.yaml`, the
  tracked Dockerfiles, `infra/docker-compose.yml`, and the executable Golden
  table in `docs/tech-governance.md` are the version authorities. Supported
  ranges come from manifests, exact dependency resolutions come only from the
  lockfile, and floating-major image tags are not exact patch or digest pins.
- **CUR-006**: Draft -> immutable Published Revision -> immutable Compilation
  remains unchanged. The Golden authority continues to identify
  `factory.application-graph/v1` as the currently implemented base contract;
  the accepted Restaurant U4 slice separately consumes the existing exact
  `factory.application-graph/v3`, `factory.restaurant-product-plan/v1`, and
  `factory.restaurant-product-bundle/v1` contracts. This proposal changes none
  of them.
- **CUR-007**: Accepted ADR-0032 remains a bounded experiment contract and does
  not replace the Golden profile. Its generated acceptance-role services and
  `factory.local-preview-lease/v1` contract remain separate from this proposed
  activation adapter.

## Proposed experimental profile

The proposed profile is additive, acceptance-only, and not part of the current
accepted Golden profile unless the founder gate above is satisfied and PM
records the acceptance.

### Exact activation identifier and authority

- **SIG-001**: Introduce exactly one internal environment signal whose key is
  `FACTORY_LOCAL_PREVIEW_PROFILE` and whose only accepted value is
  `factory.local-preview-profile/v1:acceptance`. The complete key/value pair is
  the versioned activation identifier. It is an internal local-runtime adapter
  contract, not a public API, queue field, Graph value, generated identifier,
  persisted datum, or deployment setting.
- **SIG-002**: `docs/adr/adr-0033-local-acceptance-preview-profile-activation.md`
  is the proposal authority for version `v1`. If accepted, PM records its exact
  hash and status in the active ledger before implementation. A different key,
  value, version, profile name, or additional mode requires a new proposed ADR;
  implementations must not guess compatibility.
- **SIG-003**: The only enabled mapping is
  `factory.local-preview-profile/v1:acceptance` -> Docker Compose profile
  `acceptance`. No other name or value aliases this mapping.

### Outer acceptance runner boundary

- **RUN-001**: Only `scripts/local-product-acceptance.mjs`, while constructing
  its own isolated `pnpm accept:local` child environment with
  `FACTORY_E2E_ISOLATED` exactly equal to `1`, may select the proposed signal.
  It deletes or ignores any inherited `FACTORY_LOCAL_PREVIEW_PROFILE` value and
  writes the exact fixed value itself; operator input cannot select an
  alternate profile.
- **RUN-002**: The runner creates one private, run-owned temporary directory
  with an unpredictable name tied to the exact `factory-local-*` project. It
  creates one combined Compose override inside that directory using exclusive
  creation. The override retains the current four exact loopback `!override`
  port bindings and adds only the fixed
  `compiler-worker.environment.FACTORY_LOCAL_PREVIEW_PROFILE` value.
- **RUN-003**: Before outer `config` and `up`, the runner proves that the
  temporary root and override resolve within the runner-created root, are not
  symlinks, that the override is one regular file, and that its bytes match the
  runner-constructed digest. A failed containment, type, link, or digest check
  aborts before Docker. The override path is passed as one argument in an
  argument array; no shell interpolation is permitted.
- **RUN-004**: Normal teardown may reuse the same override only after a fresh
  successful integrity check. A post-`up` missing file, byte mutation,
  non-regular-file change, symlink replacement, or containment failure
  permanently marks acceptance failed, but it must not block cleanup and the
  runner must never pass that untrusted override to Docker.
- **RUN-005**: Cleanup-only recovery first stops the exact preview identified
  by the validated ADR-0032 `factory.local-preview-lease/v1` lease. It then
  invokes Docker Compose by argument array with only the trusted tracked
  `infra/docker-compose.yml` and the already validated exact
  `factory-local-*` project name to run `down --volumes --remove-orphans`.
  The acceptance-only signal changes compiler-worker preview-profile
  activation; neither that signal nor the loopback override is required for
  outer-project resource discovery or deletion.
- **RUN-006**: If a demonstrated Compose implementation constraint makes an
  override necessary for cleanup, the runner may use only the frozen in-memory
  override constant to create a new exclusively created file in a new private,
  contained temporary directory. It validates the new file's regular type,
  no-symlink containment, and exact digest before use. It never repairs,
  follows, trusts, or reuses the abnormal file. Acceptance remains failed even
  when this recovery removes every resource.
- **RUN-007**: The runner removes only its exact original override, any exact
  cleanup-recovery override, and their run-owned temporary directories in
  `finally`, after exact preview and outer cleanup. Missing or failed temporary
  cleanup makes acceptance fail; it never broad-deletes a prefix or another
  run.
- **RUN-008**: The override contains no token, credential, port secret, model
  input, model output, request body, tenant data, or user data. Logs and
  evidence must not print the child environment or rendered Compose
  environment. Safe evidence may report only the versioned identifier, the
  bounded stage result, the validated project identity, and zero/nonzero
  resource counts.
- **RUN-009**: `infra/docker-compose.yml` remains byte-unchanged. Outside the
  exact isolated local acceptance runner, the worker receives no signal and
  all normal outer and generated preview behavior stays unchanged.

### Compiler-worker interpretation and Docker commands

- **WRK-001**: The compiler worker treats only a genuinely absent
  `FACTORY_LOCAL_PREVIEW_PROFILE` key as normal mode. In normal mode its
  preview Docker argument arrays, child environment, artifact validation,
  start/status/readiness/stop order, results, and errors remain byte-for-byte
  equivalent to current behavior.
- **WRK-002**: The compiler worker accepts only the exact value
  `factory.local-preview-profile/v1:acceptance`. Every other present value,
  including empty, whitespace-padded, case-mutated, alternate-version, or
  comma-separated values, fails closed before any preview Docker command.
- **WRK-003**: In accepted-signal mode, the worker first applies its existing
  manifest path, size, digest, regular-file, and no-symlink verification to the
  registered `docker-compose.yml` artifact. It then validates the verified
  generated Compose bytes semantically enough to prove that the exact profile
  name `acceptance` is registered on both generated `kitchen` and `cashier`
  services. Missing, duplicated, ambiguous, aliased, or differently cased
  registration fails before Docker. ADR-0033 does not authorize a generated
  template edit; the registered profile is the accepted ADR-0032 dependency.
- **WRK-004**: After successful signal and artifact validation, every Docker
  Compose command needed by that preview lifecycle includes the adjacent
  argument-array pair `--profile`, `acceptance` immediately after `compose`.
  This applies to start `up`, status discovery `port` for `web` and `api`,
  readiness `exec`, failed-start cleanup `down`, and explicit stop `down`, so
  start, observation, and cleanup address one identical service model.
- **WRK-005**: The worker does not forward
  `FACTORY_LOCAL_PREVIEW_PROFILE` into the generated Compose child environment
  or generated containers. Profile selection is expressed only by the fixed
  Docker CLI arguments. The existing bounded Docker lookup-variable allowlist,
  Factory project/port values, and Restaurant demo-token rules remain the
  complete child-environment authority.
- **WRK-006**: The existing exact `factory-preview-${previewRunId}` identity,
  contained `.preview-runs/${previewRunId}` directory, registered artifact
  checks, timeouts, loopback port validation, and idempotent exact-project
  teardown remain mandatory. Profile activation grants no command, path,
  project-name, service-name, or environment selection to a request or queue
  producer.

## Decision

- **DEC-001 — Experiment**: Use the fixed, versioned, acceptance-only
  environment signal and explicit Docker Compose profile arguments as the
  narrow prerequisite for implementing ADR-0032 ROL-001.
- **DEC-002 — Preserve public contracts**: Keep the Control Plane preview-start
  body strictly empty and keep its response, authenticated queue dispatch,
  preview request, Graph, schema, database, and immutable lifecycle contracts
  unchanged.
- **DEC-003 — Preserve normal preview**: Absence of the signal is the sole
  normal mode and must preserve current worker behavior byte-for-byte. Never
  make acceptance services default.
- **DEC-004 — Fail closed**: Reject unknown signal values and an absent or
  malformed registered acceptance profile before preview Docker execution.
- **DEC-005 — Serialized integration**: Treat the runner override, worker
  interpretation, generated ADR-0032 profile dependency, and end-to-end smoke
  path as one serialized integration boundary. No parallel implementation wave
  is authorized by this proposal.
- **DEC-006 — No shared topology edit**: Do not modify
  `infra/docker-compose.yml`, a generated template, a public contract, a
  package manifest, or `pnpm-lock.yaml` under ADR-0033.

## Alternatives considered

### Add a profile field to the Control Plane request or queue message

- **ALT-001**: Let the preview-start caller send `acceptance` through the HTTP
  body and authenticated queue dispatch.
- **ALT-002**: **Rejected.** This changes a strict empty-body API and a shared
  cross-process contract, exposes an operator-controlled runtime selector at an
  unneeded boundary, and is larger than the local acceptance problem.

### Make generated kitchen and cashier services default

- **ALT-003**: Remove their Compose profile or start them in all previews.
- **ALT-004**: **Rejected.** This changes normal preview behavior and resource
  use, contradicting accepted ADR-0032 ROL-001.

### Add the signal to tracked shared infrastructure Compose

- **ALT-005**: Add an interpolated profile environment field directly to
  `infra/docker-compose.yml`.
- **ALT-006**: **Rejected.** This changes shared tracked topology, permits
  ambient operator environment to influence every worker, and makes the
  acceptance-only boundary less explicit and less reversible.

### Forward `COMPOSE_PROFILES=acceptance`

- **ALT-007**: Pass Docker Compose's generic environment selector to child
  Docker commands.
- **ALT-008**: **Rejected.** A generic multi-profile environment value is
  ambient and easier to leak or combine. The fixed argument pair is observable
  in unit tests, does not enter generated containers, and cannot select another
  profile.

### Keep the current worker and rely on generated unit verification

- **ALT-009**: Do not activate the generated acceptance profile in the live
  preview.
- **ALT-010**: **Rejected.** The accepted U4 outcome requires live
  customer-to-kitchen fulfilment; generated unit verification is not the live
  product journey.

### Let the outer runner invoke generated Compose directly

- **ALT-011**: Bypass the worker for acceptance preview startup and cleanup.
- **ALT-012**: **Rejected.** This duplicates authenticated preview lifecycle,
  immutable artifact validation, containment, project identity, readiness, and
  teardown ownership instead of composing the existing adapter.

## API, data, adapter, catalog, license, supply-chain, security, and operability effects

- **API-001**: No public route, request/response, authentication actor, error
  shape, queue message, event, Graph serialization, verification serialization,
  or compatibility version changes. The preview-start body remains exactly
  empty; unknown fields remain rejected.
- **DAT-001**: No Prisma schema, migration, persistent row, seed, retention
  rule, durable conversion, Graph byte, Published digest, Compilation byte, or
  generated identifier changes. The signal and override are ephemeral.
- **ADP-001**: One internal local adapter contract is added between the trusted
  acceptance runner and compiler-worker process environment. Existing editor,
  AI, Git, provider, database, generated-runtime, and deployment adapters are
  unchanged.
- **ADP-002**: Docker Compose receives a fixed profile through argument arrays.
  The accepted generated profile remains an ADR-0032 responsibility; ADR-0033
  only activates and validates it.
- **CAT-001**: No capability catalog, UI registry, recipe registry, Graph
  coordinate, stable `@factory/*` name, `factory.application-graph/*` value,
  provenance record, or source-study entry changes.
- **LIC-001**: No package, image, copied source, template source, or external
  service is introduced. Existing license notices remain unchanged.
- **SUP-001**: `package.json`, workspace manifests, `pnpm-lock.yaml`, Docker
  image tags, GitHub actions, and external source authorities remain
  byte-unchanged. No dependency install or supply-chain input is authorized.
- **SEC-001**: The browser, HTTP caller, queue producer, Graph, and generated
  app cannot select the profile. Exact match, no compatibility guessing, and
  verified registered artifacts preserve deny-by-default behavior.
- **SEC-002**: The private override is exclusively created, contained,
  non-symlinked, digest-checked, run-owned, and deleted. It contains no secret,
  and logs never print environment material or rendered configuration.
- **SEC-003**: All published generated ports remain loopback-only. The local
  worker's Docker-socket access remains the explicit residual risk owned by
  Platform/Tech Lead in `docs/threat-model.md`; this experiment gives it no
  production, remote, cloud, or deployment safety claim.
- **SEC-004**: Exact-project cleanup and profile-consistent preview `down` avoid
  broad resource enumeration or deletion. An invalid post-`up` override is
  never consumed: cleanup recovers through the ADR-0032 exact lease and the
  already validated exact outer project name. A cleanup or containment failure
  fails acceptance and is not hidden by later zero-looking evidence.
- **OPS-001**: The acceptance preview starts the ADR-0032 kitchen and cashier
  processes and therefore uses more local CPU and memory. Normal previews incur
  no new service or argument.
- **OPS-002**: One temporary directory and override file exist only for the
  outer acceptance run. Their creation, verification, and deletion become
  acceptance stages with bounded safe evidence.
- **OPS-003**: A version mismatch, missing generated profile, Docker failure,
  or incomplete cleanup stops acceptance with a nonzero result. There is no
  fallback to normal preview because that would create false acceptance.
- **OPS-004**: Cleanup-only recovery is not an acceptance fallback. Successful
  recovery can establish zero resources after an integrity incident, but the
  run remains permanently failed and cannot emit passing acceptance evidence.

## Compatibility and contract-freeze decision

- **CMP-001**: Public API and data compatibility is exact preservation. Existing
  clients continue sending an empty preview-start body, and existing workers
  without the proposed environment key remain in normal mode.
- **CMP-002**: No frontend/backend contract is opened. The existing versioned
  API/data artifacts stay `frozen/unchanged`; their contract owner remains the
  Control Plane lifecycle owner.
- **CMP-003**: Platform/Tech Lead owns the proposed
  `FACTORY_LOCAL_PREVIEW_PROFILE=factory.local-preview-profile/v1:acceptance`
  adapter contract. It is not frozen while this ADR is Proposed. If the ADR is
  accepted and PM records the exact decision, this document is sufficiently
  precise to freeze the single mapping, absence semantics, errors, and
  compatibility rule for one serialized implementation owner.
- **CMP-004**: It is not frozen for disjoint parallel tasks. The override,
  worker start/status/stop commands, generated-profile dependency, and E2E
  cleanup are integration work. Generated templates, shared API/data
  contracts, tracked Compose topology, and the end-to-end smoke path remain
  serialized even after acceptance.

## Migration, rollback, abort conditions, and irreversible steps

- **MIG-001**: After founder or qualifying standing acceptance and PM ledger
  authorization, one serialized integration owner first records focused RED
  tests for runner ownership/cleanup and worker absent/exact/unknown signal
  behavior.
- **MIG-002**: Add the runner-owned combined temporary override and prove
  exact `FACTORY_E2E_ISOLATED=1` gating, inherited-value rejection, fixed signal
  injection, containment, no-symlink handling, digest integrity, and the
  cleanup-only recovery sequence for every post-`up` integrity failure.
- **MIG-003**: Add worker exact-match interpretation and registered profile
  validation, then add `--profile acceptance` to all acceptance-mode
  start/status/readiness/failed-start-cleanup/stop argument arrays. Preserve
  exact normal-mode snapshots.
- **MIG-004**: Run the focused worker and runner suites, then the accepted
  ADR-0032 serialized integration and real local acceptance. PM records only
  safe hashes, command results, profile-selection result, and resource counts.
- **MIG-005**: Prospective implementation expansion is limited to
  `scripts/local-product-acceptance.mjs`,
  `scripts/local-product-acceptance.test.mjs`,
  `apps/compiler-worker/src/preview-runner.ts`, and
  `apps/compiler-worker/test/preview-runner.test.ts`. Only PM may update this
  ADR, the active ledger, and `docs/project-status.md`. No other path is
  authorized by ADR-0033.
- **ROLB-001**: Before rollback, abort, or revert, stop only the exact leased
  `factory-preview-*` project and exact outer `factory-local-*` project. If the
  original override is abnormal, use RUN-005 cleanup without it, or the newly
  reconstructed RUN-006 recovery file only when required; then prove preview
  and outer directories, containers, networks, and volumes are all zero.
- **ROLB-002**: Rollback is a normal non-force revert of only the accepted
  ADR-0033 implementation commits. Remove the runner override/signal and worker
  recognition together; absence then returns the prior normal preview behavior.
  No data conversion or package rollback is required.
- **ABT-001**: Abort if implementation requires a public API or queue field,
  Graph/schema/database change, generated identifier change, package or
  lockfile change, new image, tracked `infra/docker-compose.yml` edit,
  generated-template edit under this ADR, or any path beyond MIG-005.
- **ABT-002**: Abort if a caller, request, Graph, queue payload, inherited
  environment, or generated application can choose the profile, or if any
  unknown value does not fail before preview Docker execution.
- **ABT-003**: Abort if absent-signal normal mode changes any command argument,
  child-environment key, result, error, cleanup order, or generated service.
- **ABT-004**: Abort if the verified generated artifact does not register exact
  `acceptance` profiles for both role services, or if acceptance would silently
  fall back to normal preview.
- **ABT-005**: Permanently fail the acceptance run if the override cannot be
  proven contained, regular, non-symlinked, digest-identical, credential-free,
  and exactly removed. Do not abort cleanup: execute RUN-005 and, only if
  required, RUN-006. Abort delivery if any interruption or integrity incident
  leaves a preview or outer resource.
- **ABT-006**: Abort for any non-loopback bind, secret/raw-model logging,
  authorization weakening, broad prefix cleanup, external resource, provider
  call, paid action, cloud operation, deployment, destructive action, or
  irreversible step.
- **IRR-001**: No irreversible repository, data, infrastructure, publication,
  or deployment step exists or is authorized. Immutable historical Published
  revisions and Compilations remain untouched.

## Ownership and delivery boundaries

- **OWN-001**: The Tech Lead owns only this proposed technical contract and
  stops here. The Tech Lead does not approve this ADR or implement it.
- **OWN-002**: PM owns founder/standing-acceptance recording, exact base commit,
  path manifest, sequencing, ledger/status updates, and implementation
  authorization. PM must record that the prior engineer stopped with zero
  modifications before assigning a new writer.
- **OWN-003**: If accepted, one integration owner owns all four implementation
  paths in MIG-005. There is no frontend/backend split and no parallel writer;
  changes to a shared contract or path expansion stop the task and return it to
  PM and Tech Lead.
- **OWN-004**: QA owns reproducible real success, negative, interruption, and
  cleanup evidence. A separate reviewer owns ADR standing-acceptance review;
  separate task and release reviewers own implementation/release judgment. The
  controller alone owns commits, pushes, PRs, `main` integration, and release
  actions under `docs/delivery-policy.md`.
- **OWN-005**: The existing ADR-0032 generated-template and E2E work remains
  serialized integration work under its own accepted scope. ADR-0033 grants no
  new template or E2E write authority and does not reopen any product choice.

## Measurable verification plan and ledger evidence

- **VER-001**: Validate this proposal with
  `pnpm exec prettier --check docs/adr/adr-0033-local-acceptance-preview-profile-activation.md`
  and `git diff --check --
docs/adr/adr-0033-local-acceptance-preview-profile-activation.md`.
- **VER-002**: Runner RED/GREEN runs `node --test
scripts/local-product-acceptance.test.mjs`. It must prove exact isolated-only
  fixed injection; inherited absent/exact/unknown values cannot alter the fixed
  result; one combined override is used for `config` and `up`; and normal
  `down` reuses it only after fresh integrity verification. The tracked Compose
  file is never a write target. Pre-`up` traversal, symlink, non-regular file,
  digest mutation, or creation failure must stop before Docker.
- **VER-003**: The same runner suite mutates bytes, replaces the file with a
  symlink, and deletes the override separately after successful `up`; it also
  injects SIGINT and SIGTERM in each post-`up` condition. Every case must remain
  failed, prove the abnormal override was never passed to Docker, stop the
  exact ADR-0032 leased preview first, perform exact-project outer `down` with
  trusted tracked `infra/docker-compose.yml` or a newly reconstructed and
  verified recovery override, remove both temporary roots, and report preview
  plus outer directories, containers, networks, and volumes all zero.
- **VER-004**: Runner command-failure, cleanup-failure, and temporary-removal
  cases prove cleanup occurs exactly once, no broad prefix cleanup is invoked,
  no other run is touched, and captured output contains no environment dump or
  sensitive material. A mocked zero count is insufficient.
- **VER-005**: Worker RED/GREEN runs `pnpm --filter
@factory/compiler-worker test -- preview-runner`. Exact test vectors are
  absent, the accepted value, empty, leading/trailing whitespace, case mutation,
  `v0`, `v2`, and comma-separated values. Only absence preserves existing exact
  command/environment snapshots. Every unknown present value produces zero
  Docker calls.
- **VER-006**: The same worker suite supplies registered-artifact fixtures for
  exact `acceptance`, missing profile, wrong case, duplicate/ambiguous profile,
  profile on only one role, unregistered Compose, wrong digest/size, and
  symlinked Compose. Accepted mode must emit `--profile`, `acceptance` on `up`,
  both `port` calls, readiness `exec`, failed-start `down`, and explicit-stop
  `down`; every invalid fixture emits zero preview Docker calls.
- **VER-007**: The worker regression command `pnpm --filter
@factory/compiler-worker test -- preview-runner queued-preview-run
preview-dispatch-client` must preserve exact preview identities, queue/API
  shapes, timeout/cancellation errors, loopback ports, and stop behavior.
- **VER-008**: `pnpm accept:local` on the supported Node `22.11.0`,
  `pnpm@9.0.0`, and Docker Compose `>=2.24.4` stack must prove exactly one
  selected profile named `acceptance`, the accepted ADR-0032 live
  customer-to-kitchen journey, observation-only manager/cashier state, exact
  per-step `passed` evidence, accessibility gates, and zero preview directories,
  containers, networks, and volumes plus zero outer resources after normal
  completion.
- **VER-009**: A real provider-free adversarial run interrupts before worker
  start, during generated Compose startup, after readiness, and during outer
  teardown. Post-`up` variants separately mutate, replace with a symlink, and
  delete the override before SIGINT and SIGTERM. Each run must end nonzero where
  interrupted or corrupted, prove no abnormal override was consumed, and prove
  the exact temporary override and recovery root are gone and all preview plus
  outer directory/container/network/volume counts are zero. Mocked cleanup
  counts are insufficient.
- **VER-010**: Fresh repository gates run `pnpm format:check`, `pnpm
typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm
verify:third-party`, and `pnpm verify:source-studies`. `git diff --exit-code
-- infra/docker-compose.yml package.json pnpm-lock.yaml` and the PM-recorded
  implementation path manifest must prove no shared Compose, manifest,
  lockfile, or out-of-scope drift.
- **VER-011**: Before standing acceptance, the independent ADR reviewer records
  identity, ADR hash, P0/P1 `0/0`, bounded/reversible `yes`, unresolved
  ambiguity/material choice `no`, and exactly
  `APPROVED_FOR_STANDING_ACCEPTANCE: yes`. Any other result stops the task.
- **VER-012**: PM records the accepted/rejected decision, reviewer evidence,
  prior engineer zero-modification handoff, exact base and implementation commit
  hashes, allowed-path manifest, RED/GREEN command results, normal-mode snapshot
  equality, signal/profile proof, real interruption results, and all zero
  cleanup counts in
  `docs/superpowers/ledgers/2026-08-31-post-v0.1-local-restaurant-readiness.md`.
  The active ledger remains the sole live task-state authority.

## Consequences

### Positive

- **POS-001**: Accepted ADR-0032 can activate its local role services without
  changing the public API, queue, shared tracked Compose, or normal previews.
- **POS-002**: Exact-match versioning and registered-artifact validation make
  the acceptance mode explicit, testable, and fail closed.
- **POS-003**: One private, run-owned override keeps acceptance configuration
  reversible and gives cleanup an exact filesystem object to prove absent.

### Negative

- **NEG-001**: The acceptance runner and worker gain a tightly coupled internal
  adapter contract that must be changed together.
- **NEG-002**: Additional containment, digest, negative-vector, and real
  interruption checks increase implementation and acceptance time.
- **NEG-003**: Acceptance consumes additional local CPU and memory while the
  kitchen and cashier services are active; the local Docker socket remains a
  privileged residual risk.

## References

- **REF-001**: `AGENTS.md`
- **REF-002**: `docs/tech-governance.md`
- **REF-003**: `docs/threat-model.md`
- **REF-004**: `docs/delivery-policy.md`
- **REF-005**:
  `docs/adr/adr-0032-local-acceptance-role-surfaces-and-preview-lease.md`
- **REF-006**:
  `docs/superpowers/ledgers/2026-08-31-post-v0.1-local-restaurant-readiness.md`
- **REF-007**: `infra/docker-compose.yml`
- **REF-008**: `scripts/local-product-acceptance.mjs`
- **REF-009**: `scripts/local-product-acceptance.test.mjs`
- **REF-010**: `apps/compiler-worker/src/preview-runner.ts`
- **REF-011**: `apps/compiler-worker/test/preview-runner.test.ts`
