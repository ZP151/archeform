# Workflow Canvas Console Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic Console center panel with a compact interactive workflow canvas and keep real control-plane transitions usable.

**Architecture:** `ConsoleWorkspace` owns workflow state and renders each lifecycle state as a focused canvas. The existing Factory UI Kit remains the only component source. No API, Composer, or Executor contract changes are required.

**Tech Stack:** Next.js 15, React 19, verified shadcn/Radix primitives, Lucide, Playwright, Python unittest.

## Global Constraints

- Light is the default and dark is functionally equivalent.
- Do not render raw briefs, model credentials, or model replies as evidence.
- A real model call is deliberate and capped by the active task policy.
- Do not modify component package contracts in this Console-only slice.

---

### Task 1: Build the workflow canvas

**Files:**
- Modify: `apps/console-next/components/console-workspace.tsx`
- Modify: `apps/console-next/app/globals.css`
- Test: `tests/api/test_console_ui_sources.py`

**Interfaces:**
- Consumes: `Stage`, `Project`, `Plan`, and `Run` from the Console state.
- Produces: `data-factory-component="workflow-canvas"`, a node-led `workflow-route`, and a focused `brief-command-deck` for visual and source evidence.

- [x] **Step 1: Write the failing source contract test.**
- [x] **Step 2: Implement stage objects and focused Brief, Definition, Plan, and Build canvases.**
- [x] **Step 3: Verify source contract and production build.**

### Task 2: Repair control-plane state mapping and product selection

**Files:**
- Modify: `apps/console-next/components/console-workspace.tsx`
- Test: `tests/api/test_console_ui_sources.py`

**Interfaces:**
- Consumes: `GET /api/projects` summary objects and `Plan.status`.
- Produces: full switcher summaries and an enabled approval action for `draft` or `pending_approval` plans.

- [x] **Step 1: Write failing tests for all-project hydration and `pending_approval`.**
- [x] **Step 2: Use `ProjectSummary` for the selection list and hydrate it on initial load.**
- [x] **Step 3: Permit the valid pending approval state at the plan gate.**
- [x] **Step 4: Run source tests and production build.**

### Task 3: Run live acceptance

**Files:**
- Test: local loopback processes and browser only

**Interfaces:**
- Consumes: local `.env` process credential and the loopback control plane.
- Produces: no source artifact containing a raw brief, key, or provider reply.

- [x] **Step 1: Run one real model-backed Brief to Definition transition.**
- [x] **Step 2: Approve Definition and component plan, then queue the Executor.**
- [x] **Step 3: Verify ready preview, role-aware submit, approval, audit, and explicit stop.**
