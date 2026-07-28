# Governed Console Source Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the rejected Console Next interface with a governed Factory control console that uses a canonical Factory UI Kit, exact third-party dependencies, a read-only lineage graph, and a production-grade acceptance path.

**Architecture:** Product pages import only Factory semantic wrappers. Those wrappers encapsulate Primer React and React Flow while the existing Factory UI Kit remains the canonical source for the Console distribution and later generated-app candidates. Temporal UI is a visual and interaction reference only because its selected snapshot is Svelte, not a compatible React runtime dependency.

**Tech Stack:** Next.js 15.5.21, React 19.2.7, `@primer/react@38.34.0`, `@primer/primitives@11.9.0`, `@xyflow/react@12.11.2`, TypeScript, native CSS, Python verifier tests, Node browser tests.

## Global Constraints

- All third-party runtime packages are exact direct versions and appear in `apps/console-next/package-lock.json`.
- Console product pages import Factory wrappers only; no direct Primer, React Flow, or legacy shadcn primitive imports.
- `@xyflow/react` renders only sanitized, read-only supplied state and cannot mutate lifecycle data.
- No UI string shows "Local connection", a token, a raw brief, or a loopback capability detail.
- Generated-app candidate packages remain non-Golden and unselectable.
- Final acceptance uses production `next start`; a fixture suite is prerequisite evidence, not final model acceptance.

---

### Task 1: Capture exact third-party dependency and source evidence

**Files:**
- Modify: `apps/console-next/package.json`
- Modify: `apps/console-next/package-lock.json`
- Create: `docs/third-party/console-ui-sources.md`
- Create: `tools/console_ui_sources.py`
- Test: `tests/api/test_console_ui_sources.py`

**Interfaces:**
- Consumes: exact package pins and source identities in ADR-008 and ADR-009.
- Produces: `verify_console_ui_sources(root: Path) -> dict[str, object]`, failing with stable source/license/digest codes.

- [ ] Write the failing verifier test asserting exact Primer and React Flow versions.
- [ ] Run `py.exe -3.12 -m unittest tests.api.test_console_ui_sources -v`; expect a missing verifier failure.
- [ ] Run `npm --prefix apps/console-next install --save-exact @primer/react@38.34.0 @primer/primitives@11.9.0 @xyflow/react@12.11.2`.
- [ ] Implement the offline verifier and a notice containing package name, lock integrity, license, upstream URL, Temporal reference SHA, and the explicit statement that no Temporal source enters the Console runtime.
- [ ] Run the focused test and `npm --prefix apps/console-next run preflight`; both must pass.

### Task 2: Replace the Factory UI Kit visual language and wrapper contract

**Files:**
- Modify: `packages/ui-kit/factory-ui/1.0.0/tokens.css`
- Modify: `packages/ui-kit/factory-ui/1.0.0/factory-ui.css`
- Modify: `packages/ui-kit/factory-ui/1.0.0/react/factory-ui.tsx`
- Modify: `packages/ui-kit/factory-ui/1.0.0/factory-ui.manifest.json`
- Modify: `apps/console-next/components/factory-ui/*`
- Modify: `tools/factory_ui_kit.py`
- Test: `tests/api/test_factory_ui_kit.py`

**Interfaces:**
- Consumes: `factory-ui-kit/v1` contract and Task 1 lock closure.
- Produces: Factory wrappers `FactoryShell`, `FactoryAction`, `FactoryPanel`, `FactoryInspector`, `FactoryStageRail`, and `FactoryStatus`.

- [ ] Add a failing semantic-wrapper test requiring `shell`, `action`, `panel`, `inspector`, `stage-rail`, and `status` inventory entries.
- [ ] Run the focused test and confirm that the old inventory fails it.
- [ ] Implement neutral graphite/teal tokens and Primer-backed semantic wrappers. Preserve `data-factory-ui="1.0.0"`, recompute canonical and Console copy digests, and do not depend on utility-class compilation.
- [ ] Run `py.exe -3.12 -m unittest tests.api.test_factory_ui_kit -v`; intentional Console-copy drift must still fail closed.

### Task 3: Recompose the Console as a workflow control product

**Files:**
- Modify: `apps/console-next/components/console-workspace.tsx`
- Modify: `apps/console-next/app/globals.css`
- Modify: `tests/web/console-next-e2e.mjs`
- Modify: `tests/web/console-next-accessibility.mjs`

**Interfaces:**
- Consumes: Factory semantic wrappers, `FactoryApi`, sanitized `Project`, `Version`, `Plan`, and `Run` state.
- Produces: a project rail, lifecycle stage rail, context inspector, and workflow actions.

- [ ] Add failing browser checks for absence of `Local connection` and one each of `stage-rail` and `inspector` markers.
- [ ] Run `$env:FACTORY_CONSOLE_PORT='5196'; node tests/web/console-next-e2e.mjs`; expect the old shell to fail the new assertions.
- [ ] Replace direct legacy primitive imports with Factory wrappers. Keep server endpoints, IR/approval semantics, and all transport details unchanged and hidden from product copy.
- [ ] Run E2E and accessibility checks on ports 5196 and 5195; workflow, keyboard focus, dialog focus restoration, and absent local-connection copy must pass.

### Task 4: Add a safe Factory-owned read-only lineage DAG

**Files:**
- Create: `apps/console-next/components/factory-ui/lineage-model.ts`
- Create: `apps/console-next/components/factory-ui/lineage-dag.tsx`
- Create: `tests/web/console-next-lineage.mjs`

**Interfaces:**
- Consumes: `Project`, selected `Version`, selected `Plan`, selected `Run`.
- Produces: `toLineageGraph(input: LineageInput): FactoryLineageGraph` with nodes `{id, kind, label, status}` and fixed relationship edges.

- [ ] Write a failing graph-model test that rejects an unknown node kind and URL-shaped label.
- [ ] Run `node tests/web/console-next-lineage.mjs`; expect a missing model failure.
- [ ] Implement a bounded React Flow wrapper with `nodesDraggable={false}`, `nodesConnectable={false}`, sanitized nodes, and local inspector selection only.
- [ ] Run the graph test and browser checks; graph must remain read-only and expose no untrusted URL, path, credential, brief, or raw model output.

### Task 5: Production visual acceptance and guarded live-model E2E

**Files:**
- Modify: `docs/superpowers/ledgers/governed-console-source-integration.md`
- Modify: `docs/project-status.md`

**Interfaces:**
- Consumes: passing Tasks 1-4 and locally supplied `OPENAI_API_KEY`.
- Produces: production build evidence, visual review record, fixture E2E, accessibility result, one guarded live-model run, and Executor cleanup proof.

- [ ] Run `npm --prefix apps/console-next run build`.
- [ ] Start `npm --prefix apps/console-next run start`, then inspect desktop and narrow layouts. No Next development overlay, clipped hero, or local-connection copy is permitted.
- [ ] Run API, E2E, accessibility, lineage, and `git diff --check` evidence.
- [ ] Read the real-model key only from local `.env`; make only the remaining allowed live calls, retain redacted schema-validity evidence, then verify Executor ready, role-aware submit/approve/audit, explicit stop, and Docker cleanup.
- [ ] Reconcile exact command results and release decision in the ledger. Do not mark the programme accepted until production visual and live-model evidence pass.

## Self-Review

- Source/runtime dependency, UI-kit, product-shell, DAG, fixture, and live-model requirements map to separate tasks.
- No task permits runtime external access or generated-app promotion.
- Fixture evidence is an explicit prerequisite, not final model acceptance.
