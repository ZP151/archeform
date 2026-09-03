---
title: "ADR-0032: Local Acceptance Role Surfaces and Preview Lease"
status: "Accepted"
date: "2026-09-02"
authors: "Archeform Tech Lead"
tags:
  [
    "architecture",
    "compiler",
    "generated-runtime",
    "security",
    "operability",
    "acceptance",
  ]
supersedes: ""
superseded_by: ""
amends_if_accepted: "ADR-0024 ACC-002, ACC-003, ACC-005, ACC-006, and ABT-001 only"
---

# ADR-0032: Local Acceptance Role Surfaces and Preview Lease

## Status and founder gate

Proposed | **Accepted** | Rejected | Superseded | Deprecated

Recommendation: **experiment** with two bounded, local-only additions to the
post-v0.1 Restaurant acceptance contract: generated role-specific merchant
services whose actor is fixed at process startup, and a runner-owned preview
lease that survives Playwright interruption long enough to guarantee teardown.

Accepted by PM on 2026-09-02 under the founder's standing independent-review
authorization in `docs/tech-governance.md`. Separate qualified read-only
reviewer `/root/review_adr_0032` reported P0/P1/P2 `0/0/0`, bounded and
reversible `yes`, unresolved ambiguity/material choice `no`, and exactly
`APPROVED_FOR_STANDING_ACCEPTANCE: yes` after one proposal-only repair round.
This acceptance authorizes only the PM-scoped local U4 implementation and its
verification. It grants no main integration, repository release, Product
Publish, provider call, paid resource, cloud action, deployment, or R0
resumption.

## Context and reproduced gap

- **CTX-001**: Accepted ADR-0024 requires the deterministic local journey to
  run one customer order through merchant fulfilment in the live generated
  product and to treat cleanup as part of the acceptance result.
- **CTX-002**: The current generated Restaurant product bundle is
  `factory.restaurant-product-bundle/v1` compiled only from an immutable
  `factory.application-graph/v3` Published revision. Its generated server
  already supports the trusted startup roles `customer`, `manager`, `kitchen`,
  and `cashier`, applies permission and transition checks server-side, and
  shares schema-version-1 state through one Compose volume.
- **CTX-003**: The generated Compose file starts only a customer `web` process
  and a manager `api` process. The live acceptance can therefore prove that a
  customer is denied merchant actions, but it cannot use a live kitchen-bound
  process to execute the Graph-authorized accept, start-preparing, and
  mark-ready transitions. Generated unit tests exercise those roles, but they
  are not the frozen live product outcome.
- **CTX-004**: The current E2E verification assertion searches one aggregate UI
  container for four step identifiers and one unpaired `passed` value. A failed
  merchant, shared-state, or cleanup step can coexist with another passed step
  and satisfy that assertion.
- **CTX-005**: The local acceptance runner owns the outer `factory-local-*`
  Compose project, while Playwright starts a separate `factory-preview-*`
  project. On interruption the runner can terminate the Playwright process tree
  before the spec's `finally` block stops the preview. The surviving runner
  tears down only its outer project; the final guard detects preview leftovers
  but cannot remove them.
- **CTX-006**: Independent U4 QA and release review on commit `46b4d87a` both
  rejected acceptance. The release review reported P0/P1 `0/2`: missing live
  merchant fulfilment and an interruption path that can orphan preview
  resources.

## Current accepted profile and frozen contracts

- **CUR-001**: The Golden profile remains TypeScript on Node
  `>=22.11.0 <23`, with local selection `22.11.0`, package manager exactly
  `pnpm@9.0.0`, and `pnpm-lock.yaml` lockfile format `9.0` as the exact
  dependency authority.
- **CUR-002**: Root TypeScript remains `^5.7.2` with lockfile resolution
  `5.9.3`; `@playwright/test` remains exactly `1.51.1`; compiler dependencies
  remain Casbin `^5.37.0` / `5.51.1`, XState `^5.19.2` / `5.32.5`, and Zod
  `^3.24.1` / `3.25.76`. The governing manifests are root `package.json`,
  `packages/compiler/package.json`, `apps/control-plane/package.json`, and
  `apps/compiler-worker/package.json`; exact resolutions come only from
  `pnpm-lock.yaml`.
- **CUR-003**: Generated images remain `node:22-alpine`; PostgreSQL remains
  `postgres:16-alpine`; Redis remains `redis:7-alpine`. These are accepted
  floating-major image tags, not exact patch or digest pins.
- **CUR-004**: Draft -> immutable Published Revision -> immutable Compilation
  remains unchanged. Compilers never consume a mutable Draft.
- **CUR-005**: `factory.application-graph/v3`,
  `factory.restaurant-product-plan/v1`,
  `factory.restaurant-product-bundle/v1`,
  `factory.verification-run/v1`, and
  `factory.verification-evidence/v1` remain the exact versioned serialization
  identifiers. No Graph, API, database, lifecycle, or compatibility shape is
  changed by this experiment.
- **CUR-006**: Graph role grants and transition tuples remain the authorization
  source of truth. Browser state, request headers, query parameters, and form
  data are not trusted sources for selecting an actor.

## Proposed experiment contract

This profile is additive and experimental. It does not replace the current
Golden profile.

### Live role-specific generated services

- **ROL-001**: Add an acceptance-only generated Compose profile activated only
  by `pnpm accept:local`. It adds loopback-published role-specific `kitchen`
  and `cashier` services that use the existing generated image, code,
  shared-state volume, and server. Normal generated previews keep their
  current default service behavior.
- **ROL-002**: Each role service passes its principal as a fixed process startup
  argument. The server validates that argument against the existing trusted
  startup-role allowlist before listening. A request cannot select or override
  the role through a header, cookie, query, path, form, or JSON body.
- **ROL-003**: The kitchen service may execute only transitions and permissions
  already granted to `kitchen` by the immutable Graph. Although the current
  Restaurant Graph grants cashier `ready --serve--> served`, the cashier
  service is observation-only in this experiment: the journey must not invoke
  `serve` or any other cashier mutation, and no synthetic permission or hidden
  bypass is authorized.
- **ROL-004**: All published ports remain bound to `127.0.0.1`, use run-owned
  randomized host ports, share only the run-owned Restaurant state volume, and
  inherit the existing deny-by-default API handler. No service is externally
  routable and no production identity claim is made.
- **ROL-005**: The E2E journey places and pays the order through the customer
  surface, observes the same order through both live manager- and cashier-bound
  merchant surfaces, then performs the Graph-authorized kitchen transitions
  `paid --accept--> accepted`, `accepted --start-preparing--> preparing`, and
  `preparing --mark-ready--> ready`. Customer, cashier, and manager then observe
  the exact terminal status `ready`; cashier performs no mutation. The journey
  also proves a customer-bound request to the same kitchen transition is
  denied.
- **ROL-006**: Verification evidence is read through the existing typed Control
  Plane response. Acceptance requires terminal run status `passed`, cleanup
  success, and an exact one-to-one match in which each required step
  (`customer-journey`, `merchant-journey`, `shared-state`, and `cleanup`) has
  status `passed`. Aggregate text containment is not acceptance evidence.

### Runner-owned preview lease and teardown

- **LSE-001**: The outer acceptance runner, not Playwright, owns preview start
  and final cleanup. Before it can enqueue preview work, the runner validates
  the exact immutable Compilation selected by the current acceptance run and
  creates a private, atomic, single-assignment pre-start handshake beneath the
  run-owned temporary root. Playwright may consume that validated identity but
  never owns the only recoverable preview identity.
- **LSE-002**: Introduce the internal, acceptance-only serialization identifier
  `factory.local-preview-lease/v1`. It is neither a public API nor a persisted
  product contract. Its exact fields are `apiVersion`, `factoryProjectName`,
  `compilationId`, `previewRunId`, `composeProjectName`, and
  `previewDirectoryRelativePath`.
- **LSE-003**: The lease contains no port, token, credential, environment
  value, request body, prompt, response, or user data. Invalid, duplicated,
  conflicting, replaced, non-regular, or out-of-root lease data fails closed
  and is never interpolated into a shell command. Symlinks are rejected.
- **LSE-004**: Lease validation requires the exact current
  `factory-local-[a-z0-9-]+` project and Compilation, a `previewRunId` matching
  `^preview-[a-z0-9-]+$`, `composeProjectName` equal to exactly
  `factory-preview-${previewRunId}`, and `previewDirectoryRelativePath` equal
  to exactly `.preview-runs/${previewRunId}`. The runner verifies canonical
  containment and no-symlink identity immediately before both teardown and
  removal; no other in-root path is accepted.
- **LSE-005**: On SIGINT, SIGTERM, child failure, timeout, or normal exit, the
  runner first prevents further test mutations and terminates Playwright. It
  then stops only the exact leased preview through argument-array process
  execution or the existing validated stop boundary. Teardown is bounded,
  idempotent, non-abortable by the already-received signal, and completes while
  required local worker/control-plane dependencies are still available.
- **LSE-006**: After stop, the runner proves the preview directory and resources
  labeled with the exact Compose project name have zero containers, networks,
  and volumes. It then tears down the outer `factory-local-*` project and runs
  the global guard. Any non-zero count, unverifiable identity, or cleanup error
  makes acceptance fail.
- **LSE-007**: Cleanup must never enumerate broadly and delete by prefix. It may
  remove only the validated leased directory and exact labeled Compose project.
  Pre-existing or unrelated resources are outside this experiment.

## Decision

- **DEC-001 — Experiment**: Add the two role-specific local generated services
  and the runner-owned preview lease as one serialized U4 repair because both
  are necessary to prove ADR-0024's already accepted outcome safely.
- **DEC-002 — Preserve authorities**: Do not change Graph/API serialization,
  lifecycle state, database schema, compiler admission, permissions, or role
  grants. The generated runtime consumes the immutable Graph and existing
  server-side policy exactly as before.
- **DEC-003 — Test first**: Begin with focused failing tests for fixed actor
  binding, live kitchen/cashier shared state, exact per-step verification, lease
  validation, and interruption after preview readiness. Production changes are
  authorized only after those RED states are recorded by PM.
- **DEC-004 — Serialized implementation**: The generated target, E2E journey,
  runner, and shared acceptance evidence are one contract boundary. PM may use
  multiple writers only for frozen disjoint paths; any shared-contract change
  stops the wave and returns to the Tech Lead.
- **DEC-005 — No release authority**: Acceptance of this ADR grants no main
  integration, repository release, Product Publish, provider call, paid
  resource, cloud action, deployment, or R0 resumption.

## Alternatives considered

### Keep generated verification as a substitute for the live journey

- **ALT-001**: Tighten only the per-step evidence assertion and treat generated
  tests as merchant fulfilment.
- **ALT-002**: **Rejected.** This improves evidence pairing but still does not
  execute the frozen live product outcome and would silently revise ADR-0024.

### Let the browser select a merchant role

- **ALT-003**: Reuse one merchant service and choose customer, manager, kitchen,
  or cashier through a header, query parameter, cookie, or UI control.
- **ALT-004**: **Rejected.** The browser is untrusted; client-selected actors
  weaken the existing server-side authorization boundary.

### Expose all role services outside loopback

- **ALT-005**: Publish stable host ports or support remote evaluators.
- **ALT-006**: **Rejected.** This expands identity, tenant, networking, and
  deployment scope beyond the active local-only goal.

### Kill resources by `factory-preview-*` prefix

- **ALT-007**: On interruption, enumerate and remove every matching Docker or
  filesystem resource.
- **ALT-008**: **Rejected.** Prefix cleanup can destroy another concurrent or
  pre-existing run. Exact validated ownership is required.

### Keep detection-only interruption behavior

- **ALT-009**: Continue reporting leaked preview resources without removing
  them.
- **ALT-010**: **Rejected.** ADR-0024 and the threat model require deterministic
  teardown, not only detection.

## API, data, adapter, catalog, license, supply-chain, security, and operability effects

- **API-001**: No public route, request/response, event, Graph, lifecycle,
  verification, or compatibility serialization changes. The lease is internal
  to the acceptance process and remains at
  `factory.local-preview-lease/v1` for this experiment.
- **DAT-001**: No Prisma schema, migration, persistent record, seed contract,
  retention rule, or durable conversion. All experimental state remains in the
  existing run-owned shared volume and is deleted at teardown.
- **ADP-001**: No editor, AI, Git, provider, database, deployment, or external
  runtime adapter changes. Existing local preview start/stop boundaries are
  composed with stricter ownership evidence.
- **CAT-001**: No capability, UI registry, recipe, Graph coordinate, or source
  provenance entry changes. The Restaurant V3 compiler target gains only the
  accepted local role-service topology and retains its existing bundle ID.
- **LIC-001**: No package or copied source is introduced; license notices and
  source-study records remain unchanged.
- **SUP-001**: `package.json`, workspace manifests, `pnpm-lock.yaml`, GitHub
  actions, and Docker image authorities remain byte-unchanged. No supply-chain
  input is added.
- **SEC-001**: Fixed process roles and exact Graph authorization preserve
  deny-by-default behavior. No credential, raw prompt/response, environment
  value, port, or request body enters tracked or reported evidence.
- **SEC-002**: All role services remain loopback-only. Docker access remains a
  privileged local operator boundary and gains no production safety claim.
- **SEC-003**: Lease validation prevents path traversal, symlink escape,
  shell interpolation, cross-run cleanup, and caller-chosen Compose identity.
- **OPS-001**: The generated preview starts two additional local processes from
  the same image. Acceptance becomes slower and uses two more randomized ports,
  but gains an observable live merchant path and deterministic interruption
  recovery.
- **OPS-002**: Cleanup failures remain product failures. Safe diagnostics may
  report only the validated run identity, bounded command status, and resource
  counts.

## Migration, rollback, abort conditions, and irreversible steps

- **MIG-001**: After standing acceptance and PM authorization, first record
  focused RED evidence; then add generated role services and fixed-role tests;
  then add lease transfer/validation and interruption cleanup; finally update
  the live E2E and PM evidence. The full acceptance stays serialized.
- **MIG-002**: Existing generated bundles are not migrated. New Compilations
  deterministically include the amended Compose target; immutable prior
  Compilations remain untouched.
- **ROLB-001**: Rollback is a normal non-force revert of only the accepted U4
  implementation commits. Removing the added services and lease handling
  returns new generations to the previous target; no data rollback is needed.
- **ROLB-002**: Before rollback or abort, stop the exact active leased preview
  and outer run project and prove their directory/container/network/volume
  counts are zero.
- **ABT-001**: Abort if implementation requires any Graph/API/verification
  version change, database migration, package or lockfile change, new image,
  client-selected role, authorization bypass, non-loopback bind, credential,
  provider call, cloud resource, deployment, or broad prefix deletion.
- **ABT-002**: Abort if a cashier action is required but not granted by the
  immutable Graph; observation may use cashier/manager read authority, but the
  experiment must not invent a transition.
- **ABT-003**: Abort if preview ownership cannot be validated exactly, teardown
  cannot be made idempotent and bounded, or any adversarial interruption leaves
  a directory, container, network, or volume.
- **ABT-004**: Abort if the generated file set becomes nondeterministic or an
  immutable Compilation is modified in place.
- **IRR-001**: No irreversible repository, data, infrastructure, publication,
  or deployment step is authorized. Immutable historical Compilations remain
  unchanged.

## Ownership and delivery boundaries

- **OWN-001**: The Tech Lead owns this proposed contract only. PM owns standing
  acceptance recording, task scope, path manifests, sequencing, and any
  implementation authorization.
- **OWN-002**: A compiler owner owns Restaurant V3 target/service generation and
  its focused tests. An acceptance owner owns runner lease handling and runner
  tests. The E2E spec is a serialized integration path and must have one writer.
- **OWN-003**: QA owns the real success and adversarial interruption evidence.
  A separate reviewer owns implementation and release judgment. The controller
  alone owns commit, push, PR, main integration, and final delivery actions.
- **OWN-004**: `packages/external-intake/**`, the parked R0 evidence, repository
  releases, Product Publish, providers, cloud systems, and deployment remain
  explicitly outside scope.
- **DEL-001**: Integration remains subject to `docs/delivery-policy.md`: exact
  accepted ledger state, P0/P1 `0/0`, green fresh local and CI gates, proven
  zero cleanup, clean U4 worktree, reviewed PR when available, non-force push,
  and release-gate rerun on the exact merged `main` commit.

## Verification plan and ledger evidence

- **VER-001**: Format this decision with
  `pnpm exec prettier --check docs/adr/adr-0032-local-acceptance-role-surfaces-and-preview-lease.md`.
- **VER-002**: Compiler RED/GREEN evidence runs
  `pnpm --filter @factory/compiler test -- restaurant-product-v3-target restaurant-runtime`
  and proves deterministic role services, loopback-only randomized port
  mappings, shared volume use, fixed startup actors, and failure before socket
  listen for missing, unknown, whitespace-padded, and case-mutated explicit
  acceptance roles. It also proves header, cookie, query, and body role
  overrides cannot change the fixed actor.
- **VER-003**: Runner RED/GREEN evidence runs
  `node --test scripts/local-product-acceptance.test.mjs` and includes invalid,
  conflicting, traversal, cross-run, duplicate, normal-exit, child-failure,
  SIGINT, and SIGTERM lease cases.
- **VER-004**: Worker/preview regression evidence runs
  `pnpm --filter @factory/compiler-worker test -- preview-runner queued-preview-run preview-dispatch-client`
  and must preserve exact preview identity and safe stop behavior.
- **VER-005**: The dedicated Playwright journey runs through
  `pnpm accept:local`. It must prove customer checkout, merchant observation,
  kitchen accept/start-preparing/mark-ready, terminal customer and merchant
  shared state, customer denial, exact required verification steps all passed,
  desktop/narrow accessibility, explicit stop, and zero cleanup counts.
- **VER-006**: A real adversarial harness interrupts at every preview ownership
  window: before the start request, after enqueue but before the start response,
  during Compose startup, after the start response but before readiness, and
  after readiness. After runner exit every case proves zero leased preview
  directories, containers, networks, and volumes and zero outer run resources.
  A mocked zero-count cleanup is not sufficient.
- **VER-007**: Fresh repository gates run `pnpm format:check`,
  `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`,
  `pnpm verify:third-party`, and `pnpm verify:source-studies`, followed by the
  exact supported Node CI matrix.
- **VER-008**: Before delivery, `git diff --check` passes and
  `git diff --exit-code 46b4d87a -- package.json pnpm-lock.yaml` proves no
  manifest or lockfile drift. Resource guards report all four cleanup counts
  as zero without secrets or raw model material.
- **VER-009**: PM records the ADR hash, independent reviewer identity and
  standing verdict, RED/GREEN commands and exit codes, exact U4 commit and CI
  run, live merchant outcome, adversarial interruption outcome, accessibility
  counts, and four zero cleanup counts in
  `docs/superpowers/ledgers/2026-08-31-post-v0.1-local-restaurant-readiness.md`.

## References

- `AGENTS.md`
- `docs/tech-governance.md`
- `docs/threat-model.md`
- `docs/delivery-policy.md`
- `docs/adr/adr-0021-generated-runtime-permission-actor-enforcement.md`
- `docs/adr/adr-0022-compiler-admission-permission-actor-additions.md`
- `docs/adr/adr-0023-v3-publish-compilation-launch-closure.md`
- `docs/adr/adr-0024-post-v0.1-local-operability-profile.md`
- `packages/compiler/src/targets/restaurant-v3/product-target.ts`
- `scripts/local-product-acceptance.mjs`
- `e2e/restaurant-template-acceptance.spec.ts`
