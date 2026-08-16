---
Date: 2026-08-07
Status: Approved
Approved-By: Founder
Required-Plan: docs/superpowers/plans/2026-08-07-governed-composition-capability-foundry.md
Required-Ledger: docs/superpowers/ledgers/2026-08-07-governed-composition-capability-foundry.md
---

# P1 Governed Composition & Capability Foundry Goal Design

## Macro outcome

Build the next durable Factory Pilot layer: a governed path from a requirement
to a reviewable capability composition and a constrained Draft-only Graph Diff,
plus a Capability Foundry that can grow to 25–35 verified capability families
and describe more than 100 representative application Profiles.

```text
Requirement
  -> RequirementSpec
  -> CompositionPlan
  -> reviewed constrained Graph Diff
  -> mutable Draft
  -> Publish -> Compilation -> isolated verification
```

The Application Graph remains the only business authority. AI is an optional
proposal adapter; capability packages, Profile recipes, Puck, XYFlow, source
repositories, generated source, and runtime providers remain constrained inputs
or outputs around that authority.

## Why this is the next Goal

P0 is now closed: the plugin compiler and the real isolated verifier prove
that a Published Graph can generate, boot, exercise, clean up, and diagnose a
local application. The missing product layer is the governed decision process
that decides _what Graph to propose_ and _which reusable capability packages
should satisfy it_. Without that layer, Factory Pilot still relies on manually
chosen Profile recipes and cannot scale safely from five starter Profiles to a
large application portfolio.

## Current baseline

- Five Graph-backed starter Profiles exist: Expense Approval, Restaurant
  Ordering, Simple Ecommerce, Retail Counter, and Grocery Pickup.
- The source catalogue has 23 current capability families and 50 physical
  version directories. Historical assets are not automatically counted as
  Foundry-verified.
- The compiler and isolated verifier are accepted. The accepted Expense
  verification proves compile, isolated boot, migration, health, allowed and
  denied journeys, idempotency, cleanup, diagnosis boundary, and Draft-Diff
  safety.
- External intake can discover and quarantine candidates but cannot directly
  install, promote, or execute upstream source.

## Required end state

### 1. Governed composition

Factory owns versioned schemas and validators for:

- `RequirementSpecV1`: outcome, actors, domain concepts, workflows,
  non-functional constraints, explicitly unresolved questions, and acceptance
  scenarios.
- `CompositionPlanV1`: selected immutable capability locks, Graph bindings,
  declared compiler output slots, dependency graph, compatibility result,
  risks, assumptions, cost/complexity classification, and planned acceptance
  journeys.
- `CompositionDecisionV1`: draft identity, requirement checksum, plan checksum,
  reviewer decision, and a constrained Graph Diff checksum.

Only an accepted `CompositionPlanV1` may authorize a proposal. The proposal
may change a mutable Draft through the existing Diff boundary; it may not alter
asset locks, a composition profile, a Published Graph, generated source, URLs,
providers, credentials, executable code, or runtime configuration.

### 2. AI and deterministic planners

The initial planner is deterministic and fixture-driven. An optional OpenAI
adapter may suggest requirement normalization, clarification questions, plan
alternatives, explanations, and test scenarios. Its output must parse through
the same schemas as the deterministic planner, and it cannot select raw paths,
URLs, package source, unapproved versions, or arbitrary Graph operations.
Raw prompts, responses, and credentials are never persisted. A guarded real
model check is acceptance evidence only; it is not CI authority.

### 3. Capability Foundry scale

The catalogue must finish with 25–35 **Foundry-verified** capability families.
A family is counted only when its current version has all of the following:

1. immutable key, semantic version, digest, licence/provenance record, owner,
   lifecycle state, dependencies, compatibility declaration, and deprecation
   policy;
2. typed Graph binding contract, declared compiler output slots, deterministic
   fixture, focused positive tests, and fail-closed negative tests;
3. generated Web/API/database/policy/flow/test/documentation contributions
   where the capability declares those surfaces;
4. two independently generated Profile Graphs with locked versions and
   isolated verifier evidence; and
5. an entry in the 100+ Profile recipe catalogue that names its capability
   locks and binding requirements.

Existing 23 families are audited rather than grandfathered. A family missing
the proof remains `candidate`, `quarantined`, or `partial`; it does not count.

### 4. Profile portfolio

Maintain a versioned `ProfileRecipeCatalogV1` of at least 100 representative
application recipes. A recipe is a declarative feasibility map, not a claim of
100 production applications. It records the business domain, required
capabilities, required bindings, target surfaces, acceptance journeys, and
known unsupported requirements. At least 12 anchor recipes spanning internal
workflow, operations, scheduling, customer support, content/data management,
retail, restaurant, and ecommerce must compile and have deterministic profile
tests. Each new Foundry-verified family must appear in two accepted anchor
Profiles before promotion.

### 5. Guided Workbench flow

The Workbench gains Factory-owned, editable surfaces for Requirement,
Composition Plan, plan risk/compatibility evidence, bounded Graph Diff review,
and role simulation. It must show Graph-owned fields and package locks rather
than a third-party editor document. Users may accept a valid proposal into a
Draft, then edit the Draft, publish, compile, and open the existing local
prototype flow.

## Delivery trains

| Train                     | Product proof                                                 | Completion gate                                                              |
| ------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| A. Composition contracts  | Requirement -> deterministic plan -> rejected unsafe proposal | schemas, semantic validation, exact-plan checks, Draft-only enforcement      |
| B. Planner and review     | one approved plan changes a Draft; invalid/stale plans cannot | Control Plane APIs, Workbench review, fixture planner, guarded model adapter |
| C. Foundry quality system | assets are auditable and promotion is evidence-driven         | family manifest, provenance, matrix, promotion/rejection tests               |
| D. Capability batches     | capacity expands without vertical branches                    | 25–35 verified families, each observed in two Profiles                       |
| E. Portfolio proof        | representative breadth is describable and testable            | 100+ recipe catalogue and 12 compiled anchors                                |
| F. Release                | complete user flow remains verified                           | isolated Docker evidence, independent gates, clean pushed branch             |

## Ordered capability batches

The order maximizes shared application coverage. Each batch is independently
reviewable and may use audited Foundry candidates; it may not copy an upstream
repository without an approved source-study record.

1. **Foundation:** identity/session refinement, RBAC/policy, audit, CRUD,
   workflow, notification, files/media, import/export, search, reporting.
2. **Operational workflows:** scheduling, assignment/queue, SLA/escalation,
   comments/activity, forms, approvals, document generation, webhooks through
   controlled integration contracts.
3. **Commercial operations:** catalog, pricing, cart, order, inventory,
   simulated payment, fulfilment, returns/refunds, customer/account.
4. **Experience and data:** dashboard/read-model, table/form blocks, role
   navigation, accessibility/design tokens, seed scenario, test-journey pack.

The exact family count is evidence-driven: promote the first 25 that satisfy
all Foundry gates; continue to 35 when source evidence and two-Profile proof
are available. Do not inflate the count with aliases, historical versions, or
unverified candidates.

## Invariants

- Draft -> Publish -> immutable Compilation remains unchanged.
- Only Factory-owned schemas, validators, and planners interpret business
  semantics; no Profile-name conditional chooses capability behavior.
- Composition resolves approved immutable locks only; missing, unsigned,
  incompatible, deprecated, or partial assets fail closed.
- The model cannot choose package paths, network targets, URLs, source code,
  secrets, providers, arbitrary effects, or output destinations.
- External intake is metadata/quarantine/provenance work until a separately
  reviewed package promotion occurs.
- Generated source is never a Graph source of truth and is never reverse
  parsed.

## Explicit non-goals

- Production cloud delivery, fleet operations, real payments, or external
  identity-provider control.
- Claiming a representative recipe is a production-ready application.
- One-off vertical logic that is not reusable across two Profile Graphs.
- Automatic promotion, automatic publication, or automatic deployment.

## Goal completion

This Goal completes only when all six delivery trains have independent review,
QA, release, and PM acceptance at remote-reachable commits; 25–35 families are
Foundry-verified; 100+ recipes are catalogued; 12 anchors compile with
deterministic evidence; and the guided requirement-to-local-prototype path is
proven without retaining sensitive model material. Until then, the Goal stays
active and moves through bounded, committed iterations.
