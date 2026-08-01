# Identity and Policy Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a locked `core.identity-policy@1.0.0` Golden capability that
compiles a local identity/session fake and deny-by-default authorization boundary
into Expense Approval and Simple Ecommerce.

**Architecture:** A provider-neutral identity contract is compiled from
validated DomainModel and PolicyModel bindings. The first implementation uses
only deterministic local fixture sessions for role simulation and generated
journeys; the generated server makes a declared resource/action decision before
state mutation. OIDC/Casbin adapters are deferred and may not change this
Graph contract.

**Tech Stack:** TypeScript, Zod, Vitest, NestJS generated targets, Prisma,
PostgreSQL, Playwright, Docker Compose.

## Global Constraints

- Work only from a Published Graph plus immutable composition lock.
- New behavior starts with focused failing tests.
- The local fake is not authentication and never accepts production credentials
  or test role headers as a production authorization bypass.
- Unknown, expired, cross-tenant, or undeclared identity/action inputs deny by
  default before any state change.
- Do not install or integrate Keycloak, `openid-client`, Casbin, OpenFGA,
  SimpleWebAuthn, or external tenant/session services in this plan.
- Existing `core.identity-context@1.0.0` locks remain replayable.
- A capability is accepted only after two isolated generated-application
  journeys and cleanup evidence pass.

---

## File structure

| Path | Responsibility |
| --- | --- |
| `packages/capabilities/src/identity/policy.ts` | Factory-owned principal, session, tenant, and authorization decision semantics. |
| `packages/capabilities/test/identity-policy.test.ts` | Pure deny-by-default, expiry, tenant, and declared-action evidence. |
| `packages/capabilities/src/assets/core/identity-policy-v1-0-0.ts` | Typed catalogue manifest for the new asset. |
| `packages/capabilities/assets/core.identity-policy/1.0.0/` | Immutable physical package with adapter/template/fixture/test evidence. |
| `packages/capabilities/src/assets/index.ts` | Registers the new asset version. |
| `packages/capabilities/src/index.ts` | Adds Expense/Ecommerce bindings and composition selections. |
| `packages/compiler/src/index.ts` | Emits local fixture sessions, generated authorization guard, and policy contribution. |
| `packages/compiler/test/identity-policy-runtime.test.ts` | Validates generated policy guard and lock failure modes. |
| `e2e/generated-expense.spec.ts` | Proves employee/manager/finance decisions in an isolated generated app. |
| `e2e/generated-ecommerce.spec.ts` | Proves shopper/merchant decisions in an isolated generated app. |

### Task 1: Establish Factory identity and decision primitives

**Files:**
- Create: `packages/capabilities/src/identity/policy.ts`
- Create: `packages/capabilities/test/identity-policy.test.ts`
- Modify: `packages/capabilities/src/index.ts`

**Interfaces:**
- `PrincipalContextV1` has `principalId`, `sessionId`, optional `tenantId`,
  `roles`, and `expiresAt`.
- `AuthorizationDecisionInputV1` has `principal`, `resource`, `action`, and
  optional `tenantId`.
- `decideAuthorization(input, declaredRules)` returns either `{ allowed: true }`
  or `{ allowed: false; reason: "missing-session" | "expired-session" |
  "tenant-mismatch" | "undeclared-action" | "deny" }`.

- [ ] **Step 1: Write the failing decision tests**

```ts
it("allows only a declared role/resource/action within the same tenant", () => {
  expect(decideAuthorization({ principal: fixture("manager", "tenant-a"), resource: "expense", action: "approve", tenantId: "tenant-a" }, rules)).toEqual({ allowed: true });
});

it("denies expiry, cross-tenant access, and unknown action", () => {
  expect(decideAuthorization({ principal: expiredFixture(), resource: "order", action: "read" }, rules)).toMatchObject({ allowed: false, reason: "expired-session" });
  expect(decideAuthorization({ principal: fixture("merchant", "tenant-a"), resource: "order", action: "refund", tenantId: "tenant-b" }, rules)).toMatchObject({ allowed: false, reason: "tenant-mismatch" });
});
```

- [ ] **Step 2: Run the failing test**

Run: `pnpm --filter @factory/capabilities test -- test/identity-policy.test.ts`

Expected: FAIL because the identity decision module does not exist.

- [ ] **Step 3: Implement the pure policy decision**

```ts
export function decideAuthorization(
  input: AuthorizationDecisionInputV1,
  rules: readonly DeclaredPermissionV1[],
): AuthorizationDecisionV1 {
  if (!input.principal) return deny("missing-session");
  if (Date.parse(input.principal.expiresAt) <= Date.now()) return deny("expired-session");
  if (input.tenantId && input.principal.tenantId !== input.tenantId) return deny("tenant-mismatch");
  return rules.some((rule) => matches(rule, input)) ? { allowed: true } : deny("deny");
}
```

Require exact declared resource/action matching; reject empty identifiers and
never infer a role/action from a route or request header.

- [ ] **Step 4: Run focused package verification**

Run: `pnpm --filter @factory/capabilities test -- test/identity-policy.test.ts && pnpm --filter @factory/capabilities typecheck && pnpm --filter @factory/capabilities lint`

Expected: PASS.

- [ ] **Step 5: Commit the primitive contract**

```bash
git add packages/capabilities/src/identity/policy.ts packages/capabilities/test/identity-policy.test.ts packages/capabilities/src/index.ts
git commit -m "feat: add local identity policy primitives"
```

### Task 2: Release the physical Identity capability package

**Files:**
- Create: `packages/capabilities/src/assets/core/identity-policy-v1-0-0.ts`
- Create: `packages/capabilities/assets/core.identity-policy/1.0.0/component.json`
- Create: `packages/capabilities/assets/core.identity-policy/1.0.0/adapter.json`
- Create: `packages/capabilities/assets/core.identity-policy/1.0.0/templates/api/capability-module.ts.tpl`
- Create: `packages/capabilities/assets/core.identity-policy/1.0.0/fixtures/default.json`
- Create: `packages/capabilities/assets/core.identity-policy/1.0.0/tests/contract.json`
- Modify: `packages/capabilities/src/assets/index.ts`
- Modify: `packages/capabilities/test/capability-registry.test.ts`

**Interfaces:**
- Provides `identity.principal-context/v1` and `authorization.decision/v1`.
- Requires `policy.resource-action/v1` and `audit.event/v1`.
- Declares output slots `api.runtime`, `api.service`, `policy.guard`,
  `test.fixture`, and `page.projection`.

- [ ] **Step 1: Write the failing package-integrity test**

```ts
it("verifies the immutable identity-policy package", () => {
  const asset = findCapabilityAsset("core.identity-policy", "1.0.0");
  expect(verifyCapabilityAssetPackage(asset, repositoryRoot)).toEqual([]);
  expect(asset.manifest.provides).toContainEqual({ interfaceKey: "authorization.decision", version: "v1" });
});
```

- [ ] **Step 2: Run the failing package test**

Run: `pnpm --filter @factory/capabilities test -- test/capability-registry.test.ts`

Expected: FAIL because `core.identity-policy` is absent.

- [ ] **Step 3: Implement the declarative package**

Declare typed `principalEntity`, `sessionEntity`, optional `tenantEntity`,
`anonymousRole`, and protected resource/action bindings. The adapter may only
write a generated identity module, policy guard, fixture file, and declared
page projection. Hash every fixture/template/contribution and keep the
TypeScript manifest canonically equal to `component.json`.

- [ ] **Step 4: Verify package integrity**

Run: `pnpm --filter @factory/capabilities test -- test/capability-registry.test.ts && pnpm --filter @factory/capabilities build`

Expected: PASS; a changed fixture, digest, or undeclared write target fails.

- [ ] **Step 5: Commit the Golden package**

```bash
git add packages/capabilities/src/assets packages/capabilities/assets/core.identity-policy packages/capabilities/test/capability-registry.test.ts
git commit -m "feat: add locked identity policy capability package"
```

### Task 3: Compose Identity into Expense and Ecommerce

**Files:**
- Modify: `packages/capabilities/src/index.ts`
- Create: `packages/capabilities/test/identity-policy-profile.test.ts`
- Modify: `packages/capabilities/test/commercial-profile-composition.test.ts`

**Interfaces:**
- Expense binds employee, manager, finance, expense, approval, principal, and
  session graph symbols.
- Ecommerce binds shopper, merchant, order, principal, and session symbols.
- Both locks use exact `core.identity-policy@1.0.0`; their bindings/rules are
  distinct and validated.

- [ ] **Step 1: Write the failing composition tests**

```ts
it("locks identity-policy for Expense and Ecommerce with distinct role matrices", () => {
  const expense = composeDefaultCapabilityDraft({ profile: "expense-approval" }).graph;
  const ecommerce = composeDefaultCapabilityDraft({ profile: "simple-ecommerce" }).graph;
  expect(lockedPackage(expense, "core.identity-policy")).toMatchObject({ version: "1.0.0" });
  expect(bindingsFor(expense, "core.identity-policy")).not.toEqual(bindingsFor(ecommerce, "core.identity-policy"));
});
```

- [ ] **Step 2: Run the failing composition test**

Run: `pnpm --filter @factory/capabilities test -- test/identity-policy-profile.test.ts`

Expected: FAIL because the starters do not select the new package.

- [ ] **Step 3: Add validated identity bindings**

Update the existing composition recipes only. Reuse declared roles and entities,
validate missing/incorrect symbol types, and do not allow a Profile to pass a
raw rule document or provider configuration through the Graph.

- [ ] **Step 4: Run composition tests**

Run: `pnpm --filter @factory/capabilities test -- test/identity-policy-profile.test.ts test/commercial-profile-composition.test.ts`

Expected: PASS; existing historical identity-context locks still resolve.

- [ ] **Step 5: Commit Profile bindings**

```bash
git add packages/capabilities/src/index.ts packages/capabilities/test/identity-policy-profile.test.ts packages/capabilities/test/commercial-profile-composition.test.ts
git commit -m "feat: compose identity policy across profiles"
```

### Task 4: Compile local session and authorization enforcement

**Files:**
- Modify: `packages/compiler/src/index.ts`
- Create: `packages/compiler/test/identity-policy-runtime.test.ts`
- Modify: `packages/compiler/test/composition-compilation.test.ts`

**Interfaces:**
- `resolveIdentityPolicyContribution(input)` validates the exact locked asset.
- Generated API exports `resolvePrincipalContext` and `authorizeDeclaredAction`.
- Generated guard accepts an opaque local fixture-session ID only in local
  compilation mode and produces a safe denial response before mutations.

- [ ] **Step 1: Write failing compiler tests**

```ts
it("emits a deny-by-default identity guard from the locked package", () => {
  const files = filesForPublishedExpense();
  expect(files["api/src/capabilities/core.identity-policy.ts"]).toContain("authorizeDeclaredAction");
  expect(files["api/src/capabilities/core.identity-policy.ts"]).toContain("tenant-mismatch");
});

it("rejects a lock with an undeclared policy target", () => {
  expect(() => generateApplicationBundle(tamperedIdentityLock)).toThrow("contribution");
});
```

- [ ] **Step 2: Run the failing compiler tests**

Run: `pnpm --filter @factory/compiler test -- test/identity-policy-runtime.test.ts`

Expected: FAIL because the identity-policy contribution is absent.

- [ ] **Step 3: Generate local-fake resolution and guard code**

Use the existing locked contribution resolution path. Generate a fixture-session
resolver with deterministic expiry and a guard that calls the Factory-owned
decision function. Do not rely on `x-factory-role` in generated local API
authorization; test role simulation must route through a valid fixture session.

- [ ] **Step 4: Run compiler checks**

Run: `pnpm --filter @factory/compiler test -- test/identity-policy-runtime.test.ts test/composition-compilation.test.ts && pnpm --filter @factory/compiler typecheck && pnpm --filter @factory/compiler build`

Expected: PASS; missing session, expired session, tenant mismatch, unknown
action, or invalid package contribution cannot generate an allowed mutation.

- [ ] **Step 5: Commit compiler enforcement**

```bash
git add packages/compiler/src/index.ts packages/compiler/test/identity-policy-runtime.test.ts packages/compiler/test/composition-compilation.test.ts
git commit -m "feat: compile local identity policy enforcement"
```

### Task 5: Prove isolated Expense and Ecommerce authorization journeys

**Files:**
- Create: `e2e/generated-expense.spec.ts`
- Modify: `e2e/generated-ecommerce.spec.ts`
- Modify: `apps/compiler-worker/test/queued-preview-run.test.ts`

**Interfaces:**
- Expense journey uses fixture employee, manager, and finance sessions.
- Ecommerce journey uses fixture shopper and merchant sessions.
- Every mutating generated API request resolves a local fixture session and
  declared action before state changes.

- [ ] **Step 1: Write failing role journey assertions**

```ts
await expect(api.approveExpense(employeeSession, expenseId)).rejects.toThrow("deny");
await expect(api.approveExpense(managerSession, expenseId)).resolves.toMatchObject({ status: "approved" });
await expect(api.fulfillOrder(shopperSession, orderId)).rejects.toThrow("deny");
await expect(api.fulfillOrder(merchantSession, orderId)).resolves.toMatchObject({ status: "fulfilled" });
```

- [ ] **Step 2: Run the failing generated-app journeys**

Run: `pnpm test:e2e -- --grep "identity policy"`

Expected: FAIL because generated APIs do not require a fixture session.

- [ ] **Step 3: Add the smallest safe UI/session projection**

Expose only the selected fixture persona name, role, and allowed navigation in
local preview. Do not show session identifiers, policy source, provider metadata,
or a role-header editor.

- [ ] **Step 4: Run isolated Docker E2E and cleanup checks**

Run: `pnpm test:e2e -- --grep "identity policy"`

Expected: PASS for both profiles, including denied actions and resource cleanup.

- [ ] **Step 5: Commit journey evidence**

```bash
git add e2e/generated-expense.spec.ts e2e/generated-ecommerce.spec.ts apps/compiler-worker/test/queued-preview-run.test.ts
git commit -m "test: prove generated identity policy journeys"
```

### Task 6: Surface the locked family state and record acceptance

**Files:**
- Modify: `apps/control-plane/src/portfolio/portfolio-summary.service.ts`
- Modify: `apps/control-plane/src/portfolio/portfolio-summary.service.test.ts`
- Modify: `apps/workbench/components/workbench-home.tsx`
- Modify: `apps/workbench/components/workbench-home.test.tsx`
- Create: `docs/acceptance/identity-policy-cross-profile.md`
- Modify: `docs/project-status.md`

- [ ] **Step 1: Write failing Home/Control Plane projection tests**

```ts
expect(summary.capabilityFamilies).toContainEqual(
  expect.objectContaining({ key: "core.identity-policy", status: "golden", profileCount: 2 }),
);
expect(screen.getByText("Identity and policy")).toBeVisible();
```

- [ ] **Step 2: Run the failing projection tests**

Run: `pnpm --filter @factory/control-plane test -- portfolio/portfolio-summary.service.test.ts && pnpm --filter @factory/workbench test -- components/workbench-home.test.tsx`

Expected: FAIL because the new family is not projected.

- [ ] **Step 3: Implement source-free readiness projection**

Add only package key, lifecycle, version, affected Profile count, validation
state, and generated-target state. Do not return external URLs, source-study
body, fixture-session identifiers, policy source, credentials, or raw prompts.

- [ ] **Step 4: Run full release gates and guarded AI acceptance**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm build && pnpm verify:third-party && pnpm verify:source-studies && git diff --check`

Then run the repository's guarded real-model Graph-Diff acceptance command for
one affected Profile using an environment-only key, retaining only redacted
outcome metadata.

Expected: PASS.

- [ ] **Step 5: Commit release evidence**

```bash
git add apps/control-plane/src/portfolio apps/workbench/components/workbench-home.tsx apps/workbench/components/workbench-home.test.tsx docs/acceptance/identity-policy-cross-profile.md docs/project-status.md
git commit -m "docs: record identity policy acceptance evidence"
```
