# Commercial Capability Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` to execute this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four governed, reusable commercial capability packages and prove
that Restaurant Ordering and Simple Ecommerce compose them into distinct,
runnable customer and merchant experiences.

**Architecture:** Factory remains Graph-first. Each Foundation concern is a
physical Golden package with exact Graph-symbol bindings, a verified manifest,
fixtures, tests, and declared compiler contributions. The Workbench exposes
profiles as package compositions; the generic compiler assembles only a
Published Graph and immutable composition lock.

**Tech Stack:** TypeScript, pnpm/Turborepo, Zod, Next.js, NestJS, Prisma,
PostgreSQL, Casbin, BullMQ, Docker Compose, Vitest, Playwright.

## Global Constraints

- Preserve Draft -> Publish -> immutable Compilation. Never compile a Draft.
- Code, tests, UI text, and documentation are English.
- Use only exact Graph-symbol, number, or boolean composition bindings.
- Every new asset is physical, Golden, fixed-versioned, digest-verified,
  fixture-backed, contract-tested, and limited to its declared target slots.
- Do not add an external identity/payment/provider dependency or copy a
  third-party source/UI/schema/migration.
- No source, secret, URL, command, raw AI prompt, or raw AI response enters
  a Graph, lock, artifact, report, log, or test fixture.
- New migrated behavior consumes the immutable composition lock; do not add a
  profile-name/version branch. Unmigrated Restaurant behavior remains bounded.
- Run deterministic tests with fixtures. Final acceptance may make at most
  five real OpenAI calls using an environment-only key and stores no raw data.

---

## Planned file structure

| Area                                                   | Primary responsibility                                                                              |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `packages/capabilities/src/assets/core/*`              | TypeScript registrations for identity and location asset versions.                                  |
| `packages/capabilities/src/assets/commerce/*`          | TypeScript registrations for configurable lines and immutable stock movements.                      |
| `packages/capabilities/assets/*`                       | Physical manifests, adapters, templates, fixtures, and contract evidence.                           |
| `packages/capabilities/src/index.ts`                   | Profile recipes, Graph starter contributions, and exact Graph-symbol bindings.                      |
| `packages/capabilities/src/composition.ts`             | Dependency and selection validation only if new package interfaces need it.                         |
| `packages/compiler/src/commercial-runtime.ts`          | Generic, lock-derived customer/merchant command behavior.                                           |
| `packages/compiler/src/commercial-page-runtime.ts`     | Generic customer/merchant Web projections for Foundation blocks.                                    |
| `packages/compiler/src/index.ts`                       | Contribution resolution and generated artifact wiring; no profile dispatch for Foundation behavior. |
| `apps/workbench/components/workbench-home.tsx`         | Capability visibility on profile cards.                                                             |
| `apps/workbench/components/guided-creation-drawer.tsx` | Dependency-aware capability review before Draft creation.                                           |
| `docs/acceptance/commercial-capability-foundation.md`  | Redacted deterministic, Node 22, and guarded live-model evidence.                                   |

## Task 1: Freeze capability contracts and physical package verification

**Files:**

- Create: `packages/capabilities/src/assets/core/identity-context-v1-0-0.ts`
- Create: `packages/capabilities/src/assets/core/location-context-v1-0-0.ts`
- Create: `packages/capabilities/src/assets/commerce/line-configuration-v1-0-0.ts`
- Create: `packages/capabilities/src/assets/commerce/inventory-ledger-v1-0-0.ts`
- Create: `packages/capabilities/assets/core.identity-context/1.0.0/**`
- Create: `packages/capabilities/assets/core.location-context/1.0.0/**`
- Create: `packages/capabilities/assets/commerce.line-configuration/1.0.0/**`
- Create: `packages/capabilities/assets/commerce.inventory-ledger/1.0.0/**`
- Modify: `packages/capabilities/src/assets/contract.ts`
- Modify: `packages/capabilities/src/assets/index.ts`
- Modify: `packages/capabilities/src/node.ts`
- Modify: `packages/capabilities/test/capability-registry.test.ts`
- Test: `packages/capabilities/test/commercial-capability-assets.test.ts`
- Modify: `apps/control-plane/src/lifecycle.service.ts`
- Modify: `apps/control-plane/test/lifecycle.service.test.ts`

**Consumes:** accepted `factory.capability/v1` and immutable
`factory.composition/v1` contracts.

**Produces:** four registered Golden assets with exact dependencies:

```ts
"core.identity-context" -> provides "core.principal-context@v1"
"core.location-context" -> provides "core.location-context@v1"
"commerce.line-configuration" -> requires catalog-item and location-context
"commerce.inventory-ledger" -> requires catalog-item, order-event, location-context
```

- [ ] **Step 1: Write failing physical-package and interface tests**

```ts
it("resolves a complete commercial foundation in deterministic dependency order", () => {
  expect(
    resolveCapabilityComposition({ selections: foundationSelections }),
  ).toMatchObject({
    resolvedDependencyOrder: [
      "commerce.catalog",
      "core.identity-context",
      "core.location-context",
      "commerce.line-configuration",
      "commerce.inventory-ledger",
    ],
  });
});

it("rejects a line configuration without its location-context provider", () => {
  expect(() =>
    resolveCapabilityComposition({ selections: withoutLocation }),
  ).toThrow("commerce.line-configuration");
});

it("rejects Foundation evidence with bytes that do not match its digest", () => {
  expect(() =>
    createVerifiedCapabilityCompositionLock(
      tamperedEvidenceInput,
      repositoryRoot,
    ),
  ).toThrow("verification evidence digest");
});
```

- [ ] **Step 2: Run the focused test and record the expected failure**

Run: `pnpm --filter @factory/capabilities test -- --run test/commercial-capability-assets.test.ts`

Expected: FAIL because the Foundation packages are not registered.

- [ ] **Step 3: Add manifests, assets, and physical verification evidence**

Each physical package contains `component.json`, `adapter.json`, a safe
package-local template, a fixture, and a contract test. Its TypeScript manifest
uses only Graph-symbol parameters, exactly declared output slots, fixed
digests, and verification paths. Register the assets in current assets without
changing any historical asset identity.

For these four Foundation packages, `verification` also records the SHA-256
digest of the exact fixture bytes and contract-evidence bytes. The server-only
Node verifier reads both regular files within the verified package root,
compares their exact bytes with the declared digests, and parses both as JSON.
Malformed JSON, a digest mismatch, a symlink, a missing file, or a package-root
escape rejects the package. This Foundation-only addition does not reinterpret
or silently upgrade historical package identities.

- [ ] **Step 4: Repair the verified Publish lock boundary**

Export a server-only verified composition-lock factory from
`packages/capabilities/src/node.ts`. It must resolve every selected registry
identity, verify the physical package plus Foundation fixture/contract evidence,
and only then delegate to the existing pure composition-lock factory. Keep
Node filesystem imports out of browser-compatible `composition.ts`; do not
loosen or replace the pure factory.

`apps/control-plane/src/lifecycle.service.ts` must call the verified Node
factory before persisting a Published revision's immutable lock. Add an actual
Publish-path test that changes one selected physical package or evidence file
and proves Publish rejects without persisting a Published revision or lock.
Also retain a direct verified-factory tamper test so the boundary is proven
below and through the lifecycle service.

- [ ] **Step 5: Run focused, lifecycle, and registry verification**

Run:

```text
pnpm --filter @factory/capabilities test -- --run test/commercial-capability-assets.test.ts test/capability-registry.test.ts test/composition-contract.test.ts
pnpm --filter @factory/capabilities typecheck
pnpm --filter @factory/control-plane test -- --run test/lifecycle.service.test.ts
pnpm --filter @factory/control-plane typecheck
```

Expected: all selected tests and typecheck pass; missing-provider and tampered
package/evidence cases reject before a composition lock is produced, and the
actual Publish path persists neither a Published revision nor a lock after
physical tampering.

- [ ] **Step 6: Commit the bounded contract slice**

```text
git add packages/capabilities apps/control-plane/src/lifecycle.service.ts apps/control-plane/test/lifecycle.service.test.ts
git commit -m "feat: add commercial foundation capability contracts"
```

## Task 2: Compose Foundation Graph recipes for Restaurant and Ecommerce

**Files:**

- Modify: `packages/capabilities/src/index.ts`
- Modify: `packages/capabilities/src/restaurant/profile.ts`
- Modify: `packages/capabilities/test/restaurant-profile.test.ts`
- Create: `packages/capabilities/test/commercial-profile-composition.test.ts`

**Consumes:** Task 1 asset identities and interfaces.

**Produces:** Restaurant and Ecommerce base Graph recipes with the same four
Foundation locks but different Graph-symbol bindings, entities, pages, labels,
roles, and fixtures.

- [ ] **Step 1: Write failing profile-composition tests**

```ts
it("uses the same Foundation identities with different Restaurant and Ecommerce bindings", () => {
  const restaurant = composeDefaultCapabilityDraft({
    profile: "restaurant-ordering",
  });
  const ecommerce = composeDefaultCapabilityDraft({
    profile: "simple-ecommerce",
  });
  expect(lockKeys(restaurant)).toEqual(lockKeys(ecommerce));
  expect(restaurant.graph.domain.entities).toContainEqual(
    expect.objectContaining({ key: "menu-option-group" }),
  );
  expect(ecommerce.graph.domain.entities).toContainEqual(
    expect.objectContaining({ key: "product-option-group" }),
  );
});

it("rejects a Foundation binding that references no declared Graph symbol", () => {
  expect(() => composeCapabilityDraft(invalidFoundationSelection)).toThrow(
    "graph.domain.missing",
  );
});
```

- [ ] **Step 2: Run the focused test and observe RED**

Run: `pnpm --filter @factory/capabilities test -- --run test/commercial-profile-composition.test.ts`

Expected: FAIL because starter Graphs and recipes have no Foundation bindings.

- [ ] **Step 3: Add additive Graph recipe contributions**

Restaurant adds declared location/table context, option-group/option/line
selection, and stock movement entities/pages/roles. Ecommerce uses product,
store, shopper, and merchant symbols. Do not put literal labels in composition
bindings or clone the legacy profile fixture in the active path.

- [ ] **Step 4: Verify canonical recipe behavior**

Run:

```text
pnpm --filter @factory/capabilities test -- --run test/commercial-profile-composition.test.ts test/restaurant-profile.test.ts test/composition-contract.test.ts
pnpm --filter @factory/capabilities typecheck
```

Expected: both profiles have canonical nonempty locks, matching common package
identities, distinct bindings, and fail-closed invalid symbols.

- [ ] **Step 5: Commit the recipe slice**

```text
git add packages/capabilities/src packages/capabilities/test
git commit -m "feat: compose commercial foundation profiles"
```

## Task 3: Generate generic context, configured-line, and stock-ledger runtime

**Files:**

- Create: `packages/compiler/src/commercial-runtime.ts`
- Create: `packages/compiler/src/commercial-page-runtime.ts`
- Modify: `packages/compiler/src/index.ts`
- Create: `packages/compiler/test/commercial-runtime.test.ts`
- Modify: `packages/compiler/test/composition-compilation.test.ts`
- Modify: `packages/compiler/test/compilation-plan.test.ts`

**Consumes:** Task 2 Published Graph and immutable composition lock.

**Produces:** lock-derived generic API and Web contributions for context
resolution, option validation/pricing, and transactional stock movements.

- [ ] **Step 1: Write failing compiler and generated-runtime tests**

```ts
it("rejects an unavailable option before a configured line is persisted", async () => {
  const runtime = await createCommercialRuntime(restaurantPublishedInput);
  await expect(
    runtime.addConfiguredLine(customerContext, unavailableOption),
  ).rejects.toThrow("unavailable");
  await expect(runtime.listLines(customerContext)).resolves.toEqual([]);
});

it("writes one idempotent stock movement with a server-computed configured price", async () => {
  const result = await runtime.addConfiguredLine(
    customerContext,
    validSelection,
  );
  expect(result.total).toBe("14.50");
  await runtime.reserveOrder(validOrder);
  expect(await runtime.stockMovements()).toEqual([
    expect.objectContaining({ kind: "reserve", orderId: validOrder.id }),
  ]);
});
```

- [ ] **Step 2: Run focused compiler tests and observe RED**

Run: `pnpm --filter @factory/compiler test -- --run test/commercial-runtime.test.ts`

Expected: FAIL because no generic commercial runtime contribution exists.

- [ ] **Step 3: Implement lock-derived runtime contributions**

Resolve only declared Foundation contribution digests from the immutable lock.
Validate principal/location context before each command. Enforce option
ownership, availability, cardinality, safe decimal deltas, expected order
version, role permissions, idempotency, atomic inventory movement, and audit
facts. Emit safe projections only. Never consume Graph `assetLocks`, a profile
name, runtime source path, or literal composition strings to select behavior.

- [ ] **Step 4: Add generic customer and merchant page projections**

Generate customer context/manual-table entry and option controls plus merchant
option availability and ledger actions from declared blocks/bindings. Only
allow declared API operations and route keys. Preserve existing unmigrated
Restaurant runtime behavior until a later migration task owns it.

- [ ] **Step 5: Verify compiler output and fail-closed cases**

Run:

```text
pnpm --filter @factory/compiler test -- --run test/commercial-runtime.test.ts test/composition-compilation.test.ts test/compilation-plan.test.ts
pnpm --filter @factory/compiler typecheck
pnpm --filter @factory/compiler lint
```

Expected: invalid contexts/options/stock commands fail without state mutation;
Restaurant and Ecommerce output differs only through valid Graph bindings.

- [ ] **Step 6: Commit generic compiler behavior**

```text
git add packages/compiler
git commit -m "feat: compile commercial foundation runtime"
```

## Task 4: Expose composition value on Workbench Home and creation review

**Files:**

- Modify: `apps/workbench/components/workbench-home.tsx`
- Modify: `apps/workbench/components/guided-creation-drawer.tsx`
- Modify: `apps/workbench/components/workbench-home.test.tsx`
- Modify: `apps/workbench/components/guided-creation-drawer.test.tsx`
- Create: `apps/workbench/lib/commercial-foundation-summary.ts`
- Create: `apps/workbench/lib/commercial-foundation-summary.test.ts`

**Consumes:** Task 2 profile composition metadata.

**Produces:** a concise visual summary of package identity, lifecycle,
dependency readiness, customer/merchant surfaces, and blocked combinations
before a Draft is created.

- [ ] **Step 1: Write failing Workbench component tests**

```tsx
it("shows Restaurant customer and merchant Foundation surfaces before Draft creation", () => {
  render(<WorkbenchHome applications={[]} loading={false} ... />);
  expect(screen.getByText("Configured ordering")).toBeVisible();
  expect(screen.getByText("Merchant inventory ledger")).toBeVisible();
});

it("shows an unresolved package dependency as blocked and does not create a Draft", () => {
  render(<GuidedCreationDrawer profile={invalidProfile} ... />);
  expect(screen.getByText(/requires core.location-context/i)).toBeVisible();
  expect(screen.getByTestId("guided-create")).toBeDisabled();
});
```

- [ ] **Step 2: Run focused Workbench tests and observe RED**

Run: `pnpm --filter @factory/workbench test -- --run components/workbench-home.test.tsx components/guided-creation-drawer.test.tsx lib/commercial-foundation-summary.test.ts`

Expected: FAIL because the Foundation summary and blocked state do not exist.

- [ ] **Step 3: Implement data-derived composition summaries**

Render package labels, fixed versions, dependency readiness, and surfaces from
the registry only. Use concise English labels and existing light/dark tokens.
The Home must not load external repositories, offer a false "installed"
status, mutate a Draft, or replace the established publication lifecycle.

- [ ] **Step 4: Verify accessibility and type safety**

Run:

```text
pnpm --filter @factory/workbench test -- --run components/workbench-home.test.tsx components/guided-creation-drawer.test.tsx lib/commercial-foundation-summary.test.ts
pnpm --filter @factory/workbench typecheck
pnpm --filter @factory/workbench lint
```

Expected: package and dependency state is visible before Draft creation,
unresolved recipes cannot continue, and current profile creation stays intact.

- [ ] **Step 5: Commit the Workbench slice**

```text
git add apps/workbench
git commit -m "feat: show commercial foundation profile composition"
```

## Task 5: Prove end-to-end profile acceptance and evidence boundaries

**Files:**

- Create: `docs/acceptance/commercial-capability-foundation.md`
- Modify: `docs/audits/restaurant-ordering-requirements-audit.md`
- Modify: `docs/project-status.md`
- Create: `packages/compiler/test/commercial-generated-journey.test.ts`
- Create: `apps/compiler-worker/test/commercial-foundation-lifecycle.test.ts`

**Consumes:** Tasks 1-4.

**Produces:** deterministic, isolated Node 22, and guarded live-model release
evidence for the Foundation, with explicit known gaps retained in the audit.

- [ ] **Step 1: Write failing cross-profile journey and Worker lifecycle tests**

```ts
it("runs Restaurant customer context, configured-order, merchant option, and stock journeys", async () => {
  const result = await runGeneratedJourney(restaurantPublishedRevision);
  expect(result.steps).toEqual([
    "resolve-manual-table",
    "select-options",
    "submit-order",
    "merchant-adjust-availability",
    "inspect-stock-ledger",
  ]);
});

it("runs the same Foundation locks for an Ecommerce configured-product journey", async () => {
  expect(await runGeneratedJourney(ecommercePublishedRevision)).toMatchObject({
    passed: true,
  });
});
```

- [ ] **Step 2: Run focused tests and observe RED**

Run:

```text
pnpm --filter @factory/compiler test -- --run test/commercial-generated-journey.test.ts
pnpm --filter @factory/compiler-worker test -- --run test/commercial-foundation-lifecycle.test.ts
```

Expected: FAIL until Tasks 1-4 compile executable Foundation behavior.

- [ ] **Step 3: Complete deterministic and isolated Node 22 evidence**

Run all package, graph, compiler, Workbench, Control Plane, and Worker tests;
then generate one Restaurant and one Ecommerce Published revision into isolated
Compose project names/loopback ports. Verify migrations, API health, Web,
customer and merchant journeys, artifacts, stopped state, and exact
label-scoped containers/networks/volumes/runtime-directory cleanup. Do not
touch existing Docker projects.

- [ ] **Step 4: Run a guarded real-model Graph-Diff acceptance probe**

If a local `OPENAI_API_KEY` exists, make at most five real calls through the
existing provider boundary. Give a bounded Restaurant requirement and verify
that only schema-valid Draft Graph Diffs are accepted; rejected output cannot
select package paths, URLs, source, or arbitrary code. Record only call count,
model identifier, outcome, and redacted immutable artifact digests. Persist no
key, prompt, response, or screenshots containing them. If no local key exists,
mark this exact gate unavailable rather than substituting fixtures.

- [ ] **Step 5: Update evidence and commit release materials**

Document every command, result, exact cleanup scope, release limitations, and
remaining point-of-sale gaps. Do not call a provider, real payment, cloud, or
identity test a passed capability merely because a fixture passes.

```text
git add docs packages/compiler apps/compiler-worker
git commit -m "test: accept commercial capability foundation"
```

## Plan self-review

- **Coverage:** Tasks 1-2 create four real capability assets and profile
  bindings. Task 3 compiles their generated behavior. Task 4 exposes the
  capability inventory in the Workbench. Task 5 proves deterministic,
  generated-runtime, cleanup, and guarded real-model evidence.
- **Dependencies:** Task 2 consumes Task 1 asset identities; Task 3 consumes
  Task 2 canonical published inputs; Task 4 consumes Task 2 metadata; Task 5
  consumes all prior output. Tasks 3 and 4 may run in parallel only after Task
  2's contract is accepted, because they own disjoint compiler and Workbench
  paths.
- **No placeholders:** every task names exact responsibilities, acceptance
  boundaries, focused RED command, GREEN command, and commit scope.
- **Scope:** payment, real identity, delivery, loyalty, reservation, realtime,
  printing, offline, cloud, and new vertical profiles are deliberately not
  smuggled into this Foundation.
