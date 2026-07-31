# Generic Order Lifecycle Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development task-by-task with independent review after every task. Steps use checkbox syntax for tracking.

**Goal:** Publish commerce.order 2.0.1 as the first admissible Generic Commerce lifecycle package, then compile its create and transaction paths for Ecommerce, Retail Counter, and Grocery Pickup without changing Restaurant or historical locks.

**Architecture:** The package provides factory.order-create-handler v1, factory.transaction-operation-adapter v1, and commerce.order-event v1. The create handler receives a Factory-bound Store and Authorizer. Public Graph effects remain order.create and order.transition. Only transition follows parse -> prepare -> createStore -> executor.execute -> present.

**Tech Stack:** TypeScript, Zod, Vitest, pnpm, generated NestJS APIs, Prisma.

## Global Constraints

- Preserve every existing package root, digest, and historical lock. Do not modify commerce.order versions 1.2.0, 1.3.0, 1.3.1, 1.3.2, or 2.0.0.
- Compilers consume only Published revisions and exact immutable locks.
- Do not replace a public Graph effect with an internal adapter-stage effect.
- Do not select by Profile name, mutable Draft, source path, URL, or raw request.
- Restaurant source, recipes, compiler runtime, and assets are out of scope.
- Controllers transport validated requests only. They do not directly mutate selected orders, inventory, audit records, outbox events, or receipts.
- Preserve Draft -> Publish -> immutable Compilation. Simulated payment only.

## File Map

| Path | Responsibility |
| --- | --- |
| packages/capabilities/src/assets/commerce/order-v2-0-1.ts | Canonical 2.0.1 lifecycle manifest. |
| packages/capabilities/assets/commerce.order/2.0.1/** | Immutable manifest, adapter, templates, fixture, journey, and contract evidence. |
| packages/capabilities/src/assets/index.ts | Registers 2.0.1 without removing historic assets. |
| packages/capabilities/src/index.ts | Selects transaction 2.1.0 and order 2.0.1 only for Generic Profiles. |
| packages/capabilities/test/order-lifecycle-v2-package.test.ts | Package contract, fixture, digest, authorization, and persistence-boundary tests. |
| packages/compiler/src/index.ts | Resolves exact lifecycle contributions and active Prisma materialization. |
| packages/compiler/test/generic-order-lifecycle-v2.test.ts | Generated Generic create and transition execution. |
| packages/compiler/test/order-operations-runtime.test.ts | Historical V1 replay and V2 delegation regression. |
| packages/compiler/test/commerce-transaction-runtime.test.ts | V2 replay, mismatch, pending, stale, and rollback tests. |

## Contract

~~~ts
type OrderCreateRequestV1 = Readonly<{
  role: string;
  entityKey: string;
  input: Readonly<Record<string, unknown>>;
}>;

interface OrderCreateStoreV1 {
  createInitial(input: Readonly<Record<string, unknown>>): Promise<CreatedOrderV1>;
}

interface OrderCreateAuthorizerV1 {
  assertCreateAllowed(role: string): Promise<void>;
}

interface OrderCreateHandlerV1 {
  create(
    request: OrderCreateRequestV1,
    dependencies: Readonly<{
      store: OrderCreateStoreV1;
      authorizer: OrderCreateAuthorizerV1;
    }>,
  ): Promise<CreatedOrderV1>;
}
~~~

The Store is bound to the selected order entity and the Published Graph flow's initial state. The Authorizer is bound to that entity's create permission. The handler rejects malformed role/entity/input, mismatched entities, and caller-supplied id, status, or version before dependency calls. It authorizes once before persisting once and returns a frozen Store-produced record. It never exposes a transition operation.

### Task 1: Publish commerce.order 2.0.1

**Files:**

- Create: packages/capabilities/src/assets/commerce/order-v2-0-1.ts
- Create: packages/capabilities/assets/commerce.order/2.0.1/component.json
- Create: packages/capabilities/assets/commerce.order/2.0.1/adapter.json
- Create: packages/capabilities/assets/commerce.order/2.0.1/fixtures/default.json
- Create: packages/capabilities/assets/commerce.order/2.0.1/tests/contract.json
- Create: packages/capabilities/assets/commerce.order/2.0.1/templates/api/commerce-order-create-handler.ts.tpl
- Create: packages/capabilities/assets/commerce.order/2.0.1/templates/api/commerce-order-transaction-operation-adapter.ts.tpl
- Create: packages/capabilities/assets/commerce.order/2.0.1/templates/test/commerce-order-lifecycle.journey.ts.tpl
- Modify: packages/capabilities/src/assets/index.ts
- Modify: packages/capabilities/test/order-lifecycle-v2-package.test.ts

**Consumes:** The rejected 2.0.0 package only as historical input, V1.3.2 transition adapter semantics, V2.1 executor contract, and existing physical-package verifier.

**Produces:** A Golden 2.0.1 package with public order.create and order.transition effects, three explicit provider interfaces, and physical evidence that drives its exact create and transition boundaries.

- [ ] **Step 1: Write the failing focused tests**

~~~ts
it("executes the declared envelope through a bound Authorizer and Store", async () => {
  const handler = createCommerceOrderCreateHandlerV2_0_1();
  const calls: string[] = [];
  const created = await handler.create(
    { role: "shopper", entityKey: "order", input: { note: "ok" } },
    {
      authorizer: { assertCreateAllowed: async () => void calls.push("authorize") },
      store: { createInitial: async () => {
        calls.push("create");
        return { id: "server-1", status: "cart", version: 0 };
      } },
    },
  );
  expect(calls).toEqual(["authorize", "create"]);
  expect(created).toEqual({ id: "server-1", status: "cart", version: 0 });
});
~~~

- [ ] **Step 2: Verify RED**

Run: pnpm --filter @factory/capabilities test -- order-lifecycle-v2-package.test.ts

Expected: FAIL because the 2.0.1 package and its bounded handler do not exist.

- [ ] **Step 3: Implement only the 2.0.1 successor**

The template and source validate all request fields, reject id/status/version from caller input, reject an entity other than the declared order entity, invoke the Authorizer exactly once before the Store, and return a frozen Store result. Its fixture includes request envelope, expected persisted record, and negative cases. The transition contribution retains typed parse, prepare, createStore, and present behavior. All physical evidence files have one terminal newline and matching digests.

- [ ] **Step 4: Verify GREEN**

Run: pnpm --filter @factory/capabilities test -- order-lifecycle-v2-package.test.ts capability-registry.test.ts transaction-operation-adapters.test.ts

Expected: PASS; 2.0.0 is unchanged, no old package is overwritten, and missing or invalid evidence fails closed.

- [ ] **Step 5: Commit**

~~~bash
git add packages/capabilities
git commit -m "fix: bound generic order creation handler"
~~~

### Task 2: Select 2.0.1 only in Generic composition recipes

**Files:**

- Modify: packages/capabilities/src/index.ts
- Modify: packages/capabilities/test/commerce-transaction-profile-composition.test.ts
- Modify: packages/capabilities/test/order-operations-profile.test.ts

**Consumes:** Registered commerce.order 2.0.1 and commerce.transaction 2.1.0 assets.

**Produces:** Simple Ecommerce, Retail Counter, and Grocery Pickup select the exact 2.0.1/2.1.0 pair in both composition APIs. Restaurant remains on its historical V1 pair.

- [ ] **Step 1: Write failing lock tests**

~~~ts
it.each(["simple-ecommerce", "retail-counter", "grocery-pickup"] as const)(
  "%s has one 2.0.1 lifecycle lock and one 2.1.0 transaction lock", (profile) => {
    const { graph } = composeDefaultCapabilityDraft({ profile });
    expect(lockFor(graph, "commerce.order")).toMatchObject({ version: "2.0.1" });
    expect(lockFor(graph, "commerce.transaction")).toMatchObject({ version: "2.1.0" });
    expect(operationProviders(graph)).toHaveLength(1);
    expect(graph.integration.capabilities.map(({ key }) => key)).toEqual(
      expect.arrayContaining(["order.create", "order.transition"]),
    );
  },
);
~~~

- [ ] **Step 2: Verify RED**

Run: pnpm --filter @factory/capabilities test -- commerce-transaction-profile-composition.test.ts order-operations-profile.test.ts

Expected: FAIL because Generic recipes still select V1 packages.

- [ ] **Step 3: Implement exact locks and bindings**

Update both composition entry points. Bind orderEntity, orderFlow, customerRole, aggregateEntity, transactionFlow, and actorRole to declared Graph symbols. Do not remap public effects. Do not change Restaurant selection.

- [ ] **Step 4: Verify GREEN and commit**

Run: pnpm --filter @factory/capabilities test -- commerce-transaction-profile-composition.test.ts order-operations-profile.test.ts

Expected: PASS with historical replay evidence retained.

~~~bash
git add packages/capabilities
git commit -m "feat: lock generic commerce order lifecycle v2"
~~~

### Task 3: Compile exact Generic create and transaction paths

**Files:**

- Modify: packages/compiler/src/index.ts
- Create: packages/compiler/test/generic-order-lifecycle-v2.test.ts
- Modify: packages/compiler/test/order-operations-runtime.test.ts
- Modify: packages/compiler/test/commerce-transaction-runtime.test.ts
- Modify: packages/compiler/test/compilation-plan.test.ts

**Consumes:** Exact 2.1.0 transaction and 2.0.1 lifecycle lock/contribution identities and Generic Graph bindings.

**Produces:** Generated Generic APIs use the locked create handler for creation and the locked operation adapter/executor for transitions. V2.1 schema and migration contributions are active Prisma output. Catalog, Cart, and line-configuration handlers remain active.

- [ ] **Step 1: Write executable failing tests**

~~~ts
it.each(["simple-ecommerce", "retail-counter", "grocery-pickup"] as const)(
  "%s imports the locked V2 lifecycle", async (profile) => {
    const runtime = await importGeneratedRuntime(profile);
    const order = await runtime.create("shopper", orderEntity(profile), {});
    expect(order).toMatchObject({ status: initialState(profile), version: 0 });
    await expect(runtime.transition("shopper", orderEntity(profile), order.id, "submit", {
      expectedVersion: 0,
      idempotencyKey: "submit-1",
    })).resolves.toMatchObject({ receiptId: expect.any(String) });
  },
);
~~~

- [ ] **Step 2: Verify RED**

Run: pnpm --filter @factory/compiler test -- generic-order-lifecycle-v2.test.ts

Expected: FAIL because the compiler still selects V1 handlers or does not materialize active V2.1 schema/migration.

- [ ] **Step 3: Resolve and compile exact locked contributions**

Resolve exactly one 2.1.0 executor, one 2.0.1 create handler, and one 2.0.1 operation adapter. Verify source bytes, digest, target prefix, interface version, bindings, and dependency order. Adapt runtime.create to entity/action-bound Store and Authorizer dependencies. Delegate order.transition only to parse, prepare, createStore, executor, and present.

- [ ] **Step 4: Materialize active schema/migration**

Merge selected V2.1 fragments into generated schema.prisma and its executed migration chain. Do not emit disconnected fragments. Retain Catalog, Cart, and line-configuration registrations.

- [ ] **Step 5: Verify behavior and regression**

Run: pnpm --filter @factory/compiler test -- generic-order-lifecycle-v2.test.ts order-operations-runtime.test.ts commerce-transaction-runtime.test.ts compilation-plan.test.ts

Expected: PASS for server-generated initial records, replay, changed payload, pending duplicate, stale version, aggregate/inventory/audit/outbox/receipt rollback, active schema/migration, and generated TypeScript imports.

- [ ] **Step 6: Complete verification and commit**

Run: pnpm --filter @factory/capabilities test && pnpm --filter @factory/compiler test && pnpm --filter @factory/capabilities typecheck && pnpm --filter @factory/capabilities lint && pnpm --filter @factory/capabilities build && pnpm --filter @factory/compiler typecheck && pnpm --filter @factory/compiler lint && pnpm --filter @factory/compiler build && git diff --check

Expected: PASS with all Restaurant paths unchanged.

~~~bash
git add packages/capabilities packages/compiler
git commit -m "feat: compile generic order lifecycle v2"
~~~

### Task 4: Record Generic readiness without inflating Restaurant

**Files:**

- Modify: packages/capabilities/src/profile-readiness.ts
- Modify: packages/capabilities/test/profile-readiness.test.ts
- Create: docs/acceptance/generic-order-lifecycle-v2.md
- Modify: docs/project-status.md

**Consumes:** Passing package, lock, compiler, active Prisma, and three Generic Profile journey evidence.

**Produces:** Evidence-backed Generic Commerce readiness while Restaurant remains partial until its separate typed transaction migration.

- [ ] **Step 1: Write failing readiness test**

~~~ts
it("keeps V2 Generic transaction readiness partial without matching journeys", () => {
  expect(resolveTransactionReadiness({ core: "2.1.0", order: "2.0.1", journeys: [] }))
    .toBe("partial");
});
~~~

- [ ] **Step 2: Implement closed readiness and verify release evidence**

Require exact lock pair, one provider, active schema/migration evidence, and all three Generic journeys. Run pnpm test and git diff --check. Record only commands, pass state, Profile identity, package versions, and bounded artifact hashes.

- [ ] **Step 3: Commit**

~~~bash
git add docs packages/capabilities
git commit -m "docs: record generic order lifecycle evidence"
~~~

## Self-Review

- Tasks 1-3 resolve the create/transition gap without a V1 sidecar or Profile-name compiler switch.
- Task 4 prevents Generic success from being reported as Restaurant or portfolio-wide production completion.
- External source intake, real payments, identity, cloud deployment, and all Restaurant transaction code are deliberately excluded.
