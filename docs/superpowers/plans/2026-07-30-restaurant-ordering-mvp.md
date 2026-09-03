# Restaurant Ordering MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Compile a Graph-defined, runnable dine-in Restaurant Ordering application with distinct customer and merchant experiences, and add a functional Workbench Home that creates and operates it.

**Architecture:** Restaurant remains a locked composition profile on ApplicationGraphV1. A profile validator produces a bounded projection. Factory-owned capability packages contribute verified templates; the compiler emits transactional Prisma/NestJS behavior and bounded Next.js page blocks. Home reads safe lifecycle summaries and reuses the existing Draft -> Publish -> Compilation actions.

**Tech Stack:** pnpm 9, Turborepo, TypeScript, Zod, Next.js 15, NestJS 10, Prisma/PostgreSQL, Casbin, XState, BullMQ, Vitest, Playwright, Docker Compose.

## Global Constraints

- Use Node 22 inside all release and Docker verification. Local Node 24 outcomes are development-only evidence.
- ApplicationGraphV1 is the only business source of truth.
- Preserve mutable Draft -> Publish -> immutable Compilation. Compilers never consume a Draft.
- Restaurant mutations must use a Prisma transaction, expected order version, idempotency key, Casbin permission, append-only audit evidence, and no InMemoryRecordStore fallback.
- Do not copy third-party source. A new dependency requires a fixed-version source study, license decision, notices, tests, and a Factory-owned boundary.
- Keep credentials, raw AI prompts, and raw AI responses out of persistent state, logs, artifacts, tests, screenshots, and commits.
- Do not add compatibility behavior for the archived legacy runtime.
- Write focused failing tests before behavior changes whenever practical.

---

## Delivery dependencies

1. Tasks 1 and 2 establish the Profile contract and real capability assets.
2. Task 3 turns the Restaurant runtime into an authoritative transactional compiler target.
3. Tasks 4, 5, and 6 may proceed in parallel after Task 3 freezes its output contract.
4. Task 7 integrates the generated application and Docker acceptance.
5. Task 8 independently reviews and accepts or rejects the Profile.

## File map

| Path                                             | Responsibility                                                    |
| ------------------------------------------------ | ----------------------------------------------------------------- |
| packages/capabilities/src/restaurant/profile.ts  | Restaurant semantic validator and compiler projection             |
| packages/capabilities/src/assets/restaurant/*.ts | Restaurant package manifests                                      |
| packages/capabilities/assets/restaurant.*/1.0.0/ | Package manifest, adapter, templates, fixtures, contract evidence |
| packages/compiler/src/restaurant-runtime.ts      | Transactional command, persistence, and outbox renderer           |
| packages/compiler/src/restaurant-page-runtime.ts | Customer and merchant generated page-block renderer               |
| apps/control-plane/src/lifecycle.service.ts      | Safe application-summary aggregation                              |
| apps/workbench/components/workbench-home.tsx     | Profile portfolio and application Home                            |
| e2e/generated-restaurant.spec.ts                 | Generated customer and merchant browser journey                   |
| docs/ecosystem/source-studies/                   | Exact source evidence for any admitted dependency                 |

---

### Task 1: Define the Restaurant Profile contract and starter Graph

**Files:**

- Create: packages/capabilities/src/restaurant/profile.ts
- Create: packages/capabilities/test/restaurant-profile.test.ts
- Modify: packages/capabilities/src/assets/contract.ts
- Modify: packages/capabilities/src/index.ts
- Modify: packages/capabilities/test/capability-registry.test.ts
- Modify: docs/roadmap.md

**Consumes:** ApplicationGraphV1, the existing composition recipe and Golden asset-lock model.

**Produces:**

```ts
export type RestaurantProfileValidationIssue = {
  readonly code: string;
  readonly message: string;
  readonly path: readonly (string | number)[];
};

export type RestaurantProfileProjectionV1 = {
  readonly apiVersion: "factory.restaurant-profile/v1";
  readonly entities: Readonly<Record<RestaurantEntityKey, string>>;
  readonly roles: {
    readonly customer: string;
    readonly kitchen: string;
    readonly cashier: string;
    readonly manager: string;
  };
  readonly pageGroups: {
    readonly customer: readonly string[];
    readonly merchant: readonly string[];
  };
  readonly order: {
    readonly entity: string;
    readonly states: readonly string[];
    readonly versionField: "orderVersion";
  };
};

export function validateRestaurantOrderingProfile(
  graph: ApplicationGraphV1,
): readonly RestaurantProfileValidationIssue[];

export function assertRestaurantOrderingProfile(
  graph: ApplicationGraphV1,
): RestaurantProfileProjectionV1;
```

CapabilityCategory gains restaurant. CapabilityOutputSlot gains api.command,
web.customer, web.merchant, report.read-model, and realtime.event. These are
declarations only; the Composer remains the only writer of generated paths.

- [ ] **Step 1: Write the failing tests**

```ts
it("accepts the complete Restaurant starter and returns a bounded projection", () => {
  const graph = composeProfileDraft({ profile: "restaurant-ordering" }).graph;

  expect(assertRestaurantOrderingProfile(graph)).toMatchObject({
    apiVersion: "factory.restaurant-profile/v1",
    order: { entity: "order", versionField: "orderVersion" },
  });
});

it("rejects a Restaurant Graph without a table-session token digest", () => {
  const graph = composeProfileDraft({ profile: "restaurant-ordering" }).graph;
  graph.domain.entities.find(
    (entity) => entity.key === "table-session",
  )!.fields = [];

  expect(() => assertRestaurantOrderingProfile(graph)).toThrow("tokenDigest");
});
```

- [ ] **Step 2: Verify RED**

Run: pnpm --filter @factory/capabilities test -- restaurant-profile.test.ts

Expected: FAIL because the validator and complete Restaurant Graph are absent.

- [ ] **Step 3: Implement exact Graph semantics**

The starter has restaurant-location, restaurant-table, table-session,
menu-category, menu-item, order, order-line, payment-attempt, kitchen-ticket,
and inventory-ledger entities. It includes all field, relation, role, route,
page-block, capability-lock, and flow requirements from the approved design.

Validate exact order states:

```ts
const requiredOrderStates = [
  "cart",
  "submitted",
  "paid",
  "accepted",
  "preparing",
  "ready",
  "served",
  "cancelled",
] as const;
```

Return every missing role, field, lock, page, block, event, or transition as a
deterministically sorted issue. Update the roadmap to state the customer and
merchant Restaurant acceptance boundary.

- [ ] **Step 4: Verify registry locks**

Assert that the starter locks every required core, commerce, and Restaurant
asset. Assert every declared operation is supplied by exactly one asset.

- [ ] **Step 5: Verify GREEN**

Run:

```powershell
pnpm --filter @factory/capabilities test
pnpm --filter @factory/capabilities typecheck
pnpm --filter @factory/capabilities lint
```

Expected: complete Restaurant Graph and capability registry pass.

- [ ] **Step 6: Commit**

```powershell
git add packages/capabilities docs/roadmap.md
git commit -m "feat: define restaurant profile contract"
```

---

### Task 2: Package six Restaurant capabilities as Golden assets

**Files:**

- Create: packages/capabilities/src/assets/restaurant/table-session.ts
- Create: packages/capabilities/src/assets/restaurant/menu.ts
- Create: packages/capabilities/src/assets/restaurant/ordering.ts
- Create: packages/capabilities/src/assets/restaurant/kitchen.ts
- Create: packages/capabilities/src/assets/restaurant/cashier.ts
- Create: packages/capabilities/src/assets/restaurant/reporting.ts
- Create: packages/capabilities/assets/restaurant.table-session/1.0.0/
- Create: packages/capabilities/assets/restaurant.menu/1.0.0/
- Create: packages/capabilities/assets/restaurant.ordering/1.0.0/
- Create: packages/capabilities/assets/restaurant.kitchen/1.0.0/
- Create: packages/capabilities/assets/restaurant.cashier/1.0.0/
- Create: packages/capabilities/assets/restaurant.reporting/1.0.0/
- Modify: packages/capabilities/src/assets/index.ts
- Modify: packages/capabilities/src/index.ts
- Modify: packages/capabilities/test/capability-registry.test.ts

**Consumes:** Task 1 contract and output slots.

**Produces:** Six factory.capability/v1 assets. Each package contains
component.json, adapter.json, fixtures/default.json, tests/contract.json, and
only templates declared by its adapter.

- [ ] **Step 1: Write failing asset tests**

```ts
it.each([
  "restaurant.table-session",
  "restaurant.menu",
  "restaurant.ordering",
  "restaurant.kitchen",
  "restaurant.cashier",
  "restaurant.reporting",
])("locks verified Restaurant asset %s", (key) => {
  const asset = capabilityAssets.find(
    (candidate) => candidate.manifest.key === key,
  );

  expect(asset?.manifest.lifecycle).toBe("golden");
  expect(asset?.manifest.templates.length).toBeGreaterThan(0);
  expect(asset?.manifest.verification.status).toBe("verified");
});
```

- [ ] **Step 2: Verify RED**

Run: pnpm --filter @factory/capabilities test -- capability-registry.test.ts

Expected: FAIL because the Restaurant packages do not exist.

- [ ] **Step 3: Implement manifests, adapters, fixtures, and templates**

Use these exact operation sets:

```ts
const restaurantOperations = {
  "restaurant.table-session": [
    "table-session.create",
    "table-session.validate",
    "table-session.close",
    "table-session.expire",
  ],
  "restaurant.menu": [
    "menu.category.list",
    "menu.item.list",
    "menu.item.search",
    "menu.item.manage",
    "inventory.adjust",
  ],
  "restaurant.ordering": [
    "order.line.add",
    "order.line.update",
    "order.line.remove",
    "order.submit",
    "order.cancel",
    "order.history",
  ],
  "restaurant.kitchen": [
    "kitchen.ticket.create",
    "kitchen.ticket.accept",
    "kitchen.ticket.prepare",
    "kitchen.ticket.ready",
  ],
  "restaurant.cashier": [
    "payment.simulate",
    "payment.reversal.request",
    "order.serve",
    "receipt.render",
  ],
  "restaurant.reporting": [
    "report.restaurant.summary",
    "report.restaurant.low-stock",
  ],
} as const;
```

Each adapter declares only approved target path families and output slots.
Compute stored SHA-256 digests for every template and verify TypeScript
manifests, component.json, and adapter.json agree exactly.

- [ ] **Step 4: Verify composition safety**

Test that composing the Restaurant starter creates locks for all six assets,
and that no adapter contribution can target outside its declared output slots.

- [ ] **Step 5: Verify GREEN**

Run:

```powershell
pnpm --filter @factory/capabilities test
pnpm --filter @factory/capabilities typecheck
pnpm --filter @factory/capabilities lint
```

- [ ] **Step 6: Commit**

```powershell
git add packages/capabilities
git commit -m "feat: add restaurant capability assets"
```

---

### Task 3: Compile an authoritative Restaurant transaction runtime

**Files:**

- Create: packages/compiler/src/restaurant-runtime.ts
- Create: packages/compiler/test/restaurant-runtime.test.ts
- Modify: packages/compiler/src/index.ts
- Modify: packages/compiler/test/profile-compilation.test.ts
- Modify: packages/compiler/test/compilation-plan.test.ts

**Consumes:** Tasks 1-2.

**Produces:** A generated NestJS/Prisma Restaurant command runtime. Every
state-changing operation uses a transaction and none creates an
InMemoryRecordStore instance.

- [ ] **Step 1: Write failing compiler tests**

```ts
it("emits atomic Restaurant commands instead of in-memory state", () => {
  const files = filesFor("restaurant-ordering");

  expect(files["api/src/restaurant/restaurant-command.service.ts"]).toContain(
    "$transaction",
  );
  expect(files["api/src/main.ts"]).toContain("PrismaRecordStore");
  expect(files["api/src/main.ts"]).not.toContain("new InMemoryRecordStore");
});

it("persists idempotency, outbox, and inventory ledger models", () => {
  const schema = filesFor("restaurant-ordering")["api/prisma/schema.prisma"];

  expect(schema).toContain("model RestaurantCommand");
  expect(schema).toContain("model RestaurantOutboxEvent");
  expect(schema).toContain("model InventoryLedger");
});
```

- [ ] **Step 2: Verify RED**

Run: pnpm --filter @factory/compiler test -- restaurant-runtime.test.ts

Expected: FAIL because no Restaurant transaction renderer exists.

- [ ] **Step 3: Implement generated command contract**

Restaurant runtime accepts only RestaurantProfileProjectionV1 and renders:

```text
POST /api/restaurant/table-sessions/resolve
POST /api/restaurant/orders/:id/lines
PATCH /api/restaurant/orders/:id/lines/:lineId
POST /api/restaurant/orders/:id/submit
POST /api/restaurant/orders/:id/payments
POST /api/restaurant/orders/:id/cancel
POST /api/restaurant/kitchen-tickets/:id/events/:event
POST /api/restaurant/orders/:id/serve
GET  /api/restaurant/reports/summary
GET  /api/restaurant/reports/low-stock
```

All mutations require x-factory-idempotency-key and body.expectedVersion.
Generate a unique command record on scope plus idempotency key. Same key with a
different payload fails; a repeated successful key returns the first outcome.
One transaction writes the order version, payment attempt, ticket, inventory
ledger, audit event, capability evidence, and outbox event. Failure rolls all
writes back.

Keep generic ApplicationRuntime for other Profiles. The Restaurant main module
selects Restaurant command handling only after the profile validator succeeds.

- [ ] **Step 4: Generate target projections**

Emit Prisma models/migration SQL for RestaurantCommand,
RestaurantOutboxEvent, and every required Restaurant entity. Emit Casbin
policies, XState flow definitions, API reference, ERD, permission matrix, and
generated unit tests for stale version, duplicate command, insufficient stock,
cancellation, and denied access.

- [ ] **Step 5: Verify GREEN**

Run:

```powershell
pnpm --filter @factory/compiler test
pnpm --filter @factory/compiler typecheck
pnpm --filter @factory/compiler lint
```

- [ ] **Step 6: Commit**

```powershell
git add packages/compiler
git commit -m "feat: compile restaurant transaction runtime"
```

---

### Task 4: Generate Customer Restaurant routes and offline reads

**Files:**

- Create: packages/compiler/src/restaurant-page-runtime.ts
- Create: packages/compiler/test/restaurant-page-runtime.test.ts
- Modify: packages/compiler/src/page-runtime-projection.ts
- Modify: packages/compiler/src/index.ts
- Modify: e2e/generated-restaurant.spec.ts
- Conditionally create: docs/ecosystem/source-studies/googlechrome-workbox-<commit>.md
- Conditionally create: docs/ecosystem/source-studies/zpao-qrcode-react-<commit>.md
- Conditionally modify: packages/compiler/package.json
- Conditionally modify: docs/third-party-notices.md

**Consumes:** Tasks 1-3.

**Produces:** Customer routes for table-session entry, menu browsing/search,
cart quantity, item and order notes, full simulated payment, order tracking,
receipt, and session history.

- [ ] **Step 1: Write failing projection and browser tests**

```ts
it("rejects a customer menu block without validated table-session binding", () => {
  const graph = restaurantGraphWithBlock("menu-browser", {
    session: "raw-table-12",
  });

  expect(() => createGeneratedPageRuntimeProjection(graph)).toThrow(
    "table-session",
  );
});
```

```ts
test("customer resolves a table session, adds notes, pays, and sees status", async ({
  page,
}) => {
  await page.goto(tableUrl);
  await page.getByRole("button", { name: "Add Margherita pizza" }).click();
  await page.getByLabel("Item note").fill("No basil");
  await page.getByLabel("Order note").fill("Please serve together");
  await page.getByRole("button", { name: "Pay simulated payment" }).click();

  await expect(page.getByText("Paid")).toBeVisible();
});
```

- [ ] **Step 2: Verify RED**

Run:

```powershell
pnpm --filter @factory/compiler test -- restaurant-page-runtime.test.ts
pnpm exec playwright test e2e/generated-restaurant.spec.ts --grep "customer"
```

- [ ] **Step 3: Implement bounded Customer blocks**

Implement restaurant-entry, menu-browser, order-cart, payment-checkout,
order-tracker, and receipt only when Restaurant Profile validation passes.
Pass only typed profile data. Do not pass arbitrary component identifiers, URLs,
provider credentials, executable props, or browser scripts from a Graph.

The resolver exchanges an opaque route token through the generated API. It
stores only the active session scope, sends expected versions and idempotency
keys, and never changes order state until an API response succeeds.

- [ ] **Step 4: Add offline-read behavior only after source intake**

If both exact source studies pass, add a generated service worker that caches
the app shell, menu/category reads, and static assets. All order, payment, and
kitchen POST endpoints are network-only. Add an offline browser test that
proves cached menu remains visible but payment is disabled with an explicit
online-required message.

- [ ] **Step 5: Verify GREEN**

Run:

```powershell
pnpm --filter @factory/compiler test
pnpm --filter @factory/compiler typecheck
pnpm exec playwright test e2e/generated-restaurant.spec.ts --grep "customer"
```

- [ ] **Step 6: Commit**

```powershell
git add packages/compiler e2e docs/ecosystem/source-studies docs/third-party-notices.md
git commit -m "feat: generate restaurant customer experience"
```

---

### Task 5: Generate Merchant operations, realtime outbox, receipts, and reporting

**Files:**

- Create: packages/compiler/src/restaurant-merchant-runtime.ts
- Create: packages/compiler/test/restaurant-merchant-runtime.test.ts
- Modify: packages/compiler/src/restaurant-page-runtime.ts
- Modify: packages/compiler/src/restaurant-runtime.ts
- Modify: packages/compiler/src/index.ts
- Modify: e2e/generated-restaurant.spec.ts
- Conditionally create: docs/ecosystem/source-studies/socketio-socket-io-<commit>.md
- Conditionally create: docs/ecosystem/source-studies/matthewherbst-react-to-print-<commit>.md
- Conditionally create: docs/ecosystem/source-studies/apache-echarts-<commit>.md
- Conditionally modify: packages/compiler/package.json
- Conditionally modify: docs/third-party-notices.md

**Consumes:** Tasks 1-4.

**Produces:** Table board, menu manager, deterministic kitchen board, cashier,
browser receipt, reporting dashboard, and transport-neutral outbox.

- [ ] **Step 1: Write failing merchant tests**

```ts
it("sorts kitchen tickets by priority, paid time, then table number", () => {
  const tickets = restaurantKitchenProjection([
    lowLater,
    highLater,
    highEarlier,
  ]);

  expect(tickets.map((ticket) => ticket.id)).toEqual([
    "high-earlier",
    "high-later",
    "low-later",
  ]);
});
```

```ts
test("manager cancellation compensates inventory and records its reason", async ({
  page,
}) => {
  await page.getByLabel("Role").selectOption("manager");
  await page.getByRole("button", { name: "Cancel order" }).click();
  await page.getByLabel("Cancellation reason").fill("Guest left");
  await page.getByRole("button", { name: "Confirm cancellation" }).click();

  await expect(page.getByText("Inventory released")).toBeVisible();
  await expect(page.getByText("Guest left")).toBeVisible();
});
```

- [ ] **Step 2: Verify RED**

Run: pnpm --filter @factory/compiler test -- restaurant-merchant-runtime.test.ts

- [ ] **Step 3: Implement Merchant blocks and read models**

Render table-board, menu-manager, kitchen-board, cashier-console, and
restaurant-dashboard. Manager commands adjust availability and stock through
inventory ledger entries. Cashier records a simulated full payment, serves an
order, and renders a receipt. Kitchen sees only permitted ticket states.

The reporting projection returns sales total, order count, average preparation
duration, cancellation count, and low-stock entries from persistence. It cannot
change workflow state or use client-side totals.

- [ ] **Step 4: Implement outbox contract and optional realtime adapter**

```ts
export type RestaurantEventV1 = {
  readonly type: "order.created" | "order.transitioned" | "inventory.changed";
  readonly orderId?: string;
  readonly locationId: string;
  readonly version: number;
  readonly occurredAt: string;
};

export interface RestaurantEventPublisher {
  publish(event: RestaurantEventV1): Promise<void>;
}
```

The baseline publisher records test events. If Socket.IO passes a source study,
generate an adapter that publishes committed events only. A socket message
cannot invoke a command or transition.

- [ ] **Step 5: Verify GREEN**

Run:

```powershell
pnpm --filter @factory/compiler test
pnpm --filter @factory/compiler typecheck
pnpm exec playwright test e2e/generated-restaurant.spec.ts --grep "merchant|kitchen|cashier"
```

- [ ] **Step 6: Commit**

```powershell
git add packages/compiler e2e docs/ecosystem/source-studies docs/third-party-notices.md
git commit -m "feat: generate restaurant merchant operations"
```

---

### Task 6: Add Workbench Home and safe application summaries

**Files:**

- Create: apps/workbench/components/workbench-home.tsx
- Create: apps/workbench/components/workbench-home.test.ts
- Modify: apps/workbench/components/workbench.tsx
- Modify: apps/workbench/lib/workbench-model.ts
- Modify: apps/workbench/lib/control-plane-client.ts
- Modify: apps/workbench/lib/control-plane-client.test.ts
- Modify: apps/control-plane/src/lifecycle.controller.ts
- Modify: apps/control-plane/src/lifecycle.service.ts
- Modify: apps/control-plane/test/lifecycle.controller.test.ts
- Modify: apps/control-plane/test/lifecycle.service.test.ts
- Modify: e2e/workbench.spec.ts

**Consumes:** Task 1 profile names and existing lifecycle persistence.

**Produces:** GET /workspaces/local/application-graphs summary API and a Home
surface with Profile cards, projects, status, activity, and lifecycle-safe
actions.

- [ ] **Step 1: Write failing Control Plane and Workbench tests**

```ts
it("returns summaries without Draft Graph or artifact content", async () => {
  const result = await service.listLocalApplicationSummaries();

  expect(result[0]).toEqual(
    expect.objectContaining({ key: "restaurant-ordering" }),
  );
  expect(JSON.stringify(result)).not.toContain('"domain"');
  expect(JSON.stringify(result)).not.toContain("artifactContent");
});
```

```ts
it("opens Restaurant from Home and keeps compilation disabled until publish", async () => {
  render(<WorkbenchHome applications={[restaurantDraftSummary]} />);

  await user.click(screen.getByRole("button", { name: "Open Restaurant ordering" }));

  expect(onOpen).toHaveBeenCalledWith("restaurant-ordering");
});
```

- [ ] **Step 2: Verify RED**

Run:

```powershell
pnpm --filter @factory/control-plane test -- lifecycle.service.test.ts lifecycle.controller.test.ts
pnpm --filter @factory/workbench test -- workbench-home.test.ts
```

- [ ] **Step 3: Implement summary endpoint and client**

Expose only application ID/key/name, composition Profile, latest Draft,
Published revision, most recent Compilation, and Golden asset maturity.

```ts
export type WorkbenchApplicationSummary = {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly compositionProfile: string | null;
  readonly latestDraft: {
    readonly revisionNumber: number;
    readonly createdAt: string;
  } | null;
  readonly latestPublished: {
    readonly revisionNumber: number;
    readonly publishedAt: string;
  } | null;
  readonly latestCompilation: {
    readonly id: string;
    readonly status: string;
    readonly completedAt: string | null;
  } | null;
};
```

Scope Prisma aggregation to the local workspace. Never return a Graph body,
raw AI field, artifact body, or credential.

- [ ] **Step 4: Implement Home surface**

Add home to the Workbench surface model. Home renders Profile cards,
application rows, lifecycle icons, recent compilation attention states, New
Application, Open, and Compile actions. Reuse existing guided creation and
bootstrap/publish/compile handlers; do not introduce a second store or control
API.

- [ ] **Step 5: Verify GREEN**

Run:

```powershell
pnpm --filter @factory/control-plane test
pnpm --filter @factory/control-plane typecheck
pnpm --filter @factory/workbench test
pnpm --filter @factory/workbench typecheck
pnpm exec playwright test e2e/workbench.spec.ts --grep "Home|Restaurant"
```

- [ ] **Step 6: Commit**

```powershell
git add apps/control-plane apps/workbench e2e
git commit -m "feat: add workbench application home"
```

---

### Task 7: Prove isolated generated Restaurant acceptance

**Files:**

- Modify: apps/compiler-worker/src/compilation-executor.ts
- Modify: apps/compiler-worker/test/compilation-executor.test.ts
- Modify: apps/compiler-worker/test/artifact-writer.test.ts
- Modify: e2e/generated-restaurant.spec.ts
- Modify: e2e/workbench.spec.ts
- Create: docs/acceptance/restaurant-ordering-mvp.md

**Consumes:** Tasks 1-6.

**Produces:** Node 22 Docker proof that a Published Restaurant Graph compiles,
runs, exercises, stops, and cleans up only its own isolated resources.

- [ ] **Step 1: Write failing acceptance tests**

```ts
test("runs generated Restaurant customer and merchant journey in isolated Compose", async ({
  page,
}) => {
  await page.goto(tableUrl);
  await completeCustomerOrder(page);
  await completeKitchenAndCashierOrder(page);
  await expectRestaurantAuditAndDashboard(page);
});

test("removes only generated Restaurant preview resources after stop", async ({
  page,
}) => {
  await stopGeneratedPreview(page);
  expectPreviewResourcesRemoved(previewRunId, composeProjectName);
});
```

- [ ] **Step 2: Verify RED**

Run:

```powershell
$env:FACTORY_E2E_FACTORY_PROJECT = "factory-restaurant-acceptance"
pnpm exec playwright test e2e/generated-restaurant.spec.ts
```

- [ ] **Step 3: Extend Worker evidence without weakening safety**

Validate exact deterministic Restaurant artifacts through the existing manifest
boundary. Reuse the current ID-scoped preview cleanup, cancellation, timeout,
and internal worker callback protections. Do not use the Workbench as the
generated runtime and do not broaden cleanup targets.

- [ ] **Step 4: Run the complete Node 22 acceptance**

Use a unique Compose project and dynamic loopback ports. Prove migration before
API, API/Web readiness, customer table/session/menu/note/pay flow, merchant
kitchen/cashier/manager flow, audit/report results, and cleanup of only the
generated containers/network/volume/runtime directory.

Record commands, artifact digests, image IDs, and outcomes in the acceptance
document. Do not record credentials or raw model data.

- [ ] **Step 5: Verify GREEN**

Run:

```powershell
pnpm --filter @factory/compiler-worker test
pnpm --filter @factory/compiler-worker typecheck
$env:FACTORY_E2E_FACTORY_PROJECT = "factory-restaurant-acceptance"
pnpm exec playwright test e2e/generated-restaurant.spec.ts e2e/workbench.spec.ts
```

- [ ] **Step 6: Commit**

```powershell
git add apps/compiler-worker e2e docs/acceptance
git commit -m "test: accept generated restaurant ordering MVP"
```

---

### Task 8: Independent release review and guarded real-model check

**Files:**

- Create: docs/acceptance/restaurant-ordering-release-review.md
- Modify: docs/project-status.md
- Modify: docs/roadmap.md

**Consumes:** Tasks 1-7 and an optional local OpenAI key.

**Produces:** An independent accepted/not-accepted decision. Deterministic CI
passes without a model credential; the real-model check does not run unless the
environment is configured.

- [ ] **Step 1: Write AI-boundary negative test**

```ts
it("rejects an AI proposal that selects packages, paths, URLs, or arbitrary code", async () => {
  const result = await proposeGraphDiff(restaurantDraft, hostileModelResponse);

  expect(result.status).toBe("rejected");
  expect(result.draft).toEqual(restaurantDraft);
});
```

- [ ] **Step 2: Verify deterministic suite before real model request**

Run:

```powershell
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm verify:third-party
pnpm verify:source-studies
```

Expected: all fixture-based checks pass first.

- [ ] **Step 3: Execute guarded real-model Draft proposal**

Use an environment-only key. Ask for a bounded valid change, such as a declared
menu category or page label. Persist and report only provider name, timestamp,
accepted/rejected status, Draft revision ID, Graph digest, and test outcome.
Never print, persist, screenshot, or report key, prompt, or response. Confirm
the proposal affects only a Draft and still requires Publish before compile.

- [ ] **Step 4: Independent QA review**

Read-only review every Task 1-7 path. Verify all design acceptance statements:
no in-memory Restaurant runtime, only verified assets, adapter output-slot
enforcement, no leaked AI data, Profile isolation, Node 22 Docker evidence,
and resource cleanup. Record P0/P1/P2 results and a release decision.

- [ ] **Step 5: Update status and commit**

Mark the Profile accepted only when no P0/P1 review finding remains.

```powershell
git add docs/acceptance docs/project-status.md docs/roadmap.md
git commit -m "docs: review restaurant ordering release"
```

---

## Follow-up boundary

This plan does not implement delivery, reservations, queueing, loyalty,
coupons, reviews, account login, real payments, split settlement, thermal
printing, native mobile, or external commerce providers. Each becomes a
separate capability design after Task 8. Every new Profile must independently
prove Published Graph -> generated Web/API/database/tests/docs behavior.
