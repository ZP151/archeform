# Restaurant V3 Runtime Catalog Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development for every behavior change and superpowers:verification-before-completion before handoff. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing pure Restaurant V3 compiler admit the exact delivered r.6 Graph value family and seed both generated surfaces from its strictly validated catalog.

**Architecture:** Keep the existing strict Published wrapper, Graph V3 hash, Composition Lock, complete Restaurant structure, and fixed error boundary. Replace only the blanket canonical hash decision with local validation plus exact normalization back to the canonical hash; then extract one deterministic version-1 runtime catalog from the admitted seed and share the existing state/API between customer and merchant output.

**Tech Stack:** Node.js 22, TypeScript, Vitest, existing `@factory/graph`, `@factory/capabilities`, and dependency-free Restaurant V3 generated runtime.

## Global Constraints

- Base and upstream are exactly `97b6dbdb6176ca26af6d7fa2b71dad6bbc692e19`; Task 8C is delivered there with subject `feat(workbench): add verified source transfer`.
- [ADR-0018](../../adr/adr-0018-restaurant-v3-runtime-catalog-parity.md) is Accepted under the founder standing instruction `参考以下总结，若符合项目目标，则持续接受而迭代。`; D0 is ready for one writer and is not implemented or delivered.
- Compile only the current exact own-data `{publishedGraph,compositionLock}` boundary. Capture hostile input once through the existing strict copier, consume only captured plain data, and return only `Restaurant product compilation input is invalid.` on failure. Never log or echo Graph, seed, price, URL, hostile, or reflection material.
- Admit only the canonical Graph and the exact five-family r.6 value delta: application name, Customer Menu title, equal same-set Customer Home block/region order, mirrored Margherita name, and theme mode. Validate before normalization; the normalized full V3 hash must equal the existing canonical hash.
- Graph `menu-item.price` is a USD major-unit number. Accept only finite `0..100000` with `Number(price.toFixed(2)) === price`; emit `Math.round(price * 100)` integer minor units `0..10000000`. Reject excess precision before multiplication.
- Require exactly one `fine-dining-service` scenario and a full index-aligned deep seed mirror; unique 1..128 Graph keys; canonical `mains`, `margherita-pizza`, and `mushroom-risotto`; exact required menu-category/menu-item fields and order; all menu-item authorities client except server-owned `stock`; the complete 135-binding recipe contract; and manager `menu-item:update`.
- Category/item names are trimmed 1..120 strings without C0/DEL controls (editable Margherita minimum 2); description is trimmed 1..1000; booleans are primitive; stock is integer `0..10000`, preparation minutes `1..1440`, and category sort order `0..10000`. Image URL is trimmed 1..2048 with no controls and begins with `/`, `#`, `?`, or ASCII-insensitive `http://`/`https://`; every item category resolves.
- Runtime catalog rows preserve `domain.seedData` menu-item order, use version `1`, and contain only `id`, `version`, `categoryKey`, `name`, `description`, minor-unit `price`, `available`, `stock`, `preparationMinutes`, and `imageUrl`. Customer and merchant continue to share one state path and API.
- No Control Plane, worker, Publish, Workbench, PreviewRunner, Compose, Graph schema, Capability, Recipe, compiler facade/index, Prisma, package, lockfile, dependency, provider, network, service, Docker, or deployment change.
- One Sol writer owns exactly ten implementation paths. Any eleventh path or new canonical fixture/import is a PM STOP.
- Do not use package-manager, install, network, provider/model, service, Docker, or Compose commands. Use the existing local Node executables only.

---

## Exact implementation manifest

1. `packages/compiler/src/targets/restaurant-v3/contracts.ts`
2. `packages/compiler/src/targets/restaurant-v3/runtime-api.ts`
3. `packages/compiler/src/targets/restaurant-v3/customer-target.ts`
4. `packages/compiler/src/targets/restaurant-v3/merchant-target.ts`
5. `packages/compiler/src/targets/restaurant-v3/product-target.ts`
6. `packages/compiler/test/restaurant-v3-contract.test.ts`
7. `packages/compiler/test/restaurant-customer-runtime.test.ts`
8. `packages/compiler/test/restaurant-merchant-v3-runtime.test.ts`
9. `packages/compiler/test/restaurant-customer-target.test.ts`
10. `packages/compiler/test/restaurant-product-v3-target.test.ts`

## Frozen internal contract

Keep current public exports unchanged. Private helpers may use these shapes:

```ts
type RestaurantRuntimeCatalogItemV1 = {
  readonly id: string;
  readonly version: 1;
  readonly categoryKey: string;
  readonly name: string;
  readonly description: string;
  readonly price: number;
  readonly available: boolean;
  readonly stock: number;
  readonly preparationMinutes: number;
  readonly imageUrl: string;
};

function restaurantPriceMinor(price: unknown): number;
function restaurantRuntimeCatalog(
  plan: RestaurantProductPlanV1,
): readonly RestaurantRuntimeCatalogItemV1[];
```

`restaurantPriceMinor` must validate before multiplying:

```ts
if (
  typeof price !== "number" ||
  !Number.isFinite(price) ||
  price < 0 ||
  price > 100_000 ||
  Number(price.toFixed(2)) !== price
) {
  failRestaurantProductCompilationInput();
}
const minor = Math.round(price * 100);
if (!Number.isInteger(minor) || minor < 0 || minor > 10_000_000) {
  failRestaurantProductCompilationInput();
}
```

## Task 1: Exact r.6-family compiler admission

**Files:**

- Modify: `packages/compiler/test/restaurant-v3-contract.test.ts`
- Modify: `packages/compiler/src/targets/restaurant-v3/contracts.ts`

**Produces:** strict canonical and r.6-family admission without a blanket mutable hash allowance.

- [ ] **Step 1: Add a test-local r.6 candidate builder**

  Clone the existing canonical Restaurant V3 fixture inside the current test file. Change only `metadata.name`, `customer-menu.title`, both equal Customer Home orders, both mirrored Margherita names, and `experience.theme.mode`; recompute the Graph V3 hash and rebuild the Composition Lock with existing imports. Do not add or import a new fixture path.

- [ ] **Step 2: RED canonical and r.6 positive admission**

  Require canonical plan/hash output to remain deterministic. Require an r.6-family input with `Maison Rivage`, `Seasonal Menu`, `home-items/home-hero/home-categories`, `Heirloom tomato pizza`, and `dark` to pass and retain those values in its plan.

- [ ] **Step 3: RED the complete negative space**

  Table-drive one-at-a-time failures for an unequal/duplicate/missing/extra Home order; another page title, block value/order, navigation, entity/field/index/relation, seed/scenario record/value/order, policy, flow, journey, authority, binding, locale, theme token, integration, application/workspace identity, or envelope/lock change. Require the fixed error and no hostile value in it.

- [ ] **Step 4: RED strict catalog structure and hostile capture**

  Require one exact `fine-dining-service` scenario, full index-aligned deep mirror, unique entity/id pairs, the canonical category/two menu items, resolving category references, exact required fields/types/order, exact authorities/bindings, and manager `menu-item:update`. Cover accessors, inherited/non-enumerable/symbol properties, array subclasses, sparse arrays, proxies/reflection failures, cycles, conversion hooks, and `toJSON`; assert no caller behavior is invoked or echoed.

- [ ] **Step 5: Run focused RED**

  From `packages/compiler`:

  ```powershell
  node node_modules/vitest/vitest.mjs run test/restaurant-v3-contract.test.ts
  ```

  Expected: new r.6 positive cases fail under the blanket hash pin; negative and hostile tests characterize the unchanged fail-closed boundary.

- [ ] **Step 6: GREEN exact validation and restoration**

  On the strict copied Graph only, run existing V3/hash/lock and complete structure checks. Validate the allowed values and seed invariants, clone the candidate, and restore exactly:

  ```text
  metadata.name                                      = Maison Aurelia private dining
  page.customer-menu.title                           = Menu
  page.customer-home.blocks                          = home-hero, home-categories, home-items
  page.customer-home.recipe.main.blockIds            = home-hero, home-categories, home-items
  seed margherita-pizza values.name                  = Margherita pizza
  scenario mirror margherita-pizza values.name       = Margherita pizza
  experience.theme.mode                              = light
  ```

  Require the normalized Graph hash to equal `sha256:13656b65e143d14dc0c812a7b955240527644506eb4d2518a4b2ed277e3caa23`. Do not normalize before validating an allowed candidate and do not mutate admitted output.

- [ ] **Step 7: Run focused GREEN**

  ```powershell
  node node_modules/vitest/vitest.mjs run test/restaurant-v3-contract.test.ts
  ```

## Task 2: Strict Graph-seeded runtime catalog and money

**Files:**

- Modify: `packages/compiler/test/restaurant-customer-runtime.test.ts`
- Modify: `packages/compiler/test/restaurant-merchant-v3-runtime.test.ts`
- Modify: `packages/compiler/src/targets/restaurant-v3/runtime-api.ts`

**Produces:** deterministic Graph-derived seed source consumed by the existing shared runtime state/API.

- [ ] **Step 1: RED exact catalog rows and seed order**

  Render canonical and r.6 plans. Execute or inspect the generated seed through the existing runtime harness and require exact IDs `margherita-pizza`, `mushroom-risotto`, version `1`, seed order, category keys, descriptions, availability, stock, preparation, safe image URLs, and minor prices `1400`/`1800`. Require r.6 customer and merchant reads to return `Heirloom tomato pizza` from the same state/API.

- [ ] **Step 2: RED bounds, URL, mirror, and money edges**

  Cover primitive/bounded category names, item names/descriptions, booleans, integer stock/preparation/sort order, key syntax, category resolution, and image URL length/control/scheme. Price cases must include valid `0`, `14`, `14.5`, `14.25`, `100000` and invalid `NaN`, infinities, negatives, `100000.01`, `1.001`, strings, boxed numbers, and hostile objects. Require one fixed error with no input echo.

- [ ] **Step 3: Run focused RED**

  ```powershell
  node node_modules/vitest/vitest.mjs run test/restaurant-customer-runtime.test.ts test/restaurant-merchant-v3-runtime.test.ts
  ```

  Expected: FAIL because the generated seed still contains unrelated static dishes.

- [ ] **Step 4: GREEN private catalog extraction**

  Add private catalog and price helpers inside `runtime-api.ts`. Read only the fully admitted plan; preserve menu-item seed order; serialize rows with `JSON.stringify` rather than source concatenation. Keep `RestaurantRuntimeSourceV1` and `renderRestaurantCustomerRuntime(plan)` public signatures unchanged, keep state schema version `1`, and seed only on existing first initialization.

- [ ] **Step 5: Run focused GREEN**

  ```powershell
  node node_modules/vitest/vitest.mjs run test/restaurant-customer-runtime.test.ts test/restaurant-merchant-v3-runtime.test.ts
  ```

## Task 3: Generated customer and merchant journey identity parity

**Files:**

- Modify: `packages/compiler/test/restaurant-customer-target.test.ts`
- Modify: `packages/compiler/src/targets/restaurant-v3/customer-target.ts`
- Modify: `packages/compiler/src/targets/restaurant-v3/merchant-target.ts`

**Produces:** generated tests and journey requests use the admitted Graph record identities.

- [ ] **Step 1: RED current record IDs across both generated surfaces**

  Require customer catalog/dish calls and merchant menu/availability/update calls to use `margherita-pizza` or `mushroom-risotto`, never `dish-truffle-risotto` or `dish-seared-salmon`. Execute the existing generated Node journey tests for canonical and r.6 output and require shared catalog reads plus the existing authority denials.

- [ ] **Step 2: Run focused RED**

  ```powershell
  node node_modules/vitest/vitest.mjs run test/restaurant-customer-target.test.ts test/restaurant-merchant-v3-runtime.test.ts
  ```

- [ ] **Step 3: GREEN derive journey IDs from the admitted plan**

  Replace unrelated hard-coded dish IDs only where generated customer/merchant source constructs requests or assertions. Derive deterministic record IDs from the validated catalog/plan; do not add a runtime endpoint, state version, role, permission, fallback, or public compiler interface.

- [ ] **Step 4: Run focused GREEN**

  ```powershell
  node node_modules/vitest/vitest.mjs run test/restaurant-customer-target.test.ts test/restaurant-merchant-v3-runtime.test.ts
  ```

## Task 4: Product bundle shared-state proof

**Files:**

- Modify: `packages/compiler/test/restaurant-product-v3-target.test.ts`
- Modify: `packages/compiler/src/targets/restaurant-v3/product-target.ts`

**Produces:** one deterministic product bundle whose two entry points observe the same Graph-derived catalog state.

- [ ] **Step 1: RED canonical parity and r.6 bundle**

  Require two canonical compiles to remain byte/digest identical. Compile the synthetic r.6 input and run both entry points over the existing shared state path: both initially read `Heirloom tomato pizza` at minor price `1400`; an authorized merchant mutation remains visible to customer reads; restart preserves stored state rather than reseeding.

- [ ] **Step 2: RED narrow claims**

  Assert the r.6 input is admitted with its title/order/theme values while D0 tests claim only catalog runtime parity. Do not assert Publish, worker execution, Workbench launch, visible title/order/theme rendering, currency formatting, or another Data edit.

- [ ] **Step 3: Run focused RED**

  ```powershell
  node node_modules/vitest/vitest.mjs run test/restaurant-product-v3-target.test.ts
  ```

- [ ] **Step 4: GREEN minimal product wiring**

  Pass the one admitted plan/catalog source through the existing product assembly so customer and merchant receive the same runtime seed and state/API coordinate. Replace the shared-state generated test's unrelated static dish IDs with deterministic admitted catalog IDs; do not add another catalog copy, endpoint, state path, or fallback.

- [ ] **Step 5: Run focused GREEN**

  ```powershell
  node node_modules/vitest/vitest.mjs run test/restaurant-product-v3-target.test.ts
  ```

## Task 5: Compatibility, independent review, and controller delivery

**Files:** exact ten implementation paths only.

- [ ] **Step 1: Run the exact focused suite**

  ```powershell
  node node_modules/vitest/vitest.mjs run test/restaurant-v3-contract.test.ts test/restaurant-customer-runtime.test.ts test/restaurant-merchant-v3-runtime.test.ts test/restaurant-customer-target.test.ts test/restaurant-product-v3-target.test.ts
  ```

- [ ] **Step 2: Run full Compiler, Graph, and Capabilities compatibility**

  From the repository root:

  ```powershell
  node packages/compiler/node_modules/vitest/vitest.mjs run --root packages/compiler
  node packages/graph/node_modules/vitest/vitest.mjs run --root packages/graph
  node packages/capabilities/node_modules/vitest/vitest.mjs run --root packages/capabilities
  ```

- [ ] **Step 3: Run type and build gates**

  ```powershell
  node node_modules/typescript/bin/tsc --noEmit -p packages/compiler/tsconfig.json
  node node_modules/typescript/bin/tsc --noEmit -p packages/graph/tsconfig.json
  node node_modules/typescript/bin/tsc --noEmit -p packages/capabilities/tsconfig.json
  node node_modules/typescript/bin/tsc -p packages/compiler/tsconfig.json
  node node_modules/typescript/bin/tsc -p packages/graph/tsconfig.json
  node node_modules/typescript/bin/tsc -p packages/capabilities/tsconfig.json
  ```

- [ ] **Step 4: Prove generated journey execution**

  Require the existing customer, merchant, and product tests to run their generated `node --test` suites and report successful canonical plus r.6 customer/merchant behavior. Do not add an external service or manual runtime.

- [ ] **Step 5: Prove exact-ten containment and static safety**

  Run direct Prettier on the exact ten, `git diff --check`, Expected10/Actual10 equality, index-zero, banned-import/dependency/lock/facade/Graph/Capability/Recipe/Control-Plane/worker/Publish/Workbench scans, and explicit scans for `console`, raw Graph/seed interpolation, approximate price fallback, unrelated static dish IDs, and fixed-error leakage.

- [ ] **Step 6: Independent Sol review**

  Pause the writer. One fresh read-only intended-vs-implemented Sol review reconciles ADR-0018, design, plan, exact diff, hostile-safe capture, exact normalization/hash proof, seed/scenario mirror, schema/authority/bindings, money boundary, deterministic catalog, shared customer/merchant state, canonical compatibility, generated journey evidence, and exact-ten containment. Any P0/P1 returns to the same writer for bounded RED/GREEN repair inside exact ten, followed by full rerun and re-review. Terra and a separate final Sol are not required unless review escalates a stable-boundary/security P0/P1 or the repair changes this contract.

- [ ] **Step 7: Controller-only exact-sixteen delivery**

  After PM acceptance, controller stages exactly ten implementation plus six governance paths, proves Expected16/Actual16 with zero missing, unexpected, unstaged, or unrelated untracked paths, and runs staged diff/sensitive checks. Commit exactly:

  ```text
  fix(compiler): bind restaurant runtime catalog to graph seed
  ```

  Push without force, then prove local `HEAD` equals upstream and the worktree and index are clean. Any equality or containment failure stops delivery.

## Exact governance manifest

1. `docs/adr/adr-0018-restaurant-v3-runtime-catalog-parity.md`
2. `docs/project-status.md`
3. `docs/roadmap.md`
4. `docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md`
5. `docs/superpowers/plans/2026-08-14-restaurant-v3-runtime-catalog-parity.md`
6. `docs/superpowers/specs/2026-08-14-restaurant-v3-runtime-catalog-parity-design.md`

## Stop conditions

STOP for an eleventh implementation path; new canonical Graph source/fixture/import; another accepted Graph delta; generic seed/scenario ingestion; another currency; coercion, fallback, or implicit rounding; Graph/Capability/Recipe/schema/facade/API/state-version change; page/title/order/theme generated-render claim; Control Plane, worker, Publish, Workbench, PreviewRunner, Compose, Prisma, package/dependency/lock, provider/network/service, Docker/deployment work. Return to PM rather than widening the compiler boundary.
