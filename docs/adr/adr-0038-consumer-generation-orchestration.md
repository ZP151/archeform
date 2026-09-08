---
title: "ADR-0038: Consumer Generation Orchestration"
status: "Proposed"
date: "2026-09-08"
authors: "Tech Lead"
tags: ["architecture", "decision", "consumer-generation", "orchestration"]
supersedes: ""
superseded_by: ""
---

# ADR-0038: Consumer Generation Orchestration

## Status

**Proposed** | Accepted | Rejected | Superseded | Deprecated

This is a Tech Lead proposal only. It is not founder acceptance,
implementation authority, D1 completion evidence, a release decision, or a
deployment decision. The founder must accept or reject it, directly or through
the exact standing independent-review policy in `docs/tech-governance.md`; PM
then records the decision and assigns any implementation work.

## Recommendation

**Keep** the current accepted Golden technology profile and existing Graph,
composition, lifecycle, compiler, verification, and local-preview contracts.
For the first D1 vertical slice, add only a Workbench-owned, session-scoped
orchestrator for a fresh Restaurant Describe request. It chooses the existing
deterministic `standard` composition alternative, applies the existing Draft,
then advances the existing immutable Publish -> Compile -> Verify -> local
Preview pipeline. Each failed phase stops with its existing bounded safe code
and one retry/start-over recovery action.

This proposal does not claim the full D1 exit. It enables one honest candidate
journey whose customer-to-merchant behavior, ten-case result, accessibility,
restart persistence, timing, and intervention rate still require measured
acceptance evidence.

The slice completes only Archeform's current supported Restaurant default.
The composed business model, role journeys, surfaces, seed data, and experience
come from the canonical Restaurant intent and experience brief; arbitrary
details in the user's rough brief do not yet parameterize those contracts.

## Context

- **CTX-001**: The current Workbench already interprets a transient brief,
  bounds clarification to two cycles, applies safe defaults, creates an
  idempotent product review, and asks the user to choose and apply a plan.
- **CTX-002**: `planProductAlternatives` defines `standard` as required
  capabilities plus every optional capability triggered by the accepted
  blueprint. `minimal` intentionally omits triggered optional capabilities.
  Therefore the platform's safe existing default is the exact `standard` key,
  never array position, model output, or an invented choice rule.
- **CTX-003**: `ProductCompositionService` already routes an accepted
  `restaurant-ordering` requirement through the canonical Restaurant V3
  composer and persists a `factory.application-graph/v3` Draft with
  `restaurant-dual-surface@1.0.0` origin. `applyComposedProduct` already opens
  that result through `openTemplateDraft`; it does not fall back to the generic
  V1 studio path.
- **CTX-004**: `useReleaseJourney` already performs Publish, Compilation,
  profile-derived verification, loopback Preview, and verified cleanup. It
  currently exposes each transition as a manual action and receives only the
  generic `remoteDraft` target, so a newly applied V3 Describe result does not
  automatically enter that pipeline.
- **CTX-005**: The smallest gap is Workbench orchestration and target binding.
  No Control Plane composition service, Graph schema, generated template,
  catalog, provider, database, queue, or Compose change is required.

## Current Accepted Golden Profile

The accepted profile remains the authority and is distinct from this proposed
consumer-journey behavior:

- **CUR-001**: Node.js `>=22.11.0 <23`, pnpm `9.0.0`, and TypeScript `^5.7.2`
  with exact lock resolution `5.9.3`.
- **CUR-002**: Next.js `^15.1.0` / `15.5.22`, React and React DOM `^19.0.0` /
  `19.2.8`, Puck `^0.22.3` / `0.22.3`, and XYFlow `^12.3.6` / `12.11.2`.
- **CUR-003**: NestJS common/core/platform-express `^10.4.15` / `10.4.22`,
  Prisma CLI/client `^6.1.0` / `6.19.3`, BullMQ `^5.34.10` / `5.81.2`, and
  compiler-worker ioredis `^5.4.2` / `5.11.1`.
- **CUR-004**: PostgreSQL remains `postgres:16-alpine`, Redis remains
  `redis:7-alpine`, and all tracked runtime Dockerfiles remain
  `node:22-alpine`. These are floating-major image tags, not patch pins.
- **CUR-005**: Docker Compose remains the isolated local topology. The Golden
  lifecycle remains mutable Draft -> immutable Published Graph -> immutable
  Compilation. The Golden serialized contract remains the currently
  implemented `factory.application-graph/v1`; accepted Restaurant V3 behavior
  remains the bounded path governed by ADR-0010 and ADR-0023, not a replacement
  for that Golden contract.

## Proposed Local Orchestration Profile

- **PRO-001**: A non-empty user-submitted brief remains the sole start signal.
  Raw brief text and raw provider responses remain transient and must not enter
  persistence, logs, evidence, screenshots, source, or generated artifacts.
- **PRO-002**: Continue the current interpretation and clarification rules.
  Ask only unresolved business access or rule questions. Appearance and
  optional content use current safe defaults; private access never defaults to
  public.
- **PRO-003**: Auto-continue only when the accepted product type is exactly
  `restaurant-ordering`, no clarification remains open, and the stored
  alternatives contain the exact key `standard`. Missing, duplicate, malformed,
  or changed alternatives fail closed; never select `minimal` or the first
  array entry as a fallback.
- **PRO-004**: Reuse, in order, the existing product endpoints for requirement,
  plan, choice, and apply. Reuse their request id, checksum, optimistic-state,
  idempotency, and serializable-transaction protections. Do not add an
  orchestration endpoint or allow the browser to manufacture a plan, Diff,
  Graph, Published identity, or Compilation identity.
- **PRO-005**: Bind the exact freshly applied
  `applicationGraphId@draftRevisionId` to one in-memory orchestration run. Only
  that fresh user-initiated Describe result may auto-release. Bootstrap apps,
  manually opened existing apps, edited Drafts, generic V1 results, and a
  page-refresh reconstruction remain outside automatic release.
- **PRO-006**: Advance one existing release action only after the preceding
  authoritative state reaches success: Publish, Compile, Verify, then Preview.
  StrictMode remounts, repeated renders, stale responses, retries, and target
  changes must not duplicate or skip a transition.
- **PRO-007**: Verification continues to omit a caller-selected profile so the
  worker derives its plan from the digest-bound Published Graph. A successful
  compilation without non-empty verification evidence is failure, never
  readiness.
- **PRO-008**: Readiness means verification succeeded and the preview worker
  reported a loopback `previewUrl`. Label the address as local. A build result,
  template snapshot, or pre-Publish preview is not the usable D1 result.
- **PRO-009**: On any bounded failure or timeout, stop automatic progression,
  show the safe phase/reason code, and offer exactly one relevant recovery:
  retry the failed safe/idempotent phase or start over. A worker-proposed Draft
  Diff remains review-only and is never auto-approved.
- **PRO-010**: Present this result as the supported Restaurant default. Do not
  claim that menu structure, fulfillment rules, roles, integrations, data
  model, or arbitrary supplied business detail were generated from the brief
  unless a later accepted contract actually binds and verifies those values.

## Contracts, Ownership, and Serialized Integration

- **CON-001**: Existing data artifacts remain unchanged:
  `factory.composition-plan/v1`, `factory.composition-decision/v1`,
  `factory.application-graph/v3` for the accepted Restaurant path, and
  `DraftPreviewSnapshotV2` for its ephemeral draft preview. Existing HTTP
  request/response shapes and bounded release diagnosis codes remain unchanged.
- **CON-002**: The Control Plane composition owner is the contract owner for
  the product requirement/plan/choice/apply endpoints and versioned composition
  artifacts. The D1 Workbench integration owner consumes them unchanged.
- **CON-003**: The existing artifacts are frozen enough for this frontend-only
  slice. They are not a standalone frozen versioned HTTP contract sufficient
  for disjoint frontend and backend mutations. Any endpoint, envelope, error,
  actor, authorization, Graph, or lifecycle change stops D1 and returns to a
  serialized contract decision.
- **CON-004**: Workbench orchestration and its focused tests are one serialized
  integration assignment. Generated templates, shared API/Graph contracts,
  Compose topology, and the end-to-end smoke remain serialized integration
  work even if later consumers use disjoint paths.

## Impact

- **IMP-001**: Catalog impact is zero. No registry entry, recipe, capability,
  version, asset lock, UI asset, source-study record, or license notice changes.
- **IMP-002**: API/data compatibility is additive at the Workbench behavior
  layer. Persisted Draft, Published, Compilation, verification, preview, and
  composition records retain their current shapes and identifiers. No data
  migration or historic revision rewrite occurs.
- **IMP-003**: Dependency, license, and supply-chain impact is zero. Manifests,
  lockfile, Dockerfiles, images, providers, and generated source are unchanged.
- **IMP-004**: Security boundaries remain unchanged. The server validates all
  untrusted interpretation and state transitions; the model cannot select
  packages, runtime, routes, code, providers, or tools. Preview stays loopback,
  isolated, quota/expiry bounded, and non-deployable. Credentials stay in local
  environment files and never enter the browser or generated app.
- **IMP-005**: Operability improves by removing six ordinary-user actions
  (plan choice, Diff apply, Publish, Compile, Verify, Preview start) from the
  eligible Restaurant path. Machine wait remains visible. Existing cleanup and
  explicit failure state remain available.
- **IMP-006**: Publish and Compilation create immutable local records by design.
  Rolling back the Workbench orchestrator cannot erase them; they remain
  inspectable lifecycle evidence. Preview teardown remains mandatory.

## Alternatives Considered

### Keep the manual plan and release controls

- **ALT-001**: Preserve the current review, choice, apply, and four release
  buttons.
- **ALT-002**: Reject because it cannot satisfy the approved D1 ordinary-user
  journey and adds no safety beyond the existing server-side gates.

### Add a Control Plane orchestration endpoint

- **ALT-003**: Create one backend request that composes, publishes, compiles,
  verifies, and starts preview.
- **ALT-004**: Reject for this slice because it introduces a new shared API and
  long-running operability contract while duplicating working idempotent phase
  endpoints. Reconsider only with a versioned contract and separate ADR if
  resumable cross-session orchestration becomes a measured requirement.

### Auto-select an arbitrary or minimal alternative

- **ALT-005**: Choose the first returned item or prefer `minimal`.
- **ALT-006**: Reject because order is not a safety contract and `minimal` may
  omit blueprint-triggered optional capabilities. Only exact `standard` has the
  existing deterministic full-blueprint meaning.

### Generalize automatic generation to every current product type

- **ALT-007**: Run generic V1, Expense Approval, Appointment, and unsupported
  custom requests through the same automatic path now.
- **ALT-008**: Reject for D1 because only the Restaurant Describe path is known
  to yield the accepted V3 dual-surface runtime. Broader claims require their
  own complete business-journey evidence and any missing contract decisions.

## Migration, Rollback, and Abort Conditions

- **MIG-001**: First add a failing Workbench journey test proving a fresh
  Restaurant brief currently stops at manual review and release actions. Then
  implement the session latch and automatic phase progression only in the
  Workbench paths listed below.
- **MIG-002**: No schema or data migration runs. Existing applications and
  manual release controls remain compatible and must not become automatic.
- **MIG-003**: Preserve `e2e/restaurant-v3.spec.ts` as the existing manual
  builder/edit/lifecycle acceptance. If automatic consumer mode changes its
  entry, make the test explicitly enter the retained advanced/manual path or
  add a separate consumer-mode case. Do not delete, skip, or weaken its edit,
  Publish, Compile, Verify, Preview, or cleanup assertions.
- **ROL-001**: Roll back by removing the Workbench automatic-effects/latch and
  restoring the existing manual rendering path. No backend or persisted-data
  rollback is required. Clean up any active preview through the current stop
  path; retain immutable Published and Compilation records.
- **ABT-001**: Abort implementation on any required dependency, provider,
  catalog, Graph/API/data contract, authorization boundary, Compose topology,
  template, or compiler-target change and dispatch a new concrete decision.
- **ABT-002**: Abort automatic progression if exact `standard` selection,
  Restaurant V3 adoption, immutable-source compilation, non-empty verification
  evidence, loopback preview, stale-response protection, or safe error
  redaction cannot be proven.

## Implementation Boundary

- **BND-001**: Expected product paths are
  `apps/workbench/lib/product-journey/use-product-journey.ts`,
  `apps/workbench/lib/product-journey/use-release-journey.ts`,
  `apps/workbench/hooks/use-workbench-controller.ts`, and the focused tests
  beside those modules. `apps/workbench/components/workbench-home.tsx` and
  `apps/workbench/components/workbench.tsx` may change only to present the
  automatic progress/result and explicit recovery state.
- **BND-002**: No product implementation is authorized in this ADR. Expected
  unchanged paths include `apps/control-plane/src/composition/`,
  `packages/graph/`, `packages/adapters/`, `packages/capabilities/`,
  `packages/product-recipes/`, `packages/compiler/`, `infra/`, manifests, and
  `pnpm-lock.yaml`.

## Measurable Verification Plan

- **VER-001**: Focused hook tests prove exact `standard` selection, no array
  fallback, one choice/apply call under StrictMode, adoption of the returned V3
  draft identity, ordered one-time Publish/Compile/Verify/Preview calls, and no
  auto-release for existing, generic, edited, refreshed, or failed targets.
- **VER-002**: Failure tests cover each phase, timeouts, stale responses,
  target changes, missing/duplicate `standard`, empty verification evidence,
  worker Draft Diff refusal to auto-apply, and preview cleanup failure. Assert
  safe codes only; never snapshot raw brief/provider material.
- **VER-003**: Run `pnpm --filter @factory/workbench test` and
  `pnpm --filter @factory/workbench typecheck`, then the accepted product lane
  `node scripts/regression.mjs product`.
- **VER-004**: In the prepared local environment, run the existing local
  Doctor and one serialized end-to-end Restaurant Describe smoke. Prove the
  customer submits an order, merchant receives and fulfills it, customer sees
  status, duplicate submission is idempotent, unauthorized action is denied,
  verification evidence is non-empty, preview is loopback, and teardown is
  confirmed.
- **VER-006**: Run the unchanged-strength manual Restaurant V3 acceptance and
  the new automatic default acceptance as distinct cases. The automatic case
  must assert the supported-default disclosure and must not assert prompt
  fidelity for business fields the canonical composer does not consume.
- **VER-005**: Record the revision, environment, cases, numerator/denominator,
  question counts, active-user and machine time, repairs, developer rescues,
  failure code, restart-persistence result, and highest-impact defect in
  `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`. Ten
  structured cases and responsive/accessibility evidence are required before
  claiming the D1 exit; this ADR alone proves none of them.

## References

- **REF-001**: `AGENTS.md`, `docs/tech-governance.md`, and
  `docs/threat-model.md`.
- **REF-002**: `docs/adr/adr-0010-restaurant-product-graph-v3-and-ui-registry-boundary.md`,
  `docs/adr/adr-0023-v3-publish-compilation-launch-closure.md`, and
  `docs/adr/adr-0032-local-acceptance-role-surfaces-and-preview-lease.md`.
- **REF-003**: `docs/superpowers/plans/2026-09-07-consumer-generation-delivery.md`
  and `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`.
