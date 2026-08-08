# Honest Requirement-to-Product Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fixed Expense Approval replay with an honest path from an
empty workspace and a free-form requirement to two materially different,
editable, multi-page, runnable products, while reducing the Workbench to a
sparse and visually coherent primary workflow.

**Architecture:** A transient requirement interpreter produces a validated
`RequirementSpecV1` and a constrained semantic `ProductBlueprintV1`; the
deterministic planner alone selects approved capability locks; a generic
composer converts the accepted blueprint and plan into a checksum-bound Draft
Diff over a blank or current Draft. The Workbench edits that Graph through
Factory-owned Puck wrappers, then preserves Publish -> immutable Compilation ->
isolated verification -> preview and cleanup.

**Tech Stack:** TypeScript, Zod, Next.js 15, React 19, Puck, XYFlow, Lucide,
NestJS, Prisma/PostgreSQL, BullMQ/Redis, Vitest, Playwright, Docker Compose, and
the existing environment-only OpenAI adapter.

## Status correction

The 2026-08-09 `GOAL_COMPLETE` report proves a scripted, pre-seeded Expense
Approval journey. It does **not** prove product closure. This plan reopens the
P1 Product Closure gate. The following observed implementation facts must be
treated as defects, not accepted product constraints:

1. Discuss has no free-form requirement input and hardcodes Expense roles,
   entities, questions, workflows, and acceptance scenarios.
2. Plan validates the current session but constructs alternatives from three
   predefined Expense framings and one fixed recipe.
3. Build and visual Diff start from `createExpenseApprovalPlanningBase()`;
   persistence replaces only metadata from the carrier application.
4. The accepted E2E first creates `guided-template-expense-approval`, then
   clicks fixed answers. It proves replay, not requirement-to-product
   generation.
5. Build exposes a colour string and layout selector rather than editable
   multi-page product design.
6. The lineage canvas is read-only presentation and does not provide page or
   flow authoring.
7. A blank or non-Expense workspace cannot start the Golden Path.
8. The primary Home surface is dominated by portfolio, supply, readiness, and
   evidence material rather than the user's next decision.
9. Several global actions and inspector fields are decorative, redundant, or
   unrelated to the active state.

The compiler, isolated verifier, Application Graph contracts, immutable
lifecycle, capability packages, Control Plane, worker, and local Docker runtime
remain valuable foundations and are not rolled back.

## Global constraints

- The Application Graph remains the sole business source of truth.
- Preserve mutable Draft -> immutable Published Graph -> immutable
  Compilation.
- Start product behavior changes with a failing focused test.
- The user business brief is transient input. Do not persist or report the raw
  model prompt, raw provider response, credentials, or hidden reasoning.
- The model may propose business semantics only. It cannot select package
  paths, capability versions, source, URLs, routes, code, providers,
  credentials, output destinations, or runtime configuration.
- Only the deterministic planner may select approved immutable capability
  locks.
- Generated source is derived output and is never reverse parsed.
- Do not preselect a Profile or starter Graph in the main acceptance flow.
- Do not retain compatibility code for the fixed Expense Golden Path.
- Keep light theme as default and dark theme equally functional.
- Use Lucide for interface icons. Do not add emoji, handcrafted SVG icons, or
  copied branded assets.
- Use the native variable-font stack: `"Segoe UI Variable Text"`,
  `"SF Pro Text"`, `-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`,
  `sans-serif`; use mono only for identifiers, digests, timestamps, and code.
- One concise sentence below the active state is the maximum explanatory copy
  budget on the primary canvas.
- Every visible button or link must execute a tested action, expose a concrete
  disabled reason, or be removed.
- Preserve all pre-existing uncommitted work. Stage only files owned by the
  current task.
- Commit and push every coherent green task before continuing.

## Product acceptance

Run the complete flow twice from an empty workspace without choosing a
template:

### Prompt A — Expense Approval

```text
Build an expense approval application. Employees submit expenses with amount,
category, date, receipt, and notes. Managers approve or reject them, and finance
can audit all decisions.
```

### Prompt B — Appointment Booking

```text
Build an appointment booking application. Customers choose a service and an
available time, staff confirm or reschedule appointments, and administrators
manage services, schedules, and cancellations.
```

The resulting Graphs and generated applications must differ materially in
their entities, fields, pages, routes, roles, permissions, workflows,
navigation, seed scenarios, and role journeys. Both must be editable in Page
Studio, publishable, compilable, independently bootable, verifiable, previewed,
and cleanly removed.

## Target Workbench information architecture

```text
56px icon rail
  Home / Create
  Pages
  Data
  Logic
  Preview
  Library
  Settings

52px utility bar
  application switcher | lifecycle state | command | theme | account

Primary canvas
  exactly one active decision or editor

Right inspector sheet
  closed by default; opens only for selected content

Evidence / revisions / capability inventory
  counts first; detail in sheets, drawers, or focused views
```

Remove Portfolio Intelligence, Source Intake, Profile Readiness, Capability
Supply, and long evidence lists from the default Home frame. Retain them under
the Library or Activity surface. Remove the separate Golden Path navigation
item: requirement-to-product is the default creation workflow, not an optional
tool.

---

### Task 1: Reopen product closure and pin the honest acceptance boundary

**Files:**

- Modify: `docs/project-status.md`
- Modify: `docs/roadmap.md`
- Create: `docs/acceptance/requirement-to-product-closure.md`
- Modify: `e2e/golden-path.spec.ts`

**Interfaces:**

- Produces: one rejected legacy acceptance scenario and two new pending
  prompt-driven scenarios.
- Does not change runtime behavior.

- [ ] Record that the prior S8 evidence is retained as fixed Expense replay
      evidence but P1 Product Closure is reopened.
- [ ] Replace the E2E setup that clicks
      `guided-template-expense-approval` with a failing test that starts from an
      empty workspace, enters Prompt A, and expects a Requirement Summary.
- [ ] Add a second failing E2E for Prompt B and assert that no Profile/template
      selection occurs.
- [ ] Run `pnpm exec playwright test e2e/golden-path.spec.ts --list` and the
      focused browser test; record RED because the empty-workspace requirement
      composer does not exist.
- [ ] Commit and push with
      `test(product): reopen requirement-to-product closure`.

### Task 2: Define transient requirement interpretation and semantic blueprint

**Files:**

- Create: `packages/graph/src/product-blueprint.ts`
- Modify: `packages/graph/src/index.ts`
- Create: `packages/graph/test/product-blueprint.test.ts`
- Create: `packages/adapters/src/requirements/requirement-interpreter.ts`
- Create: `packages/adapters/src/requirements/fixture-interpreter.ts`
- Create: `packages/adapters/src/requirements/openai-interpreter.ts`
- Modify: `packages/adapters/src/index.ts`
- Create: `packages/adapters/test/requirement-interpreter.test.ts`

**Interfaces:**

```ts
export interface ProductBlueprintV1 {
  readonly apiVersion: "factory.product-blueprint/v1";
  readonly requirementChecksum: string;
  readonly title: string;
  readonly actors: readonly BlueprintActorV1[];
  readonly entities: readonly BlueprintEntityV1[];
  readonly pageIntents: readonly BlueprintPageIntentV1[];
  readonly workflows: readonly BlueprintWorkflowV1[];
  readonly acceptanceJourneys: readonly BlueprintJourneyV1[];
}

export interface RequirementInterpretationV1 {
  readonly spec: RequirementSpecV1;
  readonly blueprint: ProductBlueprintV1;
  readonly clarifications: readonly CompositionClarificationV1[];
}

export interface RequirementInterpreterAdapterV1 {
  interpret(input: {
    readonly brief: string;
    readonly answers: Readonly<Record<string, string>>;
  }): Promise<RequirementInterpretationV1>;
}
```

Blueprint page intents use only approved enums (`dashboard`, `list`, `form`,
`detail`, `queue`, `calendar`, `settings`). Field types use only approved
enums (`text`, `long-text`, `number`, `currency`, `boolean`, `date`,
`datetime`, `enum`, `reference`, `file`). Routes are derived later; the model
cannot provide paths.

- [ ] Write RED schema tests for unknown keys, duplicate semantic keys, missing
      references, invalid states/transitions, unsafe text, paths, URLs, source,
      provider material, and capability/package selections.
- [ ] Write RED adapter tests proving Prompt A and Prompt B produce different
      schema-valid specs and blueprints through the fixture interpreter.
- [ ] Implement exact-key Zod schemas and cross-reference validation.
- [ ] Implement the fixture adapter as test authority and the OpenAI adapter as
      an environment-only provider behind the same parser. Neither adapter may
      persist the brief or provider response.
- [ ] Run `pnpm --filter @factory/graph test` and
      `pnpm --filter @factory/adapters test`.
- [ ] Commit and push with
      `feat(requirements): interpret briefs into bounded product blueprints`.

### Task 3: Build generic blank-Draft planning and Graph composition

**Files:**

- Create: `packages/graph/src/blank-application.ts`
- Create: `packages/capabilities/src/product-composer.ts`
- Create: `packages/capabilities/src/plan-alternatives.ts`
- Modify: `packages/capabilities/src/index.ts`
- Create: `packages/capabilities/test/product-composer.test.ts`
- Create: `packages/capabilities/test/plan-alternatives.test.ts`
- Modify: `apps/control-plane/src/composition/composition.service.ts`
- Modify: `apps/control-plane/src/composition/composition.controller.ts`
- Create: `apps/control-plane/test/requirement-product-composition.test.ts`

**Interfaces:**

```ts
export function createBlankApplicationDraft(input: {
  readonly applicationId: string;
  readonly workspaceId: string;
  readonly name: string;
}): DraftRevisionV1;

export function planProductAlternatives(input: {
  readonly requirement: RequirementSpecV1;
  readonly blueprint: ProductBlueprintV1;
  readonly baseDraft: DraftRevisionV1;
  readonly catalogue: CapabilityCatalogueV1;
}): readonly CompositionPlanV1[];

export function composeProductDraft(input: {
  readonly requirement: RequirementSpecV1;
  readonly blueprint: ProductBlueprintV1;
  readonly acceptedPlan: CompositionPlanV1;
  readonly baseDraft: DraftRevisionV1;
}): DraftDiffV1;
```

The deterministic planner selects all immutable capability locks. The composer
derives routes, PageModel nodes, DomainModel entities/fields, PolicyModel roles
and permissions, FlowModel states/transitions, navigation, Experience defaults,
seed scenarios, and journey definitions. No profile-name switch or starter
Graph is permitted.

- [ ] Write RED tests proving Prompt A and Prompt B compose from blank Drafts
      and result in different pages, entities, fields, roles, flows, and locks.
- [ ] Add mutation tests that reject a blueprint-selected package, route, URL,
      code fragment, incompatible lock, missing binding, and stale checksum.
- [ ] Implement blank-Draft creation and generic semantic mapping.
- [ ] Generate two meaningful plan alternatives from the user's exact
      RequirementSpec. An alternative may add or omit only declared optional
      capabilities or experience intent; it may not substitute a canned
      requirement.
- [ ] Remove `createExpenseApprovalPlanningBase()` from the product path.
- [ ] Run Graph, capabilities, and Control Plane suites.
- [ ] Commit and push with
      `feat(composition): compose product graphs from accepted requirements`.

### Task 4: Replace the fixed Golden Path with the primary creation journey

**Files:**

- Create: `apps/workbench/components/journey/requirement-composer.tsx`
- Create: `apps/workbench/components/journey/clarification-panel.tsx`
- Create: `apps/workbench/components/journey/plan-review.tsx`
- Create: `apps/workbench/components/journey/graph-diff-review.tsx`
- Create: `apps/workbench/lib/product-journey/journey-model.ts`
- Create: `apps/workbench/lib/product-journey/journey-model.test.ts`
- Create: `apps/workbench/app/api/requirements/interpret/route.ts`
- Create: `apps/workbench/app/api/requirements/interpret/route.test.ts`
- Modify: `apps/workbench/components/workbench-home.tsx`
- Delete after replacement: `apps/workbench/app/api/golden-path/plan/route.ts`
- Delete after replacement: `apps/workbench/lib/golden-path/discuss-model.ts`
- Delete after replacement: `apps/workbench/lib/golden-path/planning-base.ts`
- Delete after replacement: `apps/workbench/lib/golden-path/plan-alternatives.ts`

**Interfaces:**

- Consumes: `RequirementInterpreterAdapterV1`, `ProductBlueprintV1`,
  `planProductAlternatives`, and existing composition review APIs.
- Produces: a persisted structured RequirementSpec, accepted plan decision, and
  checksum-bound Draft Diff; never a stored raw brief.

- [ ] Write RED component tests for an empty workspace, free-form brief,
      loading, clarification, provider unavailable, invalid provider output,
      plan comparison, and Diff acceptance.
- [ ] Make the requirement composer the default Home decision. Keep example
      prompts behind one secondary popover; do not show profile cards on the
      primary frame.
- [ ] Wire the route to the configured interpreter. If no real provider is
      configured outside tests, show a direct configuration error; do not
      silently run a fake model in final acceptance.
- [ ] Prove the accepted plan consumes the exact user spec checksum and current
      blank Draft checksum.
- [ ] Remove the separate Golden Path navigation destination.
- [ ] Run Workbench and Control Plane focused suites.
- [ ] Commit and push with
      `feat(workbench): make requirement creation the primary journey`.

### Task 5: Deliver editable multi-page Page Studio output

**Files:**

- Modify: `apps/workbench/components/page-studio.tsx`
- Modify: `apps/workbench/lib/puck-page-model.ts`
- Create: `apps/workbench/components/journey/product-studio.tsx`
- Create: `apps/workbench/components/journey/page-tree.tsx`
- Create: `apps/workbench/components/journey/responsive-preview.tsx`
- Create: `apps/workbench/lib/product-journey/page-bindings.ts`
- Create: `apps/workbench/lib/product-journey/page-bindings.test.ts`
- Modify: `packages/compiler/src/targets/web/*`
- Add focused tests beside the modified compiler target files.

**Interfaces:**

- Consumes: PageModel entries and ExperienceModel tokens from the composed
  Draft.
- Produces: constrained Draft Diffs for page order, approved component insert,
  delete, reorder, copy, text, data binding, responsive layout, colour, size,
  radius, spacing, and approved variants.

- [ ] Write RED round-trip tests for at least four generated pages per
      acceptance prompt and ensure page edits survive Publish and compilation.
- [ ] Load every generated page in Puck with a visible page tree, route-aware
      preview, and desktop/tablet/mobile viewport controls.
- [ ] Permit only declared component props and design tokens; reject arbitrary
      CSS, script, package, URL, and source fields.
- [ ] Ensure the generated Web application renders the edited page tree and
      navigation rather than a generic record shell.
- [ ] Add responsive visual assertions for Prompt A and Prompt B.
- [ ] Run Workbench, compiler, and generated-application suites.
- [ ] Commit and push with
      `feat(studio): edit generated multi-page products through Puck`.

### Task 6: Generalize simulation and generated role journeys

**Files:**

- Create: `apps/workbench/lib/product-journey/graph-simulator.ts`
- Create: `apps/workbench/lib/product-journey/graph-simulator.test.ts`
- Create: `apps/workbench/components/journey/role-simulator.tsx`
- Delete after replacement: `apps/workbench/lib/golden-path/simulator.ts`
- Delete after replacement: `apps/workbench/components/golden-path/simulate-panel.tsx`
- Modify: `packages/compiler/src/targets/tests/*`

**Interfaces:**

```ts
export function startGraphSimulation(
  graph: ApplicationGraphV1,
  scenarioKey: string,
): GraphSimulationStateV1;

export function dispatchGraphSimulationEvent(
  state: GraphSimulationStateV1,
  event: {
    readonly roleKey: string;
    readonly eventKey: string;
    readonly recordId: string;
  },
): GraphSimulationStateV1;
```

- [ ] Write RED tests that execute Expense submit/approve/audit and Appointment
      book/confirm/reschedule/cancel entirely from Graph-declared scenarios.
- [ ] Prove the simulator contains no Expense identifiers or profile switches.
- [ ] Generate role journeys and denied-action tests from the same Graph
      scenarios used by the simulator.
- [ ] Run Workbench, compiler, and generated journey tests.
- [ ] Commit and push with
      `feat(simulation): execute role journeys from application graphs`.

### Task 7: Simplify and visually rebuild the Workbench shell

**Files:**

- Create: `apps/workbench/components/shell/workbench-shell.tsx`
- Create: `apps/workbench/components/shell/icon-rail.tsx`
- Create: `apps/workbench/components/shell/utility-bar.tsx`
- Create: `apps/workbench/components/shell/inspector-sheet.tsx`
- Create: `apps/workbench/components/shell/activity-sheet.tsx`
- Create: `apps/workbench/components/shell/library-drawer.tsx`
- Create: `apps/workbench/hooks/use-workbench-controller.ts`
- Modify: `apps/workbench/components/workbench.tsx`
- Modify: `apps/workbench/components/workbench-home.tsx`
- Modify: `apps/workbench/app/globals.css`
- Modify: `apps/workbench/lib/workbench-model.ts`
- Create: `docs/acceptance/workbench-action-inventory.md`

**Interfaces:**

- `workbench.tsx` becomes a thin composition root under 350 lines.
- The controller hook owns server state and commands; shell components receive
  explicit state and callbacks.
- Inspector, Activity, History, and Library are dismissible overlays that
  restore focus to their triggers.

- [ ] Write RED shell tests for keyboard navigation, tooltips, focus restore,
      command trigger, contextual inspector, theme, and every primary action.
- [ ] Replace the default Home card grid with the requirement composer and a
      compact recent-products row shown only when records exist.
- [ ] Move portfolio intelligence, capability supply/readiness, source intake,
      evidence, and revision detail into Library, Activity, or History views.
- [ ] Remove duplicate headings, status labels, explanatory paragraphs,
      empty cards, generic Add actions, and unrelated inspector fields.
- [ ] Keep only implemented rail destinations. Implement required History,
      theme, project switcher, and sheet controls; delete unused notification,
      account, Add, settings, and menu controls until real behavior exists.
- [ ] Use Lucide icons with accessible names and tooltips. Text labels appear
      only in the active/expanded state.
- [ ] Apply the specified native variable-font stack, 4px spacing base,
      8–12px radii, hairline dividers, one emerald accent, restrained shadows,
      and 140–200ms overlay transitions.
- [ ] Verify 1440x900 and 1024x768 layouts. The primary action and active state
      must remain visible without scrolling.
- [ ] Complete `workbench-action-inventory.md`: every visible control names its
      action, server/local effect, keyboard access, test, and disposition.
- [ ] Run Workbench tests, typecheck, production build, and focused browser
      checks.
- [ ] Commit and push with
      `refactor(workbench): focus the console on product creation`.

### Task 8: Integrate release, evidence, and failure recovery into the new flow

**Files:**

- Move/generalize: `apps/workbench/lib/golden-path/release-model.ts` to
  `apps/workbench/lib/product-journey/release-model.ts`
- Move/generalize: `apps/workbench/lib/golden-path/timeline.ts` to
  `apps/workbench/lib/product-journey/timeline.ts`
- Create: `apps/workbench/components/journey/release-workspace.tsx`
- Modify: `apps/workbench/lib/control-plane-client.ts`
- Modify: `apps/control-plane/src/verification/*`
- Replace: `e2e/golden-path.spec.ts`

**Interfaces:**

- Consumes any eligible Published Graph, not an Expense-shaped carrier.
- Produces compile, isolated verification, preview, evidence, cleanup, and
  reviewable failure Draft Diff states.

- [ ] Write RED tests for both acceptance products, verification failure,
      reviewable Draft Diff, cleanup, and terminal failure.
- [ ] Keep evidence behind a count-first Activity sheet; do not render the full
      timeline permanently beneath the primary workspace.
- [ ] Ensure the release model contains no profile-specific condition.
- [ ] Run both prompt E2Es through publish, compile, isolated boot, role
      journeys, authorization denial, preview, and Docker cleanup.
- [ ] Commit and push with
      `feat(release): verify and preview any composed product graph`.

### Task 9: Real-model, visual, action, and clean-checkout acceptance

**Files:**

- Modify: `docs/acceptance/requirement-to-product-closure.md`
- Modify: `docs/project-status.md`
- Modify: `docs/roadmap.md`
- Modify: the active PM ledger
- Add accepted screenshots under the existing acceptance-evidence convention.

**Acceptance commands:**

```powershell
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright test e2e/golden-path.spec.ts
```

- [ ] Run Prompt A and Prompt B once each through the real OpenAI interpreter
      using only the local environment key. Persist only parsed schemas and
      safe evidence; do not save raw briefs as provider prompts, responses, or
      credentials.
- [ ] Prove the two Published Graphs have different hashes and materially
      different entities, fields, pages, navigation, roles, flows, and
      journeys.
- [ ] Capture and inspect desktop and narrow screenshots for requirement,
      plan, studio, simulation, release, and both generated applications.
- [ ] Verify the action inventory: no visible inert control, placeholder menu,
      unrelated inspector, or decorative disabled button remains.
- [ ] Verify keyboard reachability, visible focus, overlay dismissal/focus
      restoration, light/dark themes, and automated axe-class accessibility on
      both generated applications.
- [ ] Verify from a clean checkout with a frozen lockfile and fresh Compose
      stack. Prove preview containers, networks, volumes, and artifact
      directories are removed.
- [ ] Obtain independent task review, behavioral QA, visual review, and release
      review. Repair P0/P1 findings before closure.
- [ ] Mark `GOAL_COMPLETE` only after a human can start at the empty Home
      composer and obtain both runnable products without selecting a template
      or editing source.
- [ ] Commit and push with
      `docs(product): accept honest requirement-to-product closure`.

## Stop conditions

Do not mark the Goal complete when only fixtures, unit tests, or the original
Expense template pass. Do not replace a failing dynamic path with a hardcoded
Profile branch. Stop as genuinely blocked only when an external service,
credential, or environment failure remains after safe local alternatives and
three documented attempts; otherwise continue through the next unchecked task.

## Deferred until this plan is accepted

- Additional capability-family count growth.
- The 100+ recipe and twelve-anchor breadth gates.
- New vertical Profiles beyond the two acceptance prompts.
- General connector marketplace, production identity, real payments, custom
  domains, managed cloud deployment, fleet upgrades, and rollback UX.
