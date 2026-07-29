# Capability-composed guided creation implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a business user select verified optional capabilities while creating a new Application Graph Draft without allowing arbitrary Graph or source generation.

**Architecture:** `@factory/capabilities` adds deterministic profile recipes that transform only declared Graph surfaces, and validates the result before returning it. The Workbench expands the existing left-side guided drawer with a capability selection stage and sends only the resulting Draft through the existing Control Plane boundary.

**Tech Stack:** TypeScript, Zod-backed `@factory/graph`, Vitest, Next.js, Playwright.

## Global Constraints

- Keep `ApplicationGraphV1` as the source of truth.
- Preserve Draft -> Publish -> immutable Compilation.
- No code, model call, publish, compilation, credential, raw prompt, or raw response is created by guided creation.
- `core.audit` is optional only for Expense Approval and Simple Ecommerce;
  `core.notification` is optional only for Expense Approval and Restaurant Ordering.
- A recipe may change only Integration capability entries, Flow effects, and audit policy actions.
- All tests, UI text, and docs remain English.

---

### Task 1: Define deterministic capability recipes

**Files:**

- Modify: `packages/capabilities/src/index.ts`
- Modify: `packages/capabilities/test/capability-registry.test.ts`

**Interfaces:**

- Produces `ProfileCompositionInput`, `ProfileCompositionResult`, and `composeProfileDraft(input)`.
- Consumes a `FactoryProfile`, optional selection keys, and the existing immutable profile starter.
- `composeProfileDraft` returns a newly allocated semantically valid Graph and a selected capability summary.

- [x] **Step 1: Write focused failing composition tests**

```ts
expect(
  composeProfileDraft({ profile: "expense-approval", optionalCapabilities: [] })
    .graph.integration.capabilities,
).not.toContainEqual(expect.objectContaining({ key: "audit.record" }));
expect(
  composeProfileDraft({ profile: "expense-approval", optionalCapabilities: [] })
    .graph.flow.flows[0]?.transitions,
).not.toContainEqual(
  expect.objectContaining({
    effects: expect.arrayContaining([
      expect.objectContaining({ capability: "audit.record" }),
    ]),
  }),
);
expect(() =>
  composeProfileDraft({
    profile: "expense-approval",
    optionalCapabilities: ["commerce.cart"],
  }),
).toThrow();
```

- [x] **Step 2: Run the focused test and confirm it fails**

Run: `pnpm --filter @factory/capabilities test -- capability-registry.test.ts`

Expected: failure because no composition API exists.

- [x] **Step 3: Implement recipes and fail-closed composition**

```ts
export type ProfileCompositionInput = {
  profile: FactoryProfile;
  optionalCapabilities?: readonly OptionalCapabilityKey[];
};

export function composeProfileDraft(
  input: ProfileCompositionInput,
): ProfileCompositionResult {
  const graph = structuredClone(profileGraphFor(input.profile));
  // Validate each requested optional key, then apply only its declared transform.
  return {
    graph: assertValidApplicationGraph(graph),
    selectedOptionalCapabilities,
  };
}
```

- [x] **Step 4: Re-run focused tests and package checks**

Run: `pnpm --filter @factory/capabilities test && pnpm --filter @factory/capabilities typecheck`

Expected: capability tests and type checking pass.

- [x] **Step 5: Commit**

```bash
git add packages/capabilities
git commit -m "feat: compose validated profile capabilities"
```

### Task 2: Carry composition through guided creation state

**Files:**

- Modify: `apps/workbench/lib/guided-application.ts`
- Modify: `apps/workbench/lib/guided-application.test.ts`
- Modify: `apps/workbench/lib/guided-creation-model.ts`
- Modify: `apps/workbench/lib/guided-creation-model.test.ts`

**Interfaces:**

- `GuidedApplicationInput` gains `optionalCapabilities`.
- `GuidedCreationState` gains stage `capabilities` and stores only supported optional keys.
- `createGuidedApplicationDraft(input, nonce)` delegates to `composeProfileDraft` before applying name, id, and theme.

- [x] **Step 1: Write failing helper and reducer tests**

```ts
const state = transitionGuidedCreation(initialGuidedCreationState, {
  type: "select-profile",
  profile: "expense-approval",
});
expect(transitionGuidedCreation(state, { type: "continue" }).stage).toBe(
  "capabilities",
);
expect(
  createGuidedApplicationDraft(
    {
      profile: "expense-approval",
      name: "No audit",
      theme: "light",
      optionalCapabilities: [],
    },
    "test-1",
  ).integration.capabilities,
).not.toContainEqual(expect.objectContaining({ key: "audit.record" }));
```

- [x] **Step 2: Run focused tests and confirm failure**

Run: `pnpm --filter @factory/workbench test -- guided-application.test.ts guided-creation-model.test.ts`

Expected: failure because guided state has no capability stage and helper has no composition input.

- [x] **Step 3: Implement constrained selection state and helper delegation**

```ts
type GuidedCreationAction =
  | { type: "toggle-optional-capability"; capability: OptionalCapabilityKey }
  | { type: "continue" };
```

The reducer rejects a toggle until a profile is selected and resets optional
keys to the selected profile's recipe defaults when the profile changes.

- [x] **Step 4: Run focused Workbench tests**

Run: `pnpm --filter @factory/workbench test && pnpm --filter @factory/workbench typecheck`

Expected: all current and new Workbench tests pass.

- [x] **Step 5: Commit**

```bash
git add apps/workbench/lib
git commit -m "feat: add guided capability selections"
```

### Task 3: Render and prove the guided capability picker

**Files:**

- Modify: `apps/workbench/components/guided-creation-drawer.tsx`
- Modify: `apps/workbench/components/guided-creation-drawer.test.ts`
- Modify: `apps/workbench/app/globals.css`
- Modify: `e2e/workbench.spec.ts`

**Interfaces:**

- The drawer exposes `data-testid="guided-capability-core.audit"` and
  `data-testid="guided-capability-core.notification"` for selectable options.
- The review stage displays selected options plus the derived Graph summary.

- [x] **Step 1: Write failing component and E2E assertions**

```ts
await expect(page.getByTestId("guided-capability-core.audit")).toBeVisible();
await page.getByTestId("guided-capability-core.audit")).click();
await page.getByTestId("guided-create")).click();
await expect(page.getByText("Audit trail", { exact: true })).not.toBeVisible();
```

- [x] **Step 2: Run focused UI tests and confirm failure**

Run: `pnpm --filter @factory/workbench test -- guided-creation-drawer.test.ts`

Expected: failure because there is no capabilities stage or picker.

- [x] **Step 3: Implement the compact selection stage**

Show optional options as icon-led switch rows with support text; show required
profile capabilities as locked rows. Do not render free-form capability keys,
source, adapter configuration, or model controls.

- [x] **Step 4: Run the real browser acceptance journey**

Run: `$env:FACTORY_E2E_BASE_URL='http://127.0.0.1:15174'; pnpm exec playwright test e2e/workbench.spec.ts --reporter=line`

Expected: existing guided creation journey passes and a new audit-free Expense
Draft journey proves the persisted Draft excludes audit integration/effects.

- [x] **Step 5: Commit**

```bash
git add apps/workbench/components apps/workbench/app/globals.css e2e/workbench.spec.ts
git commit -m "feat: select profile capabilities in the Workbench"
```

### Task 4: Compile and document capability variants

**Files:**

- Modify: `packages/compiler/test/compilation-plan.test.ts`
- Create: `docs/acceptance/capability-composed-guided-creation.md`
- Modify: `docs/roadmap.md`

**Interfaces:**

- Compiler consumes the existing valid Graph unchanged; tests prove an
  audit-free Expense Graph produces deterministic generated artifacts.

- [x] **Step 1: Write a failing deterministic compiler test**

```ts
const auditFree = composeProfileDraft({
  profile: "expense-approval",
  optionalCapabilities: [],
}).graph;
expect(
  generateApplicationBundle({
    graph: auditFree,
    publishedRevisionId: "published-audit-free",
  }),
).toEqual(
  generateApplicationBundle({
    graph: auditFree,
    publishedRevisionId: "published-audit-free",
  }),
);
```

- [x] **Step 2: Run the compiler test and confirm it fails only if composition cannot compile**

Run: `pnpm --filter @factory/compiler test -- compilation-plan.test.ts`

Expected: a valid audit-free Graph compiles without audit source or missing effects.

- [x] **Step 3: Record acceptance evidence and roadmap status**

The acceptance record must state the selected profile, disabled optional
capabilities, Graph validation result, E2E command, compiler command, and that
no model call occurred.

- [x] **Step 4: Run complete verification**

Run: `pnpm test && pnpm typecheck && pnpm build && pnpm verify:third-party && pnpm verify:source-studies && git diff --check`

Expected: all workspace gates pass.

- [x] **Step 5: Commit and push**

```bash
git add packages/compiler docs
git commit -m "test: verify composed application drafts"
git push origin main
```

## Plan self-review

- The plan limits the slice to two declared optional capability transforms and
  preserves compiler behavior for every existing default profile.
- Every new interface is defined in Task 1 or Task 2 before another task uses it.
- Unit, browser, compiler, full workspace, and safety gates have explicit
  commands and expected evidence.
