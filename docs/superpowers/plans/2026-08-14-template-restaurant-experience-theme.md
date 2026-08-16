# Template Restaurant Experience Theme Revision Implementation Plan

> **For the assigned agentic worker:** Execute this plan task-by-task with TDD.
> This is a serialized security boundary: one GPT-5.6-Sol writer owns all 23
> implementation paths and does not delegate, stage, commit, push, install, or
> use network/providers/services.

**Goal:** Change the delivered Restaurant Draft theme from Light to Dark,
append Draft r.6 and one immutable active Snapshot V2, and switch both Customer
and Merchant Workbench preview frames only after a strict checksum-bound server
response.

**Architecture:** A strict two-field command is captured once and applied only
to the latest server-owned Graph V3 whose latest active Snapshot proves current
identity and checksum. A pure operation changes only
`experience.theme.mode`, proves complete restoration equality, and the service
runs the existing compiler preview closure before atomically appending the
Draft and dual render/Snapshot result. Workbench adds one backed Experience
destination and derives frame theme only from the admitted response Graph.

**Tech stack:** TypeScript 5.9.3, NestJS 10, Prisma 6, React 19, Next.js 15,
Vitest, Playwright, Application Graph V3, Draft Preview Snapshot V2.

**Status:** Implementation, independent repaired-tree review, targeted Terra QA,
and final Sol release review are complete. PM has accepted the exact 29-path
tree for delivery; controller delivery is authorized and not yet executed.

## Global constraints

- Exact clean implementation base and upstream:
  `78955444cb82d95346fb4fbded03167f982eb693`.
- Accepted authorities:
  `docs/adr/adr-0016-template-restaurant-experience-theme-revision.md` and
  `docs/superpowers/specs/2026-08-14-template-restaurant-experience-theme-design.md`.
- TDD is mandatory: focused RED before production edits, minimal GREEN, then
  refactor while green.
- Use direct existing runtimes only. Do not run pnpm, corepack, install,
  dependency resolution, network, provider/model, service, Docker, or Compose.
- Do not change Graph, Capabilities, Product/Screen/Experience Recipes,
  Compiler, Prisma, generated runtime, package manifests, lockfiles, Source,
  Publish, export, Compilation, or deployment paths.
- Do not log, echo, screenshot, or persist raw inputs, ids, Graphs, Snapshots,
  hostile errors, credentials, prompts, or model responses.
- Any needed implementation path outside the exact 23 below is a PM STOP.
- Writer Git authority is zero. Reviews are read-only. PM/controller alone may
  stage the exact 29 delivery paths after all gates and acceptance.

---

## Exact implementation manifest

The sole writer may create or edit exactly these 23 paths:

1. `apps/control-plane/src/template/template-experience-theme-edit.ts` (new)
2. `apps/control-plane/src/template/template.controller.ts`
3. `apps/control-plane/src/template/template.service.ts`
4. `apps/control-plane/test/template-experience-theme-edit.test.ts` (new)
5. `apps/control-plane/test/template.controller.test.ts`
6. `apps/control-plane/test/template.service.test.ts`
7. `packages/workbench-ui/src/index.ts`
8. `packages/workbench-ui/test/boundary.test.ts`
9. `apps/workbench/lib/workbench-model.ts`
10. `apps/workbench/lib/workbench-model.test.ts`
11. `apps/workbench/components/shell/icon-rail.tsx`
12. `apps/workbench/components/shell/workbench-shell.tsx`
13. `apps/workbench/components/shell/workbench-shell.test.tsx`
14. `apps/workbench/lib/control-plane-client.ts`
15. `apps/workbench/lib/control-plane-client.test.ts`
16. `apps/workbench/hooks/use-workbench-controller.ts`
17. `apps/workbench/components/workbench.tsx`
18. `apps/workbench/components/template-experience-workspace.tsx` (new)
19. `apps/workbench/components/template-experience-workspace.test.tsx` (new)
20. `apps/workbench/styles/template-experience.css` (new)
21. `apps/workbench/app/globals.css`
22. `apps/workbench/test/template-draft-fixture.ts`
23. `apps/workbench/e2e/template-draft.pw.ts`

No governance path belongs to the writer. No compiler, Graph, Capabilities,
recipe, Prisma, package, lock, generated target/runtime, Docker, or Compose
path is authorized. Need for any 24th implementation path is a stop.

## Frozen interfaces

`template-experience-theme-edit.ts` produces exactly:

```ts
export type AppendTemplateExperienceThemeRevisionInput = {
  readonly baseDraftRevisionId: string;
  readonly mode: "dark";
};

export type TemplateExperienceThemeEditResult =
  AppendTemplateExperienceThemeRevisionInput & {
    readonly graph: ApplicationGraphV3;
  };

export function captureTemplateExperienceThemeRevisionInput(
  input: unknown,
): AppendTemplateExperienceThemeRevisionInput;

export function applyTemplateExperienceThemeEdit(
  graphInput: unknown,
  input: unknown,
): TemplateExperienceThemeEditResult;

export function applyCapturedTemplateExperienceThemeEdit(
  graphInput: unknown,
  command: AppendTemplateExperienceThemeRevisionInput,
): TemplateExperienceThemeEditResult;
```

The Control Plane service consumes the raw body through:

```ts
appendTemplateExperienceThemeRevision(
  applicationGraphId: string,
  input: unknown,
): Promise<TemplateDraftInstanceV1>;
```

The Workbench client exposes the same method with the exact typed input and
returns `Promise<WorkbenchTemplateDraftInstance>` through the existing strict
response parser. The route is exactly:

```text
POST /template-draft-instances/:applicationGraphId/experience-theme-revisions
```

## Task 1: Pure hostile capture and one-property Graph operation

**Files:**

- Create: `apps/control-plane/test/template-experience-theme-edit.test.ts`
- Create: `apps/control-plane/src/template/template-experience-theme-edit.ts`

**Produces:** the frozen types and three functions above. It has no Prisma,
compiler, renderer, clock, network, or global-state dependency.

- [x] **Step 1: RED exact command admission**

  Table-drive the exact two own enumerable data properties and assert a frozen
  primitive copy. Cover either JSON key order; missing/extra/symbol/non-
  enumerable/accessor/inherited/custom-prototype fields; arrays; invalid or
  over-128 base ids; wrong/cased/string-wrapper modes; throwing/revoked
  Proxies; and `toString`/`valueOf`/`toJSON` traps. Assert getters/conversion
  hooks stay at zero and all malformed inputs throw only
  `Template Draft request is invalid.`

- [x] **Step 2: Run and record the focused admission RED**

  From `apps/control-plane`:

  ```powershell
  node node_modules/vitest/vitest.mjs run test/template-experience-theme-edit.test.ts
  ```

  Expected: FAIL because the new module/function is absent. Record the bounded
  failure, not hostile values.

- [x] **Step 3: GREEN minimal descriptor capture**

  Inspect only own descriptors for `baseDraftRevisionId` and `mode`, validate
  primitive values without conversion, clone/freeze once, and use fixed errors.

- [x] **Step 4: RED Graph closure, mutation, and restoration**

  Start from the real r.5 Restaurant Graph. Assert the valid operation changes
  only `graph.experience.theme.mode` from `light` to `dark`, does not mutate the
  base/caller, restores to complete deep equality including ordering, and
  returns an asserted Graph V3. Cover current dark as exact reload conflict and
  current system/missing theme/other Graph drift as exact invalid request. The
  source Experience Recipe's `supportsDark` is feasibility evidence, not an
  invented Graph property.

- [x] **Step 5: GREEN the smallest pure operation**

  Assert Graph V3 and exact current light, clone, change one value, restore in a
  clone, deep-compare to the complete base, reassert V3, and return fresh data.
  Do not add a generic path walker or patch protocol.

- [x] **Step 6: Run focused pure GREEN**

  ```powershell
  node node_modules/vitest/vitest.mjs run test/template-experience-theme-edit.test.ts
  ```

## Task 2: Control Plane route, current Snapshot, concurrency, and rollback

**Files:**

- Modify: `apps/control-plane/src/template/template.controller.ts`
- Modify: `apps/control-plane/src/template/template.service.ts`
- Modify: `apps/control-plane/test/template.controller.test.ts`
- Modify: `apps/control-plane/test/template.service.test.ts`

**Consumes:** Task 1 capture/captured operation and the existing current-
Snapshot, compiler preview, transaction, rendering, and `instanceFrom` paths.

- [x] **Step 1: RED exact raw-body controller delegation**

  Pin the POST path and one call to
  `appendTemplateExperienceThemeRevision(applicationGraphId, body)`. Prove the
  controller neither parses nor widens the body.

- [x] **Step 2: RED once capture and per-attempt authority**

  Instrument hostile capture, Prisma, origin, Graph/Snapshot assertions,
  compiler closure, Draft create, renderer, and Snapshot create. Prove capture
  is once and before Prisma; local workspace is in the Application lookup
  before origin inspection; and P2034 retries reuse only the captured command
  while re-reading the latest Draft and latest Snapshot.

- [x] **Step 3: RED current identity/hash/active closure**

  Cover absent/cross-workspace identical 404; wrong origin; missing latest
  Draft/Snapshot; stale base; Draft/Application/workspace/name drift; Snapshot
  workspace/Application/Draft/hash/state drift; current dark/no-op; current
  system; Graph V3 failure; and compiler preview closure failure. Assert closure
  completes before Draft create and rendering.

- [x] **Step 4: RED atomic success/conflict/failure matrix**

  Prove r.5 -> r.6, one Draft, two renders, one new checksum-bound active
  immutable Snapshot, strict response, and unchanged r.5/history. P2002 and
  exhausted P2034 return fixed 409. Inject candidate assertion, checksum,
  customer render, merchant render, Snapshot insert, and response-assembly
  failures and assert zero committed attempted Draft/Snapshot.

- [x] **Step 5: Run route/service RED**

  ```powershell
  node node_modules/vitest/vitest.mjs run test/template-experience-theme-edit.test.ts test/template.controller.test.ts test/template.service.test.ts
  ```

- [x] **Step 6: GREEN minimal service orchestration**

  Capture outside the bounded retry loop. In each Serializable attempt perform
  workspace-before-origin lookup, latest base/current Snapshot proofs, pure
  mutation, Graph V3 assertion, existing
  `assertRestaurantDraftPreviewGraphClosure`, Draft create, and atomic
  `instanceFrom`. Preserve fixed 400/404/409 mapping and do not log raw errors.

- [x] **Step 7: Run focused Control Plane GREEN**

  ```powershell
  node node_modules/vitest/vitest.mjs run test/template-experience-theme-edit.test.ts test/template.controller.test.ts test/template.service.test.ts
  ```

## Task 3: Strict Workbench client and checksum-first theme derivation

**Files:**

- Modify: `apps/workbench/lib/control-plane-client.test.ts`
- Modify: `apps/workbench/lib/control-plane-client.ts`
- Modify: `apps/workbench/test/template-draft-fixture.ts`

**Consumes:** existing `templateDraftResponse`, Graph hash and active Snapshot
admission, exact preview-pair parsing, and the r.5 fixture.

- [x] **Step 1: RED exact request and strict result**

  Assert the encoded route, POST, and JSON body containing only
  `{baseDraftRevisionId, mode: "dark"}`. Preserve arbitrary JSON key order on
  response parsing. Cover Graph/Snapshot checksum mismatch, wrong latest
  Draft/Snapshot identity, non-active Snapshot, wrong preview pair, and invalid
  Graph theme; none may return a replacement instance.

- [x] **Step 2: RED checksum-before-visible-theme ordering**

  Pin an exported or local `deriveTemplateExperienceThemeMode(instance)` that
  accepts only a strict instance and returns `light | dark`. A malformed
  checksum response containing dark must fail before visible mode can be
  derived.

- [x] **Step 3: Run client RED**

  ```powershell
  node node_modules/vitest/vitest.mjs run lib/control-plane-client.test.ts
  ```

- [x] **Step 4: GREEN exact client and r.5/r.6 fixture**

  Reuse `templateDraftResponse` unchanged. Add the exact typed client method and
  minimum admitted Graph-derived mode helper. Extend the fixture from r.5 light
  to r.6 dark with matching Graph and Snapshot hashes; do not alter previews to
  smuggle theme state through markup.

- [x] **Step 5: Run client GREEN**

  ```powershell
  node node_modules/vitest/vitest.mjs run lib/control-plane-client.test.ts
  ```

## Task 4: Additive Experience destination and template-only navigation

**Files:**

- Modify: `packages/workbench-ui/src/index.ts`
- Modify: `packages/workbench-ui/test/boundary.test.ts`
- Modify: `apps/workbench/lib/workbench-model.ts`
- Modify: `apps/workbench/lib/workbench-model.test.ts`
- Modify: `apps/workbench/components/shell/icon-rail.tsx`
- Modify: `apps/workbench/components/shell/workbench-shell.tsx`
- Modify: `apps/workbench/components/shell/workbench-shell.test.tsx`

**Produces:** one additive registry destination and Workbench surface; no
change to Workbench chrome `Theme` or existing navigation meaning.

- [x] **Step 1: RED registry order and existing-key compatibility**

  Pin Builder destination order as Page, Data, Workflow, Access, Experience,
  AI, Code, Publish with key `experience`, label `Experience`, icon `palette`.
  Assert prior records and deep-freeze/boundary behavior are unchanged.

- [x] **Step 2: RED Surface and keyboard navigation**

  Add expected `experience` Surface transition and destination mapping. For an
  active template, assert exactly Page, Data, Experience are shown and
  keyboard/arrow/Home/End/focus/`aria-current` behavior remains correct. V1 and
  non-template Builder destinations remain unchanged.

- [x] **Step 3: Run destination RED**

  ```powershell
  node node_modules/vitest/vitest.mjs run test/boundary.test.ts
  ```

  From `apps/workbench`:

  ```powershell
  node node_modules/vitest/vitest.mjs run lib/workbench-model.test.ts components/shell/workbench-shell.test.tsx
  ```

- [x] **Step 4: GREEN additive registry/surface/shell mapping**

  Extend the exact unions/records, add existing Lucide `Palette`, and add
  `experience` to the template destination allowlist. Do not repurpose
  `policy`, `Theme`, or chrome theme toggling.

- [x] **Step 5: Run destination GREEN**

  Repeat both commands and retain the complete existing navigation suites.

## Task 5: Controller and accessible non-speculative Experience workspace

**Files:**

- Modify: `apps/workbench/hooks/use-workbench-controller.ts`
- Modify: `apps/workbench/components/workbench.tsx`
- Create: `apps/workbench/components/template-experience-workspace.tsx`
- Create: `apps/workbench/components/template-experience-workspace.test.tsx`
- Create: `apps/workbench/styles/template-experience.css`
- Modify: `apps/workbench/app/globals.css`
- Modify: `apps/workbench/components/shell/workbench-shell.test.tsx`

**Produces:** one template-only Theme editor and two Graph-derived preview
frames. No global theme or generated preview document changes.

- [x] **Step 1: RED accepted/proposed theme separation**

  Render strict r.5: Light selected/current and both Customer/Merchant frames
  light with accepted Snapshot id. Select Dark and prove frames remain light;
  Save becomes enabled and sends only current Draft id plus dark. Invalid,
  unchanged, and busy state disables duplicate saves.

- [x] **Step 2: RED pending/failure/success controller lifecycle**

  Pending retains r.5/light frames. Failure retains the instance, Dark
  proposal, useful focus, and fixed
  `Template experience could not be saved.` Strict r.6 success replaces the
  instance, marks both frames dark from Graph, announces success, and moves
  focus appropriately. A rapid double submit produces one request.

- [x] **Step 3: RED accessibility and responsive contract**

  Assert labelled native radio group, Light/Dark labels, labelled Customer and
  Merchant frames, live status, keyboard submit/back behavior, focus-visible
  selectors, 44px targets, AA token usage, and CSS that stacks at 390px with no
  fixed-width overflow while retaining the 1440px split.

- [x] **Step 4: Run workspace/controller RED**

  ```powershell
  node node_modules/vitest/vitest.mjs run components/template-experience-workspace.test.tsx components/shell/workbench-shell.test.tsx lib/control-plane-client.test.ts
  ```

- [x] **Step 5: GREEN workspace and controller**

  Add `editTemplateExperienceTheme`, preserving the accepted instance until the
  strict client resolves. Compose the new Surface in `workbench.tsx`; derive
  current mode and both frame classes only from the admitted instance. Use
  local proposal state only for the radio and command.

- [x] **Step 6: Run focused Workbench GREEN**

  Repeat the command, then run all directly affected Workbench tests.

## Task 6: Real browser r.5 -> r.6, reload, accessibility, and 390px

**Files:**

- Modify: `apps/workbench/e2e/template-draft.pw.ts`
- Modify: `apps/workbench/test/template-draft-fixture.ts`

- [x] **Step 1: Extend the serialized route fixture**

  Pin the exact Experience POST body and strict r.6 response. Maintain current
  Snapshot/hash/active identity and prior r.1 -> r.5 history. Include one fixed
  rejected save followed by success; do not add a service or network action.

- [x] **Step 2: RED the real journey**

  Continue the current browser test from r.5. Navigate Builder -> Experience ->
  Theme, select Dark, and prove both actual frames stay light before/during the
  rejected save. Assert the fixed failure, retained proposal/focus, one request
  under double activation, then retry to r.6 and prove both frames dark only
  after response. Reload and prove strict r.6 dark state.

- [x] **Step 3: Add real accessibility/responsive evidence**

  At 1440px and 390px use keyboard navigation/radio/save, assert labelled/live
  controls, focus, target size, frame contrast/class state, document/client
  width equality, and no horizontal overflow.

- [x] **Step 4: Run Playwright GREEN**

  From `apps/workbench`, against the existing local test harness only:

  ```powershell
  node node_modules/playwright/cli.js test e2e/template-draft.pw.ts --workers=1
  ```

  Expected: the single serialized r.1 -> r.6/reload journey passes. The writer
  must stop rather than start a new service if the existing harness is absent.

## Task 7: Full compatibility, build, Prisma, and exact static gates

- [x] **Step 1: Run all focused suites together**

  Direct Vitest runs must cover the new pure operation plus complete affected
  Control Plane, Workbench client/model/workspace/shell, and Workbench UI
  boundary tests.

- [x] **Step 2: Run full compatibility suites**

  From each package directory, using its existing local runtime:

  ```powershell
  node node_modules/vitest/vitest.mjs run
  ```

  Run this for `apps/control-plane`, `apps/workbench`,
  `packages/workbench-ui`, `packages/graph`, `packages/capabilities`, and
  `packages/compiler`. Every suite must pass; no snapshot update is allowed.

- [x] **Step 3: Run six no-emit checks and builds**

  In each of those six directories run the repository-resolved TypeScript
  binary with `--noEmit` against its `tsconfig.json`. Run existing TypeScript
  builds for Control Plane, Workbench UI, Graph, Capabilities, and Compiler;
  run the existing direct Next build for Workbench. No package manager or
  dependency resolution command is permitted.

- [x] **Step 4: Run Prisma and browser gates**

  From `apps/control-plane`:

  ```powershell
  node node_modules/prisma/build/index.js validate --schema prisma/schema.prisma
  ```

  Repeat the serialized Playwright command from Task 6 after builds.

- [x] **Step 5: Prove exact-23 containment and forbidden zero**

  Compare all implementation changes to the ordered 23-path manifest. Require
  Expected23/Actual23, missing 0, unexpected 0, staged 0. Explicitly require
  zero changed path under Graph, Capabilities, Product/Screen/Experience
  Recipes, Compiler, Prisma schema/migrations, generated runtime, package/
  workspace manifests, lockfiles, Source/Publish/Compilation/export, provider,
  service, Docker, or Compose.

- [x] **Step 6: Run exact static evidence**

  Run direct Prettier check on the exact 23; `git diff --check`; imports/exports
  for the new files; browser source-import closure; dependency-boundary scan;
  route/method/literal/fixed-error/retry/Serializable checks; absence of
  logging/input echo; no temporary markers or focused-test modifiers; no
  sensitive-material match in changed hunks. Inspect `git status --short` and
  keep the index empty.

## Task 8: Independent review, targeted QA, release, and delivery

Evidence: independent review `PASS` after the P1 repair; targeted Terra `PASS`;
final Sol `RELEASE_ACCEPT`, actionable P0/P1/P2=0/0/0; and
`PM_DELIVERY_AUTHORITY YES` for the exact 29 paths and frozen subject.

- [x] **Step 1: Independent intended-vs-implemented Sol review**

  Pause the writer. One independent read-only reviewer reconciles ADR-0016,
  design, plan, delivery policy, exact diff, Graph/Compiler closure, hostile
  capture, latest-Snapshot authority, concurrency/rollback, strict client,
  non-speculative frames, navigation compatibility, tests, and exact
  containment. Any P0/P1 returns to the same writer for bounded RED/GREEN repair
  inside the exact 23, followed by re-review.

- [x] **Step 2: Targeted Terra security/browser QA**

  After review passes with no P0/P1, one fresh read-only Terra pass independently
  probes hostile two-field admission, once-only retry capture, workspace-before-
  origin, latest active Snapshot/hash binding, fixed 400/409, atomic rollback,
  response admission, pending/failure authority, double submit, r.5 history,
  r.6 reload, keyboard/focus/contrast, and 390px overflow. It reruns focused/full
  six-package, no-emit/build/Prisma/Next/Playwright and exact/static gates.

- [x] **Step 3: Final independent Sol release review**

  On the exact Terra-passed tree, one fresh read-only Sol reviewer returns
  `RELEASE_ACCEPT` only with actionable P0/P1=0 and reconciled exact evidence.

- [ ] **Step 4: Controller-only delivery (PM acceptance complete)**

  PM acceptance is recorded. Only the controller may stage the exact 23
  implementation plus exact six governance paths below, prove
  Expected29/Actual29 staged equality with zero missing, unexpected, unstaged,
  or untracked path, run staged diff/sensitive checks, and commit exactly:

  ```text
  feat(workbench): add governed restaurant theme editing
  ```

  Push the active branch without force, then prove local `HEAD` equals upstream
  and the worktree/index are clean. Any equality or containment failure stops
  delivery.

## Exact controller governance manifest

1. `docs/adr/adr-0016-template-restaurant-experience-theme-revision.md`
2. `docs/project-status.md`
3. `docs/roadmap.md`
4. `docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md`
5. `docs/superpowers/plans/2026-08-14-template-restaurant-experience-theme.md`
6. `docs/superpowers/specs/2026-08-14-template-restaurant-experience-theme-design.md`

## Stop conditions

Stop and return to PM before editing outside the 23 paths or if the slice needs
another mode/property, automatic rebase, generic Experience protocol, mutable
history, generated-runtime theme output, Graph/Capability/Recipe/Compiler/
Prisma/package/lock changes, an external provider/service/network, Publish,
Compilation, export, deployment, or Access permission work. A failed Graph V3
or existing compiler preview closure is a design stop, not a reason to widen.
