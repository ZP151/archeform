# Commerce Transaction and Profile Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a single Golden `commerce.transaction/v1` package provide a safe, persistent command boundary for Restaurant, Simple Ecommerce, Retail Counter, and Grocery Pickup; make its exact coverage and remaining gaps operable from Workbench Home.

**Architecture:** The Application Graph and immutable composition lock remain the only inputs to compilation. The new Golden package owns a declared transaction contract and selected package evidence; the compiler emits a fixture implementation for the browser simulator and a Prisma implementation for generated APIs. The control plane exposes a source-free projection of capability coverage, evidence, and next actions; Workbench renders that projection without reading candidate source material.

**Tech Stack:** TypeScript, pnpm/Turborepo, Zod, NestJS, Prisma/PostgreSQL, Next.js/React, Vitest.

## Global Constraints

- The Application Graph is the source of truth; compilers consume only immutable Published revisions and locked Golden packages.
- Write all code, tests, UI text, and documentation in English.
- Do not copy source from any external repository in this slice. A published dependency or source fragment requires a separate fixed-SHA source study, notice, SBOM, scans, fixture, conformance result, and removal test.
- Keep provider credentials, OpenAI credentials, raw prompts, and raw model responses in local process environment only; never persist or log them.
- A command transaction must claim or replay a scope-local idempotency receipt, perform aggregate/version, inventory, audit, capability, and outbox writes in one Prisma transaction, then store a defensive immutable result.
- A generated runtime must fail closed for a missing, non-Golden, incompatible, or unlocked `commerce.transaction` asset.
- Simulated payment remains the only payment mode in this slice. It must never accept payment credentials or move money.
- Do not add compatibility behavior for the archived Python or legacy-console platform.
- Run focused RED/GREEN tests before each implementation step and run the affected workspace package suite before each commit.

---

## File Map

| Path                                                                 | Responsibility                                                                                                                              |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/capabilities/src/assets/contract.ts`                       | Extends the permitted runtime-handler vocabulary for the transaction package.                                                               |
| `packages/capabilities/src/assets/commerce/transaction-v1-0-0.ts`    | Canonical TypeScript manifest for `commerce.transaction@1.0.0`.                                                                             |
| `packages/capabilities/assets/commerce.transaction/1.0.0/*`          | Immutable package manifest, declarative adapter, fixture, template contributions, and contract evidence.                                    |
| `packages/capabilities/src/assets/index.ts`                          | Registers the new current Golden asset and preserves older assets as explicit historical versions only.                                     |
| `packages/capabilities/src/commerce/profile.ts`                      | Selects the transaction package in every supported Commerce profile recipe.                                                                 |
| `packages/capabilities/src/profile-readiness.ts`                     | Derives transaction readiness from actual selected package/target evidence rather than an unconditional hard-coded `partial` label.         |
| `packages/capabilities/test/commerce-transaction-package.test.ts`    | Verifies asset completeness, lockability, input bindings, interfaces, and negative registry cases.                                          |
| `packages/capabilities/test/profile-readiness.test.ts`               | Proves accurate available/partial/planned/provider-required projections.                                                                    |
| `packages/compiler/src/commerce-transaction-runtime.ts`              | Renders the shared simulator and Prisma transaction implementations used by generated applications.                                         |
| `packages/compiler/src/index.ts`                                     | Selects the renderer only when the immutable lock includes the verified transaction package; emits schema, API, test, and document outputs. |
| `packages/compiler/test/commerce-transaction-runtime.test.ts`        | Extends transaction behavior from in-memory state to duplicate, stale, changed-payload, atomic rollback, and generated-Prisma evidence.     |
| `packages/compiler/test/compilation-plan.test.ts`                    | Verifies deterministic files, package lock dependency, generated migration, API route wiring, and all four profile outputs.                 |
| `apps/control-plane/src/portfolio/portfolio-summary.service.ts`      | Returns source-free per-capability operational data for a workspace.                                                                        |
| `apps/control-plane/src/portfolio/portfolio-summary.controller.ts`   | Serves the v2 portfolio projection behind the existing local workspace boundary.                                                            |
| `apps/control-plane/src/portfolio/portfolio-summary.service.test.ts` | Verifies no source URL, source path, source bytes, prompt, credential, or raw evidence can enter the Home projection.                       |
| `apps/workbench/lib/portfolio-summary.ts`                            | Converts the control-plane response into deterministic view models and action states.                                                       |
| `apps/workbench/components/profile-capability-map.tsx`               | Shows one profile's grouped capability state, lock, dependencies, evidence summary, and next action.                                        |
| `apps/workbench/components/workbench-home.tsx`                       | Adds Home actions to open a profile map and begin a profile-based Draft; does not add a direct compilation path for Drafts.                 |
| `apps/workbench/components/*.test.tsx`                               | Covers Home drill-down, action enablement, and safe rendering of source-free data.                                                          |
| `docs/acceptance/commerce-transaction-v1.md`                         | Records the four-profile acceptance command matrix and the production claims that remain out of scope.                                      |

## Interfaces

The asset manifest must declare the following stable interface identities:

```ts
export type CommerceTransactionCommandV1 = Readonly<{
  scope: string;
  aggregate: { entityKey: string; recordId: string; expectedVersion: number };
  idempotencyKey: string;
  payload: Readonly<Record<string, unknown>>;
  effects: readonly (
    "reserve-stock" | "release-stock" | "append-audit" | "append-outbox"
  )[];
}>;

export type CommerceTransactionOutcomeV1 = Readonly<{
  receiptId: string;
  replayed: boolean;
  aggregate: {
    entityKey: string;
    recordId: string;
    status: string;
    version: number;
  };
  inventoryMovementIds: readonly string[];
  auditEventId: string;
  outboxEventId: string;
}>;

export interface CommerceTransactionExecutorV1 {
  execute(
    command: CommerceTransactionCommandV1,
  ): Promise<CommerceTransactionOutcomeV1>;
}
```

`commerce.transaction@1.0.0` provides `commerce.transaction@v1`; it requires `commerce.stock-movement@v1` and `commerce.order-event@v1`. Recipe construction must additionally select the existing Golden `core.audit` and `core.workflow` packages by key, and the compiler must fail closed when either is absent. The package contributes only declared `api.runtime`, `api.command`, `database.schema`, `database.migration`, `test.fixture`, `test.journey`, `flow.handler`, and `docs.section` slots. No adapter contribution may write arbitrary paths or invoke a provider.

### Task 1: Define and register the Golden transaction asset

**Files:**

- Create: `packages/capabilities/src/assets/commerce/transaction-v1-0-0.ts`
- Create: `packages/capabilities/assets/commerce.transaction/1.0.0/component.json`
- Create: `packages/capabilities/assets/commerce.transaction/1.0.0/adapter.json`
- Create: `packages/capabilities/assets/commerce.transaction/1.0.0/fixtures/default.json`
- Create: `packages/capabilities/assets/commerce.transaction/1.0.0/tests/contract.json`
- Create: `packages/capabilities/assets/commerce.transaction/1.0.0/templates/api/commerce-transaction-runtime.ts.tpl`
- Create: `packages/capabilities/assets/commerce.transaction/1.0.0/templates/database/commerce-transaction.prisma.tpl`
- Modify: `packages/capabilities/src/assets/contract.ts`
- Modify: `packages/capabilities/src/assets/index.ts`
- Test: `packages/capabilities/test/commerce-transaction-package.test.ts`

**Consumes:** Existing Golden `commerce.inventory-ledger@1.0.0`, `core.audit@1.0.1`, and `core.workflow@1.0.1` manifest interfaces.

**Produces:** `commerceTransactionAssetV1_0_0: CapabilityAssetV1`, selected only through `createCapabilityCompositionLock`, with fixed package root `packages/capabilities/assets/commerce.transaction/1.0.0` and a lockable `commerce.transaction@v1` provider identity.

- [ ] **Step 1: Write the failing asset test**

```ts
it("registers the Golden transaction package with all verified assets", () => {
  const asset = currentCapabilityAssets.find(
    ({ manifest }) => manifest.key === "commerce.transaction",
  );

  expect(asset?.manifest).toMatchObject({
    key: "commerce.transaction",
    version: "1.0.0",
    lifecycle: "golden",
    provides: [{ interfaceKey: "commerce.transaction", version: "v1" }],
    requires: expect.arrayContaining([
      { interfaceKey: "commerce.stock-movement", version: "v1" },
      { interfaceKey: "commerce.order-event", version: "v1" },
    ]),
  });
  expect(asset?.manifest.templates.map(({ target }) => target)).toEqual(
    expect.arrayContaining([
      "api/src/commerce-transaction-runtime.ts",
      "api/prisma/commerce-transaction.prisma",
    ]),
  );
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `pnpm --filter @factory/capabilities test -- commerce-transaction-package.test.ts`

Expected: FAIL because `commerce.transaction@1.0.0` is not registered.

- [ ] **Step 3: Create the immutable package files and TypeScript manifest**

Use the existing `commerce.inventory-ledger` package layout exactly. The manifest must include package root, content digests, strict graph-symbol binding inputs, required interfaces, output slots, fixture, contract test, and lifecycle `golden`. Add `"transaction"` to `CapabilityRuntimeHandlerKindV1`; do not introduce a handler that accepts arbitrary source or paths.

- [ ] **Step 4: Register only the current Golden version**

Add `commerceTransactionAssetV1_0_0` to `currentCapabilityAssets`, exporting it for historical lock verification. Do not alter historical catalog, cart, order, or inventory manifest digests.

- [ ] **Step 5: Run the focused package test to verify it passes**

Run: `pnpm --filter @factory/capabilities test -- commerce-transaction-package.test.ts`

Expected: PASS with one Golden transaction asset and no invalid template or dependency declarations.

- [ ] **Step 6: Run registry regression evidence**

Run: `pnpm --filter @factory/capabilities test -- capability-registry.test.ts composition-contract.test.ts`

Expected: PASS; duplicate, tampered, missing, and incompatible locks remain rejected.

- [ ] **Step 7: Commit the isolated package**

```bash
git add packages/capabilities
git commit -m "feat: add Golden commerce transaction package"
```

### Task 2: Bind the transaction asset into all Commerce recipes and readiness

**Files:**

- Modify: `packages/capabilities/src/commerce/profile.ts`
- Modify: `packages/capabilities/src/profile-readiness.ts`
- Test: `packages/capabilities/test/commerce-profile.test.ts`
- Test: `packages/capabilities/test/profile-readiness.test.ts`

**Consumes:** `commerceTransactionAssetV1_0_0` and its mandatory dependency interfaces.

**Produces:** The four Commerce profile draft recipes select the exact current transaction lock; readiness reports `available` only after the profile has a valid composition and all v1 generated target claims, otherwise reports `partial` with a named missing target.

- [ ] **Step 1: Write failing recipe and readiness tests**

```ts
it.each([
  "restaurant-ordering",
  "simple-ecommerce",
  "retail-counter",
  "grocery-pickup",
] as const)("%s locks commerce.transaction@1.0.0", (profile) => {
  const { graph } = composeDefaultCapabilityDraft({ profile });
  expect(graph.integration.compositionSelections).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        lock: expect.objectContaining({
          key: "commerce.transaction",
          version: "1.0.0",
        }),
      }),
    ]),
  );
});

it("does not label a transaction as available when a required compiled target is absent", () => {
  expect(
    createProfileReadiness([
      {
        profile: "simple-ecommerce",
        label: "Simple Ecommerce",
        availableCapabilities: ["commerce.transaction"],
      },
    ])[0]?.capabilities,
  ).toContainEqual({ key: "commerce.transaction", status: "partial" });
});
```

- [ ] **Step 2: Run focused tests to verify failure**

Run: `pnpm --filter @factory/capabilities test -- commerce-profile.test.ts profile-readiness.test.ts`

Expected: FAIL because the recipes do not select the package and readiness has no evidence rule.

- [ ] **Step 3: Add canonical selections and evidence-aware readiness**

Use normal composition selection creation and the package's declared bindings. Add a small, pure readiness input type that includes `compiledTargets` and `verifiedPackageKeys`; keep the existing source-free API projection compatible by making the default source omit transaction availability until compiler evidence is supplied.

- [ ] **Step 4: Run focused tests to verify pass**

Run: `pnpm --filter @factory/capabilities test -- commerce-profile.test.ts profile-readiness.test.ts`

Expected: PASS; every Commerce starter locks the same package version, and a missing target cannot be presented as ready.

- [ ] **Step 5: Run broader profile evidence**

Run: `pnpm --filter @factory/capabilities test -- commercial-profile-composition.test.ts restaurant-profile.test.ts`

Expected: PASS with a deterministic resolved dependency order.

- [ ] **Step 6: Commit the composition wiring**

```bash
git add packages/capabilities
git commit -m "feat: compose transaction package into commerce profiles"
```

### Task 3: Compile a transaction boundary for simulator and generated Prisma APIs

**Files:**

- Create: `packages/compiler/src/commerce-transaction-runtime.ts`
- Modify: `packages/compiler/src/index.ts`
- Modify: `packages/compiler/test/commerce-transaction-runtime.test.ts`
- Modify: `packages/compiler/test/compilation-plan.test.ts`
- Create: `docs/acceptance/commerce-transaction-v1.md`

**Consumes:** A validated immutable `factory.composition/v1` lock containing `commerce.transaction@1.0.0`; declared package template digests and the selected Graph's order/catalog/inventory bindings.

**Produces:** A generated `api/src/commerce-transaction-runtime.ts`, Prisma command receipt/audit/outbox/inventory migration fragments, controller calls to the executor, fixture behavior for simulator tests, deterministic journey tests, and an acceptance evidence document.

- [ ] **Step 1: Add RED tests for the non-negotiable transaction cases**

```ts
it("replays one completed receipt and rejects a changed payload under the same scope key", async () => {
  const first = await runtime.execute(command({ idempotencyKey: "submit-1" }));
  await expect(
    runtime.execute(command({ idempotencyKey: "submit-1" })),
  ).resolves.toMatchObject({
    receiptId: first.receiptId,
    replayed: true,
  });
  await expect(
    runtime.execute(
      command({ idempotencyKey: "submit-1", payload: { note: "changed" } }),
    ),
  ).rejects.toThrow("idempotency key");
});

it("rolls back receipt, inventory, audit, and outbox records when an effect fails", async () => {
  await expect(
    runtime.execute(command({ effects: ["reserve-stock", "append-audit"] })),
  ).rejects.toThrow("audit");
  await expect(runtime.inspect()).resolves.toEqual({
    receipts: 0,
    movements: 0,
    audits: 0,
    outbox: 0,
  });
});
```

- [ ] **Step 2: Run the focused compiler test to verify failure**

Run: `pnpm --filter @factory/compiler test -- commerce-transaction-runtime.test.ts`

Expected: FAIL because generic `ApplicationRuntime` does not produce a shared atomic command implementation.

- [ ] **Step 3: Render a small shared transaction contract and two adapters**

In `commerce-transaction-runtime.ts`, render these generated public types and functions:

```ts
export interface CommerceTransactionStoreV1 {
  execute<T>(
    operation: (tx: CommerceTransactionStoreV1) => Promise<T>,
  ): Promise<T>;
  findReceipt(
    scope: string,
    idempotencyKey: string,
  ): Promise<CommerceCommandReceiptV1 | null>;
  insertReceipt(receipt: PendingCommerceCommandReceiptV1): Promise<void>;
  updateReceipt(
    receiptId: string,
    outcome: CommerceTransactionOutcomeV1,
  ): Promise<void>;
  conditionalAggregateUpdate(
    input: ConditionalAggregateUpdateV1,
  ): Promise<AggregateStateV1 | null>;
  appendInventoryMovement(input: InventoryMovementInputV1): Promise<string>;
  appendAudit(input: AuditInputV1): Promise<string>;
  appendOutbox(input: OutboxInputV1): Promise<string>;
}

export async function executeCommerceTransaction(
  store: CommerceTransactionStoreV1,
  command: CommerceTransactionCommandV1,
): Promise<CommerceTransactionOutcomeV1>;
```

The generated Prisma adapter's `execute` must call `prisma.$transaction`; it must create or look up the receipt before effects, use a conditional version update, and write inventory/audit/outbox/complete receipt on the same `tx`. The in-memory adapter is fixture-only and must implement the same public contract.

- [ ] **Step 4: Wire compiler selection and fail-closed validation**

Before generating a Commerce target, resolve the immutable composition lock and require `commerce.transaction@1.0.0` plus its declared dependencies. Emit `FactoryCommandReceipt`, `FactoryInventoryMovement`, `FactoryAuditEvent`, and `FactoryOutboxEvent` models with unique `(scope, idempotencyKey)` and immutable outcome fields. Controller code forwards role, scope, expected version, and idempotency key to the executor; it cannot call the record store directly for commerce transitions.

- [ ] **Step 5: Add the four-profile compilation matrix**

```ts
it.each([
  "restaurant-ordering",
  "simple-ecommerce",
  "retail-counter",
  "grocery-pickup",
] as const)(
  "compiles %s with the locked transaction migration, route, and journey",
  (profile) => {
    const bundle = generateApplicationBundle(inputFor(profile));
    expect(filePaths(bundle)).toEqual(
      expect.arrayContaining([
        "api/src/commerce-transaction-runtime.ts",
        "api/prisma/commerce-transaction.prisma",
        "tests/commerce-transaction.journey.test.ts",
      ]),
    );
  },
);
```

- [ ] **Step 6: Run focused compiler evidence to verify pass**

Run: `pnpm --filter @factory/compiler test -- commerce-transaction-runtime.test.ts compilation-plan.test.ts`

Expected: PASS for idempotent replay, changed payload rejection, stale version conflict, duplicate-stock concurrency, rollback, deterministic files, and all four profile outputs.

- [ ] **Step 7: Document exact acceptance claims and exclusions**

Record the four test commands, simulated-payment boundary, provider exclusions, and "not production complete until deployment/provider acceptance" language in `docs/acceptance/commerce-transaction-v1.md`.

- [ ] **Step 8: Run complete compiler regression and commit**

Run: `pnpm --filter @factory/compiler test`

Expected: PASS with no generated transaction output that bypasses the locked package.

```bash
git add packages/compiler docs/acceptance/commerce-transaction-v1.md
git commit -m "feat: compile atomic commerce transaction runtime"
```

### Task 4: Expose source-free Profile capability operations on Home

**Files:**

- Modify: `apps/control-plane/src/portfolio/portfolio-summary.service.ts`
- Modify: `apps/control-plane/src/portfolio/portfolio-summary.controller.ts`
- Modify: `apps/control-plane/src/portfolio/portfolio-summary.service.test.ts`
- Modify: `apps/workbench/lib/control-plane-client.ts`
- Modify: `apps/workbench/lib/portfolio-summary.ts`
- Create: `apps/workbench/components/profile-capability-map.tsx`
- Create: `apps/workbench/components/profile-capability-map.test.tsx`
- Modify: `apps/workbench/components/workbench-home.tsx`
- Modify: `apps/workbench/components/workbench-home.test.tsx`

**Consumes:** `ProfileReadinessV1`, selected package locks, target compilation evidence, and aggregate candidate/provider counts. It does not consume a candidate snapshot, source study, source URL, source path, source bytes, raw prompt, raw model response, or credential.

**Produces:** `factory.workspace-portfolio-summary/v2` with `profileOperations`, then an icon-first Home drill-down that offers only valid next steps: `create-draft`, `inspect-lock`, `view-evidence`, or `configure-provider`.

- [ ] **Step 1: Write failing service and UI tests**

```ts
it("returns a source-free capability map with an eligible action", async () => {
  await expect(service.get("local")).resolves.toMatchObject({
    apiVersion: "factory.workspace-portfolio-summary/v2",
    profileOperations: expect.arrayContaining([
      expect.objectContaining({
        profile: "restaurant-ordering",
        capabilities: expect.arrayContaining([
          expect.objectContaining({ key: "commerce.transaction", action: "view-evidence" }),
        ]),
      }),
    ]),
  });
});

it("opens a profile capability map instead of exposing candidate source material", async () => {
  render(<WorkbenchHome {...readyProps} />);
  await user.click(screen.getByRole("button", { name: /restaurant ordering/i }));
  expect(await screen.findByRole("dialog", { name: /restaurant capability map/i })).toBeVisible();
  expect(screen.queryByText(/github\.com|source path|raw prompt/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run focused tests to verify failure**

Run: `pnpm --filter @factory/control-plane test -- portfolio-summary.service.test.ts; pnpm --filter @factory/workbench test -- profile-capability-map.test.tsx workbench-home.test.tsx`

Expected: FAIL because v1 has aggregate counts only and no drill-down component.

- [ ] **Step 3: Add the v2 source-free operation projection**

Define a new `ProfileCapabilityOperationV1` containing `key`, `status`, `selectedLock` (key/version/digest only), `dependentTargets`, `evidenceStatus`, and a closed action union. Compute it solely from current Factory package and compilation state. Validate the response recursively rejects keys matching `url`, `path`, `source`, `prompt`, `response`, `token`, `secret`, and `credential` before serializing.

- [ ] **Step 4: Build the Workbench capability map**

Use an accessible dialog/sheet with grouped capability rows, short status chips, dependency icons, package version, and one primary action. Use `create-draft` to invoke the existing profile starter pathway; never add a button that compiles a mutable Draft. Render `configure-provider` only as an informational local configuration boundary, without showing or writing a credential.

- [ ] **Step 5: Run focused UI/API tests to verify pass**

Run: `pnpm --filter @factory/control-plane test -- portfolio-summary.service.test.ts; pnpm --filter @factory/workbench test -- profile-capability-map.test.tsx workbench-home.test.tsx portfolio-summary.test.ts`

Expected: PASS; the Home is operational, locked transaction evidence is visible, and source material is absent.

- [ ] **Step 6: Run workspace static checks and commit**

Run: `pnpm --filter @factory/control-plane lint && pnpm --filter @factory/workbench lint && pnpm --filter @factory/workbench typecheck`

Expected: PASS.

```bash
git add apps/control-plane apps/workbench
git commit -m "feat: add profile capability operations to workbench home"
```

### Task 5: Verify release evidence and record the next supply-chain handoff

**Files:**

- Modify: `docs/project-status.md`
- Modify: `docs/superpowers/ledgers/composable-internal-approval-suite.md` only if it remains the active project ledger; otherwise create `docs/superpowers/ledgers/commerce-transaction-v1.md`
- Modify: `docs/superpowers/specs/2026-08-01-composable-restaurant-profile-supply-design.md`

**Consumes:** Passing capability, compiler, control-plane, and Workbench evidence from Tasks 1–4.

**Produces:** An evidence-backed status that separates accepted transaction capability from unaccepted providers and names the next independent plan: automatic fixed-SHA intake materialization and Candidate-to-package scaffolding.

- [ ] **Step 1: Write the failing release checklist assertion**

Add an acceptance checklist with exactly these required evidence references: package manifest/contract, four profile locks, generated Prisma transaction test, duplicate replay test, stale-version test, rollback test, source-free Home test, and all workspace test command output.

- [ ] **Step 2: Run the complete local verification gate**

Run: `pnpm test`

Expected: PASS. Record only command names, pass/fail state, test counts, and bounded artifact hashes; never record credentials or raw AI material.

- [ ] **Step 3: Update delivery status honestly**

Mark `commerce.transaction/v1` accepted only if every listed command passes. Keep identity, real payment, printer, search, delivery, reservations, loyalty, realtime, offline, cloud deployment, and production observability explicitly unaccepted.

- [ ] **Step 4: Commit the evidence record**

```bash
git add docs
git commit -m "docs: record commerce transaction acceptance evidence"
```

## Self-Review

- **Spec coverage:** Tasks 1–3 supply the reusable package, immutable locks, atomic generated runtime, and four commerce profiles. Task 4 makes availability, evidence, and remaining work visible and actionable. Task 5 prevents a passing build from being reported as full production acceptance.
- **Deliberate boundary:** This plan does not activate live payment, identity, delivery, printer, search, notification, loyalty, reservation, or external repository promotion. Those require provider or source-intake acceptance slices after this shared core exists.
- **Placeholder scan:** No unbounded implementation instruction is used; every code task has a file map, concrete interface or test, focused command, pass condition, and commit scope.
- **Type consistency:** `CommerceTransactionCommandV1`, `CommerceTransactionOutcomeV1`, and `CommerceTransactionExecutorV1` are defined once in the Interfaces section and used consistently by package, compiler, generated adapters, tests, and Home evidence projection.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-01-commerce-transaction-and-profile-operations.md`.

1. **Subagent-Driven (recommended):** Dispatch a fresh implementation worker per task and use independent review between tasks. Tasks 1 and 4 can start in parallel after the transaction interface is frozen; Task 2 follows Task 1; Task 3 follows Tasks 2 and 4.
2. **Inline Execution:** Execute Tasks 1–5 in this session with `superpowers:executing-plans`, keeping the listed test and review checkpoints.
