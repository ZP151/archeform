---
title: "ADR-0048: Approval Consumer Orchestration"
status: "Proposed"
date: "2026-09-09"
authors: "Tech Lead"
tags: ["architecture", "decision", "consumer-generation", "approvals"]
supersedes: ""
superseded_by: ""
---

# ADR-0048: Approval Consumer Orchestration

## Status

**Proposed** | Accepted | Rejected | Superseded | Deprecated

This is a Tech Lead proposal only. It grants no implementation, Product
Publish, repository release, provider call, cloud action, or deployment
authority. The founder must accept or reject it directly or through the exact
standing independent-review policy in `docs/tech-governance.md`; PM then
records the decision and assigns implementation work.

## Recommendation

**Keep** the current accepted Golden technology profile and the existing
requirement, blueprint, composition, Graph, lifecycle, compiler, verification,
and local-preview contracts. Extend only the Workbench consumer orchestrator
so an accepted, semantically complete approval blueprint can select its exact
`standard` plan, bind the freshly applied V1 Draft, and reuse the existing
Publish -> Compile -> Verify -> loopback Preview sequence.

The D2.1 slice supports the current local Expense Approval-style runtime. It
does not claim hosted authentication, tenant separation, requester-owned row
privacy, or arbitrary workflow generation. Current generated identities are
selectable local-fixture roles and permissions are role-level. If acceptance
requires one requester to see only their own record, implementation stops and
reports the missing identity/ownership contract before product changes.

D2.1 removes technical delivery handoffs; it does not declare the approval
family mature. The current generated generic UI renders records as JSON, uses
text inputs for every field, offers workflow events without current-state
filtering, and provides no clear create-success feedback. Measured D2.1 runtime
acceptance may dispatch a separate reuse-first D2.2 presentation proposal; it
cannot silently add template, compiler, or UI-registry work here.

## Context

- **CTX-001**: ADR-0038 delivered automatic orchestration only when
  `RequirementSpecV1.productType` is `restaurant-ordering`. Generic V1 apply
  currently calls `bootstrapGraph`, returns `null`, and opens Page Studio, so
  the consumer hook cannot bind the exact applied V1 Draft for release.
- **CTX-002**: The generic composer already validates
  `factory.requirement-spec/v1`, checksum-bound
  `factory.product-blueprint/v1`, and the authoritative stored
  `factory.composition-plan/v1`. Apply runs in the existing serializable
  transaction and produces a new V1 Draft revision.
- **CTX-003**: `hasApprovalDecision` is true when any actor has either an
  `approve` or `reject` permission. It influences audit/notification derivation
  but does not prove submission, both decision outcomes, reviewer read access,
  requester result access, or a usable set of pages. The current generic
  product capability catalogue does not select `core.approvals` at all;
  approval behavior is represented by exact workflow transitions and policy
  grants.
- **CTX-004**: The canonical Expense Approval fixture has no `productType`.
  Real interpretation may classify the same semantics as `workflow`.
  Requirement IDs, titles, labels, and free-text acceptance prose are not safe
  family selectors.
- **CTX-005**: `bootstrapGraph` invalidates the consumer request token and
  returns no identity. A naive return value would allow a late or superseded
  bootstrap to seed release for the wrong Draft. Exact application ID,
  revision number, Draft revision ID, request token, and session binding are
  required.
- **CTX-006**: The generated generic runtime already executes create,
  submit, approve/reject, role denial, and result reads, but its generic
  presentation is demonstrably rough. D2.1 may prove that current runtime; it
  does not authorize generated presentation changes or count a runnable URL as
  ordinary-user approval-family acceptance.

## Current and Proposed Golden Profiles

### Current accepted Golden profile

- **CUR-001**: Node.js `>=22.11.0 <23`, pnpm `9.0.0`, TypeScript `^5.7.2`
  resolved `5.9.3`, and tracked `node:22-alpine` runtime images.
- **CUR-002**: Next.js `^15.1.0` resolved `15.5.22`, React/React DOM
  `^19.0.0` resolved `19.2.8`, Puck `^0.22.3` resolved `0.22.3`, and XYFlow
  `^12.3.6` resolved `12.11.2`.
- **CUR-003**: NestJS `^10.4.15` resolved `10.4.22`, Prisma `^6.1.0`
  resolved `6.19.3`, BullMQ `^5.34.10` resolved `5.81.2`, compiler-worker
  ioredis `^5.4.2` resolved `5.11.1`, `postgres:16-alpine`,
  `redis:7-alpine`, and the existing Docker Compose topology.
- **CUR-004**: The implemented Golden Graph serialization is
  `factory.application-graph/v1`. The lifecycle remains mutable Draft ->
  immutable Published Graph -> immutable Compilation. The accepted Restaurant
  V3 path remains a bounded additive path under ADR-0010 and ADR-0023.

### Proposed local orchestration profile

- **PRO-001**: There is no proposed Golden technology transition. Keep every
  coordinate in **CUR-001** through **CUR-004**, all manifests and lockfile
  resolutions, and every service, database, queue, image, port, provider,
  compiler target, and Compose edge unchanged.
- **PRO-002**: Keep `factory.requirement-spec/v1`,
  `factory.product-blueprint/v1`, `factory.composition-plan/v1`,
  `factory.composition-decision/v1`, `factory.application-graph/v1`, and
  the current generic capability catalogue unchanged. Its exact standard lock
  set is `core.crud@1.0.1`, `core.workflow@1.0.1`,
  `core.identity-policy@1.0.0`, `core.policy-declarations@1.0.0`,
  `core.audit@1.0.2`, and workflow-triggered
  `core.notification@1.1.1`. `core.approvals@1.0.0` remains an existing asset
  outside this catalogue and is not added by this decision. No new API or
  data-contract version is introduced.
- **PRO-003**: Preserve the current Restaurant eligibility and V3 fresh-target
  behavior byte-for-byte in intent. Approval eligibility is a separate
  semantic branch; it never replaces or broadens the Restaurant selector.
- **PRO-004**: Approval auto-continuation requires `manualReview === false`, no
  unresolved material question, `spec.productType` absent or exactly
  `workflow`, one valid alternative keyed exactly `standard`, and no duplicate
  or malformed alternative. `commerce`, `custom`, unsupported values, and all
  ambiguous cases remain manual.
- **PRO-005**: Reparse the accepted spec and blueprint and require
  `blueprint.requirementChecksum === hashRequirementSpec(spec)`. Reparse the
  exact `standard` plan and require compatibility `compatible`, its
  `requirementChecksum` to equal the same spec hash, and exactly the six
  capability locks and versions in **PRO-002**, with no missing, duplicate, or
  unrelated lock.
- **PRO-006**: Derive one unique approval candidate from structure, never from
  a requirement ID, title, label, prose keyword, first entity, or broad entity
  guess. For one workflow entity `E`, require: requester role `R` has
  `create`, `read`, and `submit` on `E`; an exact `submit` transition enters a
  review state; a distinct decision role `D` has `read`, `approve`, and
  `reject` on `E`; and exact `approve` and `reject` transitions leave that same
  review state for two distinct outcome states under `D`. Multiple matching
  workflows, requesters, or decision roles fail closed to manual review.
- **PRO-007**: Require a `form` page intent for `E`, a `queue` page intent for
  `E`, and at least one `detail` or `list` page intent for `E`. This is the
  bounded route/read guard for submit, review, and result surfaces. Missing,
  unbound, or ambiguous entity/page relationships do not fall back to the
  first Graph entity.
- **PRO-008**: Require the standard plan's `core.workflow` `flowKey` binding
  to equal `graph.flow.<the unique approval workflow key>` and its `core.crud`
  `entityKey` binding to equal `graph.domain.E`. Require the `core.crud`
  `routeKey` binding to name the exact declared primary list page for `E`.
  Missing, duplicate, or mismatched bindings remain manual. The plan remains
  server-authored and checksum-bound; the browser cannot synthesize locks,
  bindings, Diff, Graph, Published identity, or Compilation identity.
- **PRO-009**: Reuse the existing `chooseAlternative("standard")` and
  `applyComposedProduct({ resetJourney: false })` calls. Material questions and
  the existing manual-review opt-out keep the review surface manual. Missing
  eligibility produces no error and performs no lifecycle call.
- **PRO-010**: For generic V1 apply, retain one controller-owned consumer
  request token through bootstrap. Seed a `ReleaseTarget` only after the
  returned local Draft matches the apply result's exact application Graph ID
  and revision number; use its server-issued Draft revision ID. A newer
  bootstrap, application open, start-over, session change, unmount, mismatch,
  rejection, or late response returns `null`, clears no newer target, and
  advances no release phase.
- **PRO-011**: Once the exact fresh target is captured, reuse ADR-0038's phase
  latches, revision binding, cancellation behavior, bounded retry, verification
  evidence requirement, loopback URL check, and cleanup behavior. Existing,
  manually opened, initial-bootstrap, edited, refreshed, or reconstructed
  Drafts never auto-release.
- **PRO-012**: Parameterize the existing Workbench `ConsumerDelivery` section
  with the accepted blueprint family/title and local-demo approval copy. Reuse
  the component and CSS, and make the existing advanced manual-review label
  family-neutral. The copy states that users select local demo roles, reviewers
  can decide records by declared role permissions, and the result is local; it
  does not claim private hosted access or real identity.
- **PRO-013**: Freeze the frontend family classifier as
  `consumerFamilyFor(journey: ProductJourneyController):
  "restaurant-ordering" | "approval" | null` in
  `apps/workbench/lib/product-journey/consumer-family.ts`. It returns
  `restaurant-ordering` under the existing ADR-0038 predicate, `approval` only
  under **PRO-004** through **PRO-008**, and `null` for every ambiguity or
  parse failure. The consumer controller exposes the same union as `family`
  and retains the existing `suppliedMenu` field for Restaurant copy.

The current accepted Golden profile remains distinct from this proposed
Workbench behavior. None of **PRO-003** through **PRO-012** exists as accepted
behavior until the founder gate and PM record are complete.

## Contract, Catalog, Security, and Operability

- **CON-001**: `ProductCompositionService` remains owner of the existing
  requirement/blueprint/plan/choice/apply contracts. The D2 Workbench
  integration owner consumes those contracts unchanged and owns fresh-target
  adoption and presentation.
- **CON-002**: Existing versioned artifacts are frozen enough for this
  frontend-only slice because no backend writer is needed. They are not frozen
  authority for disjoint frontend/backend changes. Any endpoint, envelope,
  error, actor, authorization, Graph, binding, or lifecycle change stops the
  slice and returns to serialized contract ownership.
- **CON-003**: Generated templates, shared API/Graph contracts, Compose
  topology, and end-to-end smoke remain serialized integration work. This ADR
  authorizes no parallel writer wave.
- **CAT-001**: Catalog impact is zero. No capability, product recipe, screen
  recipe, UI registry asset, template, key, digest, provenance, license, or
  source-study record changes.
- **API-001**: API and data compatibility are unchanged. Existing persisted
  reviews, plans, decisions, V1 Drafts, Published revisions, Compilations,
  verification records, and preview records keep their exact shapes and
  identifiers; historic immutable records are not rewritten.
- **SUP-001**: Dependency, license, and supply-chain impact is zero. No
  manifest, lockfile, package, copied source, Dockerfile, or image changes.
- **SEC-001**: Boundary parsing and server-side plan/apply checks remain
  authoritative. Eligibility only removes Workbench clicks; it grants no new
  permission and cannot bypass Draft revision, checksum, idempotency,
  authorization, Publish, worker, verification, or loopback-preview gates.
- **SEC-002**: The browser remains untrusted. Raw briefs and provider responses
  remain transient and absent from persistence, logs, evidence, source, and
  generated artifacts. Credentials and worker tokens remain server-bound.
- **SEC-003**: Local-fixture sessions are demo identities selectable by role.
  Current `read` grants are role-wide rather than requester-owned row filters.
  This slice may demonstrate exact-role action denial and requester-visible
  outcomes locally; it may not label them private, authenticated, tenant-safe,
  or production-ready.
- **OPS-001**: Operability reuses the current local release state machine,
  timeouts, idempotent retries, visible safe failure codes, loopback URL
  admission, preview quotas/expiry, and teardown. No external resource or
  deployment is created.

## Consequences

### Positive

- **POS-001**: A supported approval blueprint reaches a runnable local result
  without plan, Diff, Publish, Compile, Verify, or Preview handoffs.
- **POS-002**: Eligibility is derived from checksum-bound contracts and exact
  role/workflow/page/binding semantics, so unrelated products remain manual.
- **POS-003**: Restaurant behavior and all server lifecycle/security gates are
  preserved while the Workbench component is reused for a second family.

### Negative

- **NEG-001**: The frontend predicate deliberately rejects approval-shaped
  products with multiple candidate workflows or incomplete page/binding
  semantics even if a human could infer the intended journey.
- **NEG-002**: The first result remains a local demo with fixture role
  selection and role-wide reads. It does not satisfy private multi-user use.
- **NEG-003**: Fresh V1 adoption adds controller coordination around two
  request counters and exact revision matching; focused race tests are
  required to prevent stale release targets.
- **NEG-004**: The current generic record presentation is suitable for
  bounded runtime proof, not approval-family maturity. Raw JSON, generic text
  controls, unfiltered event buttons, and weak success feedback remain a
  measured D2.2 gap.

## Alternatives Considered

### Keep every approval handoff manual

- **ALT-001**: Preserve plan choice, Diff apply, and four release actions.
- **ALT-002**: Reject for the bounded current runtime because the existing
  server gates already protect every transition and manual clicks do not add a
  missing identity or privacy control.

### Use `hasApprovalDecision` or add the approval asset

- **ALT-003**: Auto-run any blueprint with one approve/reject permission, or
  add `core.approvals@1.0.0` to the generic catalogue solely as an eligibility
  marker.
- **ALT-004**: Reject because those signals do not prove submit, both outcomes,
  distinct decision authority, result read access, surfaces, or matching plan
  bindings. Adding the asset would also create an unnecessary catalog and
  composition change.

### Select by Expense names or requirement product type only

- **ALT-005**: Match requirement ID/title keywords, first entity, fixture
  names, or require a hard-coded Expense product type.
- **ALT-006**: Reject because the fixture omits `productType`, generated names
  are untrusted business text, and naming cannot establish authorization or
  workflow semantics.

### Add an orchestration or approval backend API

- **ALT-007**: Introduce one endpoint or shared contract that performs the
  full sequence.
- **ALT-008**: Reject for this slice because existing phase endpoints and
  server checks already provide the required closure; a new API would widen
  shared compatibility and operability scope.

### Claim private approval from local role checks

- **ALT-009**: Present local-fixture role denial as real user authentication
  and per-request privacy.
- **ALT-010**: Reject because the runtime has selectable fixture sessions and
  no requester ownership predicate. Hosted identity and row privacy require a
  separate accepted contract before such a claim.

## Migration, Rollback, Abort Conditions, and Ownership

- **MIG-001**: After acceptance, one Workbench integration owner first adds
  failing focused eligibility and V1 adoption-race tests, then implements the
  semantic predicate, exact fresh-target binding, existing component
  parameterization, and one provider-free consumer smoke.
- **MIG-002**: The exact proposed implementation manifest is limited to:
  `apps/workbench/lib/product-journey/consumer-family.ts`,
  `apps/workbench/lib/product-journey/use-consumer-generation.ts`,
  `apps/workbench/lib/product-journey/use-consumer-generation.test.tsx`,
  `apps/workbench/hooks/use-workbench-controller.ts`,
  `apps/workbench/hooks/use-workbench-controller.test.ts`,
  `apps/workbench/components/workbench-home.tsx`,
  `apps/workbench/components/workbench-home.test.tsx`, and
  `apps/workbench/components/journey/requirement-composer.tsx`. The
  classifier's table coverage lives in the existing consumer-hook test; the
  copy-only composer change requires no new mirrored implementation test.
- **MIG-003**: No schema or data migration runs. Preserve Restaurant consumer
  cases and the advanced/manual path. Root remains serialized owner of the
  separate provider-free acceptance evidence paths:
  `apps/workbench/test/consumer-generation-fixture.ts`,
  `apps/workbench/e2e/consumer-generation.pw.ts`,
  `apps/workbench/e2e/consumer-approval.pw.ts`, and
  `e2e/consumer-approval.spec.ts`. They reuse the existing accepted fixture
  and do not call a model provider. They are not additional product-code scope.
- **ROL-001**: Rollback reverts the eight Workbench paths and restores approval
  products to manual review. Existing immutable Published revisions and
  Compilations remain valid evidence and are never deleted or rewritten;
  preview teardown still runs.
- **ABT-001**: Abort on any need for a Graph/API/data version, new capability or
  recipe, generated template/compiler/provider/identity change, Compose change,
  data migration, package, external resource, or deployment.
- **ABT-002**: Abort if eligibility needs title, requirement ID, free-text,
  first-entity, or array-order inference; if the plan binding does not match the
  unique semantic workflow; or if a late/mismatched V1 Draft can seed release.
- **ABT-003**: Abort and report a contract gap before implementation if the
  requested outcome includes requester-owned row privacy, real authentication,
  tenant separation, nonlocal access, or approval semantics beyond the exact
  current predicate. There are no irreversible steps in this proposal.
- **ABT-004**: Record the generic generated presentation findings after D2.1
  runtime acceptance. Do not expand D2.1 to edit compiler output or add a UI
  asset. Any D2.2 work starts with reuse-first inspection and a separate
  governance decision if it changes a generated template, compiler target, or
  registry contract.

## Measurable Verification

- **VER-001**: Focused hook tests prove the canonical approval fixture auto-
  selects the sole `standard` plan, captures its exact V1 Draft, and advances
  Publish -> Compile -> Verify -> loopback Preview once per phase while all
  existing Restaurant tests remain unchanged.
- **VER-002**: Table tests keep manual mode for material questions, manual
  opt-out, `commerce`/`custom`, missing or duplicate standard plans, malformed
  contracts, checksum mismatch, incompatible plans, wrong/missing/duplicate
  generic lock sets or workflow/CRUD bindings, same requester/reviewer, absent
  read/submit/both decisions, ambiguous workflows, and absent or misbound
  form/queue/result pages. Tests also prove that an unrelated
  `core.approvals` asset does not establish eligibility. No test uses names or
  prose as eligibility evidence.
- **VER-003**: Controller tests prove exact application ID and revision-number
  matching, capture of the returned Draft revision ID, and refusal of stale,
  late, superseded, mismatched, failed, start-over, and unmounted V1 bootstraps.
  Each refusal makes zero lifecycle calls and cannot clear a newer target.
- **VER-004**: Component tests prove the same `ConsumerDelivery` section
  renders family-appropriate title/status/copy, labels the result a local demo,
  makes no private, hosted, tenant, or real-identity claim, and retains a
  family-neutral manual-review opt-out.
- **VER-005**: Run
  `pnpm --filter @factory/workbench test -- lib/product-journey/use-consumer-generation.test.tsx hooks/use-workbench-controller.test.ts components/workbench-home.test.tsx components/journey/requirement-composer.test.tsx`
  and `pnpm --filter @factory/workbench typecheck`. Both commands must exit
  zero with no skipped focused case.
- **VER-006**: Run
  `pnpm exec playwright test --config apps/workbench/playwright.config.ts consumer-generation.pw.ts consumer-approval.pw.ts`
  with one worker and zero retries. It must prove one approval local-demo
  readiness path, one semantic near-miss that remains manual with zero release
  calls, existing Restaurant readiness, and retained advanced/manual behavior.
- **VER-007**: Run the serialized provider-free
  `e2e/consumer-approval.spec.ts` with one worker and zero retries. It must
  complete create -> submit -> reviewer approve or reject -> requester result,
  prove one denied cross-role transition, retain persisted state through the
  local runtime, and record the rough-presentation findings separately from
  lifecycle readiness. A loopback URL or HTTP 200 alone does not pass.
- **VER-008**: Run Prettier on the eight-path implementation manifest and four
  serialized evidence paths, then
  `git diff --check`. PM records exact commands, exit codes, counts, duration,
  changed-path manifest, reviewer verdict, and safe acceptance evidence in
  `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`.

## References

- **REF-001**: `AGENTS.md`, `docs/tech-governance.md`, and
  `docs/threat-model.md`.
- **REF-002**: ADR-0038, ADR-0007, ADR-0008, ADR-0021, ADR-0022, and ADR-0023.
- **REF-003**: `packages/graph/src/product-blueprint.ts`,
  `packages/capabilities/src/plan-alternatives.ts`, and
  `packages/capabilities/src/product-composer.ts`.
- **REF-004**:
  `apps/control-plane/src/composition/product-composition.service.ts` and
  `apps/workbench/hooks/use-workbench-controller.ts`.
- **REF-005**:
  `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`.
