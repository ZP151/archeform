# Product Recipe V2 prerequisite ledger

Date: 2026-08-14

State: `delivered`

Contract: `frozen`

Owner: `integration`

Base and upstream: `8230197241589865f289c223fc346b6d91a438ae`

## Founder decision and authority

ADR-0011 is accepted. The founder response was recorded in founder chat on
2026-08-14 exactly as:

> `参考以下总结，若符合项目目标，则持续接受而迭代。`

PM confirms that the referenced summary matches the current evidence and the
accepted Prompt-to-Polished Restaurant Product goal. It explicitly recommends
ADR-0011, so the response is founder acceptance of the additive Product Recipe
V2 migration and authority to continue the documented Restaurant vertical
slice.

Prospectively, full task review + Terra QA + Sol release review + PM acceptance

- controller delivery is reserved for serialized/cross-package contracts,
  security/authority boundaries, and final release. Ordinary deterministic
  component/page work uses TDD plus one independent review. Repair caps govern
  real-model, provider, live-service, destructive, or other high-cost reruns, not
  ordinary provider-free local fixes. Founder reapproval is unnecessary for an
  ordinary P1 or reversible choice inside the accepted Restaurant scope. It is
  still required for product-scope change, irreversible architecture, external
  credentials/authority, cloud/deployment, or a surviving load-bearing issue.

This prerequisite is a serialized public contract and therefore uses the full
gate. Exactly one GPT-5.6-Sol integration writer is authorized on the four paths
below. There is no Task 2 writer and no Task 3 writer. Task 2 and Task 3 remain
`planned` and `blocked` until this prerequisite is delivered and local `HEAD`
equals upstream.

## Reconciled baseline

- Branch: `feat/governed-composition-capability-foundry`.
- Local `HEAD` and upstream are equal at
  `8230197241589865f289c223fc346b6d91a438ae`.
- Delivered Graph V3 remains immutable and its consumed delivery gate is not
  replayed.
- Task 2 made zero capability-path writes.
- Task 3's stopped baseline is preserved exactly: one reuse-inventory document
  and 21 untracked scaffold files, consisting of `package.json`, `tsconfig.json`,
  and one test file in each of seven UI/recipe packages. There is no Task 3
  `src/**` file and no lockfile diff.
- Existing dirty governance documents and Task 2/Task 3 plans/specification are
  preserved. They are outside this implementation writer's ownership.

## Frozen public contract

### Identifiers and types

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

export type VersionedProductRecipe = ProductRecipeV1 | ProductRecipeV2;
```

`ApplicationSurfaceV2` retains every V1 surface field unchanged and adds the
required `ownedPageKeys`. `ProductRecipeV2` retains every V1 recipe field,
continues to use `factory.screen-intent/v1`, and permits only V2 surfaces.

### Schemas and functions

```ts
export const applicationSurfaceV2Schema: z.ZodType<ApplicationSurfaceV2>;
export const productRecipeV2Schema: z.ZodType<ProductRecipeV2>;

export function assertProductRecipeV2(input: unknown): ProductRecipeV2;
export function assertVersionedProductRecipe(
  input: unknown,
): VersionedProductRecipe;
export function hashProductRecipeV2(input: unknown): Sha256Digest;
export function adaptProductRecipeV1DraftToV2(input: unknown): ProductRecipeV2;
```

`applicationSurfaceV2Schema` is strict and defines
`ownedPageKeys: z.array(graphKeySchema).min(1).max(100)`. Declared order is
meaning and duplicates are rejected. `productRecipeV2Schema` is strict, retains
the V1 field bounds, and requires `surfaces` length 1..10 and `screens` length
1..100.

`assertProductRecipe` remains V1-only with the unchanged
`(input: unknown) => ProductRecipeV1` signature and unchanged acceptance,
rejection, error, and returned-data behavior. `applicationSurfaceSchema`,
`productRecipeSchema`, `ApplicationSurfaceV1`, and `ProductRecipeV1` remain
unchanged.

`assertVersionedProductRecipe` accepts only the two exact recipe identifiers and
dispatches explicitly. It does not guess from fields, upgrade V1, or downgrade
V2. `hashProductRecipeV2` returns `digestJson(assertProductRecipeV2(input)) as
Sha256Digest`. The fixed canonical positive vector in the plan hashes to
`sha256:93fb56182c117e674a2997c878daf53e6813b25a16b1cdde1afa9c662f4579b0`.

### V2 ownership semantics

For every V2 surface:

- `ownedPageKeys` is non-empty, has at most 100 entries, and is unique;
- every owned page is a declared screen;
- `entryPageKey` is in that same surface's `ownedPageKeys`;
- every visible `navigation.items[].pageKey` is in that same surface's
  `ownedPageKeys`;
- visible navigation remains unique and retains V1 bounds and semantics.

Across the recipe, each declared screen occurs in exactly one surface's
`ownedPageKeys`. An unknown page, unowned screen, duplicate within one surface,
or ownership by two surfaces fails closed. Ownership grants no runtime, tenant,
actor, Policy, transition, payment, inventory, or server authority.

### Draft adapter

`adaptProductRecipeV1DraftToV2` accepts only a valid Product Recipe V1. It
returns a fresh deep output with `factory.product-recipe/v2` and V2 surfaces.
Each `ownedPageKeys` is the ordered de-duplicated sequence of the V1
`entryPageKey`, followed by visible `navigation.items[].pageKey`. It derives no
ownership from screens, routes, journeys, keys, or naming conventions. It never
mutates, republishes, or changes the V1 input. Because V1 cannot represent
non-navigation-owned pages, callers add such ownership only to a new mutable V2
Draft. No public or private V2-to-V1 adapter is authorized.

### Strict recursive boundary

Every newly exported V2 schema/assert/hash/dispatch/adapter boundary rejects an
accessor, symbol key, non-enumerable key or array slot, inherited property,
sparse array, array subclass/custom array prototype, non-plain record, or extra
field at any depth. For ordinary non-Proxy inputs it does so without invoking a
getter, accessor, subclass method, or instance method. Plain records may have
`Object.prototype` or `null` prototype. Production logic consumes only copied
own enumerable data descriptor values. V1-only public APIs must not be changed
to obtain this property.

The recursion budget is exactly 64: root depth is 0, values at depth 64 are
accepted, and descent to depth 65 fails before recursion. Cycles fail closed;
repeated acyclic aliases remain valid and are copied into distinct fresh output.
Ordinary getters, accessors, subclasses, and instance methods have an absolute
zero-invocation requirement. JavaScript reflection can invoke a Proxy meta-trap,
so Proxy trap non-invocation is infeasible and not promised; all reflection/trap
exceptions must be caught and converted to the fixed no-echo public-schema issue
with no raw exception escaping.

### Frozen semantic errors

The following `CompositionError` messages are exact:

```text
Product Recipe surface '<surfaceKey>' owned page '<pageKey>' is duplicated.
Product Recipe surface '<surfaceKey>' owns unknown screen '<pageKey>'.
Product Recipe surface '<surfaceKey>' entry screen '<pageKey>' is not owned.
Product Recipe surface '<surfaceKey>' navigation target '<pageKey>' is not owned.
Product Recipe screen '<pageKey>' belongs to more than one surface.
Product Recipe screen '<pageKey>' has no surface owner.
Product Recipe apiVersion must be 'factory.product-recipe/v1' or 'factory.product-recipe/v2'.
Product Recipe Draft adapter accepts only 'factory.product-recipe/v1'.
```

Schema/recursive-boundary failures continue through `parseStrict` and must not
echo hostile keys or values. Existing shared errors for duplicate roles,
capabilities, journeys, surfaces, screens, visible navigation, unknown roles,
unknown capabilities, and unknown journeys remain unchanged where applicable.

## Exact implementation writer manifest — four paths

The single Sol writer may modify exactly:

1. `packages/graph/src/product-recipe.ts`
2. `packages/graph/test/product-recipe-v2.test.ts` (create)
3. `packages/graph/test/product-recipe.test.ts`
4. `packages/graph/test/browser-entry.test.ts`

`packages/graph/src/index.ts` and `packages/graph/src/browser.ts` already export
`./product-recipe.js` by wildcard. They are read-only verification inputs and
must remain byte-identical; changing either would be unnecessary scope drift.

No manifest, dependency, lockfile, compiler, capability, UI registry, Task 2,
Task 3, Graph V1/V2/V3, adapter, service, Docker, Compose, or documentation path
is writer-owned. A need to expand this list stops the writer and returns to PM.

## Frozen TDD and verification gates

The writer must preserve production files while collecting RED evidence for:

- the exact Restaurant customer surface owning eight pages while exposing only
  the exact five bottom tabs, proving the equivalent V1 fixture rejects;
- V2 positive validation, fixed hash, fresh repeat output, and input
  non-mutation;
- ownership duplicate/unknown/missing/cross-surface and entry/navigation subset
  failures with exact messages;
- explicit two-version dispatch and unknown/missing/mismatched versions;
- V1-to-V2 Draft adaptation, ordered de-duplication, freshness, and V1-only
  rejection;
- strict recursive own-data rejection with zero getter/caller invocation at
  schema, assert, hash, dispatch, and adapter boundaries;
- exact V1 fixture result/error parity before and after implementation;
- Node/browser value and type export parity.

Required writer gates:

```text
pnpm --filter @factory/graph exec vitest run test/product-recipe-v2.test.ts test/product-recipe.test.ts test/browser-entry.test.ts
pnpm --filter @factory/graph test
pnpm --filter @factory/graph typecheck
pnpm --filter @factory/graph build
pnpm exec prettier --check packages/graph/src/product-recipe.ts packages/graph/test/product-recipe-v2.test.ts packages/graph/test/product-recipe.test.ts packages/graph/test/browser-entry.test.ts
git diff --check -- packages/graph/src/product-recipe.ts packages/graph/test/product-recipe-v2.test.ts packages/graph/test/product-recipe.test.ts packages/graph/test/browser-entry.test.ts
```

The writer also records exact four-path containment, declaration emission for all
frozen types/functions/schemas, dynamic Node/browser export equality, zero
Node-only imports in browser closure, fixed hash equality, V1 fixture/hash pins,
deterministic fresh-output equality, and a changed-hunk sensitive-material scan.

## Acceptance and delivery sequence

1. One Sol writer completes focused RED/GREEN, full gates, self-review, and a
   handoff containing exact paths, counts, hashes, zero-call evidence, and any
   ambiguity. The writer does not commit or push.
2. One independent GPT-5.6-Sol task reviewer inspects the frozen contract,
   actual four-path diff, hostile boundaries, V1 immutability, adapter direction,
   browser/declaration parity, and all test evidence. P0/P1 findings return to
   the same manifest for ordinary local repair and re-review.
3. One fresh read-only GPT-5.6-Terra QA pass runs without provider, model,
   network, service, Docker, or Compose activity and returns `PASS` or `FAIL`
   with P0/P1/P2 counts.
4. One independent read-only GPT-5.6-Sol release review returns
   `RELEASE_ACCEPT` or `RELEASE_REJECT` with P0/P1/P2 counts. No open P0/P1 may
   advance.
5. PM freshly verifies the frozen contract, diff, all gates, and absence of
   implementation drift, then may mark the prerequisite `accepted`.
6. The controller alone may explicitly stage the exact accepted delivery
   manifest frozen below, prove staged equality/diff/sensitive gates, create one
   commit with exact subject `feat(graph): add product recipe v2 contracts`,
   push without force, and prove local/upstream equality plus the exact preserved
   Task 3 residual baseline.
7. Only after PM records that delivery equality may PM amend/refreeze the
   Restaurant Task 2/Task 3 manifest for Product Recipe V2 and authorize their
   disjoint writers. Task 3's inventory and 21 files remain preserved meanwhile.

## Current entrypoint repair authorization

The fresh Terra design recheck returns `P0/P1/P2=0/2/0` plus the already
deferred nested-composability P2. The prerequisite returns to `implementing`.

- **P1 — sync Zod wrapper introspection:** Zod v3 `safeParse` computes
  `getParsedType(data)` before the custom schema `_parse` boundary. A root own
  enumerable `then` getter can therefore execute before the strict copier.
  `parse` delegates to this path.
- **P1 — async Zod wrapper introspection/escape:** `safeParseAsync` performs the
  same pre-boundary introspection, and raw reflection errors from revoked or
  throwing Proxies can escape before the custom boundary. `parseAsync` and the
  `spa` alias inherit this path.
- **Deferred P2 — nested Zod composability:** ADR-0011 IMP-005/ABT-004 remains
  controlling. Nested schema use stays prohibited and this repair does not add
  wrapper or Standard Schema integration.

Root verification of Zod v3 `types.js` confirms that `safeParse` and
`safeParseAsync` call `getParsedType(data)` before `_parse`; `parse` and
`parseAsync` delegate to those methods. The exact repair therefore must not call
`super.safeParse` or `super.safeParseAsync`.

At that historical entrypoint-repair checkpoint, one same GPT-5.6-Sol writer
was authorized within the unchanged exact four-path maximum manifest. The
custom public schema implemented an internal
`directSafeParse(data, params, asyncFlag)` that:

1. constructs the minimal Zod parse context with fixed
   `parsedType: z.ZodParsedType.unknown`, without inspecting input data;
2. calls the current synchronous schema through `this._parseSync` for sync or
   `this._parse` for async;
3. converts parse status and accumulated issues to the standard
   `SafeParseReturnType` and `ZodError` shapes;
4. catches every exception and returns the single exact fixed custom issue at
   path `[]`, without echoing input or exception material.

The schema overrides `parse`, `safeParse`, `parseAsync`, and `safeParseAsync`
without calling the base wrappers, and its `spa` alias delegates to the custom
safe async path. `parse` throws and `parseAsync` rejects with the `ZodError` from
the corresponding safe result. Valid sync/async output remains typed, fresh,
and equal. Raw structural collapse, duplicate diagnostics, depth/cycle/alias
behavior, fixed hash, assertion/dispatch/adapter errors, V1, and browser parity
remain unchanged.

RED must cover both public schemas and all five entrypoints: root `then` getter
calls remain zero; revoked/throwing Proxy exceptions never escape and return or
throw/reject only the fixed `ZodError`; valid sync/async outputs agree; and
standard parse versus safe-parse behavior is preserved. `~validate`, nested
wrappers, and other integration are outside the frozen public names and remain
unauthorized under the deferred P2.

The five-entrypoint writer GREEN is handed off. RED records 22 passing and 10
failing cases; GREEN passes 32/32. The retained matrices pass A 6/6, B 8/8,
C 12/12, and D 1/1. Focused tests pass 147/147 and full Graph passes 605/605;
typecheck, build, format, diff, browser, fixed hash, V1 parity, and exact
four-path containment are green.

The same final Sol reviewer now returns `PASS`, `P0/P1/P2=0/0/1`, and
`READY_FOR_QA YES`. Independent evidence passes hostile entrypoints 30/30 plus
valid parity 2/2 (32 total), invalid semantics 10/10, envelope 18/18, cycles
8/8, focused 147/147, full Graph 605/605, typecheck, format, diff, six runtime
checks, fixed hash, declarations, V1 parity, dispatch, and exact-four
containment. The remaining P2 is the already documented nested-Zod
path-prefix composability debt; it is nonblocking only while nested use remains
prohibited under ADR-0011 IMP-005/ABT-004.

Fresh independent Terra QA now returns actionable `P0/P1/P2=0/0/0`, the one
separately deferred and prohibited nested-Zod P2, and
`READY_FOR_FINAL_RELEASE_REVIEW YES`. Evidence passes the fresh entrypoint set
32/32, independent probes 50/50, retained A/B/C/D 6/8/12/1, envelope 18/18,
cycles 8/8, shared semantics 16/16, focused 147/147, full Graph 605/605,
typecheck, build, format, diff, browser, fixed hash, V1 parity, dispatch,
adapter, and exact-four containment.

At that historical checkpoint, the prerequisite remained `ready_for_qa` with
QA complete and the writer paused.
Final independent Sol release review returns `RELEASE_REJECT`, actionable
`P0/P1/P2=0/3/1`, plus the one separately deferred nested-Zod P2. The prior QA
PASS is historical evidence only. The prerequisite returns to `implementing`.

- **P1-A — hostile parse parameters escape:** the current parse-context helper
  dereferences `params` before its catch boundary. Both schemas across all five
  entrypoints allow a throwing/revoked `params` Proxy to escape (10/10), and a
  caller `params.path` can replace the frozen root path. Public method
  signatures remain accepted, but the five top-level methods must not inspect,
  dereference, or use `params`; `path`/`errorMap` behavior is not promised. The
  internal context takes only data plus the explicit sync/async flag and always
  uses the fixed root path `[]` and explicit fixed message. RED and GREEN prove
  both schemas × five methods with a throwing/revoked params Proxy: zero calls,
  no raw escape, and the standard fixed root error/result.
- **P1-B — unbounded array reflection/work:** the copier trusts array length and
  walks keys/slots before raw Zod bounds. Freeze one global maximum array length
  of 100. `Array.isArray` may itself trap under the accepted Proxy feasibility
  contract. Once it identifies an array, enter the caught reflection region,
  obtain the own `length` data descriptor at most once without invoking a value
  getter, and require a nonnegative integer no greater than 100. Only then call
  `getPrototypeOf`, `Reflect.ownKeys`, inspect numeric descriptors, or iterate
  slots. RED and GREEN cover `Array(101)`, a 20,000-length sparse Proxy with
  length-descriptor count at most one and own-key/numeric-descriptor counts
  zero, no raw escape/echo, and a valid length-100 array that descends normally.
- **P1-C — conflicting current authority:** the stale bottom “Next gate” in
  `docs/project-status.md` must be replaced by the present repair/review
  sequence. No earlier full-writer sequence remains executable authority.
- **P2 — historical checkbox ambiguity:** earlier unchecked plan steps are
  historical instructions superseded by recorded later evidence, not current
  execution checkboxes. They must be labelled as such rather than falsely
  checked. The deferred nested-Zod P2 remains documented and prohibited.

During final review, the reviewer accidentally attempted a pnpm wrapper/network
action outside its read-only authority. It made no accepted product change.
`pnpm-workspace.yaml` was restored exactly: current and `HEAD` blob are both
`286cf7f5643db97142c425abe7c8e5d5663f5d65`, SHA-256 is
`253208fa7c1b64372c219b9e19cef15ed70ca93b66a4d5c4c4d2297a5aff8880`, and its
status is clean. `pnpm-lock.yaml` is also clean. The four implementation files
remain the reviewed pre-repair tree, with no product drift caused by that
attempt. Their pre-repair SHA-256 values are respectively
`aa49fe72d80c27f5951173a1520312b1886de7e7aeb2f7d7ce3c9127011e08b8`,
`cd234c6dff910f1aaa6bec25a58694afd70ad8d1b2aa6332050478bdc96869ba`,
`528cbe72d52e44d0078bed7a6c26ef6c3f76e4dcf475a52878948d5d8f13b028`, and
`5d2ae73a5080c8b2763a65325b28fd04b6159ae32d0685baf9197b320b9af97b` in the
manifest order recorded above.

Exactly one same GPT-5.6-Sol writer is reopened for RED then GREEN in the same
four implementation paths only. No dependency, manifest, lockfile, export-path,
Task 2, Task 3, or other product write is authorized. After handoff, the same
Sol reviewer must re-review the exact repaired tree; only its PASS with no open
P0/P1 authorizes one fresh Terra read-only recheck, and only Terra PASS
authorizes one final independent Sol release review. PM acceptance, delivery,
commit, push, Task 2/Task 3 writers, install, dependency resolution, cloud, and
deployment remain blocked.

The final Steps 3o–3r writer handoff is GREEN. RED recorded 34 passing and 36
failing cases. GREEN passes the combined params/array-budget set 56/56, the
five-entrypoint set 32/32, retained A/B/C/D 6/8/12/1, focused 203/203, and full
Graph 661/661. Direct typecheck, build, format, diff, browser, fixed hash, V1
parity, and exact-four containment gates pass. `pnpm-workspace.yaml` and
`pnpm-lock.yaml` remain restored and clean. The writer is paused; the
prerequisite remained `implementing` at that handoff. Exactly one read-only
re-review by the same final Sol reviewer was the sole active gate on that exact
tree. No further governance edit or later gate was authorized until its verdict.

The same final Sol re-review now returns `RELEASE_ACCEPT`, actionable
`P0/P1/P2=0/0/0`, the separately deferred/prohibited nested-Zod P2, and
`READY_FOR_QA YES`. Evidence passes repaired params/array 56/56, entrypoints
32/32, focused 203/203, full Graph 661/661, independent params 50/50, independent
arrays 6/6, invalid semantics 10/10, V1/hash/adapter/dispatch/browser 12/12,
typecheck, format, diff, and exact-four containment. The technical and governance
P1s are closed.

The prerequisite advances to `ready_for_qa`; the writer remains paused.
Exactly one fresh independent Terra read-only recheck of this exact tree is
authorized using direct runtime commands only. It must not use a pnpm wrapper,
network access, installation, provider/model, service, Docker, or Compose. A
subsequent final independent Sol release review remains required and blocked
pending Terra PASS plus PM reconciliation. PM acceptance, delivery, commit,
push, Task 2/Task 3 writers, dependency resolution, cloud, and deployment remain
blocked.

The fresh direct-runtime Terra recheck now returns actionable
`P0/P1/P2=0/0/0`, the separately deferred/prohibited nested-Zod P2, and
`READY_FOR_FINAL_RELEASE_REVIEW YES`. Direct-only evidence passes targeted
params/array 56/56, entrypoints 32/32, focused 203/203, full Graph 661/661,
retained A/B/C/D, envelope, cycle, shared semantics, TypeScript `--noEmit`,
format, and diff gates. Independent params pass 40/40 and arrays 6/6; dist,
browser, fixed hash, V1 parity, dispatch, adapter, exact-four containment, and
workspace restoration also pass. Terra used no pnpm wrapper, network, or
installation.

The prerequisite remains `ready_for_qa` with QA complete and the writer paused.
Exactly one final independent Sol read-only release review of this exact tree is
authorized using direct runtime commands only. It must not use a pnpm wrapper,
network access, installation, provider/model, service, Docker, or Compose. A
`RELEASE_ACCEPT` with no actionable P0/P1 authorizes PM to perform fresh
acceptance reconciliation and, only after acceptance, authorize the exact
delivery manifest. Delivery, commit, push, and Task 2/Task 3 remain blocked now;
Task 2/Task 3 remain blocked until pushed local/upstream equality is recorded.

## Final release acceptance and controller delivery freeze

The final independent Sol release review returns `RELEASE_ACCEPT`, actionable
`P0/P1/P2=0/0/0`, with the one separately deferred/prohibited nested-Zod P2.
No further QA or review is required. Fresh PM reconciliation accepts the exact
reviewed tree on 2026-08-14: the frozen contract, direct-runtime evidence,
exact-four implementation containment, V1 immutability, Node/browser parity,
workspace/lock restoration, no actionable P0/P1, and absence of implementation
drift all remain satisfied. State advances to `accepted`.

The exact controller delivery manifest is 17 paths:

1. `docs/adr/adr-0011-product-recipe-surface-page-ownership.md`
2. `docs/agent-workstreams/2026-08-10-archeform-codex-iteration.md`
3. `docs/delivery-policy.md`
4. `docs/iterations/2026-08-14-current-direction-and-delivery-assessment.md`
5. `docs/project-status.md`
6. `docs/roadmap.md`
7. `docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md`
8. `docs/superpowers/ledgers/2026-08-12-application-graph-v3-prerequisite.md`
9. `docs/superpowers/ledgers/2026-08-14-product-recipe-v2-prerequisite.md`
10. `docs/superpowers/plans/2026-08-12-restaurant-product-recipe-task2.md`
11. `docs/superpowers/plans/2026-08-12-ui-registry-task3.md`
12. `docs/superpowers/plans/2026-08-14-product-recipe-v2-prerequisite.md`
13. `docs/superpowers/specs/2026-08-12-restaurant-task2-task3-key-binding-contract.md`
14. `packages/graph/src/product-recipe.ts`
15. `packages/graph/test/browser-entry.test.ts`
16. `packages/graph/test/product-recipe-v2.test.ts`
17. `packages/graph/test/product-recipe.test.ts`

The first 13 paths are deliberate governance for this accepted current wave.
They include the founder-decision source assessment; ADR and prerequisite
records; proportionate delivery policy; live status, roadmap, and main ledger;
the prior Graph V3 delivery closure required by those records; and the frozen
shared contract plus inactive Task 2/Task 3 plans required to keep their future
resumption explicit and blocked. The Task 2/Task 3 plans and shared spec do not
authorize their implementation by being committed. The final four paths are the
complete Product Recipe V2 implementation; no other product path is included.

The exact excluded and preserved Task 3 residual baseline is 22 paths:

1. `docs/research/2026-08-12-archeform-ui-registry-reuse-inventory.md`
2. `packages/experience-recipes/package.json`
3. `packages/experience-recipes/test/fine-dining.test.ts`
4. `packages/experience-recipes/tsconfig.json`
5. `packages/generated-ui/package.json`
6. `packages/generated-ui/test/registry.test.ts`
7. `packages/generated-ui/tsconfig.json`
8. `packages/product-recipes/package.json`
9. `packages/product-recipes/test/restaurant-ordering.test.ts`
10. `packages/product-recipes/tsconfig.json`
11. `packages/screen-recipes/package.json`
12. `packages/screen-recipes/test/restaurant-screen-recipes.test.ts`
13. `packages/screen-recipes/tsconfig.json`
14. `packages/ui-patterns/package.json`
15. `packages/ui-patterns/test/registry.test.ts`
16. `packages/ui-patterns/tsconfig.json`
17. `packages/ui-primitives/package.json`
18. `packages/ui-primitives/test/registry.test.ts`
19. `packages/ui-primitives/tsconfig.json`
20. `packages/workbench-ui/package.json`
21. `packages/workbench-ui/test/boundary.test.ts`
22. `packages/workbench-ui/tsconfig.json`

The controller may now stage only the exact 17-path delivery manifest. Before
commit it must require Expected17/Actual17, no missing or unexpected staged
path, no unstaged/untracked manifest path, cached diff and sensitive scan PASS,
`pnpm-workspace.yaml` current blob equal to `HEAD` blob
`286cf7f5643db97142c425abe7c8e5d5663f5d65`, and no workspace or lockfile diff.
It must also prove that every dirty path outside the staged manifest is exactly
the 22-path preserved residual set above. The exact commit subject is:

```text
feat(graph): add product recipe v2 contracts
```

Push the current branch without force. Delivery closes only after the commit
contains exactly the 17 paths, local `HEAD` equals the upstream tip at that
commit, and the post-push dirty set is exactly the preserved 22 paths. Do not
claim a globally clean worktree, delete/stash the residual baseline, amend,
force-push, or stage any residual path. Task 2/Task 3 remain `planned`/blocked
until PM records that equality; after it, PM may separately refreeze their
Product Recipe V2 contract and resume the founder's conditional authorization.

## Delivery closure and consumed authority

Controller delivery completed at commit
`0aeae1c0ba7afcb1f074329a30e51bb18c8aacfa` with exact subject
`feat(graph): add product recipe v2 contracts` and the exact frozen 17 paths.
The non-force push to `feat/governed-composition-capability-foundry` succeeded.
The remote emitted a moved-repository notice; this is informational and does not
invalidate the push, and remote configuration must not be changed in this gate.

Fresh post-push evidence records local `HEAD` equal to upstream at
`0aeae1c0ba7afcb1f074329a30e51bb18c8aacfa`, tracked dirty count 0, staged count
0, and the residual untracked set equal to exactly the preserved 22 Task 3 paths
(one inventory plus 21 scaffolds). The prerequisite is `delivered`; its
acceptance, review, commit, and push authorities are consumed and cannot be
replayed.

The founder's prior exact conditional authorization `Task 2/3 也授权，如果需要`
and the 2026-08-14 direction `参考以下总结，若符合项目目标，则持续接受而迭代。` now apply
to the post-delivery Restaurant wave. PM refreezes
`factory.restaurant-task2-task3-contract/v1` for Product Recipe V2 at formatted
SHA-256 `ffa017cf14cd911495d70d8cf490bb637b570057235d3d841657e0f7c732b732`.
Task 2 and Task 3 may resume in parallel only in their disjoint plans and paths;
the Product Recipe V2 prerequisite has no further writer.

## Ambiguity and stop conditions

There is no material ambiguity in the accepted contract. Stop only if delivery
requires a V1 behavior change, a seventh path, a dependency, a down-conversion,
route/journey ownership inference, a product-specific validator exception,
hidden navigation, a new serialized field, external authority, or an
irreversible architecture choice.
