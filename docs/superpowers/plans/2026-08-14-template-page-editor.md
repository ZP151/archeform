# Template Page Editor Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: use
> `superpowers:test-driven-development` for every behavior change and
> `superpowers:verification-before-completion` before handoff.

**Goal:** Deliver one visible, honest Task 7A edit: select a Restaurant page,
change only its title, append Graph V3 Draft r.3 and a new immutable Snapshot
V2, then display the fresh dual-surface preview.

**Architecture:** The Workbench sends a four-field intent to a new
template-specific Control Plane route. A pure page-edit function validates and
clones the stored Graph V3. The existing Template service owns Serializable
transaction, append-only Draft/Snapshot persistence, rendering, and response
assembly. The browser never sends a complete Graph. Existing V1 lifecycle,
Puck, Graph contracts, Product Recipe, compiler targets, dependencies, and
Prisma schema remain unchanged.

**Tech stack:** TypeScript, NestJS, Prisma, React 19, Next.js 15, Vitest,
Playwright, existing Graph V3/Snapshot V2 and Workbench UI contracts.

## Global constraints

- Base: `c1cc1e28309b3c90b8d691d057c3e8fe327ce69c`.
- Accepted authorities: ADR-0013 and
  `docs/superpowers/specs/2026-08-14-template-page-editor-design.md`.
- TDD is mandatory: tests first, focused RED captured before production edits,
  then minimal GREEN and refactor while green.
- No dependency, package, lockfile, Graph, Product Recipe, compiler, Prisma,
  provider, network, service, Docker, Compose, Publish, export, or deployment
  change.
- Use direct existing runtimes. Do not invoke dependency resolution or install.
- Do not log or persist titles, request bodies, prompts, model responses, or
  credentials as evidence.
- The integration writer may edit exactly the 21 implementation paths below.
  Governance paths remain controller-owned.
- One independent code review follows GREEN. P0/P1 findings return to the same
  writer; ordinary deterministic repairs are not founder gates.
- One reviewed commit and non-force push only after fresh final verification.

## Exact implementation manifest (21 paths)

Control Plane:

1. `apps/control-plane/src/template/template-page-edit.ts` (create)
2. `apps/control-plane/src/template/template.controller.ts`
3. `apps/control-plane/src/template/template.service.ts`
4. `apps/control-plane/test/template-page-edit.test.ts` (create)
5. `apps/control-plane/test/template.controller.test.ts`
6. `apps/control-plane/test/template.service.test.ts`

Workbench:

7. `apps/workbench/lib/control-plane-client.ts`
8. `apps/workbench/lib/control-plane-client.test.ts`
9. `apps/workbench/hooks/use-workbench-controller.ts`
10. `apps/workbench/components/template-draft-workspace.tsx`
11. `apps/workbench/components/template-draft-workspace.test.tsx`
12. `apps/workbench/components/template-page-workspace.tsx` (create)
13. `apps/workbench/components/template-page-workspace.test.tsx` (create)
14. `apps/workbench/components/workbench.tsx`
15. `apps/workbench/components/shell/icon-rail.tsx`
16. `apps/workbench/components/shell/workbench-shell.tsx`
17. `apps/workbench/components/shell/workbench-shell.test.tsx`
18. `apps/workbench/app/globals.css`
19. `apps/workbench/styles/template-page.css` (create)
20. `apps/workbench/test/template-draft-fixture.ts`
21. `apps/workbench/e2e/template-draft.pw.ts`

Need for any other implementation path is a PM stop. Source/test files created
under ignored report directories are not authorized.

## Task 1: Freeze the server-owned page operation

**Tests first:**

- Create `template-page-edit.test.ts` with valid customer and merchant edits.
- Prove the result is a fresh Graph V3, exactly one page title changes, and all
  non-title content remains structurally equal.
- Prove exact own-plain four-field admission, title trim/2..80/control limits,
  both surface keys, unknown page, surface mismatch, unchanged title, inherited,
  accessor, symbol, non-enumerable, extra, and hostile conversion cases.
- Assert the fixed request error never echoes hostile input and getters are not
  invoked.

Run focused RED before creating production source, from `apps/control-plane`:

```powershell
node node_modules/vitest/vitest.mjs run test/template-page-edit.test.ts
```

**Implement:** export a strict operation with named input/result types. Copy
through own data descriptors, validate bounded primitives, locate exactly one
page, clone through inspected values, change only title, reassert Graph V3, and
return fresh data. Never mutate or retain caller objects.

## Task 2: Append Draft and Snapshot atomically

**Tests first:** extend Template service/controller tests for:

- exact route and body delegation;
- accepted r.2 -> r.3 edit with new Draft id/checksum and active Snapshot;
- prior Draft and Snapshot field equality after success;
- application name/origin unchanged;
- stale/replay base, unknown application/page, surface mismatch, unchanged title;
- P2034 bounded retry, P2002/revision movement conflict;
- render or Snapshot failure rolls back both new records;
- no Publish, Compilation, provider, queue, export, or runtime call.

Capture focused RED, then add the controller route and service orchestration.
Reuse the existing three-attempt Serializable helper and response assembler.
Every retry re-reads workspace/origin/latest Draft and reruns page validation.

Focused GREEN from `apps/control-plane`:

```powershell
node node_modules/vitest/vitest.mjs run test/template-page-edit.test.ts test/template.controller.test.ts test/template.service.test.ts
```

## Task 3: Add strict Workbench client admission

**Tests first:** add exact request/route tests and response rejection tests to
`control-plane-client.test.ts`. Preserve Task 6B's strict Graph checksum,
workspace, full projection, and browser-safe boundary. A malformed response
must not replace the visible Draft.

Add `appendTemplatePageRevision(applicationGraphId, input)` without widening the
existing rename command or duplicating the response parser.

Focused GREEN from `apps/workbench`:

```powershell
node node_modules/vitest/vitest.mjs run lib/control-plane-client.test.ts
```

## Task 4: Keep preview selection and expose Page only

**Tests first:** characterize and then prove:

- selected `{surfaceKey,pageId}` is controlled by the Workbench and survives
  Preview -> Page -> Preview;
- `Edit page` navigates to Page with the exact selected page;
- a template Draft Builder shows Page only; future destinations are absent;
- ordinary V1 Builder navigation remains unchanged;
- back/Escape returns to Preview with no request.

Lift template selection into `workbench.tsx`; keep the preview component focused
on rendering and events. Add a small allowlist input to BuilderNavigation or an
equivalent shell boundary. Do not add broad controller state.

## Task 5: Implement the Page workspace

**Tests first:** create component tests for valid/invalid/unchanged/busy/error/
success states, focus restoration, keyboard submit/Escape, and preserved
selection. Titles remain React text and never raw HTML.

Create a sparse Page editor with surface/route context, labelled title input,
one primary save action, back action, and the existing preview. On success show
the new revision/Snapshot and server title; on failure keep the unsaved title.
Add only `template-page.css` and one globals import. Narrow layout stacks editor
and preview; controls remain 44px and focus-visible.

## Task 6: Connect controller and real browser journey

Add only the minimal controller action needed to call the client, replace the
Template Draft instance after strict success, and expose fixed busy/error state.
Avoid unrelated controller behavior.

Extend the existing Playwright fixture and journey:

1. clone Restaurant template;
2. rename to Draft r.2;
3. select Customer Menu;
4. open Page;
5. change title to `Seasonal Menu`;
6. save;
7. assert Draft r.3, a new Snapshot, same selection, and preview title.

## Task 7: Verification and review

Writer handoff must include focused Control Plane and Workbench RED/GREEN;
full Control Plane and Workbench; Graph/Capabilities/Compiler compatibility;
both no-emit typechecks and builds; Prisma validation; Playwright; exact-21
formatting/diff/containment; sensitive-data and browser-import scans; and proof
no forbidden path or external action occurred.

Independent review assesses specification, strict boundary, transaction races,
Snapshot binding, UI behavior/accessibility, test resistance, and exact scope.
After all P0/P1 findings close, the controller reruns fresh gates, updates
governance, stages the exact delivery manifest, commits once with subject
`feat(workbench): add template page draft editing`, pushes non-force, and proves
local `HEAD` equals upstream with a clean worktree.
