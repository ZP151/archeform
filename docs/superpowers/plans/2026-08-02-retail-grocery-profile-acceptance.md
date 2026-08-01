# Retail Counter and Grocery Pickup Acceptance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Independently prove that the same locked commerce capability portfolio produces runnable, role-operated Retail Counter and Grocery Pickup applications through the full Factory lifecycle.

**Architecture:** This slice adds acceptance coverage only. The existing Factory Application Graph, immutable published revision, composition lock, compiler, and Preview Runner remain authoritative. A table-driven browser journey creates each Profile through the Workbench, publishes and compiles it, starts an isolated Compose preview, exercises its Profile-specific terminal flow, and verifies cleanup. No generated runtime or Graph contract is changed unless that journey exposes a concrete defect.

**Tech Stack:** TypeScript, Playwright, Docker Compose, Next.js Workbench, NestJS Control Plane, generated Next.js/NestJS/PostgreSQL applications.

## Global Constraints

- The Application Graph is the sole source of truth; only a Published revision may compile or preview.
- Work only with local simulated payment, fixture roles, and isolated Compose projects. Never use provider or model credentials.
- Keep raw prompts, model responses, source content, URLs, package paths, and credentials out of test artifacts and acceptance records.
- Retail Counter and Grocery Pickup are acceptance vehicles for shared packages. Do not introduce profile-specific runtime fallbacks or copy another application implementation.
- The two journeys must use their existing immutable `commerce.order-operations@1.1.0` locks and existing Graph-specific bindings.
- A Preview Runner cleanup assertion must verify that the exact generated Compose project has no containers, networks, volumes, or Worker artifact directory after stop.
- Preserve Draft → Publish → immutable Compilation. The tests must never compile a Draft directly.

---

## File Map

| Path                                                 | Responsibility                                                                                        |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `e2e/generated-retail-grocery.spec.ts`               | Table-driven, isolated Workbench-to-generated-app browser acceptance journeys and cleanup assertions. |
| `docs/acceptance/retail-grocery-order-operations.md` | Safe, reproducible evidence record for the two accepted Profile journeys and explicit non-goals.      |
| `docs/project-status.md`                             | Current iteration status, recorded only after observed independent evidence.                          |

## Task 1: Add independent generated-profile browser acceptance

**Files:**

- Create: `e2e/generated-retail-grocery.spec.ts`

**Consumes:** the existing `GuidedCreationDrawer`, immutable Publish and Compile controls, `Preview Runner`, and the current Retail Counter/Grocery Pickup starter Graphs.

**Produces:** Two Playwright journeys that exercise the same Workbench lifecycle and independently verify generated Profile behavior plus exact Preview Runner cleanup.

- [ ] **Step 1: Write the focused acceptance test before changing product code**

Create a local-only table of literal Profile expectations:

```ts
const journeys = [
  {
    profile: "retail-counter",
    product: "Reusable cup",
    orderRoute: /\\/counter\\/checkout$/,
    ordersLink: "Counter sales",
    operatorRole: "cashier",
    terminalEvent: "issue-receipt",
    terminalStatus: "receipt-issued",
  },
  {
    profile: "grocery-pickup",
    product: "Fuji apples",
    orderRoute: /\\/pickup\\/checkout$/,
    ordersLink: "Pickup orders",
    operatorRole: "fulfilment",
    terminalEvent: "handoff",
    terminalStatus: "handed-off",
  },
] as const;
```

For each literal Profile, create a Draft with `guided-template-<profile>`, Publish it, compile it, start an isolated preview, and open the generated application. The test must assert that `main.generated-app` is visible and that `Puck Page Studio` is absent from the generated application.

The Retail Counter journey must add `Reusable cup`, use the generated `Continue to checkout` action, pay through the simulated payment control, switch to `cashier`, issue the receipt, and observe one record whose JSON has `"status":"receipt-issued"`.

The Grocery Pickup journey must add `Fuji apples`, use the generated `Continue to checkout` action, pay through the simulated payment control, switch to `fulfilment`, execute `pick`, `ready`, then `handoff`, and observe one record whose JSON has `"status":"handed-off"`.

Each test must stop its own preview in `finally` and assert removal of the Worker artifact directory plus generated Compose containers, networks, and volumes identified by its exact Preview Run ID.

- [ ] **Step 2: Run the new acceptance file against an isolated Factory stack**

Run:

```powershell
$env:FACTORY_E2E_BASE_URL = 'http://127.0.0.1:5174'
$env:FACTORY_E2E_CONTROL_PLANE_URL = 'http://127.0.0.1:62051'
$env:FACTORY_E2E_FACTORY_PROJECT = 'factory-aug01-profile-e2e'
pnpm exec playwright test e2e/generated-retail-grocery.spec.ts --reporter=line
```

If either generated journey fails, retain the full failing command output in the ignored task report and identify the failing boundary before any production change. Do not weaken the route, terminal status, generated-application, or cleanup assertions.

- [ ] **Step 3: Verify the narrow compiler and Worker regressions**

Run:

```powershell
pnpm --filter @factory/compiler test -- commerce-transaction-runtime.test.ts
pnpm --filter @factory/compiler-worker test -- order-operations-lifecycle.test.ts
```

Expected: the generic runtime continues to reserve/release stock for Retail Counter and Grocery Pickup, and each Published Graph materializes without Restaurant runtime files.

- [ ] **Step 4: Commit the acceptance coverage**

```powershell
git add e2e/generated-retail-grocery.spec.ts
git commit -m "test(profiles): accept retail and grocery generated journeys"
```

## Task 2: Record evidence and refresh portfolio status

**Files:**

- Create: `docs/acceptance/retail-grocery-order-operations.md`
- Modify: `docs/project-status.md`

**Consumes:** Task 1's successful test output, current immutable package locks, and existing focused compiler/Worker evidence.

**Produces:** An evidence-backed record that distinguishes independently accepted local prototypes from unaccepted provider, deployment, and production operations work.

- [ ] **Step 1: Record only observed, safe acceptance evidence**

The acceptance document must include:

- the two Profile names and their distinct terminal state outcomes;
- the common Workbench → Draft → Publish → Compile → isolated Preview lifecycle;
- the exact browser and focused deterministic commands;
- successful generated-application and cleanup assertions;
- `commerce.order-operations@1.1.0` as the selected shared package identity;
- explicit exclusions for real payments, external identity, provider delivery, cloud deployment, fleet management, and raw model/source data.

Do not record generated URLs, ephemeral IDs, raw Graph payloads, credentials, prompts, model responses, source paths, or package source content.

- [ ] **Step 2: Update the delivery status honestly**

Replace the statement that Retail Counter and Grocery Pickup lack isolated generated-runtime journeys only after both tests have passed. Preserve all listed production gaps. Name the next candidate capability slice rather than declaring the portfolio complete.

- [ ] **Step 3: Verify documentation and the full scoped behavior**

Run:

```powershell
pnpm exec prettier --check e2e/generated-retail-grocery.spec.ts docs/acceptance/retail-grocery-order-operations.md docs/project-status.md
pnpm exec playwright test e2e/generated-retail-grocery.spec.ts --reporter=line
git diff --check
```

- [ ] **Step 4: Commit the evidence record**

```powershell
git add docs/acceptance/retail-grocery-order-operations.md docs/project-status.md
git commit -m "docs: accept retail and grocery order operations"
```

## Self-Review

- **Scope:** This is independent acceptance evidence for existing shared package behavior. It does not claim a new provider, a new capability family, or production deployment readiness.
- **Graph authority:** Both test journeys use the Workbench's ordinary Profile Draft, Publish, and immutable Compilation path; no test fabricates generated output or bypasses the lock.
- **Failure coverage:** A wrong Profile template, omitted generated page, wrong checkout route, incorrect terminal event/state, or incomplete Preview cleanup fails the new test.
- **Source and model boundary:** The test and documentation use only fixed local profile literals and safe status evidence.

## Execution

The project controller authorized direct incremental work on `main`. Execute Task 1 and Task 2 serially with a fresh implementation worker and an independent review after each task.
