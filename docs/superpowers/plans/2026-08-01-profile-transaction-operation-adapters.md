# Profile Transaction Operation Adapters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` task-by-task with independent
> review after every task.

**Goal:** Compile generic Commerce and Restaurant operations through a shared,
atomic transaction core while retaining each Profile's typed business inputs,
effects, and response semantics in independently locked component packages.

**Architecture:** The current `commerce.transaction@2.0.0` remains an
unselected Golden core experiment. A new `2.1.0` core requires exactly one
`factory.transaction-operation-adapter/v1` provider. New
`commerce.order@1.3.0` and `restaurant.ordering@1.2.0` packages provide the
generic and Restaurant operation adapters. The compiler resolves all three
from the Published lock and generates only
`parse -> prepare -> executor.execute -> present` controller paths.

**Tech Stack:** TypeScript, Vitest, Zod, NestJS-generated APIs, Prisma,
PostgreSQL, pnpm.

## Global Constraints

- Preserve existing physical package bytes, package digests, and historical
  locks. Every contract change publishes a new versioned package root.
- Do not select a transaction executor by Profile name, mutable Draft, source
  path, prompt, URL, or raw request data.
- A transaction Profile selects exactly one operation adapter from its
  immutable lock. Zero or multiple providers fail before output.
- Controllers own transport only. They never mutate orders, tables, stock,
  payments, audit, or outbox records outside an adapter-created Store.
- Real payments, external identity, providers, cloud deployment, and external
  source imports remain out of scope.

---

### Task 1: Restore a green baseline before the V2.1 migration

**Files:**

- Modify: `packages/capabilities/src/index.ts`
- Modify: `packages/capabilities/test/commerce-transaction-profile-composition.test.ts`

**Consumes:** Current profile recipes prematurely selecting `commerce.transaction@2.0.0`
while no operation adapter/compiler integration exists.

**Produces:** All four current Profile recipes select historical V1 again;
V2 remains registered but unselected. The workspace test baseline is green.

- [ ] **Step 1: Write the failing baseline test**

```ts
it.each(commerceProfiles)("%s retains V1 until an operation adapter is locked", (profile) => {
  expect(transactionSelection(composeDefaultCapabilityDraft({ profile }).graph).lock)
    .toMatchObject({ key: "commerce.transaction", version: "1.0.0" });
});
```

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @factory/capabilities test -- commerce-transaction-profile-composition.test.ts`

Expected: FAIL because current recipes select `2.0.0`.

- [ ] **Step 3: Restore only current recipe selection**

Replace the four current selection identities with the exact `1.0.0` lock.
Do not alter V2 assets, their registry entry, historic snapshot resolution, or
readiness semantics.

- [ ] **Step 4: Verify GREEN and commit**

Run: `pnpm --filter @factory/capabilities test && pnpm --filter @factory/compiler test && pnpm --filter @factory/capabilities typecheck && pnpm --filter @factory/capabilities lint && git diff --check`

Expected: PASS.

```bash
git add packages/capabilities
git commit -m "fix: defer transaction executor profile migration"
```

### Task 2: Publish `commerce.transaction@2.1.0` with an operation-adapter requirement

**Files:**

- Create: `packages/capabilities/assets/commerce.transaction/2.1.0/**`
- Create: `packages/capabilities/src/assets/commerce/transaction-v2-1-0.ts`
- Modify: `packages/capabilities/src/assets/index.ts`
- Modify: `packages/capabilities/test/capability-registry.test.ts`
- Create: `packages/capabilities/test/transaction-operation-adapter-contract.test.ts`

**Consumes:** ADR-0009 V2 executor and ADR-0010 provider relationship.

**Produces:** An immutable V2.1 core whose manifest requires exactly one
`factory.transaction-operation-adapter/v1` capability contribution and whose
executor template exports:

```ts
export interface TransactionOperationAdapterV1<Request, Context, Response> {
  parseRequest(request: unknown): Request;
  prepare(request: Request): { command: CommerceTransactionCommandV1; context: Context };
  createStore(context: Context, dependencies: TransactionDependenciesV1): CommerceTransactionStoreV1;
  present(result: CommerceTransactionResultV1, context: Context): Response;
}
```

- [ ] **Step 1: Write failing package/provider tests**

```ts
it("requires exactly one V1 operation adapter provider", () => {
  expect(() => resolveTransactionOperationAdapter(noProviderLock)).toThrow("exactly one");
  expect(() => resolveTransactionOperationAdapter(twoProviderLock)).toThrow("exactly one");
});
```

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @factory/capabilities test -- transaction-operation-adapter-contract.test.ts`

Expected: FAIL because V2.1 and provider resolution do not exist.

- [ ] **Step 3: Create the V2.1 package**

Copy no bytes from V2.0 in place. Create a new package root, four
digest-covered executor/schema/migration/journey contributions, and a required
provider interface. Validate that provider contribution identity, interface
version, target, namespace, and digest are lock-covered.

- [ ] **Step 4: Verify GREEN and commit**

Run: `pnpm --filter @factory/capabilities test && pnpm --filter @factory/capabilities typecheck && pnpm --filter @factory/capabilities lint && pnpm --filter @factory/capabilities build`

Expected: PASS with V1/V2.0 bytes unchanged.

```bash
git add packages/capabilities
git commit -m "feat: require transaction operation adapters"
```

### Task 3: Publish the generic Commerce and Restaurant operation adapters

**Files:**

- Create: `packages/capabilities/assets/commerce.order/1.3.0/**`
- Create: `packages/capabilities/src/assets/commerce/order-v1-3-0.ts`
- Create: `packages/capabilities/assets/restaurant.ordering/1.2.0/**`
- Create: `packages/capabilities/src/assets/restaurant/ordering-v1-2-0.ts`
- Modify: `packages/capabilities/src/assets/index.ts`
- Create: `packages/capabilities/test/transaction-operation-adapters.test.ts`

**Consumes:** V2.1 executor/provider interface.

**Produces:** Two independently verified provider packages. Generic Commerce
handles a typed order transition; Restaurant validates typed table session,
lines, payment evidence, and cancellation reason before it returns its private
context. Both create Stores that perform all Profile-specific effects only
inside the core transaction boundary.

- [ ] **Step 1: Write failing conformance tests**

```ts
it("generic order adapter prepares a bound order command", () => {
  expect(genericAdapter.prepare(validOrderRequest).command.aggregate.entity).toBe("order");
});

it("restaurant adapter rejects a request without a declared table session", () => {
  expect(() => restaurantAdapter.parseRequest({ lines: [] })).toThrow("table session");
});
```

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @factory/capabilities test -- transaction-operation-adapters.test.ts`

Expected: FAIL because the successor packages do not exist.

- [ ] **Step 3: Add bounded providers**

Each adapter declares `factory.transaction-operation-adapter/v1` as an
executable contribution. Generic source accepts only declared order facts.
Restaurant source accepts only typed table/line/payment/cancellation facts;
it never receives free-form code, URL, credentials, or unvalidated Graph
lookup. Both source files, fixtures, conformance journeys, manifests, and
adapter declarations receive matching digests.

- [ ] **Step 4: Verify GREEN and commit**

Run: `pnpm --filter @factory/capabilities test && pnpm --filter @factory/capabilities typecheck && pnpm --filter @factory/capabilities lint && pnpm --filter @factory/capabilities build`

Expected: PASS.

```bash
git add packages/capabilities
git commit -m "feat: add transaction operation adapters"
```

### Task 4: Lock exactly one adapter per Profile and compile it

**Files:**

- Modify: `packages/capabilities/src/index.ts`
- Modify: `packages/capabilities/test/commerce-transaction-profile-composition.test.ts`
- Modify: `packages/compiler/src/index.ts`
- Modify: `packages/compiler/src/restaurant-runtime.ts`
- Modify: `packages/compiler/test/commerce-transaction-runtime.test.ts`
- Modify: `packages/compiler/test/compilation-plan.test.ts`
- Create: `packages/compiler/test/transaction-operation-adapter.test.ts`

**Consumes:** V2.1 core and the two locked operation provider packages.

**Produces:** Restaurant selects V2.1 + Restaurant Ordering adapter; Ecommerce,
Retail, and Grocery select V2.1 + Generic Order adapter. The compiler resolves
the exact one-provider set and emits generated controllers following the
adapter pipeline.

- [ ] **Step 1: Write behavioural RED tests**

```ts
it.each(["restaurant-ordering", "simple-ecommerce", "retail-counter", "grocery-pickup"] as const)(
  "%s executes parse, prepare, execute, and present through locked adapters",
  async (profile) => {
    const generated = await importGeneratedProfile(profile);
    await expect(generated.run(validRequest(profile))).resolves.toMatchObject({ receiptId: expect.any(String) });
  },
);
```

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @factory/compiler test -- transaction-operation-adapter.test.ts commerce-transaction-runtime.test.ts`

Expected: FAIL because V2.1 and provider packages are not compiled into a
controller/store pipeline.

- [ ] **Step 3: Compile the one-provider pipeline**

Resolve core + exactly one operation adapter from the immutable lock. Render
the four core contributions into active generated schema/migration/module/test
paths. Generate `parse -> prepare -> executor.execute -> present` in generic
and Restaurant controllers. Adapter-created Prisma and fixture Stores own all
business effects; no direct controller/order-service mutation remains.

- [ ] **Step 4: Verify atomic behaviour and generated compilation**

Run: `pnpm --filter @factory/compiler test -- transaction-operation-adapter.test.ts commerce-transaction-runtime.test.ts compilation-plan.test.ts`

Expected: PASS for all profiles: same-payload replay, changed-payload
rejection, pending duplicate, stale version, rollback of core plus Profile
effects, active schema/migration, and generated TypeScript typecheck.

- [ ] **Step 5: Run workspace regression and commit**

Run: `pnpm --filter @factory/capabilities test && pnpm --filter @factory/compiler test && pnpm --filter @factory/compiler typecheck && pnpm --filter @factory/compiler lint && pnpm --filter @factory/compiler build && git diff --check`

Expected: PASS.

```bash
git add packages/capabilities packages/compiler
git commit -m "feat: compile profile transaction operation adapters"
```

### Task 5: Record evidence-based readiness

**Files:**

- Modify: `packages/capabilities/src/profile-readiness.ts`
- Modify: `packages/capabilities/test/profile-readiness.test.ts`
- Modify: `docs/project-status.md`
- Create: `docs/acceptance/profile-transaction-operation-adapters.md`

**Consumes:** Passing V2.1 package, provider, compiler, generated project, and
four-Profile journey evidence.

**Produces:** `commerce.transaction` becomes available only when matching
immutable V2.1 and one-provider compilation evidence is present; otherwise it
remains partial.

- [ ] **Step 1: Write failing readiness test**

```ts
it("rejects availability without matching core and operation-adapter evidence", () => {
  expect(resolveTransactionReadiness(v21Lock, missingProviderEvidence)).toBe("partial");
});
```

- [ ] **Step 2: Verify RED, implement closed projection, verify GREEN**

Run: `pnpm --filter @factory/capabilities test -- profile-readiness.test.ts`

Expected: First FAIL, then PASS only for matching core lock, one adapter lock,
contribution hashes, generated TypeScript result, and four Profile journeys.

- [ ] **Step 3: Run release gate and commit**

Run: `pnpm test && git diff --check`

Expected: PASS. Record command names, pass states, and bounded artifact hashes;
never raw inputs, credentials, AI material, or external source bytes.

```bash
git add docs packages/capabilities
git commit -m "docs: record profile transaction adapter evidence"
```

## Self-Review

- **Spec coverage:** The first task restores a green current baseline; Tasks
  2–3 create immutable core/provider assets; Task 4 connects only locked assets
  to both controller paths; Task 5 prevents status inflation.
- **Type consistency:** The core requires one
  `factory.transaction-operation-adapter/v1` provider. Both successor packages
  provide that exact interface; controllers invoke the same four-stage
  pipeline.
- **Scope:** This plan does not activate payment, identity, providers, cloud,
  or external code. It creates the reusable bridge those later components need.
