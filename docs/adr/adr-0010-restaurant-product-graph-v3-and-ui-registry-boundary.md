---
title: "ADR-0010: Restaurant Product Graph V3 and UI Registry Boundary"
status: "Accepted"
date: "2026-08-12"
authors: "Archeform Tech Lead"
tags: ["architecture", "application-graph", "ui-registry", "supply-chain"]
supersedes: ""
superseded_by: ""
---

# ADR-0010: Restaurant Product Graph V3 and UI Registry Boundary

## Status

**Accepted**. The founder explicitly accepted this ADR in founder chat on
2026-08-12 with the verbatim response `接受`. This decision authorizes PM to
freeze and dispatch the serialized Graph V3 prerequisite; it does not by itself
start an implementation writer or bypass PM review, QA, release-review,
acceptance, and delivery gates.

The founder separately wrote verbatim `Task 2/3 也授权，如果需要` in founder chat
on 2026-08-12. PM records that as conditional future authority: Tasks 2 and 3
may start without another founder prompt only after the accepted Graph V3
prerequisite is reviewed, accepted, delivered, and pushed, and PM freezes their
exact shared Restaurant key-and-binding manifest with disjoint paths. Until
those gates pass, both tasks retain zero writer authority.

## Recommendation

- **REC-001 — Keep**: keep the current accepted Golden runtime profile and the
  immutable `factory.application-graph/v1|v2` contracts.
- **REC-002 — Migrate**: make the restaurant product consume a new additive
  `factory.application-graph/v3` contract with step-scoped journey actors and
  typed Domain, Flow, and Policy binding policies. Do not relax V2 in place.
- **REC-003 — Experiment**: evaluate the seven design-approved private UI and
  recipe workspace packages at version `0.1.0`, using only the currently accepted
  React, TypeScript, Vitest, and Lucide coordinates. The experiment is not a
  compiler target, generated-runtime dependency, release, or registry admission.
- **REC-004 — Reject**: reject copied shadcn/ui source and any new direct Radix
  dependency in this wave. No exact source revision, selected-file set, license
  record, hashes, transitive package set, or removal proof is accepted yet.

## Context

### Current accepted profile

- **CUR-001**: Node.js `>=22.11.0 <23`, pnpm `9.0.0`, TypeScript `^5.7.2`
  (locked `5.9.3`), Next.js `^15.1.0` (locked `15.5.22`), and React/React DOM
  `^19.0.0` (locked `19.2.8`) remain the accepted UI runtime.
- **CUR-002**: NestJS 10, Prisma 6/PostgreSQL 16, BullMQ 5/Redis 7, the existing
  compiler targets, and local Docker Compose remain unchanged.
- **CUR-003**: ADR-0009 accepted additive `factory.application-graph/v2`.
  Commit `a6e4e694` implements it beside V1. Historic Published V1/V2 bytes,
  hashes, adapters, and Compilation inputs are immutable.
- **CUR-004**: V2 requires one `journey.actorRoleKey` to appear in every
  transition of every referenced flow. The accepted Restaurant order flow instead
  assigns transitions to customer, kitchen, cashier, or manager according to
  least privilege. Adding every role to every transition would broaden authority;
  splitting one order lifecycle into shadow flows would corrupt its semantics.
- **CUR-005**: every V2 page-block binding has exactly one policy and must equal
  `graph.domain.<entityKey>.<fieldKey>`. V2 cannot safely represent the approved
  design's Flow and Policy relationships under the same binding contract.
- **CUR-006**: `factory.draft-preview-snapshot/v1` accepts only Graph V2, and the
  published-Graph adapter rejects V3. These fail-closed discriminators must not be
  changed by shape guessing.
- **CUR-007**: the seven proposed UI/recipe workspace packages do not exist.
  `apps/workbench` directly declares `lucide-react ^0.468.0` (locked `0.468.0`).
  Radix packages exist only transitively through accepted dependencies; that is
  not approval to import them directly or copy shadcn/ui source. There is no
  accepted shadcn/ui source-study artifact.

### Proposed contract and package experiment

- **PRO-001**: add `factory.application-graph/v3`; V1 and V2 remain readable,
  hash-stable, inspection-safe, and eligible only for their existing adapters.
- **PRO-002**: replace V2 journey-wide actor ownership in V3 with ordered journey
  steps shaped as `{ flowKey, from, event, to, actorRoleKey }`. Each step must
  match exactly one declared transition, its actor must be listed on that
  transition and separately granted the event by Policy, and the projected steps
  for a flow must form a continuous path. Every transition remains role-granted
  and must be covered by at least one journey step. Alternative branches use
  separate journeys.
- **PRO-003**: make V3 binding policies a strict discriminated union:
  `domain-field` retains the exact V2 target and authority rules;
  `flow-transition` resolves one exact
  `graph.flow.<flowKey>.<from>.<event>.<to>` target; and `policy-permission`
  resolves one exact `graph.policy.<roleKey>.<resource>.<action>` target. Every
  block binding still has exactly one policy.
- **PRO-004**: Flow bindings declare observation or a transition request; Policy
  bindings declare evaluation only. Neither is a grant. Generated clients cannot
  mutate flow definitions, roles, permissions, server-authoritative fields, or
  Published Graphs. State changes cross an authenticated server boundary that
  rechecks tenant, application, revision, actor, policy, transition, idempotency,
  and concurrency.
- **PRO-005**: add `factory.draft-preview-snapshot/v2` with literal
  `graphVersion: "factory.application-graph/v3"`, plus explicit V3 published and
  Draft adapters. V2 snapshots and adapters remain unchanged.
- **PRO-006**: V2-to-V3 conversion uses
  `factory.application-graph-v2-to-v3/v1`, creates a new Draft with lineage, and
  never rewrites a Published revision. There is no V3-to-V2 down-conversion.
- **PRO-007**: the package experiment may create private version `0.1.0`
  `@factory/ui-primitives`, `@factory/ui-patterns`, `@factory/workbench-ui`,
  `@factory/generated-ui`, `@factory/screen-recipes`,
  `@factory/experience-recipes`, and `@factory/product-recipes`. These identifiers
  become stable if accepted. React packages use peer `react ^19.0.0` (locked
  `19.2.8`); only `@factory/ui-primitives` may add the already accepted
  `lucide-react ^0.468.0` (locked `0.468.0`); tests use `vitest ^2.1.8` (locked
  `2.1.9`). No other external package, direct Radix import, copied third-party
  source, or lockfile coordinate is allowed.
- **PRO-008**: Task 3 must first inventory approved registries, recipes, existing
  Workbench assets, and generated-project templates. A demonstrated gap that
  needs shadcn/ui or direct Radix stops the experiment and requires an exact
  source study plus a new proposed package/source ADR and founder decision.

## Contract, security, and tenant effects

- **EFF-001**: Tasks 2 and 3 cannot consume V2 as currently planned. PM must add
  and accept a serialized Graph V3 contract slice before freezing their shared
  contract or dispatching parallel writers.
- **EFF-002**: V3 changes Graph, hashing, browser exports, adapters, preview
  snapshots, fixtures, and compiler version dispatch. It does not change the
  Golden runtime, database, queue, Compose, provider, or deployment profile.
- **EFF-003**: step-scoped actors preserve the existing Restaurant least-privilege
  transition grants. No compatibility shim may inflate customer, kitchen,
  cashier, or manager permissions to satisfy a journey.
- **EFF-004**: Flow and Policy bindings are untrusted client declarations.
  Server-side tenant scoping and deny-by-default authorization remain mandatory;
  identifiers never grant cross-workspace access. Evidence records safe codes and
  digests, not request bodies, raw model material, credentials, or tenant data.
- **EFF-005**: package manifests, the lockfile, provenance, licenses, and notices
  remain supply-chain boundaries. Existing transitive presence is not direct-use
  approval, and private workspace packages must not leak into standalone generated
  runtime imports.

## Migration, rollback, and abort

- **MIG-001**: after explicit founder acceptance, PM owns a new contract ledger
  slice. Graph, snapshot, adapter, browser, and compiler-dispatch changes remain
  serialized until review, QA, release review, and fresh verification are accepted.
- **MIG-002**: existing V1/V2 Published revisions and snapshots continue through
  their exact current adapters. New Restaurant product Drafts may select V3 only
  after the V3 gate is accepted and frozen.
- **RBK-001**: before Publish, discard a migrated V3 Draft and continue from its
  source V2 revision. After Publish, rollback selects a prior valid V1/V2
  Published revision for compatible consumers or creates a corrective V3 Draft;
  no historic revision is rewritten.
- **RBK-002**: the UI experiment is removable only while no Published Graph,
  compiler target, generated template, or released package depends on it. A copied
  source intake is not part of this decision and has no rollback authorization.
- **ABT-001**: abort on V1/V2 fixture or hash drift, version guessing,
  nondeterministic V3 hashes, discontinuous journey steps, a transition without a
  real least-privilege actor grant, or any V3-to-V2 rewrite.
- **ABT-002**: abort if a Flow/Policy binding grants authority, bypasses server
  tenant/policy checks, permits client mutation of Published semantics, or exposes
  another workspace's roles or state.
- **ABT-003**: abort the package experiment on an unapproved dependency, copied
  source, missing license/provenance, registry duplicate, private-package runtime
  import, or a material source gap. Return that gap to governance; do not fill it
  with ad hoc source.

## Consequences

### Positive

- **POS-001**: multi-actor Restaurant journeys become truthful without privilege
  inflation or shadow order lifecycles.
- **POS-002**: Domain, Flow, and Policy relationships are explicit, typed, and
  fail closed while server authorization remains authoritative.
- **POS-003**: the UI architecture can be tested reversibly without admitting an
  unknown third-party source or dependency set.

### Negative

- **NEG-001**: a new Graph and preview-snapshot version adds adapter, fixture,
  migration, and compiler-dispatch work before Tasks 2/3.
- **NEG-002**: three Graph versions must coexist, and V3 Published content cannot
  be rolled back in place.
- **NEG-003**: rejecting shadcn/Radix intake may expose a UI-source gap and require
  a later governance round before the full Task 3 outcome is possible.

## Alternatives considered

- **ALT-001 — Keep V2 and add all actors to all transitions**: rejected because
  it violates least privilege and changes Restaurant authorization semantics.
- **ALT-002 — Split the order lifecycle into actor-owned shadow flows**: rejected
  because it fragments one transaction state machine and weakens auditability.
- **ALT-003 — Relax or extend V2 in place**: rejected because old and new parsers
  would disagree under one stable serialization identifier.
- **ALT-004 — Keep only Domain bindings**: rejected for the approved product
  outcome because workflow and role-aware blocks would lack a Graph-owned,
  typed relationship. V3 adds those relationships without treating them as grants.
- **ALT-005 — Admit unspecified shadcn/Radix source now**: rejected because the
  source, package, license, hash, and removal boundaries are not reviewable.

## Measurable verification

- **VER-001**: `pnpm --filter @factory/graph test`, typecheck, and build pass;
  V1/V2 canonical bytes and hashes remain unchanged; wrong and cross-version
  envelopes fail closed.
- **VER-002**: focused tests accept the current distributed-role Restaurant order
  path as exact V3 steps and reject unknown actors, unmatched transitions,
  discontinuous paths, missing Policy grants, uncovered transitions, and a client
  that treats a binding as authority.
- **VER-003**: V3 Domain, Flow, and Policy targets round-trip canonically; malformed,
  relabelled, duplicate, cross-tenant, and client-write cases fail closed.
- **VER-004**: snapshot V1 remains V2-only; snapshot V2 remains V3-only; neither
  preview lane can create a Compilation, export, deploy, or promote a Draft.
- **VER-005**: package tests, typechecks, `pnpm verify:third-party`, manifest and
  lockfile review, Prettier, and `git diff --check` prove no unapproved external
  package, copied source, missing notice, or generated-runtime workspace import.
- **VER-006**: PM records all RED/GREEN, task review, QA, release review, and fresh
  acceptance evidence in
  `docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md`.

## Founder decision gate

- **GAT-001 — Satisfied**: founder response on 2026-08-12 in founder chat was
  verbatim `接受`, explicitly accepting ADR-0010 as written.
- **GAT-002**: ADR acceptance authorizes PM governance; only a PM-recorded frozen
  task contract dispatches implementation.
- **GAT-003**: founder response on 2026-08-12 in founder chat was also verbatim
  `Task 2/3 也授权，如果需要`. This is conditional future authority, not an
  immediate dispatch. Task 2 and Task 3 remain blocked until Graph V3 delivery
  and the exact shared Restaurant key-and-binding manifest are recorded.
- **GAT-004**: copied shadcn/ui source and new direct Radix dependencies remain
  rejected by this accepted decision. A later source gap requires a new proposed
  ADR and a separate founder decision.

## References

- **REF-001**: `docs/tech-governance.md`
- **REF-002**: `docs/threat-model.md`
- **REF-003**: `docs/adr/adr-0009-application-graph-v2-shared-contract.md`
- **REF-004**:
  `docs/superpowers/specs/2026-08-10-prompt-to-polished-restaurant-product-design.md`
- **REF-005**:
  `docs/superpowers/plans/2026-08-10-prompt-to-polished-restaurant-product.md`
- **REF-006**:
  `docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md`
