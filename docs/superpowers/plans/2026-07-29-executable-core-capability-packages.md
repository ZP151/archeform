# Executable Core Capability Packages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the locked `core.crud`, `core.workflow`, `core.audit`, and
`core.notification` packages supply the executable generated-API behavior used
by an Expense Approval application.

**Architecture:** The Compiler continues to own Graph interpretation,
authorization, generated-store interfaces, and output containment. Each
selected core package emits a static, digest-verified runtime module that
implements a narrow declared handler. The generated capability registry maps
declared operations and effects to those modules; `ApplicationRuntime` rejects
an absent or duplicate handler before it changes application state.

**Tech Stack:** TypeScript, Node crypto/fs/path, Vitest, NestJS generated API,
Prisma generated store, pnpm, Docker Compose, Playwright.

> **Completion note (2026-07-29):** Existing `1.0.0` Golden assets remain
> immutable historical inputs. The executable package implementations are
> published as `1.0.1`; a uniform historical lock set compiles through the
> explicit `metadata-v1` runtime family, while `1.0.1` uses
> `package-handlers-v1`. Mixed handler-family locks fail before output.

## Global Constraints

- `ApplicationGraphV1` remains the only business source of truth.
- Only a Published Graph with exact Golden locks may compile executable package
  modules.
- A template is static, local, SHA-256 verified source; it cannot evaluate AI
  output, fetch a URL, or write outside `api/src/capabilities/`.
- The Compiler owns authorization and path confinement; capability modules own
  only their declared storage/effect behavior.
- A missing, duplicate, incompatible, or unsigned physical capability package
  or template contribution fails closed before generated application output is
  returned. A missing or duplicate runtime operation handler fails closed
  before its first state-affecting invocation; Tasks 2 and 3 add those
  handlers incrementally without changing existing execution paths in Task 1.
- Code, tests, documentation, and user-visible copy are English.
- Credentials and raw AI input/output never enter source, artifacts, evidence,
  or logs.

---

## File map

| File                                                                               | Responsibility                                                                       |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `packages/compiler/src/index.ts`                                                   | Renders capability contracts, modules, registry dispatch, and generated API runtime. |
| `packages/compiler/test/compilation-plan.test.ts`                                  | Verifies generated source, handler registration, and fail-closed compiler behavior.  |
| `packages/compiler/test/profile-compilation.test.ts`                               | Verifies Expense composition and generated journey output.                           |
| `packages/capabilities/assets/core.*/1.0.1/component.json`                         | Declares the executable source contribution and digest.                              |
| `packages/capabilities/assets/core.*/1.0.1/adapter.json`                           | Mirrors the allowed declarative contribution.                                        |
| `packages/capabilities/assets/core.*/1.0.1/templates/api/capability-module.ts.tpl` | Implements the package-local generated handler.                                      |
| `packages/capabilities/src/assets/core/*.ts`                                       | Mirrors the physical package manifest in the trusted Registry projection.            |
| `packages/capabilities/src/node.ts`                                                | Validates package-local contributions before the Compiler receives them.             |
| `packages/capabilities/test/capability-registry.test.ts`                           | Verifies each core package and tamper/unsafe rejection behavior.                     |
| `docs/acceptance/executable-core-capability-packages.md`                           | Records deterministic, generated-app, and browser acceptance evidence.               |

### Task 1: Define the generated capability handler contract

**Files:**

- Modify: `packages/compiler/src/index.ts`
- Modify: `packages/compiler/test/compilation-plan.test.ts`

**Consumes:** Existing resolved `CapabilityTemplateContributionV1` values.

**Produces:** Generated `api/src/capabilities/contract.ts` and a Registry that
can find one handler by effect or operation without a centralized allow-list.

- [x] **Step 1: Write the failing Compiler test**

```ts
expect(files["api/src/capabilities/contract.ts"]).toContain(
  "export interface CapabilityRuntimeModule",
);
expect(files["api/src/capabilities/registry.ts"]).toContain("getEffectHandler");
expect(files["api/src/capabilities/registry.ts"]).toContain("getRecordHandler");
```

- [x] **Step 2: Run the test to prove the contract does not exist**

Run: `pnpm --filter @factory/compiler test -- compilation-plan.test.ts`

Expected: FAIL because the bundle lacks `contract.ts` and registry dispatch
exports.

- [x] **Step 3: Render the contract and registry dispatch helpers**

```ts
export interface CapabilityRuntimeModule {
  readonly key: string;
  readonly effects: readonly string[];
  readonly recordHandler?: RecordHandler;
  readonly workflowHandler?: WorkflowHandler;
  readonly effectHandler?: EffectHandler;
}

export function getEffectHandler(capability: string): EffectHandler {
  const module = capabilityModules.find((candidate) =>
    candidate.effects.includes(capability),
  );
  if (!module?.effectHandler)
    throw new Error(`No handler for '${capability}'.`);
  return module.effectHandler;
}
```

The registry must reject duplicate handlers for the same effect and must never
infer a handler from a component key not selected by the lock.

- [x] **Step 4: Run the focused Compiler test**

Run: `pnpm --filter @factory/compiler test -- compilation-plan.test.ts`

Expected: PASS.

- [x] **Step 5: Commit the contract boundary**

```bash
git add packages/compiler/src/index.ts packages/compiler/test/compilation-plan.test.ts
git commit -m "feat: add generated capability handler contract"
```

### Task 2: Move audit and notification effects into Golden packages

**Files:**

- Modify: `packages/capabilities/assets/core.audit/1.0.1/component.json`
- Modify: `packages/capabilities/assets/core.audit/1.0.1/adapter.json`
- Modify: `packages/capabilities/assets/core.audit/1.0.1/templates/api/capability-module.ts.tpl`
- Modify: `packages/capabilities/assets/core.notification/1.0.1/component.json`
- Modify: `packages/capabilities/assets/core.notification/1.0.1/adapter.json`
- Modify: `packages/capabilities/assets/core.notification/1.0.1/templates/api/capability-module.ts.tpl`
- Modify: `packages/capabilities/src/assets/core/audit.ts`
- Modify: `packages/capabilities/src/assets/core/notification.ts`
- Modify: `packages/capabilities/test/capability-registry.test.ts`
- Modify: `packages/compiler/src/index.ts`
- Modify: `packages/compiler/test/profile-compilation.test.ts`

**Consumes:** `EffectHandler` from Task 1.

**Produces:** Package-local audit recording and notification delivery-evidence
handlers. `ApplicationRuntime.executeEffects` dispatches selected module code
instead of branching on `audit.record` or silently treating notification as a
generic event.

**Regression guard:** Existing Restaurant and Ecommerce published profiles use
`inventory.decrement` and `payment.simulate` transition effects. This task
also migrates those two effect handlers into their locked Commerce packages so
the new dispatcher does not reintroduce a centralized fallback or make either
profile's payment transition fail.

- [x] **Step 1: Write failing tests for handler-owned core effects**

```ts
expect(files["api/src/capabilities/core.audit.ts"]).toContain(
  "effectHandler: async",
);
expect(files["api/src/capabilities/core.notification.ts"]).toContain(
  "effectHandler: async",
);
expect(files["api/src/application-runtime.ts"]).not.toContain(
  "effect.capability === 'audit.record'",
);
```

- [x] **Step 2: Run the focused test to prove the shared branch exists**

Run: `pnpm --filter @factory/compiler test -- profile-compilation.test.ts`

Expected: FAIL because core effect templates do not export handlers and the
shared runtime still branches on `audit.record`.

- [x] **Step 3: Implement static package-local effect handlers**

```ts
effectHandler: async ({ role, entityKey, recordId, operation, store, now }) => {
  await store.appendAudit({
    actor: role,
    action: operation,
    entity: entityKey,
    recordId,
    at: now,
  });
};
```

The notification handler must append only its declared capability-delivery
event. Both templates import their contract types with `import type` and must
not import external packages or generated application files at runtime.

- [x] **Step 4: Recalculate and synchronize all affected digests**

Update physical manifests, adapters, and Registry projections to the same
canonical SHA-256 values. Extend the package Registry test so a changed handler
file fails verification.

- [x] **Step 5: Route `executeEffects` through the registry**

```ts
const handler = getEffectHandler(effect.capability);
await handler({
  role,
  entityKey,
  recordId,
  operation: effect.operation,
  store: this.store,
  now: new Date().toISOString(),
});
```

The runtime still appends the generic capability evidence after the selected
handler succeeds.

- [x] **Step 5a: Preserve independent Commerce profile execution**

Write a failing generated journey test for Restaurant/Ecommerce payment that
exercises `payment.simulate` and `inventory.decrement`. Add static verified
handlers to `commerce.simulated-payment` and `commerce.inventory`; extend the
generated `CapabilityStore` contract only with the existing bounded cart and
inventory methods those handlers require. Move the inventory mutation out of
`ApplicationRuntime.executeEffects`, update both physical manifests/adapters
and Registry projections with exact digests, then verify the runtime contains
no `inventory.decrement` branch.

```ts
effectHandler: async ({ store, entityKey, recordId }) => {
  const items = await store.listCartItems(entityKey, recordId);
  if (items.length === 0)
    throw new Error(
      `Cannot decrement inventory for an empty cart '${recordId}'.`,
    );
  for (const item of items)
    await store.decrementInventory(
      item.catalogEntity,
      item.catalogRecordId,
      item.quantity,
    );
};
```

The simulated-payment handler records only its bounded package delivery event.
Both handlers must execute before the generic capability evidence is appended.

- [x] **Step 6: Run focused capability and Compiler tests**

Run:

```bash
pnpm --filter @factory/capabilities test
pnpm --filter @factory/compiler test -- profile-compilation.test.ts
```

Expected: PASS, including audit-free Expense compilation without an audit
handler module.

- [x] **Step 7: Commit executable core effects**

```bash
git add packages/capabilities packages/compiler
git commit -m "feat: dispatch core effects from capability packages"
```

### Task 3: Move CRUD and workflow execution into Golden packages

**Files:**

- Modify: `packages/capabilities/assets/core.crud/1.0.1/component.json`
- Modify: `packages/capabilities/assets/core.crud/1.0.1/adapter.json`
- Modify: `packages/capabilities/assets/core.crud/1.0.1/templates/api/capability-module.ts.tpl`
- Modify: `packages/capabilities/assets/core.workflow/1.0.1/component.json`
- Modify: `packages/capabilities/assets/core.workflow/1.0.1/adapter.json`
- Modify: `packages/capabilities/assets/core.workflow/1.0.1/templates/api/capability-module.ts.tpl`
- Modify: `packages/capabilities/src/assets/core/crud.ts`
- Modify: `packages/capabilities/src/assets/core/workflow.ts`
- Modify: `packages/compiler/src/index.ts`
- Modify: `packages/compiler/test/compilation-plan.test.ts`
- Modify: `packages/compiler/test/profile-compilation.test.ts`

**Consumes:** `RecordHandler` and `WorkflowHandler` from Task 1.

**Produces:** Package-local record persistence and declared transition-state
handlers. The shared runtime retains only Graph lookup, validation, and Casbin
authorization before calling those handlers.

- [x] **Step 1: Write failing generated-source and journey tests**

```ts
expect(files["api/src/capabilities/core.crud.ts"]).toContain("recordHandler");
expect(files["api/src/capabilities/core.workflow.ts"]).toContain(
  "workflowHandler",
);
expect(files["api/src/application-runtime.ts"]).not.toContain(
  "await this.store.create(entityKey",
);
expect(files["api/src/application-runtime.ts"]).not.toContain(
  "await this.store.update(entityKey, recordId, { status: transition.to })",
);
```

- [x] **Step 2: Run the focused test to confirm centralized persistence**

Run: `pnpm --filter @factory/compiler test -- compilation-plan.test.ts`

Expected: FAIL because the old runtime owns create and transition persistence.

- [x] **Step 3: Implement static record and workflow handlers**

```ts
recordHandler: {
  create: async ({ store, entityKey, input }) => store.create(entityKey, input),
  list: async ({ store, entityKey }) => store.list(entityKey),
}

workflowHandler: {
  applyTransition: async ({ store, entityKey, recordId, nextState }) =>
    store.update(entityKey, recordId, { status: nextState }),
}
```

Keep required-field validation, role checks, and transition selection in the
Compiler-owned runtime; no capability module receives a raw HTTP request or
arbitrary Graph source.

- [x] **Step 4: Update manifests and Registry projections**

Declare the executable template contribution, regenerate exact digests, and
verify the physical JSON and TypeScript projection remain byte-for-byte aligned
through the existing package loader.

- [x] **Step 5: Dispatch from `ApplicationRuntime`**

```ts
const record = await getRecordHandler().create({
  store: this.store,
  entityKey,
  input: payload,
});
const updated = await getWorkflowHandler().applyTransition({
  store: this.store,
  entityKey,
  recordId,
  nextState: transition.to,
});
```

If the locked package cannot supply the operation, throw before modifying the
store. The audit append after a successful create/transition remains a
Compiler-owned lifecycle event, distinct from the optional `audit.record`
effect handler.

- [x] **Step 6: Run focused package and generated-journey tests**

Run:

```bash
pnpm --filter @factory/capabilities test
pnpm --filter @factory/compiler test
```

Expected: PASS for Expense, Restaurant, and Ecommerce compilation; only
Expense execution ownership changes in this slice.

- [x] **Step 7: Commit executable core operations**

```bash
git add packages/capabilities packages/compiler
git commit -m "feat: move core record and workflow handlers into packages"
```

### Task 4: Accept the independently generated Expense profile

**Files:**

- Create: `docs/acceptance/expense-approval-executable-packages.md`
- Modify: `packages/compiler/test/profile-compilation.test.ts`
- Modify: `e2e/workbench.spec.ts`

**Consumes:** Tasks 1–3.

**Produces:** Evidence that a published Expense graph compiles source owned by
the exact selected core packages and succeeds in submit, approve/reject, audit,
and optional-notification journeys.

- [x] **Step 1: Write a failing generated-app acceptance assertion**

```ts
expect(files["api/src/application-runtime.ts"]).toContain("getRecordHandler");
expect(files["api/src/application-runtime.ts"]).toContain("getWorkflowHandler");
expect(files["api/src/capabilities/core.audit.ts"]).toContain("effectHandler");
```

- [x] **Step 2: Run the generated-app API journey**

```bash
pnpm install
pnpm --filter generated-api exec prisma generate --schema prisma/schema.prisma
pnpm --filter generated-api build
pnpm --filter generated-api test
```

Expected: Expense submit, approve/reject, audit, and optional-notification
journeys pass against the generated API.

- [x] **Step 3: Add an isolated browser evidence assertion**

```ts
await page
  .getByRole("button", { name: "capability-template-lock.json" })
  .click();
await expect(
  page.getByText("factory.capability-template-lock/v1"),
).toBeVisible();
```

The browser test must also confirm the published graph reaches completed
compilation in the isolated Docker Compose project.

- [x] **Step 4: Run acceptance gates and record evidence**

Run:

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm verify:third-party
pnpm verify:source-studies
pnpm exec playwright test e2e/workbench.spec.ts --reporter=line
git diff --check
```

Record commands, result counts, package lock evidence, and named test-project
cleanup in `docs/acceptance/expense-approval-executable-packages.md`. Do not
record raw prompts, credentials, or model responses.

- [x] **Step 5: Obtain P0/P1 review, commit, and push**

```bash
git add docs/acceptance packages/capabilities packages/compiler e2e
git commit -m "feat: execute expense capabilities from Golden packages"
git push origin main
```

## Self-review

- Scope is intentionally limited to the four core packages and the Expense
  profile. Commerce handler execution is covered only as a regression guard
  for the independently accepted Restaurant and Ecommerce profiles; it uses
  the same handler contract.
- All generated executable behavior enters only through physical, Golden,
  digest-verified templates and has an explicit Compiler-owned interface.
- The plan contains no runtime dependency on raw AI output, URL imports, or
  arbitrary source parsing.
