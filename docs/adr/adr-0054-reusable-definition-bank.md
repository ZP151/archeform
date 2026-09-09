---
title: "ADR-0054: Reusable Definition Bank"
status: "Proposed"
date: "2026-09-10"
authors: "Archeform Tech Lead"
tags: ["architecture", "decision", "requirements", "definitions", "approvals"]
supersedes: ""
superseded_by: ""
---

# ADR-0054: Reusable Definition Bank

## Status and recommendation

**Proposed** | Accepted | Rejected | Superseded | Deprecated

Recommendation: **experiment** with one private, adapter-owned canonical
definition bank containing the existing `restaurant-ordering` and
`expense-approval` entries plus one new `purchase-request-approval` entry.
Derive provider selection parsing, JSON Schema branches, supported-default
guidance, and projection dispatch from that bank. The model selects bounded
metadata; reviewed local code owns every canonical blueprint.

This proposal is not accepted. It grants no implementation, provider/model
call, Product Publish, Compilation, Preview, runtime, Git action, external
resource, cloud action, deployment, or release. A qualified read-only reviewer
must return the standing verdict required by `docs/tech-governance.md`; PM must
record acceptance and assign work before production files change. Root
separately owns any later deterministic runtime authorization.

## Context

- **CTX-001**: ADR-0050 proved that compact definition selection can project a
  complete local Expense blueprint more reliably than asking the model to
  reproduce it. Restaurant uses the same principle. The two definitions are
  currently wired through separate imports, schema branches, large instruction
  blocks, and a hardcoded projection conditional in `openai-interpreter.ts`.
- **CTX-002**: Adding each definition through more interpreter conditionals
  repeats integration logic and makes schema/guide/projector drift easier. A
  static private registration boundary makes the next bounded definition
  additive without creating a public plugin or runtime family.
- **CTX-003**: The accepted generic planner and Workbench approval-family
  predicate recognize one requester, one reviewer, one form, one queue, one
  list, and a submit -> approve/reject workflow structurally. The compiler's
  existing `approval-v1` selector recognizes the same flow shape. The purchase
  definition satisfies both without a Workbench change or new compiler profile.
  Its business identity and needed date expose one bounded presentation gap:
  the existing summary recognizes Amount/Category/exact `date` only, so the
  existing renderer needs the exact conditional title/date rules in
  **PUR-007**.
- **CTX-004**: The shared consumer checklist requires a complete family journey,
  responsive visual evidence, negative authorization/workflow cases, and clear
  scope. Adding a name to a catalog is insufficient; this proposal therefore
  freezes one actual purchase-request business definition and later acceptance
  evidence without claiming general procurement capability.

## Current accepted Golden profile

- **CUR-001**: The sole accepted profile remains the exact version table and
  immutable lifecycle in `docs/tech-governance.md`. The adapter-specific
  coordinates remain those recorded by ADR-0050: private
  `@factory/adapters@0.1.0`, OpenAI `^4.77.0` resolved `4.104.0`, Zod `^3.24.1`
  resolved `3.25.76`, and implemented Graph
  `factory.application-graph/v1`. Manifests and `pnpm-lock.yaml` remain
  authoritative.
- **CUR-002**: Public contracts remain
  `factory.requirement-interpretation-result/v1`,
  `factory.requirement-spec/v1`, `factory.product-blueprint/v1`,
  `factory.composition-plan/v1`, `factory.composition-decision/v1`, and
  `factory.application-graph/v1`.
- **CUR-003**: The current private selection union contains Restaurant and
  Expense only. Restaurant may carry validated
  `factory.restaurant-menu-parameters/v1`; Expense requires
  `businessParameters: null`. Existing projection produces ordinary public
  requirement/blueprint data before the unchanged planner and lifecycle.

## Proposed profile and private bank contract

The proposed profile is separate until the founder gate is satisfied. It keeps
every accepted version, package, public identifier, provider configuration,
Graph/API contract, compiler target/profile, and runtime service unchanged.
Only the private definition bank and the bounded internal `approval-v1`
summary contract differ; no new generated-template family is introduced.

- **BNK-001 — Static bank**: Add private
  `definition-selection-catalogue.ts`. Its frozen registration order is
  `restaurant-ordering`, `expense-approval`, `purchase-request-approval`.
  Each unique entry owns exactly a literal key, family, authoritative Zod
  selection schema, matching provider JSON Schema fragment, compact
  supported-default guide/instruction, canonical projector, and parameter
  policy. It is first-party static code, not runtime registration, dynamic
  import, user extension, public package export, or new `apiVersion`.
- **BNK-001A — Bounded approval factory**: Add separate private
  `approval-definition-template.ts`; do not copy the complete Expense blueprint
  into the Purchase file. Its descriptor accepts only definition/request/entity
  identity and safe copy, the three exact requester/reviewer/auditor roles,
  ordered declared fields, category options, and journey copy. The factory owns
  the fixed one-stage permission shape, dashboard/list/form/detail/queue/settings
  page shape, draft/submitted/approved/rejected workflow, three journey shapes,
  checksum, selection schema/JSON fragment, guide, and projector. It cannot add
  arbitrary roles, permissions, transitions, pages, capabilities, routes, code,
  or integrations. Expense becomes one descriptor with byte-equal canonical
  output; Purchase becomes a second descriptor. Restaurant retains its existing
  family-specific projector and menu-parameter contract.
- **BNK-002 — Single derivation boundary**: The OpenAI result Zod union and
  provider `definitionSelection.anyOf` branches are composed from the bank;
  provider instructions join bank instructions in frozen order; and one bank
  lookup dispatches projection. Remove the direct Restaurant/Expense imports,
  handwritten definition union/JSON branches, embedded guides, and
  `expense-approval ? ... : restaurant` projector conditional from
  `openai-interpreter.ts`. Unknown/unregistered keys, duplicate keys, a schema
  literal that differs from its entry key, a guide with another key, or a
  projector returning another product structure fail closed.
- **BNK-003 — Provider authority**: A definition-selection result retains the
  existing strict fields: `definitionKey`, `requirementId`, `title`, `outcome`,
  `disposition`, `materialQuestions`, and `businessParameters`. Model discretion
  over structure is limited to selecting a registered key and returning a
  supported/clarification disposition with bounded questions. Requirement ID,
  title, and outcome customize safe identity/summary text only. The model never
  supplies fields, actors, permissions, pages, workflows, capabilities, Graph,
  routes, source, executable code, packages, providers, or runtime choices.
- **BNK-004 — Exclusivity and questions**: Preserve strict mutual exclusion of
  `definition-selection` and `generated-blueprint`. `supported-default` requires
  zero material questions; `needs-clarification` requires 1 through 30 questions
  in the existing authorization, visibility, role, business-rule, data, and
  integration categories. Unknown keys, mixed branches, non-null approval
  parameters, or clarification answers that leave material requirements
  unresolved fail or remain clarification; they never fall through to another
  definition or generated blueprint.
- **BNK-005 — Existing-entry preservation**: Move only registration-owned
  schema/guide/instruction/projector wiring. Preserve Restaurant menu parameter
  parsing, canonical defaults, supplied-menu order/values, unrelated-question
  carry-forward, follow-up resolution, unsupported integrations, clarification
  behavior, and projection bytes for the same validated selection. Preserve
  Expense canonical fields, roles, permissions, pages, workflow, clarification
  rules, `businessParameters: null`, public interpretation bytes, fixture
  digest/checksum authority, standard six-lock plan, and emitted generated
  bundle bytes.

## Purchase-request canonical definition

- **PUR-001 — Supported outcome**: `purchase-request-approval` is one-stage
  local-demo approval only. A requester submits a purchase request, one manager
  approves or rejects it, and procurement reads and audits the decision. An
  approval records a decision; it does not place a purchase order, reserve
  inventory, contact a supplier, create an invoice, or spend/transfer money.
- **PUR-002 — Actors and permissions**: Exact actors are `requester` labelled
  `Requester`, `manager` labelled `Manager`, and `procurement` labelled
  `Procurement`. Requester receives `create`, `read`, and `submit` on
  `purchase-request`, plus `read` and `update` on the secondary `requester`
  entity. Manager receives `read`, `approve`, and `reject` on
  `purchase-request`. Procurement receives `read` and `audit` on
  `purchase-request`. These are selectable local demo roles with role-wide
  reads, not real identity or requester-owned privacy.
- **PUR-003 — Fields**: Primary entity `purchase-request`, label
  `Purchase request`, has exactly these fields in order:
  `amount` / `Amount` / `currency` / required;
  `category` / `Category` / `enum` / required / options exactly
  `equipment`, `software`, `services`, `supplies`, `other`;
  `neededBy` / `Needed by` / `date` / required;
  `item` / `Item` / `text` / required;
  `supplier` / `Supplier` / `text` / optional; and
  `businessJustification` / `Business justification` / `long-text` / required.
  The stable camelCase key renders `Needed by` through the current compiler
  humanizer because Blueprint field labels do not enter the generated Graph.
  Amount is a numeric requested amount; no currency code, symbol, conversion,
  or payment is invented. Secondary entity `requester`, label `Requester`, has
  `name` / `Name` / `text` / required and
  `department` / `Department` / `text` / optional.
- **PUR-004 — Pages and workflow**: Exact pages are
  `purchase-request-dashboard` (dashboard), `purchase-request-list` (the only
  list), `purchase-request-form` (form), `purchase-request-detail` (detail),
  `purchase-request-queue` (queue), and `purchase-request-settings` (settings).
  The first five bind `purchase-request`; settings has no entity. Workflow
  `purchase-request-approval` has states `draft`, `submitted`, `approved`, and
  `rejected`; transitions are `submit` draft -> submitted by requester,
  `approve` submitted -> approved by manager, and `reject` submitted -> rejected
  by manager. Journeys are requester submits, manager approves/rejects, and
  procurement audits a decision. `businessParameters` is always `null`.
- **PUR-005 — Supported defaults and exclusions**: Omitted routine page and
  presentation details accept the exact definition above. Explicit or ambiguous
  requester-only/private records, real identity/SSO/tenant isolation,
  thresholds, budgets, multiple/sequential reviewers, return/reopen/resubmit,
  changed fields/requiredness/category options, currency requirements,
  quote/file storage, purchase orders, vendor management, ERP/procurement,
  inventory, fulfilment, invoice/payment, or external notification integration
  require material clarification. The adapter never approximates them with the
  default. Follow-ups retain every still-required exclusion until the user
  explicitly accepts the supported scope.
- **PUR-006 — Existing runtime family**: The projected standard planner result
  must use the unchanged locks `core.crud@1.0.1`, `core.workflow@1.0.1`,
  `core.identity-policy@1.0.0`, `core.policy-declarations@1.0.0`,
  `core.audit@1.0.2`, and `core.notification@1.1.1`. Workbench must classify it
  as existing family `approval`; the compiler must select existing
  `approval-v1`. No purchase-key or purchase-family discriminator, capability,
  recipe, renderer family, route rule, or generated-template family is added;
  the only compiler delta is the Graph-shape-driven conditional `approval-v1`
  extension in **PUR-007**.
- **PUR-007 — Existing renderer extension**: Extend only the existing
  `approval-v1` `EntityRecords` summary with two bounded rules. First, select a
  title only when exactly one declared field has exact key `item` and compiled
  type `string`; render its humanized `Item` label and actual formatted value as
  the record `<h3>` before the current definition-list summary. Second, preserve
  exact compatible key `date` as the preferred date; only when it is absent,
  select a fallback when exactly one declared field has compiled type `date` or
  `datetime`, so `neededBy` renders as `Needed by`. Missing, wrong-type, or
  ambiguous candidates receive no promoted slot and remain reachable in
  Details. Selection never uses entity/application names, record values,
  aliases, suffixes, Blueprint labels, or model hints. At compile time, emit the
  extended helper/markup/style only for a Graph that needs either rule, so
  existing Expense and every other approval using the old exact fields retain
  ordered generated bundle bytes. Legacy/non-approval and Restaurant bytes
  remain exact. Under that same existing `needsApprovalSummaryExtension(graph)`
  emission predicate only, append
  `.approval-v1 .generated-header select { min-width: 10rem; }`. Do not inspect
  role keys, labels, counts, or selected values to choose CSS. The measured
  Purchase control has 90 px usable text width at 768/1440 px versus 91.34 px
  for `procurement`; 10 rem produces 118 px usable width and 26.66 px spare,
  while the existing full-width 390 px control remains unchanged.

## Compatibility, security, catalog, and operability

- **CON-001 — Ownership and freeze**: One serialized integration owner owns the
  private bank, approval factory, three entries, provider schema parity,
  instructions/projection, the exact conditional compiler title slot, and
  focused tests. Public Graph/API/data contracts are frozen enough because no
  frontend/backend writer is required. Adapter and generated-template changes
  remain serialized; no parallel writer may change their shared assumptions. A
  public contract or Workbench production need stops implementation and returns
  to Tech Lead/PM.
- **API-001**: No public request/response field, error, serialization, database,
  queue, hash, or lifecycle rule changes. Historic interpretations, Drafts,
  Published Graphs, Compilations, and evidence remain immutable. New purchase
  interpretations are ordinary existing V1 public envelopes.
- **CAT-001**: The private provider-definition bank grows from two to three
  entries. Public capability, composition, product recipe, UI registry, screen
  recipe, compiler target, and source-study catalogs have zero impact. No lock,
  identifier, digest authority, or catalog admission is changed.
- **SUP-001**: Dependency/license/supply-chain impact is zero: no package,
  manifest, lockfile, copied source, notice, asset, Dockerfile, image, font, or
  external resource changes.
- **SEC-001**: Provider output remains untrusted strict data. The bank exposes no
  tool, import path, code, Graph, capability, credential, filesystem, shell,
  Docker, deployment, or arbitrary-network channel. Local projection, public
  schema validation, checksum/plan checks, server authorization, and immutable
  lifecycle gates remain authoritative. Raw briefs/prompts/responses,
  credentials, and real business data remain absent from persistence, logs,
  screenshots, source, and evidence.
- **OPS-001**: The bank adds no call, retry, token budget, model, timeout,
  service, process, port, storage, network request, Compose edge, cleanup duty,
  preview behavior, or deployment. Later local runtime evidence uses synthetic
  authored values and existing isolated cleanup.

## Consequences and alternatives

- **POS-001**: A third complete definition becomes reusable through one
  coherent schema/guide/projector registration boundary.
- **POS-002**: The actual generated purchase request reuses the accepted
  approval behavior and presentation rather than adding a nominal template.
- **NEG-001**: The private bank is a load-bearing adapter integration point and
  requires coherence tests whenever an entry changes.
- **NEG-002**: Purchase requests outside the narrow one-stage demo remain
  clarification/manual work; this experiment is not a procurement suite.
- **ALT-001 — Add Purchase through more interpreter conditionals**: Rejected.
  It repeats the exact drift-prone schema/instruction/projector wiring this slice
  is intended to remove.
- **ALT-002 — Add many metadata-only definitions now**: Rejected. Names without
  complete canonical behavior and generated acceptance inflate supply counts.
- **ALT-003 — Replace registered definitions with arbitrary model-authored
  structure or code**: Rejected. Registered defaults require local canonical
  authority. The existing strict `generated-blueprint` fallback remains
  available and unchanged for other nonregistered products; it still permits
  bounded business semantics only and never arbitrary code.
- **ALT-004 — Add a purchase runtime/capability/recipe**: Rejected. Existing
  CRUD/workflow/audit/notification composition and approval rendering implement
  the scoped outcome.
- **ALT-005 — Reuse Expense and relabel its fields**: Rejected. Expense receipt
  and employee semantics do not represent item, supplier, needed date, and
  business justification.

## Implementation, rollback, and aborts

- **MIG-001 — Product manifest**: After recorded acceptance, one serialized
  integration owner may change exactly: new
  `packages/adapters/src/requirements/definition-selection-catalogue.ts`; new
  `packages/adapters/src/requirements/approval-definition-template.ts`; new
  `packages/adapters/src/requirements/purchase-request-definition-selection.ts`;
  existing `approval-definition-selection.ts`,
  `restaurant-definition-selection.ts`, `openai-interpreter.ts`, and
  `packages/adapters/test/requirement-interpreter.test.ts`; plus
  `packages/compiler/src/index.ts` and
  `packages/compiler/test/composition-page-runtime.test.ts`. This is one
  serialized manifest, despite crossing packages. No package-root export is
  added. Start with focused failing bank/coherence/purchase/title-slot cases.
- **MIG-002 — Root acceptance ownership**: Root may prepare and own only
  `apps/workbench/test/consumer-generation-fixture.ts`, the affected existing
  `apps/workbench/lib/product-journey/use-consumer-generation.test.tsx`, new
  `e2e/consumer-purchase-request.spec.ts`, and assembly plan/ledger/status and
  acceptance evidence. Test fixtures may import the private canonical projector
  by repository-relative path but must not create a package export. Actual
  runtime waits for accepted/frozen product source. No Workbench production path
  or compiler change beyond the two paths and exact **PUR-007** behavior in
  **MIG-001** is authorized.
- **MIG-003**: Existing Restaurant/Expense interpretations and generated bundles
  remain byte/semantic equivalent. Only future validated Purchase selections
  create new public V1 interpretations and later immutable artifacts. There is
  no data migration or irreversible step.
- **ROL-001**: Revert the nine product paths and root-owned Purchase
  test/evidence additions. The bank returns to the two existing definitions or
  the prior direct wiring; existing immutable artifacts remain valid and
  untouched.
- **ABT-001**: Abort on any existing Restaurant/Expense projection, menu,
  clarification, follow-up, plan, or emitted-bundle drift; bank key/schema/guide/
  projector mismatch; non-null Purchase parameters; unknown-key fallback; or
  unresolved material question becoming supported.
- **ABT-002**: Abort on any need for a dependency, package export/version,
  public Graph/API/data contract, capability/catalog/recipe, Workbench or
  compiler change beyond **PUR-007**, another generated-template branch,
  identity/security boundary, provider configuration/call, Compose topology,
  external resource, cloud, or deployment.

## Measurable verification plan

- **VER-001 — Bank coherence**: Focused tests prove exactly three unique frozen
  keys; schema literal, JSON Schema const, guide key, parameter policy, and
  projector agreement for every entry; stable instruction/schema order;
  unknown/duplicate/mixed branches fail closed; strict unknown properties fail;
  and approval parameters accept only `null`. Verify manual provider JSON Schema
  and Zod parity without adding a schema framework.
- **VER-002 — Existing preservation**: Run all current Restaurant and Expense
  definition, menu parameter, clarification/follow-up, canonical checksum,
  planner, consumer-family, and generated-bundle fixtures unchanged. Compare
  pre/post canonical public JSON and ordered generated bundle SHA-256 values for
  byte equality from the same validated selections.
- **VER-003 — Purchase projection**: Prove **PUR-001** through **PUR-006** exactly,
  public V1 schema/checksum validity, one compatible standard six-lock plan,
  exact CRUD/workflow bindings, Workbench family `approval`, compiler structural
  eligibility, exact conditional `item` `<h3>`, unique temporal fallback to
  `neededBy`, ambiguity refusal, conditional 10 rem role-select minimum, and
  Expense/legacy/Restaurant byte preservation. Prove the sizing rule is absent
  from every Graph that does not satisfy `needsApprovalSummaryExtension` and
  that all three declared Purchase role labels fit at 390/768/1440 px using
  `clientWidth - paddingInline - 24px >= measured text width`, where 24 px is
  the native-arrow reserve. Coarse and
  exact-compatible fake-provider requests select the same canonical definition.
  Changed authority, privacy, fields, categories, workflow, purchasing/payment/
  inventory, file storage, and integrations retain bounded material questions
  and zero automatic lifecycle actions.
- **VER-004 — Commands and review**: Run
  `pnpm --filter @factory/adapters exec vitest run test/requirement-interpreter.test.ts`,
  `pnpm --filter @factory/adapters test`,
  `pnpm --filter @factory/adapters typecheck`,
  `pnpm --filter @factory/adapters build`,
  `pnpm --filter @factory/compiler test -- composition-page-runtime.test.ts restaurant-customer-icons.test.ts restaurant-product-v3-target.test.ts`,
  `pnpm --filter @factory/compiler typecheck`,
  `pnpm --filter @factory/compiler build`, the affected Workbench test command,
  and Prettier on the exact manifest. Record commands, counts, exit codes,
  hashes, preservation digests, and one independent task-review verdict in
  `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`.
- **VER-005 — Later deterministic acceptance**: Only after separate root runtime
  authorization, run one provider-free Purchase request through actual
  interpretation -> planning -> composition -> Publish -> Compile -> Verify ->
  Preview and the emitted browser. Using synthetic data, create and submit two
  requests, approve one, reject one, retain both after reload, and prove
  requester decision `403`, procurement read/audit access, state-valid actions,
  Item/Amount/Category/Needed by/Status collapsed summary, keyboard Details
  access to Supplier/Business justification/ID, safe failures, no purchasing/
  payment/inventory actions, 390/768/1440 no-overflow and axe checks, actual
  screenshots, every selected role passing the text-fit formula in **VER-003**,
  and exact cleanup. Apply every applicable dimension in
  `docs/acceptance/consumer-product-checklist.md`. This ADR grants no execution
  or provider authority and makes no real-model, user-study, hosted, or release
  claim.

## References

- **REF-001**: `AGENTS.md`, `docs/tech-governance.md`,
  `docs/threat-model.md`, `docs/delivery-policy.md`, and
  `docs/acceptance/consumer-product-checklist.md`.
- **REF-002**: ADR-0040, accepted ADR-0050, ADR-0053, and the active consumer
  delivery ledger.
- **REF-003**: `packages/adapters/src/requirements/openai-interpreter.ts`,
  `approval-definition-selection.ts`, `restaurant-definition-selection.ts`,
  `fixture-interpreter.ts`, Workbench `consumer-family.ts`, and compiler
  `presentationProfileFor` in `packages/compiler/src/index.ts`.
