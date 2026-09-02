---
title: "ADR-0035: Local Acceptance Preview Intent Identity"
status: "Accepted"
date: "2026-09-03"
authors: "Archeform Tech Lead"
tags: ["architecture", "control-plane", "security", "operability", "acceptance"]
supersedes: ""
superseded_by: ""
amends_if_accepted: "ADR-0032 preview lease and ADR-0033 local profile activation only"
---

# ADR-0035: Local Acceptance Preview Intent Identity

## Status and founder gate

Proposed | **Accepted** | Rejected | Superseded | Deprecated

Recommendation: **experiment** with one token-authenticated internal preview
intent endpoint and a detached, single-owner local acceptance supervisor.

Accepted by PM on 2026-09-03 under the founder's standing independent-review
authorization in `docs/tech-governance.md`. Separate qualified read-only
reviewer `/root/review_adr0035_preview_intent` first reported P0/P1/P2 `0/4/1`,
then `0/1/1`, and finally confirmed P0/P1/P2 `0/0/0`, bounded and reversible
`yes`, material ambiguity `no`, and exactly
`APPROVED_FOR_STANDING_ACCEPTANCE: yes`. The reviewed proposed ADR SHA-256 is
`beb6fa170d6757db8b416caaa8895be62b7b0ffeafdbcc40b14d386c9c4ec3fb`.

This acceptance authorizes only the serialized, test-first U4 implementation
within the exact paths below. It grants no `main` integration, repository
release, Product Publish, provider call, paid resource, cloud action,
deployment, credential exposure, security weakening, or R0 resumption.

## Context

- Accepted ADR-0032 requires the local runner to clean one exact leased preview
  before its exact outer Compose project.
- Accepted ADR-0033 keeps acceptance profile activation local and requires
  cleanup to survive a mutated, symlinked, or deleted temporary override.
- Rejected ADR-0034 proved that a detached supervisor alone is insufficient:
  the current server chooses `previewRunId` inside a POST handler, so a request
  delayed before row creation can outlive the last negative query without
  leaving the cleanup owner an exact deletion identity.

## Current and proposed profiles

The current Golden profile remains Node `>=22.11.0 <23`, pnpm `9.0.0`, the
versions and image policy in `docs/tech-governance.md`, PostgreSQL/Prisma,
Redis/BullMQ, Draft -> Publish -> immutable Compilation, and the existing
public preview API. The public `POST /compilations/:compilationId/preview-runs`
accepts only an empty body and assigns a UUID-based PreviewRun identity.

Exact package authorities remain TypeScript `^5.7.2` / `5.9.3`, Next
`^15.1.0` / `15.5.22`, React/React DOM `^19.0.0` / `19.2.8`, NestJS
`^10.4.15` / `10.4.22`, Prisma `^6.1.0` / `6.19.3`, BullMQ `^5.34.10` /
`5.81.2`, and worker ioredis `^5.4.2` / `5.11.1`. Images remain
`node:22-alpine`, `postgres:16-alpine`, and `redis:7-alpine`; these are
floating-major tags, not exact patch pins. Manifests and `pnpm-lock.yaml` are
the executable supported-range and exact-resolution authorities.

## Frozen internal contract

### Route, authentication, and serialization

- **API-001**: Add exactly
  `POST /internal/compilations/:compilationId/preview-runs`, with no query
  parameters and HTTP `200` for both first creation and exact replay.
- **API-002**: Require both the existing `x-factory-internal-token` and exact
  `x-factory-local-acceptance-token`. Nest may parse JSON before entering the
  handler; malformed/oversized input may therefore fail under the existing
  bounded parser limit before authentication. This accepted parser residual has
  no application-state access. Inside the handler, validate both capabilities
  before application-level body validation or state access.
- **API-002A**: The supervisor generates the distinct acceptance token with
  `randomBytes(32).toString("hex")`. Its private override references
  `FACTORY_LOCAL_ACCEPTANCE_TOKEN` only for the exact outer Control Plane
  service. The token is available only in supervisor memory and the Compose
  interpolation environment for exact outer commands; scrub it from Playwright,
  Workbench/browser, compiler-worker, unrelated children, output, IPC, reports,
  and files. Normal profiles and workers lack it and fail closed.
- **API-002B**: Validate both headers in constant time. Missing, duplicate,
  malformed, or unequal values return `401`. The new auth helper accepts only a
  configured 64-lowercase-hex token and never logs values. The new route is a
  run-scoped local-acceptance capability, not authority granted by the normal
  worker token alone.
- **API-003**: The body has exactly two keys:
  `apiVersion: "factory.local-preview-intent/v1"` and `previewRunId` matching
  `^preview-[a-f0-9]{64}$`. Missing, extra, padded, case-mutated, alternate,
  non-string, or UUID-shaped values fail `400` before mutation.
- **API-004**: The supervisor generates the ID from `randomBytes(32)` and caches
  the exact PreviewRun ID, derived `factory-preview-${previewRunId}` project,
  Compilation ID, and `.preview-runs/${previewRunId}` path before HTTP.
- **API-005**: A success response contains exactly `apiVersion`,
  `compilationId`, `previewRunId`, `composeProjectName`, and `status`, where the
  first four exactly match the request/derivation and status is one of
  `starting|ready|stopping|stopped|failed`.
- **API-006**: The existing public empty-body route, Factory UUID assignment,
  response, active-run behavior, and failure behavior remain unchanged.

### Persistence, replay, and conflicts

- **INT-001**: After authentication and exact validation, require an existing
  succeeded immutable Compilation and its existing valid artifact root. Missing
  is `404`; non-succeeded or invalid authority is `409`.
- **INT-002**: Persist the requested ID, derived Compose name,
  `activeKey=compilationId`, next sequence, and `status=starting` before calling
  `previewRunQueue.enqueue`. The queue message remains exactly
  `{ action: "start", previewRunId }`.
- **INT-003**: Same ID plus same Compilation and derived Compose identity is an
  observational replay in every status: return current state with no create,
  transition, or enqueue. A terminal replay never restarts.
- **INT-004**: Same ID with different ownership/identity, or another ID holding
  the Compilation active key, is `409` with zero mutation/enqueue and without
  returning the competing identity.
- **INT-005**: On uniqueness error, reread only the requested primary key. An
  exact match follows INT-003; absence or mismatch is `409`. Only the successful
  creator may enqueue, once.
- **INT-006**: First creation returns only after enqueue settles. An observed
  enqueue failure conditionally transitions only `starting -> failed`, retaining
  ID, Compose identity, and active key, with exact safe diagnostic
  `Local acceptance preview enqueue acknowledgement failed.`; then return `503`.
  If the transition loses a race, retain the current row and still return `503`.
  Never delete the intent, free its identity, or re-enqueue that ID. The
  supervisor treats the pre-owned project/path as may-exist and cleans any
  acknowledgement-loss runtime. Public-route compensation stays unchanged.
- **INT-007**: Client abort, socket loss, local timeout, or missing response does
  not cancel server work and is never used as quiescence evidence.

## Detached single owner and exact cleanup

- **SUP-001**: Use internal identifier
  `factory.local-acceptance-cleanup-owner/v1`. The pnpm-attached process is a
  thin IPC client. One detached supervisor owns run input, Docker, preview,
  cleanup, and proof. No client/Playwright/second supervisor performs cleanup.
- **SUP-002**: Before readiness, atomically acquire the non-secret per-canonical
  worktree `factory.local-acceptance-operation-lease/v1` from ADR-0034. It
  contains PID/nonce/workspace digest, never cleanup identity; live owner blocks
  a second run. Dead-owner reclaim is exact and no-follow. Release occurs only
  after terminal zero proof.
- **SUP-003**: Use the reciprocal
  `factory.local-acceptance-supervisor-ipc/v1` ready/ACK nonce handshake. No
  port, secret, child, HTTP, or Docker mutation occurs before valid ACK.
  Disconnect after ACK requests interruption but supplies no target/command.
- **SUP-004**: State advances only through `initializing -> ready ->
outer-may-exist -> preview-intent -> preview-may-exist -> cleaning ->
quiescing -> removing -> proving -> terminal`. May-exist state is recorded
  before each side effect. Cleanup promise and terminal result are each single
  assignment.

### Normative ADR-0034 successor clauses

- **INC-001**: Incorporate the exact ADR-0034 text at commit `f2bdb0bd` for
  `SUP-001..005`, `OPL-001..010`, `IPC-001..004`, `PRC-001..007`,
  `DDL-001..023`, `TMO-001..004`, `LIF-001..008`, `TRU-001..011`,
  `EVD-001..003`, `HAR-001..005`, and `VER-005..016`.
- **INC-002**: Amend LIF-003..005/LIF-007..008 and replace incorporated TRU-003:
  cleanup authority always remains only API-004's supervisor-cached, pre-owned
  PreviewRun ID, Compose name, and path. A current-preview response is
  confirmation-only. Any mismatch blocks cleanup; the supervisor never adopts,
  reports, or deletes the returned identity. Uncertain response/enqueue timing
  follows ADR-0035 INT/CLN quiescence and exact cleanup.
- **INC-003**: Retain QSC-001's sole-producer/no-retry rule through INT-006.
  Replace ADR-0034 QSC-002..008 response-dependent unknown-identity behavior and
  its DEC reject conclusion with ADR-0035 API/INT/CLN. References to those
  replaced outcomes in incorporated lifecycle/verification clauses resolve to
  ADR-0035; every other incorporated constraint remains unchanged.

- **CLN-001**: Stop new work and terminate/reap exact product child groups or
  trees. Attempt normal authenticated exact preview stop while outer services
  live. A 404, timeout, conflict, or missing response never changes identity or
  authorizes outer teardown.
- **CLN-002**: Before stopping it, find exactly one compiler-worker container by
  exact outer-project and service labels. Inspect and cache its immutable image
  ID matching `^sha256:[a-f0-9]{64}$`; any absence, multiplicity, mutable tag,
  or mismatch fails cleanup.
- **CLN-003**: Quiesce the producer/consumer chain by stopping all validated
  exact outer `control-plane` matches, then `compiler-worker` matches, and prove
  none is running. The tracked topology has no restart policy. Redis jobs are
  inert after both services stop.
- **CLN-004**: Query only exact
  `com.docker.compose.project=factory-preview-${previewRunId}` labels. Remove
  only validated returned container IDs, network IDs, and volume names in that
  order. Repeat only for the same ID. Never delete by prefix/glob/substring,
  remove images, or touch another project.
- **CLN-005**: Find exactly one outer `factory-artifacts` volume by exact outer
  project and Compose-volume labels. Run one labeled helper from the cached
  immutable image ID with pull disabled, no network, no capabilities, no new
  privileges, read-only root, and only that volume writable. It accepts only
  the validated PreviewRun ID and lstat/no-follow removes only
  `/artifacts/.preview-runs/${previewRunId}`. Symlinks are unlinked, never
  traversed; changed ancestors/types/races fail. Its exact name is
  `factory-local-acceptance-helper-${previewRunId}`; its only ownership labels
  are `factory.archeform.helper=factory.local-acceptance-helper/v1`,
  `factory.archeform.outer-project=<exact outer project>`, and
  `factory.archeform.preview-run=<previewRunId>`. Use `--rm`, no restart, and a
  60-second lifetime; on timeout validate the exact name and all three labels
  before removing it, then prove it absent.
- **CLN-006**: Require three consecutive successful zero/absent observations,
  exactly 1 second apart, for the exact preview directory, helper, project
  containers/networks/volumes, and both stopped producer services. Then perform
  exact outer `down --volumes --remove-orphans`, prove exact outer zero, run
  detection-only preview and outer guards, remove exact temporary objects, and
  release the operation lease.
- **CLN-007**: Detection may use a prefix to report only counts and block a run;
  deletion may not. Any uncertainty is nonzero and retains the operation lease.

## Exact bounds and platform behavior

All time is monotonic and retries do not restart a deadline: lease, spawn-ready,
and ready-ACK are 5 seconds each; Doctor/guards/config/proof children are 30
seconds; outer up is 630 seconds; host readiness 120 seconds; Playwright 900
seconds; ordinary HTTP 10 seconds; intent POST 300 seconds; preview stop 120
seconds; POSIX TERM/KILL is 1+1 seconds; Windows `taskkill /T /F` is 10 seconds;
Control Plane and worker quiescence are 60 seconds each; exact preview fallback
and outer down are 180 seconds each; helper is 60 seconds; stable proof is 95
seconds; product work is capped at 2,700 seconds with 900 seconds reserved for
cleanup and a 3,600 second total supervisor lifetime. Expiry is nonzero, kills
the exact active child, never broadens targets, and never becomes a daemon.

ADR-0035 adds exact DDL-024 Control Plane quiescence `60` seconds, DDL-025
worker quiescence `60` seconds, DDL-026 preview fallback `180` seconds, DDL-027
helper lifetime `60` seconds, and DDL-028 three-observation proof `95` seconds.

POSIX uses a detached session/process group; real evidence signals the original
pnpm foreground group separately with SIGINT and SIGTERM. Windows uses a hidden
detached supervisor; real native-console evidence separately sends Ctrl+C and
Ctrl+Break to the actual pnpm console/group. SIGKILL, direct termination of the
supervisor, Docker/host/kernel/power loss, and privileged tampering remain
detected residual risks and cannot pass delivery.

## Alternatives and decision

- **DEC-001 — Experiment**: choose the token-authenticated internal intent
  endpoint plus single owner. Pre-owned identity and producer quiescence close
  ADR-0034's unknown-side-effect window without schema or queue changes.
- An optional public body/header is rejected because it changes browser/public
  semantics. Queue fencing/cancellation is rejected because it broadens the
  queue contract and still needs deletion identity. Status quo and
  supervisor-only response reconciliation are rejected by real evidence and
  ADR-0034. A daemon/service or new process dependency is rejected as wider and
  persistent.
- No catalog, dependency, license, supply-chain, Graph, migration, generated
  output, provider, cloud, deployment, or release effect is accepted. The route
  requires both the existing worker token and the ephemeral run-scoped
  acceptance capability generated from 256 random bits, injected only into the
  exact outer Control Plane, scrubbed from every other consumer/output, and
  valid only for that supervisor run. Neither secret nor raw prompts/responses
  enter IPC, logs, evidence, or files.

## Ownership, migration, rollback, and aborts

One serialized integration owner may modify only:

- `apps/control-plane/src/lifecycle.controller.ts`
- `apps/control-plane/src/lifecycle.service.ts`
- `apps/control-plane/src/local-acceptance-auth.ts`
- `apps/control-plane/test/lifecycle.controller.test.ts`
- `apps/control-plane/test/lifecycle.service.test.ts`
- `apps/control-plane/test/local-acceptance-auth.test.ts`
- `scripts/local-product-acceptance.mjs`
- `scripts/local-product-acceptance.test.mjs`
- `scripts/local-product-acceptance-interruption-harness.mjs`

This acceptance freezes API-001..006 (including API-002A/B), INT-001..007,
SUP-001..004, INC-001..003, CLN-001..007, and every normatively incorporated
successor constraint. No disjoint frontend/backend wave is authorized:
shared API implementation, supervisor consumption, Compose orchestration, and
end-to-end smoke evidence remain serialized integration work.

The Tech Lead governance path is only this ADR. After a founder decision, PM
alone may update
`docs/superpowers/ledgers/2026-08-31-post-v0.1-local-restaurant-readiness.md`
and `docs/project-status.md`. Prisma/schema, queue source/message,
compiler-worker, E2E, packages, generated templates, tracked Compose, manifests,
lockfile, public API behavior/catalog, cloud/release paths, and R0 stay frozen.

After acceptance, add focused failing auth/service/controller tests, implement
the internal contract, then add failing supervisor/interruption tests and
implement the exact owner. Rollback is a normal non-force revert only when no
live owner exists, terminal preview/outer/process/directory zero is proven, the
operation lease is released, and both exact guards are green. An
uncertainty-retained lease requires operator inspection and forbids revert.
No data conversion exists. Abort on any out-of-scope path, schema/queue/public
contract change, browser access, duplicate enqueue, identity adoption, restart
after quiescence, unbounded command, broad deletion, symlink traversal, residual
owned resource/process, credential/prompt exposure, provider/paid/cloud action,
force push, or irreversible step.

## Verification and evidence

- Control Plane RED/GREEN:
  `pnpm --filter @factory/control-plane test -- local-acceptance-auth lifecycle.controller lifecycle.service`.
  Include the focused auth test. Cover dual constant-time auth, parser residual,
  body/version/ID validation, immutable Compilation, every-status replay,
  conflicts/races, row-before-enqueue, durable failed intent after enqueue error,
  no duplicate enqueue, and unchanged public compensation snapshots.
- Runner RED/GREEN: `node --test scripts/local-product-acceptance.test.mjs`.
  Cover IPC, operation lease/reclaim, pre-request identity, lost/never-settling
  response, every interruption window, exact quiescence/order/removal, helper
  constraints, no-follow cases, stable proof, second-run blocking, deadlines,
  and bounded secret-free output. Fakes do not satisfy real acceptance.
- The dedicated harness invokes literal `pnpm accept:local` with actual Docker
  resources and timing-only fail-closed holds before row, after row/before
  enqueue, and after enqueue/before response. It carries no identity/path/PID/
  command/signal/secret payload and cannot activate in normal mode.
- Run separate native Windows Ctrl+C and Ctrl+Break and native POSIX SIGINT and
  SIGTERM cases for every stage. An independent host observer proves bounded
  client/child/supervisor/helper exit, exact private/preview directory absence,
  zero exact preview/outer resources, released lease, and an unrelated Compose
  plus filesystem sentinel unchanged.
- A normal provider-free `pnpm accept:local` run must preserve the live
  customer-to-kitchen journey, observation-only manager/cashier state, exact
  passed steps, zero accessibility violations, bounded summary, and all-zero
  cleanup.
- Run `pnpm format:check`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm
build`, `pnpm verify:third-party`, and `pnpm verify:source-studies`, plus exact
  frozen-path and sensitive-output checks. PM records ADR hash, independent
  verdict, commits, hosts/tool versions, commands/exits, stage matrix, exact safe
  identities, zero counts, and sentinel proof in the active U4 ledger.

## Consequences

The experiment adds one internal request shape and substantial local acceptance
orchestration, but makes cleanup identity available before side effects and
keeps public product behavior unchanged. It remains local-only, bounded,
reversible, and grants no `main` integration, repository release, Product
Publish, provider call, paid resource, cloud action, deployment, or R0 restart.
