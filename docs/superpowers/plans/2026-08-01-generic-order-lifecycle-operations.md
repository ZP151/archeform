# Generic Order Lifecycle Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use \`superpowers:subagent-driven-development\` task-by-task with independent review after every task. Steps use checkbox (\`- [ ]\`) syntax for tracking.

**Goal:** Publish one immutable Generic Commerce order lifecycle package that owns safe order creation and the V2.1 transaction adapter, then compile it for Ecommerce, Retail Counter, and Grocery Pickup without changing Restaurant or historical locks.

**Architecture:** \`commerce.order@2.0.0\` provides \`factory.order-create-handler/v1\`, \`factory.transaction-operation-adapter/v1\`, and \`commerce.order-event@v1\`. Public Graph effects remain \`order.create\` and \`order.transition\`. The compiler resolves both contributions from the exact Published lock; only transition uses \`parse -> prepare -> createStore -> executor.execute -> present\`.

**Tech Stack:** TypeScript, Zod, Vitest, pnpm, generated NestJS APIs, Prisma.

## Global Constraints

- Preserve every existing package root, digest, and historical lock. Do not modify \`commerce.order\` versions \`1.2.0\`, \`1.3.0\`, \`1.3.1\`, or \`1.3.2\`.
- Compilers consume only Published revisions and exact immutable locks.
- Do not replace a public Graph effect with an internal adapter-stage effect.
- Do not select by Profile name, mutable Draft, source path, URL, or raw request. Restaurant source, recipes, compiler runtime, and assets are out of scope.
- Controllers transport validated requests only; they do not directly mutate orders, inventory, audit records, outbox events, or receipts.
- Preserve Draft -> Publish -> immutable Compilation. Simulated payment only.

## File Map

| Path | Responsibility |
| --- | --- |
| \`packages/capabilities/src/assets/contract.ts\` | Closed runtime vocabulary for the explicit create-handler boundary. |
| \`packages/capabilities/src/assets/commerce/order-v2-0-0.ts\` | Canonical V2 lifecycle manifest. |
| \`packages/capabilities/assets/commerce.order/2.0.0/**\` | Immutable manifest, adapter, templates, fixture, journey, contract evidence. |
| \`packages/capabilities/src/assets/index.ts\` | Registers V2 without removing historic assets. |
| \`packages/capabilities/src/index.ts\` | Selects V2.1/V2.0.0 only for the three Generic Profiles. |
| \`packages/compiler/src/index.ts\` | Resolves exact V2 lifecycle contributions and active Prisma materialization. |
| \`packages/capabilities/test/order-lifecycle-v2-package.test.ts\` | V2 asset, fixture, digest, and provider tests. |
| \`packages/capabilities/test/commerce-transaction-profile-composition.test.ts\` | Exact Generic V2 locks and Restaurant V1 preservation. |
| \`packages/compiler/test/generic-order-lifecycle-v2.test.ts\` | Generated Generic create/transition runtime execution. |
| \`packages/compiler/test/order-operations-runtime.test.ts\` | V1 replay and V2 create/transition delegation. |
| \`packages/compiler/test/commerce-transaction-runtime.test.ts\` | Generic V2 replay, mismatch, pending, stale, and rollback tests. |

## Contract

\`\`\`ts
export interface OrderCreateHandlerV1 {
  create(input: {
    readonly role: string;
    readonly entityKey: string;
    readonly input: Readonly<Record<string, unknown>>;
  }): Promise<Readonly<{ id: string; status: string; version: 0 }>>;
}
\`\`\`

The V2 package's create contribution can create only an initial \`draft\` aggregate at version zero. It has no transition method. Its transaction contribution retains the V1.3.2 typed request, \`createStore\`, and response contract. Missing, duplicate, wrong-version, wrong-digest, or incompatible providers fail before output.

### Task 1: Publish \`commerce.order@2.0.0\`

**Files:**

- Create: \`packages/capabilities/src/assets/commerce/order-v2-0-0.ts\`
- Create: \`packages/capabilities/assets/commerce.order/2.0.0/component.json\`
- Create: \`packages/capabilities/assets/commerce.order/2.0.0/adapter.json\`
- Create: \`packages/capabilities/assets/commerce.order/2.0.0/fixtures/default.json\`
- Create: \`packages/capabilities/assets/commerce.order/2.0.0/tests/contract.json\`
- Create: \`packages/capabilities/assets/commerce.order/2.0.0/templates/api/commerce-order-create-handler.ts.tpl\`
- Create: \`packages/capabilities/assets/commerce.order/2.0.0/templates/api/commerce-order-transaction-operation-adapter.ts.tpl\`
- Create: \`packages/capabilities/assets/commerce.order/2.0.0/templates/test/commerce-order-lifecycle.journey.ts.tpl\`
- Modify: \`packages/capabilities/src/assets/contract.ts\`
- Modify: \`packages/capabilities/src/assets/index.ts\`
- Create: \`packages/capabilities/test/order-lifecycle-v2-package.test.ts\`

**Consumes:** Historical V1.2 create semantics, V1.3.2 transition adapter semantics, the V2.1 executor contract, and existing physical-package verifier.

**Produces:** A Golden package whose public effects are exactly \`order.create\` and \`order.transition\`, with three explicit provided interfaces, verified physical evidence, and independently executable fixture tests.

- [ ] **Step 1: Write focused failing tests**

\`\`\`ts
it("registers one V2 lifecycle asset with create and transition providers", () => {
  const asset = currentCapabilityAssets.find(
    ({ manifest }) => manifest.key === "commerce.order" && manifest.version === "2.0.0",
  );
  expect(asset?.manifest.effects).toEqual(["order.create", "order.transition"]);
  expect(asset?.manifest.provides).toEqual(expect.arrayContaining([
    { interfaceKey: "factory.order-create-handler", version: "v1" },
    { interfaceKey: "factory.transaction-operation-adapter", version: "v1" },
    { interfaceKey: "commerce.order-event", version: "v1" },
  ]));
});
\`\`\`

- [ ] **Step 2: Verify RED**

Run: \`pnpm --filter @factory/capabilities test -- order-lifecycle-v2-package.test.ts\`

Expected: FAIL because \`commerce.order@2.0.0\` is absent.

- [ ] **Step 3: Implement the package**

The create template validates its declared role/entity and returns only a new \`draft\` record at version \`0\`. The operation template validates only declared order transition facts, passes typed context to \`createStore\`, and never offers a direct transition handler. Include exact contribution/fixture/contract digests and exactly one terminal newline per physical evidence file.

- [ ] **Step 4: Verify GREEN and historical immutability**

Run: \`pnpm --filter @factory/capabilities test -- order-lifecycle-v2-package.test.ts capability-registry.test.ts transaction-operation-adapters.test.ts\`

Expected: PASS; physical evidence verifies and historic package digests remain unchanged.

- [ ] **Step 5: Commit**

\`\`\`bash
git add packages/capabilities
git commit -m "feat: add generic order lifecycle package"
\`\`\`

### Task 2: Select V2 only in Generic composition recipes

**Files:**

- Modify: \`packages/capabilities/src/index.ts\`
- Modify: \`packages/capabilities/test/commerce-transaction-profile-composition.test.ts\`
- Modify: \`packages/capabilities/test/order-operations-profile.test.ts\`

**Consumes:** The registered V2 lifecycle asset and transaction V2.1 asset.

**Produces:** Simple Ecommerce, Retail Counter, and Grocery Pickup choose exactly \`commerce.order@2.0.0\` and \`commerce.transaction@2.1.0\` in both composition APIs; Restaurant keeps its exact historical V1 pair.

- [ ] **Step 1: Write failing lock tests**

\`\`\`ts
it.each(["simple-ecommerce", "retail-counter", "grocery-pickup"] as const)(
  "%s has one V2 order lifecycle and one V2.1 transaction lock", (profile) => {
    const { graph } = composeDefaultCapabilityDraft({ profile });
    expect(lockFor(graph, "commerce.order")).toMatchObject({ version: "2.0.0" });
    expect(lockFor(graph, "commerce.transaction")).toMatchObject({ version: "2.1.0" });
    expect(operationProviders(graph)).toHaveLength(1);
    expect(graph.integration.capabilities.map(({ key }) => key)).toEqual(
      expect.arrayContaining(["order.create", "order.transition"]),
    );
  },
);
\`\`\`

- [ ] **Step 2: Verify RED**

Run: \`pnpm --filter @factory/capabilities test -- commerce-transaction-profile-composition.test.ts order-operations-profile.test.ts\`

Expected: FAIL because Generic recipes still select V1 packages.

- [ ] **Step 3: Implement exact locks and bindings**

Update both composition entry points. Bind \`orderEntity\`, \`orderFlow\`, \`customerRole\`, \`aggregateEntity\`, \`transactionFlow\`, and \`actorRole\` to declared Graph symbols. Keep public effects unchanged and do not change Restaurant selection.

- [ ] **Step 4: Verify GREEN and commit**

Run: \`pnpm --filter @factory/capabilities test -- commerce-transaction-profile-composition.test.ts order-operations-profile.test.ts\`

Expected: PASS with historical replay evidence retained.

\`\`\`bash
git add packages/capabilities
git commit -m "feat: lock generic commerce order lifecycle v2"
\`\`\`

### Task 3: Compile the V2 Generic create and transaction paths

**Files:**

- Modify: \`packages/compiler/src/index.ts\`
- Create: \`packages/compiler/test/generic-order-lifecycle-v2.test.ts\`
- Modify: \`packages/compiler/test/order-operations-runtime.test.ts\`
- Modify: \`packages/compiler/test/commerce-transaction-runtime.test.ts\`
- Modify: \`packages/compiler/test/compilation-plan.test.ts\`

**Consumes:** Exact V2.1 and V2.0.0 lock/contribution identities and Generic Graph bindings.

**Produces:** Generated Generic APIs that use the locked create handler for creation and the locked operation adapter/executor for transitions. V2.1 schema/migration contributions become active Prisma output, while Catalog, Cart, and line-configuration handlers remain active.

- [ ] **Step 1: Write executable failing tests**

\`\`\`ts
it.each(["simple-ecommerce", "retail-counter", "grocery-pickup"] as const)(
  "%s imports its locked V2 lifecycle", async (profile) => {
    const runtime = await importGeneratedRuntime(profile);
    const order = await runtime.create("shopper", orderEntity(profile), {});
    expect(order).toMatchObject({ status: "draft", version: 0 });
    await expect(runtime.transition("shopper", orderEntity(profile), order.id, "submit", {
      expectedVersion: 0,
      idempotencyKey: "submit-1",
    })).resolves.toMatchObject({ receiptId: expect.any(String) });
  },
);
\`\`\`

- [ ] **Step 2: Verify RED**

Run: \`pnpm --filter @factory/compiler test -- generic-order-lifecycle-v2.test.ts\`

Expected: FAIL because the compiler still selects V1 handlers or does not materialize active V2.1 transaction schema/migration.

- [ ] **Step 3: Resolve and compile exact locked contributions**

Add a resolver for exactly one V2.1 executor, one V2 create handler, and one V2 operation adapter. Verify source bytes, digest, target prefix, interface version, bindings, and dependency order. Generated registry exposes the create handler separately. \`order.create\` delegates only to it; \`order.transition\` delegates only to \`parse\`, \`prepare\`, \`createStore\`, executor, and \`present\`.

- [ ] **Step 4: Materialize active schema/migration**

Merge selected V2.1 fragments into generated \`schema.prisma\` and its executed migration chain. Do not emit disconnected fragment files. Retain existing Catalog, Cart, and line-configuration handler registration.

- [ ] **Step 5: Verify behavior, output, and regression**

Run: \`pnpm --filter @factory/compiler test -- generic-order-lifecycle-v2.test.ts order-operations-runtime.test.ts commerce-transaction-runtime.test.ts compilation-plan.test.ts\`

Expected: PASS for initial create state/version, replay, changed payload, pending duplicate, stale version, aggregate/inventory/audit/outbox/receipt rollback, active schema/migration, and generated TypeScript imports.

- [ ] **Step 6: Complete package verification and commit**

Run: \`pnpm --filter @factory/capabilities test && pnpm --filter @factory/compiler test && pnpm --filter @factory/capabilities typecheck && pnpm --filter @factory/capabilities lint && pnpm --filter @factory/capabilities build && pnpm --filter @factory/compiler typecheck && pnpm --filter @factory/compiler lint && pnpm --filter @factory/compiler build && git diff --check\`

Expected: PASS with all Restaurant paths unchanged.

\`\`\`bash
git add packages/capabilities packages/compiler
git commit -m "feat: compile generic order lifecycle v2"
\`\`\`

### Task 4: Record Generic readiness without inflating Restaurant

**Files:**

- Modify: \`packages/capabilities/src/profile-readiness.ts\`
- Modify: \`packages/capabilities/test/profile-readiness.test.ts\`
- Create: \`docs/acceptance/generic-order-lifecycle-v2.md\`
- Modify: \`docs/project-status.md\`

**Consumes:** Passing package, lock, compiler, active Prisma, and three Generic Profile journey evidence.

**Produces:** Evidence-backed Generic Commerce readiness while Restaurant remains partial until its separate typed transaction migration.

- [ ] **Step 1: Write failing readiness test**

\`\`\`ts
it("keeps V2 generic transaction readiness partial without matching journeys", () => {
  expect(resolveTransactionReadiness({ core: "2.1.0", order: "2.0.0", journeys: [] }))
    .toBe("partial");
});
\`\`\`

- [ ] **Step 2: Implement closed readiness and verify release evidence**

Require the exact lock pair, one provider, active schema/migration evidence, and all three Generic journeys. Run \`pnpm test && git diff --check\`; record only commands, pass state, Profile identity, package versions, and bounded artifact hashes.

- [ ] **Step 3: Commit**

\`\`\`bash
git add docs packages/capabilities
git commit -m "docs: record generic order lifecycle evidence"
\`\`\`

## Self-Review

- Tasks 1-3 cover the discovered create/transition gap without a V1 sidecar or a Profile-name compiler switch.
- Task 4 prevents Generic success from being reported as Restaurant or portfolio-wide production completion.
- External source intake, real payments, identity, cloud deployment, and all Restaurant transaction code are deliberately excluded.
