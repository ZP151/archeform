# Product Recipe V2 Prerequisite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking. Unchecked boxes explicitly labelled
> historical below are archival instructions, not live execution authority.

**Goal:** Deliver additive Product Recipe V2 and Application Surface V2 public
contracts that separate complete page ownership from visible navigation while
leaving Product Recipe V1 immutable.

**Architecture:** One serialized Graph-package slice adds strict V2 schemas,
semantic validation, canonical hashing, explicit V1/V2 dispatch, and a one-way
V1 Draft adapter in `product-recipe.ts`. Node and browser entrypoints re-export
the same browser-safe contract; V1 schemas, types, assertion, behavior, bytes,
and consumers remain unchanged.

**Tech Stack:** TypeScript 5, Zod 3, Vitest 2, existing browser-safe SHA-256 and
`digestJson` utilities, pnpm workspace tooling.

## Global Constraints

- Accepted ADR: `docs/adr/adr-0011-product-recipe-surface-page-ownership.md`.
- Frozen ledger: `docs/superpowers/ledgers/2026-08-14-product-recipe-v2-prerequisite.md`.
- Base and upstream must remain `8230197241589865f289c223fc346b6d91a438ae`
  until controller delivery.
- Exactly one GPT-5.6-Sol integration writer owns exactly the four paths listed
  below. The writer must not stage, commit, or push.
- Preserve all unrelated dirty governance work and the Task 3 inventory plus 21
  scaffold files. Do not edit Task 2 or Task 3 paths.
- Keep `factory.product-recipe/v1`, `factory.application-surface/v1`,
  `productRecipeSchema`, `applicationSurfaceSchema`, `ProductRecipeV1`,
  `ApplicationSurfaceV1`, and `assertProductRecipe` unchanged in public shape
  and behavior.
- Add only `factory.product-recipe/v2` and
  `factory.application-surface/v2`; keep `factory.screen-intent/v1`.
- `ownedPageKeys` is required, ordered, non-empty, maximum 100, unique, and is
  the complete ownership set for its surface.
- V1-to-V2 Draft adaptation derives ownership only from entry then visible
  navigation. No V2-to-V1 path exists.
- New V2 boundaries must recursively reject inherited/accessor/symbol/hidden/
  sparse/non-plain/cyclic/over-depth data. Ordinary getters and instance methods
  are never invoked. Proxy reflection exceptions are caught and converted to a
  fixed no-echo validation issue; Proxy meta-trap non-invocation is infeasible
  in browser JavaScript and is not promised.
- The strict-copy depth budget is 64: root depth 0 and depth 64 are valid;
  reject before descent to 65 while preserving repeated acyclic aliases.
- The strict-copy global array-length budget is 100. After `Array.isArray`,
  enter a caught region, obtain the own length data descriptor at most once,
  require an integer in 0..100, and only then inspect prototype, keys, numeric
  descriptors, or slots. Over-limit arrays fail with zero key/slot inspection.
- The two public schemas preserve the five Zod method signatures but never
  inspect, dereference, or use optional parse params. Their fixed failure path is
  always `[]`; caller `path`/`errorMap` behavior is not promised.
- Do not add dependencies, manifests, lockfile changes, Node-only browser
  imports, provider/model/network/service code, Docker, or Compose.
- This serialized prerequisite requires task review, Terra QA, Sol release
  review, PM acceptance, and controller-only delivery. Ordinary local repair
  within the four paths is not constrained by a real-model/high-cost rerun cap.

---

## File Structure

**Exact writer-owned paths:**

- Modify: `packages/graph/src/product-recipe.ts` — V2 types, schemas, strict
  boundary, semantic assertion, hash, explicit dispatch, and Draft adapter.
- Verify unchanged: `packages/graph/src/index.ts` — existing Node wildcard
  re-export from `product-recipe.ts`.
- Verify unchanged: `packages/graph/src/browser.ts` — existing browser wildcard
  re-export from `product-recipe.ts`.
- Create: `packages/graph/test/product-recipe-v2.test.ts` — V2 ownership,
  dispatch, adapter, hash, freshness, and hostile-boundary tests.
- Modify: `packages/graph/test/product-recipe.test.ts` — frozen V1 behavior and
  Restaurant mismatch characterization.
- Modify: `packages/graph/test/browser-entry.test.ts` — Node/browser runtime and
  public export parity.

The implementation stays in the existing focused `product-recipe.ts` module;
adding another source module would widen the frozen public-contract manifest
without a separate responsibility that currently warrants it.

---

### Task 1: Pin V1 immutability and capture the ownership mismatch

> Historical execution block: Tasks 1–6 and Task 7 through Step 3n record the
> original instructions plus successive repairs and gates. Every unchecked box
> in that range is superseded by later explicit RED/GREEN, review, and QA
> evidence; it is not current execution authority and is intentionally not
> falsely marked complete. The only live implementation checkboxes begin at
> Step 3o.

**Files:**

- Modify: `packages/graph/test/product-recipe.test.ts`

**Interfaces:**

- Consumes: existing `assertProductRecipe(input: unknown): ProductRecipeV1`.
- Produces: regression evidence that V1 keeps deriving ownership only from
  entry plus visible navigation and cannot represent the Restaurant contract.

- [ ] **Step 1: Add a V1 parity snapshot and exact Restaurant mismatch fixture**

Add a helper whose customer surface has eight screens but only five visible
tabs. Keep its API identifiers V1:

```ts
const customerPageKeys = [
  "customer-home",
  "customer-menu",
  "customer-dish-detail",
  "customer-cart",
  "customer-checkout",
  "customer-orders",
  "customer-order-detail",
  "customer-profile",
] as const;

const customerTabKeys = [
  "customer-home",
  "customer-menu",
  "customer-cart",
  "customer-orders",
  "customer-profile",
] as const;
```

Build all eight Screen Intents with `factory.screen-intent/v1`; use
`customer-home` as entry and the exact five keys above as navigation items.
Assert the existing V1 function rejects with:

```ts
expect(() => assertProductRecipe(restaurantCustomerV1())).toThrow(
  "Product Recipe screen 'customer-dish-detail' has no surface owner.",
);
```

Also pin that `validRecipe()` still returns deep equality and retains
`factory.product-recipe/v1` and `factory.application-surface/v1`.

- [ ] **Step 2: Run the V1 characterization**

Run:

```text
pnpm --filter @factory/graph exec vitest run test/product-recipe.test.ts
```

Expected: PASS on the existing implementation. Record the test count and exact
Restaurant rejection. This is characterization evidence, not the V2 RED.

- [ ] **Step 3: Confirm no V1 production edit exists**

Run:

```text
git diff -- packages/graph/src/product-recipe.ts
```

Expected: no writer-created production diff yet. Preserve this output with the
Task 1 handoff evidence.

---

### Task 2: Drive Product Recipe V2 ownership RED to GREEN

**Files:**

- Create: `packages/graph/test/product-recipe-v2.test.ts`
- Modify: `packages/graph/src/product-recipe.ts`

**Interfaces:**

- Consumes: V1 field schemas and semantic vocabulary, `CompositionError`,
  `parseStrict`, `digestJson`, `Sha256Digest`.
- Produces:
  `applicationSurfaceV2Schema: z.ZodType<ApplicationSurfaceV2>`,
  `productRecipeV2Schema: z.ZodType<ProductRecipeV2>`,
  `assertProductRecipeV2(input: unknown): ProductRecipeV2`, and
  `hashProductRecipeV2(input: unknown): Sha256Digest`.

- [ ] **Step 1: Write the focused V2 positive and ownership failure tests**

Create `validRecipeV2()` by changing the valid V1 identifiers and adding
ownership:

```ts
function validRecipeV2(): Record<string, unknown> {
  const recipe = structuredClone(validRecipeV1Data());
  recipe.apiVersion = "factory.product-recipe/v2";
  const surface = (recipe.surfaces as Record<string, unknown>[])[0]!;
  surface.apiVersion = "factory.application-surface/v2";
  surface.ownedPageKeys = ["home"];
  return recipe;
}
```

Add the complete Restaurant customer V2 fixture with all eight
`ownedPageKeys` and exact five visible tab keys. Require both fixtures to pass.
Add exact failure assertions for:

```text
Product Recipe surface 'customer-mobile' owned page 'customer-home' is duplicated.
Product Recipe surface 'customer-mobile' owns unknown screen 'missing-screen'.
Product Recipe surface 'customer-mobile' entry screen 'customer-home' is not owned.
Product Recipe surface 'customer-mobile' navigation target 'customer-menu' is not owned.
Product Recipe screen 'customer-home' belongs to more than one surface.
Product Recipe screen 'customer-dish-detail' has no surface owner.
```

Also reject empty and 101-entry ownership arrays and extra fields at the recipe,
surface, navigation, and owned-page-containing structures.

- [ ] **Step 2: Write fixed hash, determinism, and freshness tests**

For the one-screen canonical V2 fixture described in the ledger, require:

```ts
expect(hashProductRecipeV2(validRecipeV2())).toBe(
  "sha256:93fb56182c117e674a2997c878daf53e6813b25a16b1cdde1afa9c662f4579b0",
);
const first = assertProductRecipeV2(validRecipeV2());
const second = assertProductRecipeV2(validRecipeV2());
expect(first).toEqual(second);
expect(first).not.toBe(second);
expect(first.surfaces).not.toBe(second.surfaces);
```

Clone an input before assertion/hash and prove it remains deeply equal after
both operations. Prove object-key reordering retains the hash and array
reordering changes it.

- [ ] **Step 3: Run the focused V2 RED**

Run:

```text
pnpm --filter @factory/graph exec vitest run test/product-recipe-v2.test.ts
```

Expected: FAIL because the V2 exports do not exist. Record failed/passed counts
and representative missing-export diagnostics while production remains
unchanged.

- [ ] **Step 4: Add the frozen V2 types and schemas**

In `product-recipe.ts`, add `digestJson` to the existing shared import and add
the exact public types:

```ts
export type ApplicationSurfaceV2 = Omit<ApplicationSurfaceV1, "apiVersion"> & {
  apiVersion: "factory.application-surface/v2";
  ownedPageKeys: string[];
};

export type ProductRecipeV2 = Omit<
  ProductRecipeV1,
  "apiVersion" | "surfaces"
> & {
  apiVersion: "factory.product-recipe/v2";
  surfaces: ApplicationSurfaceV2[];
};
```

Construct V2 schemas from the existing V1 shapes without modifying either V1
declaration:

```ts
const rawApplicationSurfaceV2Schema = applicationSurfaceSchema
  .omit({ apiVersion: true })
  .extend({
    apiVersion: z.literal("factory.application-surface/v2"),
    ownedPageKeys: z.array(graphKeySchema).min(1).max(100),
  })
  .strict();

const rawProductRecipeV2Schema = productRecipeSchema
  .omit({ apiVersion: true, surfaces: true })
  .extend({
    apiVersion: z.literal("factory.product-recipe/v2"),
    surfaces: z.array(rawApplicationSurfaceV2Schema).min(1).max(10),
  })
  .strict();
```

Expose strict-boundary-wrapped public schemas with exact
`z.ZodType<ApplicationSurfaceV2>` and `z.ZodType<ProductRecipeV2>` types.

- [ ] **Step 5: Add V2 semantic validation and hashing**

Factor only private shared V1/V2 semantic helpers where doing so preserves the
existing V1 call order and exact messages. For V2, populate owners only from
`surface.ownedPageKeys`, then separately enforce entry/navigation membership.
Use explicit `Set`/`Map` checks and throw the ledger's exact messages.

Add:

```ts
export function assertProductRecipeV2(input: unknown): ProductRecipeV2 {
  const recipe = parseStrict(productRecipeV2Schema, input);
  assertProductRecipeV2Semantics(recipe);
  return recipe;
}

export function hashProductRecipeV2(input: unknown): Sha256Digest {
  return digestJson(assertProductRecipeV2(input)) as Sha256Digest;
}
```

Do not route V1 through the new strict recursive boundary and do not change
`assertProductRecipe`'s schema, semantic order, or return behavior.

- [ ] **Step 6: Run focused V2 GREEN and V1 compatibility**

Run:

```text
pnpm --filter @factory/graph exec vitest run test/product-recipe-v2.test.ts test/product-recipe.test.ts
```

Expected: PASS. Record counts, the fixed hash, exact error assertions, and V1
characterization parity.

---

### Task 3: Enforce the hostile own-data boundary

**Files:**

- Modify: `packages/graph/test/product-recipe-v2.test.ts`
- Modify: `packages/graph/src/product-recipe.ts`

**Interfaces:**

- Consumes: the V2 schemas/assert/hash from Task 2.
- Produces: a recursive, browser-safe, zero-caller-invocation boundary used by
  every new V2 public API and no legacy V1-only API.

- [ ] **Step 1: Add hostile schema/assert/hash RED cases**

For `applicationSurfaceV2Schema.parse`, `productRecipeV2Schema.parse`,
`assertProductRecipeV2`, and `hashProductRecipeV2`, test every depth represented
by recipe -> surfaces array -> surface -> ownership/navigation array -> item:

- own enumerable getter;
- inherited required value;
- own symbol key;
- own non-enumerable value;
- null and custom record prototypes;
- array subclass/custom prototype;
- sparse array slot;
- accessor array slot;
- hidden array slot;
- extra enumerable key.

Use a counter getter and require `calls === 0`. Accept plain null-prototype
records after copying. Require hostile failures to avoid echoing the injected
key/value and to match `/plain own records and arrays|Composition record is invalid/i`.

- [ ] **Step 2: Run hostile RED against the partial implementation**

Run:

```text
pnpm --filter @factory/graph exec vitest run test/product-recipe-v2.test.ts -t "own data|caller code|hostile"
```

Expected: at least the accessor/custom-array/non-enumerable cases fail before
the strict boundary is complete. Record counts and zero-call violations.

- [ ] **Step 3: Implement recursive descriptor copying**

Add a private `copyStrictProductRecipeBoundaryInput(input: unknown)` patterned
on the delivered Graph V3 boundary. It must inspect with `Reflect.ownKeys` and
`Object.getOwnPropertyDescriptor`, never property dereference. Arrays accept
only `Array.prototype`, own enumerable data slots for every integer in
`0..length-1`, no holes, and no extra/symbol keys other than `length`. Records
accept only `Object.prototype` or `null`, own string enumerable data properties,
and no symbol/accessor/hidden properties.

Wrap the raw V2 schemas in a `z.unknown().transform(...).pipe(...)` schema whose
fixed issue is:

```text
Input must contain only plain own records and arrays.
```

The copy must be fresh at every record/array depth. It must not use spread,
`Object.entries`, `.map`, `structuredClone`, or caller instance methods before
the descriptor checks complete.

- [ ] **Step 4: Run hostile GREEN and the complete focused set**

Run:

```text
pnpm --filter @factory/graph exec vitest run test/product-recipe-v2.test.ts test/product-recipe.test.ts
```

Expected: PASS with every hostile getter counter remaining zero and the V1
characterization unchanged.

---

### Task 4: Add explicit dispatch and the one-way Draft adapter

**Files:**

- Modify: `packages/graph/test/product-recipe-v2.test.ts`
- Modify: `packages/graph/src/product-recipe.ts`

**Interfaces:**

- Consumes: `assertProductRecipe`, `assertProductRecipeV2`, and the strict V2
  own-data copier.
- Produces:
  `VersionedProductRecipe`,
  `assertVersionedProductRecipe(input: unknown): VersionedProductRecipe`, and
  `adaptProductRecipeV1DraftToV2(input: unknown): ProductRecipeV2`.

- [ ] **Step 1: Write dispatch and adapter RED tests**

Require explicit dispatch:

```ts
expect(assertVersionedProductRecipe(validRecipeV1Data()).apiVersion).toBe(
  "factory.product-recipe/v1",
);
expect(assertVersionedProductRecipe(validRecipeV2()).apiVersion).toBe(
  "factory.product-recipe/v2",
);
```

Missing, unknown, accessor, inherited, hidden, or symbol-backed `apiVersion`
must fail without caller invocation. Unknown/missing versions use exactly:

```text
Product Recipe apiVersion must be 'factory.product-recipe/v1' or 'factory.product-recipe/v2'.
```

Require adapter output:

```ts
const adapted = adaptProductRecipeV1DraftToV2(validRecipeV1Data());
expect(adapted.apiVersion).toBe("factory.product-recipe/v2");
expect(adapted.surfaces[0]!.apiVersion).toBe("factory.application-surface/v2");
expect(adapted.surfaces[0]!.ownedPageKeys).toEqual(["home"]);
```

Add a V1 surface whose entry repeats in navigation and whose navigation repeats
no page (V1 already rejects navigation duplicates); assert entry appears once
and later visible targets retain first-seen order. Prove output and every nested
record/array are fresh, input is unchanged, and adapting a V2/unknown version
throws exactly:

```text
Product Recipe Draft adapter accepts only 'factory.product-recipe/v1'.
```

Assert no export whose name implies V2-to-V1 or down-conversion exists.

- [ ] **Step 2: Run dispatch/adapter RED**

Run:

```text
pnpm --filter @factory/graph exec vitest run test/product-recipe-v2.test.ts -t "dispatch|adapter"
```

Expected: FAIL because the new functions and union type do not exist. Preserve
the missing-export evidence.

- [ ] **Step 3: Implement strict explicit version dispatch**

Add:

```ts
export type VersionedProductRecipe = ProductRecipeV1 | ProductRecipeV2;
```

Strict-copy the input before examining the copied own `apiVersion`. Dispatch
only exact V1 and V2 strings. The V1 branch calls unchanged
`assertProductRecipe(copiedInput)`; the V2 branch calls
`assertProductRecipeV2(copiedInput)`. Every other case throws the exact frozen
version error. Do not infer a version from `ownedPageKeys` or surface versions.

- [ ] **Step 4: Implement the V1 Draft adapter**

Strict-copy and verify the exact V1 identifier before calling the unchanged V1
assertion. Build a fresh record:

```ts
const recipe = assertProductRecipe(copiedInput);
const adapted: ProductRecipeV2 = {
  ...structuredClone(recipe),
  apiVersion: "factory.product-recipe/v2",
  surfaces: recipe.surfaces.map((surface) => ({
    ...structuredClone(surface),
    apiVersion: "factory.application-surface/v2",
    ownedPageKeys: [
      ...new Set([
        surface.entryPageKey,
        ...surface.navigation.items.map(({ pageKey }) => pageKey),
      ]),
    ],
  })),
};
return assertProductRecipeV2(adapted);
```

The displayed spread/map code runs only after strict validation has produced a
trusted plain V1 value. Do not inspect `screens`, journeys, routes, or names to
derive ownership. Do not add a down-conversion function.

- [ ] **Step 5: Run dispatch/adapter GREEN and all Product Recipe tests**

Run:

```text
pnpm --filter @factory/graph exec vitest run test/product-recipe-v2.test.ts test/product-recipe.test.ts
```

Expected: PASS. Record explicit version cases, adapter ordering/freshness,
zero-call hostile cases, and absence of down-conversion.

---

### Task 5: Prove Node/browser and declaration parity

**Files:**

- Verify unchanged: `packages/graph/src/index.ts`
- Verify unchanged: `packages/graph/src/browser.ts`
- Modify: `packages/graph/test/browser-entry.test.ts`

**Interfaces:**

- Consumes: every V2 public export from `product-recipe.ts`.
- Produces: equal Node and browser runtime/type access to V2 with no Node-only
  dependency in the browser closure.

- [ ] **Step 1: Add browser export parity assertions**

Import both entrypoints in `browser-entry.test.ts` and assert the browser values
are identical references to Node values:

```ts
expect(browserGraph.applicationSurfaceV2Schema).toBe(
  nodeGraph.applicationSurfaceV2Schema,
);
expect(browserGraph.productRecipeV2Schema).toBe(
  nodeGraph.productRecipeV2Schema,
);
expect(browserGraph.assertProductRecipeV2).toBe(
  nodeGraph.assertProductRecipeV2,
);
expect(browserGraph.assertVersionedProductRecipe).toBe(
  nodeGraph.assertVersionedProductRecipe,
);
expect(browserGraph.hashProductRecipeV2).toBe(nodeGraph.hashProductRecipeV2);
expect(browserGraph.adaptProductRecipeV1DraftToV2).toBe(
  nodeGraph.adaptProductRecipeV1DraftToV2,
);
```

Run the Restaurant V2 fixture through both assertions and hashes and require
deep/hash equality.

- [ ] **Step 2: Run browser parity**

Run:

```text
pnpm --filter @factory/graph exec vitest run test/browser-entry.test.ts
```

Expected: PASS after Tasks 2–4 because the existing wildcard exports expose the
new values without an entrypoint edit. If it fails, fix only the owned Product
Recipe source/test paths; a need to edit either entrypoint is a PM stop.

- [ ] **Step 3: Expose the exact browser-safe module**

Confirm both `src/index.ts` and `src/browser.ts` already contain and retain:

```ts
export * from "./product-recipe.js";
```

Do not edit either file, enumerate a divergent subset, or import `node:crypto`,
filesystem, process, or another Node-only module.

- [ ] **Step 4: Run browser GREEN, typecheck, and declaration build**

Run:

```text
pnpm --filter @factory/graph exec vitest run test/browser-entry.test.ts test/product-recipe-v2.test.ts test/product-recipe.test.ts
pnpm --filter @factory/graph typecheck
pnpm --filter @factory/graph build
```

Expected: PASS. Inspect `packages/graph/dist/product-recipe.d.ts`,
`dist/index.d.ts`, and `dist/browser.d.ts`; require all frozen schemas, types,
and function signatures and no down-conversion declaration.

---

### Task 6: Complete writer verification and handoff

**Files:**

- Verify only: the exact four writer-owned paths plus the two byte-identical
  entrypoint verification inputs
- Record results in the writer handoff; do not edit governance or product paths
  outside the manifest

**Interfaces:**

- Consumes: completed four-path implementation.
- Produces: exact-tree evidence suitable for independent task review.

- [ ] **Step 1: Run focused and full Graph tests**

Run:

```text
pnpm --filter @factory/graph exec vitest run test/product-recipe-v2.test.ts test/product-recipe.test.ts test/browser-entry.test.ts
pnpm --filter @factory/graph test
```

Expected: both PASS. Record exact files/tests counts and elapsed time.

- [ ] **Step 2: Run static, format, and diff gates**

Run:

```text
pnpm --filter @factory/graph typecheck
pnpm --filter @factory/graph build
pnpm exec prettier --check packages/graph/src/product-recipe.ts packages/graph/test/product-recipe-v2.test.ts packages/graph/test/product-recipe.test.ts packages/graph/test/browser-entry.test.ts
git diff --check -- packages/graph/src/product-recipe.ts packages/graph/test/product-recipe-v2.test.ts packages/graph/test/product-recipe.test.ts packages/graph/test/browser-entry.test.ts
```

Expected: all exit 0. If Prettier needs a mechanical rewrite, run it only on
the four paths, rerun the focused tests, and record the action.

- [ ] **Step 3: Prove exact containment and preserved dirty work**

Compare the writer-created path delta to the exact four-path set. Separately
record the pre-existing dirty paths so they are not misclassified as writer
work. Require Task 2 capability status empty and confirm Task 3 still has the
one inventory plus exactly 21 scaffold files, no `src/**`, and no lockfile diff.
Stop on a new path outside the four-path writer set. Require `src/index.ts` and
`src/browser.ts` byte equality with their base versions.

- [ ] **Step 4: Run declarations, browser closure, hash, and sensitive gates**

Require:

- all eight public V2 type/value names in declarations;
- equal Node/browser values and identical semantic results;
- zero `node:`/filesystem/process imports reachable from `browser.ts` through
  `product-recipe.ts`;
- fixed hash
  `sha256:93fb56182c117e674a2997c878daf53e6813b25a16b1cdde1afa9c662f4579b0`;
- fresh repeated assertion/adapter output and unchanged input;
- unchanged V1 positive/error vectors;
- no credential, token, raw prompt, raw response, or private endpoint in changed
  hunks.

- [ ] **Step 5: Self-review and pause**

Inspect the actual diff against ADR-0011 and the prerequisite ledger. Report
RED and GREEN counts, exact four paths, fixed hash, V1 parity, ownership/error
coverage, hostile zero-call coverage, adapter direction/freshness, declaration
and browser parity, full test/static results, preserved Task 3 count, HEAD/
upstream, and any ambiguity. Do not stage, commit, push, start Task 2/Task 3, or
invoke provider/model/network/service/Docker/Compose work.

---

### Task 7: Execute independent acceptance and controller delivery gates

**Files:**

- Review: exact four implementation paths and the accepted ADR/ledger/plan
- Controller stage/commit: exact four implementation paths only after PM accepts

**Interfaces:**

- Consumes: writer handoff and exact four-path diff.
- Produces: reviewed, QA-passed, release-accepted, PM-accepted, delivered Product
  Recipe V2 prerequisite with local/upstream equality.

- [ ] **Step 1: Run independent Sol task review**

One read-only GPT-5.6-Sol reviewer inspects the actual diff and independently
tests V1 immutability, V2 ownership completeness/uniqueness, strict zero-call
boundaries, version dispatch, one-way Draft adaptation, hash determinism,
browser/declarations, and containment. It reports `PASS` or `FAIL`, P0/P1/P2,
and exact file/line evidence. Route findings through the same four-path writer
and re-review until no P0/P1 remains.

Initial result: `P0/P1/P2=0/1/1`, `READY_FOR_QA: NO`. The bounded repair below
closed both findings. Final same-Sol re-review is `P0/P1/P2=0/0/0` and
`READY_FOR_QA: YES`, so the prerequisite is `ready_for_qa` and may advance to
Step 2 only.

- [ ] **Step 1a: Add public-schema `safeParse` REDs**

In `product-recipe-v2.test.ts`, exercise both schema levels with duplicate
ownership and require ordinary Zod failure results:

```ts
const surfaceResult = applicationSurfaceV2Schema.safeParse(
  surfaceV2({ ownedPageKeys: ["home", "home"] }),
);
expect(surfaceResult.success).toBe(false);

const recipe = validRecipeV2();
(recipe.surfaces as Record<string, unknown>[])[0]!.ownedPageKeys = [
  "home",
  "home",
];
const recipeResult = productRecipeV2Schema.safeParse(recipe);
expect(recipeResult.success).toBe(false);
```

Do not wrap either call in `toThrow`; the RED is the current throw instead of a
`success: false` result. In the same test, retain:

```ts
expect(() => assertProductRecipeV2(recipe)).toThrow(
  "Product Recipe surface 'customer-mobile' owned page 'home' is duplicated.",
);
```

Run:

```text
pnpm --filter @factory/graph exec vitest run test/product-recipe-v2.test.ts -t "safeParse"
```

Expected RED: both public schema cases throw before returning a result, while
the assertion already exposes or must retain the exact semantic error.

- [ ] **Step 1b: Make schema refinement Zod-native and preserve assertion error**

In `product-recipe.ts`, change duplicate detection inside the V2 schema
refinement to add a Zod custom issue at the duplicate ownership index:

```ts
context.addIssue({
  code: z.ZodIssueCode.custom,
  path: ["ownedPageKeys", duplicateIndex],
  message: "Owned page keys must be unique.",
});
```

Do not throw `CompositionError` from `superRefine`. Keep
`assertProductRecipeV2` as structural parsing followed by semantic validation;
the semantic duplicate branch throws exactly:

```text
Product Recipe surface '<surfaceKey>' owned page '<pageKey>' is duplicated.
```

Do not modify `parseStrict`, either V1 schema/assertion, another error, or the
frozen public signatures.

- [ ] **Step 1c: Add the compact shared-semantics mutation matrix**

In `product-recipe-v2.test.ts`, add one table-driven test that starts from a
fresh `validRecipeV2()` for every row and mutates exactly one copied V1 semantic
branch. Cover:

- duplicate intent matcher, capability lock, surface, screen, role, flow, seed
  scenario, and acceptance journey namespaces;
- duplicate surface audience role and visible navigation target;
- duplicate screen journey, entity, and capability lists;
- unknown surface role, screen capability, and screen acceptance journey.

Each row supplies `name`, `mutate`, and the existing expected error regex or
exact message. Require every mutation to throw through
`assertProductRecipeV2`, while a new fresh fixture still passes after every row.
This is mutation-resistant coverage of already frozen shared semantics; do not
add new production behavior, identifiers, fields, or error vocabulary.

- [x] **Step 1d: Run GREEN and same-Sol re-review**

Run the focused Product Recipe/browser suite, full Graph tests, Graph typecheck
and build, scoped four-path Prettier/diff, exact four-path containment,
declaration/browser equality, fixed hash, V1 parity, hostile zero-call checks,
and changed-hunk sensitive scan. Expected: all PASS; both schema `safeParse`
calls return `success: false`; the assertion retains the exact duplicate error;
the complete mutation table passes.

Return the exact repaired tree to the same independent Sol reviewer. Only a
re-review with no open P0/P1 and `READY_FOR_QA: YES` advances to Step 2. The P2
is expected to close through the matrix but is not independently blocking QA.

Recorded result: final same-Sol re-review `P0/P1/P2=0/0/0`,
`READY_FOR_QA: YES`; targeted 3/3, focused 89/89, scoped Prettier/diff, exact
four-path containment, full Graph 547/547, typecheck/build, browser parity, and
declarations pass. Both prior findings are closed, including 16 total table
branches and exact-message coverage for the three screen-local journey/entity/
capability cases.

- [x] **Step 2: Run fresh Terra QA**

One read-only GPT-5.6-Terra pass repeats focused/full/static/hostile/browser/
declaration/hash/containment gates on the exact reviewed tree. It changes no
file and uses no provider, model, network, service, Docker, or Compose action.
It reports `PASS` or `FAIL` plus P0/P1/P2 and evidence.

The initial Terra authorization was consumed by the cyclic-input failure below;
the separately authorized repaired-tree recheck is recorded after Step 2d.

Recorded result: `P0/P1/P2=0/1/0`, `READY_FOR_RELEASE_REVIEW: NO`. Cyclic
own-data makes both public V2 schema `safeParse` calls throw `RangeError`; all
other gates pass. The prerequisite returns to `implementing`. Execute Steps
2a–2d before a fresh Terra recheck.

- [ ] **Step 2a: Add cyclic public-schema REDs**

In `product-recipe-v2.test.ts`, create one cyclic V2 surface and one cyclic V2
recipe using own enumerable data properties. For each public schema, require the
call not to throw, require `success: false`, and keep an accessor invocation
counter at zero:

```ts
let calls = 0;
const surface = surfaceV2();
Object.defineProperty(surface, "cycle", {
  enumerable: true,
  value: surface,
});
Object.defineProperty(surface, "probe", {
  enumerable: true,
  get() {
    calls += 1;
    return "not-called";
  },
});

let surfaceResult: ReturnType<typeof applicationSurfaceV2Schema.safeParse>;
expect(() => {
  surfaceResult = applicationSurfaceV2Schema.safeParse(surface);
}).not.toThrow();
expect(surfaceResult!.success).toBe(false);
expect(calls).toBe(0);
```

Build the Recipe case independently so both top-level public schemas exercise
the recursion guard. Run:

```text
pnpm --filter @factory/graph exec vitest run test/product-recipe-v2.test.ts -t "cyclic"
```

Expected RED: both calls throw `RangeError` before the repair; the production
source remains otherwise unchanged.

- [ ] **Step 2b: Add a path-local active-recursion guard**

In the strict Product Recipe boundary copier, pass one `WeakSet<object>` of
objects active on the current recursion path. Before descending into an array or
plain record, fail if it is already active; otherwise add it, recursively copy,
and remove it in a `finally` block before returning.

The guard is path-local, not a global visited set. This must pass:

```ts
const shared = { key: "shared-value" };
const acyclicAliases = { left: shared, right: shared };
```

Both aliases may be copied as fresh equal records because `shared` is no longer
active when the second branch begins. Do not preserve object identity in output
and do not reject repeated acyclic aliases.

Return the copier's existing failure result for a detected cycle. The schema
transform must convert it to the existing fixed Zod issue
`Input must contain only plain own records and arrays.` so `safeParse` returns
`success: false`.

- [ ] **Step 2c: Preserve non-schema public API errors**

Add table-driven cyclic cases for `assertProductRecipeV2`,
`hashProductRecipeV2`, `assertVersionedProductRecipe`, and
`adaptProductRecipeV1DraftToV2`. Each must throw `CompositionError`, never
`RangeError`, and never invoke an accessor. Preserve all previously frozen
duplicate, ownership, version, and Draft-adapter exact errors; do not change V1
or add a public identifier.

- [x] **Step 2d: GREEN and same-Sol re-review; authorize fresh Terra recheck**

Run targeted cyclic tests, focused Product Recipe/browser 89 plus the new cases,
full Graph, typecheck, build, scoped Prettier/diff, exact four-path containment,
browser/declarations, fixed hash, V1 parity, hostile zero-call matrix, and
sensitive scan. Require cyclic schema inputs to return `success: false`, cyclic
non-schema APIs to throw `CompositionError`, repeated acyclic aliases to pass,
and all accessor counters to remain zero.

Return the repaired exact tree to the same independent Sol reviewer. A result
with no open P0/P1 authorizes exactly one fresh independent Terra read-only
recheck, without provider, model, network, service, Docker, Compose, or file
edits. Only that fresh Terra `PASS` may advance to Step 3. No release review is
currently authorized.

Recorded same-Sol result: `P0/P1/P2=0/0/0`, `READY_FOR_QA: YES`. Independent
probes close direct/indirect record, self-array, and mixed cycles; schema
`safeParse` returns `success: false` without `RangeError`; non-schema APIs retain
exact errors; aliases pass with distinct copies; invocation and echo counts are
zero. Fresh evidence passes cycle 8/8, focused 97/97, full Graph 555/555, diff,
and exact four-path containment. Exactly one fresh Terra recheck is authorized
now; Step 3 remains blocked.

Recorded final Terra result: `P0/P1/P2=0/0/0`,
`READY_FOR_RELEASE_REVIEW: YES`. Fresh evidence passes cycle 8/8, focused
97/97, full Graph 555/555, `safeParse` 4/4, shared semantics 16/16,
typecheck/build/format/diff, independent cycle/alias probes, zero getter calls,
no hostile echo, exact `CompositionError`, and the fixed hash. A shell-filter
note in the harness was resolved by separate successful runs. Exactly one final
read-only Sol release review is authorized; no other later gate is active.

- [x] **Step 3: Run independent Sol release review**

One new read-only GPT-5.6-Sol reviewer evaluates the accepted ADR, exact public
contract, complete review/QA history, security boundary, V1 compatibility,
diff, and release evidence. It returns `RELEASE_ACCEPT` or `RELEASE_REJECT`
with P0/P1/P2. Any open P0/P1 returns to PM; no commit/push is authorized.

Historical authorization at that checkpoint: exactly one final independent
read-only Sol review was active on that exact tree,
provider/model/network/service/Docker/Compose-free.

Recorded result: `RELEASE_REJECT`, `P0/P1/P2=0/3/2`. The release authority is
consumed and the prerequisite returns to `implementing`. Execute one coherent
same-writer design-level repair in Steps 3a–3f; do not split it into unrelated
patch rounds.

- [ ] **Step 3a: RED the fixed no-echo public-schema envelope**

For both `applicationSurfaceV2Schema` and `productRecipeV2Schema`, add
table-driven extra-key and invalid-enum inputs whose injected key/value tokens
are unique sentinels. Require `safeParse` not to throw, `success` to be `false`,
exactly one issue, issue path `[]`, and exact issue message:

```text
Input must contain only plain own records and arrays.
```

Serialize `result.error` and `result.error.message`; require neither hostile
sentinel to occur. Include failures at the root and at a nested Surface or
navigation record so raw Zod paths cannot leak through the public schema.

- [ ] **Step 3b: RED throwing Proxy reflection**

Wrap otherwise valid Surface and Recipe inputs in Proxies whose
`getPrototypeOf`, `ownKeys`, or `getOwnPropertyDescriptor` trap increments a
counter and throws a sentinel error. For each public schema require:

```ts
expect(() => {
  result = schema.safeParse(proxy);
}).not.toThrow();
expect(result!.success).toBe(false);
expect(result!.error.issues).toEqual([
  {
    code: "custom",
    path: [],
    message: "Input must contain only plain own records and arrays.",
  },
]);
```

Record the Proxy trap count as unavoidable and greater than zero; do not assert
zero. Require the thrown sentinel absent from all returned error text. Retain
the existing zero-call assertions for ordinary getters/accessors and prove they
still remain zero.

- [ ] **Step 3c: RED the exact depth budget**

Build own-data chains from root depth 0 with a Proxy observation sentinel at the
boundary. At depth 64, require its reflection trap count to prove the copier
reaches that value before the raw schema rejects the synthetic extra structure;
at depth 65, require the trap count to remain zero because the copier rejects
before descent. Both public-schema results use the same single fixed issue and
neither throws. Separately require ordinary schema-valid Surface and Recipe
fixtures to pass and return fresh typed values. Repeat at both public entrypoints
so neither can emit `RangeError`.

Also retain cycle rejection and repeated acyclic alias acceptance with distinct
fresh copies. The RED must distinguish the explicit depth bound from the cycle
guard.

- [ ] **Step 3d: RED exact duplicate schema diagnostics**

For a duplicate at index `1`, require the Surface result's only semantic issue
to have exact message `Owned page keys must be unique.` and path
`["ownedPageKeys", 1]`. Require the nested Recipe issue to have the same message
and a path whose final segment is `1` and whose preceding segments locate the
Surface ownership array. Keep the assertion check:

```text
Product Recipe surface 'customer-mobile' owned page 'home' is duplicated.
```

This semantic duplicate issue is not a strict-copy/raw-structural failure and
must not be collapsed to the fixed boundary issue.

- [ ] **Step 3e: Implement one typed public-schema boundary**

Keep raw structural schemas private. In the public typed schema transform:

1. strict-copy within `try/catch`, including every reflection call;
2. enforce active-cycle detection and the depth-64 check before descent;
3. call the raw structural schema through `safeParse` inside the boundary;
4. on copy exception/failure or raw structural failure, add exactly the fixed
   custom issue at path `[]` and return `z.NEVER` without forwarding the raw
   issue/error;
5. on success, return the fresh typed value to the separate ownership-duplicate
   semantic refinement, which retains its exact message/path.

Use one constant for the fixed issue text and one constant for maximum depth
`64`. Do not echo caught exceptions. Do not read Proxy properties after a
reflection error. Preserve all valid V2 output types, freshness, fixed hash,
assert/hash/dispatch/adapter `CompositionError` behavior, V1 behavior, and
browser exports.

- [x] **Step 3f: Complete GREEN and hand off to the same final reviewer**

Run the new no-echo, Proxy, depth, and duplicate-diagnostic tests plus the full
prior cycle/alias/hostile/shared-semantic/V1/browser/declaration/hash matrix,
full Graph suite, typecheck, build, scoped four-path Prettier/diff, exact
four-path containment, and sensitive scan. Report exact new counts; remove
stale current-state counts only from the handoff, not historical evidence.

Then pause for, in order:

1. the same independent Sol re-review with no open P0/P1;
2. exactly one fresh independent Terra read-only recheck of the repaired tree;
3. only after Terra `PASS`, exactly one final independent Sol read-only release
   review.

All three are provider/model/network/service/Docker/Compose-free and read-only.
PM acceptance and delivery stay blocked until final `RELEASE_ACCEPT` with no
open P0/P1.

Writer handoff: RED A 0/6, B 2/8, C 8/12, D 0/1; GREEN A 6/6, B 8/8, C 12/12,
D 1/1. Focused 115/115, full Graph 573/573, typecheck, build, format, diff,
browser, declarations, fixed hash, dispatch, adapter, V1 parity, and exact
four-path containment pass. No `.superpowers` report was written because it is
outside the frozen manifest; the dedicated ledger is the PM handoff.

Recorded same-reviewer result: `RELEASE_ACCEPT`, `P0/P1/P2=0/0/2`. All prior
P1s, exact duplicate diagnostics, and current state/evidence findings are closed.
The nested-Zod path-prefix P2 is deferred and nonblocking only for the frozen
top-level APIs; ADR-0011 IMP-005/ABT-004 require closure before either public
schema is composed inside another Zod schema. The Proxy feasibility wording P2
is closed in accepted ADR-0011 SEC-001/SEC-002/ABT-003 without changing its
status, date, or decision scope.

- [x] **Step 3g: Run one fresh Terra design-repair recheck**

Recorded result: `P0/P1/P2=0/2/0`, plus the deferred nested-composability P2.
Zod v3 base `safeParse`/`safeParseAsync` call `getParsedType(data)` before the
custom `_parse`, so a root `then` getter can execute and a revoked/throwing Proxy
can escape before the boundary. The prerequisite returns to `implementing`.

- [x] **Step 3h: RED all five custom-schema entrypoints**

For both `applicationSurfaceV2Schema` and `productRecipeV2Schema`, run the same
cases through `parse`, `safeParse`, `parseAsync`, `safeParseAsync`, and `spa`:

1. an own enumerable root `then` getter with an invocation counter;
2. a revoked Proxy and a Proxy whose reflection trap throws a sentinel;
3. valid input for typed/fresh sync and async parity;
4. ordinary invalid input for standard safe versus throwing/rejecting behavior.

Require root getter calls `0` for all five entrypoints. Safe methods and `spa`
must resolve/return `success: false` with exactly the fixed path-`[]` custom
issue and no hostile echo. `parse` must throw, and `parseAsync` must reject, with
the corresponding fixed `ZodError`, never a raw exception. Valid results from
all entrypoints must be deeply equal, fresh, and correctly typed.

Run a focused RED command that selects these entrypoint cases. Expected: the
base Zod wrappers invoke `then` or leak Proxy failures before the repair; record
exact per-entrypoint failures for both schemas.

- [x] **Step 3i: Implement `directSafeParse` without base safe wrappers**

In the custom public schema class, add private overloads for sync and async
results and one internal implementation:

```ts
directSafeParse(
  data: unknown,
  params: { path?: (string | number)[]; errorMap?: z.ZodErrorMap } | undefined,
  asyncFlag: false,
): z.SafeParseReturnType<unknown, Output>;
directSafeParse(
  data: unknown,
  params: { path?: (string | number)[]; errorMap?: z.ZodErrorMap } | undefined,
  asyncFlag: true,
): Promise<z.SafeParseReturnType<unknown, Output>>;
```

Construct only the minimal internal parse context required by Zod:

```ts
const ctx = {
  common: {
    issues: [],
    async: asyncFlag,
    contextualErrorMap: params?.errorMap,
  },
  path: params?.path ?? [],
  schemaErrorMap: this._def.errorMap,
  parent: null,
  data,
  parsedType: z.ZodParsedType.unknown,
};
```

Do not call `getParsedType`, `super.safeParse`, or `super.safeParseAsync`. For
sync, call `this._parseSync({ data, path: ctx.path, parent: ctx })`. For async,
call the current schema's `this._parse(...)` with `ctx.common.async: true` and
await only its internal parse result. A `valid` result with no issues returns
`{ success: true, data: result.value }`; dirty/aborted results return
`{ success: false, error: new z.ZodError(ctx.common.issues) }`. If parsing aborts
without an issue or any setup/reflection/parse step throws, replace all details
with exactly one fixed issue:

```ts
{
  code: z.ZodIssueCode.custom,
  path: [],
  message: "Input must contain only plain own records and arrays.",
}
```

Never include the caught error, input key, input value, or caller path in this
fixed fallback.

- [x] **Step 3j: Override the five frozen entrypoints**

Override `safeParse` and `safeParseAsync` to call `directSafeParse` with false
and true respectively. Override `parse` to call custom `safeParse`, return data
on success, and throw its `ZodError` on failure. Override `parseAsync` to await
custom `safeParseAsync`, return data on success, and throw its `ZodError` on
failure. Assign `spa` as a function that delegates to the custom
`safeParseAsync`; it must never retain the Zod base alias.

Preserve the inherited public method signatures and standard sync/async return
semantics. Do not add a public method, export the internal helper, edit Zod, or
implement `~validate`/nested wrappers. ADR-0011 IMP-005/ABT-004 continue to ban
nested use until separately designed.

- [x] **Step 3k: Complete GREEN and writer handoff**

Run the complete five-entrypoint/two-schema RED matrix to GREEN, then all A–D,
no-echo/Proxy/depth/duplicate/cycle/alias/ordinary-getter/shared-semantics tests,
focused and full Graph suites, typecheck, build, scoped four-path format/diff,
browser/declarations, fixed hash, dispatch/adapter/V1 parity, exact-four
containment, and sensitive scan. Record fresh exact counts.

Writer result: RED 22 passing/10 failing; GREEN 32/32. Retained matrices pass A
6/6, B 8/8, C 12/12, and D 1/1. Focused passes 147/147 and full Graph passes
605/605; typecheck/build/format/diff, browser, fixed hash, V1 parity, and exact
four-path containment pass.

- [x] **Step 3l: Run the same final-reviewer Sol re-review**

Recorded result: `PASS`, `P0/P1/P2=0/0/1`, `READY_FOR_QA YES`. Fresh independent
evidence passes hostile entrypoints 30/30 plus valid parity 2/2 (32 total),
invalid semantics 10/10, envelope 18/18, cycles 8/8, focused 147/147, full Graph
605/605, typecheck, format, diff, six runtime checks, fixed hash, declarations,
V1 parity, dispatch, and exact-four containment. The deferred nested-Zod P2
remains documented, prohibited, and nonblocking for these top-level APIs.

- [x] **Step 3m: Run one fresh Terra entrypoint recheck**

Recorded result: actionable `P0/P1/P2=0/0/0`, the separately deferred and
prohibited nested-Zod P2, and `READY_FOR_FINAL_RELEASE_REVIEW YES`. Fresh tests
pass 32/32, independent probes 50/50, A/B/C/D 6/8/12/1, envelope 18/18, cycles
8/8, shared semantics 16/16, focused 147/147, full Graph 605/605, typecheck,
build, format, diff, browser, fixed hash, V1 parity, dispatch, adapter, and
exact-four containment. Terra changes no file and uses no provider, model,
network, service, Docker, or Compose action.

- [x] **Step 3n: Run one final independent Sol release review**

Recorded result: `RELEASE_REJECT`, actionable `P0/P1/P2=0/3/1`, plus the
separately deferred/prohibited nested-Zod P2. The prerequisite returns to
`implementing`; Step 4 remains blocked. The accidental pnpm wrapper/network
attempt changed no accepted product file. `pnpm-workspace.yaml` is restored
exactly to `HEAD` blob `286cf7f5643db97142c425abe7c8e5d5663f5d65` and SHA-256
`253208fa7c1b64372c219b9e19cef15ed70ca93b66a4d5c4c4d2297a5aff8880`;
workspace and lockfile statuses are clean.

#### Current executable repair — supersedes all earlier unchecked steps

- [x] **Step 3o: RED hostile optional parse parameters**

In `packages/graph/test/product-recipe-v2.test.ts`, drive both schemas through
`parse`, `safeParse`, `parseAsync`, `safeParseAsync`, and `spa` with throwing and
revoked `params` Proxies. Require zero params traps/property reads, no raw
escape, no echo, standard parse throw/reject versus safe failure semantics, the
fixed explicit message, and exact root path `[]`. Also prove a benign
`{ path, errorMap }` cannot alter that path or message. Record the 10-method RED
matrix before production changes; every schema/method combination covers both
hostile params variants.

- [x] **Step 3p: RED the global array-length budget**

Add focused surface and recipe boundary cases for `Array(101)` and a sparse
Proxy reporting length 20,000. `Array.isArray` may invoke a Proxy meta-trap under
ADR SEC-001. Inside the caught array branch, require the own `length` data
descriptor to be obtained at most once without invoking a value getter, its
value to be a nonnegative integer no greater than 100, and rejection before
`getPrototypeOf`, `Reflect.ownKeys`, numeric descriptors, or slot iteration.
Require own-key and numeric-descriptor trap counts zero, no raw escape/echo, and
the fixed root error. Add a valid length-100 array at a schema-relevant position
and prove normal descent/validation.

- [x] **Step 3q: Implement the two finite boundary repairs**

In `packages/graph/src/product-recipe.ts`, preserve all five public method
signatures but ignore optional params completely. Remove params from internal
context creation; pass only input data and an explicit sync/async flag, always
using root path `[]`, no contextual error map, and the fixed explicit message.
In the strict copier, after `Array.isArray`, enter `try` before further
reflection. Read the own length data descriptor once, validate it as an integer
in 0..100, and only then inspect prototype, own keys, numeric descriptors, or
slots. Preserve depth/cycle/alias behavior and all valid recipe shapes.

- [x] **Step 3r: Complete GREEN and same-reviewer handoff**

Run the new params and array-budget tests to GREEN, then the complete prior
entrypoint/envelope/cycle/shared-semantics/A–D matrix, focused and full Graph,
typecheck, build, format, diff, browser/declarations, fixed hash, V1,
dispatch/adapter, exact-four containment, and sensitive scan. The sole writer
pauses. Exactly one same-Sol read-only re-review follows; a PASS with no P0/P1
authorizes one fresh Terra read-only recheck, whose PASS authorizes one final
independent Sol release review. No later gate is authorized now.

Recorded handoff: RED 34 passing/36 failing; GREEN params/array-budget 56/56,
five-entrypoint 32/32, A/B/C/D 6/8/12/1, focused 203/203, and full Graph 661/661.
Direct typecheck/build/format/diff, browser, fixed hash, V1 parity, exact-four
containment, and restored clean workspace/lockfile gates pass. The writer is
paused and state remains `implementing`. Exactly one same-final-reviewer
read-only re-review is the sole active gate. No further governance or later gate
is authorized before its verdict.

- [x] **Step 3s: Run the same final Sol re-review**

Recorded result: `RELEASE_ACCEPT`, actionable `P0/P1/P2=0/0/0`, the separately
deferred/prohibited nested-Zod P2, and `READY_FOR_QA YES`. Evidence passes
repaired params/array 56/56, entrypoints 32/32, focused 203/203, full Graph
661/661, independent params 50/50, arrays 6/6, invalid semantics 10/10,
V1/hash/adapter/dispatch/browser 12/12, typecheck, format, diff, and exact-four
containment. The technical and governance P1s are closed.

- [x] **Step 3t: Run one fresh direct-runtime Terra recheck**

The prerequisite is `ready_for_qa`. Exactly one fresh independent Terra
read-only recheck of the exact repaired tree is authorized. Use direct runtime
commands only; do not invoke a pnpm wrapper, network, install, provider/model,
service, Docker, or Compose action. Independently recheck hostile params across
both schemas/five entrypoints, the array-length order/budget and trap counts,
the prior entrypoint/envelope/cycle/shared-semantics matrices, focused/full
Graph, type/build/format/diff, browser/hash/V1/adapter/dispatch, and exact-four
containment. A PASS with no actionable P0/P1 authorizes PM to record the result
and then authorize one still-required final independent Sol release review.
Acceptance and every later gate remain blocked.

Recorded result: actionable `P0/P1/P2=0/0/0`, the separately
deferred/prohibited nested-Zod P2, and `READY_FOR_FINAL_RELEASE_REVIEW YES`.
Direct-only evidence passes targeted 56/56, entrypoints 32/32, focused 203/203,
full Graph 661/661, retained A–D, envelope, cycle, shared semantics, TypeScript
`--noEmit`, format, and diff. Independent params pass 40/40 and arrays 6/6;
dist, browser, fixed hash, V1 parity, dispatch, adapter, exact-four containment,
and workspace restoration pass. No pnpm wrapper, network, or install was used.

- [x] **Step 3u: Run one final direct-runtime Sol release review**

Exactly one final independent Sol read-only release review of the exact repaired
tree is authorized. Use direct runtime commands only; do not invoke a pnpm
wrapper, network, install, provider/model, service, Docker, or Compose action.
It must return `RELEASE_ACCEPT` or `RELEASE_REJECT` with actionable P0/P1/P2 and
the separately deferred nested-Zod P2. Only `RELEASE_ACCEPT` with no actionable
P0/P1 allows Step 4. PM may then freshly accept and authorize the exact delivery
manifest; delivery itself and Task 2/Task 3 remain blocked until those
records, and Task 2/Task 3 remain blocked until pushed local/upstream equality.

Recorded result: `RELEASE_ACCEPT`, actionable `P0/P1/P2=0/0/0`, with the
separately deferred/prohibited nested-Zod P2. No further QA or review is
required.

- [x] **Step 4: Perform fresh PM acceptance reconciliation**

PM reruns the focused/full/static/format/diff/containment/declaration/browser/
hash/sensitive gates, verifies no implementation drift since review, and
records all verdicts and exact counts in the prerequisite ledger. Only a clean
tree with no open P0/P1 may be marked `accepted`.

Recorded result: PM accepts the reviewed exact tree on 2026-08-14. “Clean” for
this gate means no implementation drift, no workspace/lockfile diff, exact-four
implementation containment, and no dirty path outside the classified 17-path
delivery manifest plus preserved 22-path Task 3 baseline; the worktree is not
globally clean because the residual baseline must not be deleted or stashed.

- [x] **Step 5: Deliver exactly once through the controller**

The controller explicitly stages the exact 17 paths frozen in the prerequisite
ledger and no other path. The manifest contains the four accepted implementation
paths plus 13 deliberate governance paths; the exact excluded residual contains
the Task 3 inventory plus 21 scaffolds. Prove Expected17/Actual17 equality, zero
missing/unexpected staged paths, zero unstaged/untracked manifest paths, cached
diff and sensitive scan, workspace current/HEAD blob equality, zero lockfile
diff, and exact 22-path residual equality. Then create one commit with exact
subject:

```text
feat(graph): add product recipe v2 contracts
```

Push the current branch without force. Prove local `HEAD` equals upstream and
record commit hash, subject, all 17 paths, push result, equality, and the exact
22-path residual status. Do not amend, force-push, rewrite history, stage a
residual path, or claim global worktree cleanliness.

Recorded result: commit `0aeae1c0ba7afcb1f074329a30e51bb18c8aacfa`, exact
subject, exact 17 paths, successful non-force push, local `HEAD` equal to
upstream, tracked dirty 0, staged 0, and exact 22-path residual. The remote
moved-repository notice is informational; no remote configuration change is
authorized now.

- [x] **Step 6: Close prerequisite and refreeze downstream after equality**

After equality is recorded, mark this prerequisite `delivered` and consume its
delivery authority. PM may then amend/refreeze the Restaurant shared manifest
for Product Recipe V2 before authorizing Task 2 and Task 3. Until that separate
record exists, both remain `planned`/`blocked`, Task 2 remains unwritten, and
Task 3 inventory plus 21 scaffolds remain preserved.

Recorded result: equality is proven and delivery authority is consumed. The
prerequisite is `delivered`. PM separately refreezes the shared Restaurant
contract for Product Recipe V2 at formatted SHA-256
`ffa017cf14cd911495d70d8cf490bb637b570057235d3d841657e0f7c732b732` and resumes
the path-disjoint Task 2/Task 3 plans under their prior conditional founder
authority. This closure does not itself authorize Task 4/5.

---

## Plan Self-Review

- [ ] **Spec coverage:** Confirm every ADR decision appears in Tasks 1–7:
      identifiers/types/schemas, bounded unique ownership, complete ownership,
      entry/navigation subsets, V1 immutability, explicit dispatch, fixed hash,
      Draft-only up-conversion, no down-conversion, hostile own data, Node/browser
      parity, declarations, exact manifest, gates, and delayed Task 2/Task 3.
- [ ] **Placeholder scan:** Run
      `rg -n "T[B]D|T[O]DO|implement[ ]later|fill[ ]in[ ]details|appropriate[ ]error[ ]handling|similar[ ]to[ ]Task" docs/superpowers/plans/2026-08-14-product-recipe-v2-prerequisite.md`
      and require zero matches.
- [ ] **Type consistency:** Confirm every occurrence uses
      `ApplicationSurfaceV2`, `ProductRecipeV2`, `VersionedProductRecipe`,
      `applicationSurfaceV2Schema`, `productRecipeV2Schema`,
      `assertProductRecipeV2`, `assertVersionedProductRecipe`,
      `hashProductRecipeV2`, and `adaptProductRecipeV1DraftToV2` with the frozen
      signatures.

## Execution Handoff

Plan complete. Use exactly one GPT-5.6-Sol integration writer for Tasks 1–6,
then pause for the independent Task 7 gates. No Task 2 or Task 3 writer is
authorized before Product Recipe V2 prerequisite delivery equality.
