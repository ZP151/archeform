# Active Profile Composition and Capability Kernel Plan

**Status:** Active implementation plan. This supersedes only the Restaurant
default-composition assumption in prior plans; it does not revise the
published-Graph lifecycle or external-intake policy.

## Objective

Make the Workbench's active Profile path truthful: a selected Profile must
lock, validate, and compile the real Golden packages which own its declared
behaviour. Then grow business coverage through shared capability families,
rather than adding another application-specific renderer or copying whole
upstream products.

The first proof fixes the current Restaurant Ordering divergence:

```text
Before: active default draft -> generic aliases + generic Foundation locks
After:  active default draft -> Restaurant Graph blocks + Restaurant package locks
```

This is deliberately not a claim that all compiler logic has already moved
into package adapters. The follow-up migration makes each locked package own
its target contributions and removes the corresponding compiler branches.

## Boundaries

- Draft -> Publish -> immutable Compilation remains unchanged.
- The Application Graph remains the source of truth. A Profile starter only
  seeds a Draft; it is not an alternative runtime model.
- No compatibility path is added for the archived platform.
- A package is not considered reusable merely because a lock exists. It needs
  declared inputs, verified fixtures, generated target output, and a removal
  test.
- External repositories enter through External Intake. A whole application
  repository is not copied into Factory. Permissively licensed, small, pure
  source paths may be selectively copied only after an immutable source-study,
  notices, digest, adaptation record, and replacement tests.

## Task 1: restore active Restaurant package composition

**Files:**

- Modify: `packages/capabilities/src/index.ts`
- Modify: `packages/capabilities/test/capability-registry.test.ts`
- Add/modify: `packages/capabilities/test/restaurant-profile.test.ts`

### Red

Add one focused active-path test using `composeDefaultCapabilityDraft` which
requires all of these immutable locks:

```text
restaurant.table-session
restaurant.ordering
restaurant.kitchen
restaurant.cashier
restaurant.reporting
```

It must also prove that the active Draft retains package-owned block types:

```text
restaurant-entry, menu-browser, order-cart, payment-checkout,
kitchen-board, cashier-console, restaurant-dashboard
```

The test must fail on the old generic-only Recipe and block aliasing.

### Green

1. Make the active `restaurant-ordering` recipe equal the established Profile
   recipe. Do not add `commerce.simulated-payment`: `restaurant.cashier` owns
   its bounded simulation effect for this Profile.
2. Add the explicit empty binding maps required for the existing pre-typed
   Restaurant package manifests. They are temporary only in the sense that
   Task 2 replaces them with strict package parameters; they are not a
   compiler fallback.
3. Stop translating Restaurant block types to generic block aliases in
   `createDefaultProfileBaseGraph`.
4. Update the expected active lock set and deterministic lock count. Preserve
   lock ordering and the no-implicit-asset assertions.

### Verification

```powershell
pnpm --filter @factory/capabilities test -- --run restaurant-profile capability-registry
pnpm --filter @factory/capabilities typecheck
pnpm --filter @factory/capabilities lint
```

## Task 2: type the existing Restaurant packages before migrating targets

**Files:**

- Modify: the five `packages/capabilities/src/assets/restaurant/*.ts` files
- Modify: matching immutable package `component.json` / `adapter.json` files
  under `packages/capabilities/assets/restaurant.*/1.0.0/`
- Modify: `packages/capabilities/src/index.ts` binding maps
- Add: focused contract and negative tests in
  `packages/capabilities/test/`

For each package, add `factory.capability-binding/v1`, exact `parameters`,
and validated bindings matching its input schema. At minimum:

| Package                    | Required Graph bindings               |
| -------------------------- | ------------------------------------- |
| `restaurant.table-session` | table entity, session entity          |
| `restaurant.ordering`      | order entity, order-line entity       |
| `restaurant.kitchen`       | kitchen-ticket entity, order entity   |
| `restaurant.cashier`       | order entity, payment-attempt entity  |
| `restaurant.reporting`     | order entity, inventory-ledger entity |

The typed contract must reject missing, extra, wrong-model, and stale Graph
symbol bindings. Regenerate package manifests/digests only with the repository
tooling so the source asset and immutable package agree.

## Task 3: migrate component target ownership

**Files:**

- Modify: `packages/compiler/src/page-runtime-projection.ts`
- Modify/add: `packages/capabilities/assets/restaurant.*/1.0.0/adapter.json`
  and templates
- Modify/add: compiler tests under `packages/compiler/test/`

Move one Restaurant target concern at a time out of compiler-owned
Profile/block switches into a selected package's declarative contributions:

1. table-session customer entry;
2. ordering/cart/receipt;
3. kitchen and cashier merchant surfaces;
4. reporting projection.

Each migration has a removal test: compiling a non-Restaurant Profile may not
emit the Restaurant package's routes, controller modules, schemas, or tests.
When all four pass, delete the equivalent compiler switch rather than retaining
a fallback.

## Task 4: first reusable business kernel

Implement families in this dependency order. Each family must compile and pass
the same generated journey in at least two Profiles before it is labelled
Golden.

1. `commerce.transaction`: idempotency, expected version, atomic mutation,
   audit and outbox receipt. Profiles: Restaurant + Ecommerce.
2. `commerce.fulfilment`: pickup/delivery/handoff state machine and role
   assignment. Profiles: Restaurant + Grocery Pickup.
3. `identity.member`: authenticated principal, saved location/preferences and
   membership state. Profiles: Restaurant + Ecommerce.
4. `scheduling.reservation`: availability, reservation, waitlist, capacity and
   notification intent. Profiles: Restaurant + Appointment.
5. `commerce.pricing`: price rule, promotion eligibility, voucher application
   and auditable calculation. Profiles: Restaurant + Ecommerce.

Do not build a menu, membership, delivery, or reservation screen directly in a
single Profile before its shared capability and two-Profile proof exist.

## Task 5: scale external reuse safely

External Intake already supplies deterministic Candidate lanes and batch
isolation. Extend it without exposing raw upstream data to the Workbench:

1. Retain immutable source snapshot, source digest, licence classification,
   notice inventory, SBOM and scan receipt in quarantine.
2. Automatically classify each source as direct dependency, provider adapter,
   selective source copy, or reference-only.
3. Generate a Candidate scaffold containing a Factory-owned manifest,
   fixture, source-study reference and negative contract tests.
4. Promote only after a verifier confirms the source path/digest, licence and
   notice record, adapter confinement, fixture, compiler output, and removal
   path. Candidate data never becomes an active package implicitly.

Initial high-value sources map to these families:

| Source class                             | Reuse mode                               | Target family                                  |
| ---------------------------------------- | ---------------------------------------- | ---------------------------------------------- |
| Puck, React Flow, XState, Prisma, Casbin | pinned dependency                        | authoring and compilation infrastructure       |
| Keycloak, Meilisearch, Novu, Gotenberg   | provider adapter                         | identity, search, notification, documents      |
| InvenTree                                | source study / selective pure logic only | inventory semantics                            |
| Medusa, Bagisto, Spree                   | source study / provider comparison       | commerce, pricing, fulfilment                  |
| TastyIgniter                             | source study                             | restaurant reservations and ordering semantics |
| Chatwoot                                 | source study / provider comparison       | customer service and activity operations       |

GPL, AGPL, commercial, or source-available source paths remain reference-only
unless a separately accepted licence decision changes Factory's licensing.

## Acceptance sequence

1. Task 1 is accepted when active Restaurant composition uses the five
   package locks and preserves the corresponding Graph block types.
2. Task 2 is accepted when every selected Restaurant package has a strict,
   valid binding contract and mismatch tests fail closed.
3. Task 3 is accepted when selected package contributions, not a generic
   Restaurant switch, produce the Restaurant target surfaces.
4. Each Task 4 family is accepted independently after two Profile generated
   apps pass Graph, simulator, API, database, and role-journey evidence.
5. Task 5 scales discovery and verification but never bypasses the Golden
   registry gate.

## Current truthfulness

As of this plan, Factory has starter breadth and verified Restaurant local MVP
evidence, but it does not yet support one hundred production scenarios. The
primary scaling unit is a verified capability family, not a copied vertical
application. A scenario becomes supported only after the relevant locked
packages, generated outputs, isolation tests and role journeys exist.
