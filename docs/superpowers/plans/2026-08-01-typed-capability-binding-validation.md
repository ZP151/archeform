# Typed Capability Binding Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` to implement this plan task by
> task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every current or future capability binding resolve to the exact
Graph symbol kind, entity owner, and scalar field semantics required by its
immutable manifest before it can enter a Draft, Published revision, or
compiler.

**Architecture:** `@factory/graph` exposes a pure typed Graph symbol index.
`@factory/capabilities` adds a digest-covered manifest binding contract and
uses it to validate resolved selections against the index. New safe package
versions replace only current selections; immutable historic packages stay
readable. Control Plane Publish and Compiler verification consume the exact
Graph plus verified locks rather than checking locks alone.

**Tech Stack:** TypeScript 5.7.2, Zod 3.25.76, Node 22.11.0, pnpm 9.0.0,
Vitest 2.1.9, Next.js, NestJS, Prisma.

## Global Constraints

- Application Graph is the source of truth; visual editors, AI, package
  manifests, generated code, and providers are adapters.
- Preserve Draft -> Publish -> immutable Compilation. A compiler never
  consumes a mutable Draft.
- Existing Golden package bytes, evidence, versions, manifest digests,
  Published revisions, and locks are immutable.
- New Drafts select only verified safe package versions; an old Draft migrates
  by creating a new revision.
- Never dispatch validation on Profile name, package version, field name,
  source path, URL, compiler target, or output path.
- Code, UI text, tests, comments, and documentation are English.
- No external repository download, source copying, Provider activation,
  credential, raw AI prompt, or raw AI response is in scope.
- New behavior begins with a focused failing test, and all evidence runs on
  Node 22.11.0.

---

## Planned file structure

| Area                                            | Responsibility                                                                 |
| ----------------------------------------------- | ------------------------------------------------------------------------------ |
| `packages/graph/src/model.ts`                   | Pure typed symbol index and Graph reference parsing.                           |
| `packages/graph/test/application-graph.test.ts` | Namespace and owner-aware Graph index tests.                                   |
| `packages/capabilities/src/assets/contract.ts`  | `factory.capability-binding/v1` typed manifest declarations.                   |
| `packages/capabilities/src/composition.ts`      | Binding-shape and manifest-schema consistency checks.                          |
| `packages/capabilities/src/index.ts`            | Manifest-aware generic Draft composition validation and current recipes.       |
| `packages/capabilities/src/node.ts`             | Graph-aware verified lock factory.                                             |
| `packages/capabilities/src/assets/**`           | New source registrations for safe package versions.                            |
| `packages/capabilities/assets/**`               | New immutable physical package roots and verification evidence.                |
| `apps/control-plane/src/lifecycle.service.ts`   | Publish gate using exact Graph plus safe locks.                                |
| `packages/compiler/src/index.ts`                | Compiler admission gate before output creation.                                |
| package tests                                   | Public Draft, Publish, compiler, physical evidence, and migration regressions. |

## Task 1: Add a pure typed Graph symbol index

**Files:**

- Modify: `packages/graph/src/model.ts`
- Modify: `packages/graph/src/index.ts`
- Modify: `packages/graph/src/browser.ts`
- Modify: `packages/graph/test/application-graph.test.ts`

**Consumes:** `ApplicationGraphV1` entities, fields, pages, navigation,
roles, flows, providers, and experience tokens.

**Produces:** `createGraphSymbolIndex(graph)` and typed reference resolution
without any capability-manifest dependency.

- [ ] **Step 1: Write failing namespace and ownership tests**

```ts
it("resolves a field only from its declared entity owner", () => {
  const index = createGraphSymbolIndex(validGraph);
  expect(index.field("product", "stock")).toMatchObject({ type: "integer" });
  expect(index.field("store", "stock")).toBeUndefined();
});

it("keeps pages and navigation in separate namespaces", () => {
  const index = createGraphSymbolIndex(validGraph);
  expect(index.page("shop")).toBeDefined();
  expect(index.navigation("shop")).toBeUndefined();
});
```

- [ ] **Step 2: Observe RED**

Run:

```text
pnpm --filter @factory/graph test -- --run test/application-graph.test.ts
```

Expected: FAIL because no typed index/resolver exists.

- [ ] **Step 3: Implement the pure index**

Export Graph-owned `GraphSymbolIndexV1` maps for entities, fields by entity,
pages, navigation entries, roles, flows, providers, and experience tokens.
The field resolver takes `(entityKey, fieldKey)` and returns the actual Graph
field or `undefined`. Keep parser/Graph validation capability-agnostic.

- [ ] **Step 4: Verify Graph package behavior**

Run:

```text
pnpm --filter @factory/graph test -- --run test/application-graph.test.ts test/browser-entry.test.ts
pnpm --filter @factory/graph typecheck
pnpm --filter @factory/graph lint
```

- [ ] **Step 5: Commit**

```text
git add packages/graph
git commit -m "feat: index typed graph symbols"
```

## Task 2: Freeze typed manifest and binding contracts

**Files:**

- Modify: `packages/capabilities/src/assets/contract.ts`
- Modify: `packages/capabilities/src/composition.ts`
- Modify: `packages/capabilities/test/composition-contract.test.ts`
- Create: `packages/capabilities/test/typed-binding-contract.test.ts`

**Consumes:** Task 1 Graph symbol index and existing
`factory.capability/v1` / `factory.composition/v1` types.

**Produces:** `factory.capability-binding/v1` input declarations and explicit
field-binding shape.

- [ ] **Step 1: Write failing strict-contract tests**

```ts
it("rejects a domain field schema without its entity owner and scalar types", () => {
  expect(() => validateCapabilityBindingSchema(incompleteFieldInput)).toThrow(
    "ownerBinding",
  );
});

it("rejects a fieldKey for an entity binding", () => {
  expect(() => resolveCapabilityComposition(entityBindingWithFieldKey)).toThrow(
    "fieldKey",
  );
});
```

- [ ] **Step 2: Observe RED**

Run:

```text
pnpm --filter @factory/capabilities test -- --run test/typed-binding-contract.test.ts test/composition-contract.test.ts
```

Expected: FAIL because `inputSchema.type` is an untyped string and a graph
symbol cannot express an owner-aware field reference.

- [ ] **Step 3: Implement the strict contract**

Add a finite `CapabilityBindingInputTypeV1` union. Add `ownerBinding`,
`fieldTypes`, `fieldRequired`, and `fieldUnique` only for `domain.field`.
Represent a field binding as:

```ts
{ graphSymbol: "graph.domain.product", fieldKey: "stock" }
```

Require strict packages to have identical `parameters` and `inputSchema` key/
required pairs. Reject unknown owner bindings, duplicate schema keys,
field constraints on non-field inputs, a missing field key, and a field key on
any non-field input.

- [ ] **Step 4: Verify contract tests**

Run:

```text
pnpm --filter @factory/capabilities test -- --run test/typed-binding-contract.test.ts test/composition-contract.test.ts
pnpm --filter @factory/capabilities typecheck
```

- [ ] **Step 5: Commit**

```text
git add packages/capabilities/src/assets/contract.ts packages/capabilities/src/composition.ts packages/capabilities/test
git commit -m "feat: define typed capability bindings"
```

## Task 3: Publish safe versioned physical capability assets

**Files:**

- Create: `packages/capabilities/src/assets/core/location-context-v1-0-1.ts`
- Create: `packages/capabilities/src/assets/commerce/inventory-ledger-v1-0-1.ts`
- Create: `packages/capabilities/src/assets/commerce/inventory-v2-0-0.ts`
- Create: `packages/capabilities/assets/core.location-context/1.0.1/**`
- Create: `packages/capabilities/assets/commerce.inventory-ledger/1.0.1/**`
- Create: `packages/capabilities/assets/commerce.inventory/2.0.0/**`
- Modify: `packages/capabilities/src/assets/index.ts`
- Modify: `packages/capabilities/src/node.ts`
- Modify: `packages/capabilities/test/capability-registry.test.ts`
- Modify: `packages/capabilities/test/commercial-capability-assets.test.ts`

**Consumes:** Task 2 typed manifest contract.

**Produces:** Verified safe versions while preserving every existing physical
package root and digest.

- [ ] **Step 1: Write failing version and digest tests**

```ts
it("exposes typed location and ledger versions without changing 1.0.0 evidence", () => {
  expect(getCapabilityAsset("core.location-context", "1.0.1")).toBeDefined();
  expect(
    getCapabilityAsset("core.location-context", "1.0.0").manifestDigest,
  ).toBe(acceptedLocationDigest);
});

it("rejects stale physical evidence after a typed schema byte changes", () => {
  expect(() => verifyCapabilityPackage(staleTypedPackage)).toThrow("digest");
});
```

- [ ] **Step 2: Observe RED**

Run:

```text
pnpm --filter @factory/capabilities test -- --run test/commercial-capability-assets.test.ts test/capability-registry.test.ts
```

Expected: FAIL because safe asset versions and their physical evidence do not
exist.

- [ ] **Step 3: Add new immutable package versions**

Create new source registrations and physical package directories rather than
editing accepted roots:

- `core.location-context@1.0.1`: `locationCodeField` is a required, unique
  `string` `domain.field` owned by `locationEntity`.
- `commerce.inventory-ledger@1.0.1`: `stockField` is an `integer`
  `domain.field` owned by `catalogEntity`.
- `commerce.inventory@2.0.0`: add a required `catalogEntity` entity binding
  and an owned `integer` stock field binding.

Regenerate/update each new `component.json`, adapter, fixture, contract
evidence, source registration digest, and Node verifier registration. Historic
versions must remain byte-for-byte untouched.

- [ ] **Step 4: Verify assets**

Run:

```text
pnpm --filter @factory/capabilities test -- --run test/commercial-capability-assets.test.ts test/capability-registry.test.ts
pnpm --filter @factory/capabilities typecheck
pnpm --filter @factory/capabilities lint
```

- [ ] **Step 5: Commit**

```text
git add packages/capabilities/src/assets packages/capabilities/assets packages/capabilities/src/node.ts packages/capabilities/test
git commit -m "feat: publish typed commercial capability assets"
```

## Task 4: Enforce manifest-aware binding validation at public Draft composition

**Files:**

- Modify: `packages/capabilities/src/index.ts`
- Modify: `packages/capabilities/test/commercial-profile-composition.test.ts`
- Modify: `packages/capabilities/test/composition-contract.test.ts`
- Create: `packages/capabilities/test/typed-binding-composition.test.ts`

**Consumes:** Tasks 1-3.

**Produces:** One generic validator used by public `composeCapabilityDraft`.

- [ ] **Step 1: Write failing public-boundary tests**

```ts
it("rejects a location code field from the wrong entity", () => {
  expect(() => composeCapabilityDraft(withLocationCodeFromProduct)).toThrow(
    "locationCodeField",
  );
});

it("rejects a decimal price for an integer stock binding", () => {
  expect(() => composeCapabilityDraft(withPriceAsStock)).toThrow("stockField");
});

it("accepts stock on the bound catalog entity despite another stock field", () => {
  expect(composeCapabilityDraft(validDuplicateStockNames)).toBeDefined();
});
```

- [ ] **Step 2: Observe RED**

Run:

```text
pnpm --filter @factory/capabilities test -- --run test/typed-binding-composition.test.ts test/commercial-profile-composition.test.ts
```

Expected: FAIL because existing public composition checks only flattened
symbol existence.

- [ ] **Step 3: Implement generic manifest-aware validation**

After resolution and before persisting selections, resolve every selected
manifest binding through Task 1's typed Graph index. Require exact namespaces
for entity/page/navigation/role/flow/provider/token. For a field, resolve only
from the declared owner entity and validate scalar, required, and unique
constraints. Keep inventory provenance, PolicyModel, and effect-overlap rules
as separate package semantics.

- [ ] **Step 4: Verify public composition**

Run:

```text
pnpm --filter @factory/capabilities test -- --run test/typed-binding-composition.test.ts test/commercial-profile-composition.test.ts test/composition-contract.test.ts
pnpm --filter @factory/capabilities test -- --run
pnpm --filter @factory/capabilities typecheck
pnpm --filter @factory/capabilities lint
```

- [ ] **Step 5: Commit**

```text
git add packages/capabilities/src/index.ts packages/capabilities/test
git commit -m "feat: validate typed bindings at draft composition"
```

## Task 5: Gate Publish and compiler admission with the immutable Graph

**Files:**

- Modify: `packages/capabilities/src/node.ts`
- Modify: `apps/control-plane/src/lifecycle.service.ts`
- Modify: `apps/control-plane/test/lifecycle.service.test.ts`
- Modify: `packages/compiler/src/index.ts`
- Modify: `packages/compiler/test/composition-compilation.test.ts`
- Create: `packages/compiler/test/typed-binding-compilation.test.ts`

**Consumes:** Task 4 generic validation and Task 3 safe assets.

**Produces:** Graph-aware Publish and compiler gates that fail before storage or
artifact output.

- [ ] **Step 1: Write failing lifecycle and compiler tests**

```ts
it("does not persist a Published revision when a selected typed field is wrong", async () => {
  await expect(service.publish(withPriceAsStock)).rejects.toThrow("stockField");
  expect(repository.publishedRevisions()).toEqual([]);
});

it("writes no compiler output for an invalid immutable typed binding", async () => {
  await expect(compile(invalidPublishedGraph)).rejects.toThrow(
    "locationCodeField",
  );
  expect(await listOutputDirectory()).toEqual([]);
});
```

- [ ] **Step 2: Observe RED**

Run:

```text
pnpm --filter @factory/control-plane test -- --run test/lifecycle.service.test.ts
pnpm --filter @factory/compiler test -- --run test/typed-binding-compilation.test.ts test/composition-compilation.test.ts
```

Expected: FAIL because current verified-lock and compiler admission APIs lack
the exact Graph semantic validation input.

- [ ] **Step 3: Make boundaries Graph-aware**

Change pure and Node verified composition-lock factories to receive the exact
Graph with selected locks. Lifecycle Publish validates before persisting a
Published revision or lock. Compiler revalidates the immutable Graph and lock
before making any target directory, file, or artifact. Do not retain an unsafe
lock-only public overload.

- [ ] **Step 4: Verify lifecycle and compiler gates**

Run:

```text
pnpm --filter @factory/control-plane test -- --run test/lifecycle.service.test.ts
pnpm --filter @factory/control-plane typecheck
pnpm --filter @factory/compiler test -- --run test/typed-binding-compilation.test.ts test/composition-compilation.test.ts test/compilation-plan.test.ts
pnpm --filter @factory/compiler typecheck
pnpm --filter @factory/compiler lint
```

- [ ] **Step 5: Commit**

```text
git add packages/capabilities/src/node.ts apps/control-plane packages/compiler
git commit -m "feat: gate publish and compiler on typed bindings"
```

## Task 6: Migrate current recipes and resume Commercial Foundation acceptance

**Files:**

- Modify: `packages/capabilities/src/index.ts`
- Modify: `packages/capabilities/src/restaurant/profile.ts`
- Modify: `packages/capabilities/test/commercial-profile-composition.test.ts`
- Modify: `packages/capabilities/test/restaurant-profile.test.ts`
- Modify: `packages/capabilities/test/capability-registry.test.ts`
- Create: `docs/acceptance/typed-capability-binding-validation.md`
- Modify: `docs/audits/restaurant-ordering-requirements-audit.md`
- Modify: `docs/project-status.md`

**Consumes:** Tasks 1-5.

**Produces:** Restaurant and Ecommerce current recipes selecting safe locks,
plus evidence that reopens and completes Commercial Foundation Task 2 gates.

- [ ] **Step 1: Write failing migration tests**

```ts
it("uses safe typed commercial versions in Restaurant and Ecommerce", () => {
  expect(lockKeys(restaurant)).toContain("core.location-context@1.0.1");
  expect(lockKeys(ecommerce)).toContain("commerce.inventory@2.0.0");
});

it("keeps historical unsafe locks inspectable but rejects them for new drafts", () => {
  expect(readHistoricLock("commerce.inventory@1.0.1")).toBeDefined();
  expect(() => composeCapabilityDraft(withUnsafeCurrentSelection)).toThrow(
    "ineligible",
  );
});
```

- [ ] **Step 2: Observe RED**

Run:

```text
pnpm --filter @factory/capabilities test -- --run test/commercial-profile-composition.test.ts test/restaurant-profile.test.ts test/capability-registry.test.ts
```

Expected: FAIL because current recipes still select untyped package versions.

- [ ] **Step 3: Migrate recipes without rewriting history**

Update Restaurant and Ecommerce bindings to field objects with their owning
entity and safe package locks. Reject unsafe historic versions for new Draft
selection while retaining read-only historic inspection. Update restaurant
validation and exact lock regressions. Record only verified commands,
outcomes, cleanup scope, known runtime-overlap limitation, and no real-provider
claim in acceptance documentation.

- [ ] **Step 4: Run cross-package acceptance evidence**

Run:

```text
pnpm --filter @factory/graph test -- --run
pnpm --filter @factory/capabilities test -- --run
pnpm --filter @factory/control-plane test -- --run test/lifecycle.service.test.ts
pnpm --filter @factory/compiler test -- --run test/typed-binding-compilation.test.ts test/composition-compilation.test.ts
pnpm --filter @factory/graph typecheck
pnpm --filter @factory/capabilities typecheck
pnpm --filter @factory/control-plane typecheck
pnpm --filter @factory/compiler typecheck
git diff --check
```

- [ ] **Step 5: Commit**

```text
git add packages/capabilities docs apps/control-plane packages/compiler packages/graph
git commit -m "test: accept typed capability bindings"
```

## Plan self-review

- **Coverage:** Tasks 1-2 add generic type semantics. Task 3 makes them
  immutable Golden assets. Tasks 4-5 enforce them at Draft, Publish, and
  compiler boundaries. Task 6 migrates Profiles and records acceptance
  evidence.
- **Dependencies:** Tasks 1-5 are serialized shared-contract work. Task 6
  begins only after Task 5 acceptance. No existing Commercial Foundation task
  resumes until Task 6 passes independent QA and release review.
- **Scope:** No restaurant-only application behaviour, external Provider,
  source import, payments, deployment, or UI redesign is smuggled in.
