# Composable Commerce Configuration and Profile Discovery v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all registered Profiles discoverable in the Workbench, evolve
the immutable reusable `commerce.line-configuration` package with a `1.1.0`
successor, and add a versioned order-amendment package across Restaurant,
Ecommerce, Retail Counter, and Grocery Pickup.

**Architecture:** `@factory/capabilities` owns the immutable Profile catalog,
physical package assets, typed profile validation, recipes, and bindings.
Workbench consumes the catalog rather than duplicate Profile strings. Compiler
and Worker consume only Published Graphs and immutable Composition Locks to
emit handler-backed generated applications; external-source intake remains a
separate, quarantined evidence lane.

**Tech Stack:** TypeScript, pnpm/Turborepo, Vitest, Next.js/React, NestJS
generated API, Prisma, Casbin, XState, BullMQ, Docker Compose, External Intake
quarantine tooling.

## Global Constraints

- Write code, tests, UI text, and documentation in English.
- Keep credentials in local environment files only; never expose or persist a
  credential, raw AI prompt, or raw AI response.
- Preserve Draft -> Publish -> immutable Compilation. Compiler and Worker
  inputs are always a Published Graph plus immutable Composition Lock.
- Tests are written and observed failing before each production change.
- Factory Application Graph remains canonical. UI editors, generated code,
  providers, and external repositories are adapters or evidence only.
- Do not add compatibility code for the archived legacy platform.
- Do not copy external source or install external runtime dependencies in this
  release. A fixed-SHA intake result remains quarantined Candidate evidence.
- New capability packages use
  `packages/capabilities/assets/<key>/<version>/` with a manifest, adapter,
  templates, fixtures, tests, digest, and verified package-local evidence.
- Existing Restaurant table-session, kitchen, cashier, and reporting packages
  remain separate extensions. They consume generic capability outputs through
  typed contracts and do not replace their authority.

---

## File map

| Path                                                                        | Responsibility                                                                                           |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `packages/capabilities/src/index.ts`                                        | Canonical profile descriptors, recipes, immutable bindings, and starter Graphs.                          |
| `packages/capabilities/src/assets/contract.ts`                              | Profile, asset, handler, output-slot, and typed-binding vocabulary.                                      |
| `packages/capabilities/src/assets/index.ts`                                 | Current and historical capability asset registry.                                                        |
| `packages/capabilities/src/assets/commerce/line-configuration-v1-1-0.ts`    | In-code physical asset declaration for the `1.1.0` configuration successor.                              |
| `packages/capabilities/src/assets/commerce/order-amendment.ts`              | In-code physical asset declaration for the current amendment package.                                    |
| `packages/capabilities/src/commerce/profile.ts`                             | Generic commerce-profile field/relation/role/flow validation.                                            |
| `packages/capabilities/assets/commerce.line-configuration/1.1.0/**`         | Immutable successor manifest, adapter, API template, fixture, and local contract evidence.               |
| `packages/capabilities/assets/commerce.order-amendment/1.0.0/**`            | Immutable manifest, adapter, API template, fixture, and local contract evidence.                         |
| `apps/workbench/lib/profile-starters.ts`                                    | Workbench projection of the canonical Profile catalog.                                                   |
| `apps/workbench/components/workbench-home.tsx`                              | Dynamic profile cards and capability readiness presentation.                                             |
| `apps/workbench/components/guided-creation-drawer.tsx`                      | Catalog-driven profile selection and optional capabilities.                                              |
| `packages/compiler/src/index.ts`                                            | Lock-derived generated handler contract, resolvers, Prisma/API targets, and PageModel projection wiring. |
| `packages/compiler/src/page-runtime-projection.ts`                          | Bounded `catalog-configurator` and `order-amendment-console` PageModel block projection.                 |
| `apps/compiler-worker/test/**`                                              | Published-Graph materialisation and isolated artifact/cleanup evidence.                                  |
| `apps/intake-cli/src/main.ts`                                               | Existing redacted fixed-reference portfolio acquisition command; no source-to-runtime path.              |
| `docs/acceptance/**`, `docs/project-status.md`, `docs/market-validation.md` | Truthful acceptance, milestone, and source-study evidence.                                               |

## Task 1: Export an authoritative Profile catalog and render it in Workbench

**Files:**

- Modify: `packages/capabilities/src/index.ts`
- Modify: `packages/capabilities/test/capability-registry.test.ts`
- Modify: `apps/workbench/lib/profile-starters.ts`
- Modify: `apps/workbench/lib/profile-starters.test.ts`
- Modify: `apps/workbench/components/workbench-home.tsx`
- Modify: `apps/workbench/components/workbench-home.test.tsx`
- Modify: `apps/workbench/components/guided-creation-drawer.test.tsx`

**Consumes:** Existing `FactoryProfile`, `getProfileComposition`, and
immutable recipe/asset registration.

**Produces:** `FactoryProfileDescriptorV1`, `listFactoryProfiles()`, and
`getFactoryProfileDescriptor()`; Home and Guided Creation show every current
profile from that catalog.

- [ ] **Step 1: Write failing catalog and Workbench tests**

```ts
expect(listFactoryProfiles().map(({ profile }) => profile)).toEqual([
  "expense-approval",
  "restaurant-ordering",
  "simple-ecommerce",
  "retail-counter",
  "grocery-pickup",
]);

expect(getFactoryProfileDescriptor("retail-counter")).toMatchObject({
  apiVersion: "factory.profile-descriptor/v1",
  category: "commerce",
  requiredCapabilities: expect.arrayContaining(["commerce.catalog"]),
});

expect(container.textContent).toContain("Retail counter");
expect(container.textContent).toContain("Grocery pickup");
```

- [ ] **Step 2: Verify RED**

Run:

```text
pnpm --filter @factory/capabilities test -- --run test/capability-registry.test.ts
pnpm --filter @factory/workbench test -- --run lib/profile-starters.test.ts components/workbench-home.test.tsx components/guided-creation-drawer.test.tsx
```

Expected: FAIL because the canonical descriptor API does not exist and the
Workbench hardcodes a three-item `profileStarterOptions` array.

- [ ] **Step 3: Add canonical descriptor API and derive frontend projection**

Add immutable definitions and validate them at module construction time:

```ts
export type FactoryProfileDescriptorV1 = {
  readonly apiVersion: "factory.profile-descriptor/v1";
  readonly profile: FactoryProfile;
  readonly label: string;
  readonly description: string;
  readonly category: "approval" | "commerce";
  readonly scenarioTags: readonly string[];
  readonly requiredCapabilities: readonly string[];
  readonly defaultOptionalCapabilities: readonly OptionalCapabilityKey[];
};

export function listFactoryProfiles(): readonly FactoryProfileDescriptorV1;
export function getFactoryProfileDescriptor(
  profile: FactoryProfile,
): FactoryProfileDescriptorV1;
```

Implement the list from the existing `compositionRecipes` and
`getProfileComposition()` data. Assert each descriptor has exactly one known
`FactoryProfile`, a non-empty label/description, non-empty scenario tags, no
duplicate capability key, only supported optional capability keys, and only
capabilities eligible for that recipe.

Change `profileStarterOptions` to map `listFactoryProfiles()` and preserve the
existing `ProfileStarterOption` UI projection. Change Home card status text to
`Verified capability packages` and derive counts from the descriptor's
composition rather than calling the profile Golden. Guided Creation uses the
same projection, so its template selection never lists a frontend-only
profile.

- [ ] **Step 4: Verify GREEN and commit**

Run:

```text
pnpm --filter @factory/capabilities test -- --run test/capability-registry.test.ts
pnpm --filter @factory/capabilities typecheck
pnpm --filter @factory/capabilities lint
pnpm --filter @factory/workbench test -- --run lib/profile-starters.test.ts components/workbench-home.test.tsx components/guided-creation-drawer.test.tsx
pnpm --filter @factory/workbench typecheck
pnpm --filter @factory/workbench lint
```

Commit:

```text
git add packages/capabilities/src/index.ts packages/capabilities/test/capability-registry.test.ts apps/workbench/lib/profile-starters.ts apps/workbench/lib/profile-starters.test.ts apps/workbench/components/workbench-home.tsx apps/workbench/components/workbench-home.test.tsx apps/workbench/components/guided-creation-drawer.test.tsx
git commit -m "feat: discover all profiles from the capability catalog"
```

## Task 2: Evolve generic configuration semantics in an immutable successor package

**Files:**

- Create: `packages/capabilities/src/assets/commerce/line-configuration-v1-1-0.ts`
- Modify: `packages/capabilities/src/assets/index.ts`
- Modify: `packages/capabilities/src/assets/contract.ts`
- Create: `packages/capabilities/src/commerce/profile.ts`
- Create: `packages/capabilities/assets/commerce.line-configuration/1.1.0/component.json`
- Create: `packages/capabilities/assets/commerce.line-configuration/1.1.0/adapter.json`
- Create: `packages/capabilities/assets/commerce.line-configuration/1.1.0/templates/api/capability-module.ts.tpl`
- Create: `packages/capabilities/assets/commerce.line-configuration/1.1.0/fixtures/default.json`
- Create: `packages/capabilities/assets/commerce.line-configuration/1.1.0/tests/contract.json`
- Create: `packages/capabilities/test/line-configuration-v1-1-package.test.ts`
- Create: `packages/capabilities/test/commerce-profile.test.ts`

**Consumes:** Current physical-asset format, strict typed binding contract, and
the four current commerce Profile starter Graphs.

**Produces:** `commerce.line-configuration@1.1.0` as a digest-verified Golden
successor asset and a generic commerce semantic validator. The `1.0.0` asset
and every lock that references it remain unchanged.

- [ ] **Step 1: Write failing package and Graph semantic tests**

```ts
expect(
  getCapabilityAsset("commerce.line-configuration").manifest,
).toMatchObject({
  version: "1.1.0",
  lifecycle: "golden",
  profiles: [
    "restaurant-ordering",
    "simple-ecommerce",
    "retail-counter",
    "grocery-pickup",
  ],
});

expect(() => assertCommerceProfile(graphWithoutOptionRelation)).toThrow(
  /option group.*catalog/i,
);
expect(() => assertCommerceProfile(graphWithInvalidMaximumSelections)).toThrow(
  /maximumSelections/i,
);
```

- [ ] **Step 2: Verify RED**

Run:

```text
pnpm --filter @factory/capabilities test -- --run test/line-configuration-v1-1-package.test.ts test/commerce-profile.test.ts
```

Expected: FAIL because no generic asset, validation module, or selected
configuration Graph concepts exist.

- [ ] **Step 3: Implement asset contract and semantic validator**

Add a `catalogConfiguration` runtime handler kind and the package's exact
typed bindings:

```ts
type LineConfigurationBindingsV1 = {
  readonly catalogEntity: { readonly graphSymbol: string };
  readonly optionGroupEntity: { readonly graphSymbol: string };
  readonly optionEntity: { readonly graphSymbol: string };
  readonly orderLineEntity: { readonly graphSymbol: string };
  readonly merchantRole: { readonly graphSymbol: string };
  readonly customerRole: { readonly graphSymbol: string };
  readonly catalogRoute: { readonly graphSymbol: string };
  readonly merchantRoute: { readonly graphSymbol: string };
};
```

The semantic validator accepts a Profile Projection built from bindings. It
requires an option-group entity with `name`, `selectionMode`,
`minimumSelections`, `maximumSelections`, `active`, and `sortOrder`; an option
entity with `label`, `priceDelta`, `available`, and `sortOrder`; and an
order-line-option snapshot with `label`, `priceDelta`, and `quantity`. It
requires catalog-to-group, group-to-option, order-line-to-snapshot, and
snapshot-to-option relations. It rejects unknown selection modes,
negative/invalid cardinalities, duplicate option names, invalid role/route
symbols, and unsupported types before compilation.

Use the same template contribution layout as `commerce.catalog@1.2.0` but
declare `runtimeHandlers: ["catalogConfiguration"]` and output only
`api.runtime`, `database.schema`, `page.block`, `flow.effect`, and
`test.fixture` slots. Generate manifest/template/fixture/contract digests with
the existing asset verification mechanism; do not write a source file into the
asset package that is not declared by `component.json`.

- [ ] **Step 4: Verify GREEN and commit**

Run:

```text
pnpm --filter @factory/capabilities test -- --run test/line-configuration-v1-1-package.test.ts test/commerce-profile.test.ts test/capability-registry.test.ts
pnpm --filter @factory/capabilities typecheck
pnpm --filter @factory/capabilities lint
```

Commit:

```text
git add packages/capabilities/src/assets packages/capabilities/src/commerce/profile.ts packages/capabilities/assets/commerce.line-configuration/1.1.0 packages/capabilities/test/line-configuration-v1-1-package.test.ts packages/capabilities/test/commerce-profile.test.ts
git commit -m "feat: evolve line configuration capability"
```

## Task 3: Bind line configuration `1.1.0` into four commerce Profiles

**Files:**

- Modify: `packages/capabilities/src/index.ts`
- Modify: `packages/capabilities/src/restaurant/profile.ts`
- Modify: `packages/capabilities/test/commercial-profile-composition.test.ts`
- Modify: `packages/capabilities/test/restaurant-profile.test.ts`
- Modify: `packages/capabilities/test/commerce-profile.test.ts`

**Consumes:** Task 2 asset, generic semantic validator, and existing declarative
Retail/Grocery order-operation starter configuration.

**Produces:** Four starter Graphs with exact identical
`commerce.line-configuration@1.1.0` lock identity and distinct
Graph-symbol bindings.

- [ ] **Step 1: Write failing cross-Profile composition tests**

```ts
for (const profile of [
  "restaurant-ordering",
  "simple-ecommerce",
  "retail-counter",
  "grocery-pickup",
] as const) {
  const result = composeDefaultCapabilityDraft({ profile });
  expect(result.composition.packages).toContainEqual(
    expect.objectContaining({
      lock: expect.objectContaining({
        key: "commerce.line-configuration",
        version: "1.1.0",
      }),
    }),
  );
}

expect(retailConfigurationBindings.catalogEntity).not.toEqual(
  restaurantConfigurationBindings.catalogEntity,
);
```

- [ ] **Step 2: Verify RED**

Run:

```text
pnpm --filter @factory/capabilities test -- --run test/commercial-profile-composition.test.ts test/restaurant-profile.test.ts test/commerce-profile.test.ts
```

Expected: FAIL because recipes, Graph starters, bindings, relations, and
capabilities do not select the `1.1.0` successor package.

- [ ] **Step 3: Add declarative Graph facts and bindings**

Extend the existing declarative order-operations starter configuration with
the profile-specific symbol map for line configuration. Add only typed
DomainModel fields and relations required by Task 2. For Restaurant retain the
existing `menu-option-group`, `menu-option`, and `order-line-option` concepts,
adding snapshot label/quantity only when absent. For the other three profiles,
add neutral item-option-group, item-option, and order-line-option entities
with their own exact IDs and page routes.

Replace the existing `commerce.line-configuration@1.0.0` selection in each
recipe with the `1.1.0` successor, add its typed selection bindings, and add
the closed Factory capability
operations `catalog.option-group.manage`, `catalog.option.manage`, and
`catalog.option.select` to the Graph. The profile validator is called during
both new Draft composition and immutable lock validation. It must not infer an
entity from the Profile string in compiler code.

- [ ] **Step 4: Verify GREEN and commit**

Run:

```text
pnpm --filter @factory/capabilities test -- --run test/commercial-profile-composition.test.ts test/restaurant-profile.test.ts test/commerce-profile.test.ts test/composition-contract.test.ts
pnpm --filter @factory/capabilities typecheck
pnpm --filter @factory/capabilities lint
```

Commit:

```text
git add packages/capabilities/src/index.ts packages/capabilities/src/restaurant/profile.ts packages/capabilities/test/commercial-profile-composition.test.ts packages/capabilities/test/restaurant-profile.test.ts packages/capabilities/test/commerce-profile.test.ts
git commit -m "feat: compose configurable catalog profiles"
```

## Task 4: Compile lock-derived configuration handlers and bounded page blocks

**Files:**

- Modify: `packages/compiler/src/index.ts`
- Modify: `packages/compiler/src/page-runtime-projection.ts`
- Modify: `packages/compiler/test/page-runtime-projection.test.ts`
- Create: `packages/compiler/test/line-configuration-runtime.test.ts`
- Modify: `packages/compiler/test/profile-compilation.test.ts`

**Consumes:** Task 3 Published Graphs and exact current asset locks.

**Produces:** A generated `LineConfigurationHandler`, server-authoritative
configuration selection, and bounded customer/merchant projections.

- [ ] **Step 1: Write failing generated-runtime tests**

```ts
expect(files["api/src/capabilities/commerce.line-configuration.ts"]).toContain(
  "lineConfigurationHandler",
);
expect(files["api/src/application-runtime.ts"]).toContain(
  "getLineConfigurationHandler().select",
);
expect(files["web/src/page-runtime.ts"]).toContain('"catalog-configurator"');
expect(() => generateApplicationBundle(invalidSelectedOption)).toThrow(
  /unavailable option/i,
);
```

- [ ] **Step 2: Verify RED**

Run:

```text
pnpm --filter @factory/compiler test -- --run test/line-configuration-runtime.test.ts test/page-runtime-projection.test.ts test/profile-compilation.test.ts
```

Expected: FAIL because the generated capability runtime knows only record,
workflow, cart, catalog, order, and effect handlers; the page projection does
not accept configuration block types.

- [ ] **Step 3: Add lock-derived handler and projections**

Extend the generated capability contract with:

```ts
export interface LineConfigurationHandler {
  select(input: {
    role: string;
    catalogEntity: string;
    catalogRecordId: string;
    optionIds: readonly string[];
    quantity: number;
    store: CapabilityStore;
    assertAllowed(
      role: string,
      entityKey: string,
      action: string,
    ): Promise<void>;
  }): Promise<CapabilityConfiguredLine>;
}
```

Add `lineConfigurationHandler?: LineConfigurationHandler` to
`CapabilityRuntimeModule` and `getLineConfigurationHandler()` to generated
registry code. Resolve a single handler only from the immutable package lock.
It reads declared option records, validates group cardinality and availability,
creates immutable selection snapshots, calculates price deltas on the server,
and returns bounded line data. Neither handler input nor PageModel props can
supply labels, amounts, totals, executable code, URLs, component identifiers,
or output paths.

Add `catalog-configurator` and `order-amendment-console` only as typed,
entity-bound PageModel block types. They project only existing safe props and
validated entity references. Restaurant-specific blocks remain unavailable to
the other three Profiles.

- [ ] **Step 4: Verify GREEN and commit**

Run:

```text
pnpm --filter @factory/compiler test -- --run test/line-configuration-runtime.test.ts test/page-runtime-projection.test.ts test/profile-compilation.test.ts test/composition-compilation.test.ts
pnpm --filter @factory/compiler typecheck
pnpm --filter @factory/compiler lint
pnpm --filter @factory/compiler build
```

Commit:

```text
git add packages/compiler/src/index.ts packages/compiler/src/page-runtime-projection.ts packages/compiler/test/line-configuration-runtime.test.ts packages/compiler/test/page-runtime-projection.test.ts packages/compiler/test/profile-compilation.test.ts
git commit -m "feat: compile line configuration handlers"
```

## Task 5: Define and compose versioned order amendment package

**Files:**

- Create: `packages/capabilities/src/assets/commerce/order-amendment.ts`
- Modify: `packages/capabilities/src/assets/index.ts`
- Modify: `packages/capabilities/src/assets/contract.ts`
- Modify: `packages/capabilities/src/commerce/profile.ts`
- Modify: `packages/capabilities/src/index.ts`
- Create: `packages/capabilities/assets/commerce.order-amendment/1.0.0/component.json`
- Create: `packages/capabilities/assets/commerce.order-amendment/1.0.0/adapter.json`
- Create: `packages/capabilities/assets/commerce.order-amendment/1.0.0/templates/api/capability-module.ts.tpl`
- Create: `packages/capabilities/assets/commerce.order-amendment/1.0.0/fixtures/default.json`
- Create: `packages/capabilities/assets/commerce.order-amendment/1.0.0/tests/contract.json`
- Create: `packages/capabilities/test/order-amendment-package.test.ts`
- Modify: `packages/capabilities/test/commerce-profile.test.ts`

**Consumes:** Task 2's generic catalog/line snapshots and existing inventory,
audit, outbox, order version, and idempotency contracts.

**Produces:** Four recipes with one immutable amendment-package lock and typed
Order/Inventory/Audit/Flow bindings.

- [ ] **Step 1: Write failing package and semantic tests**

```ts
expect(
  getCapabilityAsset("commerce.order-amendment").manifest.runtimeHandlers,
).toEqual(["orderAmendment"]);
expect(() => assertCommerceProfile(graphWithoutAmendmentEntity)).toThrow(
  /amendment entity/i,
);
expect(() => assertCommerceProfile(graphWithoutOrderVersion)).toThrow(
  /order version/i,
);
```

- [ ] **Step 2: Verify RED**

Run:

```text
pnpm --filter @factory/capabilities test -- --run test/order-amendment-package.test.ts test/commerce-profile.test.ts
```

Expected: FAIL because the amendment asset, bindings, immutable amendment
record, and generic profile validation have not been added.

- [ ] **Step 3: Add asset, semantic model, recipes, and bindings**

The package declares runtime handler `orderAmendment` and exact inputs for
order entity, order line, amendment record, inventory ledger, merchant role,
customer role, and amendment flow. Each commerce Graph adds a typed amendment
record with `orderId`, `reason`, `beforeTotal`, `afterTotal`, `expectedVersion`,
`idempotencyKey`, `status`, and `recordedAt` fields. It adds required
relations to the order and audited actor evidence.

Add closed effects `order.amendment.apply`, `order.amendment.cancel`, and
`settlement.adjustment.record`; do not add a payment-provider effect. The
generic Profile validator accepts only the states `cart`, `submitted`, or
`paid` as amendment sources and rejects amendment after an irreversible
fulfilment state. It verifies merchant-only mutation policy and a customer
read-only status projection.

Register the exact package in all four commerce recipes. Bind symbols
declaratively, retaining Restaurant's specialised controller only for its
separate table/kitchen/cashier concerns.

- [ ] **Step 4: Verify GREEN and commit**

Run:

```text
pnpm --filter @factory/capabilities test -- --run test/order-amendment-package.test.ts test/commerce-profile.test.ts test/commercial-profile-composition.test.ts test/capability-registry.test.ts
pnpm --filter @factory/capabilities typecheck
pnpm --filter @factory/capabilities lint
```

Commit:

```text
git add packages/capabilities/src/assets packages/capabilities/src/commerce/profile.ts packages/capabilities/src/index.ts packages/capabilities/assets/commerce.order-amendment packages/capabilities/test/order-amendment-package.test.ts packages/capabilities/test/commerce-profile.test.ts packages/capabilities/test/commercial-profile-composition.test.ts
git commit -m "feat: add versioned order amendment capability"
```

## Task 6: Compile amendment transaction and prove generated application isolation

**Files:**

- Modify: `packages/compiler/src/index.ts`
- Modify: `packages/compiler/src/page-runtime-projection.ts`
- Create: `packages/compiler/test/order-amendment-runtime.test.ts`
- Modify: `packages/compiler/test/profile-compilation.test.ts`
- Create: `apps/compiler-worker/test/commerce-configuration-lifecycle.test.ts`
- Modify: `apps/compiler-worker/package.json`

**Consumes:** Task 5's immutable amendment locks and Published commerce Graphs.

**Produces:** Generated server transaction, customer/merchant bounded DTOs,
and isolated Worker outputs for all four commerce Profiles.

- [ ] **Step 1: Write failing runtime and Worker tests**

```ts
const amended = await runtime.amendOrder("manager", orderId, {
  expectedVersion: 1,
  idempotencyKey: "amend-001",
  reason: "Customer changed selection",
  lines: [{ operation: "remove", lineId }],
});

expect(amended.version).toBe(2);
expect(await runtime.inventoryLedgerFor(orderId)).toContainEqual(
  expect.objectContaining({ provenance: "order-release" }),
);
expect(await runtime.auditFor(orderId)).toContainEqual(
  expect.objectContaining({ action: "order.amendment.apply" }),
);
await expect(replayWithDifferentPayload()).rejects.toThrow(/idempotency/i);
expect(workerArtifacts).not.toContain(
  "api/src/restaurant/restaurant-command.service.ts",
);
```

- [ ] **Step 2: Verify RED**

Run:

```text
pnpm --filter @factory/compiler test -- --run test/order-amendment-runtime.test.ts test/profile-compilation.test.ts
pnpm --filter @factory/compiler-worker test -- --run test/commerce-configuration-lifecycle.test.ts
```

Expected: FAIL because generated runtime has no amendment handler or
transaction and Worker outputs do not prove the new generic capabilities.

- [ ] **Step 3: Compile a server-authoritative amendment handler**

Add `OrderAmendmentHandler`, `getOrderAmendmentHandler()`, and
`orderAmendmentHandler?: OrderAmendmentHandler` using the same exact-lock
selection rules as catalog/order handlers. Its handler receives order ID,
expected version, idempotency key, reason, and closed line changes; it obtains
all item/option/price state from the store.

The generated Prisma implementation wraps state validation, durable idempotency
lookup, amendment append, configured-line snapshot update, inventory ledger
compensation, settlement-adjustment intent, order-version increment, audit
append, and outbox append in one transaction. On failure it writes none of
them. On a replay with identical payload it returns the prior result without
repeating effects; a replay key with a different canonical payload fails.

Compile only a redacted customer read projection and a merchant-only
`order-amendment-console` projection. Non-Restaurant bundles never emit
Restaurant command files. The Worker materialises only Published Graphs and
records redacted summaries and cleanup evidence.

- [ ] **Step 4: Verify GREEN and commit**

Run:

```text
pnpm --filter @factory/compiler test -- --run test/order-amendment-runtime.test.ts test/line-configuration-runtime.test.ts test/profile-compilation.test.ts test/composition-compilation.test.ts
pnpm --filter @factory/compiler typecheck
pnpm --filter @factory/compiler lint
pnpm --filter @factory/compiler build
pnpm --filter @factory/compiler-worker test -- --run test/commerce-configuration-lifecycle.test.ts
pnpm --filter @factory/compiler-worker typecheck
pnpm --filter @factory/compiler-worker lint
```

Commit:

```text
git add packages/compiler/src/index.ts packages/compiler/src/page-runtime-projection.ts packages/compiler/test/order-amendment-runtime.test.ts packages/compiler/test/profile-compilation.test.ts apps/compiler-worker/package.json apps/compiler-worker/test/commerce-configuration-lifecycle.test.ts
git commit -m "feat: compile transactional order amendments"
```

## Task 7: Record acceptance and run a quarantined source-study batch

**Files:**

- Create: `docs/acceptance/composable-commerce-configuration.md`
- Modify: `docs/audits/restaurant-ordering-requirements-audit.md`
- Modify: `docs/project-status.md`
- Modify: `docs/market-validation.md`
- No product-runtime source modification is permitted by this task.

**Consumes:** Tasks 1-6 evidence and the existing verified External Intake
pipeline.

**Produces:** An evidence-backed release record and a redacted/quarantined
source-study outcome for selected portfolio IDs.

- [ ] **Step 1: Add failing acceptance assertions first**

Add executable assertions to the Task 6 runtime tests before updating docs:

```ts
expect(compiledProfiles).toEqual(
  expect.arrayContaining([
    "restaurant-ordering",
    "simple-ecommerce",
    "retail-counter",
    "grocery-pickup",
  ]),
);
expect(allCurrentLocks("commerce.line-configuration")).toEqual([
  "1.1.0",
  "1.1.0",
  "1.1.0",
  "1.1.0",
]);
expect(allCurrentLocks("commerce.order-amendment")).toEqual([
  "1.0.0",
  "1.0.0",
  "1.0.0",
  "1.0.0",
]);
```

- [ ] **Step 2: Verify RED and GREEN**

Run first before implementation, then after Task 6:

```text
pnpm --filter @factory/compiler test -- --run test/order-amendment-runtime.test.ts test/profile-compilation.test.ts
```

Expected before Tasks 2-6: FAIL because neither generic package lock or
generated amendment behaviour exists. Expected after Task 6: PASS.

- [ ] **Step 3: Run full verification and a non-promoting source-study batch**

Run:

```text
pnpm --filter @factory/capabilities test
pnpm --filter @factory/capabilities typecheck
pnpm --filter @factory/capabilities lint
pnpm --filter @factory/workbench test
pnpm --filter @factory/workbench typecheck
pnpm --filter @factory/workbench lint
pnpm --filter @factory/compiler test
pnpm --filter @factory/compiler typecheck
pnpm --filter @factory/compiler lint
pnpm --filter @factory/compiler build
pnpm --filter @factory/compiler-worker test
pnpm --filter @factory/compiler-worker typecheck
pnpm --filter @factory/compiler-worker lint
pnpm --filter @factory/external-intake test
pnpm --filter @factory/external-intake typecheck
pnpm --filter @factory/external-intake lint
pnpm --filter @factory/intake-cli test
pnpm --filter @factory/intake-cli typecheck
pnpm --filter @factory/intake-cli lint
git diff --check
```

If `FACTORY_GITHUB_READ_TOKEN` is available only through the local process
environment, run the non-promoting batch below; do not print, inspect, or
persist the token or raw source contents:

```text
pnpm --filter @factory/intake-cli build
node apps/intake-cli/dist/main.js portfolio acquire --file ecosystem/portfolio/2026-07-30-external-business-logic.json --sources tastyigniter,ti-ext-cart,bagisto,inventree,spree
```

Record only the redacted acquired/blocked status and opaque digests. Do not
create a Golden asset, modify a Graph, import upstream code, add a dependency,
or claim a source is reusable before a separately reviewed exact-path study.

- [ ] **Step 4: Write evidence and commit**

The acceptance document must distinguish verified capability behaviour from
deferred Restaurant requirements: identity, real money, loyalty/promotion,
reservation/waitlist, delivery, realtime, printing, offline, and performance
SLO evidence. It must link each external candidate only as quarantined source
evidence and include no raw origin URLs, source bytes, prompts, or secrets in
CLI evidence.

Commit:

```text
git add docs/acceptance/composable-commerce-configuration.md docs/audits/restaurant-ordering-requirements-audit.md docs/project-status.md docs/market-validation.md packages/compiler/test/order-amendment-runtime.test.ts packages/compiler/test/profile-compilation.test.ts
git commit -m "docs: record composable commerce configuration evidence"
```

## Plan self-review

### Spec coverage

- Profile discovery is covered by Task 1.
- Immutable line-configuration successor, generic semantic validation, and
  four Profile bindings are covered by Tasks 2-4.
- Versioned amendment contract, transaction, inventory/audit/outbox effects,
  and Worker isolation are covered by Tasks 5-6.
- Fixed-reference source-intake execution, truthful release evidence, and
  explicit non-promotion are covered by Task 7.
- Reservations/waitlists, identity, loyalty, delivery, payments, realtime,
  printing, offline, and performance remain explicitly deferred by the
  approved design; they cannot be implied by this release.

### Placeholder and consistency check

- Every task names exact production and test paths, expected RED command,
  expected failure reason, implementation interface, GREEN command, and commit
  boundary.
- `FactoryProfileDescriptorV1`, `LineConfigurationHandler`, and
  `OrderAmendmentHandler` are defined before later tasks consume them.
- `commerce.line-configuration@1.1.0` is an immutable successor and
  `commerce.order-amendment@1.0.0` is the only new package identity.
- No task accepts an external source as a runtime input or makes source
  acquisition a Golden promotion path.
