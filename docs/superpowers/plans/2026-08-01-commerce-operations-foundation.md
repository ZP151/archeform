# Commerce and Operations Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Restaurant Ordering and the adjacent commerce starters into
evidence-backed compositions of reusable operations capabilities, beginning
with profile coverage visibility and the shared order-operations contract.

**Architecture:** Keep `commerce.order` as the small create/transition
primitive and add a separate `commerce.order-operations` package for
idempotent amendments, holds, cancellation, refund, compensation, and audit
semantics. The Workbench receives an aggregate, source-free Profile Coverage
projection. Restaurant and Simple Ecommerce bind the same order-operations
package to their own entities and fulfilment flows; no renderer may infer
behaviour merely from a Profile label.

**Tech Stack:** TypeScript, Zod, Vitest, NestJS, Next.js, Prisma, XState,
Casbin, existing capability package/asset contracts, Candidate Foundry.

## Global Constraints

- Code, tests, documentation, and UI text are English.
- Preserve Draft -> Publish -> immutable Compilation; no compiler consumes a
  mutable Draft.
- Keep external sources, candidate metadata, credentials, prompts, responses,
  URLs, and package paths out of Graph, generated output, and Workbench state.
- A Profile name cannot enable a renderer. A verified selected package and a
  published composition lock are the only compiler authority.
- External code is never copied wholesale. A selective port requires an exact
  source-study record, fixed commit, attribution, evidence, fixture, and
  removal test.
- Begin every behaviour change with a focused failing test and record both RED
  and GREEN commands in the handoff.
- Simulated payment remains the only v1 payment implementation; any live
  payment, login, notification, search, delivery, or realtime service is a
  separately approved Provider adapter.

---

## File structure

| Path                                                                   | Responsibility                                                                                             |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `packages/capabilities/src/profile-coverage.ts`                        | Factory-owned source-free capability matrix and validation for Profile coverage.                           |
| `packages/capabilities/src/profile-readiness.ts`                       | Projects versioned coverage data into existing readiness records.                                          |
| `packages/capabilities/src/commerce/order-operations.ts`               | Pure order command, transition, compensation, and invariant contract.                                      |
| `packages/capabilities/src/assets/commerce/order-operations-v1-0-0.ts` | Golden asset manifest for the new package.                                                                 |
| `packages/capabilities/assets/commerce.order-operations/1.0.0/`        | Immutable physical manifest, adapter, fixture, contract, and API template.                                 |
| `packages/capabilities/src/index.ts`                                   | Registers the package and binds it into Restaurant/Ecommerce compositions.                                 |
| `packages/capabilities/src/restaurant/profile.ts`                      | Requires the shared operations lock and validates Restaurant-specific bindings.                            |
| `packages/compiler/src/index.ts`                                       | Resolves the package-owned handler and emits generated runtime contributions.                              |
| `packages/compiler/src/restaurant-runtime.ts`                          | Adapts Restaurant table/kitchen experience to the neutral operation events only.                           |
| `packages/compiler/test/order-operations-runtime.test.ts`              | Tests generated API/database/web contract for shared operations.                                           |
| `apps/control-plane/src/portfolio/portfolio-summary.service.ts`        | Returns coverage with the existing safe workspace summary.                                                 |
| `apps/workbench/lib/control-plane-client.ts`                           | Strictly parses coverage and rejects source-shaped fields.                                                 |
| `apps/workbench/lib/portfolio-summary.ts`                              | Maps coverage to Home view data.                                                                           |
| `apps/workbench/components/workbench-home.tsx`                         | Renders a compact source-free Profile Coverage panel.                                                      |
| `packages/external-intake/src/discovery.ts`                            | Adds fixed Commerce/Operations source-study batch configuration only after the runtime contract is frozen. |

## Shared interfaces

```ts
export type ProfileCoverageStatusV1 =
  "available" | "partial" | "planned" | "provider-required";

export type ProfileCoverageItemV1 = {
  readonly key: string;
  readonly label: string;
  readonly status: ProfileCoverageStatusV1;
  readonly packageKeys: readonly string[];
  readonly profiles: readonly FactoryProfile[];
};

export interface CommerceOrderCommandV1 {
  readonly command:
    | "hold"
    | "release-hold"
    | "amend"
    | "cancel"
    | "record-partial-payment"
    | "capture-payment"
    | "refund";
  readonly orderId: string;
  readonly expectedVersion: number;
  readonly idempotencyKey: string;
  readonly actorRole: string;
  readonly reason?: string;
}

export interface CommerceOrderOperationPlanV1 {
  readonly nextState: string;
  readonly incrementVersion: true;
  readonly paymentDelta: string;
  readonly inventoryEffect: "reserve" | "release" | "none";
  readonly auditAction: string;
}

export function planCommerceOrderOperation(
  current: CommerceOrderStateV1,
  command: CommerceOrderCommandV1,
): CommerceOrderOperationPlanV1;
```

`planCommerceOrderOperation` is pure and must not accept a Graph, source,
Provider, URL, template path, raw request body, or executable code. Generated
handlers convert only validated API payloads into this contract and record its
declared effects.

### Task 1: Source-free Profile Coverage projection

**Files:**

- Create: `packages/capabilities/src/profile-coverage.ts`
- Create: `packages/capabilities/test/profile-coverage.test.ts`
- Modify: `packages/capabilities/src/index.ts`
- Modify: `apps/control-plane/src/portfolio/portfolio-summary.service.ts`
- Modify: `apps/control-plane/src/portfolio/portfolio-summary.service.test.ts`
- Modify: `apps/workbench/lib/control-plane-client.ts`
- Modify: `apps/workbench/lib/control-plane-client.test.ts`
- Modify: `apps/workbench/lib/portfolio-summary.ts`
- Modify: `apps/workbench/lib/portfolio-summary.test.ts`
- Modify: `apps/workbench/components/workbench-home.tsx`
- Modify: `apps/workbench/components/workbench-home.test.tsx`

**Consumes:** existing registered Profile IDs, `listProfileReadiness()`, the
Control Plane's capability dependency, and the current Workbench portfolio
parser.

**Produces:** a `factory.profile-coverage/v1` projection containing only
Factory capability keys, labels, status, affected Profile IDs, and registered
package keys. `@factory/portfolio-public` deliberately remains independent of
`@factory/capabilities`; the Control Plane is the projection boundary.

- [ ] **Step 1: Write failing capability coverage tests**

```ts
it("maps commerce order operations to all four commerce Profiles", () => {
  expect(listProfileCoverage()).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        key: "commerce.order-operations",
        status: "planned",
        profiles: [
          "restaurant-ordering",
          "simple-ecommerce",
          "retail-counter",
          "grocery-pickup",
        ],
      }),
    ]),
  );
});

it("rejects source-shaped values from a public coverage projection", () => {
  expect(() =>
    parseProfileCoverage({
      key: "commerce.order-operations",
      sourceUrl: "https://example.invalid/source",
    }),
  ).toThrow("Profile coverage is invalid.");
});
```

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @factory/capabilities test -- test/profile-coverage.test.ts`

Expected: FAIL because `listProfileCoverage` and its strict public projection
do not exist.

- [ ] **Step 3: Implement the deterministic Factory coverage registry**

```ts
export const profileCoverage: readonly ProfileCoverageItemV1[] = Object.freeze([
  {
    key: "commerce.order-operations",
    label: "Order operations",
    status: "planned",
    packageKeys: ["commerce.order", "commerce.inventory", "core.audit"],
    profiles: [
      "restaurant-ordering",
      "simple-ecommerce",
      "retail-counter",
      "grocery-pickup",
    ],
  },
]);

export function listProfileCoverage(): readonly ProfileCoverageItemV1[] {
  return profileCoverage.map((item) =>
    Object.freeze({
      ...item,
      packageKeys: Object.freeze([...item.packageKeys]),
      profiles: Object.freeze([...item.profiles]),
    }),
  );
}
```

Define all ten families from the approved design, including the neutral
identity, notification, reservation/queue, fulfilment, membership/promotion,
and analytics gaps. Assert no duplicate key, Profile, or package key and no
unknown Profile ID.

- [ ] **Step 4: Add coverage to the Control Plane and Workbench contracts**

Extend only `WorkspacePortfolioSummaryV1` with a strict `coverage` property
created from `listProfileCoverage()`. The Workbench parser must require the
exact API version, finite count-free values, registered profile IDs, known
status values, and no unknown object keys. The Home panel must use the heading
`Profile coverage`, group items by status, show affected Profiles and package
count, and include no action that installs candidates or exposes source origin.

- [ ] **Step 5: Verify GREEN**

Run:

```bash
pnpm --filter @factory/capabilities test -- test/profile-coverage.test.ts
pnpm --filter @factory/control-plane test -- test/portfolio-summary.service.test.ts
pnpm --filter @factory/workbench test -- lib/control-plane-client.test.ts lib/portfolio-summary.test.ts components/workbench-home.test.tsx
```

Expected: every projection is source-free and Home renders the coverage panel.

- [ ] **Step 6: Commit**

```bash
git add packages/capabilities/src/profile-coverage.ts packages/capabilities/test/profile-coverage.test.ts packages/capabilities/src/index.ts apps/control-plane/src/portfolio apps/workbench/lib/control-plane-client.ts apps/workbench/lib/control-plane-client.test.ts apps/workbench/lib/portfolio-summary.ts apps/workbench/lib/portfolio-summary.test.ts apps/workbench/components/workbench-home.tsx apps/workbench/components/workbench-home.test.tsx
git commit -m "feat(workbench): show reusable profile coverage"
```

### Task 2: Pure shared order-operations contract

**Files:**

- Create: `packages/capabilities/src/commerce/order-operations.ts`
- Create: `packages/capabilities/test/order-operations-contract.test.ts`
- Modify: `packages/capabilities/src/index.ts`
- Modify: `packages/capabilities/src/profile-readiness.ts`

**Consumes:** the existing `commerce.order`, `commerce.inventory`, simulated
payment, audit contracts, and declared XState flow states.

**Produces:** a pure, deterministic operation planner. It does not persist
records or render Profile UI.

- [ ] **Step 1: Write failing transition and compensation tests**

```ts
it("plans an authorised paid-order cancellation as refund plus audit", () => {
  expect(
    planCommerceOrderOperation(paidOrder, {
      command: "cancel",
      orderId: "order-1",
      expectedVersion: 4,
      idempotencyKey: "cancel-1",
      actorRole: "manager",
      reason: "duplicate order",
    }),
  ).toEqual({
    nextState: "cancelled",
    incrementVersion: true,
    paymentDelta: "refund-full",
    inventoryEffect: "none",
    auditAction: "order.cancelled",
  });
});

it("rejects an amendment after fulfilment and a payment command with a stale version", () => {
  expect(() =>
    planCommerceOrderOperation(fulfilledOrder, amendCommand),
  ).toThrow();
  expect(() =>
    planCommerceOrderOperation(staleOrder, capturePaymentCommand),
  ).toThrow();
});
```

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @factory/capabilities test -- test/order-operations-contract.test.ts`

Expected: FAIL because the operation planner does not exist.

- [ ] **Step 3: Implement the minimum immutable contract**

Support `hold`, `release-hold`, `amend`, `cancel`, `record-partial-payment`,
`capture-payment`, and `refund`. Validate all command fields before selecting a
plan. Require a reason for amendment/cancellation/refund. Require role
allowlists and non-empty idempotency keys. Treat payment amounts as validated
decimal strings; reject overpayment, duplicate terminal payment, negative
amounts, and incomplete refund states. Keep Restaurant-specific kitchen states
outside this module.

- [ ] **Step 4: Add property and boundary tests**

```ts
it.each(["url", "source", "template", "provider", "graph"])(
  "rejects a %s-shaped command field",
  (field) =>
    expect(() =>
      parseCommerceOrderCommand({ ...command, [field]: "x" }),
    ).toThrow(),
);

it("returns the same plan for equivalent command values", () => {
  expect(planCommerceOrderOperation(order, command)).toEqual(
    planCommerceOrderOperation(
      structuredClone(order),
      structuredClone(command),
    ),
  );
});
```

- [ ] **Step 5: Mark the family `partial` only after the contract tests pass**

Update `profile-readiness.ts` from `commerce.order-amendment: planned` to
`partial` for the four commerce Profiles. Do not mark it `available` until
Tasks 3 and 4 pass generated-runtime evidence.

- [ ] **Step 6: Verify GREEN and commit**

Run:

```bash
pnpm --filter @factory/capabilities test -- test/order-operations-contract.test.ts test/profile-readiness.test.ts
pnpm --filter @factory/capabilities typecheck
pnpm --filter @factory/capabilities lint
```

```bash
git add packages/capabilities/src/commerce/order-operations.ts packages/capabilities/test/order-operations-contract.test.ts packages/capabilities/src/index.ts packages/capabilities/src/profile-readiness.ts
git commit -m "feat(capabilities): define shared order operations"
```

### Task 3: Versioned Golden package and generated API contribution

**Files:**

- Create: `packages/capabilities/src/assets/commerce/order-operations-v1-0-0.ts`
- Create: `packages/capabilities/assets/commerce.order-operations/1.0.0/component.json`
- Create: `packages/capabilities/assets/commerce.order-operations/1.0.0/adapter.json`
- Create: `packages/capabilities/assets/commerce.order-operations/1.0.0/fixtures/default.json`
- Create: `packages/capabilities/assets/commerce.order-operations/1.0.0/tests/contract.json`
- Create: `packages/capabilities/assets/commerce.order-operations/1.0.0/templates/api/capability-module.ts.tpl`
- Modify: `packages/capabilities/src/assets/index.ts`
- Modify: `packages/capabilities/test/capability-registry.test.ts`
- Modify: `packages/capabilities/test/commercial-profile-composition.test.ts`

**Consumes:** Task 2 planner and the existing physical asset verifier.

**Produces:** `commerce.order-operations@1.0.0`, a Golden asset with an
`orderOperations` runtime handler that may write only `api.runtime`,
`database.schema`, `flow.effect`, and `test.fixture` output slots.

- [ ] **Step 1: Write failing physical asset and composition tests**

```ts
it("verifies one physical order-operations package with a locked handler", () => {
  expect(
    resolveCapabilityAssetLock({
      key: "commerce.order-operations",
      version: "1.0.0",
    } as never).manifest.runtimeHandlers,
  ).toEqual(["orderOperations"]);
});

it.each(["restaurant-ordering", "simple-ecommerce"] as const)(
  "%s selects the same shared order-operations package",
  (profile) =>
    expect(composeDefaultCapabilityDraft({ profile }).assetLocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "commerce.order-operations",
          version: "1.0.0",
        }),
      ]),
    ),
);
```

- [ ] **Step 2: Verify RED**

Run:

```bash
pnpm --filter @factory/capabilities test -- test/capability-registry.test.ts test/commercial-profile-composition.test.ts
```

Expected: FAIL because the new package is not registered or selected.

- [ ] **Step 3: Create matching source and physical immutable assets**

The TypeScript manifest, `component.json`, adapter template digest, fixture
digest, and contract digest must agree. Require bindings for `orderEntity`,
`orderFlow`, `auditEntity`, `inventoryEntity`, `customerRole`, and
`merchantRole`. It provides `commerce.order-operations/v1` and requires
`commerce.order/v1`, `commerce.inventory/v1`, and `core.audit/v1`.

The API template contains a rendered Factory-owned operation planner with the
same exported semantic cases as Task 2; generated applications cannot import
the Factory workspace. Add a conformance fixture that executes the generated
planner against the Task 2 table of literal commands. The handler accepts
validated command DTOs only, stores idempotency receipts atomically, records
the declared audit action, and invokes the declared inventory/payment
compensation adapter. It cannot import Restaurant renderer files.

- [ ] **Step 4: Select it through profile composition bindings**

Add a typed selection/binding to Restaurant, Simple Ecommerce, Retail Counter,
and Grocery Pickup. Restaurant binds its existing `order`, `order-flow`,
`customer`, and `manager` symbols. Ecommerce binds `order`,
`ecommerce-order`, `shopper`, and `merchant`. Never infer binding symbols from
profile string replacement.

- [ ] **Step 5: Verify GREEN and commit**

Run:

```bash
pnpm --filter @factory/capabilities test -- test/capability-registry.test.ts test/commercial-profile-composition.test.ts test/order-operations-profile.test.ts
pnpm --filter @factory/capabilities typecheck
```

```bash
git add packages/capabilities/src/assets packages/capabilities/assets/commerce.order-operations packages/capabilities/src/index.ts packages/capabilities/test/capability-registry.test.ts packages/capabilities/test/commercial-profile-composition.test.ts packages/capabilities/test/order-operations-profile.test.ts
git commit -m "feat(capabilities): package shared order operations"
```

### Task 4: Compiler and generated-runtime enforcement

**Files:**

- Modify: `packages/compiler/src/index.ts`
- Modify: `packages/compiler/src/restaurant-runtime.ts`
- Create: `packages/compiler/test/order-operations-runtime.test.ts`
- Modify: `packages/compiler/test/restaurant-runtime.test.ts`
- Modify: `packages/compiler/test/profile-compilation.test.ts`

**Consumes:** Task 3 locked runtime handler and Task 2 operation planner.

**Produces:** generated API routes and test fixtures that use locked package
contributions for operations; Restaurant remains an experience adapter.

- [ ] **Step 1: Write failing generated-output tests**

```ts
it("emits locked order-operation routes for Restaurant and Ecommerce", () => {
  for (const profile of ["restaurant-ordering", "simple-ecommerce"] as const) {
    const bundle = generateProfileBundle(profile);
    expect(
      file(bundle, "api/src/capabilities/commerce.order-operations.ts"),
    ).toContain("planCommerceOrderOperation");
    expect(
      file(bundle, "api/test/order-operations.generated.test.ts"),
    ).toContain("refund");
  }
});

it("rejects a compiled graph that declares operations without the locked package", () => {
  expect(() => generateApplicationBundle(withUntrustedOperationGraph)).toThrow(
    "requires locked commerce.order-operations",
  );
});
```

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @factory/compiler test -- test/order-operations-runtime.test.ts`

Expected: FAIL because no locked operation handler or generated journey exists.

- [ ] **Step 3: Add lock-gated compiler integration**

Resolve `orderOperations` only from the immutable composition lock. Generate a
small API module, command route, idempotency store type, invariant tests, and
journey tests. The standard generic runtime must remain unchanged for a Graph
without this package. The Restaurant runtime may map kitchen actions to
`accept`, `start-fulfilment`, and `mark-ready`, but it may not own amend,
payment, cancellation, refund, or audit decision code.

- [ ] **Step 4: Prove real semantic invariants**

Add generated tests for stale version, repeated idempotency key, forbidden
role, order/line-note scope, partial-payment total, cancel/refund audit,
inventory compensation, and Restaurant kitchen priority/table context.

- [ ] **Step 5: Verify GREEN and commit**

Run:

```bash
pnpm --filter @factory/compiler test -- test/order-operations-runtime.test.ts test/restaurant-runtime.test.ts test/profile-compilation.test.ts
pnpm --filter @factory/compiler typecheck
pnpm --filter @factory/compiler lint
```

```bash
git add packages/compiler/src/index.ts packages/compiler/src/restaurant-runtime.ts packages/compiler/test/order-operations-runtime.test.ts packages/compiler/test/restaurant-runtime.test.ts packages/compiler/test/profile-compilation.test.ts
git commit -m "feat(compiler): generate locked order operations"
```

### Task 5: Independent Restaurant and Ecommerce evidence

**Files:**

- Modify: `packages/capabilities/test/restaurant-profile.test.ts`
- Modify: `packages/capabilities/test/commerce-profile.test.ts`
- Modify: `apps/compiler-worker/test/compilation-executor.test.ts`
- Modify: `apps/compiler-worker/test/preview-runner.test.ts`
- Create: `apps/compiler-worker/test/order-operations-lifecycle.test.ts`
- Modify: `docs/project-status.md`

**Consumes:** Tasks 1–4 and the existing isolated Compose executor.

**Produces:** evidence that the same package version compiles both profiles and
that each generated runtime performs its own role journeys.

- [ ] **Step 1: Write failing cross-profile and isolated-runtime tests**

```ts
it("uses identical order-operations locks while preserving profile-specific UI", () => {
  expect(lock("restaurant-ordering", "commerce.order-operations")).toEqual(
    lock("simple-ecommerce", "commerce.order-operations"),
  );
  expect(customerRoutes("restaurant-ordering")).toContain("/table/:token");
  expect(customerRoutes("simple-ecommerce")).not.toContain("/table/:token");
});

it("runs Restaurant submit, amend, pay, kitchen, refund, and audit journeys", async () => {
  await expect(runGeneratedRestaurantJourney()).resolves.toMatchObject({
    status: "passed",
  });
});
```

- [ ] **Step 2: Verify RED**

Run:

```bash
pnpm --filter @factory/capabilities test -- test/restaurant-profile.test.ts test/commerce-profile.test.ts
pnpm --filter @factory/compiler-worker test -- test/order-operations-lifecycle.test.ts
```

Expected: FAIL because operation journeys and shared-lock assertions are absent.

- [ ] **Step 3: Implement fixtures and executor evidence**

Use local generated Compose projects only. Feed no production payment/login
credential. Prove submit, line/order note scope, partial capture, amendment,
manager cancellation/refund, kitchen priority update, audit lookup, and
inventory reconciliation for Restaurant. Prove cart, checkout, partial capture,
refund, inventory, and audit for Ecommerce. Always issue `docker compose down
--volumes --remove-orphans` through the existing executor cleanup path.

- [ ] **Step 4: Update the status only with observed evidence**

Mark `commerce.order-operations` as `available` only if all package, compiler,
and both generated-runtime journeys pass. Otherwise retain `partial` and list
the failing gate. Do not use successful fixture tests as evidence of live
provider integration.

- [ ] **Step 5: Verify GREEN, full regression, and commit**

Run:

```bash
pnpm --filter @factory/capabilities test
pnpm --filter @factory/compiler test
pnpm --filter @factory/compiler-worker test
pnpm test
git diff --check
```

```bash
git add packages/capabilities/test/restaurant-profile.test.ts packages/capabilities/test/commerce-profile.test.ts apps/compiler-worker/test/compilation-executor.test.ts apps/compiler-worker/test/preview-runner.test.ts apps/compiler-worker/test/order-operations-lifecycle.test.ts docs/project-status.md
git commit -m "test(profiles): verify shared order operations"
```

### Task 6: Candidate Foundry commerce/operations batch

**Files:**

- Modify: `packages/external-intake/src/discovery.ts`
- Modify: `packages/external-intake/test/discovery.test.ts`
- Modify: `apps/intake-cli/src/github-discovery-client.ts`
- Modify: `apps/intake-cli/test/github-source-client.test.ts`
- Modify: `docs/market-validation.md`
- Modify: `docs/project-status.md`

**Consumes:** the frozen Task 2 contract and Candidate Foundry fixed-reference
intake.

**Produces:** bounded, aggregate-only discovery for order operations,
fulfilment, reservation/queue, membership/promotion, and operations analytics.

- [ ] **Step 1: Write failing fixed-query and redaction tests**

```ts
it("supports only factory-owned commerce operations batch keys", async () => {
  await expect(
    client.discover("commerce-order-operations" as never),
  ).resolves.toHaveLength(expect.any(Number));
  await expect(
    client.discover("https://untrusted.invalid" as never),
  ).rejects.toThrow();
});

it("keeps a candidate batch aggregate-only", () => {
  expect(JSON.stringify(discoveryOutput(records))).not.toMatch(
    /https?:|repository|path|source|token|prompt|response/iu,
  );
});
```

- [ ] **Step 2: Verify RED**

Run:

```bash
pnpm --filter @factory/external-intake test -- test/discovery.test.ts
pnpm --filter @factory/intake-cli test -- test/github-source-client.test.ts
```

Expected: FAIL because named operations batches are not a closed Factory-owned
catalogue.

- [ ] **Step 3: Add only fixed family/query mapping and durable evidence**

Define a closed `CommerceOperationsDiscoveryBatchKeyV1` union with
`order-operations`, `fulfillment`, `reservation-queue`,
`membership-promotion`, and `operations-analytics`; map each internal batch
key to one existing capability-family key and one Factory-owned query. Do not
accept a caller query, URL, repository name, package name, path, command, or
version.
Record observed upstream licence and architecture facts in
`docs/market-validation.md`, classify each as dependency, provider,
path-scoped source study, or reference-only, and do not install/copy/promote a
candidate in this task.

- [ ] **Step 4: Verify GREEN and commit**

Run:

```bash
pnpm --filter @factory/external-intake test -- test/discovery.test.ts
pnpm --filter @factory/intake-cli test -- test/github-source-client.test.ts
pnpm --filter @factory/intake-cli typecheck
pnpm --filter @factory/intake-cli lint
```

```bash
git add packages/external-intake/src/discovery.ts packages/external-intake/test/discovery.test.ts apps/intake-cli/src/github-discovery-client.ts apps/intake-cli/test/github-source-client.test.ts docs/market-validation.md docs/project-status.md
git commit -m "feat(intake): queue commerce operations candidates"
```

## Plan self-review

- The Workbench requirement is Task 1; it exposes profile coverage rather than
  source or install controls.
- Restaurant/Ecommerce business completeness advances through the reusable
  order-operations contract, physical package, compiler, and independent
  generated-runtime evidence in Tasks 2–5.
- The 100-profile scale requirement is addressed by Task 6's bounded discovery
  batch and by the family model, not by cloning application repositories.
- Provider-dependent requirements remain explicit gaps and cannot be marked
  available from source discovery alone.
- All new public projections reject source-shaped values; all generated
  behaviour remains selected from an immutable lock.

## Execution handoff

Plan saved to
`docs/superpowers/plans/2026-08-01-commerce-operations-foundation.md`.

Execution mode: **inline**. The controller has authorised this workspace to
make implementation and governance decisions autonomously, and Task 1 changes
the shared public contract that must remain serialized. Run each task with TDD
and a review gate before proceeding to the next task.
