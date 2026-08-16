# Workbench Prompt-to-Live Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the first visible Workbench rebuild slice: an Archeform
Workspace Home and a distinct Builder Workspace that preserve the existing
Describe, resume, edit, preview, and Publish behavior while removing Graph
administration from the default frame.

**Architecture:** Reuse the existing Workbench controller and Control Plane
client without changing their wire contracts. A small shared Workbench UI
registry defines the two implemented contexts and their backed destinations;
an app-local shell machine derives context from the current surface and product
journey. The existing journey components remain the behavioral source while a
new Building Preview composes conversation and the current Draft canvas. CSS is
extracted only for shell, Workspace Home, and Builder responsibilities touched
by this slice; later Task 6 slices finish client/controller extraction, template
instantiation, Snapshot V2 lifecycle, and App Management.

**Tech Stack:** React 19, Next.js 15, TypeScript, Vitest, Lucide React, existing
`@factory/workbench-ui`, and existing Workbench/Control Plane APIs.

## Global Constraints

- Preserve Draft -> Publish -> immutable Compilation. Do not add or change a
  Graph, API, serialization, lifecycle, provider, runtime, database, external
  dependency, Docker, or Compose contract.
- Use only existing locked React, TypeScript, Vitest, and Lucide coordinates.
  The only dependency edit is the internal workspace edge from
  `@factory/workbench` to the accepted `@factory/workbench-ui` package.
- Do not call `pnpm`, `corepack`, an installer, or the network. Update only the
  Workbench importer block in `pnpm-lock.yaml`; package snapshots stay exact.
- Keep every visible control backed by existing behavior. Do not render template
  cloning, App Management, analytics, domains, agents, MCP, cloud, or Fleet.
- Keep Graph, plan, capability locks, lineage, evidence, schemas, Prisma, SQL,
  and Casbin out of the default frame. The existing Inspector becomes
  `Advanced`, starts closed, and remains read-only.
- Use Archeform / Archeform · 元象 in active Workbench copy and metadata. Do not
  rename `@factory/*`, serialized `factory.*` identifiers, Git paths, or history.
- Preserve all 354 baseline Workbench tests. Start new behavior with focused
  RED -> GREEN tests before production changes.
- New files target at most 250 lines. New feature CSS targets at most 300 lines.
  `globals.css` receives imports and loses extracted shell/Home/Builder rules;
  later slices complete its <=150-line migration.
- Deliver once after one independent code review and fresh verification.

## Exact Implementation Manifest

- Modify: `packages/workbench-ui/src/index.ts`
- Modify: `packages/workbench-ui/test/boundary.test.ts`
- Modify: `apps/workbench/package.json`
- Modify: `pnpm-lock.yaml` (only `apps/workbench` importer)
- Modify: `apps/workbench/app/layout.tsx`
- Modify: `apps/workbench/app/globals.css`
- Create: `apps/workbench/styles/tokens.css`
- Create: `apps/workbench/styles/base.css`
- Create: `apps/workbench/styles/shell.css`
- Create: `apps/workbench/styles/workspace-home.css`
- Create: `apps/workbench/styles/builder-workspace.css`
- Create: `apps/workbench/state/workbench-shell-machine.ts`
- Create: `apps/workbench/state/workbench-shell-machine.test.ts`
- Modify: `apps/workbench/lib/workbench-model.ts`
- Modify: `apps/workbench/lib/workbench-model.test.ts`
- Modify: `apps/workbench/components/workbench.tsx`
- Modify: `apps/workbench/components/workbench-home.tsx`
- Modify: `apps/workbench/components/workbench-home.test.tsx`
- Modify: `apps/workbench/components/shell/icon-rail.tsx`
- Modify: `apps/workbench/components/shell/utility-bar.tsx`
- Modify: `apps/workbench/components/shell/workbench-shell.tsx`
- Modify: `apps/workbench/components/shell/workbench-shell.test.tsx`
- Modify: `apps/workbench/components/journey/requirement-composer.tsx`
- Modify: `apps/workbench/components/journey/requirement-composer.test.tsx`
- Create: `apps/workbench/components/journey/building-preview.tsx`
- Create: `apps/workbench/components/journey/building-preview.test.tsx`
- Modify: `apps/workbench/lib/product-journey/use-product-journey.ts`
- Modify: `apps/workbench/lib/product-journey/use-product-journey.test.tsx`
- Modify: `apps/workbench/components/shell/inspector-sheet.tsx`
- Modify: `apps/workbench/components/shell/history-panel.tsx`
- Modify: `apps/workbench/components/shell/activity-sheet.tsx`
- Modify: `apps/workbench/components/shell/library-drawer.tsx`

The six final paths above are the bounded independent-review repair: reset
invalidates in-flight journey generations, and overlay focus returns only after
a real open-to-closed transition. No other path is writable.
`apps/workbench/hooks/use-workbench-controller.ts` and
`apps/workbench/lib/control-plane-client.ts` remain read-only characterization
inputs because Task 6A adds no controller effect or wire method.

---

### Task 1: Freeze the shared Workbench context registry

**Files:**

- Modify: `packages/workbench-ui/src/index.ts`
- Modify: `packages/workbench-ui/test/boundary.test.ts`
- Modify: `apps/workbench/package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**

- Consumes: the accepted Workbench UI boundary and existing Workbench importer.
- Produces:

```ts
export type WorkbenchContextKey = "workspace-home" | "builder";
export type WorkbenchDestinationKey =
  "apps" | "page" | "data" | "workflow" | "access" | "ai" | "code" | "release";
export const workbenchContextRegistry: readonly WorkbenchContextDefinition[];
export function findWorkbenchContext(
  key: WorkbenchContextKey,
): WorkbenchContextDefinition;
```

- [x] **Step 1: Write the failing registry and importer tests**

Require exactly two context records. Workspace Home contains only `apps`;
Builder contains `page`, `data`, `workflow`, `access`, `ai`, `code`, `release`
in that order. Assert deep freezing, unique keys, Lucide-only icon identifiers,
concise labels, and no Graph/evidence/template/management/cloud destination.

- [x] **Step 2: Run the focused test and confirm RED**

```powershell
node node_modules/vitest/vitest.mjs run test/boundary.test.ts
```

Expected: FAIL because the context APIs do not exist.

- [x] **Step 3: Implement the exact immutable registry**

Reuse `deepFreeze`. Unknown lookup throws `Unknown Workbench context.` without
echoing the rejected key.

- [x] **Step 4: Add the existing internal package edge**

Add `"@factory/workbench-ui": "workspace:*"` to the Workbench manifest and only
this lock importer entry:

```yaml
"@factory/workbench-ui":
  specifier: workspace:*
  version: link:../../packages/workbench-ui
```

- [x] **Step 5: Run package test, typecheck, and build**

If the ignored junction is absent, create only
`apps/workbench/node_modules/@factory/workbench-ui` ->
`packages/workbench-ui` after resolving both absolute paths; do not install.

```powershell
node node_modules/vitest/vitest.mjs run test/boundary.test.ts
node ..\compiler\node_modules\typescript\bin\tsc -p tsconfig.json --noEmit
node ..\compiler\node_modules\typescript\bin\tsc -p tsconfig.json
```

---

### Task 2: Add the context shell machine and closed Advanced default

**Files:**

- Create: `apps/workbench/state/workbench-shell-machine.ts`
- Create: `apps/workbench/state/workbench-shell-machine.test.ts`
- Modify: `apps/workbench/lib/workbench-model.ts`
- Modify: `apps/workbench/lib/workbench-model.test.ts`

**Interfaces:**

```ts
export type WorkbenchJourneyStage =
  "brief" | "clarifying" | "planning" | "reviewing" | "applied" | "failed";
export function resolveWorkbenchContext(
  surface: Surface,
  stage: WorkbenchJourneyStage,
  busy: boolean,
): WorkbenchContextKey;
export function isBuildingStage(
  stage: WorkbenchJourneyStage,
  busy: boolean,
): boolean;
```

- [x] **Step 1: Write state-machine RED tests**

Prove idle `home + brief|failed` is `workspace-home`; a busy Home request and
Home during clarifying, planning, or reviewing is `builder`; every non-home
surface is `builder`. Prove initial Inspector is closed and `overlayStack` is
empty.

- [x] **Step 2: Run focused tests and confirm RED**

```powershell
node node_modules/vitest/vitest.mjs run state/workbench-shell-machine.test.ts lib/workbench-model.test.ts
```

- [x] **Step 3: Implement pure exhaustive resolution and closed default**

Do not persist a new context field; derive it so Draft state is unchanged.

- [x] **Step 4: Run focused tests and confirm GREEN**

---

### Task 3: Rebuild Workspace Home around one product decision

**Files:**

- Modify: `apps/workbench/app/layout.tsx`
- Modify: `apps/workbench/components/workbench-home.tsx`
- Modify: `apps/workbench/components/workbench-home.test.tsx`
- Modify: `apps/workbench/components/journey/requirement-composer.tsx`
- Modify: `apps/workbench/components/journey/requirement-composer.test.tsx`

**Interfaces:** Reuse existing journey, Open, and Compile callbacks. Produce a
Workspace Home headed `Apps`, one primary `Describe a product` composer, and
backed Resume rows. Render no fake template action.

- [x] **Step 1: Write the Workspace Home RED**

Assert metadata title `Archeform · 元象`; `Apps` and `Describe a product`
landmarks; one primary `Create product` action using the existing interpreter;
secondary keyboard-reachable examples; only backed Open/Compile resume actions;
and no visible `Factory Pilot`, `Graph`, `Inspector`, capability lock, or
template button.

- [x] **Step 2: Run focused tests and confirm RED**

```powershell
node node_modules/vitest/vitest.mjs run components/workbench-home.test.tsx components/journey/requirement-composer.test.tsx
```

- [x] **Step 3: Implement the hierarchy without callback changes**

Use one concise sentence. Keep bounded errors and focus behavior exact.

- [x] **Step 4: Run focused tests and confirm GREEN**

---

### Task 4: Create the distinct Builder Workspace

**Files:**

- Create: `apps/workbench/components/journey/building-preview.tsx`
- Create: `apps/workbench/components/journey/building-preview.test.tsx`
- Modify: `apps/workbench/components/workbench.tsx`
- Modify: `apps/workbench/components/workbench-home.tsx`
- Modify: `apps/workbench/components/shell/icon-rail.tsx`
- Modify: `apps/workbench/components/shell/utility-bar.tsx`
- Modify: `apps/workbench/components/shell/workbench-shell.tsx`
- Modify: `apps/workbench/components/shell/workbench-shell.test.tsx`

**Interfaces:**

```ts
export function BuildingPreview(props: {
  readonly journey: WorkbenchHomeJourneyProps;
  readonly commandFocusToken: number;
  readonly page: PageModel["pages"][number] | null;
  readonly experience: ExperienceModel;
  readonly revision: string;
}): JSX.Element;
```

- [x] **Step 1: Write the Builder RED**

Prove a valid brief opens `Builder workspace`; the left region shows the
existing bounded journey step; the right shows `Responsive preview`; the global
rail contains Apps only; Builder destinations are local and arrow-key
navigable; Apps restores Home; Advanced starts closed, opens Inspector, closes
with Escape, and restores focus; Publish/Compile availability remains exact.

- [x] **Step 2: Run focused tests and confirm RED**

```powershell
node node_modules/vitest/vitest.mjs run components/journey/building-preview.test.tsx components/shell/workbench-shell.test.tsx components/workbench-home.test.tsx
```

- [x] **Step 3: Implement Builder by composition**

Export the existing private Journey slot without changing its branches. Compose
it with the current Draft's first page through `ResponsivePreview`. Use bounded
product-language labels: `Understanding the product`, `Shaping the plan`,
`Reviewing the change`, and `Draft ready`.

- [x] **Step 4: Implement context-local navigation**

Map existing surfaces: `page -> Page`, `domain -> Data`, `flow -> Workflow`,
`policy -> Access`, `ai -> AI`, `code -> Code`, `release -> Publish`. Advanced
is the existing Inspector trigger, relabelled and closed by default. History
and Activity stay backed utilities; Library is absent from the default Builder.

- [x] **Step 5: Run focused tests and confirm GREEN**

---

### Task 5: Extract shell, Home, and Builder styles

**Files:**

- Modify: `apps/workbench/app/globals.css`
- Create: `apps/workbench/styles/tokens.css`
- Create: `apps/workbench/styles/base.css`
- Create: `apps/workbench/styles/shell.css`
- Create: `apps/workbench/styles/workspace-home.css`
- Create: `apps/workbench/styles/builder-workspace.css`

- [x] **Step 1: Add a style-boundary RED test**

Assert every import is present once, each new CSS file is <=300 lines, and
extracted selectors are not duplicated in `globals.css`.

- [x] **Step 2: Run the test and confirm RED**

- [x] **Step 3: Extract without changing token semantics**

Move root tokens to `tokens.css`; reset/focus/reduced-motion to `base.css`;
rail/topbar/canvas/overlay/status to `shell.css`; Home/composer/recent-product to
`workspace-home.css`; and new conversation/preview layout to
`builder-workspace.css`. Keep unrelated editor CSS global for later slices.

- [x] **Step 4: Run focused tests and production build**

```powershell
node node_modules/vitest/vitest.mjs run components/shell/workbench-shell.test.tsx components/workbench-home.test.tsx components/journey/building-preview.test.tsx
node node_modules/next/dist/bin/next build
```

Expected: exit 0. Replace extracted mixed-support `end` values with `flex-end`.

---

### Task 6: Verify and deliver once

**Files:** all exact manifest paths; no new path.

- [x] **Step 1: Run all package tests**

```powershell
cd packages/workbench-ui
node node_modules/vitest/vitest.mjs run
cd ../../apps/workbench
node node_modules/vitest/vitest.mjs run
```

Record inherited non-failing React `act(...)`, DNS-stub, and `punycode`
warnings separately; do not hide them.

- [x] **Step 2: Run typecheck and builds**

```powershell
cd packages/workbench-ui
node ..\compiler\node_modules\typescript\bin\tsc -p tsconfig.json --noEmit
node ..\compiler\node_modules\typescript\bin\tsc -p tsconfig.json
cd ../../apps/workbench
node ..\..\packages\compiler\node_modules\typescript\bin\tsc -p tsconfig.json --noEmit
node node_modules/next/dist/bin/next build
```

- [x] **Step 3: Run format, scope, and safety gates**

Direct Prettier over the exact manifest; `git diff --check`; exact containment;
lock importer-only; package snapshot equality; no Graph/Control Plane/compiler/
capability/provider/Docker/Compose diff; no credential/high-confidence secret.

- [x] **Step 4: Inspect real desktop and narrow layouts**

Verify 1440x900 and 390x844: primary action visible, Builder order usable,
actions keyboard reachable, overlays restore focus, dark theme works, and no
technical detail enters the default frame.

- [x] **Step 5: Request one independent code review**

Review product-goal alignment, retained behavior, accessibility, responsive
layout, exact scope, and absence of Graph/API authority changes. Repair any
actionable P0/P1 with focused TDD, then rerun the full gates once.

- [x] **Step 6: Commit and push the exact manifest**

After fresh cached equality/diff/sensitive checks, commit once:

```text
feat(workbench): add prompt-to-live workspace foundation
```

Push without force and prove local `HEAD` equals upstream with no remaining
implementation path.

The final independent review returned `P0/P1/P2=0/0/1` and `READY=yes` after
all five blocking interaction findings were repaired. The retained P2 is a
test-hardening opportunity: the generation-reset regression directly covers
pending interpretation, while the production guards also protect later
clarification, review, planning, decision, and apply completions.
