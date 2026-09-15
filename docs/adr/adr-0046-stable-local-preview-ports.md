---
title: "ADR-0046: Stable Local Preview Ports"
status: "Proposed"
date: "2026-09-09"
authors: "Tech Lead"
tags: ["architecture", "decision", "compiler-worker", "operability", "security"]
supersedes: ""
superseded_by: ""
---

# ADR-0046: Stable Local Preview Ports

## Status

**Proposed** | Accepted | Rejected | Superseded | Deprecated

This is a Tech Lead proposal only. It is not founder acceptance,
implementation authority, passing acceptance evidence, a Product Publish,
repository release, cloud action, or deployment decision. The founder must
accept or reject it directly or through the exact standing independent-review
policy in `docs/tech-governance.md`; PM then records that decision and may
assign implementation work.

## Recommendation

**Keep** the current accepted Golden technology profile and correct one bounded
local-preview operability defect inside it: choose distinct concrete loopback
host ports for the public `web` and `api` services before initial Compose
startup, retain those bindings in the created containers, and reject startup
unless Docker reports the exact chosen ports.

This recommendation does not propose a new Golden profile. The proposed
port-reservation contract is an internal, local-only operability delta that
uses the current Node runtime, Docker Compose topology, generated artifacts,
and preview lifecycle unchanged.

## Context and Reproduced Failure

- **CTX-001**: The active D1.10 O10 scenario requires a completed local order
  and merchant fulfilment to remain usable after a supported runtime restart.
  It does not grant hosted, remote, or production restart authority.
- **CTX-002**: At repository base
  `1c525c5e70d995c8d9c672631b80cc6c81ec5413`,
  `apps/compiler-worker/src/preview-runner.ts` sets both
  `FACTORY_WEB_PORT` and `FACTORY_API_PORT` to the string `"0"` before
  `docker compose up`. The registered generated Compose artifacts already
  interpolate those variables into loopback-only host bindings.
- **CTX-003**: A provider-free D1.10 run reused the same immutable Compilation.
  Its original generated web binding was `32804`; restarting the same
  container changed it to `32805`, while the persisted preview URL continued
  to point to the original port.
- **CTX-004**: The focused provider-free
  `e2e/restaurant-preview-restart.spec.ts` reproduced the defect in `28.0`
  seconds: both `sameCustomerUrl` and `sameManagerUrl` were false after the
  restart.
- **CTX-005**: A separate provider-free probe found the completed order and its
  exact USD price at the newly allocated port after restart. The demonstrated
  failure is stale local address identity, not demonstrated data loss.
- **CTX-006**: Existing port discovery accepts only
  `127.0.0.1:<decimal-port>`, readiness executes inside the generated `web`
  container, startup failure performs exact-project Compose cleanup, explicit
  stop uses the exact derived project and copied Compose file, and cancellation
  is bound to the exact active PreviewRun start.
- **CTX-007**: Accepted ADR-0032 keeps generated role services loopback-only
  and uses a runner-owned exact preview lease. Accepted ADR-0033 keeps
  acceptance-profile activation private and serialized. Accepted ADR-0035
  gives the local acceptance supervisor a pre-owned exact PreviewRun identity
  and exact cleanup authority. This proposal preserves those contracts.

## Current Accepted Golden Technology Profile

The current accepted Golden profile remains independently authoritative and is
not amended by this proposal.

- **CUR-001**: Node is supported at `>=22.11.0 <23`; the root package manager
  declaration is exactly `pnpm@9.0.0`. Tracked application Dockerfiles remain
  on the floating-major `node:22-alpine` tag.
- **CUR-002**: Root TypeScript remains `^5.7.2`, resolved exactly as `5.9.3` in
  `pnpm-lock.yaml`.
- **CUR-003**: Workbench remains Next.js `^15.1.0` / `15.5.22`, React and React
  DOM `^19.0.0` / `19.2.8`, Puck `^0.22.3` / `0.22.3`, and XYFlow
  `^12.3.6` / `12.11.2`.
- **CUR-004**: Control Plane remains NestJS Common/Core/Platform Express
  `^10.4.15` / `10.4.22`, Prisma Client and CLI `^6.1.0` / `6.19.3`, and
  BullMQ `^5.34.10` / `5.81.2`. Compiler worker remains BullMQ `^5.34.10` /
  `5.81.2` and ioredis `^5.4.2` / `5.11.1`.
- **CUR-005**: PostgreSQL remains on floating-major `postgres:16-alpine`, Redis
  remains on floating-major `redis:7-alpine`, and Docker Compose remains the
  isolated local topology adapter. Local acceptance retains its accepted
  Compose minimum `>=2.24.4`.
- **CUR-006**: Mutable Draft -> immutable Published Revision -> immutable
  Compilation remains unchanged. Compilers consume only digest-verified
  immutable Published Graphs.
- **CUR-007**: `factory.application-graph/v1` remains the currently implemented
  serialized Golden Graph contract. Existing accepted Restaurant V3,
  PreviewRun, internal preview-intent, queue, and generated-bundle identifiers
  remain unchanged.
- **CUR-008**: Manifests express supported ranges, `pnpm-lock.yaml` records
  exact package resolutions, and tracked Dockerfiles and Compose files remain
  the executable version and topology authorities.

## Proposed Local Operability Contract

There is no proposed replacement Golden profile. The following contract is
outside the Golden version table and consumes the current profile unchanged.

### Port reservation and release

- **PRT-001**: Add an internal compiler-worker reservation module implemented
  only with the Node 22 built-in `node:net`; introduce no package, image,
  provider, service, daemon, proxy, or external resource.
- **PRT-002**: After the active-start duplicate guard succeeds and after the
  immutable registered artifacts have been verified and materialized, bind two
  separate TCP servers to host `127.0.0.1`, port `0`, with exclusive ownership.
  The first reservation remains listening while the second is acquired, so the
  selected ports are necessarily distinct.
- **PRT-003**: Accept only two distinct safe integers in the inclusive range
  `1..65535`. A bind error, duplicate value, invalid value, listener error, or
  partial acquisition closes every acquired listener and fails the PreviewRun
  before any preview Docker command.
- **PRT-004**: Reservations are process-memory transport state only. They never
  enter the request, queue message, Graph, database, artifact directory,
  generated source, IPC, log, screenshot, or PM evidence.
- **PRT-005**: Hold both listeners until immediately before the existing
  `docker compose up --build --detach --wait` operation. Close both listeners,
  await both close completions, confirm the active-start signal is not aborted,
  and only then invoke Compose with the chosen decimal ports.
- **PRT-006**: Cancellation while either reservation is being acquired or held
  closes every listener and settles the active start through the existing
  cancellation path. A close failure or uncertain listener state fails closed
  and starts no Compose operation.

### Compose environment and discovery

- **CMP-001**: For initial preview startup, replace only the current
  `FACTORY_WEB_PORT="0"` and `FACTORY_API_PORT="0"` environment values with
  the chosen decimal web and API ports. Preserve the exact environment/token
  allowlist, the exact Compose project and directory, profile arguments, and
  all other command arguments.
- **CMP-002**: Do not edit a generated `docker-compose.yml`. Existing generated
  placeholders already consume these variables and retain the exact
  `127.0.0.1` bind address.
- **CMP-003**: After Compose reports success, run the existing `docker compose
port web 3000` and `port api 3001` discovery commands. Each output must pass
  the existing loopback parser and equal the corresponding chosen port exactly.
  A mismatch is `preview_port_discovery_failed`; no preview URL is returned.
- **CMP-004**: Return the unchanged `StartedPreview` shape. `webPort`,
  `apiPort`, and `previewUrl` contain the verified chosen values; the URL remains
  `http://127.0.0.1:<webPort>`.
- **CMP-005**: Failed-start cleanup reuses the same chosen-port environment for
  the existing exact-project `down --volumes --remove-orphans`. Explicit stop
  after a settled start retains its current exact-project behavior and requires
  no live reservation or persisted port record.
- **CMP-006**: The post-release interval before Docker binds is an unavoidable
  local time-of-check/time-of-use race. If another local process wins either
  port, Compose startup or exact discovery must fail; existing exact-project
  teardown and cleanup-complete semantics apply. The worker never retries with
  a new port inside the same start and never returns a replacement URL.

### Exact scope

- **SCP-001**: The new guarantee covers the selected public `web` and `api`
  host ports for the same created containers in one PreviewRun and exact Compose
  project. A supported same-container restart must retain both original URLs.
- **SCP-002**: The guarantee does not cover Compose `down` followed by
  recreation, a new PreviewRun, another Compilation, Docker daemon or host
  restart, power loss, resource pruning, container replacement, or manual
  Docker mutation.
- **SCP-003**: Acceptance-only `kitchen` and `cashier` ports retain their
  existing behavior. They are not public result URLs and are not made stable by
  this proposal.
- **SCP-004**: Hosted access, remote clients, domains, non-loopback binding,
  multi-user operation, production restart guarantees, and disaster recovery
  remain outside scope.

## Decision

- **DEC-001 — Keep**: Keep the current Golden profile and implement
  PRT-001..006, CMP-001..006, and SCP-001..004 as one bounded correction to the
  existing local preview adapter.
- **DEC-002 — Preserve contracts**: Do not change public or internal HTTP
  request/response serialization, queue messages, PreviewRun persistence,
  Graph/data schemas, immutable artifacts, compiler targets, generated
  templates, catalog coordinates, or Compose topology.
- **DEC-003 — Preserve security boundaries**: Continue exact loopback binding,
  environment/token allowlisting, immutable artifact verification, exact
  project ownership, cancellation, timeout, teardown, and secret-safe evidence.
- **DEC-004 — Fail closed**: Any reservation, release, Compose bind, discovery
  equality, cancellation, or cleanup uncertainty produces no ready result and
  no replacement address.
- **DEC-005 — Serialize integration**: Port allocation, preview startup,
  discovery, cleanup, and the provider-free restart acceptance are one
  serialized integration boundary. This proposal authorizes no parallel
  frontend/backend wave.

## API, Data, Adapter, Catalog, Supply-Chain, Security, and Operability Effects

- **API-001**: Public and internal HTTP routes, bodies, headers, response
  envelopes, errors, actors, authentication, and authorization remain
  unchanged. `StartedPreview` retains its existing TypeScript shape.
- **DAT-001**: No Prisma schema, migration, database row, Graph byte, Published
  hash, Compilation byte, generated state schema, serialization identifier,
  conversion, backfill, or compatibility shim changes.
- **ADP-001**: The compiler-worker local preview adapter changes only its
  transport allocation before Compose startup. `PreviewOperationOptions`
  remains unchanged; allocation is not exposed as a caller-selected function
  or value.
- **ADP-002**: A dedicated internal reservation module is the test seam.
  `preview-runner` tests may mock that module with fixed valid ports; the module
  itself receives focused real-socket tests for exclusive loopback binding,
  distinctness, cancellation, partial failure, and release.
- **CAT-001**: Capability, profile, recipe, compiler-target, UI registry,
  package, runtime, and source-study catalogs have zero impact. Stable
  `@factory/*` and `factory.application-graph/*` identifiers are unchanged.
- **SUP-001**: No dependency, license notice, lockfile entry, Docker image,
  copied source, network download, or external supply-chain input is added.
  `node:net` is part of the accepted Node runtime.
- **SEC-001**: The selected ports are loopback-only and untrusted local
  processes may still contend for them after release. Reservation reduces
  accidental conflicts but is not an authentication, authorization, or
  hostile-local-user boundary.
- **SEC-002**: A caller, browser, Graph, provider result, queue payload, or
  generated application cannot select the ports. No port value is logged or
  persisted as evidence beyond the existing typed preview result consumed by
  the trusted lifecycle path.
- **SEC-003**: Docker-socket access remains privileged local infrastructure and
  retains the residual-risk ownership in `docs/threat-model.md`. This decision
  makes no production-safety claim.
- **OPS-001**: Same-container restart retains the fixed host mappings already
  stored in the created container configuration, so persisted preview URLs do
  not become stale for the bounded scenario.
- **OPS-002**: Startup briefly holds two local listener sockets and gains a
  small fail-closed race window between release and Docker bind. There is no
  retry, background owner, long-lived reservation, or new cleanup target.

## Compatibility and Contract Freeze

- **CON-001**: The compiler-worker preview owner owns this internal operability
  contract. The Control Plane lifecycle owner remains the owner of existing
  PreviewRun HTTP, persistence, and queue contracts, all of which are consumed
  unchanged.
- **CON-002**: Existing versioned API and data artifacts are frozen and remain
  byte-compatible. No new versioned API/data contract artifact is required
  because there is no frontend/backend request, response, event, actor, or
  persistent-data change.
- **CON-003**: The proposal is precise enough for one serialized compiler-worker
  implementation owner after acceptance and PM assignment. It is not frozen
  enough for disjoint parallel writers because reservation release, Compose
  startup, discovery, cancellation, cleanup, and acceptance share one lifecycle.
- **CON-004**: Generated templates, shared Graph/API contracts, Compose
  topology, migrations, and end-to-end smoke tests remain serialized
  integration work. A required change to any of them stops implementation and
  returns the decision to PM and Tech Lead.

## Alternatives Considered

### Keep ephemeral port zero

- **ALT-001**: Continue asking Docker to allocate web/API host ports from `0`
  and rediscover only during initial startup.
- **ALT-002**: **Rejected.** The provider-free D1.10 reproduction proves that a
  same-container restart can change both published ports while the stored URLs
  remain stale.

### Rediscover and rewrite the URL after restart

- **ALT-003**: Detect every restart, discover the new ports, and update the
  PreviewRun result or its consumers.
- **ALT-004**: **Rejected.** This changes persisted lifecycle/API behavior,
  creates a browser synchronization problem, and still breaks bookmarks or
  already displayed local addresses.

### Let callers choose ports or persist a port lease

- **ALT-005**: Add requested ports to HTTP/queue contracts or store a durable
  host-port lease in the database.
- **ALT-006**: **Rejected.** Caller-selected runtime transport widens an
  unneeded trust boundary, and durable allocation adds schema, reconciliation,
  and stale-lease behavior for process-local resources.

### Add a stable local proxy or change Compose topology

- **ALT-007**: Route every generated preview through a fixed gateway, proxy, or
  new Compose service.
- **ALT-008**: **Rejected.** It adds topology, service lifecycle, routing, and
  cleanup surface far beyond the two existing interpolated bindings.

### Reserve kitchen and cashier ports too

- **ALT-009**: Allocate stable ports for every acceptance-profile role service.
- **ALT-010**: **Rejected.** D1.10 exposes only customer and manager URLs, and
  no evidence shows role-service port churn affects the supported result. This
  would silently broaden the contract and test surface.

## Consequences

### Positive

- **POS-001**: The same local customer and manager addresses remain valid after
  the bounded same-container restart without changing artifacts or persistence.
- **POS-002**: Exact discovery equality prevents a ready result from reporting
  an address different from the one requested from Compose.
- **POS-003**: Node built-ins keep package, license, lockfile, and provider
  impact at zero.
- **POS-004**: Allocation and cleanup remain inside the existing exact
  PreviewRun lifecycle and preserve loopback-only exposure.

### Negative

- **NEG-001**: Reservation release cannot atomically transfer a socket from
  Node to Docker. A competing local process can win the released port and make
  startup fail.
- **NEG-002**: The compiler worker gains socket-lifecycle code and focused
  failure/cancellation cases.
- **NEG-003**: A port stays stable only for the lifetime and same-container
  restart behavior of the created PreviewRun; broader restart and recovery
  guarantees remain unimplemented.

## Migration, Rollback, Abort Conditions, and Irreversible Steps

- **MIG-001**: After founder or qualifying standing acceptance and PM-recorded
  authorization, one serialized runtime owner first records focused failing
  tests for nonzero distinct chosen ports, release-before-up ordering, exact
  discovery equality, cancellation, contention, and cleanup.
- **MIG-002**: Implement only
  `apps/compiler-worker/src/preview-port-reservation.ts`,
  `apps/compiler-worker/src/preview-runner.ts`,
  `apps/compiler-worker/test/preview-port-reservation.test.ts`, and
  `apps/compiler-worker/test/preview-runner.test.ts`.
- **MIG-003**: Root/QA owns provider-free acceptance in
  `e2e/restaurant-preview-restart.spec.ts` and the active ledger. The runtime
  writer does not own that E2E or any PM/Git path. E2E execution remains after
  focused implementation review and cannot run in parallel with a changing
  preview lifecycle.
- **ROL-001**: Roll back through a normal non-force revert of only the accepted
  implementation commit after stopping the exact active PreviewRun and proving
  its directory, containers, network, and volumes absent. Reverting restores
  the prior `"0"` allocation behavior; no data rollback or artifact migration
  exists.
- **ABT-001**: Abort on any required package, manifest, lockfile, Dockerfile,
  generated-template, tracked Compose, Graph/API/data, schema, queue, catalog,
  provider, credential, cloud, deployment, Product Publish, or release change.
- **ABT-002**: Abort if ports must be caller-selected, persisted, exposed
  beyond the existing preview result, bound outside `127.0.0.1`, retried by
  changing the address after a partial start, or reserved by a daemon/service.
- **ABT-003**: Abort if cancellation or any partial allocation can leave a
  listener, or if a post-release bind/discovery failure can return ready or
  evade exact-project cleanup.
- **ABT-004**: Abort if implementation changes kitchen/cashier allocation,
  claims container recreation/host/daemon/hosted restart support, or weakens
  accepted lease, timeout, token, cleanup, or evidence controls.
- **IRR-001**: No irreversible repository, data, infrastructure, publication,
  provider, or deployment step exists or is authorized.

## Measurable Verification Plan and Ledger Evidence

- **VER-001**: Validate this proposal with
  `pnpm exec prettier --check docs/adr/adr-0046-stable-local-preview-ports.md`
  and a whitespace-error check limited to that ADR. Record its exact SHA-256
  before standing review.
- **VER-002**: Reservation RED/GREEN runs
  `pnpm --filter @factory/compiler-worker test -- preview-port-reservation`.
  Prove two simultaneous listeners are on exact IPv4 loopback, ports are valid
  and distinct, both are unavailable to a competing bind while held, both are
  bindable after release, and cancellation/first-or-second-bind/listener/close
  failure releases every acquired listener with no unhandled event.
- **VER-003**: Runner RED/GREEN runs
  `pnpm --filter @factory/compiler-worker test -- preview-runner`. With the
  internal reservation module mocked, assert allocation occurs after duplicate
  rejection and verified materialization; reservations remain held until the
  point immediately before `up`; `up`, both `port` calls, readiness, and
  failed-start `down` receive the same nonzero distinct decimal web/API values.
- **VER-004**: The runner suite separately proves web mismatch, API mismatch,
  invalid/non-loopback discovery, port-contention Compose failure, allocation
  failure, release failure, and cancellation while acquiring and while held.
  Every case returns the existing bounded failure family, returns no URL,
  performs zero Docker calls when release is uncertain, and otherwise performs
  the existing exact-project cleanup with accurate `cleanupComplete` state.
- **VER-005**: Run the focused compiler-worker regression
  `pnpm --filter @factory/compiler-worker test -- preview-runner
queued-preview-run preview-dispatch-client` and its typecheck. Existing
  PreviewRun identities, API/queue shapes, profile arguments, token/host
  environment allowlist, timeout/cancellation semantics, readiness, explicit
  stop, and cleanup tests must remain green. `PreviewOperationOptions` must be
  unchanged.
- **VER-006**: Run the provider-free
  `e2e/restaurant-preview-restart.spec.ts` once against the reviewed runtime
  implementation and the same immutable Compilation. It must record the exact
  customer and manager URLs before restart, restart each same container, prove
  both URLs are byte-identical and reachable afterward, and prove the completed
  order, exact price, and merchant/customer status remain visible at those same
  URLs with zero retries and no provider call.
- **VER-007**: The same real run must prove exact PreviewRun stop and zero
  preview directories, containers, networks, volumes, and listeners afterward.
  A bind-race injection must fail nonzero, emit no ready URL, clean only the
  exact project, and leave an unrelated loopback listener and unrelated Compose
  sentinel untouched.
- **VER-008**: Run the accepted provider-free product regression and repository
  format, typecheck, lint, test, build, third-party, and source-study gates.
  Frozen-path checks must prove no manifest, lockfile, Dockerfile, generated
  template, tracked Compose, Graph/API/data, catalog, migration, or E2E writer
  drift outside the PM-authorized manifests.
- **VER-009**: PM records the founder or exact standing-review decision,
  reviewer identity and verdict, ADR SHA-256, base and implementation commit
  hashes, owned paths, focused command results/counts/durations, real before/
  after URL equality, retained order/price/status result, zero provider calls,
  race outcome, and exact cleanup counts in
  `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`.

## Ownership and Authority

- **OWN-001**: The Tech Lead owns only this proposed decision and stops here.
  The Tech Lead neither accepts the ADR nor edits production or test code.
- **OWN-002**: The compiler-worker preview owner is the implementation contract
  owner. Root/QA owns the serialized provider-free restart acceptance. PM owns
  decision recording, exact path manifests, assignment, sequencing, and live
  ledger state.
- **OWN-003**: A separate qualified read-only reviewer must evaluate the exact
  proposal under the standing authorization. Any P0/P1 finding, ambiguity,
  scope expansion, security weakening, or verdict other than exactly
  `APPROVED_FOR_STANDING_ACCEPTANCE: yes` stops implementation.
- **OWN-004**: The controller alone owns commits, pushes, integration, and
  release actions under `docs/delivery-policy.md`. This proposal grants none of
  those actions and grants no paid call, provider call, cloud resource, Product
  Publish, repository release, or deployment authority.

## References

- **REF-001**: `AGENTS.md`
- **REF-002**: `docs/tech-governance.md`
- **REF-003**: `docs/threat-model.md`
- **REF-004**:
  `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`
- **REF-005**: `docs/adr/adr-0024-post-v0.1-local-operability-profile.md`
- **REF-006**:
  `docs/adr/adr-0032-local-acceptance-role-surfaces-and-preview-lease.md`
- **REF-007**:
  `docs/adr/adr-0033-local-acceptance-preview-profile-activation.md`
- **REF-008**:
  `docs/adr/adr-0034-local-acceptance-interruption-cleanup-owner.md`
- **REF-009**:
  `docs/adr/adr-0035-local-acceptance-preview-intent-identity.md`
- **REF-010**: `docs/adr/adr-0038-consumer-generation-orchestration.md`
- **REF-011**: `apps/compiler-worker/src/preview-runner.ts`
- **REF-012**: `apps/compiler-worker/test/preview-runner.test.ts`
- **REF-013**: `e2e/restaurant-preview-restart.spec.ts`
