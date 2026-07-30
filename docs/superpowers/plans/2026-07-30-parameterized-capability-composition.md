# Parameterized Capability Composition v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development`
> (recommended) or `executing-plans` to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace copied starter Graphs and compiler-owned profile behavior with
verified, parameterized capability packages that compose an immutable Graph and
independent runnable artifacts.

**Architecture:** A capability package declares typed parameters, typed
requirements/provides, additive Graph contributions, and digest-verified
target contributions. The Control Plane resolves and stores a canonical
`factory.composition/v1` lock only during Publish. The compiler reads that
immutable lock and uses generic contribution loaders; it never branches on a
profile name to locate migrated behavior.

**Tech Stack:** TypeScript, Zod, NestJS, Prisma/PostgreSQL, pnpm/Turborepo,
Vitest, Node 22 generated runtimes.

## Global Constraints

- The Factory Application Graph remains the only product source of truth.
- Preserve `Draft -> Publish -> immutable Compilation`; compilers never read a
  mutable Draft.
- Package contents must remain physical, versioned, digest-verified Golden
  assets beneath `packages/capabilities/assets/<key>/<version>/`.
- A package binding may contain only declared scalar values or declared Graph
  symbols. It must not contain paths, URLs, executable code, secrets, commands,
  or undeclared Graph mutations.
- All target writes are package-relative, output-slot constrained, deterministic,
  collision-checked, and fail closed.
- Generated application acceptance remains Node 22 and isolated Compose only.
- No third-party source is copied or added as a dependency in this slice.
- Code, tests, UI text, and documentation remain English.

---

## File structure and migration boundary

| Path | Responsibility |
| --- | --- |
| `packages/capabilities/src/assets/contract.ts` | The v1 package manifest, parameter, interface, Graph, and executable contribution contracts. |
| `packages/capabilities/src/composition.ts` | Canonical parameter encoding, requirements resolution, contribution ordering, immutable lock creation, and fail-closed validation. |
| `packages/capabilities/src/node.ts` | Physical package verification and safe, digest-verified contribution loading. |
| `packages/capabilities/src/index.ts` | Browser-safe registry, generic recipe entry points, and migration of profile helpers to the generic resolver. |
| `packages/graph/src/model.ts` | Schema validation for a Draft's capability selections and bindings, while keeping the Published composition lock outside mutable Graph state. |
| `apps/control-plane/prisma/schema.prisma` | Immutable composition lock and lock hash on `PublishedRevision`. |
| `apps/control-plane/prisma/migrations/20260730_add_composition_lock/migration.sql` | Additive database migration for the new immutable fields. |
| `apps/control-plane/src/lifecycle.service.ts` | Validate Draft selections, create the lock atomically at Publish, and pass it to compilation. |
| `packages/compiler/src/index.ts` | Generic target-contribution resolver, deterministic lock artifact, and removal of migrated package version/profile dispatch. |
| `packages/capabilities/assets/core.*` and `packages/capabilities/assets/commerce.*` | First shared package contributions used by both Restaurant and Ecommerce. |
| `packages/capabilities/test/composition-contract.test.ts` | Composition resolver, canonical lock, collision, dependency, and invalid-binding evidence. |
| `packages/compiler/test/composition-compilation.test.ts` | Generic compilation proof and same-package/different-binding artifact proof. |
| `apps/control-plane/test/lifecycle.service.test.ts` | Publish-only lock persistence and immutable compilation input proof. |

Current `profileGraphs` remain read-only migration fixtures until Task 4 proves
the generic recipes. `restaurant-runtime.ts`, `restaurant-page-runtime.ts`, and
`restaurant-merchant-runtime.ts` are not expanded by this plan. Their behavior
is migrated package-by-package in the later Restaurant-fork-removal slice.

### Task 1: Add the composition contract and canonical immutable lock

**Files:**
- Modify: `packages/capabilities/src/assets/contract.ts`
- Create: `packages/capabilities/src/composition.ts`
- Modify: `packages/capabilities/src/assets/index.ts`
- Modify: `packages/capabilities/src/index.ts`
- Create: `packages/capabilities/test/composition-contract.test.ts`

**Interfaces:**
- Consumes: existing `CapabilityAssetManifestV1`, `CapabilityAssetLockV1`, and
  `ApplicationGraphV1`.
- Produces: `CapabilityParameterSchemaV1`, `CapabilityGraphContributionV1`,
  `CapabilityExecutableContributionV1`, `CapabilityRequirementV1`,
  `CapabilityProvideV1`, `CapabilitySelectionV1`, `CapabilityCompositionV1`,
  `resolveCapabilityComposition(input)`, and
  `createCapabilityCompositionLock(input)`.

- [ ] **Step 1: Write focused failing lock and binding tests**

```ts
it("creates the same lock for the same selections in a different input order", () => {
  const lock = createCapabilityCompositionLock({
    graphChecksum: "sha256:" + "a".repeat(64),
    selections: [cartSelection, catalogSelection],
  });
  const reordered = createCapabilityCompositionLock({
    graphChecksum: "sha256:" + "a".repeat(64),
    selections: [catalogSelection, cartSelection],
  });
  expect(lock).toEqual(reordered);
});

it("rejects an undeclared parameter and an unsafe string parameter", () => {
  expect(() => resolveCapabilityComposition({ selections: [unsafeSelection] }))
    .toThrow("does not declare parameter");
  expect(() => resolveCapabilityComposition({ selections: [pathSelection] }))
    .toThrow("must not contain a path");
});
```

- [ ] **Step 2: Run the focused test to prove the contract is absent**

Run: `pnpm --filter @factory/capabilities test -- --run test/composition-contract.test.ts`

Expected: FAIL because `createCapabilityCompositionLock` and
`resolveCapabilityComposition` are not exported.

- [ ] **Step 3: Define the exact v1 manifest types and resolver**

```ts
export type CapabilityBindingValueV1 = string | number | boolean | {
  readonly graphSymbol: string;
};

export interface CapabilitySelectionV1 {
  readonly lock: CapabilityAssetLockV1;
  readonly bindings: Readonly<Record<string, CapabilityBindingValueV1>>;
}

export interface CapabilityCompositionLockV1 {
  readonly apiVersion: "factory.composition/v1";
  readonly applicationGraphChecksum: string;
  readonly packages: readonly CapabilitySelectionV1[];
  readonly resolvedContributionDigests: readonly string[];
  readonly providedAndRequiredInterfaces: readonly string[];
  readonly targetRuntimeInterfaceVersions: readonly string[];
  readonly resolvedDependencyOrder: readonly string[];
  readonly lockDigest: string;
}
```

Implement a recursively key-sorted canonical JSON encoder. Validate parameter
names against `manifest.parameters`; reject values that are not the declared
primitive type, symbols outside `graph.<model>.<id>`, strings containing path
separators, URL schemes, control characters, or source delimiters. Resolve
requirements by `(interfaceKey, version)` and reject zero providers, multiple
providers without `multiProvider: true`, cycles, and duplicate package keys.

- [ ] **Step 4: Run the focused contract tests**

Run: `pnpm --filter @factory/capabilities test -- --run test/composition-contract.test.ts`

Expected: PASS with coverage for stable ordering, undeclared/unsafe/incorrect
bindings, missing provider, duplicate provider, dependency cycle, and lock
digest mismatch.

- [ ] **Step 5: Commit the contract slice**

```bash
git add packages/capabilities/src/assets/contract.ts \
  packages/capabilities/src/assets/index.ts \
  packages/capabilities/src/composition.ts \
  packages/capabilities/src/index.ts \
  packages/capabilities/test/composition-contract.test.ts
git commit -m "feat: add parameterized capability composition contract"
```

### Task 2: Verify physical Graph and target contributions fail closed

**Files:**
- Modify: `packages/capabilities/src/node.ts`
- Modify: `packages/capabilities/test/capability-registry.test.ts`
- Modify: `packages/capabilities/src/assets/core/crud-v1-0-1.ts`
- Modify: `packages/capabilities/assets/core.crud/1.0.1/component.json`
- Modify: `packages/capabilities/assets/core.crud/1.0.1/adapter.json`
- Create: `packages/capabilities/assets/core.crud/1.0.1/templates/web/crud-route.tsx.tpl`
- Create: `packages/capabilities/assets/core.crud/1.0.1/templates/database/crud-schema.prisma.tpl`

**Interfaces:**
- Consumes: Task 1 manifest contracts.
- Produces: `loadCapabilityAssetContributions(asset, root)`, returning only
  digest-verified contributions with `assetKey`, `assetVersion`, safe namespace,
  slot, target, content, and declared runtime interface version.

- [ ] **Step 1: Write failing package verification tests for multiple slots**

```ts
it("loads declared web and database contributions only inside their slots", () => {
  const contributions = loadCapabilityAssetContributions(crudAssetV1_0_1, root);
  expect(contributions.map(({ outputSlot }) => outputSlot)).toEqual(
    expect.arrayContaining(["web.route", "database.schema"]),
  );
});

it("rejects a route contribution that writes into another package namespace", () => {
  expect(() => loadCapabilityAssetContributions(unsafeAsset, root))
    .toThrow("outside declared namespace");
});
```

- [ ] **Step 2: Run the focused registry tests to prove failure**

Run: `pnpm --filter @factory/capabilities test -- --run test/capability-registry.test.ts`

Expected: FAIL because the current verifier allows only `api.runtime` template
prefixes and cannot load `web.route` or `database.schema`.

- [ ] **Step 3: Implement slot-specific safe namespace verification**

Replace `templateTargetPrefixes` with a complete immutable map:

```ts
const targetPrefixes = {
  "web.component": ["web/src/components/"],
  "web.route": ["web/src/app/"],
  "web.navigation": ["web/src/navigation/"],
  "api.router": ["api/src/routes/"],
  "api.service": ["api/src/services/"],
  "database.schema": ["database/prisma/fragments/"],
  "database.migration": ["database/prisma/migrations/"],
  "flow.handler": ["api/src/flows/handlers/"],
  "policy.rule": ["api/policy/fragments/"],
  "test.fixture": ["api/test/fixtures/"],
  "test.journey": ["api/test/journeys/"],
  "docs.section": ["docs/generated/"],
} as const;
```

Require a template's `namespace` to start with
`packages/<asset-key>/` in the generated contribution map and forbid target
duplicates within one package. Verify every declared Graph contribution refers
only to a declared parameter and an allowed additive collection.

- [ ] **Step 4: Run registry, typecheck, and formatting verification**

Run: `pnpm --filter @factory/capabilities test -- --run test/capability-registry.test.ts`

Expected: PASS, including digest tampering, unsafe source/target, missing
fixture/test, undeclared slot, namespace escape, duplicate target, and Graph
contribution parameter checks.

Run: `pnpm --filter @factory/capabilities typecheck`

Expected: PASS.

- [ ] **Step 5: Commit physical verification and the first multi-slot asset**

```bash
git add packages/capabilities/src/node.ts \
  packages/capabilities/src/assets/core/crud-v1-0-1.ts \
  packages/capabilities/test/capability-registry.test.ts \
  packages/capabilities/assets/core.crud/1.0.1
git commit -m "feat: verify multi-target capability contributions"
```

### Task 3: Publish and compile an immutable composition lock

**Files:**
- Modify: `packages/graph/src/model.ts`
- Modify: `packages/graph/test/application-graph.test.ts`
- Modify: `apps/control-plane/prisma/schema.prisma`
- Create: `apps/control-plane/prisma/migrations/20260730_add_composition_lock/migration.sql`
- Modify: `apps/control-plane/src/lifecycle.service.ts`
- Modify: `apps/control-plane/test/lifecycle.service.test.ts`
- Modify: `apps/control-plane/src/compilation-queue.ts`
- Modify: `apps/control-plane/test/compilation-queue.test.ts`
- Modify: `apps/compiler-worker/src/queued-compilation.ts`
- Modify: `apps/compiler-worker/src/compilation-executor.ts`
- Modify: `apps/compiler-worker/test/compilation-executor.test.ts`
- Modify: `packages/compiler/src/index.ts`
- Create: `packages/compiler/test/composition-compilation.test.ts`
- Modify: `packages/compiler/test/compilation-plan.test.ts`
- Modify: `packages/compiler/test/profile-compilation.test.ts`
- Modify: `packages/compiler/test/restaurant-runtime.test.ts`
- Modify: `packages/compiler/test/restaurant-page-runtime.test.ts`
- Modify: `packages/compiler/test/restaurant-merchant-runtime.test.ts`
- Modify: `packages/capabilities/test/restaurant-profile.test.ts`

**Interfaces:**
- Consumes: `CapabilityCompositionLockV1` from Task 1 and contribution loader
  from Task 2.
- Produces: Draft `integration.compositionSelections`; non-null
  `PublishedRevision.compositionLock` and
  `compositionLockHash`; `PublishedGraphInput.compositionLock`; generated
  `composition-lock.json`; and `resolveTargetContributions(input)`.

- [ ] **Step 1: Write failing Publish lifecycle tests**

```ts
it("accepts only a Draft selection with a full Golden identity and typed bindings", () => {
  expect(() => parseApplicationGraph({
    ...graph,
    integration: {
      ...graph.integration,
      compositionSelections: [{
        lock: validLock,
        bindings: { routeKey: "catalog", enabled: true },
      }],
    },
  })).not.toThrow();
  expect(() => parseApplicationGraph({
    ...graph,
    integration: {
      ...graph.integration,
      compositionSelections: [{ lock: validLock, bindings: { sourcePath: "x" } }],
    },
  })).toThrow();
});

it("stores a composition lock only when a validated Draft is published", async () => {
  const published = await service.publishLocalApplicationGraph("store");
  expect(published.compositionLock.apiVersion).toBe("factory.composition/v1");
  expect(published.compositionLockHash).toMatch(/^sha256:[a-f0-9]{64}$/);
});

it("does not let compilation replace a persisted composition lock", async () => {
  await expect(service.queueCompilation(published.id, tamperedLock))
    .rejects.toThrow("composition lock does not match");
});
```

- [ ] **Step 2: Run the lifecycle test to prove it fails**

Run: `pnpm --filter @factory/control-plane test -- --run test/lifecycle.service.test.ts`

Expected: FAIL because Draft Graphs have no typed capability selections,
`PublishedRevision` has no lock fields, and the compiler input does not receive
a composition lock.

- [ ] **Step 3: Persist and enforce the immutable lock**

Add nullable `compositionLock Json?` and `compositionLockHash String?` to
`PublishedRevision`, with the SQL migration:

```sql
ALTER TABLE "PublishedRevision"
  ADD COLUMN "compositionLock" JSONB,
  ADD COLUMN "compositionLockHash" TEXT;
```

Add optional Draft-only `integration.compositionSelections`, each with exactly
the five Golden identity fields and a binding object containing strings,
finite numbers, booleans, or an exact `{ graphSymbol }` object. Reject unknown
selection/lock/binding object fields at Graph parsing time. The capability
registry remains responsible for validating that selections match Golden
manifests and declared package parameters.

Do not backfill existing immutable rows: they remain view-only historical
evidence and are rejected by the new composition compiler with a bounded
`Published revision has no composition lock.` error. At Publish, construct the
lock from the parsed Draft Graph selections inside the same Prisma transaction
that creates `PublishedRevision`. For an existing Draft that has exact
`assetLocks` but no selections, create an in-memory zero-binding selection only
when every selected manifest declares no required parameter; the resulting
Published snapshot contains the new composition lock and does not mutate its
source Draft. At compilation queue time, read the stored lock with the
Published revision and verify its digest independently before enqueueing. Do
not accept a lock in an HTTP request.

Update `PublishedGraphInput` so the compiler requires:

```ts
export interface PublishedGraphInput {
  readonly publishedRevisionId: string;
  readonly graph: ApplicationGraphV1;
  readonly compositionLock: CapabilityCompositionLockV1;
}
```

- [ ] **Step 4: Make the compiler emit generic lock and target evidence**

Add `resolveTargetContributions(input)` alongside the existing renderer first.
It must verify every contribution digest, interface version, dependency order,
safe namespace, and cross-package target collision before rendering. Emit
`composition-lock.json` from the persisted lock. Preserve generic Graph
renderers for Prisma, Casbin, XState, API tests, documentation, simulator, and
web base files; only package contributions add their declared slots. Do not
remove `resolveGeneratedRuntimeMode` or Restaurant dispatch until Task 4 has
migrated the shared commerce assets and proved equivalent generic target
contributions.

Write compiler tests for an exact persisted lock, a tampered lock digest,
duplicate `web.route` target, contribution order determinism, and a package
attempt to write `docker-compose.yml`.

- [ ] **Step 5: Run focused verification and commit**

Run: `pnpm --filter @factory/control-plane test -- --run test/lifecycle.service.test.ts`

Expected: PASS.

Run: `pnpm --filter @factory/compiler test -- --run test/composition-compilation.test.ts`

Expected: PASS.

```bash
git add packages/graph apps/control-plane apps/compiler-worker packages/compiler \
  packages/capabilities/test/restaurant-profile.test.ts
git commit -m "feat: compile immutable capability composition locks"
```

### Task 4: Prove shared-commerce composition with different bindings

**Files:**
- Modify: `packages/capabilities/src/index.ts`
- Modify: `packages/capabilities/assets/commerce.catalog/1.0.0/component.json`
- Modify: `packages/capabilities/assets/commerce.cart/1.0.0/component.json`
- Modify: `packages/capabilities/assets/commerce.inventory/1.0.1/component.json`
- Modify: `packages/capabilities/assets/commerce.order/1.0.0/component.json`
- Modify: `packages/capabilities/assets/commerce.simulated-payment/1.0.1/component.json`
- Modify: corresponding `adapter.json`, `fixtures`, `tests`, and template
  digests for every changed physical package.
- Modify: `packages/capabilities/test/capability-registry.test.ts`
- Modify: `packages/compiler/test/composition-compilation.test.ts`

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: `composeCapabilityDraft({ recipe, metadata, bindings })`, where
  Restaurant and Ecommerce recipes select the same `core.*` and `commerce.*`
  package key/version/digest list while retaining different route, entity,
  label, role, and experience bindings.

- [ ] **Step 1: Write the cross-profile failing proof**

```ts
it("locks shared commerce packages at identical versions for Restaurant and Ecommerce", () => {
  const restaurant = composeCapabilityDraft(restaurantRecipe);
  const ecommerce = composeCapabilityDraft(ecommerceRecipe);
  expect(sharedLocks(restaurant.lock)).toEqual(sharedLocks(ecommerce.lock));
  expect(restaurant.lock.canonicalParameters).not.toEqual(
    ecommerce.lock.canonicalParameters,
  );
});

it("compiles different routes and schemas from the same shared package versions", () => {
  expect(restaurantBundle.files).toContainEqual(expect.objectContaining({ path: "web/src/app/menu/page.tsx" }));
  expect(ecommerceBundle.files).toContainEqual(expect.objectContaining({ path: "web/src/app/catalog/page.tsx" }));
});
```

- [ ] **Step 2: Run the focused proof to establish the old starter-Graph limitation**

Run: `pnpm --filter @factory/capabilities test -- --run test/capability-registry.test.ts`

Expected: FAIL because `composeProfileDraft` clones profile-specific whole
Graphs instead of resolving package-contributed Graph fragments and bindings.

- [ ] **Step 3: Add shared package parameters and additive contributions**

For the first proof, each shared package declares `entityKey`, `entityLabel`,
`routeKey`, `routePath`, `roleKey`, and domain-specific field/flow symbols it
uses. Restaurant binds `menu-item`, `/menu`, `customer`; Ecommerce binds
`product`, `/catalog`, `shopper`. Catalog provides `commerce.catalog-item/v1`;
cart requires it and provides `commerce.cart/v1`; order requires the cart;
inventory and simulated payment require the order event surface. Use additive
Graph contributions to create entities, routes, permissions, flow effects,
fixtures, and role journeys. Regenerate every changed manifest and template
digest from package content; never alter a digest manually.

- [ ] **Step 4: Route current profile convenience through the generic resolver**

Keep the Workbench’s three profile choices, but make each choice a declared
recipe that invokes `composeCapabilityDraft`; it must not clone a full Graph.
Retain `profileGraphs` only as frozen expected-output fixtures until their
equivalence tests pass. Remove profile membership as a package admission rule;
use requirement/provide compatibility and recipe eligibility instead.

- [ ] **Step 5: Verify identical locks, independent outputs, and commit**

Run: `pnpm --filter @factory/capabilities test -- --run test/capability-registry.test.ts test/composition-contract.test.ts`

Expected: PASS.

Run: `pnpm --filter @factory/compiler test -- --run test/composition-compilation.test.ts`

Expected: PASS with identical shared lock identities and different generated
Restaurant/Ecommerce schema, routes, page labels, fixtures, and journeys.

```bash
git add packages/capabilities packages/compiler/test/composition-compilation.test.ts
git commit -m "feat: compose shared commerce packages with bindings"
```

### Task 5: Release-gate the composition proof and retire migrated dispatch

**Files:**
- Modify: `packages/compiler/src/index.ts`
- Modify: `packages/compiler/test/compilation-plan.test.ts`
- Modify: `apps/compiler-worker/test/compilation-executor.test.ts`
- Modify: `docs/acceptance/restaurant-ordering-mvp.md`
- Create: `docs/acceptance/parameterized-capability-composition.md`
- Modify: `docs/project-status.md`

**Interfaces:**
- Consumes: fully published locks and generic compiler outputs from Tasks 1–4.
- Produces: an immutable evidence record proving that the two profiles use the
same shared package identities and run as isolated generated applications.

- [ ] **Step 1: Write compiler and Worker negative tests for profile dispatch**

```ts
it("does not select a migrated target contribution from compositionProfile", () => {
  expect(() => generateApplicationBundle({
    publishedRevisionId: "published-1",
    graph: graphWithUnknownProfile,
    compositionLock,
  })).not.toThrow();
});

it("refuses a Worker job whose persisted composition-lock artifact digest differs", async () => {
  await expect(executor.execute(tamperedJob)).rejects.toThrow("composition lock");
});
```

- [ ] **Step 2: Run those tests and verify they fail before dispatch removal**

Run: `pnpm --filter @factory/compiler test -- --run test/compilation-plan.test.ts`

Expected: FAIL while migrated target behavior still selects a Restaurant
runtime or template from `compositionProfile`.

- [ ] **Step 3: Remove only migrated profile/version dispatch**

Delete `handlerBackedCapabilityPackages` and `resolveGeneratedRuntimeMode` for
the core and shared-commerce assets migrated in Task 4. Keep unmigrated
Restaurant runtime modules until their own parameterized assets exist. Compiler
behavior must be selected from the lock’s resolved contribution list, not from
`restaurant-ordering`, `simple-ecommerce`, or an asset version switch.

- [ ] **Step 4: Run deterministic and isolated generated-runtime checks**

Run: `pnpm --filter @factory/compiler test -- --run test/composition-compilation.test.ts test/compilation-plan.test.ts`

Expected: PASS.

Run: `pnpm --filter @factory/compiler-worker test -- --run test/compilation-executor.test.ts`

Expected: PASS.

Run a Docker Compose lifecycle for one Restaurant and one Ecommerce Published
revision using unique project names and loopback ports. Verify each generated
application’s role journey, stopped preview state, and exact label-scoped
container/network/volume/runtime-directory cleanup. Do not touch other Docker
projects.

- [ ] **Step 5: Record acceptance and commit**

Document only redacted, immutable revision IDs, graph hashes, composition-lock
digests, artifact counts, test commands, outcomes, and scoped cleanup results.

```bash
git add packages/compiler apps/compiler-worker/test/compilation-executor.test.ts \
  docs/acceptance/parameterized-capability-composition.md docs/project-status.md
git commit -m "test: accept shared capability composition proof"
```

## Plan self-review

- **Spec coverage:** Tasks 1–3 implement typed parameters, requirements,
  provides, Graph and target contributions, package verification, immutable
  locks, persisted publishing, and generic compilation. Task 4 proves the
  essential requirement—same package versions with different bindings and
  generated outputs—for Restaurant and Ecommerce. Task 5 removes only the
  proven migrated dispatch and obtains runtime evidence.
- **Deliberate scope boundary:** Puck visual editing, menu modifiers, identity,
  loyalty, delivery, reservations, real payment, printing, realtime, offline,
  cloud, and the remaining Restaurant-specific assets are not silently folded
  into this kernel plan. They become independently composable capability
  slices after the proof prevents a new manual Profile fork.
- **Placeholder scan:** This plan contains no unspecified work item or test
  step. Every task names files, interfaces, tests, commands, and an expected
  outcome.
- **Type consistency:** `CapabilityCompositionLockV1` is created in Task 1,
  persisted in Task 3, passed through `PublishedGraphInput`, and consumed by
  Tasks 4–5; no task requests a separate mutable lock format.

## Execution handoff

Implement Tasks 1–5 sequentially because each task freezes a contract required
by the next. Use TDD and an independent read-only review after each task.
After Task 5, open a separate plan for Puck PageModel editing and role
simulation, then separate capability plans for restaurant modifiers/amendments,
identity/loyalty, fulfilment, reservations, and provider-backed operations.
