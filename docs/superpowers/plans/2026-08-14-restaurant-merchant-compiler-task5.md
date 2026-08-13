# Restaurant merchant compiler Task 5 implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the delivered Restaurant Graph V3 compiler into one
independently runnable dual-surface local product with the exact seven-page
merchant desktop, shared customer/merchant state and APIs, and final strict V3
compiler dispatch.

**Architecture:** Keep Task 4's V3-native plan as the single source for both
surface projections. Extend its generated file-backed runtime with
Graph-authorized merchant queries and mutations, add a merchant UI contributor,
and assemble one product bundle containing both surface source trees and one
state schema. Server principal is fixed by the trusted startup function, never
by a request header; production identity remains explicitly deferred.

**Tech Stack:** TypeScript 5.7, Vitest 2.1, existing Graph V3, Capabilities,
Task 3 screen/experience registries, dependency-free generated Node 22 ESM.

## Global Constraints

- Base commit: `0e85ed6135abeea3f3c44624856b796fa05c2c03`.
- Do not modify Graph, Snapshot, Task 2, Task 3, Workbench, Control Plane, worker,
  verifier, package manifest, workspace manifest, or lockfile.
- Add no dependency and run no PATH `pnpm`, `corepack`, install, or resolution.
- V1 compilation output and digest behavior remain byte-identical. V2 remains
  unsupported. Strict Published V3 dispatch becomes supported only for the
  exact governed Restaurant graph accepted by Task 4.
- Do not down-convert V3 to V1 and do not create a generic target plugin union.
- Customer and merchant generated applications use the same state schema,
  revision ID, catalog, inventory, orders, tables, principals, settings,
  receipts, and audit records.
- `principalRole` is supplied only when the loopback server is created. Ignore
  and reject any caller attempt to set role through headers or bodies.
- Customer/cashier/kitchen/manager authorization, flow transition, field
  authority, expected-version, and idempotency checks are derived from the
  validated V3 plan. Totals, status, payment, stock movement, and audit remain
  server authoritative.
- Users/Roles is read-only in this task because the Graph declares no principal
  role/active write binding.
- Generated source has no private `@factory/*` runtime import, dynamic code,
  provider/network dependency, Docker/Compose requirement, or real payment.
- Preview remains pure, in-memory, Compilation-free, and artifact-free for both
  surfaces.

## Frozen path manifest

Create:

- `packages/compiler/src/targets/restaurant-v3/merchant-target.ts`
- `packages/compiler/src/targets/restaurant-v3/product-target.ts`
- `packages/compiler/test/restaurant-merchant-v3-runtime.test.ts`
- `packages/compiler/test/restaurant-merchant-v3-target.test.ts`
- `packages/compiler/test/restaurant-product-v3-target.test.ts`

Modify:

- `packages/compiler/src/targets/restaurant-v3/source-registry.ts`
- `packages/compiler/src/targets/restaurant-v3/surface-projection.ts`
- `packages/compiler/src/targets/restaurant-v3/preview.ts`
- `packages/compiler/src/targets/restaurant-v3/runtime-api.ts`
- `packages/compiler/src/targets/restaurant-v3/customer-target.ts`
- `packages/compiler/src/targets/restaurant-v3/index.ts`
- `packages/compiler/src/index.ts`
- `packages/compiler/test/restaurant-v3-surface-projection.test.ts`
- `packages/compiler/test/restaurant-v3-preview.test.ts`
- `packages/compiler/test/restaurant-customer-runtime.test.ts`
- `packages/compiler/test/restaurant-customer-target.test.ts`
- `packages/compiler/test/application-graph-version-dispatch.test.ts`

No other path is writable. Needing another path stops the writer for controller
reconciliation.

---

### Task 1: Make source and surface projection truly dual-surface

**Files:** source registry, surface projector, their two existing tests.

**Interfaces:**

```ts
export type RestaurantSurfaceSourceV1 = {
  readonly surfaceKey: RestaurantSurfaceKey;
  readonly module:
    | "src/generated/customer-restaurant-ui.mjs"
    | "src/generated/merchant-restaurant-ui.mjs";
  readonly digest: `sha256:${string}`;
  readonly origins: readonly RestaurantSourceOriginV1[];
  readonly code: string;
};

export function selectRestaurantSurfaceSource(
  surfaceKey: RestaurantSurfaceKey,
): RestaurantSurfaceSourceV1;
```

- [ ] Write RED tests that pin the exact seven merchant recipes/pages/routes in
      this order: Dashboard `/merchant`, Menu Management `/merchant/menu`,
      Orders `/merchant/orders`, Kitchen Queue `/merchant/kitchen`, Tables
      `/merchant/tables`, Users/Roles `/merchant/users`, Settings
      `/merchant/settings`.
- [ ] Assert exact sidebar order, every block and Domain/Flow/Policy port,
      `merchant-workspace-shell`, source origin/digest, successful ESM data-URL
      import, and rejection of customer/merchant cross-contamination or any
      invented/reordered page, block, port, navigation item, or source byte.
- [ ] Run the two focused files and capture missing/unsupported merchant RED.
- [ ] Generalize source selection and projection over the two exact surface
      keys; retain strict deep validation and frozen fresh output.
- [ ] Run both customer and merchant projections GREEN.

### Task 2: Render merchant Snapshot V2 preview through the shared projector

**Files:** preview renderer and its existing test.

- [ ] Add RED coverage for valid `merchant-desktop` rendering and exact
      production-plan parity. Retain wrong hash/revision, stale/expired/state,
      resolver exception redaction, Graph V1/V2, and recursive forbidden-key
      checks for each surface.
- [ ] Remove the customer-only preview restriction without changing the public
      signature or lifecycle rules.
- [ ] Run the preview suite GREEN and prove zero filesystem/artifact calls.

### Task 3: Extend the generated shared state and merchant API

**Files:** runtime renderer, existing customer runtime test, new merchant
runtime test.

**Generated state schema version remains `1` and adds deterministic records:**

```text
catalog items: version, name, description, price, available, stock
tables: id, version, code, number, capacity, status, active
principals: id, subjectRef, displayName, role, active
settings: version, name, currency, taxRate, serviceChargeRate, timezone,
          logoUrl, serviceOpen
orders: existing fields plus priority and kitchen status in the governed flow
```

**Merchant query endpoints:**

```text
GET /api/merchant/dashboard
GET /api/merchant/catalog
GET /api/merchant/orders
GET /api/merchant/kitchen
GET /api/merchant/tables
GET /api/merchant/principals
GET /api/merchant/settings
```

**Merchant mutation endpoints:**

```text
PATCH /api/merchant/catalog/:itemId
POST  /api/merchant/orders/:orderId/actions
POST  /api/merchant/kitchen/:orderId/actions
POST  /api/merchant/tables/:tableId/actions
PUT   /api/merchant/settings
```

- [ ] Write runtime REDs that start customer then manager/kitchen/cashier
      servers sequentially over one state file. A customer order must appear in
      merchant Orders/Kitchen; merchant availability/stock must affect customer
      catalog; kitchen progress must appear in customer order detail.
- [ ] Pin allowed actions to exact Graph transitions and roles. Manager handles
      menu/settings/table/cancel/priority; kitchen handles accept/start/ready;
      cashier handles simulated pay. Customer and wrong merchant roles receive 403. Principal list is read-only and every attempted mutation is 404/405.
- [ ] Test server-owned totals/status/payment/stock/audit, nonspoofable role
      headers/bodies, expected-version conflicts, same-operation receipt replay,
      cross-operation key separation, conflicting payload rejection, audit
      revision/actor/action, restart persistence, bounds, atomic writes, and
      cleanup.
- [ ] Extend seed/runtime source from validated Graph plan only. Recheck policy,
      transition, and field-authority conditions inside every mutation before
      state change. Failed, denied, conflict, and replay paths add no audit.
- [ ] Run customer and merchant runtime suites twice; both remain deterministic
      and leave no process/state/temp residue.

### Task 4: Render the exact merchant desktop contributor

**Files:** merchant target and merchant target test; customer target may expose
pure contributor helpers but must preserve its public bundle bytes unless the
corresponding compatibility pin intentionally records the dual-runtime schema
addition.

**Interfaces:**

```ts
export type RestaurantSurfaceBundleContributionV1 = {
  readonly surface: RestaurantSurfacePlanV1;
  readonly files: readonly GeneratedFile[];
};

export function renderRestaurantMerchantContribution(
  plan: RestaurantProductPlanV1,
): RestaurantSurfaceBundleContributionV1;
```

- [ ] RED-test seven exact routes and sidebar order, all Task 3 merchant
      renderers, data loading, and delegated forms/buttons for menu,
      availability/stock, cancel/priority/pay, kitchen transitions, tables, and
      settings. Users/Roles has no mutation control.
- [ ] Assert action names and payload fields equal declared Graph ports;
      unauthorized flags render disabled/absent controls. Unsafe URL and hostile
      state cases remain scrubbed/rejected by copied Task 3 source.
- [ ] Implement the dependency-free merchant app module, controller, complete
      responsive desktop CSS, source manifest contribution, and generated
      merchant journey test. Statically import copied source; never eval it.
- [ ] Materialize and import all seven rendered pages plus the generated test;
      prove no customer-only route/source appears in the merchant contribution.

### Task 5: Assemble and dispatch the final dual-surface Restaurant product

**Files:** product target, customer target, both index files, dispatch test,
customer target compatibility test, product target test.

**Interfaces:**

```ts
export function generateRestaurantProductApplicationBundle(
  input: PublishedApplicationGraphCompilationInput,
  options?: GenerateApplicationBundleOptions,
): GeneratedApplicationBundle;
```

- [ ] RED-test one deterministic bundle containing customer and merchant
      contributors, one runtime/state schema, two trusted startup entries
      (`start:customer`, `start:merchant`), shared graph/source manifest, and
      generated cross-surface journey tests.
- [ ] Execute the cross-surface test: customer submits an order; manager sees
      it; kitchen progresses it; customer sees the timeline; manager changes
      availability/stock; customer catalog reflects it; manager settings persist.
- [ ] Update `generateVersionedApplicationBundle`: strict adapter first; V1
      delegates byte-identically to the old generator; exact governed V3 calls
      `generateRestaurantProductApplicationBundle`; V2 retains its exact
      unsupported error; malformed/Draft/Snapshot/hash/lock fail before render.
- [ ] Assemble safe files from shared runtime plus both pure contributors.
      Compile twice and assert identical path/content/digest sets. Preserve the
      dedicated Task 4 customer generator and its established tests.
- [ ] Run dispatch and product target GREEN, including Graph V1 fixture byte
      parity and exact V2 unsupported behavior.

### Task 6: Verify, review, and deliver Task 5

- [ ] Run focused tests directly:

```powershell
cd packages/compiler
node node_modules/vitest/vitest.mjs run test/restaurant-v3-surface-projection.test.ts test/restaurant-v3-preview.test.ts test/restaurant-customer-runtime.test.ts test/restaurant-merchant-v3-runtime.test.ts test/restaurant-customer-target.test.ts test/restaurant-merchant-v3-target.test.ts test/restaurant-product-v3-target.test.ts test/application-graph-version-dispatch.test.ts
```

- [ ] Run full Compiler, Graph, and Capabilities suites, compiler/capabilities
      typechecks, compiler build, generated Node tests, direct Prettier on the
      exact 17 paths, and `git diff --check`.
- [ ] Prove Expected17/Actual17; package/lock/workspace/Graph/Task2/Task3/
      Workbench/Control Plane diffs zero; V1 parity; V2 unsupported; no private
      generated import, dynamic code, sensitive text, external technology, or
      leaked server/temp/state artifact.
- [ ] Request one independent review covering spec compliance and quality. One
      focused TDD repair/re-review is allowed for actionable findings; no heavy
      PM/Terra/Sol release loop is added.
- [ ] After P0/P1=0, controller stages the exact 17 paths, verifies cached
      equality/diff/sensitive scan, commits `feat(compiler): add restaurant
merchant v3 target`, pushes without force, and proves local HEAD equals
      upstream with a clean worktree.
