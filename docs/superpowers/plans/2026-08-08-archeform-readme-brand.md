# Archeform README Brand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand the root README as an external-facing product introduction for Archeform · 元象 without changing implementation identifiers or unrelated worktree changes.

**Architecture:** Keep the Graph-first lifecycle and immutable Draft → Published Graph → Compilation boundary as the README's central model. Present editors, AI, compiler targets, and runtime providers as adapters around the Application Graph, then link readers to the existing architecture, roadmap, and status documents.

**Tech Stack:** Markdown, Prettier, pnpm workspace documentation links.

## Global Constraints

- Write README copy and documentation in English, with `元象` used only as the approved Chinese brand mark.
- Preserve Draft → Publish → immutable Compilation and never describe generated source as the source of truth.
- Do not expose credentials, prompts, responses, or environment values.
- Do not rename package names, source symbols, directories, Git remotes, or unrelated files.
- Do not claim production readiness for local prototypes or historical acceptance evidence.

---

### Task 1: Record the approved brand and README design

**Files:**

- Create: `docs/superpowers/specs/2026-08-08-archeform-readme-brand-design.md`
- Create: `docs/superpowers/plans/2026-08-08-archeform-readme-brand.md`

**Interfaces:**

- Consumes: approved brand `Archeform · 元象` and the existing README/architecture/status documents.
- Produces: a scoped design and execution plan for the README-only brand transition.

- [x] **Step 1: Write the design and plan records**

  Capture the brand meaning, README section order, scope boundary, and exact
  verification checks in the two repository documents.

- [x] **Step 2: Review the records for scope and placeholders**

  Confirm that the records contain no `TBD`, `TODO`, broken requirements, or
  instructions to rename implementation identifiers.

### Task 2: Replace the root README with the Archeform product entry point

**Files:**

- Modify: `README.md`

**Interfaces:**

- Consumes: `docs/architecture/application-graph-platform.md`, `docs/roadmap.md`,
  `docs/project-status.md`, `AGENTS.md`, and `.env.example`.
- Produces: a truthful, concise README that explains the product, lifecycle,
  local setup, current profiles, and project status.

- [x] **Step 1: Write the hero and positioning**

  Use `Archeform · 元象`, the line `The source form of software`, and a
  result-first description of building full-stack applications from
  requirements, visual editing, or AI.

- [x] **Step 2: Explain the Graph-first lifecycle and differentiation**

  Include the Application Graph source-of-truth rule, Draft → Publish →
  immutable Published Graph → Compilation lifecycle, adapter boundary, and
  independent verification direction.

- [x] **Step 3: Add grounded capabilities and starter profiles**

  Describe the Workbench and list Expense Approval, Restaurant Ordering,
  Simple Ecommerce, Retail Counter, and Grocery Pickup without implying
  production readiness.

- [x] **Step 4: Add quick start, development checks, and documentation links**

  Preserve the Node.js, pnpm, Docker, PowerShell environment setup and current
  `pnpm` scripts while linking architecture, roadmap, status, contribution
  rules, and license.

### Task 3: Verify the documentation change

**Files:**

- Verify: `README.md`
- Verify: links referenced by `README.md`

**Interfaces:**

- Consumes: the rewritten README and repository filesystem.
- Produces: formatting and link evidence, plus a final diff limited to this
  documentation change and the records created in Task 1.

- [x] **Step 1: Check README formatting**

  Run:

  ```powershell
  pnpm exec prettier --check README.md
  ```

  Expected: Prettier reports `README.md` as formatted.

- [x] **Step 2: Check local README links**

  Confirm that `LICENSE`, `AGENTS.md`, `CLAUDE.md`,
  `docs/architecture/application-graph-platform.md`, `docs/roadmap.md`, and
  `docs/project-status.md` all exist.

- [x] **Step 3: Check the final diff boundary**

  Run:

  ```powershell
  git diff -- README.md docs/superpowers/specs/2026-08-08-archeform-readme-brand-design.md docs/superpowers/plans/2026-08-08-archeform-readme-brand.md
  git status --short
  ```

  Expected: the README and the two new records show only the intended brand
  and documentation changes; unrelated modified or untracked user files are
  present but untouched.
