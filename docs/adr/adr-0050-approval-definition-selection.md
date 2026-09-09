---
title: "ADR-0050: Approval Definition Selection"
status: "Proposed"
date: "2026-09-09"
authors: "Tech Lead"
tags: ["architecture", "decision", "requirements", "approvals"]
supersedes: ""
superseded_by: ""
---

# ADR-0050: Approval Definition Selection

## Status

**Proposed** | Accepted | Rejected | Superseded | Deprecated

This is a Tech Lead proposal only. It grants no implementation, provider call,
Product Publish, repository release, cloud action, or deployment authority. The
founder must accept or reject it directly or through the exact standing
independent-review policy in `docs/tech-governance.md`; PM then records the
decision and assigns implementation work.

## Recommendation

**Experiment** with one private `expense-approval` definition-selection branch
inside the existing OpenAI requirement adapter. A compact, schema-constrained
selection projects the current complete canonical Expense Approval definition;
it does not ask the model to reproduce that full blueprint. The projected
public interpretation continues through the unchanged generic planner,
composer, Workbench approval predicate, Draft -> Publish -> immutable
Compilation lifecycle, and generated runtime.

This experiment supports the existing local demo: employees submit expenses,
managers approve or reject them, and finance can audit them. Identities remain
explicitly selectable fixture roles and reads remain role-wide. Requests for
external identity, tenant isolation, requester-owned row privacy, withdrawal,
return-and-resubmit, a different approval authority, or changed required-field
rules remain material questions and never silently select the default.

## Context

- **CTX-001**: The first genuine D2 approval interpretation returned HTTP 200,
  but Workbench showed manual **Choose** and performed zero lifecycle actions.
  The raw response was correctly not retained, so its exact mismatch is
  unknown and must not be reconstructed or claimed.
- **CTX-002**: The private provider result permits `definition-selection` only
  for `restaurant-ordering`. Every non-Restaurant request must currently emit
  a complete `factory.product-blueprint/v1`, while the Workbench approval
  family requires one exact, unambiguous workflow, permissions, pages, plan,
  bindings, and six-lock standard composition.
- **CTX-003**: Provider-free probes show the structural gap: the canonical
  Expense blueprint is compatible and consumer-ready, while removing its queue
  page, adding a second Expense result list, or omitting reviewer read access
  can remain valid or planner-compatible but fail the consumer predicate.
  Split reviewer permissions fail Blueprint schema validation. These authored
  variants demonstrate reachable semantic ambiguity; they do not claim to be
  the unretained provider response.
- **CTX-004**: `expenseApprovalInterpretation()` in
  `packages/adapters/src/requirements/fixture-interpreter.ts` is the current
  deterministic test authority for the D2 default. Its public envelope digest
  is SHA-256
  `6bb06e85fa6a33e3eef1b8ba39770dc6bfb55cc9f882c52fd46a9211f73587d8`;
  its requirement checksum is
  `sha256:4e62ff6314a43affe62a823ad0d7be7db53dc43336582dab9c480f692e5cd37d`.
  It contains three actors, two entities, six page intents, one workflow, and
  zero questions.
- **CTX-005**: The older `expense-approval` composition recipe and
  `composeDefaultCapabilityDraft` profile are different authorities. Their
  hand-built amount/description/status model and `core.approvals` composition
  are not the accepted D2 amount/category/date/receipt/notes definition or its
  current six-lock standard plan.

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
- **CUR-004**: `@factory/adapters` is private version `0.1.0`, with OpenAI
  `^4.77.0` resolved `4.104.0` and Zod `^3.24.1` resolved `3.25.76`. The
  implemented Golden Graph remains `factory.application-graph/v1` and the
  lifecycle remains mutable Draft -> immutable Published Graph -> immutable
  Compilation.

### Proposed private interpretation experiment

- **PRO-001**: There is no proposed Golden technology transition. Keep every
  coordinate in **CUR-001** through **CUR-004**, all manifests, lockfile
  resolutions, packages, services, databases, queues, images, ports, providers,
  compiler targets, and Compose edges unchanged.
- **PRO-002**: Add a private `ApprovalDefinitionSelectionV1` Zod schema in the
  adapters package. It is a transient provider-output type governed by private
  package version `0.1.0`, not a new `factory.*` public serialization identifier
  or package export. It has exactly: `definitionKey: "expense-approval"`;
  `disposition: "supported-default" | "needs-clarification"`; safe bounded
  `requirementId`, `title`, and `outcome`; `materialQuestions` using the current
  authorization, visibility, role, business-rule, data, and integration
  categories; and `businessParameters: null`. Unknown keys fail strict parsing.
- **PRO-003**: Extend the existing private `definitionSelection` union with the
  approval schema, discriminated by `definitionKey`. Keep the mutually
  exclusive `definition-selection` versus `generated-blueprint` result shape,
  strict JSON schema, bounded repair behavior, no-storage request policy, and
  Restaurant branch unchanged. Projection switches only on the validated
  definition key.
- **PRO-004**: Extract the current complete Expense fixture definition into the
  private requirements module as one first-party canonical builder. The
  fixture interpreter and production projector both call it. With the fixture's
  current constants, serialization must preserve the exact envelope digest and
  requirement checksum in **CTX-004**. This extraction creates no capability,
  recipe, Graph, API, or package-root export.
- **PRO-005**: The canonical business structure remains exact: employee,
  manager, and finance actors; Expense amount/category/date/receipt/notes and
  Employee name/department entities; dashboard/list/form/detail/queue/settings
  page intents; draft/submitted/approved/rejected states; employee submit;
  manager approve and reject; and the existing employee, manager, and finance
  journeys. The projector substitutes only the validated requirement ID, title,
  outcome, and material questions, then recomputes the existing requirement
  checksum. It returns `businessParameters: null`.
- **PRO-006**: `supported-default` requires zero material questions and means
  the request accepts the exact structure in **PRO-005**, including canonical
  requiredness, enum values, role-wide reads, selectable demo roles, one manager
  decision level, and no return, withdrawal, or external integration. A coarse
  Expense Approval request may accept those defaults. A detailed request may
  accept them only when its explicit requirements are compatible.
- **PRO-007**: Any explicit or ambiguous change to approval authority,
  visibility, identity, tenant boundary, data/requiredness, workflow, or
  integration yields `needs-clarification` with at least one material question.
  It stays on the existing manual clarification path and is ineligible for
  consumer continuation. The adapter does not approximate unsupported requests
  with the default after clarification.
- **PRO-008**: Keep `factory.requirement-interpretation-result/v1`,
  `factory.requirement-spec/v1`, `factory.product-blueprint/v1`,
  `factory.composition-plan/v1`, `factory.composition-decision/v1`, and
  `factory.application-graph/v1` unchanged. Keep the accepted standard lock set
  unchanged: `core.crud@1.0.1`, `core.workflow@1.0.1`,
  `core.identity-policy@1.0.0`, `core.policy-declarations@1.0.0`,
  `core.audit@1.0.2`, and `core.notification@1.1.1`. Do not add or alter
  `core.approvals@1.0.0`.
- **PRO-009**: Keep ADR-0048's Workbench consumer predicate exact. Canonical
  projection must satisfy it; ambiguous or model-generated variants must not
  loosen it. Repeated Describe requests retain current new-application
  semantics: each interpretation carries its request's validated requirement
  ID and downstream creation remains independent. Add no caching, deduplication,
  identity migration, or historic-record rewrite.

The current accepted Golden profile is the sole accepted profile. **PRO-002**
through **PRO-009** remain a proposed private adapter experiment until the
founder gate and PM record are complete.

## Contract, Catalog, Security, and Operability

- **CON-001**: The requirements adapter owner owns the private selection schema,
  JSON Schema parity, prompt instruction, canonical projection, and fixture
  preservation. Product Composition remains owner of the unchanged public
  requirement/blueprint/plan contracts. Workbench remains owner of the
  unchanged consumer predicate and release lifecycle.
- **CON-002**: The public Graph/API/data artifacts are frozen enough for this
  adapter-only implementation because no frontend or backend contract writer is
  required. The private provider schema and canonical builder are serialized
  integration work under one adapters owner; they are not frozen for disjoint
  writers. Generated templates, shared contracts, Compose topology, and the
  end-to-end acceptance run also remain serialized.
- **CAT-001**: Catalog impact is zero. No capability lock, composition recipe,
  product recipe, UI registry item, template, identifier, digest, provenance,
  license, or source-study record changes.
- **API-001**: API and data compatibility are unchanged. Existing persisted
  interpretations, plans, decisions, Graph revisions, Published revisions,
  Compilations, verification results, and previews remain valid and are never
  rewritten. The provider-output selection is transient and private.
- **SUP-001**: Dependency and supply-chain impact is zero. Add no dependency,
  manifest entry, lockfile change, copied source, Dockerfile, or image.
- **SEC-001**: The model selects a bounded definition; it does not author the
  Graph permissions used by this branch. Strict boundary parsing, local
  canonical projection, public schema validation, plan checksum checks, server
  authorization, and immutable lifecycle gates remain authoritative.
- **SEC-002**: Raw briefs, prompts, provider selections/responses, credentials,
  and real-user business fields remain absent from logs, persistence,
  screenshots, metrics, and evidence. ADR-0049 acceptance screenshots may show
  only declared synthetic generated-business values; they never show provider
  raw material, credentials, or real-user data. No credential or provider
  material is introduced by this experiment.
- **SEC-003**: Selectable demo roles and role-wide reads remain visible
  limitations. The experiment makes no authentication, tenant, requester-owned
  privacy, or hosted-production claim. Such requirements produce material
  questions under **PRO-007**.
- **OPS-001**: The compact selection reduces provider output size and removes
  full-blueprint structural variance for the supported default. It adds no
  provider call, retry, background job, runtime service, deployment, or external
  resource. Existing bounded schema/semantic repair and safe error status
  mapping remain unchanged.

## Consequences

### Positive

- **POS-001**: Coarse and detailed compatible Expense Approval requests can
  reach the already accepted canonical planner and consumer contracts without
  relying on the model to reproduce a large blueprint exactly.
- **POS-002**: One shared private canonical builder prevents production and
  fixture definitions from drifting while preserving the fixture authority
  byte-for-byte.
- **POS-003**: Material authorization, privacy, identity, and workflow requests
  remain questions rather than silently changing security or business rules.

### Negative

- **NEG-001**: The branch deliberately supports one narrow Expense Approval
  default. Other approval domains and explicit variants still require manual
  handling.
- **NEG-002**: Prompt classification remains model-dependent. Provider-free
  tests prove parser, projection, and fail-closed behavior, but cannot prove the
  behavior of a later genuine provider response.
- **NEG-003**: Moving the canonical fixture source into a shared private module
  increases the importance of the fixed digest guard and single-writer review.

## Alternatives Considered

### Strengthen the full-blueprint prompt only

- **ALT-001**: Add more instructions requiring the exact pages, permissions,
  workflow, and bindings while retaining `generated-blueprint` for approvals.
- **ALT-002**: Reject because valid or planner-compatible near-misses still
  exist and schema repair cannot establish consumer readiness. This leaves the
  model responsible for unnecessary structural reproduction.

### Loosen the Workbench approval predicate

- **ALT-003**: Accept missing/ambiguous pages, role reads, workflows, or result
  lists and infer the intended family.
- **ALT-004**: Reject because those checks are business, access, and route
  invariants. Loosening them would hide ambiguity and weaken the accepted
  consumer boundary.

### Reuse the old Expense capability profile

- **ALT-005**: Select the existing `expense-approval` recipe or change the
  `core.approvals` contract to match its older amount/description/status graph.
- **ALT-006**: Reject because it is not the accepted D2 six-lock definition.
  Switching authorities would change Graph, catalog, composition, and runtime
  behavior rather than solve interpretation variance.

### Add a public approval product type or API contract

- **ALT-007**: Introduce a new public schema discriminator and versioned Graph
  or API behavior for the supported definition.
- **ALT-008**: Reject for this bounded experiment because the existing public
  interpretation and structural consumer predicate are sufficient. A public
  discriminator would create compatibility and migration work without closing
  an identified runtime gap.

## Migration, Rollback, Abort Conditions, and Ownership

- **MIG-001**: After acceptance, one adapters owner first adds focused failing
  selection/parser/projection cases, then extracts the canonical builder,
  preserves the fixture digest, extends the private union and JSON Schema, and
  adds the compact approval instruction. No production file changes before the
  founder decision and PM assignment.
- **MIG-002**: The exact product implementation manifest is limited to
  `packages/adapters/src/requirements/approval-definition-selection.ts`,
  `packages/adapters/src/requirements/fixture-interpreter.ts`,
  `packages/adapters/src/requirements/openai-interpreter.ts`, and
  `packages/adapters/test/requirement-interpreter.test.ts`.
- **MIG-003**: Root retains serialized acceptance ownership of the exact three
  non-product paths `e2e/consumer-approval.spec.ts`,
  `e2e/helpers/approval-intake-diagnostics.ts`, and
  `apps/workbench/test/approval-intake-diagnostics.test.ts`. The test-only
  helper may inspect a parsed public response transiently and emit only its
  fixed `schemaValid` flag, bounded `productType` enum, actor/entity/question
  counts, and per-workflow requester/reviewer/page counts and
  submit/approve/reject booleans. It never emits provider-authored strings or
  keys, prompts, raw responses, field values, IDs, or credentials and does not
  change production family selection.
- **MIG-004**: No data migration runs. The extracted builder preserves the
  fixture envelope digest and checksum in **CTX-004**. Parameterized production
  selections recompute the existing public checksum normally; historic records
  remain immutable.
- **ROL-001**: Rollback reverts the four product paths in **MIG-002** and the
  optional test-only paths in **MIG-003**. Non-Restaurant requests again use the
  full generated-blueprint path; existing immutable artifacts remain valid.
- **ABT-001**: Abort on any need to change a public Graph/API/data version,
  capability/catalog lock, Workbench consumer predicate, generated template,
  identity/privacy boundary, lifecycle gate, dependency, provider configuration,
  Compose topology, or external resource. Return that change to Tech Lead and
  founder review.
- **ABT-002**: Abort rather than project `supported-default` when explicit
  requirements conflict with the canonical fields, roles, read scope,
  transitions, or integrations. Preserve material questions and manual review.
- **ABT-003**: Abort the experiment if the separately authorized genuine A10
  probe in **VER-007** returns `supported-default` or performs any automatic
  lifecycle action. Do not retry, weaken the request, loosen a predicate, or
  treat provider variance as acceptance.

## Verification Plan

- **VER-001**: Preserve all current requirement-interpreter tests (baseline
  `65/65`) and exact Restaurant selection behavior. Add strict Zod/manual JSON
  Schema parity tests for valid approval selection, mixed-result rejection,
  unknown keys, wrong definition keys, non-null business parameters, question
  cardinality, and bounded repair/fail-closed behavior.
- **VER-002**: Assert the shared fixture output retains both hashes in
  **CTX-004**, its 3/2/6/1/0 structural counts, exact fields, permissions,
  pages, states, transitions, journeys, and `businessParameters: null`.
- **VER-003**: Run provider-free, fake-transport cases aligned with the D2 plan:
  **A01** coarse Expense and **A02** detailed standard select the same canonical
  business structure; **A03** reject persists while a requested return/resubmit
  remains unsupported; **A04** changed required fields asks a data question;
  **A05** provider-supplied duplicate structure cannot enter canonical output;
  **A06** ambiguous approver asks a role question; **A07** missing reviewer read
  rights asks an authorization question; **A08** withdrawal asks a business-rule
  question; **A09** external identity asks an integration/authorization
  question; and **A10** requester-only privacy asks a visibility question.
  Every material/unsupported case has zero automatic lifecycle actions.
- **VER-004**: For A01 and A02, validate the public interpretation, run the
  unchanged planner/composer, and assert one compatible `standard` alternative,
  the exact six locks in **PRO-008**, exact workflow/CRUD bindings, and approval
  consumer-family eligibility. Preserve the authored negative predicate cases
  for missing queue, duplicate result list, missing reviewer read, and invalid
  split reviewer permissions.
- **VER-005**: Run the existing adapters requirement suite, targeted Workbench
  consumer-family/controller suites, type checks for affected packages, and the
  serialized provider-free `e2e/consumer-approval.spec.ts`. The existing
  approximately 3.2-minute functional pipeline is the performance baseline;
  this decision requires no unrelated audit wave.
- **VER-006**: The next separately authorized genuine-provider attempt must pass
  the full unassisted approval UI journey before D2 is accepted. If it remains
  manual, the root-owned safe diagnostics report only the structural summary in
  **MIG-003**. No provider response is retained or exposed, and a failed genuine
  attempt does not weaken any predicate or authorize another contract change.
- **VER-007**: Separately from the happy path, run one separately authorized,
  first-result/no-retry genuine A10 request that explicitly requires each
  requester to see only their own records. It passes only when interpretation
  returns a material visibility/identity clarification or otherwise fails
  closed with zero automatic lifecycle actions. Record only the fixed safe
  structural facts allowed by **MIG-003**; never retain or expose the brief,
  prompt, provider response, provider-authored strings/keys, IDs, or field
  values. This ADR grants no provider-call authority; root must freeze the exact
  execution scope under the accepted roadmap before the call. A genuine A09
  external-identity probe is optional and is not an acceptance requirement.

## References

- **REF-001**: `AGENTS.md`, `docs/tech-governance.md`, and
  `docs/threat-model.md`.
- **REF-002**: `docs/adr/adr-0040-concise-restaurant-definition-selection.md`,
  `docs/adr/adr-0048-approval-consumer-orchestration.md`, and
  `docs/adr/adr-0049-generated-approval-usability.md`.
- **REF-003**:
  `docs/superpowers/plans/2026-09-09-approval-consumer-delivery.md` and the
  active entries in `docs/roadmap.md` and `docs/project-status.md`.
