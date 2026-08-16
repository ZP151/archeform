# Restaurant customer compiler Task 4 implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compile an exact Published Restaurant Application Graph V3 into an
independently runnable eight-page customer application, plus a preview-only
Draft Snapshot V2 projection that cannot create or export artifacts.

**Architecture:** Add a V3-native Restaurant target under `packages/compiler`
without changing Graph schemas or converting V3 to V1. A pure serializable plan
drives both production and preview surface semantics. Production renders a safe
generated Node ESM application; preview returns only a frozen in-memory
projection through a trusted Graph resolver.

**Tech Stack:** TypeScript 5.7, Vitest 2.1, existing Graph V3/Snapshot V2 and
Capabilities APIs, Task 3 screen/experience registries, Node 22 ESM and built-in
HTTP/filesystem APIs in generated source.

## Global Constraints

- Base commit: `e60d178dec7d2ca332043accaf150a67573c240f`.
- Do not modify any Application Graph or Snapshot schema.
- Do not create a V3-to-V1 projection, serialized adapter, or generic target
  plugin union.
- Existing V1 compiler file bytes/digests and full tests must remain unchanged;
  V2 and generic V3 version dispatch remain unsupported in Task 4.
- Production accepts only a strict `PublishedApplicationGraphV3Input` envelope
  plus a canonical composition lock bound to its V3 hash.
- Preview accepts only `DraftPreviewSnapshotV2` as caller-owned lifecycle input;
  a trusted resolver supplies the exact Graph V3 bytes.
- No external dependency, provider/model/network call, Docker/Compose run,
  cloud/deployment path, real payment, credential, raw prompt/response, or
  Workbench/Control Plane change.
- Add only workspace dependencies `@factory/screen-recipes` and
  `@factory/experience-recipes` to `@factory/compiler`; lock changes are limited
  to the existing compiler importer.
- Use direct existing runtime binaries. Do not run PATH `pnpm`, `corepack`, or
  any install/resolution command.
- Generated source must contain no private `@factory/*` runtime import and no
  `eval` or `Function` construction.

## Frozen path manifest

Create:

- `packages/compiler/src/targets/restaurant-v3/contracts.ts`
- `packages/compiler/src/targets/restaurant-v3/plan.ts`
- `packages/compiler/src/targets/restaurant-v3/source-registry.ts`
- `packages/compiler/src/targets/restaurant-v3/surface-projection.ts`
- `packages/compiler/src/targets/restaurant-v3/preview.ts`
- `packages/compiler/src/targets/restaurant-v3/runtime-state.ts`
- `packages/compiler/src/targets/restaurant-v3/runtime-api.ts`
- `packages/compiler/src/targets/restaurant-v3/customer-target.ts`
- `packages/compiler/src/targets/restaurant-v3/index.ts`
- `packages/compiler/test/fixtures/restaurant-product-v3.ts`
- `packages/compiler/test/restaurant-v3-contract.test.ts`
- `packages/compiler/test/restaurant-v3-surface-projection.test.ts`
- `packages/compiler/test/restaurant-v3-preview.test.ts`
- `packages/compiler/test/restaurant-customer-runtime.test.ts`
- `packages/compiler/test/restaurant-customer-target.test.ts`

Modify:

- `packages/compiler/src/index.ts`
- `packages/compiler/package.json`
- `pnpm-lock.yaml`

No other path is writable. Needing another path stops the writer for controller
reconciliation.

---

### Task 1: Freeze a real Published Restaurant V3 fixture and strict input

**Files:**

- Create: `packages/compiler/test/fixtures/restaurant-product-v3.ts`
- Create: `packages/compiler/test/restaurant-v3-contract.test.ts`
- Create: `packages/compiler/src/targets/restaurant-v3/contracts.ts`
- Create: `packages/compiler/src/targets/restaurant-v3/plan.ts`

**Interfaces:**

- Consumes: `composeRestaurantProductGraph`, `hashApplicationGraphV3`,
  `adaptPublishedApplicationGraph`, `createCapabilityCompositionLock`.
- Produces:

```ts
export type RestaurantProductCompilationInputV1 = {
  readonly publishedGraph: PublishedApplicationGraphV3Input;
  readonly compositionLock: CapabilityCompositionLockV1;
};

export type RestaurantSurfaceKey = "customer-mobile" | "merchant-desktop";

export function assertRestaurantProductCompilationInput(
  input: unknown,
): RestaurantProductCompilationInputV1;

export function planRestaurantProduct(
  input: RestaurantProductCompilationInputV1,
): RestaurantProductPlanV1;
```

- [ ] **Step 1: Write the fixture and failing strict-boundary tests**

Build one deterministic Product Intent, Experience Brief, base Draft, Graph V3,
Published envelope, and V3-bound composition lock. Pin the Published graph hash
and assert exactly 15 pages, 7 journeys, 99 field authorities, and 135 binding
policies.

Add table-driven rejection tests for raw Graph, Draft revision, Snapshot V2,
Published V1/V2, wrong V3 hash, wrong composition-lock graph checksum,
non-Restaurant V3, missing/extra wrapper keys, inherited keys, accessors,
symbols, non-enumerable fields, non-plain records, cycles, and hostile reflection
errors. Assert one fixed redacted `Error` and zero caller getter/conversion calls.

- [ ] **Step 2: Run the focused RED**

Run:

```powershell
cd packages/compiler
node node_modules/vitest/vitest.mjs run test/restaurant-v3-contract.test.ts
```

Expected: failures because the target contract and planner do not exist.

- [ ] **Step 3: Implement strict input capture and V3-native planning**

Use descriptor-based plain-own copying before any business read. Dispatch with
`adaptPublishedApplicationGraph`, require graph version V3, recompute
`hashApplicationGraphV3`, and recreate the composition lock from the V3 graph
hash and package selections. Compare canonical plain data without invoking
caller methods.

Build `RestaurantProductPlanV1` only from validated Graph V3 fields. Freeze and
round-trip it as JSON to prove serializability. It must contain no Graph V1
value or Draft/preview lifecycle state.

- [ ] **Step 4: Run GREEN and mutation tests**

Run the Task 1 command. Expected: every valid/pinned and hostile case passes.

### Task 2: Project exact surface semantics and source closure

**Files:**

- Create: `packages/compiler/src/targets/restaurant-v3/source-registry.ts`
- Create: `packages/compiler/src/targets/restaurant-v3/surface-projection.ts`
- Create: `packages/compiler/test/restaurant-v3-surface-projection.test.ts`
- Modify: `packages/compiler/package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**

```ts
export type RestaurantSurfacePlanV1 = {
  readonly apiVersion: "factory.restaurant-surface-plan/v1";
  readonly surfaceKey: RestaurantSurfaceKey;
  readonly pages: readonly RestaurantPagePlanV1[];
  readonly navigation: readonly RestaurantNavigationItemV1[];
  readonly source: {
    readonly origins: readonly RestaurantSourceOriginV1[];
    readonly module: string;
    readonly digest: `sha256:${string}`;
  };
};

export function projectRestaurantSurface(
  plan: RestaurantProductPlanV1,
  surfaceKey: RestaurantSurfaceKey,
): RestaurantSurfacePlanV1;
```

- [ ] **Step 1: Write the exact customer projection RED**

Assert page order:

```text
customer-home, customer-menu, customer-dish-detail, customer-cart,
customer-checkout, customer-orders, customer-order-detail, customer-profile
```

Assert visible navigation is exactly Home/Menu/Cart/Orders/Profile. Assert every
page route, recipe, region, block, Domain/Flow/Policy port, source origin, and
source digest matches Task 2/3. Reject a merchant source key, missing/extra/
reordered block, invented port, private runtime import, and nondeterministic
source bytes.

- [ ] **Step 2: Run the projection RED**

Run:

```powershell
cd packages/compiler
node node_modules/vitest/vitest.mjs run test/restaurant-v3-surface-projection.test.ts
```

Expected: missing projection/source functions.

- [ ] **Step 3: Implement source selection and pure projection**

Use `selectRestaurantRecipeSource` only for the eight customer recipe keys and
include Fine Dining source/tokens separately. Compute source digests through the
existing compiler SHA-256 helper. Validate no private import or cross-surface
source remains. Deep-freeze the projection.

- [ ] **Step 4: Run projection GREEN**

Run Task 2 focused tests and import the selected ESM through a data URL. Expected:
all assertions pass and the module parses without `eval`/`Function`.

### Task 3: Add preview-only Snapshot V2 rendering

**Files:**

- Create: `packages/compiler/src/targets/restaurant-v3/preview.ts`
- Create: `packages/compiler/test/restaurant-v3-preview.test.ts`

**Interfaces:**

```ts
export type ResolveDraftPreviewGraphV2 = (
  snapshot: DraftPreviewSnapshotV2,
) => ApplicationGraphV3;

export type RestaurantDraftPreviewSurfaceDocumentV2 = {
  readonly apiVersion: "factory.restaurant-draft-preview-surface/v2";
  readonly disposition: "preview-only";
  readonly snapshotId: string;
  readonly graphChecksum: `sha256:${string}`;
  readonly surface: RestaurantSurfacePlanV1;
};

export function renderRestaurantDraftPreviewSurface(
  snapshotInput: unknown,
  surfaceKey: RestaurantSurfaceKey,
  resolveGraph: ResolveDraftPreviewGraphV2,
  requestedAt: string,
): RestaurantDraftPreviewSurfaceDocumentV2;
```

- [ ] **Step 1: Write preview lifecycle REDs**

Test valid customer rendering from `state: "rendering"`. Reject ready, active,
disposed, expired, invalid dates, stale resolver graph, checksum mismatch,
wrong surface, resolver exception echo, and resolver Graph V1/V2. Spy on
filesystem/artifact helpers and assert zero calls.

Assert recursively that preview output has none of these keys:
`files`, `artifacts`, `rootDirectory`, `compilationId`, `deploy`, `export`,
`zip`, `git`.

- [ ] **Step 2: Run preview RED**

Run:

```powershell
cd packages/compiler
node node_modules/vitest/vitest.mjs run test/restaurant-v3-preview.test.ts
```

Expected: missing preview renderer.

- [ ] **Step 3: Implement the pure preview boundary**

Validate with `assertDraftPreviewSnapshotV2`, require rendering state, compare
`requestedAt` to `expiresAt`, resolve once, validate Graph V3, compare
`hashApplicationGraphV3` to `graphChecksum`, and use the same surface projector
as production. Return deep-frozen plain data only.

- [ ] **Step 4: Run preview GREEN**

Run Task 3 tests. Expected: exact projection parity and zero artifact side
effects.

### Task 4: Generate the local customer runtime

**Files:**

- Create: `packages/compiler/src/targets/restaurant-v3/runtime-state.ts`
- Create: `packages/compiler/src/targets/restaurant-v3/runtime-api.ts`
- Create: `packages/compiler/test/restaurant-customer-runtime.test.ts`

**Interfaces:**

```ts
export type RestaurantRuntimeSourceV1 = {
  readonly stateModule: string;
  readonly apiModule: string;
  readonly seedModule: string;
  readonly serverModule: string;
};

export function renderRestaurantCustomerRuntime(
  plan: RestaurantProductPlanV1,
): RestaurantRuntimeSourceV1;
```

- [ ] **Step 1: Write generated-runtime REDs**

Materialize generated modules into a temporary directory owned by the test.
Start on loopback port 0 and verify migration then `/health`. Exercise catalog,
dish detail, cart add/update/delete, server-derived totals, checkout with
simulated payment, orders/detail, and profile read/write.

Test customer/manager denial, expected-version conflict, same-key same-payload
idempotent replay, same-key different-payload rejection, non-overridable total/
status/payment/audit fields, append-only audit, restart persistence, malformed
JSON/body bounds, and cleanup of the explicit state/artifact directory.

- [ ] **Step 2: Run runtime RED**

Run:

```powershell
cd packages/compiler
node node_modules/vitest/vitest.mjs run test/restaurant-customer-runtime.test.ts
```

Expected: generated runtime functions absent.

- [ ] **Step 3: Implement generated Node ESM runtime**

Render static source strings only. State writes use a temporary sibling file
then atomic rename. The store has schema version 1, deterministic seed IDs,
record versions, idempotency receipts, and audit records with Published revision
ID. The HTTP boundary caps URL/body/string/array sizes, binds loopback by
default, returns fixed non-echoing errors, and never trusts client-derived
authoritative values.

- [ ] **Step 4: Run runtime GREEN and cleanup proof**

Run Task 4 tests twice. Expected: both pass, second run is deterministic, and
no server, state file, or temporary directory remains.

### Task 5: Render the eight-page customer bundle

**Files:**

- Create: `packages/compiler/src/targets/restaurant-v3/customer-target.ts`
- Create: `packages/compiler/src/targets/restaurant-v3/index.ts`
- Create: `packages/compiler/test/restaurant-customer-target.test.ts`
- Modify: `packages/compiler/src/index.ts`

**Interfaces:**

```ts
export function generateRestaurantCustomerApplicationBundle(
  input: PublishedApplicationGraphCompilationInput,
  options?: GenerateApplicationBundleOptions,
): GeneratedApplicationBundle;
```

- [ ] **Step 1: Write bundle REDs**

Assert exact safe file paths, graph hash, root directory, package scripts,
README, graph/source manifest, customer app/controller/styles, runtime files,
and generated tests. Assert all eight routes render; dynamic Dish/Order routes
resolve; only five bottom tabs render; no merchant route/source exists.

Compile twice and assert identical path/content/digest sets. Reject all invalid
Task 1 inputs before any renderer call.

- [ ] **Step 2: Run target RED**

Run:

```powershell
cd packages/compiler
node node_modules/vitest/vitest.mjs run test/restaurant-customer-target.test.ts
```

Expected: missing target and public export.

- [ ] **Step 3: Implement bundle rendering**

Use existing `GeneratedApplicationBundle`, `assertSafeGeneratedFileSet`, and
SHA helpers. Generate a dependency-free package with `start` and `test` scripts,
complete sources, local-runtime README, and source-origin manifest. The web
controller statically imports the copied UI module, fetches only declared APIs,
and delegates form/actions using declared Graph ports.

- [ ] **Step 4: Run target GREEN and execute generated tests**

Run Task 5 focused tests, materialize the bundle, then run:

```powershell
node --test <generated-root>/test/customer-journey.test.mjs
```

Expected: eight-page source, customer journey, denial, idempotency, and cleanup
all pass.

### Task 6: Preserve compiler compatibility and finish Task 4

**Files:** all frozen Task 4 paths.

- [ ] **Step 1: Run focused Task 4 matrix**

```powershell
cd packages/compiler
node node_modules/vitest/vitest.mjs run test/restaurant-v3-contract.test.ts test/restaurant-v3-surface-projection.test.ts test/restaurant-v3-preview.test.ts test/restaurant-customer-runtime.test.ts test/restaurant-customer-target.test.ts
```

- [ ] **Step 2: Run full compatibility**

```powershell
cd packages/compiler
node node_modules/vitest/vitest.mjs run
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
node node_modules/typescript/bin/tsc -p tsconfig.json

cd ../graph
node node_modules/vitest/vitest.mjs run

cd ../capabilities
node ../graph/node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
node node_modules/vitest/vitest.mjs run
```

Expected: all existing and new tests pass; V1 pins stay unchanged; generic V3
dispatch remains unsupported until Task 5.

- [ ] **Step 3: Run static and containment gates**

Use direct Prettier on exactly the 18 frozen paths. Run `git diff --check`.
Prove Expected18/Actual18, no manifest/snapshot coordinate drift beyond the two
workspace dependencies in the compiler importer, no private generated import,
no sensitive material, and no Graph/Task2/Task3 source diff.

- [ ] **Step 4: Request one independent review**

The reviewer checks strict Published admission, no down-conversion, preview
non-exportability, runtime authority/idempotency, exact eight-page/source
closure, V1 parity, and containment. Any finding returns to one focused local
TDD repair; no provider or heavy release loop is added.

- [ ] **Step 5: Controller delivery**

After review P0/P1=0, stage the exact Task 4 manifest, verify cached diff and
sensitive scan, commit with subject:

```text
feat(compiler): add restaurant customer v3 target
```

Push without force and prove local `HEAD` equals upstream before Task 5 starts.
