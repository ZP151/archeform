---
title: "ADR-0018: Restaurant V3 Runtime Catalog Parity"
status: "Accepted"
date: "2026-08-14"
authors: "Archeform Tech Lead"
tags: ["architecture", "compiler", "restaurant", "runtime", "catalog", "money"]
supersedes: ""
superseded_by: ""
---

# ADR-0018: Restaurant V3 Runtime Catalog Parity

## Status and founder gate

**Accepted on 2026-08-14** under the founder's standing instruction
`参考以下总结，若符合项目目标，则持续接受而迭代。`

PM/controller confirms the condition is met. D0 is bounded to the existing
Restaurant V3 compiler target, additive and reversible, and corrects a concrete
product-truth gap: the generated customer and merchant product currently shares
one runtime catalog, but that catalog is unrelated to the validated Graph seed.
The decision directly advances a polished, editable, runnable dual Restaurant
product without adding a Graph schema, Capability, recipe, package, provider,
service, Publish path, worker path, Docker, Compose, or deployment. No new
founder prompt is required.

D0 is accepted and ready for one writer. It is not implemented or delivered.

## Recommendation

- **Keep** the accepted Node.js 22 and TypeScript platform, Application Graph
  V1/V2/V3 contracts, immutable Published-only compiler input, Composition Lock,
  Restaurant Product/Screen/Experience Recipes, generated state schema version
  `1`, and dependency-free dual-surface bundle.
- **Migrate additively** from the target's unrelated static runtime catalog to a
  deterministic catalog derived from the strict Published Restaurant V3
  `domain.seedData` plus its exact mirrored `fine-dining-service` scenario.
- **Migrate additively** from a single whole-Graph hash pin to a strict allowed-
  delta family whose normalization must reproduce the existing canonical hash.
- **Keep** Graph `menu-item.price` as a USD major-unit number. Admit only finite
  values from `0` through `100000` inclusive with at most two decimal places,
  require `Number(price.toFixed(2)) === price`, and emit the runtime/API value as
  `Math.round(price * 100)` integer minor units from `0` through `10000000`.
- **Reject** approximate float rounding, generic seed ingestion, another
  currency, runtime catalog fallback, browser-derived catalog state, mutable
  Draft compilation, and widening into Publish, workers, preview launch, or
  unrelated page/theme runtime rendering.

## Context

The strict Restaurant V3 compiler currently admits only canonical Graph hash
`sha256:13656b65e143d14dc0c812a7b955240527644506eb4d2518a4b2ed277e3caa23`.
The generated runtime instead seeds `dish-truffle-risotto` and
`dish-seared-salmon`; it does not consume the Graph's `margherita-pizza` and
`mushroom-risotto` records. Consequently the delivered mirrored Margherita name
edit can be correct in Draft/Snapshot preview while remaining absent from a
generated runnable product.

The delivered r.6 edit family is intentionally narrow:

1. application name;
2. `customer-menu` page title;
3. same-set ordering of the three existing `customer-home` blocks and matching
   `main` region IDs;
4. the mirrored `menu-item` / `margherita-pizza` / `name` value; and
5. `experience.theme.mode` between the canonical `light` and delivered `dark`.

D0 makes that family admissible at the pure compiler boundary and binds only
the catalog seed to generated runtime. It does not claim that the Control Plane
can Publish or queue the V3 Graph, that Workbench can launch the result, or that
page title/order and theme are fully rendered by generated UI.

## Strict Published and allowed-delta admission

The compiler continues to accept only the existing exact own-data wrapper
`{publishedGraph,compositionLock}`. It strict-copies hostile input without
executing getters, iterators, conversion hooks, or `toJSON`, validates an
immutable Published Graph V3 envelope, verifies its current Graph hash and
canonical Composition Lock, and returns only the fixed redacted error
`Restaurant product compilation input is invalid.` on failure. No request,
Graph, seed, URL, price, hostile value, or reflection error is logged or echoed.

After those checks, the target may accept the canonical Graph or the exact
allowed-delta family. It must validate the candidate values, clone the already
captured Graph, and normalize only these locations to their canonical values:

```text
metadata.name                                      -> Maison Aurelia private dining
page.customer-menu.title                           -> Menu
page.customer-home.blocks                          -> home-hero, home-categories, home-items
page.customer-home.recipe.main.blockIds            -> home-hero, home-categories, home-items
domain.seedData[margherita-pizza].values.name       -> Margherita pizza
seedScenarios[fine-dining-service]
  .records[margherita-pizza].values.name            -> Margherita pizza
experience.theme.mode                              -> light
```

The normalized Graph must hash to the existing canonical hash. This is the
complete negative-space proof: metadata identity, every other page/title/block,
surfaces, navigation, entities, relations, policies, flows, journeys,
authorities, bindings, scenarios, integrations, experience values, seed values,
array ordering, and own-data shape remain canonical. The home order must be a
duplicate-free permutation of exactly the three named block IDs, with the page
block order and recipe region order equal before normalization.

The mutable strings retain their delivered bounds: application/page title are
trimmed primitive strings of 2..80 characters; Margherita name is a trimmed
primitive string of 2..120 characters; none may contain C0 or DEL controls.
Theme mode is exactly `light` or `dark`. Canonical input must remain accepted
and byte/digest deterministic.

## Seed and catalog authority

Before rendering, require:

- exactly one `fine-dining-service` scenario and no second scenario;
- `domain.seedData` and scenario records have equal length and remain fully
  index-aligned: each scenario `entityKey` equals the seed `entity`, and every
  complete `values` object is deeply equal;
- exactly one `menu-category` entity definition and one `menu-item` entity
  definition; seed IDs are unique per entity; the canonical `mains` category
  and exactly the canonical two menu items exist once;
- the `menu-category` fields remain required `name:string`,
  `sortOrder:integer`, and `active:boolean`;
- the `menu-item` fields remain required `categoryKey:string`, `name:string`,
  `description:text`, `price:decimal`, `available:boolean`, `stock:integer`,
  `preparationMinutes:integer`, and `imageUrl:url`, in canonical order;
- menu item authorities remain client for `categoryKey`, `name`, `description`,
  `price`, `available`, `preparationMinutes`, and `imageUrl`, and server for
  `stock`; the complete binding multiset remains exactly equal to the accepted
  Screen Recipe contract; and manager retains `menu-item:update`;
- every menu item `categoryKey` resolves exactly one admitted category record.

Catalog values are bounded before source rendering:

- record/category keys use the existing 1..128 Graph-key syntax;
- category and item names are trimmed 1..120 strings without C0/DEL controls;
  the editable Margherita name additionally keeps its 2-character minimum;
- description is a trimmed 1..1000 string without C0/DEL controls;
- `available` and category `active` are primitive booleans;
- stock is an integer `0..10000`, preparation is an integer `1..1440`, and
  category sort order is an integer `0..10000`;
- image URL is a trimmed 1..2048 primitive without controls and follows the
  existing generated-UI safe URL rule: root-relative `/`, `#`, `?`, or an
  ASCII-case-insensitive `http://` or `https://` prefix. The canonical-hash
  proof still rejects any image URL drift in D0.

Price is the sole new stable representation decision. The Graph stores USD
major units. A value is valid only when it is finite, within `0..100000`, and
`Number(price.toFixed(2)) === price`. The compiler then emits
`Math.round(price * 100)` and requires that result to be an integer within
`0..10000000`. Values such as `NaN`, infinities, negative values, `100000.01`,
or `1.001` fail; the target never silently rounds them into acceptance.

## Generated runtime contract

`renderRestaurantCustomerRuntime(plan)` remains the single shared runtime
source producer. Its `seedModule` becomes plan-derived and emits catalog rows in
the exact `domain.seedData` menu-item order, each with:

```ts
{
  id,
  version: 1,
  categoryKey,
  name,
  description,
  price, // integer USD minor units
  available,
  stock,
  preparationMinutes,
  imageUrl,
}
```

The source is serialized from validated plain data only, not interpolated as
executable text. Customer and merchant starts continue to use the same state
file, state schema, catalog APIs, optimistic versions, authorization,
idempotency receipts, and audit behavior. Generated customer, merchant, and
cross-surface tests use the admitted Graph record IDs and prove
`Heirloom tomato pizza` plus `1400` minor units are visible from both catalog
APIs after one shared-state initialization.

## Compatibility, security, and operability

- V1 compilation remains byte-identical. V2 remains unsupported. The Graph V3
  schema, hash algorithm, adapter, Capability and Recipe data remain unchanged.
- D0 changes no exported runtime API, state schema version, endpoint, package,
  lockfile, filesystem boundary, provider, network integration, queue, service,
  Docker, Compose, or deployment behavior.
- Published identity/hash/lock admission, safe generated paths, static local
  imports, loopback binding, server authority, fixed errors, and generated-test
  cleanup remain mandatory.
- Existing runtime state files are development artifacts, not a migration
  target. Rollback restores the previous target files and tests; no stored
  Graph or lifecycle row changes.

## Alternatives, deferrals, and abort conditions

1. **Normalize an explicit delta family to the canonical hash — selected.** It
   preserves one exact negative-space oracle without importing Capabilities or
   another canonical source.
2. **Keep the whole-Graph hash pin — rejected.** It prevents the delivered edit
   family from reaching even the pure compiler target.
3. **Accept any structurally valid Restaurant V3 Graph — rejected.** It silently
   widens policy, journey, seed, and generated-runtime authority.
4. **Continue the static catalog — rejected.** It is demonstrably unrelated to
   Graph product truth.
5. **Compile a mutable Draft or Snapshot — rejected.** Only a strict synthetic
   Published envelope is used in D0 tests; lifecycle integration is deferred.

Explicitly deferred: additional Data fields or records, category CRUD, option-
group runtime parity, generic currencies, visible money formatting, generated
page-title/block-order/theme parity beyond current surface-plan admission,
Workbench, Control Plane, Publish, compilation queue/worker, PreviewRunner,
Docker/Compose, launch, deployment, Graph/Capability/Recipe changes,
dependencies/lockfiles, providers, and services.

Stop and return to Tech Lead/PM if implementation needs a canonical-source
import, an eleventh implementation path, a schema/recipe/capability edit,
another allowed Graph delta, a new runtime field/state version/API, approximate
money rounding, mutable Draft input, package/lock change, or any deferred
boundary.

## Implementation and delivery authority

One Sol writer owns exactly the ten compiler paths frozen in the
[design](../superpowers/specs/2026-08-14-restaurant-v3-runtime-catalog-parity-design.md)
and [plan](../superpowers/plans/2026-08-14-restaurant-v3-runtime-catalog-parity.md).
Any eleventh implementation path is a PM STOP.

Focused TDD, full Compiler/Graph/Capabilities tests, all three package no-emit
and build gates, generated customer/merchant/shared-state execution, exact
containment/static/sensitive checks, and one independent Sol review are
mandatory. No Terra or separate final Sol gate is required unless that review
finds a stable-boundary/security P0/P1 or requires scope escalation.

Only PM/controller may stage the exact ten implementation plus six governance
paths after clean review, commit
`fix(compiler): bind restaurant runtime catalog to graph seed`, push without
force, and prove local `HEAD` equals upstream with a clean tree.
