---
title: "ADR-0034: Local Acceptance Interruption Cleanup Owner"
status: "Rejected"
date: "2026-09-02"
authors: "Archeform Tech Lead"
tags:
  [
    "architecture",
    "docker-compose",
    "security",
    "operability",
    "acceptance",
    "process-lifecycle",
  ]
supersedes: ""
superseded_by: ""
amends_if_accepted: ""
---

# ADR-0034: Local Acceptance Interruption Cleanup Owner

## Status and founder gate

Proposed | Accepted | **Rejected** | Superseded | Deprecated

Recommendation: **reject** the supervisor-only local cleanup-owner experiment
for U4. It closes terminal/process-group survival but cannot, under the frozen
preview API/queue contract, guarantee exact cleanup when the sole preview-start
POST never yields an actual response before identity creation.

This document is a Tech Lead proposal, not approval. The current accepted
Golden profile and accepted ADR-0032/ADR-0033 contracts remain authoritative.
Rejected by PM on 2026-09-02 under the founder's standing independent-review
authorization in `docs/tech-governance.md`. Separate qualified read-only
reviewer `/root/review_adr0034_interrupt_owner` first reported P0/P1/P2
`0/5/2`, then confirmed the revised reject/no-implementation decision at
`0/0/0`, bounded and reversible `yes`, material ambiguity `no`, and exactly
`APPROVED_FOR_STANDING_ACCEPTANCE: yes`. The reviewed proposed ADR SHA-256 is
`001642d5c8d0954afc93ad211a411a4dc230a20d0c4fa0e90d7baf461f4ae163`.

This rejection authorizes no implementation. U4 remains blocked on a separate
shared-contract ADR that can make the preview identity knowable before the
preview-start side effect and preserve bounded exact cleanup.

## Context and reproduced interruption gap

- **CTX-001**: Accepted ADR-0032 makes the local acceptance runner the owner of
  the exact `factory.local-preview-lease/v1` preview and requires preview
  cleanup before teardown of the exact outer `factory-local-*` Compose project.
- **CTX-002**: Accepted ADR-0033 requires cleanup to survive an acceptance
  override that is mutated, replaced by a symlink, or deleted after outer
  Compose startup. An abnormal override must never be passed back to Docker;
  cleanup must use the trusted tracked Compose file or an exclusively recreated
  recovery override, and the acceptance result remains failed.
- **CTX-003**: `scripts/local-product-acceptance.mjs` currently installs
  `SIGINT` and `SIGTERM` handlers in the Node process beneath pnpm. Its
  `finally` block owns preview stop, outer `down --volumes --remove-orphans`,
  exact resource queries, temporary-root deletion, and the final report.
- **CTX-004**: The current handler works only while that Node process remains
  alive. It does not own the terminal or pnpm process lifetime. A parent shell
  or pnpm process may exit, close pipes, or terminate its descendant process
  tree before the Node `finally` block completes.
- **CTX-005**: Independent U4 task review exercised a real terminal Ctrl+C
  against the actual `pnpm accept:local` process tree. The pnpm-attached runner
  exited before completing its cleanup and left the exact outer
  `factory-local-*` Compose project. Injected handler tests did not reproduce
  this process-topology failure and therefore were insufficient evidence.
- **CTX-006**: The defect is an operability and local Docker-resource boundary
  issue. It does not justify a public API field, Graph/schema change, tracked
  Compose topology change, generated-template change, dependency, daemon,
  service, cloud resource, or release decision.

## Current accepted Golden technology profile

The following is the current accepted profile. It remains distinct from the
proposed supervisor experiment and is not replaced by this ADR.

- **CUR-001**: The runtime remains Node `>=22.11.0 <23`; the supported local
  selection is Node `22.11.0`; the three tracked application Dockerfiles use
  the floating-major image `node:22-alpine`. The package manager declaration is
  exactly `pnpm@9.0.0`.
- **CUR-002**: `pnpm-lock.yaml` format `9.0` remains the exact dependency
  resolution authority. Root TypeScript remains `^5.7.2` with lockfile
  resolution `5.9.3`.
- **CUR-003**: The Workbench remains Next `^15.1.0` / `15.5.22`, React and
  React DOM `^19.0.0` / `19.2.8`, Puck `^0.22.3` / `0.22.3`, and XYFlow
  `^12.3.6` / `12.11.2`.
- **CUR-004**: The Control Plane remains NestJS `^10.4.15` / `10.4.22`, Prisma
  `^6.1.0` / `6.19.3`, and BullMQ `^5.34.10` / `5.81.2`. The compiler worker
  remains BullMQ `^5.34.10` / `5.81.2` and ioredis `^5.4.2` / `5.11.1`.
- **CUR-005**: PostgreSQL remains `postgres:16-alpine`, Redis remains
  `redis:7-alpine`, and generated applications remain `node:22-alpine`. These
  are floating-major image constraints, not exact patch or digest pins.
- **CUR-006**: Docker Compose remains the accepted isolated local topology
  adapter. Local acceptance requires Compose `>=2.24.4`; the latest accepted U3
  evidence used Compose `5.3.1`. `infra/docker-compose.yml` remains the tracked
  outer topology authority and is not changed by this proposal.
- **CUR-007**: Draft -> immutable Published Revision -> immutable Compilation
  remains unchanged. `factory.application-graph/v1` remains the implemented
  base Golden contract, while the accepted Restaurant slice consumes the
  existing exact `factory.application-graph/v3`,
  `factory.restaurant-product-plan/v1`, and
  `factory.restaurant-product-bundle/v1` contracts.
- **CUR-008**: Accepted ADR-0032's internal
  `factory.local-preview-lease/v1` and accepted ADR-0033's exact
  `FACTORY_LOCAL_PREVIEW_PROFILE=factory.local-preview-profile/v1:acceptance`
  adapter remain accepted bounded experiment contracts. This proposal neither
  renames nor widens either contract.
- **CUR-009**: `package.json`, workspace manifests, `pnpm-lock.yaml`, tracked
  Dockerfiles, `infra/docker-compose.yml`, and the executable Golden table in
  `docs/tech-governance.md` remain the version authorities.

## Rejected candidate profile and successor constraints

The candidate below is local-only and remains outside the accepted Golden
profile. Its precise controls document what was evaluated and what a successor
must preserve, but this rejected ADR authorizes none of them for implementation.

### Exact internal identifier and roles

- **SUP-001**: Introduce the exact internal identifier
  `factory.local-acceptance-cleanup-owner/v1`. It names only the private process
  lifecycle between the existing `pnpm accept:local` entry process and a
  detached cleanup-owner supervisor in the same
  `scripts/local-product-acceptance.mjs` module.
- **SUP-002**: The pnpm-attached entry process becomes a thin client. It may
  start the supervisor, relay allowlisted safe progress, receive one bounded
  terminal summary, request cancellation by closing its private control
  channel, and return the supervisor's result. It may not invoke Docker,
  allocate a preview, own cleanup, or accept a project/path/profile from an
  operator.
- **SUP-003**: The supervisor is the sole owner of run input generation,
  preflight, exact outer Compose startup, Playwright execution, preview start,
  all cleanup, exact resource proof, and temporary-root removal. No second
  process may claim or perform cleanup after the supervisor is ready.
- **SUP-004**: The supervisor is launched with the current `process.execPath`,
  the canonical real path of `scripts/local-product-acceptance.mjs`, one exact
  internal-mode/version argument, `shell: false`, hidden/no terminal standard
  streams, one private Node IPC control channel, and no caller-provided Docker
  identity. An unknown argument, missing IPC channel, extra identity argument,
  or version mismatch fails before any Docker mutation.
- **SUP-005**: The supervisor creates the random exact `factory-local-*`
  project name, loopback ports, secrets, private temporary root, exact override
  bytes, and digests itself. The client cannot send or replace any of these
  values. Existing environment scrubbing and fixed acceptance-profile
  injection remain mandatory.

### Atomic acceptance-operation lease

- **OPL-001**: Introduce the internal non-secret serialization identifier
  `factory.local-acceptance-operation-lease/v1`. Before sending `ready`, the
  supervisor must atomically acquire one lease for the canonical worktree. The
  lease prevents concurrent `pnpm accept:local` operations; it is not a
  preview/outer cleanup lease and must never contain or select a Docker project,
  Compilation, preview, port, path, command, credential, or environment value.
- **OPL-002**: The fixed lease parent is
  `join(os.tmpdir(), "factory-local-acceptance-operation-v1")`. Its child name
  is the full lowercase SHA-256 hex digest of the canonical, realpath-resolved,
  case-normalized worktree root. Acquisition is one non-recursive
  `mkdir(child, { mode: 0o700 })`; exactly one supervisor wins the atomic
  create. The parent and child must be real directories, not symlinks, and the
  child must resolve directly beneath the fixed parent.
- **OPL-003**: The winner exclusively creates `owner.json` with `flag: "wx"`
  and POSIX mode `0o600`. Its exact JSON object has only these sorted fields:
  `apiVersion: "factory.local-acceptance-operation-lease/v1"`,
  `createdAtUnixMs` as a safe integer, `ownerNonce` matching
  `^[a-f0-9]{64}$`, `ownerPid` as the positive supervisor PID, and
  `workspaceDigest` equal to the directory-name digest. It ends in one newline.
  The supervisor caches the exact bytes and SHA-256 digest and rejects later
  mutation, extra keys, replacement, non-regular type, or symlink state.
- **OPL-004**: On POSIX, the fixed parent/child must have no group/other mode
  bits and `owner.json` must have no group/other permission bits; owner UID must
  equal the current effective UID. On Windows, Node creates the non-secret
  objects with the current-user TEMP directory's inherited DACL and requests
  `0o700`/`0o600`; implementation must not widen or replace that DACL. Because
  Node 22 exposes no portable DACL verifier, the lease grants only exclusion
  and never grants cleanup identity or access to a secret.
- **OPL-005**: A valid live owner is determined only from exact validated
  `owner.json` plus an OS PID liveness probe. `ESRCH`/Windows no-such-process is
  dead; success, access denied, or an indeterminate result is treated as live.
  A live lease makes the second invocation exit nonzero before supervisor ACK,
  port reservation, secret generation, child launch, or Docker invocation. It
  cannot cancel, signal, wait out, or assist the first owner.
- **OPL-006**: A well-formed lease whose owner PID is dead is stale. Reclamation
  is an atomic rename of the exact lease child to an unpredictable sibling
  tombstone containing the expected `ownerNonce`; only one contender can win.
  The winner revalidates the same cached bytes/digest, dead PID, direct-parent
  containment, directory identity, and an entry set of exactly `owner.json`
  before no-follow removal. It then retries atomic acquisition once. A
  malformed, symlinked, mutated, indeterminate-owner, unexpected-entry, or
  concurrently changed lease fails closed and requires operator inspection.
- **OPL-007**: If acquisition crashed after directory creation but before a
  valid `owner.json`, the incomplete directory is reclaimable only when its
  lstat modification time is at least `15_000` ms old, it remains the same
  identity-verified direct child, and it is empty. No age alone makes a valid
  owner record stale, and no recursive or prefix deletion is permitted.
- **OPL-008**: The supervisor releases the operation lease only after it has
  reached terminal proof: no cleanup command remains active, exact preview and
  outer resource proofs are zero when their may-exist states were reached, the
  global guard passed, and the exact private root is absent. Product/test
  failure with successful cleanup may release; cleanup/proof uncertainty must
  retain the lease. Release revalidates the original bytes/digest, owner PID and
  nonce, direct-child directory identity, and exact one-file entry set, then
  removes `owner.json` and its now-empty directory without following links.
- **OPL-009**: A supervisor crash leaves the operation lease. A later invocation
  may reclaim a well-formed dead-owner lease under OPL-006, but that lease gives
  it no prior Docker identity and authorizes no cleanup. The existing
  `verify-no-preview-resources.mjs` guard detects preview resources only; it
  does not detect abandoned outer projects.
- **OPL-010**: Any future accepted repair must add a detection-only preflight in
  `scripts/local-product-acceptance.mjs` that counts Docker
  container/network/volume project labels matching exact
  `^factory-local-[a-z0-9-]+$` and fails on any match without deleting or
  reporting names. It composes the existing preview guard. After stale lease
  reclamation, both guards run before new ports, secrets, or Compose mutation.
  Detection grants no cleanup identity; prior exact cleanup recovery still
  requires a separate accepted contract.

### Reciprocal client/supervisor handshake

- **IPC-001**: The only pre-mutation IPC version is
  `factory.local-acceptance-supervisor-ipc/v1`. The supervisor's exact ready
  message is an object with only sorted fields `apiVersion`, `nonce`, and
  `type`, where `apiVersion` is that exact identifier, `nonce` matches
  `^[a-f0-9]{64}$`, and `type` is exactly `ready`.
- **IPC-002**: The client validates object type, exact three-key set, exact
  version/type, and nonce syntax before replying. Its exact acknowledgement has
  the same only-three-key shape and same nonce, with `type` exactly `ack`.
  The supervisor validates it reciprocally. A string, array, duplicate/extra
  key, missing key, wrong type, wrong nonce, alternate version/case, second
  message, or any other inbound message permanently fails the run.
- **IPC-003**: The supervisor installs disconnect/signal handlers, acquires and
  validates OPL-001, sends one ready message, and waits for one valid ACK. Port
  reservation, secret generation, child launch, HTTP request, and every Docker
  operation are forbidden before ACK validation. Ready or ACK timeout releases
  a still-valid unused operation lease, emits no passing result, and exits
  nonzero with zero Docker mutations.
- **IPC-004**: After ACK, the client sends no commands or identity. Cancellation
  is represented only by IPC disconnect. The terminal supervisor message has
  only sorted fields `apiVersion`, `exitCode`, `nonce`, `summary`, and `type`;
  the version/nonce are unchanged, `type` is `result`, `exitCode` is exactly
  `0` or `1`, and `summary` is the existing validated bounded
  `factory.local-acceptance-summary/v1`. The client rejects every other message
  and never reconstructs a result from partial progress.

### Cross-platform process and signal behavior

- **PRC-001**: On POSIX, the client starts the supervisor with Node's detached
  process option so the supervisor becomes leader of a new session and process
  group. The client immediately releases its ordinary child reference while
  retaining only the private IPC liveness channel. `SIGINT`, `SIGTERM`, SIGHUP,
  or terminal closure delivered to the original pnpm foreground process group
  must not terminate the supervisor.
- **PRC-002**: On Windows, the client starts the supervisor with Node's detached
  process option and `windowsHide: true`, which places it outside the original
  console control group and gives it no visible console. Ctrl+C or Ctrl+Break
  delivered to the actual pnpm console/process group must not terminate the
  supervisor.
- **PRC-003**: The supervisor installs IPC `disconnect` and internal
  `SIGINT`/`SIGTERM` handlers before sending IPC-001 ready. If the client is
  already absent, disconnects, or closes the channel, the supervisor
  permanently marks the run interrupted, aborts new product work, and enters
  the one cleanup transaction when a may-exist state has been reached.
- **PRC-004**: Before the reciprocal IPC-002 ACK is validated, the supervisor
  may perform only non-mutating initialization and acquire OPL-001. If Ctrl+C
  wins the spawn/ready/ACK race, either no supervisor exists or the supervisor
  observes a closed channel, releases an unused valid operation lease, and
  exits with zero product/Docker mutations.
- **PRC-005**: Child commands started by the supervisor use argument arrays and
  no shell except the already required Windows `cmd.exe` pnpm invocation. Each
  active child process group on POSIX or process tree on Windows is terminated
  through the existing bounded platform-specific mechanism before resource
  cleanup begins. The original terminal never becomes the cleanup authority.
- **PRC-006**: Once cleanup begins, later disconnects or signals cannot abort
  it. Cleanup commands are non-interactive, bounded, idempotent, and not wired
  to the product-work abort signal. The supervisor exits only after cleanup
  proof succeeds or every bounded exact-target recovery attempt has failed.
- **PRC-007**: This experiment does not claim recovery from `SIGKILL`, Windows
  `TerminateProcess`/`taskkill /T` directed at the detached supervisor, Docker
  daemon loss, kernel/host crash, power loss, or a local administrator tampering
  with the supervisor process. Those events remain residual local-operability
  risks; the next-run guard must detect leftovers and delivery remains blocked.

### Exact deadlines, retry bounds, and escalation

All values below are mandatory wall-clock maxima measured with a monotonic
clock. A shorter underlying accepted timeout remains shorter; no implementation
may extend a row through retries or by restarting its clock.

| ID      | Operation                                                                | Exact maximum / schedule                                                                                                   |
| ------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| DDL-001 | Operation-lease acquisition or one stale-reclaim cycle                   | `5_000` ms total; one reclaim and one reacquire attempt                                                                    |
| DDL-002 | Client spawn to one valid supervisor ready message                       | `5_000` ms                                                                                                                 |
| DDL-003 | Supervisor ready send to one valid client ACK                            | `5_000` ms                                                                                                                 |
| DDL-004 | Doctor child                                                             | `30_000` ms                                                                                                                |
| DDL-005 | Each pre-guard, post-guard, or safe version child                        | `30_000` ms per child                                                                                                      |
| DDL-006 | Outer Compose `config` child                                             | `30_000` ms                                                                                                                |
| DDL-007 | Outer Compose `up --wait` child                                          | `630_000` ms total, retaining Compose's `600` second wait timeout                                                          |
| DDL-008 | Host-readiness loop                                                      | `120_000` ms total; each HTTP attempt `2_000` ms; retry delay `250` ms                                                     |
| DDL-009 | Playwright child                                                         | `900_000` ms                                                                                                               |
| DDL-010 | Compilation/current-preview/stop HTTP call other than preview-start      | `10_000` ms per call                                                                                                       |
| DDL-011 | Sole preview-start producer POST                                         | `300_000` ms; no retry and no client-side interruption may be called quiescence                                            |
| DDL-012 | Post-producer final preview reconciliation                               | `300_000` ms total; retry delays `100`, `200`, `400`, `800`, then `1_000` ms capped until deadline                         |
| DDL-013 | Exact preview-stop convergence                                           | `120_000` ms total; status retry delay `100` ms                                                                            |
| DDL-014 | Each exact Docker container exec or container/network/volume proof query | `30_000` ms per child                                                                                                      |
| DDL-015 | Each exact outer Compose `down`                                          | `180_000` ms; at most two attempts in one cleanup transaction, base-only then recovery override, with one `500` ms backoff |
| DDL-016 | POSIX child-group termination                                            | `1_000` ms after `SIGTERM`, then `1_000` ms after `SIGKILL`                                                                |
| DDL-017 | Windows `taskkill.exe /pid <pid> /T /F` child                            | `10_000` ms; one invocation per active child tree                                                                          |
| DDL-018 | Exact temporary-entry/root deletion                                      | `10_000` ms total                                                                                                          |
| DDL-019 | One timing-harness stage hold                                            | `10_000` ms hard maximum                                                                                                   |
| DDL-020 | Product-work budget after valid ACK                                      | `2_700_000` ms; expiry permanently fails work and starts cleanup                                                           |
| DDL-021 | Reserved cleanup/proof budget after product-work cutoff                  | `900_000` ms                                                                                                               |
| DDL-022 | Total supervisor lifetime after valid ACK                                | `3_600_000` ms hard maximum                                                                                                |
| DDL-023 | Client wait for terminal result after valid ACK                          | `3_605_000` ms, allowing at most `5_000` ms for final IPC delivery                                                         |

- **TMO-001**: Every child spawn is paired with its row deadline. Expiry marks
  the run nonzero, terminates and reaps the exact child group/tree under
  DDL-016 or DDL-017, and enters the single cleanup transaction. A timeout
  cannot be reported as skipped or passed.
- **TMO-002**: Product work cannot consume the cleanup reserve. At DDL-020 the
  supervisor stops new work and starts cleanup. At DDL-022 it terminates any
  exact active child, emits/safely records a nonzero timeout category if
  possible, retains the operation lease unless terminal zero/absence proof is
  already complete, and exits. It never extends itself into a daemon.
- **TMO-003**: Preview-start and producer-quiescence failure follow QSC-007;
  they are not converted into outer teardown with an unknown preview identity.
  Such a run is nonzero and blocks delivery, and any required shared-contract
  repair returns to PM/Tech Lead for a new proposal.
- **TMO-004**: Cleanup retries remain one transaction and one exact target.
  Exhausting a retry or proof deadline retains the operation lease, reports
  nonzero, and blocks acceptance. It never falls back to prefix deletion,
  unbounded polling, or another cleanup owner.

### Monotonic lifecycle and uncertain-side-effect handling

- **LIF-001**: The supervisor uses one forward-only in-memory lifecycle:
  `initializing -> ready -> outer-may-exist -> preview-intent ->
preview-may-exist -> cleaning -> proving -> terminal`. No state transition
  may move backward, and terminal state is single assignment.
- **LIF-002**: Immediately before invoking outer `docker compose up`, the
  supervisor records `outer-may-exist` with the exact in-memory
  `factory-local-*` name. Once recorded, every exit path runs exact outer
  cleanup even when `up` returns an error, is interrupted, or has an unknown
  outcome.
- **LIF-003**: After validating the exact immutable succeeded Compilation but
  immediately before dispatching the preview-start POST, the supervisor records
  `preview-intent` with that exact Compilation ID. No preview-start side effect
  is possible before this record exists.
- **LIF-004**: Immediately before dispatching the POST, the state advances to
  `preview-may-exist`. If interruption races the POST, the supervisor stops
  Playwright/new work but keeps the outer Control Plane and compiler worker
  alive. It does not treat client-side abort, socket closure, timeout, or a
  locally settled wrapper as producer quiescence. It follows the exact QSC
  contract before any outer teardown.
- **LIF-005**: A valid start response or exact current-preview response must
  match the intent Compilation, `^preview-[a-z0-9-]+$`, and
  `composeProjectName === factory-preview-${previewRunId}`. The supervisor
  converts it to the existing exact `factory.local-preview-lease/v1`, caches it
  in memory once, and never replaces it with a conflicting identity.
- **LIF-006**: Cleanup order is fixed: prevent new work; terminate and reap the
  exact active child process group/tree; reconcile and stop the exact preview;
  prove its directory, containers, networks, and volumes are zero; stop the
  exact outer project; prove its containers, networks, and volumes are zero;
  run the existing global detection guard; safely remove exact run-owned
  temporary files/root; send a bounded result when the client still exists;
  exit.
- **LIF-007**: Interruption before `outer-may-exist` performs no Docker cleanup.
  Interruption from `outer-may-exist` through `preview-intent` performs only
  exact outer cleanup. Interruption at or after `preview-may-exist` performs
  exact preview reconciliation/cleanup before exact outer cleanup, but only
  after stable producer quiescence. If quiescence is unprovable, QSC-007 stops
  the proposed path rather than guessing that outer teardown is safe.
- **LIF-008**: The complete required interruption matrix is: client spawn before
  supervisor ready; after ready before outer `up`; during outer `up`; after
  outer `up` before Playwright; before preview intent; after intent before POST;
  during POST/enqueue; after response before lease publication; during
  generated Compose startup; after generated readiness; during Playwright;
  during preview stop; between preview and outer cleanup; during outer `down`;
  and after `down` before proof/root deletion. The proposed supervisor converges
  through one cleanup transaction only when QSC producer quiescence is proven;
  the unquiesced `during-preview-post` case is the blocking counterexample that
  causes this ADR's `reject` recommendation.

### Preview producer quiescence and final reconciliation

- **QSC-001**: The supervisor has exactly one preview-start producer and may
  dispatch at most one POST. It records `preview-may-exist` before dispatch and
  permanently closes the producer before cleanup. No timeout, retry, signal,
  recovery path, IPC input, or harness gate may dispatch another start POST.
- **QSC-002**: When no POST was dispatched, the producer is quiescent by
  construction. After dispatch, quiescence requires receipt and validation of
  an actual HTTP response from the existing local Control Plane request within
  DDL-011. A client abort, network/socket error, locally rejected promise, or
  elapsed deadline does not prove that the server stopped before identity
  creation and therefore is not quiescence.
- **QSC-003**: The current frozen implementation creates the durable PreviewRun
  identity before queue enqueue, awaits enqueue, and only then returns its HTTP
  response. Implementation may rely on that existing ordering only after
  read-only source/test evidence confirms it is unchanged. This ADR does not
  authorize an API, queue, database, lifecycle, or Control Plane edit to create
  a stronger cancellation or idempotency contract.
- **QSC-004**: Once QSC-002 is proven, the producer is irreversibly closed and
  the supervisor performs DDL-012 final reconciliation against the exact
  intent Compilation. A returned PreviewRun must satisfy LIF-005. If no row is
  returned, absence is stable only after three successful exact-current GETs,
  each returning no row and separated by `1_000` ms. Errors do not count toward
  the three observations.
- **QSC-005**: If reconciliation returns an exact identity, the supervisor
  caches the one lease, invokes exact stop, awaits terminal `stopped`, and
  proves exact preview directory/container/network/volume absence. It then
  performs one final exact-current GET immediately before outer `down`; the
  response must identify only the same cached PreviewRun in `stopped` state.
  A different/new identity, nonterminal state, error, or conflict blocks outer
  teardown and fails the run.
- **QSC-006**: If QSC-004 proves stable no-row absence, the supervisor performs
  one additional successful exact-current no-row GET immediately before outer
  `down`. Only that final reconciliation permits exact outer teardown. Thus a
  POST delayed before identity creation is either allowed to complete and then
  reconciled, or is treated as unquiesced; it cannot race behind a one-time
  empty query.
- **QSC-007**: If the actual response never arrives, quiescence cannot be
  proven, final reconciliation cannot be trusted, or current server ordering
  differs from QSC-003, the supervisor must not claim safe preview cleanup or
  silently tear down the outer producer. It marks the run nonzero, retains the
  operation lease, emits only a safe bounded escalation, and exits at DDL-022.
  The known exact outer project may remain, so this result fails U4's zero-
  resource requirement and is not bounded/reversible standing-acceptance
  evidence. This is why the supervisor-only profile is rejected.
- **QSC-008**: Satisfying U4 requires a separately proposed and accepted shared
  producer contract that makes the identity/fence recoverable before the POST
  can have an uncertain side effect—for example, a server-issued reservation,
  an idempotency/operation identity, or a cancellation-and-drain fence. This ADR
  does not choose among those alternatives. Any request field, caller-selected
  preview identity, endpoint, queue field, database/schema state, or Control
  Plane/worker change requires PM to dispatch a new Tech Lead ADR and name the
  shared-contract owner before implementation.

### Trusted state, integrity, and exact cleanup

- **TRU-001**: Cleanup authority is the supervisor's in-memory state, created
  before the relevant side effect. A filesystem path, JSON file, environment
  value, stdout line, browser value, Graph, request body, queue producer, or
  Docker listing may not select an outer or preview project.
- **TRU-002**: The exact outer name must match
  `^factory-local-[a-z0-9-]+$` and is generated by the supervisor's existing
  cryptographic random source. Outer cleanup always supplies that exact name to
  `docker compose -p` by argument array and never enumerates a prefix for
  deletion.
- **TRU-003**: Preview cleanup uses only the single cached exact
  `factory.local-preview-lease/v1`. Before the lease exists, recovery may use
  only the cached exact Compilation intent against the run-owned Control Plane
  current-preview endpoint, then validate the returned identity as LIF-005.
  Prefix sweeps and deletion of any other preview are forbidden.
- **TRU-004**: The accepted lease file remains an integrity/evidence handshake,
  not the supervisor's sole recovery memory. If it is mutated, replaced by a
  symlink, made non-regular, duplicated, conflicting, or deleted, the run
  remains failed; cleanup uses the earlier cached exact lease or the exact
  intent reconciliation path and never follows or trusts the abnormal object.
- **TRU-005**: The supervisor retains the exact generated override bytes,
  SHA-256 digest, original canonical root/path, root lstat `dev`/`ino` identity,
  and trusted tracked Compose path in memory. It verifies unchanged root
  realpath/identity, containment, regular-file type, no symlink, and digest
  before every normal use. Mutation, symlink replacement, non-regular
  replacement, containment failure, move, or deletion permanently fails the
  run.
- **TRU-006**: An abnormal override is never supplied to Docker. Exact outer
  cleanup first uses only the trusted tracked `infra/docker-compose.yml`, exact
  project name, and `down --volumes --remove-orphans` as accepted by ADR-0033
  RUN-005. If a demonstrated Compose constraint requires the override, the
  supervisor recreates its frozen in-memory bytes with exclusive creation in a
  new private root, validates its digest/type/containment, uses it only for the
  same exact-project cleanup, and removes it.
- **TRU-007**: Preview stop first composes the accepted authenticated local stop
  boundary while outer dependencies are alive. It waits boundedly for the exact
  run to become stopped, verifies the exact preview directory is absent, and
  queries Docker for zero resources labeled with only the exact preview project.
  A retry may repeat this idempotent exact operation but may not change target.
- **TRU-008**: Exact outer proof queries containers, networks, and volumes by
  `com.docker.compose.project=<exact factory-local project>`. Preview proof uses
  the exact leased `factory-preview-*` value. Resource discovery may support
  proof, but never broad deletion. Nonzero or unverifiable counts fail cleanup.
- **TRU-009**: Temporary deletion uses lstat/no-follow semantics and is allowed
  only while the private root's realpath and cached `dev`/`ino` identity remain
  unchanged. Normal direct-entry names are exactly `compose.override.yml`,
  `preview.request`, and `preview.lease.json`; the timing harness may additionally
  rename the two integrity targets only to exact sibling names
  `compose.override.moved` and `preview.lease.moved`. Each present direct entry
  is lstat-checked and unlinked by its exact name; a symlink is unlinked as a
  link and never traversed. No nested directory, unexpected entry name, or
  entry outside the unchanged root is removed.
- **TRU-010**: A moved integrity target is never searched for. A move to one of
  the two frozen same-root harness sibling names remains inside the unchanged
  identity-verified root and may be removed as an exact no-follow entry after
  the run is permanently failed. A move anywhere else is outside cleanup
  ownership, blocks root removal/terminal proof, retains the operation lease,
  and aborts delivery. An already deleted exact object is absent but still
  records a failing integrity incident.
- **TRU-011**: One internal cleanup promise is created at most once and shared
  by normal completion, child failure, timeout, IPC disconnect, SIGINT, and
  SIGTERM. There is no winner/loser claim file: the detached supervisor is the
  only cleanup claimant, so a claimant cannot die and strand ownership in
  another process.

### Evidence and sensitive-data boundary

- **EVD-001**: The supervisor has no terminal stdin and writes no child output
  directly to detached stdout/stderr. It keeps the existing bounded capture and
  sends the client only allowlisted stage names, exit status, exact safe project
  identifiers, version values, digests, accessibility counts, and zero/nonzero
  resource counts.
- **EVD-002**: Logs, IPC, evidence, tests, and reports must not include an
  environment dump, Compose rendered environment, token, credential, raw
  prompt/response, request body, tenant data, user data, or unbounded child
  stdout/stderr. Unknown errors collapse to a fixed safe failure category.
- **EVD-003**: If the client has already disconnected, cleanup proceeds without
  a report consumer. The supervisor must not persist a secret-bearing log or
  keep the private run root merely to preserve diagnostics. Real QA observes
  process exit and exact Docker/filesystem zero state externally.

### Frozen timing-only interruption harness protocol

- **HAR-001**: The only timing protocol is
  `factory.local-acceptance-interruption-harness/v1`. Ordinary mode requires
  `FACTORY_LOCAL_ACCEPTANCE_TIMING_GATE` to be genuinely absent. If present,
  its only accepted form is that identifier, one literal colon, and exactly one
  stage from HAR-002. Empty, whitespace/case mutation, duplicate/comma value,
  alternate version, or unknown stage fails before ready and before Docker.
- **HAR-002**: The complete stage allowlist is `before-ready`, `after-ack`,
  `before-outer-up`, `during-outer-up`, `after-outer-up`,
  `before-preview-intent`, `after-preview-intent`, `during-preview-post`,
  `after-preview-response`, `during-preview-startup`, `after-preview-ready`,
  `during-playwright`, `during-preview-reconcile`, `during-preview-stop`,
  `after-preview-proof`, `during-outer-down`, `after-outer-down`,
  `during-outer-proof`, `during-global-guard`, and `before-root-removal`.
- **HAR-003**: The protocol is timing-only. Its input contains only the one
  allowlisted stage; it accepts no PID, project, preview, Compilation, target,
  path, filename, command, argument, duration, signal, environment value,
  secret, or mutation payload. It cannot choose or alter cleanup behavior.
- **HAR-004**: At the selected stage the supervisor emits one bounded safe
  marker with only exact fields `apiVersion`, `stage`, and `type: "gate"`, then
  holds that transition for at most DDL-019. Disconnect/signal releases the
  hold directly into normal interruption handling. Expiry without interruption
  permanently fails the evidence run and enters cleanup; it never resumes to a
  passing product result.
- **HAR-005**: Presence of the exact protocol permanently marks the invocation
  evidence-only and nonzero even if all resources are removed. It is never
  forwarded to Docker, Playwright, the browser, outer containers, Control
  Plane, queue, generated project, or persisted product state. The supported
  ordinary `pnpm accept:local` success path is absence only.

## Decision

- **DEC-001 — Reject**: Do not implement the supervisor-only profile for U4.
  Although detached single ownership addresses the reproduced terminal failure,
  it cannot guarantee exact zero resources when the preview POST is delayed
  before identity creation and never produces an actual response.
- **DEC-002 — Preserve Golden profile**: Keep all accepted runtime, framework,
  package, image, database, queue, Graph, API, schema, identifier, generated
  template, and tracked Compose versions unchanged.
- **DEC-003 — Preserve accepted local contracts**: Do not smuggle a producer
  reservation, idempotency key, cancellation fence, API/queue field, or durable
  identity into ADR-0032/ADR-0033 implementation. Those accepted contracts
  remain unchanged until a separate decision is accepted.
- **DEC-004 — Freeze successor constraints**: Any successor proposal must keep
  the single cleanup owner, OPL exclusion semantics, reciprocal pre-mutation
  handshake, exact deadlines, stable producer quiescence, exact no-follow
  cleanup, sensitive-data boundary, and native platform evidence specified
  here, or explicitly replace them with stronger reviewed controls.
- **DEC-005 — Require separate governance**: PM must dispatch a new Tech Lead
  decision with a named Control Plane/preview-lifecycle contract owner before
  implementation. The successor decides the versioned producer identity/fence
  and whether its API/data contract is frozen enough; integration remains
  serialized regardless.
- **DEC-006 — No implementation or release authority**: Founder acceptance of
  this ADR records rejection and leaves U4 blocked. It authorizes no product or
  test implementation, `main` integration, repository release, Product
  Publish, provider call, paid resource, cloud action, deployment, credential
  exposure, or R0 resumption.

## Alternatives considered

### Keep the current in-process signal handlers

- **ALT-001**: Continue to let the Node runner under pnpm catch `SIGINT` and
  execute cleanup in its own `finally` block.
- **ALT-002**: **Rejected.** Real Ctrl+C evidence shows the owning process may
  exit before `finally`; more mocked handler coverage cannot establish survival
  of the actual parent/terminal process topology.

### Add shell-specific traps around the same runner

- **ALT-003**: Wrap the command in Bash and PowerShell/cmd cleanup scripts.
- **ALT-004**: **Rejected.** This creates divergent quoting, signal, process,
  and cleanup implementations, keeps identity handoff outside the single
  trusted owner, and makes the package command platform dependent.

### Run a permanent daemon, service, or cleanup container

- **ALT-005**: Install an OS service, long-lived daemon, scheduled task, or
  privileged Compose sidecar that sweeps abandoned resources.
- **ALT-006**: **Rejected.** It expands persistence, privilege, installation,
  topology, and operability scope for one local acceptance command and would
  require separate lifecycle and security decisions.

### Add a process-management dependency

- **ALT-007**: Add `tree-kill`, `node-pty`, a daemon library, or another package
  to manage terminal/process behavior.
- **ALT-008**: **Rejected.** Node's built-in detached process, IPC, signal, and
  child-process APIs are sufficient for the process-survival mechanics; a
  dependency would add license and supply-chain impact without solving producer
  quiescence or removing the need for real platform verification.

### Let runner and supervisor race for a cleanup claim

- **ALT-009**: Keep cleanup in both processes and use an exclusive claim file
  or timeout lease to choose a winner.
- **ALT-010**: **Rejected.** The winner can die after claiming, timeout takeover
  creates false concurrency, and two Docker owners complicate exact-once
  reasoning. One surviving supervisor is the only cleanup owner.

### Sweep all Factory-prefixed resources after interruption

- **ALT-011**: Enumerate and remove every `factory-local-*` or
  `factory-preview-*` project and matching temporary directory.
- **ALT-012**: **Rejected.** Prefix cleanup can destroy concurrent or
  pre-existing runs. The threat model and accepted ADRs require exact validated
  ownership.

### Migrate the Golden profile to supervised execution

- **ALT-013**: Make a supervisor or daemon part of every Archeform runtime and
  preview lifecycle.
- **ALT-014**: **Rejected.** The evidence concerns only local product
  acceptance under pnpm. A Golden migration would be disproportionate and
  would silently broaden production and deployment claims.

## API, data, adapter, catalog, license, supply-chain, security, and operability effects

- **API-001**: No public route, request/response, authentication actor, error
  shape, queue message, event, Graph serialization, verification serialization,
  or compatibility version changes. The preview-start request remains strict
  and empty.
- **DAT-001**: No Prisma schema, migration, persistent product row, seed,
  retention rule, durable conversion, Graph byte, Published digest,
  Compilation byte, or generated identifier changes. Cleanup identity remains
  in memory. The non-secret operation lease is temporary host-operability
  metadata and may intentionally remain after an unproven cleanup or supervisor
  crash; it is never product data or cleanup authority.
- **ADP-001**: One internal local process-lifecycle adapter is added between the
  pnpm-attached client and cleanup-owner supervisor. Existing editor, AI, Git,
  provider, database, queue, generated-runtime, and deployment adapters remain
  unchanged.
- **ADP-002**: Docker Compose receives the same accepted argument-array
  projects/files/profile as ADR-0032 and ADR-0033. No new Compose service,
  network, volume, profile, or tracked topology is introduced.
- **CAT-001**: No capability catalog, UI registry, recipe registry, Graph
  coordinate, stable `@factory/*` name, `factory.application-graph/*` value,
  provenance record, or source-study entry changes.
- **LIC-001**: No package, image, copied source, external service, or license
  notice is added or changed.
- **SUPL-001**: `package.json`, workspace manifests, `pnpm-lock.yaml`, Docker
  image tags, GitHub Actions, and external source authorities remain
  byte-unchanged. The implementation uses only Node 22 built-ins already in the
  accepted profile.
- **SEC-001**: Exact in-memory ownership prevents a mutable file or untrusted
  caller from selecting the Docker target. The browser, Graph, request, queue,
  generated app, inherited environment, and operator cannot choose the
  supervisor mode, project, lease, or cleanup path.
- **SEC-002**: The detached supervisor retains the existing local Docker
  privilege only for the bounded command lifetime. It is not a daemon and gains
  no production, remote, multi-tenant, sandbox, or deployment safety claim.
- **SEC-003**: Exact label proof, no shell interpolation, containment, digest
  validation, symlink rejection, and no-follow deletion preserve the threat
  model's filesystem and preview controls.
- **SEC-004**: Environment and child-output minimization preserve the
  prohibition on credentials and raw model material in logs/evidence.
- **OPS-001**: Ctrl+C may return control to the terminal before cleanup has
  finished. In the rejected candidate, the detached supervisor continues for
  the bounded cleanup window and OPL blocks a subsequent invocation. Current
  accepted behavior remains unchanged until a successor decision exists.
- **OPS-002**: Normal acceptance gains one short-lived Node process and one IPC
  channel. No listening socket, port, installation, startup item, service, or
  persistent scheduler is added.
- **OPS-003**: Cleanup latency can extend to the existing preview-start/stop and
  Compose teardown bounds. The benefit is deterministic cleanup after the
  actual command tree is interrupted; the cost is more lifecycle code and
  platform-specific evidence.
- **OPS-004**: One live operation lease serializes acceptance in a worktree. A
  concurrent invocation fails within DDL-001 without waiting for or disturbing
  the owner. In a successor, dead-owner reclaim must be followed by the existing
  preview guard and proposed detection-only outer guard before new mutation.
- **OPS-005**: An unquiesced preview POST is a deliberate hard stop: the
  supervisor exits nonzero at its total deadline, retains the operation lease,
  and makes no zero-cleanup claim. This is less convenient than speculative
  teardown but avoids losing the only exact preview identity.

## Compatibility and contract-freeze decision

- **CMP-001**: Public API and durable data compatibility are exact preservation.
  Existing clients, Graphs, queues, Published revisions, Compilations, generated
  projects, normal previews, and cloud behavior are byte/behavior unchanged.
- **CMP-002**: No frontend/backend contract is opened. The existing versioned
  API/data artifacts remain `frozen/unchanged`; their existing lifecycle owners
  remain the contract owners.
- **CMP-003**: Platform/Tech Lead owns the proposed internal
  `factory.local-acceptance-cleanup-owner/v1`,
  `factory.local-acceptance-operation-lease/v1`,
  `factory.local-acceptance-supervisor-ipc/v1`, and
  `factory.local-acceptance-interruption-harness/v1` contracts. They are not
  frozen while this ADR is Proposed.
- **CMP-004**: This ADR is not frozen for implementation or disjoint parallel
  tasks. A successor must first freeze the shared producer identity/quiescence
  contract; client/supervisor startup, child termination, preview
  reconciliation, override recovery, resource proof, and real terminal smoke
  behavior then remain one coupled serialized integration boundary.
- **CMP-005**: Generated templates, shared Graph/API/data contracts, tracked
  Compose topology, migrations, and end-to-end smoke tests remain serialized
  integration work. This proposal authorizes no frontend/backend parallel wave.

## Allowed files and ownership

- **OWN-001**: The Tech Lead owns only this proposed ADR path and stops after
  revising it. The Tech Lead does not approve or implement the ADR.
- **OWN-002**: Because the recommendation is `reject`, ADR-0034 authorizes **no
  implementation file**. In particular,
  `scripts/local-product-acceptance.mjs`,
  `scripts/local-product-acceptance.test.mjs`, a proposed terminal harness,
  Control Plane/worker source, API/queue/schema artifacts, `package.json`,
  `pnpm-lock.yaml`, `infra/docker-compose.yml`, generated templates, and the E2E
  product journey remain unchanged under this decision.
- **OWN-003**: PM alone may update
  `docs/superpowers/ledgers/2026-08-31-post-v0.1-local-restaurant-readiness.md`
  and `docs/project-status.md` to record founder acceptance/rejection and the U4
  block. Those governance records are not implementation authorization.
- **OWN-004**: PM must name the Control Plane preview-lifecycle owner as contract
  owner in the next dispatch. That Tech Lead must decide and version the
  pre-side-effect identity/quiescence contract before freezing any
  frontend/backend or runner/Control Plane split.
- **OWN-005**: No existing public API/data contract is frozen enough for
  disjoint work on this repair because the missing producer fence is the shared
  contract. Generated templates, shared Graph/API/data contracts, tracked
  Compose topology, migrations, and the end-to-end smoke remain serialized
  integration work.
- **OWN-006**: QA will own real Windows and POSIX
  terminal/process-tree/Docker evidence only after a successor ADR is accepted
  and PM authorizes exact files. Separate task and release reviewers retain
  judgment; the controller alone owns commit, push, PR, `main` integration, and
  release actions under `docs/delivery-policy.md`.

## Migration, rollback, abort conditions, and irreversible steps

- **MIG-001**: There is no ADR-0034 migration. Founder acceptance records the
  `reject` decision, PM leaves U4 blocked, and no client/supervisor, operation
  lease, timing harness, or detection guard is implemented from this ADR.
- **MIG-002**: PM's next step is a separate Tech Lead dispatch for a versioned
  preview producer identity/quiescence contract. Only after founder acceptance
  may PM define a serialized implementation path manifest that can include the
  supervisor constraints in DEC-004.
- **ROLB-001**: ADR-0034 creates no runtime, data, file, process, Compose, or
  external resource and therefore needs no implementation rollback. A normal
  non-force documentation revert is sufficient if the decision record itself
  is later superseded.
- **ABT-001**: Do not reinterpret `reject` as permission to implement the
  otherwise specified supervisor. Any code/test/harness edit before a successor
  accepted ADR and PM authorization is out of scope.
- **ABT-002**: A successor must abort if a detached supervisor cannot survive
  separate real Windows Ctrl+C and Ctrl+Break cases and POSIX SIGINT/SIGTERM, or
  if any required case leaves an exact directory, container, network, volume,
  child, or supervisor process.
- **ABT-003**: A successor must abort if two processes can issue cleanup, a
  mutable object can replace in-memory identity, unknown IPC/harness input
  reaches Docker, an abnormal override/lease is consumed or followed, or
  cleanup uses a prefix/glob/unscoped deletion.
- **ABT-004**: A successor must abort if a live operation lease does not block a
  second literal package invocation in every cleanup window, if stale
  reclamation can select Docker identity, if pre-ACK work mutates Docker, or if
  any deadline is absent/restartable/unbounded.
- **ABT-005**: A successor must abort if preview producer quiescence and final
  reconciliation cannot reach exact zero after a never-settling/delayed POST.
  Required API, queue, database, or lifecycle changes return to Tech Lead scope;
  they must not be hidden in runner implementation.
- **ABT-006**: Abort for any package/lockfile/runtime/image change outside a
  separately proposed profile; credential/raw-prompt/raw-response logging;
  environment dump; non-loopback bind; provider call; external resource; paid
  action; cloud operation; deployment; destructive migration; force push; or
  irreversible step.
- **IRR-001**: No irreversible repository, data, infrastructure, publication,
  or deployment step exists or is authorized. Immutable historical Published
  revisions and Compilations remain unchanged.

## Measurable verification plan and acceptance criteria

- **VER-001**: Validate this proposal with `pnpm exec prettier --check
docs/adr/adr-0034-local-acceptance-interruption-cleanup-owner.md` and
  `git diff --check --
docs/adr/adr-0034-local-acceptance-interruption-cleanup-owner.md`.
- **VER-002**: Read-only source evidence must retain the blocking facts:
  `apps/control-plane/src/lifecycle.service.ts` creates a PreviewRun identity
  before enqueue and awaits enqueue before returning, while the current strict
  preview-start request supplies no pre-side-effect operation identity or
  cancellation/drain fence. No runner-only proof may claim server quiescence
  after a never-returning request.
- **VER-003**: A separate qualified ADR reviewer records the ADR hash, P0/P1/P2
  findings, confirms that `reject` authorizes no implementation, and does not
  issue a bounded/reversible or standing-acceptance implementation verdict for
  this supervisor-only profile.
- **VER-004**: PM records the founder's accepted/rejected decision, reviewer
  evidence, U4 blocked state, and next Tech Lead dispatch in
  `docs/superpowers/ledgers/2026-08-31-post-v0.1-local-restaurant-readiness.md`.
  The active ledger remains the sole live task-state authority.

The following are mandatory verification gates for a future successor ADR;
they are requirements, not authorization to add the named tests or harness now.

- **VER-005**: Focused tests must prove exact OPL representation, atomic
  acquisition, POSIX permissions/ownership, Windows non-widening behavior,
  live/indeterminate owner blocking, incomplete-entry grace, dead-owner atomic
  rename/revalidation, single-winner reclaim, crash before/after proof, exact
  release, and that no lease field or stale-reclaim path selects cleanup
  identity.
- **VER-006**: At each cleanup gate—`during-preview-reconcile`,
  `during-preview-stop`, `after-preview-proof`, `during-outer-down`,
  `after-outer-down`, `during-outer-proof`, `during-global-guard`, and
  `before-root-removal`—a second literal `pnpm accept:local` invocation must
  lose the live operation lease within DDL-001, exit nonzero before any Docker
  call, and leave the first owner untouched. A separate crash-at-each-gate case
  must prove dead-owner reclaim grants no cleanup identity and that the preview
  plus new detection-only outer guards block a fresh mutation when leftovers
  exist. A crash after terminal proof but before release must be reclaimable.
- **VER-007**: Strict IPC tests must cover exact ready/ACK/result shapes,
  reciprocal nonce/version validation, ready and ACK deadlines, disconnect at
  every handshake edge, duplicate/extra/missing/wrong-type/wrong-case messages,
  messages after ACK, never-settling ready/ACK/result, and zero Docker mutation
  before valid ACK.
- **VER-008**: Deadline tests must drive every DDL row with a never-settling
  promise or real child, prove the exact wall-clock cutoff without restarting
  clocks, enforce POSIX escalation and the `10_000` ms Windows taskkill bound,
  reserve DDL-021 for cleanup, return nonzero, and retain OPL when terminal proof
  is incomplete. Real evidence must include an actual never-exiting harmless
  child process/tree and actual Docker/HTTP cleanup timeouts; mocks alone are
  insufficient.
- **VER-009**: Producer tests must delay the POST before identity creation,
  after identity creation/before enqueue, and after enqueue/before response;
  include valid/error/malformed/network-loss/never-settling outcomes; prove no
  second producer; establish QSC stable absence or exact identity; perform the
  final reconciliation immediately before outer teardown; and reach exact zero
  for every accepted path. The never-settling pre-identity case currently fails
  that gate and therefore requires the separate shared-contract ADR.
- **VER-010**: Integrity tests must separately mutate bytes, replace with a
  symlink/non-regular entry, delete, and move the override and lease to only the
  two frozen TRU-009 sibling names before normal completion, IPC disconnect,
  SIGINT, and SIGTERM. Each case must remain nonzero, never consume/follow the
  abnormal entry, use only cached identity or exact intent reconciliation, and
  remove only exact no-follow entries inside the unchanged identity-verified
  root. Moves elsewhere must block terminal proof rather than be searched.
- **VER-011**: The future real Windows Ctrl+C case must launch the literal
  `pnpm.cmd accept:local` tree in a newly created dedicated console, record and
  revalidate the root PID plus creation time, and use the native
  `GenerateConsoleCtrlEvent(CTRL_C_EVENT, 0)` against that dedicated console.
  The harness must ignore its own control handling and prove the detached
  supervisor is outside the target console.
- **VER-012**: A separate future real Windows Ctrl+Break case must launch the
  literal command with native `CREATE_NEW_PROCESS_GROUP`, record/revalidate the
  exact pnpm group-leader PID plus creation time, and call
  `GenerateConsoleCtrlEvent(CTRL_BREAK_EVENT, <exact-group-id>)`. Combining
  Ctrl+C and Ctrl+Break into one case, `taskkill`, calling an exported handler,
  or signaling only inner Node is not evidence.
- **VER-013**: Future POSIX evidence must launch literal `pnpm accept:local` in
  a real pseudo-terminal with a recorded foreground pnpm process-group ID and
  start time, then run separate real `SIGINT` and `SIGTERM` cases against that
  group. Direct supervisor signals and mocked process groups are insufficient.
- **VER-014**: All native cases must use only HAR-001/HAR-002. They verify every
  LIF-008 stage, the `10_000` ms hard hold, unknown/payload-bearing value
  rejection, permanent evidence-run nonzero state, and ordinary-mode success
  only when the key is absent. The gate input/output contains no target, path,
  command, signal, duration, mutation, environment dump, or cleanup authority.
- **VER-015**: Every post-start native case must use actual Docker Compose and
  actual run-owned resources. After the real pnpm tree exits, an independent
  host observer waits only to DDL-022 and queries containers, networks, and
  volumes by the supervisor's exact safe project identities. It proves zero
  exact resources, absent private/preview directories, exited
  client/Playwright/supervisor processes, released OPL, and an unrelated Compose
  project plus sentinel untouched. Mocks or detection-only output are not
  substitutes.
- **VER-016**: A successor normal run on Node `22.11.0`, `pnpm@9.0.0`, and
  Docker Compose `>=2.24.4` must preserve the accepted live journey, exact
  steps, accessibility gates, one bounded
  `factory.local-acceptance-summary/v1`, zero resources, and OPL release. Fresh
  `pnpm format:check`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`,
  `pnpm verify:third-party`, and `pnpm verify:source-studies` plus exact frozen
  artifact/path checks remain mandatory.

## Consequences

### Positive

- **POS-001**: Cleanup ownership survives interruption of the actual pnpm
  terminal/process group instead of depending on a descendant `finally` block.
- **POS-002**: One process owns side-effect state and teardown, eliminating a
  cross-process claim race and preserving exact-project deletion boundaries.
- **POS-003**: Cached exact identities and intent-before-side-effect ordering
  close the enqueue/response/lease and override-integrity interruption windows.
- **POS-004**: The repair stays local, dependency-free, reversible, and outside
  public API/data/Graph/generated/cloud/release contracts.

### Negative

- **NEG-001**: `scripts/local-product-acceptance.mjs` gains a two-process
  lifecycle, IPC failure handling, and platform-specific detachment behavior.
- **NEG-002**: Real Windows console and POSIX process-group matrices are slower
  and more operationally demanding than injected unit tests.
- **NEG-003**: Ctrl+C can return the user's prompt before bounded cleanup is
  complete; operators must wait for the pre-guard to clear before rerunning.
- **NEG-004**: Force-killing the detached supervisor or losing the host/Docker
  daemon can still leave local resources; this proposal narrows but cannot
  eliminate that privileged-host residual risk.

## References

- **REF-001**: `AGENTS.md`
- **REF-002**: `docs/tech-governance.md`
- **REF-003**: `docs/threat-model.md`
- **REF-004**: `docs/delivery-policy.md`
- **REF-005**: `docs/adr/adr-0024-post-v0.1-local-operability-profile.md`
- **REF-006**:
  `docs/adr/adr-0032-local-acceptance-role-surfaces-and-preview-lease.md`
- **REF-007**:
  `docs/adr/adr-0033-local-acceptance-preview-profile-activation.md`
- **REF-008**:
  `docs/superpowers/ledgers/2026-08-31-post-v0.1-local-restaurant-readiness.md`
- **REF-009**: `scripts/local-product-acceptance.mjs`
- **REF-010**: `scripts/local-product-acceptance.test.mjs`
- **REF-011**: `infra/docker-compose.yml`
