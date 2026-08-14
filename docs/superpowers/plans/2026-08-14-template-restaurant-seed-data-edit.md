# Template Restaurant Seed Data Edit Implementation Plan

> **For the assigned agentic worker:** Execute this plan task-by-task with TDD.
> This is a serialized boundary: one GPT-5.6-Sol writer owns all 22 paths and
> does not delegate, stage, commit, push, install, or use network/services.

**Goal:** Change the delivered Restaurant seed Dish name from `Margherita
pizza` to `Heirloom tomato pizza`, append Draft r.5 and one immutable active
Snapshot V2, and update the Customer Menu and Merchant Menu Management previews
only from the strict server response.

**Architecture:** A narrow five-field command is captured once and validated
against the latest server-owned Graph V3. A pure operation updates only the
index-aligned seed/scenario `values.name` pair and proves complete restoration
equality; the service then runs the existing compiler preview closure and
atomically appends the Draft and dual-surface Snapshot. Workbench derives the
visible value only from a checksum-matched strict instance and replaces previews
only after success.

**Tech stack:** TypeScript 5.9.3, NestJS 10, Prisma 6, React 19, Next.js 15,
Vitest, Playwright, Application Graph V3, Draft Preview Snapshot V2.

## Global constraints

- Exact clean base and upstream:
  `5f984691f426e6068479c44b4fa41baf2f8aaada`.
- Accepted authorities:
  `docs/adr/adr-0015-template-restaurant-seed-data-edit.md` and
  `docs/superpowers/specs/2026-08-14-template-restaurant-seed-data-edit-design.md`.
- TDD is mandatory: focused RED before production edits, minimal GREEN, then
  refactor while green.
- Use direct existing runtimes only. Do not run pnpm, corepack, install,
  dependency resolution, network, provider/model, service, Docker, or Compose.
- Do not change Graph, Capabilities, Product/Screen Recipes, Compiler, Prisma,
  package manifests, lockfiles, generated runtime, Source, Publish, export, or
  deployment paths.
- Do not log, echo, screenshot, or persist raw inputs, values, Graphs,
  Snapshots, credentials, prompts, model responses, or hostile errors.
- Any required implementation path outside the exact 22 below is a PM STOP.
- Writer Git authority is zero. Reviews are read-only; PM/controller alone may
  stage the exact 28 delivery paths, commit, and push after all gates.

---

## Exact implementation manifest

The sole writer may create or edit exactly these 22 paths:

1. `apps/control-plane/src/template/template-data-field-edit.ts` (new)
2. `apps/control-plane/src/template/template.controller.ts`
3. `apps/control-plane/src/template/template.service.ts`
4. `apps/control-plane/test/template-data-field-edit.test.ts` (new)
5. `apps/control-plane/test/template.controller.test.ts`
6. `apps/control-plane/test/template.service.test.ts`
7. `apps/workbench/lib/control-plane-client.ts`
8. `apps/workbench/lib/control-plane-client.test.ts`
9. `apps/workbench/hooks/use-workbench-controller.ts`
10. `apps/workbench/components/workbench.tsx`
11. `apps/workbench/components/template-data-workspace.tsx` (new)
12. `apps/workbench/components/template-data-workspace.test.tsx` (new)
13. `apps/workbench/components/template-draft-workspace.tsx`
14. `apps/workbench/components/template-draft-workspace.test.tsx`
15. `apps/workbench/components/template-page-workspace.tsx`
16. `apps/workbench/components/template-page-workspace.test.tsx`
17. `apps/workbench/components/shell/workbench-shell.tsx`
18. `apps/workbench/components/shell/workbench-shell.test.tsx`
19. `apps/workbench/styles/template-data.css` (new)
20. `apps/workbench/app/globals.css`
21. `apps/workbench/test/template-draft-fixture.ts`
22. `apps/workbench/e2e/template-draft.pw.ts`

No compiler, Graph, Capabilities, recipe, Prisma, package, lock, generated
target/runtime, Docker, Compose, or governance path belongs to the writer.

## Frozen interfaces

`template-data-field-edit.ts` produces exactly:

```ts
export type AppendTemplateDataFieldRevisionInput = {
  readonly baseDraftRevisionId: string;
  readonly entityKey: "menu-item";
  readonly recordId: "margherita-pizza";
  readonly fieldKey: "name";
  readonly value: string;
};

export type TemplateDataFieldEditResult =
  AppendTemplateDataFieldRevisionInput & {
    readonly graph: ApplicationGraphV3;
  };

export function captureTemplateDataFieldRevisionInput(
  input: unknown,
): AppendTemplateDataFieldRevisionInput;

export function applyTemplateDataFieldEdit(
  graphInput: unknown,
  input: unknown,
): TemplateDataFieldEditResult;

export function applyCapturedTemplateDataFieldEdit(
  graphInput: unknown,
  command: AppendTemplateDataFieldRevisionInput,
): TemplateDataFieldEditResult;
```

The Control Plane service consumes the captured command through:

```ts
appendTemplateDataFieldRevision(
  applicationGraphId: string,
  input: unknown,
): Promise<TemplateDraftInstanceV1>;
```

The Workbench client produces:

```ts
appendTemplateDataFieldRevision(
  applicationGraphId: string,
  input: AppendTemplateDataFieldRevisionInput,
): Promise<WorkbenchTemplateDraftInstance>;
```

The exact route is:

```text
POST /template-draft-instances/:applicationGraphId/data-field-revisions
```

## Task 1: Pure strict capture and two-location Graph operation

**Files:**

- Create: `apps/control-plane/test/template-data-field-edit.test.ts`
- Create: `apps/control-plane/src/template/template-data-field-edit.ts`

**Produces:** the three frozen functions and two types above. No Prisma,
renderer, Compiler, clock, network, or global state dependency.

- [x] **Step 1: Write the focused admission RED**

Create table-driven tests that call `captureTemplateDataFieldRevisionInput`
with the exact five fields and assert a frozen primitive copy. Add separate
cases for missing/extra/symbol/non-enumerable/accessor/inherited/custom-
prototype properties; arrays; wrong literals; invalid base Graph keys; values
before/after the 2..120 trimmed bounds; C0/DEL controls; leading/trailing-space
normalization; throwing/revoked Proxies; and objects with throwing `toString`,
`valueOf`, and `toJSON`. Assert getters/conversion hooks remain at zero and every
malformed case throws only `Template Draft request is invalid.` Capture must not
attempt the Graph-dependent current-value/no-op decision covered in Step 4.

- [x] **Step 2: Run the admission test and capture RED**

From `apps/control-plane` run:

```powershell
node node_modules/vitest/vitest.mjs run test/template-data-field-edit.test.ts
```

Expected: FAIL because `../src/template/template-data-field-edit.js` does not
exist. Record only the bounded failure reason and count.

- [x] **Step 3: Implement minimal one-time capture**

Use descriptor-based admission over exactly
`baseDraftRevisionId`, `entityKey`, `recordId`, `fieldKey`, and `value`.
Copy/freeze primitives; never convert caller values. Normalize `value` once.
Return the exact typed literals and fixed messages from the frozen interfaces.

- [x] **Step 4: Add the Graph closure and mutation RED**

Build cases from the real Restaurant Graph V3 fixture and assert:

- exactly one `menu-item` / `margherita-pizza` seed record;
- exactly one `fine-dining-service` scenario and complete index-aligned
  seed/scenario entity/values mirror;
- exact required/string `menu-item.name`, client field authority, three named
  customer read bindings, one named merchant write binding, and
  manager `menu-item:update`;
- valid mutation changes only the seed and aligned scenario `values.name`;
- restored candidate is deeply equal to the entire base and the base/caller
  objects remain unmodified; and
- duplicate/missing/reordered/misaligned seeds/scenarios, entity/field drift,
  authority drift, binding missing/duplicate/access/target drift, and permission
  drift reject with the fixed request error.

Include a normalized no-op case that throws exactly
`Template Draft revision moved; reload before editing.`

- [x] **Step 5: Implement minimal pure operation and restoration proof**

Reassert Graph V3, locate exact entries, clone server-owned data, update the two
index-aligned `name` values, recheck the mirror, restore both names in a clone,
and require full deep structural equality with the base. Reassert the final
Graph V3. Do not add a generic path walker or reusable patch protocol.

- [x] **Step 6: Run focused GREEN**

```powershell
node node_modules/vitest/vitest.mjs run test/template-data-field-edit.test.ts
```

Expected: PASS with every admission, closure, immutability, and restoration
case green.

## Task 2: Control Plane route, Serializable service, and atomic rollback

**Files:**

- Modify: `apps/control-plane/src/template/template.controller.ts`
- Modify: `apps/control-plane/src/template/template.service.ts`
- Modify: `apps/control-plane/test/template.controller.test.ts`
- Modify: `apps/control-plane/test/template.service.test.ts`

**Consumes:** Task 1's exact capture and captured-operation functions; existing
`assertRestaurantDraftPreviewGraphClosure`, `instanceFrom`, local workspace and
origin assertions, transaction conflict helpers, and strict instance response.

**Produces:** the exact route/service signature and atomic r.4 -> r.5 response.

- [x] **Step 1: RED the exact controller delegation**

Assert the route path and one raw-body delegation to
`appendTemplateDataFieldRevision(applicationGraphId, body)`. Prove no other
route/body union and no controller parsing.

- [x] **Step 2: RED capture order and retry reuse**

Instrument capture, Prisma, origin, closure, Draft-create, renderer, and
Snapshot calls. Prove capture occurs exactly once before the first Prisma call;
Application lookup includes local workspace before origin inspection; and the
same captured frozen command is reused across P2034 attempts without touching
the caller again.

- [x] **Step 3: RED current-base and closure behavior**

Cover absent/cross-workspace with identical not-found behavior; invalid origin;
missing latest Draft; stale base; normalized no-op; wrong Graph identity/hash;
all Task 1 closure drift at the service seam; and exact Compiler closure
failure. Assert Graph V3 and
`assertRestaurantDraftPreviewGraphClosure(candidate)` both run before Draft
create or renderer invocation.

- [x] **Step 4: RED success, conflict, and rollback matrix**

For success assert r.4 -> r.5, exactly one Draft row, exactly one new active
Snapshot V2, exact checksum binding, two renders, strict response, and unchanged
r.4 Draft/Snapshot/Graph/bindings. Assert P2002 and exhausted P2034 return fixed 409. Separately inject Graph closure, customer renderer, merchant renderer,
Snapshot insert, and response assembly failures; each must commit zero attempted
Draft/Snapshot rows and preserve prior history.

- [x] **Step 5: Run service/controller RED**

```powershell
node node_modules/vitest/vitest.mjs run test/template-data-field-edit.test.ts test/template.controller.test.ts test/template.service.test.ts
```

Expected: new route/service cases FAIL while the pure suite stays green.

- [x] **Step 6: Implement minimal controller/service orchestration**

Capture once outside the retry loop. Within each Serializable attempt, perform
workspace lookup before origin, latest-base/identity checks, the captured pure
operation, complete Graph V3 assertion, compiler preview closure, Draft create,
and existing atomic `instanceFrom`. Map malformed closure to fixed 400 and
stale/no-op/P2002/exhausted P2034 to fixed 409; do not log raw errors.

- [x] **Step 7: Run focused Control Plane GREEN**

```powershell
node node_modules/vitest/vitest.mjs run test/template-data-field-edit.test.ts test/template.controller.test.ts test/template.service.test.ts
```

Expected: PASS, including zero-append/zero-render and rollback assertions.

## Task 3: Strict Workbench client and checksum-bound seed derivation

**Files:**

- Modify: `apps/workbench/lib/control-plane-client.test.ts`
- Modify: `apps/workbench/lib/control-plane-client.ts`
- Modify: `apps/workbench/test/template-draft-fixture.ts`

**Consumes:** existing `templateDraftResponse`, Graph V3 hash assertion, active
Snapshot V2 admission, exact two-preview parser, and Task 7B r.4 fixture.

**Produces:** the exact typed client method and a fixture whose r.4/r.5 seed and
scenario values remain fully mirrored.

- [x] **Step 1: RED the exact request and strict response**

Assert the encoded route, POST method, and JSON body with exactly the five
fields. Add malformed-response cases for Graph/Snapshot checksum mismatch,
wrong Draft/Snapshot binding, non-active Snapshot, wrong preview pair, seed/
scenario mirror drift, and unsupported seed identity. Prove none returns a
replacement instance.

- [x] **Step 2: RED checksum-before-visible-seed ordering**

Characterize a helper/local parser path that first obtains a strict
`WorkbenchTemplateDraftInstance`, then locates the exact seed and scenario.
Use a mismatched-checksum response containing `Heirloom tomato pizza` and prove
the visible derived value is never returned.

- [x] **Step 3: Run client RED**

```powershell
node node_modules/vitest/vitest.mjs run lib/control-plane-client.test.ts
```

Expected: exact data-field request method and new closure cases FAIL.

- [x] **Step 4: Implement the exact client method and fixture states**

Reuse `templateDraftResponse`; do not duplicate or weaken it. Add only the
typed method and the minimum exact seed/scenario derivation needed by the Data
workspace. Extend the fixture from authoritative r.4 `Margherita pizza` to
authoritative r.5 `Heirloom tomato pizza`, with matching Graph/Snapshot hashes.

- [x] **Step 5: Run client GREEN**

```powershell
node node_modules/vitest/vitest.mjs run lib/control-plane-client.test.ts
```

Expected: PASS with checksum mismatch unable to influence visible seed state.

## Task 4: Controller state and Data navigation without Page regressions

**Files:**

- Modify: `apps/workbench/hooks/use-workbench-controller.ts`
- Modify: `apps/workbench/components/workbench.tsx`
- Modify: `apps/workbench/components/template-draft-workspace.tsx`
- Modify: `apps/workbench/components/template-draft-workspace.test.tsx`
- Modify: `apps/workbench/components/template-page-workspace.tsx`
- Modify: `apps/workbench/components/template-page-workspace.test.tsx`
- Modify: `apps/workbench/components/shell/workbench-shell.tsx`
- Modify: `apps/workbench/components/shell/workbench-shell.test.tsx`

**Consumes:** exact client method; controlled template instance and Builder
destination; existing Page selection/title/order behavior.

**Produces:** a Data destination and save action that replace the instance only
after strict success, with no Page behavior change.

- [x] **Step 1: RED navigation and preserved Page behavior**

Assert active Graph V3 template Builder navigation exposes Page and Data;
Builder -> Data opens the exact workspace context; Preview/Page selection is
preserved; V1 navigation remains unchanged; and Task 7A title plus Task 7B order
tests retain their prior behavior. Back/Escape performs no request.

- [x] **Step 2: RED controller pending/failure/success state**

Assert the action sends current applicationGraphId, current draftRevisionId,
the three literals, and normalized value. Before resolution and after rejection,
the current instance/previews remain r.4 while local input persists. Normalize
all errors to `Template data could not be saved.` On strict success replace the
instance exactly once with r.5; never merge local Graph or preview data.

- [x] **Step 3: Run shell/controller integration RED**

```powershell
node node_modules/vitest/vitest.mjs run components/template-draft-workspace.test.tsx components/template-page-workspace.test.tsx components/shell/workbench-shell.test.tsx
```

Expected: Data navigation/action cases FAIL; delivered Page cases remain green.

- [x] **Step 4: Implement minimal controlled state**

Add the Data destination and one controller action. Pass the strict instance and
action to the new workspace boundary without broadening preview authority or
duplicating seed state in the global controller. Preserve all existing Page
props and selection contracts.

- [x] **Step 5: Run integration GREEN**

Run the Step 3 command. Expected: PASS, including unchanged Page title/order and
V1 behavior.

## Task 5: Accessible Template Data workspace and two authoritative previews

**Files:**

- Create: `apps/workbench/components/template-data-workspace.test.tsx`
- Create: `apps/workbench/components/template-data-workspace.tsx`
- Create: `apps/workbench/styles/template-data.css`
- Modify: `apps/workbench/app/globals.css`

**Consumes:** a checksum-admitted strict instance, exact derived seed closure,
and controlled save callback.

**Produces:** the exact `Menu items -> Margherita pizza -> Dish name` workspace
and Customer Menu/Merchant Menu Management preview panels.

- [x] **Step 1: RED exact visible hierarchy and value source**

Render r.4 and assert the visible labels `Menu items`, `Margherita pizza`,
`Dish name`, `Customer Menu`, and `Merchant Menu Management`. Assert both
previews show `Margherita pizza` from the strict Graph, not a component default
or preview markup. Unsupported/misaligned input must fail closed with fixed UI
error rather than choose another record.

- [x] **Step 2: RED form state and authority**

Cover trim/2..120/control validation, unchanged disabled state, keyboard submit,
Escape/back, busy double-submit prevention, fixed error, preserved failed input,
and successful r.5 replacement. While pending/failing, both previews stay
`Margherita pizza`; after the strict r.5 prop arrives, both change together to
`Heirloom tomato pizza`.

- [x] **Step 3: RED accessibility and responsive structure**

Assert accessible name/description, status live region, deterministic tab
order, focus after success/failure, visible focus class, 44px control contract,
and CSS rules that stack editor/previews without horizontal overflow at 390px
while preserving the 1440px split layout. Use React text only; no raw HTML.

- [x] **Step 4: Run component RED**

```powershell
node node_modules/vitest/vitest.mjs run components/template-data-workspace.test.tsx
```

Expected: FAIL because the component and stylesheet do not exist.

- [x] **Step 5: Implement minimal component and feature CSS**

Keep the component specific to the one accepted field. Import only
`styles/template-data.css` from globals. Reuse existing tokens, form controls,
status conventions, and sparse layout; add no generic table, registry asset,
card grid, gradient, or technical Graph inspector.

- [x] **Step 6: Run component GREEN**

```powershell
node node_modules/vitest/vitest.mjs run components/template-data-workspace.test.tsx components/template-draft-workspace.test.tsx components/template-page-workspace.test.tsx components/shell/workbench-shell.test.tsx
```

Expected: PASS with both previews strictly prop-driven.

## Task 6: Real browser r.4 -> r.5 journey and immutable history evidence

**Files:**

- Modify: `apps/workbench/e2e/template-draft.pw.ts`
- Modify: `apps/workbench/test/template-draft-fixture.ts`
- Test support only if already required in an earlier authorized path.

**Consumes:** all prior tasks and the delivered clone -> rename r.2 -> title
r.3 -> order r.4 journey.

**Produces:** one real-browser proof of the exact visible outcome and reload.

- [x] **Step 1: Extend the Playwright journey and capture RED**

After r.4, navigate Builder -> Data -> Menu items -> Margherita pizza -> Dish
name. Fill `Heirloom tomato pizza`. Before saving and during a controlled failed
save, assert both preview panels remain `Margherita pizza` and the input retains
the new value. Then save successfully and assert r.5, a new Snapshot id/checksum,
and both previews show the new value. Reload and assert the same authoritative
r.5 state.

- [x] **Step 2: Add browser accessibility/responsive assertions**

At 1440px and 390px, prove labelled input/action, keyboard submit, focus after
status change, live announcement, computed contrast meeting WCAG AA for normal
text, minimum 44px interactive height, and no horizontal overflow. Do not add
screenshots containing raw request/Graph material.

- [x] **Step 3: Strengthen server history proof**

In the authorized service test, prove r.4 Draft/Snapshot checksum, full Graph,
seed/scenario values, bindings, and permission remain unchanged after r.5. The
browser test does not invent a history picker.

- [x] **Step 4: Run the real-browser GREEN**

From `apps/workbench` with the existing local Playwright harness:

```powershell
node ../../node_modules/@playwright/test/cli.js test e2e/template-draft.pw.ts --config=playwright.config.ts --workers=1 --reporter=line
```

Expected: PASS 1/1 for clone through authoritative r.5 reload at both viewport
checks. Do not install or start any service outside this tracked local harness.

## Task 7: Writer verification and handoff

- [x] **Step 1: Run focused suites**

From each package directory:

```powershell
# apps/control-plane
node node_modules/vitest/vitest.mjs run test/template-data-field-edit.test.ts test/template.controller.test.ts test/template.service.test.ts

# apps/workbench
node node_modules/vitest/vitest.mjs run lib/control-plane-client.test.ts components/template-data-workspace.test.tsx components/template-draft-workspace.test.tsx components/template-page-workspace.test.tsx components/shell/workbench-shell.test.tsx
```

- [x] **Step 2: Run full compatibility suites**

```powershell
# from each named directory
node node_modules/vitest/vitest.mjs run  # apps/control-plane
node node_modules/vitest/vitest.mjs run  # apps/workbench
node node_modules/vitest/vitest.mjs run  # packages/graph
node node_modules/vitest/vitest.mjs run  # packages/capabilities
node node_modules/vitest/vitest.mjs run  # packages/compiler
```

Record exact files/tests and pass counts. V1 lifecycle/bytes and existing V2
rejection must remain green; compiler preview and production compilation
contracts must remain unchanged.

- [x] **Step 3: Run no-emit, build, and Prisma gates**

From repository root:

```powershell
node node_modules/typescript/bin/tsc -p packages/graph/tsconfig.json --noEmit
node node_modules/typescript/bin/tsc -p packages/capabilities/tsconfig.json --noEmit
node node_modules/typescript/bin/tsc -p packages/compiler/tsconfig.json --noEmit
node node_modules/typescript/bin/tsc -p apps/control-plane/tsconfig.json --noEmit
node node_modules/typescript/bin/tsc -p apps/workbench/tsconfig.json --noEmit
node node_modules/typescript/bin/tsc -p packages/graph/tsconfig.json
node node_modules/typescript/bin/tsc -p packages/capabilities/tsconfig.json
node node_modules/typescript/bin/tsc -p packages/compiler/tsconfig.json
node node_modules/typescript/bin/tsc -p apps/control-plane/tsconfig.json
$env:NEXT_TELEMETRY_DISABLED='1'; Push-Location apps/workbench; node node_modules/next/dist/bin/next build; Pop-Location
Push-Location apps/control-plane; node node_modules/prisma/build/index.js validate --schema prisma/schema.prisma; Pop-Location
```

- [x] **Step 4: Run exact static and containment gates**

Run direct Prettier check on the exact 22 paths, `git diff --check`, browser-
import and sensitive-hunk scans, and exact path-set comparison. Explicitly
assert zero changed path under `packages/compiler`, `packages/graph`,
`packages/capabilities`, Product/Screen Recipes, `prisma`, manifests,
`pnpm-lock.yaml`, Docker, or Compose. Assert the index is empty and no report
artifact is created.

- [x] **Step 5: Hand off without Git mutation**

Report RED reasons, GREEN counts, commands, r.4 immutability/r.5 atomicity,
checksum-before-visible-seed, dual-preview/browser/accessibility evidence,
exact Actual22 equality, and any ambiguity. Do not stage, commit, or push.

## Task 8: Mandatory serialized reviews and controller delivery

- [x] **Step 1: Independent intended-vs-implemented review**

One read-only reviewer reconciles ADR/design/plan against all 22 paths and
probes hostile capture, closure exactness, full restoration equality,
workspace/origin order, fixed 400/409 mapping, retry reuse, rollback,
checksum-bound derivation, non-speculative previews, accessibility, and scope.
Any P0/P1 returns to the same Sol writer for focused TDD repair and full rerun.

- [x] **Step 2: Targeted independent Terra QA**

After task review returns P0/P1=0, one fresh Terra pass reruns focused/full CP,
WB, Graph, Capabilities, Compiler; all five no-emits; Prisma; exact static/
containment; and real Playwright r.4 -> r.5 at 1440/390. Terra is read-only and
uses direct existing runtimes only. This pass is mandatory because the route is
a serialized API/security boundary.

- [x] **Step 3: Final independent Sol release review**

On the exact Terra-passed tree, one fresh Sol reviewer verifies all repaired
boundaries, fresh gates, exact 22+6 containment, delivery policy, and no deferred
Task 7C issue. Release acceptance requires no actionable P0/P1.

- [x] **Step 4: PM acceptance and controller authorization**

PM accepts, but does not deliver, the exact 28-path tree. Final evidence is
focused Control Plane 90 and Workbench 86; full Control Plane 370, Workbench
439, Graph 661, Capabilities 384, and Compiler 501; five no-emit gates, builds,
Prisma, Next, Playwright 1/1, and exact-28/static gates. Intended-vs-implemented
review, targeted Terra QA, and final Sol release review each end at P0/P1/P2
`0/0/0`; Terra returns `READY_FOR_DELIVERY YES` and Sol returns
`RELEASE_ACCEPT`.

- [ ] **Step 5: Controller exact-28 delivery**

Controller stages exactly the 22 implementation paths plus these six governance
paths:

1. `docs/adr/adr-0015-template-restaurant-seed-data-edit.md`
2. `docs/project-status.md`
3. `docs/roadmap.md`
4. `docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md`
5. `docs/superpowers/plans/2026-08-14-template-restaurant-seed-data-edit.md`
6. `docs/superpowers/specs/2026-08-14-template-restaurant-seed-data-edit-design.md`

After staged Expected28/Actual28 equality, sensitive checks, and clean required
gates, create exactly one commit with subject:

```text
feat(workbench): add governed restaurant data editing
```

Push the active branch without force and prove local `HEAD` equals upstream with
no staged, tracked, or untracked residue. A divergence, extra path, gate failure,
or need for wider scope is a STOP, not repair authority.
