---
Date: 2026-08-08
Status: Approved
Approved-By: Founder
Supersedes: none
Amends: docs/superpowers/specs/2026-08-07-governed-composition-capability-foundry-goal-design.md
Required-Plan: pending design review
---

# Base44-Inspired Golden Path Design

> **Historical status — 2026-08-10:** This iteration completed a fixed Expense
> Approval replay and retained useful Workbench, verification, and cleanup
> evidence. The 2026-08-09 Product Closure iteration inherited that evidence
> but reopened product closure because the replay did not start from a
> free-form requirement. The 2026-08-10 Restaurant Product iteration
> supersedes this document only as the forward product-experience target; this
> design remains historical regression evidence.

## Outcome

Factory Pilot will complete one low-friction, evidence-backed path from a
business requirement to a runnable local product before resuming breadth-first
Capability Foundry expansion.

```text
Discuss
  -> RequirementSpec
  -> reviewable CompositionPlan
  -> visual Graph Diff alternatives
  -> mutable Draft
  -> role and data simulation
  -> Publish
  -> immutable Compilation
  -> isolated verification
  -> local preview URL
```

This amendment changes delivery order, not platform authority. The
`ApplicationGraphV1` remains the sole business source of truth. The lifecycle
remains mutable Draft -> immutable Published Graph -> immutable Compilation.
Generated source, editor documents, AI responses, and runtime-provider state
remain derived or constrained material.

## Why this amendment is necessary

The active P1 Goal has established strong composition contracts, a governed
planner, Control Plane review APIs, 27 current capability families, and
isolated-verifier evidence. It has not yet completed the Workbench surfaces
that let a user travel through those capabilities as one coherent product.
Continuing toward 35 families and 100 recipes before closing the user journey
would increase portfolio breadth while preserving the largest product risk:
Factory still would not demonstrate a fast, understandable requirement-to-
runnable-product experience.

Base44 is useful as product-workflow evidence rather than source code. Its
public documentation shows a low-friction sequence built around distinct AI
chat modes, an all-pages canvas, workspace design systems, safe branches,
realtime development activity, GitHub integration, connector discovery, and
pre-publish security checks. Factory will adopt the interaction principles
that strengthen its Graph-first model and reject the parts that would create a
parallel source of truth or an unbounded platform scope.

## Product principles adopted from the study

### 1. Separate discussion from mutation

The Workbench presents three explicit modes:

- **Discuss:** clarify the outcome, actors, constraints, unresolved questions,
  and acceptance journeys without mutating a Draft.
- **Plan:** generate and compare schema-valid `CompositionPlanV1` alternatives,
  immutable capability locks, risks, and Graph Diff previews.
- **Build:** apply an accepted constrained Diff to a mutable Draft, then expose
  visual editing and simulation.

AI is optional in all three modes. Deterministic fixtures and planners remain
the test and CI authority. A provider cannot select paths, package sources,
URLs, credentials, executable code, or runtime destinations.

### 2. Make the Application Graph visible

The Golden Path uses a Factory-owned canvas to show the product as connected
views rather than disconnected forms:

- pages and routes;
- actors and roles;
- entities and relations;
- flows and guarded transitions;
- selected capability locks;
- Publish, Compilation, verification, and preview lineage.

Puck and XYFlow remain replaceable authoring adapters. Canvas coordinates,
editor notes, and selection state are presentation data, not business truth.
Only validated Graph operations may cross into a Draft.

### 3. Preview changes before applying them

Plan mode may present up to three bounded alternatives. Each alternative
contains:

- a safe summary;
- capability locks and compatibility evidence;
- a visual Graph Diff;
- affected pages, data, policy, and flows;
- acceptance journeys and known limitations.

Choosing an alternative records an accepted composition decision. It does not
publish or compile. Stale base checksums, altered locks, unsafe operations, and
unresolved required questions fail closed.

### 4. Make generated products coherent by default

Introduce a Factory-owned Experience System over the existing
`ExperienceModel`:

- semantic colour, typography, spacing, radius, elevation, and motion tokens;
- light and dark themes;
- responsive shell and page-layout recipes;
- approved component variants and density presets;
- accessible focus, contrast, validation, loading, empty, and error states.

The first Golden Path should normally require no visual adjustment. Users may
change declared tokens, layout constraints, content, and approved variants.
They may not inject arbitrary CSS, packages, scripts, or component source into
the Graph.

### 5. Treat simulation as the first product proof

Before Publish, the user can run seeded scenarios against the mutable Draft:

- switch roles;
- inspect visible navigation and allowed actions;
- submit and transition workflow records;
- observe audit events and denied actions;
- reset to a deterministic seed.

Simulation is clearly labelled and cannot be presented as deployment or
production verification. Publish and compilation still operate only through
the immutable lifecycle.

### 6. Collapse execution evidence into one activity timeline

Workbench presents compilation, isolated boot, migration, health, API,
journey, authorization-denial, idempotency, cleanup, and safe-diagnosis events
as one bounded timeline. It exposes status, duration, safe reason codes, and
artifact links without raw prompts, provider responses, secrets, request
bodies, or unbounded logs.

### 7. End the Golden Path at a usable preview

One primary action advances an eligible Published Graph through:

```text
Compile -> isolated boot -> verify -> preview URL
```

Success displays the preview, tested roles and journeys, evidence summary, and
cleanup control. Failure displays a safe diagnosis and may propose a
reviewable new Draft Diff; it never patches generated source, a Published
Graph, a Compilation, or running state.

## First acceptance profile

Expense Approval is the single Golden Path acceptance profile because it
already exercises actors, forms, records, policy, workflow, audit, generated
Web/API/database outputs, and the isolated verifier. Restaurant Ordering and
Simple Ecommerce remain regression profiles but do not block the first
product-flow acceptance.

The user acceptance journey is:

1. describe an expense-approval outcome in Discuss mode;
2. answer or explicitly defer bounded clarification questions;
3. compare at least two deterministic plan alternatives;
4. accept one plan and inspect its visual Graph Diff;
5. apply it to a Draft;
6. adjust an Experience token and one approved page layout;
7. simulate employee submission, manager approval/rejection, finance audit,
   and an authorization denial;
8. publish the Draft;
9. compile and pass the isolated verifier;
10. open the runnable local preview and prove cleanup.

## Delivery reprioritisation

### Add now

1. Workbench Discuss, Plan, and Build modes over existing composition APIs.
2. Requirement, plan-alternative, compatibility, and Graph Diff review
   surfaces.
3. Connected all-pages and application-lineage canvas.
4. Experience System tokens, approved variants, and responsive recipes.
5. Deterministic seed-data and role simulator.
6. Unified bounded Activity/Evidence Timeline.
7. One-action compile, isolated verification, and preview flow.
8. Draft revision comparison and restore UX using existing immutable
   lifecycle contracts.

### Reduce or pause

1. Pause new capability-family creation after the current 27-family portfolio.
2. Defer the 100+ recipe catalogue and remaining 12-anchor expansion until the
   Golden Path acceptance gate is green.
3. Do not add more vertical-specific implementation before Expense Approval
   closes the complete flow.
4. Do not build arbitrary source editing, arbitrary npm import, generated-
   source reverse parsing, or unconstrained visual styling.
5. Batch governance at shared-contract, dependency, provider, and release
   boundaries instead of adding a new approval ceremony for every local UI
   refinement.
6. Split oversized compiler, capability, intake, and Workbench modules only
   when the Golden Path task already changes that responsibility. Avoid a
   separate repository-wide refactor.

### Defer

- multi-user realtime collaboration and workspace administration;
- a general connector marketplace and shared connector credentials;
- production identity, real payments, custom domains, and managed cloud
  delivery;
- GitHub round-trip UX beyond the existing Graph-first export boundary;
- a full backend-as-a-service, realtime database, or arbitrary automation
  runtime;
- additional runtime/framework targets.

## Base44 feature disposition

| Base44 product pattern      | Factory disposition                                | Reason                                                                                          |
| --------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Distinct AI chat modes      | Adopt now                                          | Maps cleanly to Requirement, Plan, and constrained Draft mutation.                              |
| All-pages canvas            | Adopt now                                          | Makes the Factory-owned Graph and page portfolio understandable.                                |
| Design system               | Adopt now                                          | Enables coherent generated products without unbounded styling.                                  |
| Data management             | Adopt the seeded simulation subset                 | Validates Domain and Policy intent without creating a second database authority.                |
| Branches                    | Adapt as Draft revisions                           | Preserves Factory lifecycle and avoids competing Git semantics for business users.              |
| Activity Monitor            | Adapt as a redacted evidence timeline              | Supports debugging while protecting prompts, responses, credentials, and payloads.              |
| Security scan               | Add to the verification summary, then deepen later | Fits the publish/verify gate; one-click AI remediation may only propose a Draft Diff.           |
| GitHub integration          | Defer product UX                                   | Valuable for engineers but not required to prove the first Golden Path.                         |
| Connector catalogue         | Defer behind provider contracts                    | Permissions and credentials require a dedicated governed-provider slice.                        |
| Managed backend and hosting | Do not copy                                        | Factory compiles replaceable targets and must not become dependent on Base44 runtime semantics. |

## Source and dependency boundary

Base44 is a closed commercial product and architecture reference. No Base44
source, assets, prompts, schemas, design tokens, or proprietary implementation
may be copied into Factory Pilot. This design authorises only independently
implemented product patterns supported by public documentation.

Existing Puck, XYFlow, compiler, capability, and verifier dependencies remain
unchanged by this design. Any new package still requires an explicit pinned
version, licence and provenance record, removal path, focused tests, and the
repository dependency gate.

## Acceptance gates

- A user can complete the Expense Approval journey without editing source or
  manually assembling capability locks.
- Discuss mode cannot mutate a Draft; Build cannot start without an accepted,
  checksum-bound plan.
- The canvas and editors persist only validated Graph semantics; adapter state
  never becomes Graph authority.
- The default generated product is coherent in light and dark themes and meets
  the declared accessibility checks.
- Role simulation proves allowed and denied journeys before Publish.
- Only a Published Graph may compile, and the resulting application completes
  the isolated verifier before the preview is marked ready.
- Failure produces bounded evidence and, when possible, a reviewable Draft Diff
  without mutating immutable or generated artifacts.
- No raw prompt, provider response, credential, sensitive payload, or unbounded
  runtime log enters persisted state, evidence, screenshots, or reports.
- The Workbench build, focused component tests, Control Plane composition tests,
  compiler tests, and Expense browser E2E are green from a clean checkout.

## Roadmap effect

This design inserts a **P1 Product Closure** gate ahead of the remaining
Capability Foundry breadth gates. Existing Foundry contracts and evidence are
retained; no accepted work is rolled back. After Product Closure is accepted,
Factory resumes evidence regeneration, 25–35 family promotion, the recipe
catalogue, additional anchor Profiles, connectors, delivery, and fleet work in
that order.
