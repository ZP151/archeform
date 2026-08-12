# Application Graph V3 Prerequisite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the accepted additive Application Graph V3, Draft Preview
Snapshot V2, strict V2-to-V3 Draft conversion, and fail-closed compiler version
entry without changing V1/V2 behavior or starting Restaurant/UI work.

**Architecture:** One serialized integration writer adds V3 beside immutable V1
and V2. V3 retains V2 structure while replacing journey-wide actors with ordered
transition steps and replacing Domain-only binding policies with a strict typed
Domain/Flow/Policy union. The compiler gains only a strict Published-envelope
dispatcher: V1 delegates byte-identically to the legacy compiler, while V2/V3
remain explicitly unsupported until a later compiler-target task.

**Tech Stack:** TypeScript, Zod, Vitest, existing canonical `digestJson`, existing
`@factory/graph` browser entry, and existing `@factory/compiler` facade. No new
package or runtime coordinate.

## Global Constraints

- Accepted ADR:
  `docs/adr/adr-0010-restaurant-product-graph-v3-and-ui-registry-boundary.md`.
- Exact contract authority:
  `docs/superpowers/ledgers/2026-08-12-application-graph-v3-prerequisite.md`.
- Keep the Golden runtime, framework, dependency, database, queue, provider,
  service, target-plugin, generated-template, Docker, and Compose profile
  unchanged.
- Preserve every V1/V2 schema, byte, canonical hash, adapter branch, browser
  export, snapshot V1 behavior, compiler API, and legacy compiler output.
- Use only the exact 10 writer-owned paths in the ledger. No manifest, lockfile,
  capability, UI, Workbench, Control Plane, worker, provider, service, Docker,
  Compose, ADR, plan, status, roadmap, or ledger edit is permitted.
- Production compilers consume only strict digest-verified Published envelopes.
  Drafts and preview snapshots cannot compile, deploy, export, publish, promote,
  or create a Compilation.
- Flow and Policy bindings are untrusted declarations. They never grant
  authority and never bypass server tenant, application, revision, actor,
  policy, transition, idempotency, or concurrency checks.
- The implementation writer does not commit or push. The controller may create
  exactly one reviewed commit only after all review, QA, release, and PM
  acceptance gates pass.
- Task 2 and Task 3 retain zero writers until Graph V3 is delivered and PM
  freezes their exact shared Restaurant key-and-binding manifest.

---

### Task 1: Implement the serialized Graph V3 prerequisite

**Files:**

- Create: `packages/graph/src/application-graph-v3.ts`
- Create: `packages/graph/src/draft-preview-snapshot-v2.ts`
- Create: `packages/graph/test/application-graph-v3.test.ts`
- Create: `packages/graph/test/draft-preview-snapshot-v2.test.ts`
- Create: `packages/compiler/test/application-graph-version-dispatch.test.ts`
- Modify: `packages/graph/src/application-graph-adapter.ts`
- Modify: `packages/graph/src/index.ts`
- Modify: `packages/graph/src/browser.ts`
- Modify: `packages/graph/test/application-graph-adapter.test.ts`
- Modify: `packages/compiler/src/index.ts`

**Interfaces:**

- Consumes: delivered `ApplicationGraphV2`, `PublishedApplicationGraphV1Input`,
  `PublishedApplicationGraphV2Input`, `Sha256Digest`, `digestJson`, strict
  Published adapter, Snapshot V1 lifecycle, `CapabilityCompositionLockV1`, and
  legacy `generateApplicationBundle`.
- Produces: `ApplicationGraphV3JourneyStep`, `ApplicationGraphV3Journey`, the
  three discriminated V3 binding-policy types and union,
  `ApplicationGraphV3`, `applicationGraphV3Schema`,
  `assertApplicationGraphV3`, `hashApplicationGraphV3`,
  `PublishedApplicationGraphV3Input`, the expanded strict Published union,
  `ApplicationGraphV2ToV3UpgradeContext`,
  `ApplicationGraphV3DraftRevision`,
  `upgradeApplicationGraphV2ToV3Draft`, `DraftPreviewSnapshotV2` and its schema,
  hash/assert/transition APIs, `PublishedApplicationGraphCompilationInput`, and
  `generateVersionedApplicationBundle`.

- [ ] **Step 1: Write the Graph V3 journey and binding REDs**

Create `packages/graph/test/application-graph-v3.test.ts` with a strict V3
fixture containing a distributed-role flow and all three binding discriminators.
The public imports must be exact:

```ts
import {
  assertApplicationGraphV3,
  hashApplicationGraphV3,
  type ApplicationGraphV3,
} from "../src/application-graph-v3.js";
```

The positive fixture must exercise steps such as:

```ts
steps: [
  {
    flowKey: "order",
    from: "draft",
    event: "submit",
    to: "submitted",
    actorRoleKey: "customer",
  },
  {
    flowKey: "order",
    from: "submitted",
    event: "accept",
    to: "accepted",
    actorRoleKey: "kitchen",
  },
];
```

Add table-driven negative assertions for every exact journey and binding error
listed in the contract ledger: duplicate and unknown journeys, exact transition
tuple duplication, actor/Policy grant failure, discontinuity, uncovered or
unreachable flows, invalid discriminator fields, target relabelling, duplicate
binding tuple, unresolved members, server-field write, and forbidden
authority/grant/tenant additions. Assert object-key canonicalization, array-order
significance, and a literal V3 hash vector derived only after the fixture is
frozen.

- [ ] **Step 2: Run the Graph V3 RED**

Run:

```powershell
pnpm --filter @factory/graph exec vitest run test/application-graph-v3.test.ts
```

Expected: FAIL because `application-graph-v3.ts` and its public APIs do not yet
exist. Record the failure count and representative missing-module/export error.

- [ ] **Step 3: Implement the strict Graph V3 schema and semantics**

Create `packages/graph/src/application-graph-v3.ts`. Implement these exact
public shapes:

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

Use the exact target formats, invariants, and error strings in the contract
ledger. Hash only `assertApplicationGraphV3(input)` through `digestJson`.

- [ ] **Step 4: Run the Graph V3 focused GREEN**

Run:

```powershell
pnpm --filter @factory/graph exec vitest run test/application-graph-v3.test.ts
```

Expected: PASS for distributed-role steps, strict discriminators, canonical
hashing, exact errors, and retained Domain authority rules.

- [ ] **Step 5: Write adapter and V2-to-V3 conversion REDs**

Extend `packages/graph/test/application-graph-adapter.test.ts` to import:

```ts
import {
  adaptPublishedApplicationGraph,
  upgradeApplicationGraphV2ToV3Draft,
  type ApplicationGraphV2ToV3UpgradeContext,
  type PublishedApplicationGraphV3Input,
} from "../src/application-graph-adapter.js";
```

Assert strict Published V3 adaptation; unknown V4, cross-version, wrong hash,
Draft, snapshot, extra-key, inherited, and non-plain failures; immutable fresh
upgrade output; exact V2 source lineage; a new Draft ID and positive revision;
unchanged pages/blocks/binding strings; and array-order-preserving conversion of
each V2 policy to `{ kind: "domain-field", ...policy }`. The context is exactly:

```ts
type ApplicationGraphV2ToV3UpgradeContext = {
  migrationVersion: "factory.application-graph-v2-to-v3/v1";
  targetDraftRevisionId: string;
  targetDraftRevisionNumber: number;
  journeys: ApplicationGraphV3["journeys"];
};
```

- [ ] **Step 6: Run the adapter RED and implement the exact V3 envelopes**

Run the RED:

```powershell
pnpm --filter @factory/graph exec vitest run test/application-graph-adapter.test.ts
```

Expected: FAIL on missing V3 envelope and upgrade exports. Then modify
`packages/graph/src/application-graph-adapter.ts` to add the exact Published V3
envelope, expand the Published union to V1/V2/V3, extend only the strict outer
enum, and implement:

```ts
export function upgradeApplicationGraphV2ToV3Draft(
  source: PublishedApplicationGraphV2Input,
  context: ApplicationGraphV2ToV3UpgradeContext,
): ApplicationGraphV3DraftRevision;
```

The migration version is exactly
`factory.application-graph-v2-to-v3/v1`; the lineage kind is exactly
`application-graph-v2-upgrade`; source lineage omits Graph bytes. Do not accept
binding policies or page edits in the context and do not add a down-converter.
Re-run the adapter file and expect PASS.

- [ ] **Step 7: Write and implement Snapshot V2 through RED/GREEN**

Create `packages/graph/test/draft-preview-snapshot-v2.test.ts`, first importing
the missing V2 APIs and asserting RED. Implement
`packages/graph/src/draft-preview-snapshot-v2.ts` with exact literals:

```ts
apiVersion: "factory.draft-preview-snapshot/v2";
graphVersion: "factory.application-graph/v3";
```

Export exactly:

```ts
draftPreviewSnapshotV2Schema;
DraftPreviewSnapshotV2;
DraftPreviewSnapshotV2TransitionCommand;
DraftPreviewSnapshotV2TransitionResult;
hashDraftPreviewSnapshotV2;
assertDraftPreviewSnapshotV2;
transitionDraftPreviewSnapshotV2;
```

Reuse Snapshot V1 lifecycle behavior without widening or changing V1. Assert the
pinned checksum exactly:

```text
sha256:d6382d36dc4d7dffae1a1cc9d32878ee9458e3566a3aafd63c553e78116189f7
```

Test legal transitions, stale revision/hash, time boundaries, terminal states,
cross-version rejection, input immutability, and explicit rejection of `deploy`,
`export`, `publish`, and `create-compilation`. Run:

```powershell
pnpm --filter @factory/graph exec vitest run test/draft-preview-snapshot-v2.test.ts test/draft-preview-snapshot.test.ts
```

Expected: both Snapshot V2 and unchanged Snapshot V1 tests PASS.

- [ ] **Step 8: Export identical Node/browser public surfaces**

Modify `packages/graph/src/index.ts` and `packages/graph/src/browser.ts` to export
`application-graph-v3.ts` and `draft-preview-snapshot-v2.ts`. Extend the adapter
browser assertions so every new V3 and Snapshot V2 function is identical through
the browser entry and no Node runtime import enters the browser closure.

Run:

```powershell
pnpm --filter @factory/graph exec vitest run test/application-graph-v3.test.ts test/application-graph-adapter.test.ts test/draft-preview-snapshot-v2.test.ts test/browser-entry.test.ts
```

Expected: PASS with V1/V2/V3 Node/browser parity.

- [ ] **Step 9: Write the compiler dispatch RED**

Create `packages/compiler/test/application-graph-version-dispatch.test.ts` and
import the missing API:

```ts
import {
  generateApplicationBundle,
  generateVersionedApplicationBundle,
  type PublishedApplicationGraphCompilationInput,
} from "../src/index.js";
```

Assert that a valid Published V1 envelope delegates to the existing compiler
with deep equality for bundle, file order, content bytes, digests, paths, graph
hash, and root directory. Assert exact valid-envelope errors:

```text
Published Application Graph version 'factory.application-graph/v2' is not supported by the current compiler.
Published Application Graph version 'factory.application-graph/v3' is not supported by the current compiler.
```

Assert malformed, wrong-hash, Draft, and snapshot inputs fail in the Graph
adapter before version dispatch. Missing, extra, inherited, or non-plain wrapper
fields fail exactly:

```text
Versioned compilation input must be a plain record with exactly publishedGraph and compositionLock.
```

Run the new test and expect RED because the versioned API is absent.

- [ ] **Step 10: Implement the fail-closed compiler entry and run GREEN**

Modify only `packages/compiler/src/index.ts`. Keep every legacy signature and
code path unchanged. Add:

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

Strict-adapt before dispatch. Delegate V1 exactly:

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

Reject V2/V3 with the exact frozen messages. Add no projection and no target
plugin. Run:

```powershell
pnpm --filter @factory/compiler exec vitest run test/application-graph-version-dispatch.test.ts
```

Expected: PASS with byte-identical V1 and fail-closed V2/V3.

- [ ] **Step 11: Run complete GREEN and compatibility gates**

Run exactly:

```powershell
pnpm --filter @factory/graph test
pnpm --filter @factory/compiler test
pnpm --filter @factory/graph typecheck
pnpm --filter @factory/compiler typecheck
pnpm --filter @factory/graph build
pnpm --filter @factory/compiler build
pnpm exec prettier --check packages/graph/src/application-graph-v3.ts packages/graph/src/draft-preview-snapshot-v2.ts packages/graph/src/application-graph-adapter.ts packages/graph/src/index.ts packages/graph/src/browser.ts packages/graph/test/application-graph-v3.test.ts packages/graph/test/draft-preview-snapshot-v2.test.ts packages/graph/test/application-graph-adapter.test.ts packages/compiler/src/index.ts packages/compiler/test/application-graph-version-dispatch.test.ts
git diff --check
```

Expected: all focused and full suites, typechecks, builds, exact-10 formatting,
and diff checks PASS. The delivered V2 literal hash remains exactly:

```text
sha256:5259c788d7fe1629c0e8271e6dd00925227227305e8dcb5a9df5124f8cdb5dae
```

- [ ] **Step 12: Prove containment, declarations, browser safety, and self-review**

Compare the writer diff against the exact 10-path manifest and require
`Expected=10 Actual=10 Missing=0 Unexpected=0`. Inspect generated declarations
for every frozen public symbol. Dynamically import `@factory/graph/browser` and
assert every V3/Snapshot V2 runtime export is present. Scan the Graph browser
closure for banned `node:` imports. Review for input mutation, prototype/inherited
lookup, ambiguous dispatch, V1/V2 expectation drift, Graph down-conversion,
binding-as-authority, credential/raw-model material, and path expansion.

Expected: all checks PASS and the writer reports RED counts, GREEN counts,
exact changed paths, residual risks, and no commit or push.

## Review, QA, release, acceptance, and delivery

1. One independent GPT-5.6-Sol task review reconciles accepted ADR-0010, the
   frozen ledger, exact code/tests, browser declarations, lifecycle, V1/V2
   compatibility, and compiler V1 parity. Any open P0/P1 returns the task to
   `implementing` under a PM-frozen repair.
2. On clean task review, PM moves the task to `ready_for_qa` and authorizes one
   fresh provider/model/network/service/Docker-free Terra QA on the exact tree.
3. On QA PASS with no P0/P1, one independent final GPT-5.6-Sol release review
   runs read-only on the same tree.
4. Only final `ACCEPT` with no P0/P1 permits fresh PM verification and task
   acceptance.
5. After acceptance, the controller freezes the full delivery manifest, stages
   only those paths, runs staged diff/containment and a non-disclosing sensitive
   scan, creates one commit with subject
   `feat(graph): add application graph v3 contracts`, pushes without force, and
   proves local `HEAD` equals upstream with a clean worktree.
6. Only delivered equality permits PM to freeze the Restaurant Task 2/Task 3
   key-and-binding manifest and start their path-disjoint writers under the
   already recorded conditional founder authority.

## Release-review repair round — 2026-08-12

Final Sol release review rejected the initial Terra-passed tree with
P0/P1/P2=0/2/0. This repair preserves every public signature, schema field,
serialized version, compiler behavior, dependency, and the exact ten-path
implementation/sixteen-path delivery manifests. The same writer may edit only:

1. `packages/graph/src/application-graph-adapter.ts`
2. `packages/graph/test/application-graph-adapter.test.ts`
3. `packages/graph/src/application-graph-v3.ts`
4. `packages/graph/test/application-graph-v3.test.ts`
5. `packages/graph/src/draft-preview-snapshot-v2.ts`
6. `packages/graph/test/draft-preview-snapshot-v2.test.ts`

- [x] **Repair RED A: reject hostile recursive arrays**

In the adapter test, add digest-matched Published V1/V2/V3 and V2-to-V3 context
cases for array subclasses, custom array prototypes, accessor indexes,
sparse/inherited indexes, and nested hostile arrays. Prove rejection without
invoking any accessor or caller-controlled method. Run only the adapter test and
record the RED counts with production untouched.

- [x] **Repair GREEN A: use the strict standard dense-array boundary**

In the adapter source, require exactly `Array.prototype`, own enumerable data
descriptors at every canonical index, no non-index own key except `length`, and
manual/intrinsic copying from descriptor values into a fresh standard array.
Never call an instance `.map()`, iterator, accessor, inherited index, or caller
method. Run the adapter test GREEN and retain Published V1/V2/V3 hashes and
V2-to-V3 lineage.

- [x] **Repair RED B: reject hostile direct Graph/Snapshot inputs**

In the V3 and Snapshot V2 tests, exercise Node and browser schema/assert/hash/
transition exports with inherited required fields, symbol/non-enumerable extras,
accessors, array subclasses/custom prototypes, nested hostile arrays, and
hostile commands. Assert accessors are not invoked and exported-schema
`safeParse` fails. Run only these two tests and record RED counts with their
production files untouched.

- [x] **Repair GREEN B: enforce one all-own boundary per direct module**

In the V3 and Snapshot V2 sources, apply the same recursive plain-record and
standard dense-array boundary before direct public/browser parsing. Records
allow only `Object.prototype` or `null` and own enumerable string-keyed data
descriptors. Consume descriptor values without invoking accessors. The exported
schemas and assert/hash/transition functions enforce the same boundary. Private
helpers stay local; do not add or modify a shared source file.

- [x] **Repair verification and handoff**

Run the combined three focused test files, full Graph/compiler suites,
Graph/compiler typecheck and build, exact-10 Prettier, diff, six-path repair
containment, 10-path implementation containment, 16-path delivery containment,
declarations, browser exports/closure, pinned hash/compatibility checks, and the
non-disclosing changed-hunk sensitive scan. Then hand off to one same-Sol task
re-review, one fresh Terra QA, and one new final Sol release review. No
acceptance, commit, push, or Task 2/Task 3 authority exists before fresh PM
reconciliation of an explicit final `ACCEPT` with no open P0/P1.

Repair outcome: adapter RED 20 failed/26 passed and direct V3/Snapshot RED 15
failed/41 passed with production untouched; GREEN combined 110/110,
compatibility 180/180, full Graph 465/465, compiler 411/411, and dispatch 8/8.
All frozen static, containment, declaration/browser/import, sensitive, and hash
gates pass. Same-Sol re-review is `COMPLIANT`/`APPROVED`, P0/P1/P2=0/0/0, with
121/121 hostile checks rejected and zero caller invocation. PM has moved the
slice to `ready_for_qa` and authorized one fresh read-only Terra pass; later
gates remain blocked.

Repaired-tree Terra outcome: `PASS`, P0/P1/P2=0/0/0. Focused repair 110/110,
compatibility/browser 180/180, hostile arrays 28/28, direct Graph/Snapshot
boundaries 23/23, corrected helper 6/6 with zero caller invocations, compiler
dispatch 8/8, Graph 465/465, and compiler 411/411 pass with all frozen static,
6/10/16 containment, declaration/browser/import, hash, and sensitive gates.
The initial helper anomaly was inversion/spread in the QA probe only; corrected
rerun passed without a product finding or file edit. Exactly one new read-only
Sol final release review is authorized on this tree. Acceptance and all later
authority require `RELEASE_ACCEPT` with no open P0/P1 and fresh PM
reconciliation.

## Compiler-wrapper release repair round — 2026-08-12

The new final Sol review returns `RELEASE_REJECT`, P0/P1/P2=0/1/0. Both prior
Graph boundary P1 families remain closed and no other finding is open. The same
writer may modify only:

1. `packages/compiler/src/index.ts`
2. `packages/compiler/test/application-graph-version-dispatch.test.ts`

- [x] **Compiler wrapper RED**

With production untouched, add zero-invocation cases for accessor
`publishedGraph`, accessor `compositionLock`, non-enumerable data
`publishedGraph`, and non-enumerable data `compositionLock`. Every case must
throw the existing exact wrapper error. Retain valid ordinary data-descriptor
controls for byte-identical V1 parity and exact V2/V3 unsupported errors.

- [x] **Compiler wrapper GREEN**

Inspect both own descriptors, require enumerable data descriptors, consume only
their descriptor `.value` fields, and never dereference the caller properties.
Change no public contract, error string, Graph path, target, or template.

- [x] **Compiler repair verification and handoff**

Run focused dispatch, full compiler 411/411, full Graph 465/465, both
typecheck/build gates, exact-10 format, diff, exact 2/10/16 containment,
declarations, browser export/import checks, pinned hashes, both prior hostile
matrices, and sensitive scan. Then hand off to same-Sol task re-review, fresh
Terra QA, and another final independent Sol release review. Acceptance requires
later `RELEASE_ACCEPT` with no open P0/P1 and fresh PM reconciliation.

The third failed review/repair-cycle escalation threshold is recorded. Any
further rejection, shared-contract change, or path expansion stops another
writer round pending controller governance escalation.

Compiler repair outcome: RED 4 failed/8 passed with production untouched;
GREEN focused 12/12, compiler 415/415, Graph 465/465, hostile 110/110, and
compatibility/browser 180/180. All frozen static, 2/10/16 containment,
declaration/browser/import, sensitive, and hash gates pass. Same-Sol re-review
is `COMPLIANT`/`APPROVED`, P0/P1/P2=0/0/0; accessors and hidden data for both
required fields reject exactly with zero getter calls, while validation order
and parity controls remain exact. PM has moved the slice to `ready_for_qa` and
authorized one fresh read-only Terra pass. Later gates remain blocked and the
third-cycle escalation stays active.

Compiler-repaired Terra outcome: `PASS`, P0/P1/P2=0/0/0. Dispatch 12/12,
hostile 110/110, compatibility/browser 180/180, Graph 465/465, independent
descriptor probe 13/13, direct Graph/Snapshot probe 8/8, typecheck/build,
format/diff, 2/10/16 containment, declarations 23/23, browser 8/8, zero imports/
sensitive matches, and all pins pass. Three full compiler processes exited 0;
their captured aggregate stdout was truncated after database parity, so Terra
does not independently claim the exact 415 count. Prior writer/reviewer/PM
415/415 evidence remains separately recorded. No product defect or QA edit was
found.

Under the recorded third-cycle escalation, exactly one final independent
read-only Sol release review is authorized. It must adjudicate the transparent
compiler-output limitation and return `RELEASE_ACCEPT` or `RELEASE_REJECT` with
P0/P1/P2 and evidence. No further writer round is authorized by this plan;
acceptance and later authority require `RELEASE_ACCEPT` with no open P0/P1 and
fresh PM reconciliation.

Final outcome: independent Sol returns `RELEASE_ACCEPT`, P0/P1/P2=0/0/0. PM
freshly verifies focused Graph/browser 111/111, dispatch 12/12, Graph 465/465,
compiler 23 files/415 tests, both typecheck/build gates, exact-10 format, diff,
10/16 containment, declarations 23/23, browser 8/8, zero banned imports,
sensitive matches 0, and all three pins. The Terra output limitation is closed
by complete final-review and PM raw compiler results.

The prerequisite is `accepted` but not delivered. Controller-only delivery is
limited to the frozen 16 paths and exact commit subject
`feat(graph): add application graph v3 contracts`, followed by a non-force push
and proof of local/upstream equality with a clean tree. Task 2/Task 3 stay at
zero writers until PM separately records delivery equality and freezes their
shared manifest.
