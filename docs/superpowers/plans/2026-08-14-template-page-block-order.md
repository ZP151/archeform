# Template Page Block Order Implementation Plan

> **Execution rule:** use TDD, one GPT-5.6-Sol integration writer, one
> independent task review, same-writer repair, one fresh independent Terra QA,
> one independent final Sol release review, PM acceptance, controller
> verification, and one reviewed commit/push. This slice crosses a stable API,
> authority, and cross-package serialized projection boundary, so the full
> delivery-policy gate applies.

**Goal:** Reorder the existing blocks of one Restaurant Graph V3 page, append a
new Draft and immutable Snapshot V2, and show the server-authoritative order in
Workbench without changing block membership, content, bindings, recipes,
source, generated runtime, Publish, or Compilation.

**Base:** `3c13c8526271ac470030edf5f1e434920b120ce7`

**Architecture:** The browser emits only an exact id permutation. The Control
Plane captures it once, validates workspace/origin/latest-base and the same-set
Graph closure under bounded Serializable retry, mutates only `page.blocks` and
the selected `main.blockIds`, then atomically appends a Draft and Snapshot. The
internal Restaurant surface projection accepts exact Graph-order permutations
while retaining registry authority for membership, types, bindings, recipes,
and source. Puck is used only as a reorder surface with insert/edit/delete/
duplicate disabled.

**Accepted contract:**

- `docs/adr/adr-0014-template-page-block-order-round-trip.md`
- `docs/superpowers/specs/2026-08-14-template-page-block-order-design.md`

## Exact implementation manifest

The writer may create or edit exactly these 25 paths:

1. `packages/compiler/src/targets/restaurant-v3/surface-projection.ts`
2. `packages/compiler/test/restaurant-v3-surface-projection.test.ts`
3. `packages/compiler/test/restaurant-v3-preview.test.ts`
4. `packages/compiler/test/restaurant-v3-contract.test.ts`
5. `packages/compiler/src/targets/restaurant-v3/preview.ts`
6. `packages/compiler/src/targets/restaurant-v3/index.ts`
7. `packages/compiler/src/index.ts`
8. `apps/control-plane/src/template/template-page-block-order.ts`
9. `apps/control-plane/src/template/template.controller.ts`
10. `apps/control-plane/src/template/template.service.ts`
11. `apps/control-plane/test/template-page-block-order.test.ts`
12. `apps/control-plane/test/template.controller.test.ts`
13. `apps/control-plane/test/template.service.test.ts`
14. `apps/workbench/lib/template-page-block-order.ts`
15. `apps/workbench/lib/template-page-block-order.test.ts`
16. `apps/workbench/components/template-page-block-order.tsx`
17. `apps/workbench/components/template-page-block-order.test.tsx`
18. `apps/workbench/components/template-page-workspace.tsx`
19. `apps/workbench/components/template-page-workspace.test.tsx`
20. `apps/workbench/hooks/use-workbench-controller.ts`
21. `apps/workbench/lib/control-plane-client.ts`
22. `apps/workbench/lib/control-plane-client.test.ts`
23. `apps/workbench/styles/template-page.css`
24. `apps/workbench/test/template-draft-fixture.ts`
25. `apps/workbench/e2e/template-draft.pw.ts`

Need for another implementation path is a PM stop. In particular, no Graph,
Product Recipe, Screen Recipe, generated target/runtime, Prisma, package,
workspace, lockfile, provider, service, Docker, Compose, Source, Publish,
Compilation, or export path may change.

## Task 1: Make projection order Graph-authoritative

- [x] Before production edits, add failing tests for both surfaces proving an
      exact permutation is projected in Graph order.
- [x] Retain tests proving the original registry order remains byte-compatible.
- [x] Reject missing, extra, duplicate, type-drifted, binding-drifted,
      recipe-drifted, source-drifted, or region-disagreeing blocks.
- [x] Prove production compilation still rejects the reordered Draft and makes
      no generated-runtime order claim.
- [x] Implement the minimal projection widening; registry membership, values,
      bindings, recipe, and source remain authoritative.
- [x] Expose one pure `assertRestaurantDraftPreviewGraphClosure` through the
      existing Restaurant target and Compiler facade, and call it before any Draft
      insert or renderer invocation.

## Task 2: Add the strict pure server operation

- [x] Add `template-page-block-order.ts` tests before production code.
- [x] RED the exact five-field own-plain input and ordinary dense own-data array
      requirements, 2..20 length, unique Graph keys, and fixed redacted error.
- [x] RED same-set/change checks for both surfaces and the single `main` region.
- [x] RED structural equality proving that only `page.blocks` and
      `main.blockIds` order changes and all block values/bindings remain unchanged.
- [x] Implement one-time primitive capture, fresh-copy mutation, Graph V3
      reassertion, and deterministic hash without invoking getters/conversions.

## Task 3: Append Draft and Snapshot atomically

- [x] RED the exact POST route and response boundary.
- [x] RED capture-before-Prisma, workspace-before-origin, latest-base,
      cross-workspace, stale/replay, unchanged, wrong page/surface/region, P2002,
      and exhausted P2034 behavior.
- [x] RED bounded retry reuse of the captured command and prove no repeated body
      admission or caller invocation.
- [x] RED renderer, validation, and Snapshot failure rollback: neither Draft nor
      Snapshot commits; prior history stays readable.
- [x] Implement at most three Serializable attempts and reuse the existing
      strict template-instance response.

## Task 4: Add the narrow Puck reorder surface

- [x] RED a pure adapter that accepts only an exact id/type permutation and
      rejects insertion, deletion, duplication, rename, type change, or foreign id.
- [x] RED Puck permissions: drag true; duplicate/delete/edit/insert false.
- [x] RED keyboard Move up/down behavior, disabled boundaries, accessible labels,
      status announcement, predictable focus, and valid-changed Save gating.
- [x] Implement with `Puck.Layout`, `Puck.Outline`, and `Puck.Preview`; do not use
      the V1 PageModel/Puck adapters, palette, or fields.

## Task 5: Wire the Workbench command

- [x] RED the exact client route/body/strict response and fixed
      `Template page could not be saved.` failure.
- [x] RED that local order is editor-only before success; the adjacent product
      preview remains server-authoritative and unchanged while saving/failing.
- [x] RED that success replaces the instance and Snapshot and that stale/replay
      never rebases.
- [x] Implement controlled `surfaceKey`/`pageId`, current Draft base id, and the
      existing Page title editor alongside the order mode.

## Task 6: Prove the visible journey

- [x] Extend the real browser journey: clone -> rename r.2 -> title r.3 -> reorder
      r.4 -> reload.
- [x] Prove the chosen page, block ids, order, bindings, Snapshot checksum, and
      latest r.4 state after browser reload; prove prior r.3 Draft/Snapshot
      immutability through the server lifecycle test because this slice adds no
      history picker.
- [x] Prove drag and keyboard paths and a 390px viewport.
- [x] Do not claim generated Customer/Merchant runtime order changed.

## Task 7: Verify, review, and deliver

- [x] Focused RED/GREEN evidence exists for projection, server, client, UI, and
      browser behavior.
- [x] Full Compiler, Control Plane, Workbench, Graph, and Capabilities tests pass.
- [x] Compiler/Control Plane/Workbench typechecks pass; Control Plane and Next
      production builds pass; Prisma validation passes.
- [x] Exact-25 Prettier, `git diff --check`, browser-import, sensitive-hunk, and
      exact containment checks pass.
- [x] One independent read-only task reviewer checks specification, security,
      concurrency, Graph/Snapshot immutability, Puck restrictions, accessibility,
      test resistance, and exact scope. Same writer repairs any P0/P1 with TDD.
- [x] One fresh independent Terra QA pass passes on the same exact tree after
      task-review repair.
- [x] One independent final Sol release review passes on the Terra-QA tree.
- [x] Fresh PM and controller verification passes after the release verdict.
- [x] PM records acceptance, stages only the exact delivery manifest, commits
      `feat(workbench): add governed page block ordering`, pushes non-force, and
      proves local `HEAD` equals upstream with a clean tree.

## Task-review repair — 2026-08-14

The first independent two-axis review returned NOT READY with actionable
P0/P1/P2 `0/6/3`. Before any prior GREEN can authorize QA, the same writer must
complete this provider-free RED/GREEN repair in the exact 25 paths:

- [x] RED a hostile Array Proxy with a bounded declared length and 100,000
      fabricated own keys; prove rejection occurs after one bounded key-list check
      and before per-key descriptor amplification. Move the own length descriptor
      and 2..20 check before prototype/ownKeys, then bound `ownKeys.length` before
      inspecting index descriptors.
- [x] RED current-base unchanged order at pure and service boundaries; distinguish
      it from malformed input and return exactly the fixed reload conflict/409.
- [x] RED registry type, binding, recipe, and source drift proving zero Draft
      create and zero renderer invocation. Add the pure public Compiler closure
      assertion and call it before append/render.
- [x] RED extra Puck entry/props/root fields, symbols, non-enumerables,
      accessors, throwing/revoked proxies, sparse/custom arrays, and mutation after
      validation. Capture exact plain own data once and compare only copied
      primitives; caller getters and conversion hooks remain zero.
- [x] RED the real Puck canvas order after keyboard movement, failure, and a new
      authoritative response. Synchronize through a supported Puck store action or
      deterministic controlled remount keyed by captured order.
- [x] Use one pure permutation application function for both Puck drag output
      and keyboard movement.
- [x] Strengthen server tests to prove prior r.3 Snapshot/checksum/bindings remain
      immutable, and Playwright to prove authoritative r.4 reload, move-button focus,
      and Puck/order controls stack without horizontal overflow at 390 px.
- [x] Re-run every focused/full/type/build/Prisma/browser/static gate, then hand
      the exact repaired tree to the same independent task reviewer. Terra QA and
      final Sol release review remain sequentially blocked until that review passes.

## Delivery manifest

Delivery is the exact 25 implementation paths plus these six governance paths:

1. `docs/adr/adr-0014-template-page-block-order-round-trip.md`
2. `docs/project-status.md`
3. `docs/roadmap.md`
4. `docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md`
5. `docs/superpowers/plans/2026-08-14-template-page-block-order.md`
6. `docs/superpowers/specs/2026-08-14-template-page-block-order-design.md`

Expected delivery containment is 31 paths, with no missing, unexpected,
unstaged, or untracked manifest path. Commit and push are controller-only.

## Delivery outcome — 2026-08-14

The final independent Sol release review returns `RELEASE_ACCEPT` with
actionable P0/P1/P2 `0/0/0` and no deferred Task 7B issue. Fresh focused tests
pass Compiler 63/63, Control Plane 59/59, and Workbench 76/76; full tests pass
Compiler 501/501, Control Plane 315/315, Workbench 422/422, Graph 661/661, and
Capabilities 384/384. All three repository-root TypeScript 5.9.3 no-emit
checks, exact-31 format/diff/static/containment gates, and sensitive checks
pass. Corrected Terra QA separately passed the real browser journey 1/1 on the
same tree. PM accepts the exact tree and authorizes the controller-only
enclosing commit with the frozen subject and non-force push above. The commit
does not authorize a broader editor, generated-runtime ordering, Source,
Publish, or Compilation slice.
