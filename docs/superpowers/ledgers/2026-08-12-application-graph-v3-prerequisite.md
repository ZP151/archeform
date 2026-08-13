# Application Graph V3 prerequisite ledger

Date: 2026-08-12

State: `delivered`.

Owner: `integration`. The delivery authority is consumed; no implementation,
review, commit, or push authority remains in this prerequisite.

Specialization: versioned Graph serialization, canonical hashing, immutable
Draft/Published lineage, preview-only lifecycle, browser-safe adapters, typed
Domain/Flow/Policy bindings, and compiler version dispatch.

Contract owner: `integration`.

Contract status: `frozen`.

Contract artifact: this ledger, governed by accepted
`docs/adr/adr-0010-restaurant-product-graph-v3-and-ui-registry-boundary.md`.

## Governance decision

ADR-0010 is `Accepted`. The founder explicitly accepted it in founder chat on
2026-08-12 with the verbatim response `接受`.

The founder separately wrote verbatim `Task 2/3 也授权，如果需要` in founder chat
on 2026-08-12. PM records this as conditional future authorization only. Task 2
and Task 3 retain zero writer authority until this Graph V3 prerequisite passes
task review, Terra QA, final Sol release review, PM acceptance, one reviewed
commit and non-force push with local/upstream equality, and PM freezes their
exact shared Restaurant key-and-binding manifest with disjoint paths. A shared
contract change stops both tasks and returns to the Graph contract owner.

## Current accepted boundary

- Preserve the accepted Golden runtime profile without runtime, framework,
  dependency, provider, database, queue, service, Docker, or Compose change.
- Preserve all Published Graph V1/V2 bytes, canonical hashes, schemas, adapters,
  browser exports, snapshot behavior, and immutable lifecycle semantics.
- Compilers consume only an exact digest-verified immutable Published Graph;
  Draft Preview Snapshots remain ephemeral and cannot deploy, export, publish,
  or create a Compilation.
- Browser and provider input remain untrusted. Flow and Policy bindings never
  grant authority; server-side tenant, application, revision, actor, policy,
  transition, idempotency, and concurrency checks remain mandatory.

## Frozen public contract

The following signatures are exact and additive:

```ts
export type ApplicationGraphV3JourneyStep = {
  flowKey: string;
  from: string;
  event: string;
  to: string;
  actorRoleKey: string;
};

export type ApplicationGraphV3Journey = {
  key: string;
  label: string;
  steps: ApplicationGraphV3JourneyStep[];
  entryPageKey: string;
  outcome: string;
};

export type ApplicationGraphV3DomainFieldBindingPolicy = {
  kind: "domain-field";
  pageId: string;
  blockId: string;
  bindingKey: string;
  entityKey: string;
  fieldKey: string;
  access: "read" | "write";
  authority: "client" | "server";
};

export type ApplicationGraphV3FlowTransitionBindingPolicy = {
  kind: "flow-transition";
  pageId: string;
  blockId: string;
  bindingKey: string;
  flowKey: string;
  from: string;
  event: string;
  to: string;
  access: "observe" | "request";
};

export type ApplicationGraphV3PolicyPermissionBindingPolicy = {
  kind: "policy-permission";
  pageId: string;
  blockId: string;
  bindingKey: string;
  roleKey: string;
  resource: string | "*";
  action: string;
  access: "evaluate";
};

export type ApplicationGraphV3BindingPolicy =
  | ApplicationGraphV3DomainFieldBindingPolicy
  | ApplicationGraphV3FlowTransitionBindingPolicy
  | ApplicationGraphV3PolicyPermissionBindingPolicy;

export type ApplicationGraphV3 = Omit<
  ApplicationGraphV2,
  "apiVersion" | "journeys" | "bindingPolicies"
> & {
  apiVersion: "factory.application-graph/v3";
  journeys: ApplicationGraphV3Journey[];
  bindingPolicies: ApplicationGraphV3BindingPolicy[];
};

export const applicationGraphV3Schema: z.ZodType<ApplicationGraphV3>;
export function assertApplicationGraphV3(input: unknown): ApplicationGraphV3;
export function hashApplicationGraphV3(input: unknown): Sha256Digest;
```

All records are strict. Keys retain the delivered Graph key grammars. Journey
`steps` is a non-empty ordered array. Hashing is exactly
`digestJson(assertApplicationGraphV3(input))`: object keys canonicalize and
array order remains significant.

Every delivered V2 semantic invariant remains exact unless this freeze
explicitly replaces it for journey steps or typed binding policies. This
includes surface/page ownership, recipe regions, navigation, retained V1
projection, seeds, field authorities, flow declarations, Policy grants,
capability locks, and strict unknown-key rejection.

### Journey invariants

- Journey keys are unique. Entry pages and every ScreenIntent and ProductRecipe
  journey reference resolve exactly.
- Each step resolves one flow and exactly one transition matching
  `(from,event,to)`. Duplicate exact transition tuples in one flow are invalid.
- Each step actor resolves in `policy.roles`, is listed in the matched
  transition's non-empty `roles`, and has Policy permission for the flow entity
  or `"*"` with the transition event in `actions`.
- Existing V2 transition-role Policy checks remain unchanged for every listed
  transition role.
- Within one journey, steps filtered by a flow retain their original order and
  each adjacent pair satisfies `previous.to === next.from`.
- Every transition is covered by at least one journey step and every flow is
  reachable through at least one step. Alternative branches use separate
  journeys.
- V3 journeys have no journey-level `actorRoleKey` or `flowKeys`.

New journey errors are exact; indexes are zero-based:

```text
Application Graph V3 journey '<key>' is duplicated.
Journey '<journeyKey>' references unknown page '<pageKey>'.
Journey '<journeyKey>' step <index> references unknown flow '<flowKey>'.
Journey '<journeyKey>' step <index> references unknown role '<roleKey>'.
Flow '<flowKey>' transition '<from>:<event>:<to>' is duplicated.
Journey '<journeyKey>' step <index> does not match transition '<flowKey>:<from>:<event>:<to>'.
Journey '<journeyKey>' step <index> actor '<roleKey>' is not granted on transition '<flowKey>:<from>:<event>:<to>'.
Journey '<journeyKey>' step <index> actor '<roleKey>' lacks Policy permission '<resource>:<event>'.
Journey '<journeyKey>' steps <previousIndex> and <currentIndex> for flow '<flowKey>' are discontinuous: '<previousTo>' does not equal '<currentFrom>'.
Flow '<flowKey>' transition '<from>:<event>:<to>' is not covered by a journey step.
Graph flow '<flowKey>' is not reachable from a journey.
```

These delivered V2 errors remain verbatim:

```text
Flow '<flowKey>' transition '<event>' requires an actor grant.
Flow '<flowKey>' transition '<event>' is not granted to role '<roleKey>'.
```

### Binding invariants

Every block binding has exactly one policy keyed by the exact
`(pageId,blockId,bindingKey)` tuple. Each policy resolves its page, page-owned
block, own binding key, discriminator-specific Graph member, and exact target:

```text
domain-field:      graph.domain.<entityKey>.<fieldKey>
flow-transition:   graph.flow.<flowKey>.<from>.<event>.<to>
policy-permission: graph.policy.<roleKey>.<resource>.<action>
```

- `domain-field` retains every delivered V2 field-authority rule. Its authority
  equals the unique intrinsic field authority; `write` requires `client`.
- `flow-transition` resolves exactly one transition. `observe` only observes;
  `request` requests server evaluation and is not transition authority.
- `policy-permission` resolves one declared role/resource/action tuple.
  `evaluate` requests evaluation and never asserts allow.
- Flow and Policy policies have no authority, actor, grant, allow, decision,
  tenant, mutation, or server-bypass field. Strict parsing rejects additions.
- Relabelled targets fail, and binding-policy array order remains hash-significant.

New binding errors are exact:

```text
Application Graph V3 binding policy '<pageId>:<blockId>:<bindingKey>' is duplicated.
Binding policy references unknown page '<pageId>'.
Binding policy references unknown block '<blockId>'.
Binding policy references unknown binding '<bindingKey>'.
Binding policy target '<expectedTarget>' does not match binding '<bindingKey>'.
Flow binding policy references unknown flow '<flowKey>'.
Flow binding policy references unknown transition '<flowKey>:<from>:<event>:<to>'.
Policy binding policy references unknown role '<roleKey>'.
Policy binding policy references undeclared permission '<roleKey>:<resource>:<action>'.
Block binding '<pageId>:<blockId>:<bindingKey>' requires exactly one policy.
```

Delivered Domain errors remain verbatim, including:

```text
A server-authoritative field is read-only and cannot grant client write access.
```

## Published, Draft, adapter, and migration contract

```ts
export type PublishedApplicationGraphV3Input = {
  kind: "published-application-graph";
  status: "published";
  graphVersion: "factory.application-graph/v3";
  revisionId: string;
  revisionNumber: number;
  graphHash: Sha256Digest;
  graph: ApplicationGraphV3;
};

export type PublishedApplicationGraphInput =
  | PublishedApplicationGraphV1Input
  | PublishedApplicationGraphV2Input
  | PublishedApplicationGraphV3Input;

export type AdaptedPublishedApplicationGraph = PublishedApplicationGraphInput;

export type ApplicationGraphV2ToV3UpgradeContext = {
  migrationVersion: "factory.application-graph-v2-to-v3/v1";
  targetDraftRevisionId: string;
  targetDraftRevisionNumber: number;
  journeys: ApplicationGraphV3["journeys"];
};

export type ApplicationGraphV3DraftRevision = {
  kind: "application-graph-draft-revision";
  status: "draft";
  revisionId: string;
  revisionNumber: number;
  graphVersion: "factory.application-graph/v3";
  graphHash: Sha256Digest;
  graph: ApplicationGraphV3;
  lineage: {
    kind: "application-graph-v2-upgrade";
    migrationVersion: "factory.application-graph-v2-to-v3/v1";
    source: Omit<PublishedApplicationGraphV2Input, "graph">;
  };
};

export function upgradeApplicationGraphV2ToV3Draft(
  source: PublishedApplicationGraphV2Input,
  context: ApplicationGraphV2ToV3UpgradeContext,
): ApplicationGraphV3DraftRevision;

export function adaptPublishedApplicationGraph(
  input: unknown,
): AdaptedPublishedApplicationGraph;
```

The upgrade context deliberately supplies journeys only. Delivered V2
validation proves every V2 block binding is Domain-only. Conversion strictly
validates the Published V2 envelope/hash; requires a positive new Draft revision
number and a Draft ID different from its source; clones every retained V2 field,
page, block, and binding unchanged; replaces journeys; maps each V2 policy in
array order to `{ kind: "domain-field", ...policy }`; validates and hashes the
fresh V3 Graph; and returns immutable source lineage without duplicate Graph
bytes. Neither input mutates. Flow/Policy targets enter only through a later
append-only V3 Draft edit that changes both the binding and policy.

The new migration error is exact:

```text
A V2-to-V3 upgrade requires a new Draft revision id different from its Published source.
```

The strict outer Published discriminator becomes exactly V1, V2, or V3. The
adapter retains recursive plain-own-record validation, explicit outer/inner
version equality, positive revisions, version-specific canonical hashes, exact
keys, fresh output, and rejection of Drafts, snapshots, guesses, defaults, and
down-conversion.

## Draft Preview Snapshot V2 contract

```ts
export type DraftPreviewSnapshotV2 = {
  apiVersion: "factory.draft-preview-snapshot/v2";
  id: string;
  workspaceId: string;
  applicationGraphId: string;
  draftRevisionId: string;
  graphVersion: "factory.application-graph/v3";
  graphChecksum: Sha256Digest;
  snapshotChecksum: Sha256Digest;
  disposition: "preview-only";
  state: "ready" | "rendering" | "active" | "disposed" | "expired";
  createdAt: string;
  expiresAt: string;
};

export type DraftPreviewSnapshotV2TransitionCommand =
  | {
      kind: "start-rendering" | "activate";
      occurredAt: string;
      currentDraftRevisionId: string;
      currentGraphChecksum: Sha256Digest;
    }
  | { kind: "dispose" | "expire"; occurredAt: string }
  | {
      kind: "deploy" | "export" | "publish" | "create-compilation";
      occurredAt: string;
    };

export type DraftPreviewSnapshotV2TransitionResult = {
  snapshot: DraftPreviewSnapshotV2;
  event: {
    kind: "draft-preview-snapshot-transition";
    snapshotId: string;
    from: DraftPreviewSnapshotV2["state"];
    to: DraftPreviewSnapshotV2["state"];
    occurredAt: string;
  };
};

export const draftPreviewSnapshotV2Schema: z.ZodType<DraftPreviewSnapshotV2>;
export function hashDraftPreviewSnapshotV2(input: unknown): Sha256Digest;
export function assertDraftPreviewSnapshotV2(
  input: unknown,
): DraftPreviewSnapshotV2;
export function transitionDraftPreviewSnapshotV2(
  snapshot: unknown,
  command: DraftPreviewSnapshotV2TransitionCommand,
): DraftPreviewSnapshotV2TransitionResult;
```

Snapshot V2 uses the exact V1 checksum field set, lifecycle, transition rules,
and error strings, but is strictly discriminated to Graph V3. Existing V1
functions remain V2-only. Neither family widens or guesses. The pinned V2
snapshot checksum for the existing fixture identifiers with the V2/V3 literals
is exactly
`sha256:d6382d36dc4d7dffae1a1cc9d32878ee9458e3566a3aafd63c553e78116189f7`.

## Compiler version-dispatch contract

The delivered compiler supports only its legacy V1 input. V2 compilation is
not implemented; the previous product ledger must not claim otherwise. These
legacy APIs remain unchanged and byte-identical:

```ts
PublishedGraphInput;
buildCompilationPlan;
buildCompilationInput;
generateApplicationBundle;
```

Add exactly:

```ts
export interface PublishedApplicationGraphCompilationInput {
  readonly publishedGraph: PublishedApplicationGraphInput;
  readonly compositionLock: CapabilityCompositionLockV1;
}

export function generateVersionedApplicationBundle(
  input: PublishedApplicationGraphCompilationInput,
  options?: GenerateApplicationBundleOptions,
): GeneratedApplicationBundle;
```

The wrapper is an exact-key plain record and calls
`adaptPublishedApplicationGraph(input.publishedGraph)` before dispatch. Its V1
branch delegates exactly:

```ts
return generateApplicationBundle(
  {
    publishedRevisionId: publishedGraph.revisionId,
    graph: publishedGraph.graph,
    compositionLock: input.compositionLock,
  },
  options,
);
```

Missing, extra, inherited, or non-plain wrapper fields fail exactly:

```text
Versioned compilation input must be a plain record with exactly publishedGraph and compositionLock.
```

V1 parity covers the full bundle, file order, bytes, digests, paths, and root
directory. Strict valid V2/V3 envelopes fail exactly:

```text
Published Application Graph version 'factory.application-graph/v2' is not supported by the current compiler.
Published Application Graph version 'factory.application-graph/v3' is not supported by the current compiler.
```

Malformed envelopes, bad hashes, Drafts, and snapshots fail in the Graph adapter
before these version errors. There is no V3 projection or down-conversion. A
later compiler task may replace only the V3 unsupported branch under a separate
frozen compiler-target contract.

## Exact writer-owned manifest — 10 paths

Create:

1. `packages/graph/src/application-graph-v3.ts`
2. `packages/graph/src/draft-preview-snapshot-v2.ts`
3. `packages/graph/test/application-graph-v3.test.ts`
4. `packages/graph/test/draft-preview-snapshot-v2.test.ts`
5. `packages/compiler/test/application-graph-version-dispatch.test.ts`

Modify:

6. `packages/graph/src/application-graph-adapter.ts`
7. `packages/graph/src/index.ts`
8. `packages/graph/src/browser.ts`
9. `packages/graph/test/application-graph-adapter.test.ts`
10. `packages/compiler/src/index.ts`

No manifest, lockfile, capability, UI, Workbench, Control Plane, worker,
provider, service, Docker, Compose, target-plugin, or generated-template path is
owned.

## TDD and acceptance gates

The sole Sol writer must first add focused REDs for:

- distributed-role journey steps and every duplicate, resolution, actor,
  permission, continuity, coverage, and branch boundary;
- valid Domain/Flow/Policy policies plus discriminator relabelling, duplicate or
  unresolved members, target mismatch, server-field write, and forbidden
  authority/grant/tenant extras;
- deterministic hash, object-key canonicalization, array-order significance,
  and the pinned V2 and V3-adjacent vectors;
- strict immutable V2-to-V3 conversion, Domain-only policy wrapping, lineage,
  source/context immutability, unchanged pages/bindings, and fresh V3 hash;
- strict V1/V2/V3 adapter dispatch, unknown V4, cross-version, wrong hash,
  Draft/snapshot, extra/inherited/non-plain input, and browser parity;
- Snapshot V1/V2 cross-version rejection, pinned V2 checksum, legal and illegal
  transitions, staleness, expiry, terminal states, and all four prohibited
  production actions;
- compiler strict-envelope ordering, byte-identical V1 delegation, exact V2/V3
  unsupported errors, Draft/snapshot rejection, and unchanged legacy behavior.

Required GREEN commands are:

```powershell
pnpm --filter @factory/graph exec vitest run test/application-graph-v3.test.ts test/application-graph-adapter.test.ts test/draft-preview-snapshot-v2.test.ts
pnpm --filter @factory/compiler exec vitest run test/application-graph-version-dispatch.test.ts
pnpm --filter @factory/graph test
pnpm --filter @factory/compiler test
pnpm --filter @factory/graph typecheck
pnpm --filter @factory/compiler typecheck
pnpm --filter @factory/graph build
pnpm --filter @factory/compiler build
pnpm exec prettier --check packages/graph/src/application-graph-v3.ts packages/graph/src/draft-preview-snapshot-v2.ts packages/graph/src/application-graph-adapter.ts packages/graph/src/index.ts packages/graph/src/browser.ts packages/graph/test/application-graph-v3.test.ts packages/graph/test/draft-preview-snapshot-v2.test.ts packages/graph/test/application-graph-adapter.test.ts packages/compiler/src/index.ts packages/compiler/test/application-graph-version-dispatch.test.ts
git diff --check
```

Containment must report exactly the 10 writer paths. Generated declaration
symbols and dynamic browser exports must include every new public V3 and Snapshot
V2 API, with zero banned Node runtime imports in the browser closure.

Writer self-review and one independent Sol task review are complete with no open
P0/P1. Exactly one fresh exact-tree
provider/model/network/service/Docker/Compose-free Terra QA is now authorized to
repeat the focused/full suites, typecheck, build, formatting, containment,
declaration/browser, literal hash, compatibility, lifecycle, and adversarial
matrix. One independent final Sol release review may be authorized only after PM
reconciles a Terra PASS with no open P0/P1. PM then performs fresh verification
before acceptance.

## Delivery freeze

Implementation writer commit/push authority: none.

The pre-implementation PM/governance dirty baseline is exactly six documents:

1. `docs/adr/adr-0010-restaurant-product-graph-v3-and-ui-registry-boundary.md`
2. `docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md`
3. `docs/superpowers/ledgers/2026-08-12-application-graph-v3-prerequisite.md`
4. `docs/superpowers/plans/2026-08-12-application-graph-v3-prerequisite.md`
5. `docs/project-status.md`
6. `docs/roadmap.md`

No implementation path is dirty at this freeze. After accepted implementation,
the exact delivery manifest is the following 16-path union and no other path:

1. `packages/graph/src/application-graph-v3.ts`
2. `packages/graph/src/draft-preview-snapshot-v2.ts`
3. `packages/graph/test/application-graph-v3.test.ts`
4. `packages/graph/test/draft-preview-snapshot-v2.test.ts`
5. `packages/compiler/test/application-graph-version-dispatch.test.ts`
6. `packages/graph/src/application-graph-adapter.ts`
7. `packages/graph/src/index.ts`
8. `packages/graph/src/browser.ts`
9. `packages/graph/test/application-graph-adapter.test.ts`
10. `packages/compiler/src/index.ts`
11. `docs/adr/adr-0010-restaurant-product-graph-v3-and-ui-registry-boundary.md`
12. `docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md`
13. `docs/superpowers/ledgers/2026-08-12-application-graph-v3-prerequisite.md`
14. `docs/superpowers/plans/2026-08-12-application-graph-v3-prerequisite.md`
15. `docs/project-status.md`
16. `docs/roadmap.md`

After PM acceptance, the controller alone stages the exact accepted delivery
manifest, runs staged containment, `git diff --cached --check`, and a
non-disclosing sensitive-pattern scan, creates one reviewed commit with subject
`feat(graph): add application graph v3 contracts`, pushes the current branch
without force, and proves local `HEAD` equals upstream with a clean worktree.

Only after delivery equality may PM freeze the Restaurant Task 2/Task 3
key-and-binding manifest and dispatch their path-disjoint writers under the
already recorded conditional founder authority.

## Downstream blockers retained

These do not block this prerequisite writer, but continue to block Tasks 2/3:

- the current V1 Restaurant graph has roleless table-session `expire`
  transitions and CRUD-style permissions rather than every exact event grant;
- both customer and cashier can request `pay`, but the accepted ADR does not
  choose the journey partition;
- cancellation branches require separate journeys, but their exact keys and
  partitioning are not frozen;
- fifteen page keys, block/registry keys, ports, field authorities, and the
  exact Flow/Policy binding map remain for the later shared manifest;
- any shared-contract change stops both downstream writers and returns to the
  Graph contract owner.

## Writer authorization

The same sole GPT-5.6-Sol integration writer completed the compiler-wrapper
two-path TDD repair and is paused. No implementation writer is currently
authorized. No one may edit implementation, manifest, lockfile, Task 2/3,
provider, service, Docker, or Compose paths during QA; commit and push remain
unauthorized.

## Fresh pre-RED baseline — 2026-08-12

- Current branch is `feat/governed-composition-capability-foundry`; local `HEAD`
  and upstream both equal
  `a6e4e6945e79f7ca7cf93686ee00628534f98acd` before V3 implementation.
- `pnpm --filter @factory/graph test` passes 18 files and 370/370 tests.
- `pnpm --filter @factory/graph typecheck` and
  `pnpm --filter @factory/graph build` pass.
- `pnpm --filter @factory/compiler exec vitest run --reporter=dot` passes 22
  files and 403/403 tests. The Node `punycode` deprecation warning is inherited
  and non-failing.
- This baseline contains documentation/governance changes only. No Graph,
  compiler, Task 2/3, provider, service, Docker, or Compose implementation path
  is dirty before the focused RED.

## Writer handoff and task-review reconciliation — 2026-08-12

- The initial focused RED preserved production code: the three Graph files
  reported 6 failed and 12 passed tests, while the compiler dispatch file
  reported 7/7 failed tests.
- The writer's initial GREEN reported focused Graph 51/51 and compiler dispatch
  8/8. Self-review then proved the strict wrapper boundary with RED 1/8 followed
  by GREEN 8/8, and proved migration failures are deterministic validation
  errors rather than `DataCloneError` with RED 1/18 followed by GREEN 18/18.
- Full Graph initially passed 406 tests and full compiler passed 411/411. The
  independent Sol task review found one P1 family: recursive Published and
  upgrade-context copies could erase symbol-keyed or non-enumerable own
  properties before strict validation.
- The same writer added focused RED evidence with adapter 8 failed/18 passed,
  repaired the recursive own-property boundary, and returned adapter 26/26,
  focused compatibility 85/85, compiler dispatch 8/8, full Graph 414/414, and
  full compiler 411/411. Graph/compiler typecheck and build, exact-10 Prettier,
  diff, 10/10 containment, declaration exports, browser exports, and zero banned
  browser-runtime imports all pass.
- Final independent same-Sol re-review returns specification `COMPLIANT`, code
  quality `APPROVED`, P0/P1/P2=0/0/0, independent adapter 26/26, and 8/8
  adversarial symbol/non-enumerable probes rejected. The review explicitly marks
  the exact current tree `ready_for_qa`.

## Fresh Terra QA authorization — 2026-08-12

Exactly one independent GPT-5.6-Terra QA pass is authorized on the exact
reviewed 16-path dirty tree. Terra is read-only, changes no file, and must remain
provider-free, model-call-free, network-free, service-free, Docker-free, and
Compose-free. QA must reconcile ADR-0010, this ledger, the frozen plan, all ten
implementation paths, and the six-document governance baseline, then run:

- the three focused Graph files, adapter 26/26, compiler dispatch 8/8, full Graph
  414/414, and full compiler 411/411;
- Graph/compiler typecheck and build, exact-10 Prettier, `git diff --check`, exact
  10/10 writer containment and exact 16/16 delivery-union containment;
- generated declarations, dynamic browser exports, and zero banned Node runtime
  imports in the browser closure;
- pinned V2/V3/Snapshot hashes, immutable V1/V2 and legacy compiler parity,
  recursive strict own-property/plain-record rejection including inherited,
  symbol, and non-enumerable inputs, V2-to-V3 lineage and input immutability,
  journey and typed-binding semantics, Snapshot V2 lifecycle, strict Published
  V1/V2/V3 dispatch, and fail-closed V2/V3 compiler behavior.

Terra must report reproducible commands and P0/P1/P2 counts. Any product defect
or open P0/P1 returns the prerequisite to `implementing` only through a new PM
repair freeze. A PASS returns to PM; it does not authorize final release review,
acceptance, delivery, commit, push, or downstream work. Task 2 and Task 3 remain
`planned` with zero writers.

## Terra QA reconciliation — 2026-08-12

The single authorized Terra QA pass is complete and its authorization is
consumed. Terra returns `PASS` with P0/P1/P2=0/0/0 on the exact reviewed tree:

- focused Graph 59/59 and the broader behavioral/adversarial matrix 71/71;
- compiler version dispatch 8/8;
- full Graph 20 files and 414/414 tests, plus full compiler 23 files and 411/411
  tests; the compiler emits only the inherited non-failing Node `punycode`
  deprecation warning;
- Graph/compiler typecheck and build, exact-10 Prettier, and diff checks pass;
- implementation containment is 10/10 and the delivery-union containment is
  16/16;
- generated declarations are 21/21, dynamic browser exports are 8/8, browser
  closure banned Node imports are 0, and the non-disclosing changed-hunk
  sensitive-material scan reports 0 matches.

Terra made no file edit and used no provider, model, network, service, Docker,
or Compose action. The prerequisite remains `ready_for_qa`: this QA result is
not final release review, acceptance, delivery, commit, push, or downstream
authority.

## Final Sol release-review authorization — 2026-08-12

The one authorized independent GPT-5.6-Sol final release review ran on the exact
Terra-passed 16-path dirty tree. The reviewer was read-only, changed no file,
and used no provider, model, network, service, Docker, or Compose action.
Following the release-review skill, the reviewer must inspect the actual diff,
relevant Graph/adapter/snapshot/compiler call paths, focused and full tests,
ADR-0010, this frozen ledger and plan, `docs/threat-model.md`, and
`docs/delivery-policy.md`. It must assess correctness, security, data handling,
approval-policy compliance, and whether the tests prove rather than merely
execute:

- immutable V1/V2 bytes, hashes, schemas, adapters, snapshot behavior, browser
  behavior, and byte-identical legacy V1 compilation;
- strict recursive own-property/plain-record Published and upgrade-context
  boundaries, including inherited, symbol-keyed, and non-enumerable inputs;
- V2-to-V3 Draft lineage, deterministic hashing, step-scoped journeys, typed
  Domain/Flow/Policy bindings, and server-authoritative enforcement;
- Snapshot V2 lifecycle and prohibited production actions; strict Published
  V1/V2/V3 dispatch; fail-closed compiler ordering and exact V2/V3 unsupported
  errors; declaration/browser safety and the exact 10/16 containment boundary.

The reviewer must return an explicit `ACCEPT` or `REJECT`, P0/P1/P2 counts, and
file/line evidence with impact and remediation direction for every finding. Only
`ACCEPT` with no open P0/P1 returns to PM for fresh acceptance reconciliation.
Any `REJECT` or open P0/P1 blocks acceptance and requires a new PM-controlled
repair freeze. Acceptance, delivery, commit, push, and Task 2/Task 3 writers
remain unauthorized.

## Final release rejection and focused repair freeze — 2026-08-12

The final Sol release review returns `REJECT` with P0/P1/P2=0/2/0. Existing
focused Graph 59/59 and compiler dispatch 8/8 remained green during review;
those executions prove the preceding matrix omitted the two recursive boundary
classes rather than disproving the findings. PM returns the prerequisite from
`ready_for_qa` to `implementing`. The preceding Terra PASS remains historical
evidence only and cannot authorize acceptance or delivery.

P1 A — strict Published/upgrade arrays:

- `copyPlainOwnRecordInput` recognizes arrays through `Array.isArray` but does
  not require `Object.getPrototypeOf(input) === Array.prototype` and copies via
  the caller-controlled instance `.map()` method. A `HostileArray` subclass in
  an otherwise valid digest-matched Published V1 envelope is therefore accepted
  and normalized and may invoke attacker-controlled behavior.
- Every recursive boundary array must use the standard `Array.prototype`, be a
  dense sequence of own enumerable data descriptors at canonical indexes
  `0..length-1`, and contain no other key except own `length`. The copy must read
  descriptor values and build a fresh standard array through an intrinsic or
  manual indexed loop; it must never invoke an instance iterator, `.map()`,
  accessor, inherited index, or caller method.
- Focused REDs in the adapter test must cover Published V1, V2, and V3 plus the
  V2-to-V3 upgrade context with array subclasses, custom array prototypes,
  accessor indexes, sparse/inherited indexes, and nested hostile arrays. They
  must prove rejection before accessor/caller behavior executes and retain
  valid standard-array/hash/lineage behavior.

P1 B — direct V3 and Snapshot V2 public/browser boundaries:

- `applicationGraphV3Schema`, `assertApplicationGraphV3`, and
  `hashApplicationGraphV3`, plus `draftPreviewSnapshotV2Schema`,
  `assertDraftPreviewSnapshotV2`, `hashDraftPreviewSnapshotV2`, and
  `transitionDraftPreviewSnapshotV2` currently let Zod normalize inherited
  required fields and symbol-keyed, non-enumerable, accessor, or nested hostile
  extras before the semantic checks observe them.
- Before any direct public or browser parse, records must have only
  `Object.prototype` or `null` as prototype and only own enumerable string-keyed
  data descriptors. Arrays must satisfy the exact standard dense-array rule in
  P1 A. Recursive copying must consume descriptor values without invoking
  accessors. Required fields must therefore be own. The exported Graph V3 and
  Snapshot V2 schemas must enforce the same boundary as their assert/hash/
  transition functions; `safeParse` must fail rather than accept or normalize a
  hostile value.
- Focused REDs in the V3 and Snapshot V2 tests must cover inherited required
  fields, symbol-keyed and non-enumerable extras, accessors with a no-invocation
  assertion, array subclasses/custom prototypes, nested hostile arrays, and
  hostile transition commands. Exercise both Node and browser exports and
  preserve valid hashes, transitions, and canonical output.

This repair changes no public type, function signature, schema field, serialized
version, error contract, compiler behavior, dependency, or owned-path manifest.
Private boundary helpers may be local to the three existing source modules; no
shared source file is added or modified.

Exactly six implementation paths are writable in this repair, correcting the
initial four-path count:

1. `packages/graph/src/application-graph-adapter.ts`
2. `packages/graph/test/application-graph-adapter.test.ts`
3. `packages/graph/src/application-graph-v3.ts`
4. `packages/graph/test/application-graph-v3.test.ts`
5. `packages/graph/src/draft-preview-snapshot-v2.ts`
6. `packages/graph/test/draft-preview-snapshot-v2.test.ts`

The same writer must first produce focused REDs for P1 A and P1 B with
production untouched and report the exact failing/passing counts. Implement one
finding at a time, run its focused GREEN, then run the combined three test files,
full Graph and compiler suites, both packages' typecheck/build, exact-10
Prettier, diff, exact six-path repair containment, exact 10-path implementation
containment, exact 16-path delivery containment, declarations, dynamic browser
exports, browser-closure banned imports, and the non-disclosing changed-hunk
sensitive scan. V1/V2 bytes/hashes and all pinned V2/V3/Snapshot vectors remain
immutable.

After writer self-review, the required sequence is one same-Sol task re-review,
one fresh exact-tree Terra QA, one new independent final Sol release review, and
fresh PM reconciliation only after explicit `ACCEPT` with no open P0/P1. Any
finding returns to PM; no later gate is self-authorizing. Acceptance, delivery,
commit, push, Task 2/Task 3 writers, providers, models, network, services, Docker,
and Compose remain blocked.

## Six-path repair handoff and task re-review — 2026-08-12

- With production untouched, P1 A adapter RED collected 46 tests: 20 failed and
  26 passed. P1 B direct Graph V3/Snapshot V2 RED collected 56 tests: 15 failed
  and 41 passed. The intended subclass, custom-prototype, accessor, sparse,
  inherited, nested, direct-schema, assert/hash, browser, and command cases
  failed without collection or fixture error.
- Final GREEN passes the combined three repair files 110/110 and the seven-file
  V1/V2/V3/Snapshot/browser compatibility matrix 180/180. Full Graph passes
  465/465 and full compiler passes 411/411; compiler dispatch passes 8/8. The
  inherited non-failing Node `punycode` warning is unchanged.
- Graph/compiler typecheck and build, exact-10 Prettier, diff, exact 6/6 repair
  containment, 10/10 implementation containment, 16/16 delivery containment,
  declarations, dynamic browser exports, zero banned browser-closure Node
  imports, zero changed-hunk sensitive-material matches, and unchanged pinned
  V2/V3/Snapshot hashes all pass.
- Independent same-Sol re-review returns specification `COMPLIANT`, code quality
  `APPROVED`, and P0/P1/P2=0/0/0. Its independent hostile probe completed 121
  checks with zero failures and zero caller accessor/method/iterator invocations.
  It explicitly reports `ready_for_qa: yes`.

PM advances only this prerequisite from `implementing` to `ready_for_qa`. This
is not final release review, acceptance, delivery, commit, push, or downstream
authority.

## Fresh repaired-tree Terra QA authorization — 2026-08-12

Exactly one independent GPT-5.6-Terra QA pass is authorized on the exact
repaired 16-path dirty tree. Terra is read-only, changes no file, and must remain
provider-free, model-call-free, network-free, service-free, Docker-free, and
Compose-free. It must repeat both repaired matrices in full:

- Published V1/V2/V3 and V2-to-V3 contexts reject array subclasses, custom
  prototypes, own/overridden `map`, own/overridden iterators, accessor indexes,
  sparse/inherited indexes, and nested hostile arrays without any caller
  behavior invocation;
- Node/browser Graph V3 schemas, assert/hash APIs, Snapshot V2 schemas,
  assert/hash APIs, and transition commands reject inherited required fields,
  symbol-keyed/non-enumerable extras, accessors, nonstandard arrays, and nested
  hostile inputs; exported-schema `safeParse` fails consistently and valid
  standard values retain exact hashes and transitions.

Terra must also run the combined repair and compatibility suites, full Graph
465/465, full compiler 411/411, compiler dispatch 8/8, both typecheck/build
gates, exact-10 Prettier, diff, exact 6/10/16 containment, declarations, dynamic
browser exports, browser-closure banned-import scan, changed-hunk sensitive scan,
pinned hashes, V1/V2 immutability, compiler V1 parity/fail-closed V2/V3 dispatch,
journey/binding semantics, and Snapshot lifecycle/prohibited-action matrix. It
must return reproducible commands and P0/P1/P2 counts.

Any product defect or open P0/P1 returns the prerequisite to `implementing`
only through a new PM repair freeze. A clean Terra result returns to PM before a
new final Sol release review may be authorized. Final release review,
acceptance, delivery, commit, push, and Task 2/Task 3 writers remain blocked.

## Repaired-tree Terra QA reconciliation — 2026-08-12

The single authorized repaired-tree Terra QA pass is complete and its
authorization is consumed. Terra returns `PASS` with P0/P1/P2=0/0/0:

- focused repair 110/110 and compatibility/browser 180/180;
- hostile Published/context arrays 28/28 and direct Node/browser Graph V3 plus
  Snapshot V2 boundaries 23/23;
- corrected independent helper 6/6 hostile cases rejected with zero caller
  accessor/method/iterator invocations;
- compiler dispatch 8/8, full Graph 465/465, and full compiler 411/411;
- Graph/compiler typecheck and build, exact-10 Prettier, diff, exact 6/10/16
  repair/implementation/delivery containment, declarations 23/23, identical
  browser exports 8/8, browser-closure banned Node imports 0, pinned hashes 3/3,
  and changed-hunk sensitive-material matches 0.

The QA helper initially reported an anomaly caused only by inverted helper
expectations and object spread in the probe. QA corrected the helper and reran
it; the 6/6 result above is green with zero caller invocation. This is a QA
harness correction, not a product finding. QA found no drift, made no file edit,
and used no provider, model, network, service, Docker, or Compose action. The
prerequisite remains `ready_for_qa`; this PASS is not release acceptance,
delivery, commit, push, or downstream authority.

## New final Sol release-review authorization — 2026-08-12

Exactly one new independent GPT-5.6-Sol final release review is authorized on
the exact repaired and Terra-passed 16-path dirty tree. The reviewer is
read-only, changes no file, and must use no provider, model, network, service,
Docker, or Compose action. Under the release-review skill, it must inspect the
actual diff, relevant adapter/Graph/Snapshot/compiler call paths, focused and
full tests, ADR-0010, this ledger and plan, `docs/threat-model.md`, and
`docs/delivery-policy.md`, and determine whether the tests prove the frozen
correctness, security, data-handling, and approval-policy invariants.

The release review must independently repeat or inspect both repaired hostile
matrices, including standard-array prototype/dense descriptor rules, absence of
caller accessor/method/iterator execution, recursive own plain-record handling,
exported-schema `safeParse`, Node/browser parity, Snapshot commands, valid hash
and transition behavior, V1/V2 immutability, compiler V1 parity and fail-closed
V2/V3 dispatch, declarations/browser closure, and exact 6/10/16 containment. It
must reconcile the corrected QA helper as a harness-only anomaly and verify the
current 23/23 declarations, 8/8 identical browser exports, zero banned Node
imports, three pinned hashes, and zero sensitive matches.

The reviewer must return exactly `RELEASE_ACCEPT` or `RELEASE_REJECT`, explicit
P0/P1/P2 counts, and file/line evidence with impact and remediation for every
finding. Only `RELEASE_ACCEPT` with no open P0/P1 returns to PM for fresh
acceptance reconciliation. Any `RELEASE_REJECT` or open P0/P1 returns to a new
PM-controlled repair freeze. Acceptance, delivery, commit, push, and Task 2/
Task 3 writers remain blocked.

## Compiler-wrapper release rejection and repair freeze — 2026-08-12

The new independent final Sol review returns `RELEASE_REJECT` with
P0/P1/P2=0/1/0. PM returns the V3 prerequisite from `ready_for_qa` to
`implementing`. The repaired-array and direct Graph V3/Snapshot V2 P1 families
remain independently closed; the reviewer reports no other finding. All prior
task-review and Terra evidence remains historical and cannot authorize
acceptance or delivery.

P1 — versioned compiler wrapper required-field descriptors:

- `generateVersionedApplicationBundle` verifies the wrapper prototype, exact
  own-key count, and required-key ownership, but does not require
  `publishedGraph` and `compositionLock` to be enumerable data descriptors. It
  then reads `input.publishedGraph` and `input.compositionLock` directly.
- A required-field accessor therefore executes during compilation input
  validation, and a non-enumerable required field is accepted. The independent
  probe observed one getter call.
- The existing wrapper error remains exact and must be used before adaptation or
  compilation for either invalid descriptor:

```text
Versioned compilation input must be a plain record with exactly publishedGraph and compositionLock.
```

- Both required descriptors must be own, enumerable data descriptors. Accessor
  descriptors and non-enumerable data descriptors fail with the exact error.
  The implementation must consume only the already-inspected descriptor
  `.value` fields; it must never dereference either property on the caller input.

Exactly two existing implementation paths are writable:

1. `packages/compiler/src/index.ts`
2. `packages/compiler/test/application-graph-version-dispatch.test.ts`

No public type, function signature, error text, Graph schema, serialized value,
adapter, snapshot, dependency, compiler target, generated template, or 10/16
manifest expansion is authorized.

The same writer must first add focused REDs with production untouched for:

- an accessor `publishedGraph` and accessor `compositionLock`, each rejected
  with the exact wrapper error and zero getter calls;
- a non-enumerable data `publishedGraph` and non-enumerable data
  `compositionLock`, each rejected with the exact wrapper error;
- valid ordinary enumerable data fields as controls, preserving byte-identical
  Published V1 bundle parity and exact valid V2/V3 unsupported-version behavior.

The minimal GREEN inspects both descriptors once, verifies enumerable data
descriptors, binds their descriptor values to local variables, strict-adapts the
local Published value, and supplies only the local lock value to legacy V1
compilation. After focused GREEN, run full compiler 411/411 and Graph 465/465,
compiler dispatch, both packages' typecheck/build, exact-10 Prettier, diff,
exact 2/10/16 repair/implementation/delivery containment, declarations, browser
exports/import closure, all pinned hashes, both previously repaired hostile
Graph matrices, and the changed-hunk sensitive scan.

Required order is RED→GREEN, same-Sol task re-review, fresh exact-tree Terra QA,
and yet another independent final Sol release review. Only a later
`RELEASE_ACCEPT` with no open P0/P1 may return to PM for fresh acceptance
reconciliation. Acceptance, delivery, commit, push, and Task 2/Task 3 writers
remain blocked.

This is the third failed review/repair cycle in the V3 prerequisite. PM records
the escalation threshold as reached while honoring this explicitly bounded
same-manifest repair. Any further release rejection, open P0/P1, shared-contract
change, or path expansion stops another implementation round and requires
controller governance escalation before new writer authority.

## Compiler-wrapper repair handoff and task re-review — 2026-08-12

- With production untouched, the focused dispatch RED collected 12 tests: the
  four descriptor cases failed and eight retained controls passed. Both accessor
  fields invoked one getter; both hidden data fields were accepted.
- Focused GREEN passes 12/12. Full compiler passes 415/415, full Graph passes
  465/465, the prior hostile Graph matrix passes 110/110, and compatibility/
  browser passes 180/180. The four new tests explain the compiler increase from
  411 to 415; the inherited non-failing `punycode` warning is unchanged.
- Graph/compiler typecheck and build, exact-10 formatting, diff, exact 2/10/16
  repair/implementation/delivery containment, declarations, dynamic browser
  exports, browser-closure banned Node imports, changed-hunk sensitive scan, and
  pinned hashes all pass.
- Same-Sol re-review returns specification `COMPLIANT`, quality `APPROVED`, and
  P0/P1/P2=0/0/0. Its independent descriptor probe rejects accessor and
  non-enumerable `publishedGraph` and `compositionLock` with the exact wrapper
  error and zero getter calls; symbol extras, inherited required values, and
  non-plain wrappers also fail exactly. V1 parity, adapter-before-dispatch
  ordering, and V2/V3 errors remain exact. It explicitly reports
  `ready_for_qa: yes`.

PM advances only the V3 prerequisite from `implementing` to `ready_for_qa`.
This is not final release review, acceptance, delivery, commit, push, or
downstream authority.

## Fresh compiler-repaired Terra QA authorization — 2026-08-12

Exactly one independent GPT-5.6-Terra QA pass is authorized on the exact
compiler-repaired 16-path dirty tree. Terra is read-only, changes no file, and
must remain provider-free, model-call-free, network-free, service-free,
Docker-free, and Compose-free.

Terra must independently repeat the compiler descriptor matrix:

- accessor and non-enumerable data descriptors for each of `publishedGraph` and
  `compositionLock` reject with the exact existing wrapper error;
- accessor call counts remain zero, and symbol extras, inherited required
  values, non-plain wrappers, missing/extra fields, and malformed Published
  envelopes preserve exact validation ordering;
- ordinary enumerable data fields preserve byte-identical V1 bundle/file/
  content/digest parity and exact valid V2/V3 unsupported-version errors.

Terra must also repeat focused dispatch 12/12, full compiler 415/415, full Graph
465/465, hostile repair 110/110, compatibility/browser 180/180, both packages'
typecheck/build, exact-10 Prettier, diff, exact 2/10/16 containment,
declarations, browser exports/import closure, three pinned hashes, both prior
closed hostile Graph matrices, and the changed-hunk sensitive scan. It must
report reproducible commands and P0/P1/P2 counts.

Any product defect or open P0/P1 returns to PM. A clean result returns to PM
before yet another final release review may be authorized. The third-cycle
escalation remains active: another rejection or scope/path change stops new
writer authority pending controller governance. Final release review,
acceptance, delivery, commit, push, and Task 2/Task 3 writers remain blocked.

## Compiler-repaired Terra QA reconciliation — 2026-08-12

The single authorized compiler-repaired Terra QA pass is complete and its
authorization is consumed. Terra returns `PASS` with P0/P1/P2=0/0/0:

- compiler dispatch 12/12, prior hostile Graph matrix 110/110,
  compatibility/browser 180/180, and full Graph 465/465;
- independent compiler descriptor probe 13/13, with accessor and hidden data
  cases for both required fields rejected by the exact wrapper error, zero
  caller calls, full serialized V1 parity, exact V2/V3 unsupported errors, and
  adapter-before-dispatch ordering;
- direct Graph V3/Snapshot V2 probe 8/8 with zero caller calls, and all three
  pinned hashes match;
- Graph/compiler typecheck and build, exact-10 Prettier, diff, exact 2/10/16
  repair/implementation/delivery containment, declarations 23/23, identical
  browser exports 8/8, browser-closure banned Node imports 0, and changed-hunk
  sensitive-material matches 0.

Terra ran the full compiler suite three times and each process exited 0, but the
captured stdout aggregate was truncated after the database-parity output. Terra
therefore cannot independently substantiate the precise 415-test total from raw
stdout. The writer, same-Sol re-review, and fresh PM verification previously
recorded 415/415; Terra claims only three independent successful full-suite exit
codes. This transparent evidence limitation is not a product defect and does
not conceal a failing command.

Terra found no product defect or drift, made no file edit, and used no provider,
model, network, service, Docker, or Compose action. V3 remains `ready_for_qa`;
the QA PASS is not release acceptance, delivery, commit, push, or downstream
authority.

## Escalated third-cycle final Sol authorization — 2026-08-12

Under the already recorded third-cycle escalation threshold, exactly one final
independent GPT-5.6-Sol release review is authorized on the exact
compiler-repaired and Terra-passed 16-path dirty tree. The reviewer is read-only,
changes no file, and uses no provider, model, network, service, Docker, or
Compose action. No additional implementation round is pre-authorized.

Following the release-review skill, the reviewer must inspect the actual diff,
adapter/Graph/Snapshot/compiler call paths, tests, ADR-0010, this ledger/plan,
`docs/threat-model.md`, and `docs/delivery-policy.md`. It must independently
verify the compiler required-field descriptor matrix, zero caller invocation,
unchanged wrapper error, V1 serialized parity, adapter-before-dispatch ordering,
exact V2/V3 errors, both prior closed Graph boundary families, V1/V2/hash/
lifecycle/journey/binding invariants, declarations/browser closure, sensitive
scan, and exact 2/10/16 containment.

The review must explicitly adjudicate the Terra full-compiler output limitation:
three independent exit-zero runs with truncated aggregate stdout versus prior
writer/reviewer/PM 415/415 evidence. It may rerun or inspect the full suite as
needed, but must not infer a precise count from truncated output.

The reviewer must return `RELEASE_ACCEPT` or `RELEASE_REJECT`, P0/P1/P2 counts,
and actionable file/line evidence for every finding. Only `RELEASE_ACCEPT` with
no open P0/P1 returns to PM for fresh acceptance reconciliation. Any
`RELEASE_REJECT`, open P0/P1, shared-contract change, or path expansion stops
new writer authority and returns to controller governance escalation.
Acceptance, delivery, commit, push, and Task 2/Task 3 writers remain blocked.

## Escalated final release verdict and PM acceptance — 2026-08-12

The final independent Sol review returns `RELEASE_ACCEPT` with
P0/P1/P2=0/0/0. It independently confirms the compiler descriptor P1 and both
prior Graph boundary P1 families closed, with no other finding:

- compiler descriptor probe 70 checks with zero getter calls;
- adapter probe 10 checks and direct/browser Graph V3/Snapshot probe 70 checks,
  all with zero caller invocation;
- focused Graph/browser 111/111, compiler dispatch 12/12, full Graph 465/465,
  and full compiler 23 files/415 tests with raw exit 0;
- both typechecks, exact-10 Prettier, diff, implementation 10/10 and delivery
  16/16 containment, declarations 23/23, browser exports 8/8, banned Node
  imports 0, sensitive matches 0, and all three pinned hashes.

The reviewer explicitly adjudicates the Terra limitation: Terra's three
compiler runs were exit-zero but their aggregate stdout was truncated; the
final review independently obtained the complete 23-file/415-test result. The
limitation is closed as evidence capture, not a product defect.

PM freshly reconciles the accepted ADR and frozen plan, the actual 16-path diff,
all review/repair/QA history, `docs/threat-model.md`, and
`docs/delivery-policy.md`. Fresh PM commands pass focused Graph/browser 111/111,
dispatch 12/12, full Graph 465/465, full compiler 23 files/415 tests, all four
Graph/compiler typecheck/build gates, exact-10 Prettier, diff, declarations
23/23, browser exports 8/8, banned Node imports 0, pins 3/3, sensitive matches 0,
and exact delivery containment 16/16.

PM marks the Graph V3 prerequisite `accepted`. It is not yet delivered,
committed, or pushed. This acceptance authorizes no provider, model, network,
service, Docker, Compose, Task 2/Task 3, shared Restaurant manifest, or cloud
action.

## Exact controller delivery authority — 16 paths

The exact accepted delivery manifest remains the frozen 16-path union at lines
498–513 of this ledger and no other path. The controller alone is authorized to
deliver it using commit subject:

```text
feat(graph): add application graph v3 contracts
```

Controller delivery sequence:

1. Reconfirm the current branch and that the unstaged worktree contains exactly
   the 16 accepted paths, with no missing or unexpected path.
2. Stage each of the 16 paths explicitly. Do not use broad staging and do not
   stage ignored, generated, unrelated, or reporting artifacts.
3. Require the staged path list to equal the accepted manifest exactly; require
   no unstaged accepted-path delta; run `git diff --cached --check`, the frozen
   tests/static gates appropriate to the staged tree, and a non-disclosing
   staged sensitive-material scan. Stop on any mismatch or finding.
4. Create exactly one reviewed commit with the subject above. Do not amend,
   rewrite, squash unrelated history, or force-push.
5. Push the current branch without force, then prove local `HEAD` equals the
   upstream branch tip and the worktree is clean. Record the commit hash, exact
   subject, exact 16-path count, push result, equality, and cleanliness back to
   PM.

Only after PM records that post-push equality may this delivery gate be consumed
and the exact Restaurant Task 2/Task 3 shared key-and-binding manifest be frozen.
Task 2 and Task 3 remain `planned` with zero writers until that separate equality
record. Any path mismatch, remote divergence, failed gate, sensitive match, or
dirty post-push tree stops delivery for PM reconciliation.

## Delivery closure — 2026-08-12

Controller delivery is complete on branch
`feat/governed-composition-capability-foundry` at commit
`8230197241589865f289c223fc346b6d91a438ae`, with the exact subject
`feat(graph): add application graph v3 contracts` and exactly the frozen
16-path manifest. The controller reran the complete accepted gate before
staging: focused Graph/browser 111/111, compiler dispatch 12/12, full Graph
465/465, full compiler 23 files/415 tests, both typechecks/builds, Prettier and
diff, declarations 23/23, browser exports 8/8, zero banned Node imports, exact
manifest, and zero sensitive matches.

Staged equality was Expected16/Actual16/Missing0/Unexpected0 with zero unstaged
or untracked paths; cached diff and sensitive checks passed. The commit was
pushed without force. Fresh post-push evidence records local `HEAD` equal to
the upstream tip at the exact commit and a clean worktree (status count 0).
PM therefore marks this prerequisite `delivered`, closes and consumes its
delivery gate, and does not replay that authority.

Delivery does not authorize V2/V3 compilation, a generated target, Product
Publish, integration into `main`, a repository release, cloud deployment,
provider/model/service work, Docker, or Compose. It satisfies the serialized
Graph prerequisite for the separately frozen Restaurant Task 2/Task 3 shared
contract.
