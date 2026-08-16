# 2026-08-14 Archeform Product Direction and Delivery Assessment

Status: Recorded delivery assessment. This document describes the current
product position and recommended execution order. It does not replace the
active PM ledger, accept a proposed ADR, or authorize implementation outside
the active task boundaries.

Primary product direction:
`docs/iterations/2026-08-10-prompt-to-polished-product-reset.md`.
Live task authority:
`docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md`.

## Executive conclusion

Archeform has proved that a free-form requirement can enter a governed local
generation pipeline, become an Application Graph, be published, compiled,
started in isolation, verified, previewed, and cleaned up. That foundation is
real and materially ahead of a UI-only prototype.

Archeform has not yet proved the target product experience:

```text
one requirement
  -> a polished live product
  -> editable product models
  -> customer and operator surfaces
  -> visible and exportable generated source
  -> Publish
```

The project is at the transition from platform correctness to product delivery.
The next milestone must convert the delivered Graph foundation into one deep,
visually credible, behaviorally complete Restaurant Product. Further Graph
breadth, profile expansion, provider expansion, and heavy governance work must
not displace that milestone.

## Evidence baseline

The following reviewed foundations are delivered on
`feat/governed-composition-capability-foundry` and pushed to the upstream
branch:

| Foundation                       | Commit     | Current meaning                                                        |
| -------------------------------- | ---------- | ---------------------------------------------------------------------- |
| Executable technology governance | `484aa5c4` | Stable technology and delivery authority                               |
| Application Graph V2             | `a6e4e694` | Versioned product, surface, preview, and source-overlay contracts      |
| Application Graph V3             | `82301972` | Step-scoped journey actors and typed Domain, Flow, and Policy bindings |

At the time of this assessment, local `HEAD` and the upstream branch both point
to `82301972`. The current working tree is not clean. It contains active
documentation changes, proposed ADR-0011, the frozen Restaurant Task 2/Task 3
contract and plans, one UI reuse inventory, and seven untracked private package
scaffolds.

The seven UI and recipe packages contain manifests, TypeScript configuration,
and test scaffolds only. They contain no `src/**` implementation. They are not
accepted UI Registry assets and do not yet provide reusable runtime behavior.

## Current capability assessment

The percentages below are delivery estimates based on user-visible capability,
not source-line counts or ledger item counts.

| Product layer                                         | Estimated maturity | Assessment                                                                                                                         |
| ----------------------------------------------------- | -----------------: | ---------------------------------------------------------------------------------------------------------------------------------- |
| Local generation and isolated verification foundation |             70–80% | The generic pipeline is proven with two materially different products, including cleanup and guarded real-model evidence.          |
| Versioned Application Graph contracts                 |             75–85% | V1, V2, and V3 contracts exist, but the production compiler remains V1-only.                                                       |
| Prompt-to-Polished Restaurant Product                 |             25–35% | The target semantics and screen map are designed; the Restaurant Recipe, UI Registry, and dual-surface output are not implemented. |
| Base44-class product-builder experience               |             15–25% | The intended journey is documented, but the Workbench, template path, contextual editing, and source mode are not closed.          |
| Commercial production platform                        |             10–20% | Production identity, payments, managed deployment, observability, fleet operations, and provider delivery remain deferred.         |

## Intended direction

### Product development

The sole active product target remains a fine-dining Restaurant Product created
from one business requirement. It must generate two coordinated application
surfaces:

1. a customer mobile product with Home, Menu, Dish Detail, Cart, Checkout,
   Orders, Order Detail, and Profile;
2. a merchant desktop product with Dashboard, Menu Management, Orders, Kitchen
   Queue, Tables, Users/Roles, and Settings.

Both surfaces must share one Graph and one set of catalog, pricing, modifier,
cart, order, inventory, simulated-payment, identity, authorization, workflow,
and audit semantics. The output must be a runnable and independently verifiable
application, not a collection of shallow CRUD screens or a Workbench-only mock.

### Product research

Research must become executable product assets instead of a broad catalogue of
references. The next research cycle is limited to:

- Base44-style information architecture, context transitions, progressive
  disclosure, template cloning, build narration, preview, edit, and publish
  behavior without copying Base44 source, assets, prompts, schemas, tokens, or
  branding;
- approved Archeform registries and existing generated-project assets before
  creating a new UI primitive, pattern, business block, screen recipe,
  experience recipe, or product recipe;
- pinned, license-reviewed source studies for any external source intake;
- visual and behavioral acceptance fixtures tied to the fifteen Restaurant
  screens and their user journeys.

The project must not resume the 100+ Profile catalogue, broad capability-family
intake, connector marketplace, Figma or Stitch runtime integration, production
payments, cloud deployment, or fleet work until the Restaurant Product is
accepted.

## Immediate decision gate

Proposed ADR-0011 addresses a necessary ownership defect in Product Recipe V1.
V1 treats the entry page and visible navigation items as the complete set of
pages owned by a surface. The Restaurant Product needs Dish Detail, Checkout,
and Order Detail to belong to the customer surface without placing those pages
in the five-item bottom navigation.

The recommended decision is to accept ADR-0011 and:

- keep Product Recipe V1 and Application Surface V1 byte- and
  behavior-compatible;
- add Product Recipe V2 and Application Surface V2;
- introduce explicit `ownedPageKeys` for surface ownership;
- keep visible navigation separate from page ownership;
- reject missing, unknown, duplicate, or cross-surface ownership.

ADR-0011 remains proposed until the founder explicitly accepts or rejects it.
Recording this assessment is not that acceptance.

## Next-stage execution order

### Stage 1 — Deliver the Product Recipe V2 prerequisite

This is the next smallest valuable slice and must remain serialized:

1. record the founder decision on ADR-0011;
2. freeze the exact Product Recipe V2 source, test, export, and evidence paths;
3. implement strict V2 parsing, semantic validation, version dispatch, and a
   V1-to-V2 Draft adapter;
4. prove V1 parity, complete and unique ownership, navigation subset behavior,
   hostile-input rejection, browser parity, deterministic output, and
   declarations;
5. review, accept, commit, push without force, and prove local/upstream
   equality.

No further Graph contract expansion is planned after this prerequisite for the
Restaurant iteration.

### Stage 2 — Run Restaurant semantics and UI Registry in parallel

After Stage 1 is delivered, resume the disjoint Task 2 and Task 3 paths.

Task 2 delivers the deterministic Restaurant Product Recipe and Graph V3
semantics:

- catalog, category, modifier, and pricing;
- cart and server-derived totals;
- order transaction, inventory movement, simulated payment, receipt, and
  audit;
- table session, menu availability, kitchen queue, dining fulfillment, and
  reporting;
- customer, cashier, kitchen, and manager permissions and step-scoped
  journeys.

Task 3 delivers real implementation for the private UI source stack:

```text
ui-primitives
  -> ui-patterns
  -> workbench-ui / generated-ui
  -> screen-recipes
  -> experience-recipes
  -> product-recipes
```

Every registry asset must have a distinct key, parameter schema, allowed slots,
bindings, responsive variants, complete states, accessibility evidence,
fixtures, provenance, and tests. Package scaffolds without `src/**` are not
delivery.

### Stage 3 — Compile and run the two product surfaces

Task 4 produces the customer mobile application. Task 5 produces the merchant
desktop application. Both production compilers consume only an immutable
Published Graph. Draft Preview Snapshot rendering remains ephemeral,
non-exportable, non-deployable, and Compilation-free.

Acceptance includes migrations, health, customer and merchant role journeys,
permission denial, idempotency, shared transactions, audit, source output,
preview cleanup, and isolated runtime cleanup.

### Stage 4 — Rebuild the Workbench journey

The default Workbench flow becomes:

```text
Apps
  -> Describe or Start from Template
  -> Building / Live Preview
  -> Edit
  -> Publish
```

Graph, capability locks, lineage, evidence, Prisma, SQL, Casbin, provider
details, and diagnostics remain in Advanced contexts. Workspace Home, Builder
Workspace, and App Management become distinct, progressively disclosed
contexts. A curated template creates an independent editable Draft without
copying secrets or receiving later upstream changes.

Before new journey behavior accumulates, the oversized Workbench stylesheet,
Workbench controller, and Control Plane client must be characterized and split
by stable product context and responsibility. Review targets are at most 150
lines for global imports/reset/root tokens and 300 lines for feature CSS,
controllers, and clients unless a single-responsibility exception is recorded.

### Stage 5 — Close editing, source, and release behavior

- Page, Data, Users, Workflow, and Experience become contextual editors that
  create new Draft revisions and preview snapshots.
- Page selection synchronizes Preview, Puck, Data, Workflow, and the relevant
  generated source.
- Source Mode exposes the complete generated tree, origins, search, diff, ZIP,
  and Graph-first Git export.
- Writes remain limited to `src/extensions/**` and recipe-declared extension
  slots in this iteration.
- Final acceptance uses one guarded real-model Restaurant run, verifies all
  fifteen screens and both application journeys, and requires accessibility,
  theme, clean-checkout, source, and cleanup evidence before integration into
  `main` and repository release.

## Delivery-process corrections

The primary schedule risk is now governance latency rather than missing Graph
abstraction. The next iteration must preserve security and compatibility while
reducing non-product process overhead:

1. keep heavyweight independent gates at stable serialization, security,
   compiler/runtime, and final release boundaries;
2. use focused TDD and one scoped review for ordinary component, screen, and
   styling work;
3. apply repair caps to costly real-provider or environment reruns, not to
   deterministic local diagnosis and regression fixes;
4. request founder decisions only for material product scope, stable contract,
   new technology, security boundary, or irreversible delivery changes;
5. require each development cycle to produce a visible, runnable vertical
   slice rather than only a contract or ledger transition;
6. keep live ledgers concise and link to evidence instead of reproducing long
   chronological transcripts.

These corrections do not weaken the non-negotiable Draft, Published Graph,
Compilation, credential, source-provenance, or compatibility boundaries.

## Delivery horizon

The following estimates assume the Restaurant scope remains fixed, Product
Recipe V2 is accepted promptly, no additional Graph versions are introduced,
and implementation capacity remains continuously available:

| Outcome                                                                                     |     Estimated remaining time |
| ------------------------------------------------------------------------------------------- | ---------------------------: |
| Product Recipe V2 prerequisite                                                              | 2–4 focused development days |
| Restaurant Recipe and UI Registry                                                           |                    1–2 weeks |
| Customer and merchant compiler/runtime slices                                               |                    1–2 weeks |
| Workbench, contextual editors, and Source Mode                                              |                    2–3 weeks |
| Real-model acceptance and visual refinement                                                 |                    1–2 weeks |
| Credible local product Alpha                                                                |              5–8 weeks total |
| Small-user Private Beta                                                                     |             2–3 months total |
| Production platform with identity, payment, deployment, observability, and fleet operations |            6–12 months total |

These are outcome estimates, not commitments. The largest controllable risk is
returning to broad architecture, profile, or governance expansion before the
Restaurant Product is accepted.

## Success criterion

The next phase succeeds when a user can enter one high-end restaurant product
requirement, see a coherent live build, receive a polished customer mobile
product and merchant desktop product, optionally edit product models through
business-facing tools, inspect and export the generated source, publish the
application, and complete both role journeys without understanding Graph,
database, policy, package, or deployment internals.
