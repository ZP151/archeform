# Guided Application Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a business user create a new profile-backed Application Graph Draft through a guided Workbench journey.

**Architecture:** A pure Workbench helper composes a valid Graph from a pinned profile starter and constrained user input. A left-side drawer collects the input, then reuses the existing Control Plane bootstrap, Draft, Publish, and Compilation APIs.

**Tech Stack:** Next.js, React, TypeScript, Vitest, Playwright, `@factory/graph`, existing profile capabilities.

## Global Constraints

- `ApplicationGraphV1` remains the only business source of truth.
- Only a mutable Draft is created; no automatic publish or compilation occurs.
- The three accepted profile starters are the complete v1 choice set.
- The browser supplies a nonce; the helper remains deterministic and testable.
- All user-visible text and documentation remain English.
- No credentials, raw model input, or model response enters this feature.

---

### Task 1: Compose constrained Drafts

**Files:**
- Create: `apps/workbench/lib/guided-application.ts`
- Create: `apps/workbench/lib/guided-application.test.ts`
- Modify: `apps/workbench/lib/profile-starters.ts`

**Interfaces:** `createGuidedApplicationDraft(input, nonce)` consumes a
`FactoryProfile`, display name, and theme; it returns a validated new Graph.
`guidedProfileSummary(graph)` returns page, entity, role, and flow counts.

- [ ] Write a failing Vitest suite proving deterministic identity, validated
  dark/light experience selection, blank-name rejection, and starter immutability.
- [ ] Run `pnpm --filter @factory/workbench test -- guided-application.test.ts`
  and observe the missing-module failure.
- [ ] Implement the minimal pure composition helper.
- [ ] Re-run the focused suite and commit
  `feat: compose guided application Drafts`.

### Task 2: Create the left-side guided drawer

**Files:**
- Create: `apps/workbench/components/guided-creation-drawer.tsx`
- Create: `apps/workbench/components/guided-creation-drawer.test.ts`
- Modify: `apps/workbench/components/workbench.tsx`
- Modify: `apps/workbench/app/globals.css`

**Interfaces:** The drawer consumes `onCreate(input): Promise<void>` and
exposes profile selection, name/theme details, review, back, close, and create
actions. Creation waits for a Control Plane Draft response before closing.

- [ ] Write a failing source contract test for `New application` and
  `data-testid="guided-create"`; run it and observe the missing-file failure.
- [ ] Implement the three-stage accessible drawer and Workbench handoff.
- [ ] Run focused Workbench tests and type checking.
- [ ] Commit `feat: guide business users into new Drafts`.

### Task 3: Prove a business-user journey

**Files:**
- Modify: `e2e/workbench.spec.ts`
- Modify: `docs/roadmap.md`

**Interfaces:** The browser uses the actual Workbench and Control Plane, creates
a named Expense approval Draft, and asserts the name, Page Studio, and Draft
state. It must not auto-publish or auto-compile.

- [ ] Write the failing Playwright journey beginning with
  `getByRole("button", { name: "New application" })`.
- [ ] Run `pnpm test:e2e -- workbench.spec.ts` and observe the missing-control
  failure.
- [ ] Make the real journey green and record the new creation layer in the
  roadmap.
- [ ] Commit `test: prove guided application creation`.

### Task 4: Release evidence

**Files:**
- Create: `docs/acceptance/guided-application-creation.md`

- [ ] Run `pnpm test; pnpm typecheck; pnpm build;
  pnpm verify:third-party; pnpm verify:source-studies; git diff --check`.
- [ ] Record only non-sensitive Draft-creation evidence.
- [ ] Commit `docs: record guided creation evidence` and push.

