# Order Operations Capability Portfolio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move reusable catalog and order behaviour out of the
Restaurant-specific compiler path, then prove that three distinct published
Profile recipes compile from the same version-locked Order Operations packages.

**Architecture:** `ApplicationGraphV1` remains the only business source of
truth. New `commerce.catalog@1.1.0` and `commerce.order@1.1.0` packages own
declared generated-runtime handlers, while the compiler only resolves handlers
from an immutable composition lock and wires their declared routes. Restaurant
keeps table/session and kitchen extensions; Retail Counter and Grocery Pickup
are Graph recipes with no Restaurant entities or runtime selection.

**Tech Stack:** TypeScript, Vitest, pnpm/Turborepo, `@factory/graph`,
`@factory/capabilities`, `@factory/compiler`, generated NestJS/Next.js/Prisma
targets.

## Global Constraints

- Preserve Draft -> Publish -> immutable Compilation; compilers consume a
  Published Graph and its exact composition lock only.
- No legacy Python/console compatibility, profile-name compiler dispatch, or
  copying from external repositories.
- Every new package has a version, digest, manifest, declarative adapter,
  template, fixture, contract test, and package verification evidence.
- New profile recipes use the same generic package keys and versions; only
  declared Graph bindings, labels, pages, roles, fixtures, and fulfilment
  configuration may differ.
- Real payment, identity-provider, cloud deployment, external source-copy,
  Candidate promotion, and provider activation are outside this slice.
- Start all behaviour changes with a focused failing test and preserve the
  current Restaurant generated runtime until an extracted handler covers it.

---

## File Map

| Path                                                           | Responsibility                                                                         |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `packages/capabilities/src/assets/contract.ts`                 | Runtime-handler kinds and `FactoryProfile` union.                                      |
| `packages/capabilities/src/assets/commerce/catalog-v1-1-0.ts`  | Registered Catalog v1.1 Golden asset.                                                  |
| `packages/capabilities/src/assets/commerce/order-v1-1-0.ts`    | Registered Order v1.1 Golden asset.                                                    |
| `packages/capabilities/assets/commerce.catalog/1.1.0/**`       | Catalog manifest, adapter, generated handler template, fixture, and contract evidence. |
| `packages/capabilities/assets/commerce.order/1.1.0/**`         | Order manifest, adapter, generated handler template, fixture, and contract evidence.   |
| `packages/capabilities/src/assets/index.ts`                    | Current/Golden version registrations.                                                  |
| `packages/capabilities/src/index.ts`                           | Declarative profile recipes, bindings, and profile starters.                           |
| `packages/capabilities/test/order-operations-profile.test.ts`  | Same-lock/different-Graph recipe acceptance.                                           |
| `packages/capabilities/test/capability-registry.test.ts`       | Physical asset and current-version regression coverage.                                |
| `packages/compiler/src/index.ts`                               | Generated capability handler contract, resolver, and generic route wiring.             |
| `packages/compiler/test/order-operations-runtime.test.ts`      | Package-owned catalog/order runtime tests.                                             |
| `packages/compiler/test/profile-compilation.test.ts`           | No profile-name dispatch and generated-bundle regression coverage.                     |
| `apps/compiler-worker/test/order-operations-lifecycle.test.ts` | Published-only Worker lifecycle proof for the three profiles.                          |
| `docs/acceptance/order-operations-capability-portfolio.md`     | Commands, results, known gaps, and source/provenance boundary.                         |
| `docs/audits/restaurant-ordering-requirements-audit.md`        | Reconcile only the migrated Restaurant coverage and retained gaps.                     |

## Task 1: Publish Executable Catalog and Order Packages

**Files:**

- Create: `packages/capabilities/src/assets/commerce/catalog-v1-1-0.ts`
- Create: `packages/capabilities/src/assets/commerce/order-v1-1-0.ts`
- Create: `packages/capabilities/assets/commerce.catalog/1.1.0/**`
- Create: `packages/capabilities/assets/commerce.order/1.1.0/**`
- Modify: `packages/capabilities/src/assets/contract.ts`
- Modify: `packages/capabilities/src/assets/index.ts`
- Modify: `packages/capabilities/test/capability-registry.test.ts`
- Test: `packages/capabilities/test/order-operations-package.test.ts`

**Consumes:** Existing `commerce.cart@1.0.1` package-handler pattern and the
immutable physical-asset verifier.

**Produces:** Golden `commerce.catalog@1.1.0` and
`commerce.order@1.1.0` assets. The catalog package declares a `catalog`
handler for bounded list/read access; the order package declares an `order`
handler for create/transition access. These immutable v1.1 assets admit
`restaurant-ordering` and `simple-ecommerce`. Task 3 publishes new immutable
versions when it adds Retail Counter and Grocery Pickup eligibility; it never
rewrites the v1.1 manifests after release.

- [x] **Step 1: Write failing physical-package tests**

```ts
it("resolves executable Catalog and Order v1.1 packages", () => {
  expect(getCapabilityAsset("commerce.catalog").manifest).toMatchObject({
    version: "1.1.0",
    runtimeHandlers: ["catalog"],
  });
  expect(getCapabilityAsset("commerce.order").manifest).toMatchObject({
    version: "1.1.0",
    runtimeHandlers: ["order"],
  });
});

it("rejects modified Catalog v1.1 fixture bytes before lock creation", () => {
  expect(() =>
    createVerifiedCapabilityCompositionLock(tamperedInput, root),
  ).toThrow("verification evidence digest");
});
```

- [x] **Step 2: Verify RED**

Run: `pnpm --filter @factory/capabilities test -- --run test/order-operations-package.test.ts`

Expected: FAIL because neither `catalog-v1-1-0` nor `order-v1-1-0` is
registered and the handler kinds do not exist.

- [x] **Step 3: Add versioned manifests and declarative templates**

Extend `CapabilityRuntimeHandlerKindV1` with exactly `"catalog"` and
`"order"`. Use version `1.1.0`, a new package root, SHA-256 manifest/template
digests, fixture and contract-test digests, and only declared output slots.
`catalog` may list/read its bound entity after role permission checks;
`order` may create a declared cart-order and apply only declared flow events
with an expected version and idempotency key. Templates must contain no profile
name, SQL, URL, external provider field, secret, or arbitrary source input.

- [x] **Step 4: Register v1.1 as current without rewriting history**

Keep v1.0 assets in `capabilityAssets` for historical lock replay. Put v1.1
versions in `currentCapabilityAssets`; all new default recipes must select v1.1.

- [x] **Step 5: Verify GREEN and commit**

Run:

```text
pnpm --filter @factory/capabilities test -- --run test/order-operations-package.test.ts test/capability-registry.test.ts
pnpm --filter @factory/capabilities typecheck
pnpm --filter @factory/capabilities lint
```

Commit:

```text
git add packages/capabilities
git commit -m "feat: add executable catalog and order packages"
```

## Task 2: Resolve Package-Owned Catalog and Order Handlers

**Files:**

- Modify: `packages/compiler/src/index.ts`
- Create: `packages/compiler/test/order-operations-runtime.test.ts`
- Modify: `packages/compiler/test/profile-compilation.test.ts`
- Modify: `packages/compiler/test/compilation-plan.test.ts`

**Consumes:** Task 1 v1.1 locks and templates.

**Produces:** Generated runtime modules expose `CatalogHandler` and
`OrderHandler`; compiler wiring resolves each only from an immutable lock.
Generic catalog and order paths must not select behaviour from
`compositionProfile`.

- [x] **Step 1: Write failing runtime tests**

```ts
it("delegates catalog list and read to the locked Catalog handler", () => {
  const files = filesFor("simple-ecommerce");
  expect(files["api/src/application-runtime.ts"]).toContain(
    "getCatalogHandler",
  );
  expect(files["api/src/capabilities/commerce.catalog.ts"]).toContain(
    "catalogHandler",
  );
});

it("delegates create and transition to the locked Order handler", () => {
  const files = filesFor("simple-ecommerce");
  expect(files["api/src/application-runtime.ts"]).toContain("getOrderHandler");
  expect(files["api/src/capabilities/commerce.order.ts"]).toContain(
    "orderHandler",
  );
});
```

- [x] **Step 2: Verify RED**

Run: `pnpm --filter @factory/compiler test -- --run test/order-operations-runtime.test.ts`

Expected: FAIL because the generated `CapabilityRuntimeModule` has no catalog
or order handler and generic runtime paths still own the operations.

- [x] **Step 3: Add bounded generated handler interfaces and resolvers**

In `renderCapabilityContract`, define handler input/output types that carry
only role, Graph-bound entity/flow keys, record data, expected version,
idempotency key, `RecordStore`, and `assertAllowed`. Add resolver functions
that require exactly one locked module implementing each handler. Wire generic
catalog reads and order creation/transitions through those resolvers. Reject a
missing handler before mutating state.

- [x] **Step 4: Preserve the Restaurant extension boundary**

Keep the Restaurant table-session, kitchen, cashier, receipt, and merchant
specialisation in their existing extension modules. Replace only generic
catalog/order operations. Add a regression assertion that changing
`graph.integration.compositionProfile` cannot choose catalog/order handler
code when the same v1.1 locks are supplied.

- [x] **Step 5: Verify GREEN and commit**

Run:

```text
pnpm --filter @factory/compiler test -- --run test/order-operations-runtime.test.ts test/profile-compilation.test.ts test/composition-compilation.test.ts
pnpm --filter @factory/compiler typecheck
pnpm --filter @factory/compiler lint
```

Commit:

```text
git add packages/compiler
git commit -m "feat: compile package-owned catalog and order handlers"
```

Verified before this plan update:

```text
pnpm --filter @factory/compiler test                 # 185 passed
pnpm --filter @factory/capabilities test             # 221 passed
```

`compilation-plan.test.ts` also records the intended current versions and the
required order transition command inputs. It therefore cannot silently revert
the versioned order-command boundary while retaining a passing profile journey.

## Task 3: Add Retail Counter and Grocery Pickup as Composition Recipes

**Files:**

- Modify: `packages/capabilities/src/assets/contract.ts`
- Modify: `packages/capabilities/src/index.ts`
- Create: `packages/capabilities/test/order-operations-profile.test.ts`
- Modify: `packages/capabilities/test/commercial-profile-composition.test.ts`

**Consumes:** Task 1 v1.1 handler interfaces and package identities.

**Produces:** `retail-counter` and `grocery-pickup` Profile recipes with the
same generic Order Operations package lock sequence as simple ecommerce, but
distinct valid Graph entities, roles, routes, fulfilment flow, and seed data.

- [x] **Step 1: Write failing profile-composition tests**

```ts
it.each(["retail-counter", "grocery-pickup"] as const)(
  "shares generic Order Operations locks with Ecommerce for %s",
  (profile) => {
    expect(lockKeys(composeDefaultCapabilityDraft({ profile }))).toEqual(
      lockKeys(composeDefaultCapabilityDraft({ profile: "simple-ecommerce" })),
    );
  },
);

it("keeps Restaurant-only table and kitchen entities out of non-Restaurant recipes", () => {
  const graph = composeDefaultCapabilityDraft({
    profile: "retail-counter",
  }).graph;
  expect(graph.domain.entities.map(({ key }) => key)).not.toEqual(
    expect.arrayContaining(["restaurant-table", "kitchen-ticket"]),
  );
});
```

- [x] **Step 2: Verify RED**

Run: `pnpm --filter @factory/capabilities test -- --run test/order-operations-profile.test.ts`

Expected: FAIL because `FactoryProfile`, recipe registrations, and starters do
not yet include Retail Counter or Grocery Pickup.

- [x] **Step 3: Add declarative starter data and bindings**

Extend `FactoryProfile` with the two new profile keys. In
`packages/capabilities/src/index.ts`, introduce a declarative
order-operations starter configuration that supplies labels, roles, catalog
entity, order entity, line entity, merchant page, fulfilment event, and seed
data. Materialise it into each Graph starter and use it to construct
capability bindings; do not add compiler dispatch by profile key.

Retail Counter uses shopper/cashier roles and a counter collection/receipt
flow. Grocery Pickup uses shopper/fulfilment roles and a pickup-ready/handoff
flow. Publish `commerce.catalog@1.2.0` and `commerce.order@1.2.0` with the
same handler interface and new Profile eligibility before either recipe locks
them. Both use those new immutable package versions with
`commerce.cart@1.0.1`, `commerce.inventory@1.0.1`,
`commerce.inventory-ledger@1.0.0`,
`commerce.line-configuration@1.0.0`,
`commerce.simulated-payment@1.0.1`, `core.identity-context@1.0.0`, and
`core.location-context@1.0.0`, plus the existing core packages required by
the Ecommerce recipe.

- [x] **Step 4: Verify GREEN and commit**

Run:

```text
pnpm --filter @factory/capabilities test -- --run test/order-operations-profile.test.ts test/commercial-profile-composition.test.ts test/capability-registry.test.ts
pnpm --filter @factory/capabilities typecheck
pnpm --filter @factory/capabilities lint
```

Commit:

```text
git add packages/capabilities
git commit -m "feat: add retail and grocery composition recipes"
```

Verified before this plan update:

```text
pnpm --filter @factory/capabilities build
pnpm --filter @factory/capabilities test             # 223 passed
pnpm --filter @factory/capabilities typecheck
```

The `commerce.catalog@1.2.0` and `commerce.order@1.2.0` packages add only
verified Profile eligibility; their templates, fixtures, and contract evidence
remain byte-identical to v1.1. Historical v1.1 locks remain registered for
immutable replay.

## Task 4: Prove Generated Target Isolation and Reuse

**Files:**

- Modify: `packages/compiler/test/profile-compilation.test.ts`
- Modify: `packages/compiler/test/compilation-plan.test.ts`
- Create: `apps/compiler-worker/test/order-operations-lifecycle.test.ts`

**Consumes:** Tasks 1-3.

**Produces:** Deterministic generated bundles and Worker lifecycle evidence
for the three generic Order Operations profiles. Restaurant extensions appear
only in Restaurant artifacts; the generic package-owned Catalog/Order handlers
appear in Ecommerce, Retail Counter, and Grocery Pickup artifacts.

- [x] **Step 1: Write failing compilation and Worker tests**

```ts
it.each(["simple-ecommerce", "retail-counter", "grocery-pickup"] as const)(
  "emits locked generic handlers for %s",
  (profile) => {
    const files = filesFor(profile);
    expect(files["api/src/capabilities/commerce.catalog.ts"]).toContain(
      "catalogHandler",
    );
    expect(files["api/src/capabilities/commerce.order.ts"]).toContain(
      "orderHandler",
    );
  },
);

it("runs a Published Grocery Pickup compilation without Restaurant files", async () => {
  const result = await runQueuedCompilation(groceryPublishedInput);
  expect(result.status).toBe("succeeded");
  expect(result.artifactPaths).not.toContain(
    "api/src/restaurant/restaurant-command.service.ts",
  );
});
```

- [x] **Step 2: Verify RED**

Run:

```text
pnpm --filter @factory/compiler test -- --run test/profile-compilation.test.ts test/compilation-plan.test.ts
pnpm --filter @factory/compiler-worker test -- --run test/order-operations-lifecycle.test.ts
```

Expected: FAIL because Retail Counter and Grocery Pickup were not recognized
as valid PageModel/locked-handler compilations, and generic PageModel commerce
projection assumed the literal `order` DomainModel entity.

- [x] **Step 3: Add only compiler/Worker admission wiring required by the tests**

Ensure `buildCompilationPlan` and `generateApplicationBundle` use the
Published Graph plus immutable lock, never a mutable Draft. Add no runtime
provider, source-intake import, Restaurant fallback, or unbounded generated
route. Use deterministic bundle IDs and existing label-scoped cleanup.

- [x] **Step 4: Verify GREEN and commit**

Run:

```text
pnpm --filter @factory/compiler test -- --run test/order-operations-runtime.test.ts test/profile-compilation.test.ts test/compilation-plan.test.ts test/composition-compilation.test.ts
pnpm --filter @factory/compiler-worker test -- --run test/order-operations-lifecycle.test.ts
pnpm --filter @factory/compiler typecheck
pnpm --filter @factory/compiler lint
pnpm --filter @factory/compiler-worker typecheck
pnpm --filter @factory/compiler-worker lint
```

Commit:

```text
git add packages/compiler apps/compiler-worker
git commit -m "test: prove reusable order operations compilation"
```

Verified before this plan update:

```text
pnpm --filter @factory/capabilities test             # 223 passed
pnpm --filter @factory/capabilities typecheck        # passed
pnpm --filter @factory/capabilities lint             # passed
pnpm --filter @factory/capabilities build            # passed
pnpm --filter @factory/compiler test                 # 192 passed
pnpm --filter @factory/compiler typecheck            # passed
pnpm --filter @factory/compiler lint                 # passed
pnpm --filter @factory/compiler build                # passed
pnpm --filter @factory/compiler-worker test          # 76 passed
pnpm --filter @factory/compiler-worker typecheck     # passed
pnpm --filter @factory/compiler-worker lint          # passed
git diff --check                                     # passed
```

The generic PageModel projection now receives its order entity exclusively
from the immutable Composition Lock resolved by the compiler. It does not
infer an entity from a Profile name. The Restaurant runtime remains a separate
accepted extension boundary, so its transaction, table-session, kitchen, and
merchant artifacts are neither selected nor emitted for the three generic
Order Operations recipes.

## Task 5: Record Acceptance and Start the Next Capability Family

**Files:**

- Create: `docs/acceptance/order-operations-capability-portfolio.md`
- Modify: `docs/audits/restaurant-ordering-requirements-audit.md`
- Modify: `docs/project-status.md`

**Consumes:** Tasks 1-4 verification output.

**Produces:** Evidence that the three recipe graphs share generic locks,
compile distinct outputs, and retain known Restaurant gaps. It also opens the
next independent design cycle: `scheduling.reservation` and
`capacity.queue`, informed by TastyIgniter only after fixed-reference source
intake succeeds.

- [ ] **Step 1: Write failing acceptance assertions in code first**

Add the generated journey assertions before changing the acceptance document:

```ts
expect(await runGeneratedJourney(retailPublishedInput)).toMatchObject({
  passed: true,
  steps: expect.arrayContaining(["catalog", "cart", "payment", "receipt"]),
});
expect(await runGeneratedJourney(groceryPublishedInput)).toMatchObject({
  passed: true,
  steps: expect.arrayContaining(["catalog", "cart", "payment", "pickup-ready"]),
});
```

- [ ] **Step 2: Verify RED and then GREEN**

Run the focused generated-journey test before and after the Task 4 wiring. The
RED must fail because the new profile runtime is missing; the GREEN must prove
only package-declared behaviour and role journeys.

- [ ] **Step 3: Perform fresh full verification**

Run:

```text
pnpm test --force
pnpm typecheck --force
pnpm lint --force
pnpm exec prettier --check packages/capabilities packages/compiler apps/compiler-worker docs
git diff --check
```

If a local `OPENAI_API_KEY` is available, make at most five guarded Graph-Diff
calls against a Draft only. Record only model identifier, call count, outcome,
and redacted artifact digests; never persist the key, prompt, or response. If
the key is unavailable, record that exact gate as unavailable without replacing
it with a fixture.

- [ ] **Step 4: Document boundaries and commit**

The acceptance document must distinguish deterministic compilation evidence
from a production deployment. Keep real payment, WeChat/Alipay login, loyalty,
reservation, delivery, offline writes, realtime kitchen delivery, financial
settlement, and import/export marked as not delivered.

```text
git add docs packages/capabilities packages/compiler apps/compiler-worker
git commit -m "docs: accept reusable order operations portfolio"
```

## Plan Self-Review

- **Coverage:** Tasks 1-2 move Catalog/Order implementation into physical,
  version-locked packages. Task 3 proves that profile breadth comes from
  composition recipes. Task 4 proves generated target isolation. Task 5
  records evidence and preserves the Restaurant gap boundary.
- **Dependency order:** Task 2 requires Task 1. Task 3 requires Task 1.
  Task 4 requires Tasks 1-3. Task 5 requires Tasks 1-4. Tasks 2 and 3 may
  proceed in parallel only in isolated worktrees because they modify different
  package roots.
- **Scope:** This plan adds no third-party code. The existing external-intake
  process remains the next source-study input, not a shortcut around package
  ownership or test evidence.
