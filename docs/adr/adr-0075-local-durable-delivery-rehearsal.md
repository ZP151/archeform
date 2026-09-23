---
title: "ADR-0075: Local Durable Delivery Rehearsal"
status: "Proposed"
date: "2026-09-24"
authors: "Archeform Tech Lead"
tags: ["architecture", "decision", "delivery", "local-test", "recovery"]
supersedes: ""
superseded_by: ""
---

# ADR-0075: Local Durable Delivery Rehearsal

## Status and recommendation

**Proposed.** Recommendation: **experiment** with one test-only local rehearsal
of compatible executable replacement for the same logical generated application.
Create records under immutable revision A, reject a candidate that fails
readiness while A remains usable, switch to immutable revision B, write more
data, and run A again without losing B's writes. Restore a backup into separate
disposable storage to distinguish executable rollback from data recovery.

The test reuses current generated source and database behavior. It introduces
no public delivery API, production deployment adapter, provider, migration
language or persistent platform release-state model. It is local delivery
evidence, not hosted delivery, zero-downtime production service, or durable
upgrade support for arbitrary Graph changes.

This proposed operability boundary requires separate decision acceptance.
PM must record this exact ADR hash and direct founder acceptance or the
standing independent review's identity, evidence,
`APPROVED_FOR_STANDING_ACCEPTANCE: yes`, and P0/P1 0/0 before implementation.
The proposer cannot supply that review. Acceptance grants only implementation
and an isolated synthetic local test under PM ownership; it grants no Product
Publish against a user's application, repository release, cloud deployment,
provider call, paid resource or credential exposure. Docker is unavailable at
proposal time; no Docker action or runtime success is claimed here.

## Context and source evidence

- **CTX-001**: Task 3 of
  `docs/superpowers/plans/2026-09-24-family-expansion-and-delivery.md` identifies
  persistent upgrades and recovery as missing evidence. The user requests
  continuous delivery, but the target hosted environment is pending. Source
  inspection for this ADR uses worktree HEAD
  `d3da62b48d9763a8adcfde95b95c39fa279b6915`; PM records the eventual exact
  implementation/test revision separately.
- **CTX-002**: `packages/compiler/src/index.ts` emits V1
  `docker-compose.yml` with PostgreSQL, one-shot migrate/seed, API and web.
  PostgreSQL has no named volume binding. The generated database Dockerfile
  runs migration deployment followed by seeding. Re-running that bootstrap on
  every executable revision is not an accepted durable-upgrade procedure.
- **CTX-003**: `apps/compiler-worker/src/preview-runner.ts` derives
  `factory-preview-*` projects and `.preview-runs/*` working directories;
  startup-failure and stop paths call `down --volumes --remove-orphans`.
  `scripts/local-product-acceptance.mjs` also owns volume-deleting Preview
  cleanup. Neither cleanup controller may own the rehearsal database.
- **CTX-004**: Restaurant V3's
  `packages/compiler/src/targets/restaurant-v3/product-target.ts` emits
  per-project `shared-state` storage. That file-backed profile is distinct
  from V1 PostgreSQL and is excluded from this first rehearsal.
- **CTX-005**: Existing compiler input is
  `PublishedGraphInput { publishedRevisionId, graph, compositionLock }`.
  `generateApplicationBundle` returns `{ rootDirectory, graphHash, files }`.
  Worker `materializeGeneratedBundle` reports file path/digest/size; Preview's
  `safeArtifactManifest` and verified-artifact code additionally check the
  complete file set, regular files, links and content digests. Reuse those
  containment/integrity requirements without calling Preview launch or cleanup.
- **CTX-006**: Generated Task mutations persist records, versions, receipts
  and audit/capability effects in PostgreSQL. Receipt scope includes the
  Published Graph checksum. An executable rollback can retain receipt rows,
  but identical keys across different revisions are not cross-revision
  exactly-once commands. This test must not claim or invent that contract.

## Current and proposed profiles

- **CUR-001**: Keep root Node `>=22.11.0 <23`, `pnpm@9.0.0`, TypeScript
  `^5.7.2` resolved `5.9.3`, existing Next/React/Nest/Prisma dependencies and
  the exact `pnpm-lock.yaml`. `docs/tech-governance.md` and tracked manifests
  remain version authorities. Reuse generated `node:22-alpine` and
  `postgres:16-alpine` images. These are floating-major tags, not invented
  digest pins; record actual built/running image IDs for this attempt and
  reuse those same image IDs for rollback.
- **CUR-002**: Preserve `factory.application-graph/v1`,
  `factory.published-graph-exchange/v1`, existing composition-lock and source
  manifest shapes, immutable Compilation behavior, generated package ranges
  and file bytes. Do not add a dependency or change compiler output to support
  the test. Generated package installation is the existing build prerequisite,
  not evidence of identical dependency resolution on another day.
- **PRO-001**: Add only first-party harness source
  `scripts/local-durable-delivery.mjs`, unit tests
  `scripts/local-durable-delivery.test.mjs`, a fixture helper
  `e2e/helpers/durable-delivery-fixture.ts`, and actual acceptance
  `e2e/local-durable-delivery.spec.ts`. Root owns acceptance documentation and
  evidence. No production package export, root command alias, CI automation,
  Control Plane/worker endpoint or existing Preview behavior changes.
- **PRO-002**: A harness-owned Compose document uses the verified generated
  API/web/database Dockerfiles and contexts, plus two executable slots and
  separate PostgreSQL fixture storage. This is a new test topology only,
  outside `infra/docker-compose.yml` and all generated manifests. Native
  Node HTTP/process/filesystem APIs suffice; do not introduce a reverse-proxy
  image, orchestrator, Docker library or provider abstraction.

## Decision

### Immutable fixture and compatibility gate

- **INP-001**: Use the existing `team-task-tracking` canonical definition and
  its ordinary fixed family locks, independent of the in-progress Directory
  family. The helper composes one synthetic application ID per run. Produce
  separate authored Published exchange fixtures A and B through existing
  `createPublishedGraphExchange` / `parsePublishedGraphExchange`, deep-freeze
  each fixture, construct its separate hash-bound composition lock and compile
  through the existing compiler root export. B changes exactly one list-page
  title from A; application/workspace/entity identifiers, business fields,
  policy, workflow and package selections remain equal.
- **INP-002**: These are explicitly local authored lifecycle fixtures, not
  Control Plane Publish or evidence that a user's application was promoted.
  There are two distinct Published revision IDs, Graph hashes and generated
  bundle digests. The compiler sees the post-extraction immutable Graph, not
  the intermediate Graph carrying mutable composition selections. Freeze A
  before deriving B; never modify A or regenerate its manifest in place.
- **INP-003**: Gate B before build or launch. Require identical application ID,
  domain, policy, flows and capability package/binding projections; only the
  specified page title may differ in the Graph. Separately require byte-equal
  sorted file sets under `database/`, all emitted API Prisma schema/migration
  paths, generated API/database package manifests and Dockerfiles. Missing,
  extra or changed database files fail closed. Composition-lock Graph checksums
  must match their respective Graphs; the package/binding projections match
  each other, not the whole hash-bound lock object.
- **INP-004**: The test's compatibility predicate means only this narrow
  presentation-only revision can share this database. It does not infer SQL
  compatibility, accept additive columns, run `db push`, create migrations,
  normalize SQL, remove data, rewrite historical bundles or permit a force
  override. A negative fixture with a different database/schema contract is
  rejected before any candidate process or database command; keep A unchanged.
- **INP-005**: Materialize A/B beneath fresh exclusive run-owned directories
  under ignored `generated/.durable-rehearsals/<runId>/`. Use fixed manifest
  inputs from the fixture, not caller-selected paths or URLs. Reject duplicate
  paths, traversal, drive/UNC paths, symlinks/junctions/reparse points, nonregular
  files, missing/extra files and byte/digest/size mismatch. Recheck the complete
  sources before image build and record the resulting image IDs. Run-owned
  parent directories may not be aliases into existing resources. A/B source
  and manifests stay immutable; test Compose/env files live beside, not inside,
  those generated source trees.

### Storage and resource ownership

- **OWN-001**: Generate a random run ID internally and derive exact project,
  network and volume names under `factory-durable-test-<runId>`. Names must
  never use `factory-preview-*`, `factory-local-*` or an existing application
  resource. An exclusive `wx` run lease prevents concurrent control. Persist
  only safe run/resource IDs, digests and phase; credentials live solely in
  a local ignored `.env` file, never the lease or tracked evidence.
- **OWN-002**: Create an explicitly named PostgreSQL volume with exact
  harness/run/application ownership labels before starting Compose, then
  declare that volume `external: true` in the test topology. PostgreSQL mounts
  it at `/var/lib/postgresql/data`. Inspect the exact volume name and all
  labels before every attach/remove. A name collision, missing/mismatched
  label, competing lease or ambiguous ownership is a hard stop; never adopt
  an existing volume. Database containers publish no host port; API/web and
  the gateway bind only to `127.0.0.1` on ephemeral ports.
- **OWN-003**: Initialize the empty fixture database exactly once using A's
  verified database image and existing migrate/seed command. Prove completed
  bootstrap before serving A. Candidate B and rollback A execute only API/web
  startup; they never start migrate/seed or alter the database. Do not import
  local platform/model credentials. Test database connection values remain
  server-bound environment inputs and are never printed by Compose config,
  inspect, errors, dumps, logs or process-command evidence.
- **OWN-004**: Rehearsal code does not call Preview launch, stop, cleanup or
  the whole local-product-acceptance controller. Reuse only source patterns or
  side-effect-free integrity checks. Docker calls use fixed argv, `shell:false`,
  bounded output and timeout, and hidden windows on Windows. Never use global
  prune, prefix-based deletion, unscoped `down`, `down --volumes`, or deletion
  of a computed unverified path.

### Executable switch, failed readiness and rollback

- **RUN-001**: Expose one test-owned Node HTTP gateway at a stable loopback
  URL for this attempt. Its upstream is an in-memory selection of verified
  A/B web endpoints discovered from exact owned containers. The gateway has
  no admin route, caller-provided upstream, redirects to external origins,
  WebSocket support or durable release database. Relative requests go to the
  selected web slot, whose existing `/api` proxy targets its matching API.
  Bound connections, request bytes and request timeouts; never log bodies,
  headers, credentials or raw subprocess output.
- **RUN-002**: Keep A selected while B starts against the same database.
  Readiness requires owned image/container identity, API `/api/health`, a real
  read of the A-created task through B, and rendered B page title through B
  web. Health alone is insufficient. Candidate checks are read-only. Poll
  with a 30-second readiness deadline after bounded startup; report safe
  phase/failure codes, not raw process errors.
- **RUN-003**: Inject failed readiness by starting B's API while deliberately
  withholding its web container. Let the real web probe fail within a short
  test deadline. Prove the gateway still serves A and a new A business action
  succeeds, then remove only candidate executable containers. Candidate
  failure must not seed, restore, drop or delete the database or change the
  active slot. Repeat with the complete B slot and successful readiness.
- **RUN-004**: For a successful switch, briefly gate new gateway requests
  with bounded 503, drain all in-flight requests within 10 seconds, then change
  the selected slot and reopen the gateway. A drain timeout retains A and
  fails the switch. Do not switch while a mutation outcome is uncertain or
  automatically replay requests across revisions. Require a fresh browser
  navigation after switching so stale client bundles are not treated as a
  supported session migration. This is bounded local continuity, not a
  zero-downtime or live-session-upgrade guarantee.
- **RUN-005**: Preserve A's built image IDs and immutable source. After B
  creates and corrects records, stop and recreate A's executable containers
  from those retained image IDs against the same volume; do not rebuild or
  resolve dependencies for rollback. Reapply the compatibility and real
  readiness checks, drain, then select A. Verify B-created IDs, corrected
  values, versions and history remain readable and actionable. No restore or
  migration is part of executable rollback.
- **RUN-006**: Retained receipt rows and history must survive all phases.
  A replay under the same A revision can return its original response after
  rollback, without another write. Do not replay B's keys under A or claim
  cross-revision exactly-once delivery: the existing Graph-bound namespaces
  intentionally differ. Test mutations use fresh keys per revision except
  the explicit same-A replay case.

### Separate recovery proof

- **REC-001**: After B writes and the gateway is drained, use the same
  PostgreSQL 16 image's `pg_dump` for only this synthetic application database,
  with custom format and no ownership/ACL transfer. Store the dump only in
  the run-owned ignored directory; evidence records a digest and size, never
  dump contents. Do not use cluster-wide dumps or production credentials.
- **REC-002**: Restore via `pg_restore --exit-on-error --no-owner --no-acl`
  into a second newly created, separately labelled empty fixture volume/database.
  Do not use `--clean` on existing storage. Start a retained A executable pair
  against this restored database with a separate direct test URL, verify IDs,
  values, versions, receipts and ordered audit/capability history, then perform
  one valid business action. The main gateway and main volume remain untouched.
  This proves restore for this exact fixture, not backup scheduling, encrypted
  backup storage, point-in-time recovery or production disaster recovery.

## Interfaces, implementation and measurable verification

- **IMP-001**: CLI is exactly
  `node scripts/local-durable-delivery.mjs plan` or
  `node scripts/local-durable-delivery.mjs run`; unknown/extra arguments are
  rejected without echoing values. `plan` performs no Docker/network/write
  action and reports the fixed stages. `run` preflights local engine/toolchain
  availability before allocating fixture resources; unavailable Docker returns
  safe `delivery.engine_unavailable`, nonzero, never a skipped green result.
  There is no caller-supplied app ID, artifact path, volume, command or provider.
- **IMP-002**: The script exports private test helpers for manifest validation,
  compatibility, command construction, phase control and cleanup; process,
  clock, HTTP and filesystem adapters are injectable for unit tests. These
  are script-local interfaces, not versioned platform API. The Playwright
  fixture helper supplies the two compiler outputs/manifests directly to the
  harness in-process. The CLI `run` invokes only the fixed Playwright spec;
  the spec owns the single harness run and never recursively invokes the CLI.
- **IMP-003**: Existing seams to reuse are the compiler root
  `generateApplicationBundle` export and Graph exchange/lock helpers;
  `packages/compiler/test/fixtures/definition-data-compatibility.ts` for
  post-extraction Graph/lock construction; `artifact-writer.ts` and
  `preview-runner.ts` for path/file integrity requirements;
  `e2e/consumer-task.spec.ts` and `e2e/numeric-domain-runtime.spec.ts` for real
  business/API/PostgreSQL assertions; `scripts/doctor.mjs` for bounded host
  checks. Do not open new package subpath exports or edit these production
  paths merely to make the harness import them.
- **VER-001**: Begin RED with
  `node --test scripts/local-durable-delivery.test.mjs`. Cover exact same-app
  compatibility; changed/extra/missing schema/migration/seed files; altered
  permissions/flows; artifact corruption, links and path escape; owner-label
  collision; hostile CLI input; credential-safe diagnostics; engine absent;
  startup/readiness/drain failure retaining A; cancellation and uncertain
  process exit; no migrate/seed on B/rollback; exact image-ID rollback;
  Preview cleanup rejection and zero unrelated-resource deletions. Unit tests
  issue no Docker call and are not runtime evidence.
- **VER-002**: Build existing prerequisites with
  `pnpm exec turbo run build --filter=@factory/adapters... --filter=@factory/compiler...`.
  Once the engine is available, run
  `node scripts/local-durable-delivery.mjs run`, which dispatches
  `pnpm exec playwright test e2e/local-durable-delivery.spec.ts --workers=1`.
  One attempt has a 15-minute total limit, each build/start a bounded limit
  within it, and readiness/drain bounds above. Failure remains a failed attempt
  with cleanup status; changing time limits cannot erase the original result.
- **VER-003**: Actual runtime acceptance creates two distinct tasks under A,
  performs a transition/correction and records IDs/versions/history; rejects
  incompatible and unready candidates; proves A remains usable; promotes B
  at the same gateway URL and visibly observes B's page title; proves prior
  records; writes/edits under B; restarts the main PostgreSQL container with
  the same volume and proves persistence; recreates/switches back to A;
  verifies B writes and a valid next action; verifies same-A receipt replay;
  and proves REC-001/002 restore in separate storage. Assert exact business
  values and audit/receipt counts, not merely container health or row counts.
- **VER-004**: The test captures one browser view under each revision at the
  stable URL and after rollback, identifying the actual served page title and
  business record. Existing Task responsive presentation evidence remains
  applicable because presentation structure is unchanged. No hosted-product
  or new-family count increments. Safe evidence in
  `docs/acceptance/evidence/local-durable-delivery/` records source, Graph,
  lock, bundle, database-contract and image hashes; phase outcomes/durations;
  assertions, backup digest and exact cleanup. Root writes
  `docs/acceptance/local-durable-delivery.md` and the active PM ledger.

## Cleanup, rollback and abort conditions

- **ROL-001**: The fixture volume survives every executable transition and
  readiness failure. Only final harness teardown may remove it. Teardown first
  closes gateway/listeners, terminates and verifies owned subprocesses, stops
  exact owned containers, checks their labels/IDs and volume attachments, then
  removes exact owned containers/networks/volumes and contained scratch paths.
  Revalidate names/labels immediately before removal. External-volume marking
  is an extra defense, not replacement for ownership checks.
- **ROL-002**: Interruption or error follows the same scoped teardown. If a
  process is still running, labels disagree, mounts are ambiguous or ownership
  cannot be proved, stop destructive cleanup and report
  `delivery.cleanup_required` with safe run ID and resource counts. Retain the
  lease and fixture resources for controller inspection; never prune or guess.
  Prove no remaining owned resources for accepted runtime evidence. Unrelated
  Preview/local projects are untouched; negative cleanup tests assert this.
- **ROL-003**: Reverting the four harness files and root-owned evidence removes
  the experiment without modifying application data, production schemas or
  generated templates. No production migration or irreversible action exists.
- **ABT-001**: Abort for artifact/database-contract drift, fixture identity
  disagreement, unverifiable ownership, non-loopback exposure, credential/raw
  model leakage, unresolved in-flight mutation, need to rerun seed on upgrade,
  need for schema conversion, production source modification or new external
  dependency/provider. Broader delivery capability requires another decision;
  the test must not silently grow into a production orchestrator.

## Consequences and alternatives

- **POS-001**: Establishes the first actual same-app persistence, failed-rollout,
  executable rollback and separate restore evidence using existing runtime
  code and versions. It exposes data/receipt/operability gaps before hosting.
- **NEG-001**: Only presentation-compatible Task revisions are admitted.
  Cross-revision idempotency, schema evolution, long-lived sessions, durable
  release state, authentication, HTTPS and provider operations remain unproven.
  Local Docker-socket privilege retains its existing threat-model limitation.
- **ALT-001**: Reuse Preview for durable storage: rejected because its
  per-preview identity and volume-deleting cleanup conflict with data lifetime.
- **ALT-002**: Modify every generated Compose template now: rejected because
  it changes historic output without proving switching/rollback and broadens
  this first experiment unnecessarily.
- **ALT-003**: Build a hosting provider or general migration orchestrator:
  deferred until a target and accepted operational/security contract exist.
- **ALT-004**: Use fake stores or container restart alone: rejected as final
  evidence because neither proves two immutable executables share surviving
  data, failed readiness retains A, or backup restore works.

## Authority, ownership and references

- **GAT-001**: Standing acceptance is eligible only as this bounded local test
  within the active delivery goal, with no user application deployment or
  security weakening. Independent review must resolve ownership/cleanup,
  compatibility, secrets and authority questions with P0/P1 0/0. Eligibility
  is not acceptance. PM assigns one serialized harness owner after acceptance;
  root retains ledger/integration/verification ownership and ordinary delivery
  gates. Other family writers retain their paths.
- **REF-001**: `AGENTS.md`, `docs/tech-governance.md`, `docs/threat-model.md`,
  `docs/delivery-policy.md`.
- **REF-002**: Parent plan Task 3 and
  `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`.
- **REF-003**: Source seams in CTX-002..006 and IMP-003; ADR-0063/0064 for
  existing Task mutation/correction and ADR-0065 for definition fixture reuse.
