# Restaurant dual-surface compiler design

Status: Accepted under the founder's 2026-08-14 standing instruction to keep
accepting and iterating when the work follows the Restaurant product goal.

Date: 2026-08-14

## Outcome

Compile the delivered Restaurant Application Graph V3 into one independently
runnable local product with two real surfaces:

- customer mobile: Home, Menu, Dish Detail, Cart, Checkout, Orders, Order
  Detail, and Profile;
- merchant desktop: Dashboard, Menu Management, Orders, Kitchen Queue, Tables,
  Users/Roles, and Settings.

Both surfaces use one generated API and one generated state store for catalog,
cart, orders, inventory, simulated payment, tables, identity, policy, workflow,
and audit. The complete generated source tree is visible and deterministic.

This slice does not rebuild Workbench, add a cloud deployment path, use a real
payment provider, or change Application Graph V1/V2/V3.

## Decision

Add a dedicated Restaurant V3 compilation channel inside `@factory/compiler`.
Keep the existing V1 compiler and every V1 byte/digest unchanged. Keep generic
V2 unsupported. Task 4 delivers the shared V3 plan, preview projection, runtime
foundation, and customer target. Task 5 adds the merchant target, shared
cross-surface runtime behavior, and the final V3 dispatch from the existing
strict versioned compiler entry.

The generated application is a dependency-free Node ESM project. One local
server owns both page trees and JSON APIs. It uses a versioned, deterministic
file-backed local state document with atomic replacement, optimistic versions,
idempotency receipts, server-derived values, and append-only audit events. This
is a credible local Alpha runtime, not a claim of production cloud durability.
Prisma/Postgres, managed identity, production payments, and deployment remain
later production-platform work.

## Alternatives

### Chosen: dedicated V3 Restaurant target

- Strictly accepts the existing Published Application Graph V3 envelope.
- Builds a V3-native plan and runtime; there is no V3-to-V1 graph conversion.
- Reuses version-neutral generated-file path, digest, determinism, and bundle
  contracts.
- Copies only reviewed Task 3 source closure required by each surface.
- Keeps new files focused and leaves the existing compiler monolith stable.

Trade-off: the new local runtime is deliberately narrower than the older
Prisma/Nest/Next V1 runtime. It is sufficient for the Restaurant Alpha and is
explicitly not a managed-production architecture.

### Rejected: make all V1 compiler plugins accept V1 or V3

This changes every target plugin and its plan types, expanding the regression
surface across accepted V1 output. It is disproportionate to the two-surface
product slice.

### Rejected: project V3 into a private or serialized V1 graph

This obscures Graph identity, breaks the V3 hash and lock boundary, risks old
route/profile assumptions, and creates an undeclared down-conversion path.

## Production boundary

The only production input is the existing strict wrapper:

```ts
export interface PublishedApplicationGraphCompilationInput {
  readonly publishedGraph: PublishedApplicationGraphInput;
  readonly compositionLock: CapabilityCompositionLockV1;
}
```

The public Restaurant functions are:

```ts
export function generateRestaurantCustomerApplicationBundle(
  input: PublishedApplicationGraphCompilationInput,
  options?: GenerateApplicationBundleOptions,
): GeneratedApplicationBundle;

export function generateRestaurantProductBundle(
  input: PublishedApplicationGraphCompilationInput,
  options?: GenerateApplicationBundleOptions,
): GeneratedApplicationBundle;
```

Both functions:

1. use `adaptPublishedApplicationGraph` and accept only exact
   `factory.application-graph/v3` Published envelopes;
2. verify the envelope hash with `hashApplicationGraphV3`;
3. recreate and compare the capability composition lock against the Published
   V3 graph hash;
4. validate the exact Restaurant surfaces, pages, roles, journeys,
   field-authority registry, and binding-policy closure;
5. fail before rendering any file on Draft, snapshot, raw graph, V1/V2, stale
   hash, wrong lock, non-Restaurant V3, or hostile wrapper input;
6. render twice and require an identical safe generated-file set.

At the end of Task 5, `generateVersionedApplicationBundle` delegates a valid
Restaurant V3 input to `generateRestaurantProductBundle`. Its V1 branch remains
byte-identical, V2 remains explicitly unsupported, and a non-Restaurant V3
remains explicitly unsupported.

## V3-native compilation plan

`RestaurantProductPlanV1` is private serializable data. It contains:

- Published revision and Graph hashes;
- exact customer and merchant surface/page order;
- routes, recipes, blocks, regions, screen intents, and source keys;
- roles, step-scoped journeys, field authorities, and typed binding policies;
- deterministic seed scenarios;
- Task 3 source modules and Fine Dining experience tokens;
- the generated runtime schema version and source origins.

It never contains a V1 graph, Draft state, provider data, credentials, raw model
material, functions, accessors, symbols, or non-plain records.

## Generated product layout

Task 4 produces the customer subset; Task 5 completes the same root with the
merchant subset:

```text
restaurant-product-<revision>/
  package.json
  README.md
  graph/manifest.json
  src/server.mjs
  src/runtime/state.mjs
  src/runtime/policy.mjs
  src/runtime/api.mjs
  src/runtime/seed.mjs
  src/generated/restaurant-ui.mjs
  src/generated/fine-dining.mjs
  src/customer/app.mjs
  src/customer/styles.css
  src/merchant/app.mjs
  src/merchant/styles.css
  test/customer-journey.test.mjs
  test/merchant-journey.test.mjs
  test/shared-state.test.mjs
```

Generated source contains no `@factory/*` runtime import. The compiler embeds
the reviewed copyable ESM source and its origin/digest manifest. It does not use
`eval` or `Function`. Generated app modules use static imports only.

The local runtime listens on loopback by default. It exposes health, catalog,
cart, order, payment, customer profile, menu, inventory, kitchen, table,
users/roles, settings, and audit endpoints needed by the exact pages. Every
mutation validates role, policy permission, flow transition, expected record
version, and idempotency key. Client input cannot set totals, order/payment
state, inventory movement, role state, or audit fields.

The state document begins at schema version 1. Startup performs a deterministic
schema check/migration before health becomes ready. Cleanup removes only the
explicit generated state path used by that app instance.

## Surface rendering

The compiler selects exact screen source with `@factory/screen-recipes` and
Fine Dining source/tokens with `@factory/experience-recipes`. These are the only
new workspace dependencies of `@factory/compiler`; no external coordinate is
added.

Customer navigation remains exactly Home, Menu, Cart, Orders, Profile, while
Dish Detail, Checkout, and Order Detail remain owned customer pages outside the
visible bottom tabs. Merchant navigation remains the exact seven-item sidebar.

The generated controller binds Graph ports to JSON APIs and uses the selected
Task 3 renderers for page blocks and states. It treats rendered child markup as
trusted reviewed source but escapes every API/user value. Routes, page order,
block order, source origin, and source digest are deterministic.

## Draft preview boundary

`DraftPreviewSnapshotV2` intentionally contains identifiers and checksums, not
Graph bytes. Preview therefore uses a trusted resolver without expanding the
Graph or snapshot contract:

```ts
export type ResolveDraftPreviewGraphV2 = (
  snapshot: DraftPreviewSnapshotV2,
) => ApplicationGraphV3;

export function renderRestaurantDraftPreviewSurface(
  snapshotInput: unknown,
  surfaceKey: "customer-mobile" | "merchant-desktop",
  resolveGraph: ResolveDraftPreviewGraphV2,
  requestedAt: string,
): RestaurantDraftPreviewSurfaceDocumentV2;
```

The renderer accepts `state === "rendering"`, rejects stale/expired/terminal
snapshots, verifies the resolved V3 graph checksum, then returns a deeply frozen
page/navigation/theme/binding projection. The output type contains no files,
root directory, source archive, Compilation ID, deploy/export/ZIP/Git method,
or artifact manifest. It performs no filesystem or network write.

The same pure `projectRestaurantSurface` function drives production and
preview semantics, preventing a fake Workbench-only preview.

## Delivery split

Task 4 is serialized because it owns the shared production/preview contracts.
It delivers:

- strict V3 Restaurant input and plan;
- source selection and origin/digest manifest;
- pure shared surface projection;
- preview-only resolver boundary;
- local runtime foundation and exact eight-page customer application;
- customer health, migration, role denial, server totals, idempotency, source,
  and cleanup tests.

Task 5 starts only after Task 4 review and commit. It delivers:

- exact seven-page merchant application;
- menu/inventory/order/kitchen/table/settings actions;
- read-only Users/Roles page, because the Graph declares no role mutation;
- customer/merchant shared-state and audit tests;
- final dual-surface bundle and V3 versioned compiler dispatch.

Control Plane publication/Workbench invocation is intentionally deferred to
Task 6. Task 4/5 prove the compiler entry and generated runnable application;
they do not falsely claim that the current V1-only lifecycle service can create
a V3 publication from the Workbench.

## Verification

Task 4 and Task 5 each use TDD plus one independent review. Heavy provider,
Docker, and repeated PM/Terra/Sol loops are not required because this is a
deterministic local implementation under an accepted architecture.

Required combined evidence:

- existing V1 bundle/file/digest parity and complete compiler suite;
- strict V3 Published/hash/lock admission and V2/non-Restaurant rejection;
- exact 8 + 7 routes, navigation, blocks, ports, source origin, and digests;
- generated ESM syntax/import and no private runtime imports;
- migration then health;
- customer place-order journey and merchant visibility;
- menu/inventory changes reflected on customer pages;
- kitchen status reflected in customer order timeline;
- role denials and server-authoritative field rejection;
- optimistic concurrency, idempotent replay, conflicting replay rejection, and
  append-only audit semantics;
- preview/production projection parity plus preview lifecycle/checksum failure
  cases and proof of no artifact/Compilation/export side effect;
- deterministic second compilation with identical file paths, bytes, and
  digests;
- cleanup of the generated state and artifact directory;
- typecheck, build, format, diff, exact path containment, dependency/lock,
  browser import, and sensitive-material checks.

## Explicit non-goals

- no Application Graph or Snapshot schema change;
- no V3-to-V1 conversion;
- no generic multi-version target-plugin refactor;
- no Workbench or Control Plane V3 publishing change;
- no Prisma/Postgres replacement claim, production payment, cloud deployment,
  Docker/Compose requirement, provider/model call, credential, or secret;
- no editor, ZIP, Git export, or reverse parsing;
- no merchant role mutation that is absent from Graph bindings.
