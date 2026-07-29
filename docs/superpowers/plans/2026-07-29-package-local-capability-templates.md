# Package-local Capability Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make locked Golden capability packages provide verified source
templates that the Compiler consumes into generated applications.

**Architecture:** Physical `component.json` files declare verified,
package-local template contributions. A Node-only loader validates a locked
package before the Compiler renders its restricted tokens into an allowed
output slot. Generated modules form a capability registry used by the
generated Application Runtime.

**Tech Stack:** TypeScript, Node crypto/fs/path, Vitest, pnpm, NestJS, Next.js.

## Global Constraints

- Graph remains the source of truth and only Published Graphs compile.
- Templates are static trusted Golden assets; adapters never execute code.
- Generated paths must remain inside their declared output-slot prefix.
- Code, tests, UI copy, and documentation are English.
- Credentials and raw AI input/output never enter artifacts, evidence, logs, or source.

---

### Task 1: Define and verify template contributions

**Files:**

- Modify: `packages/capabilities/src/assets/contract.ts`
- Modify: `packages/capabilities/src/node.ts`
- Modify: `packages/capabilities/test/capability-registry.test.ts`

**Produces:** `CapabilityTemplateContributionV1`, package verification that
returns resolved trusted contribution content, and failures for malformed,
external, or digest-mismatched templates.

- [x] Write focused tests for a full physical declaration, package-local source,
      SHA-256 verification, and unsafe target rejection.
- [x] Add the contribution type and Node-only safe loader.
- [x] Run the focused capability Registry test and confirm it passes.

### Task 2: Give every initial Golden asset a real template

**Files:**

- Modify: `packages/capabilities/assets/**/component.json`
- Modify: `packages/capabilities/assets/**/adapter.json`
- Create: `packages/capabilities/assets/**/templates/api/capability-module.ts.tpl`
- Modify: `packages/capabilities/src/assets/**`

**Consumes:** Task 1 contract.

**Produces:** One immutable API capability module contribution per initial
asset, with matching physical manifest, Registry projection, and digest.

- [x] Write a test that every registered asset resolves exactly one verified
      API module contribution.
- [x] Add package-local templates and their canonical declarations.
- [x] Recalculate manifest and template digests, then verify all assets.

### Task 3: Compose trusted template outputs in the Compiler

**Files:**

- Modify: `packages/compiler/package.json`
- Modify: `packages/capabilities/package.json`
- Modify: `packages/compiler/src/index.ts`
- Modify: `packages/compiler/test/compilation-plan.test.ts`

**Consumes:** Task 1 trusted loader and Task 2 package assets.

**Produces:** `api/src/capabilities/*.ts`, a generated registry, runtime
effect availability derived from generated modules, and
`capability-template-lock.json` evidence.

- [x] Write failing Compiler tests for selected and omitted template modules,
      registry imports, runtime use, deterministic template evidence, and a
      missing repository root.
- [x] Implement root discovery, restricted interpolation, collision checks,
      contribution rendering, registry generation, and lock evidence.
- [x] Run Compiler and capability tests to confirm green behavior.

### Task 4: Prove an actual isolated generated-app path

**Files:**

- Modify: `e2e/workbench.spec.ts`
- Modify: `docs/acceptance/package-local-capability-templates.md`

**Consumes:** Task 3 compilation artifacts.

**Produces:** Browser acceptance evidence that a selected package’s generated
module and template lock are inspectable, while an omitted optional package is
absent.

- [x] Add a browser assertion for template-lock artifact evidence.
- [x] Build the isolated Compose stack and run browser E2E against it.
- [x] Record exact verification results and clean the named test project.

### Task 5: Integration gates

- [x] Run `pnpm test`, `pnpm typecheck`, `pnpm build`,
      `pnpm verify:third-party`, `pnpm verify:source-studies`, Prettier, and
      `git diff --check`.
- [x] Obtain an independent P0/P1 code review and resolve findings.
- [ ] Commit and push only the verified template-asset slice.
