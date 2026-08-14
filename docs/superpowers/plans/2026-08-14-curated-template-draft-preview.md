# Curated Template Draft Preview Implementation Plan

**Goal:** Deliver the second Workbench rebuild slice: start from one curated
Restaurant template, create an independent V3 Draft, render a Snapshot V2-bound
dual-surface preview, and prove one real edit appends a new Draft and Snapshot.

**Architecture:** Keep Graph contracts unchanged. A dedicated Control Plane
template service owns the fixed registry, deterministic Restaurant composition,
origin persistence, optimistic Draft append, Snapshot V2 creation, and existing
compiler preview projection. Workbench adds the equal template entry path and a
focused template Draft workspace; the legacy V1 controller remains intact.

**Process:** TDD for behavior and boundaries, one independent review, fresh
verification, one intentional commit and non-force push. No multi-round PM/QA
loop for ordinary UI repairs.

## Constraints

- No Graph/Product Recipe/compiler-target version change and no V3-to-V1
  conversion.
- No provider, model, network, install, new external package, Docker, Compose,
  marketplace, source upload, template auto-update, Publish, or Compilation.
- Preview is Snapshot V2-bound and non-exportable. Every edit appends a Draft
  and creates a new Snapshot.
- Use direct existing runtimes only; do not invoke pnpm/corepack/install.
- Keep Graph/checksum detail out of the default Workbench frame.

## Implementation manifest

Governance:

- `docs/adr/adr-0012-curated-template-draft-preview-lifecycle.md`
- `docs/superpowers/plans/2026-08-14-curated-template-draft-preview.md`
- `docs/project-status.md`
- `docs/roadmap.md`
- `docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md`

Control Plane:

- `apps/control-plane/package.json`
- `pnpm-lock.yaml` (Control Plane importer only)
- `apps/control-plane/prisma/schema.prisma`
- `apps/control-plane/prisma/migrations/20260814_add_template_draft_preview_lifecycle/migration.sql`
- `apps/control-plane/src/app.module.ts`
- `apps/control-plane/src/template/template.controller.ts`
- `apps/control-plane/src/template/template.service.ts`
- `apps/control-plane/src/lifecycle.service.ts`
- `apps/control-plane/test/prisma-schema.test.ts`
- `apps/control-plane/test/template.controller.test.ts`
- `apps/control-plane/test/template.service.test.ts`
- `apps/control-plane/test/lifecycle.service.test.ts`

Workbench:

- `apps/workbench/lib/control-plane-client.ts`
- `apps/workbench/lib/control-plane-client.test.ts`
- `apps/workbench/hooks/use-workbench-controller.ts`
- `apps/workbench/components/workbench.tsx`
- `apps/workbench/components/workbench-home.tsx`
- `apps/workbench/components/workbench-home.test.tsx`
- `apps/workbench/components/template-draft-workspace.tsx`
- `apps/workbench/components/template-draft-workspace.test.tsx`
- `apps/workbench/components/shell/utility-bar.tsx`
- `apps/workbench/components/shell/workbench-shell.tsx`
- `apps/workbench/components/shell/workbench-shell.test.tsx`
- `apps/workbench/styles/template-draft.css`
- `apps/workbench/styles/template-preview.css`
- `apps/workbench/styles/shell.css`
- `apps/workbench/styles/workspace-home.css`
- `apps/workbench/test/template-draft-fixture.ts`
- `apps/workbench/playwright.config.ts`
- `apps/workbench/e2e/template-draft.pw.ts`
- `apps/workbench/app/globals.css`

## Task 1: Control Plane contract and persistence RED

- [x] Add failing schema tests for nullable template origin and append-only
      Snapshots with a same-application Draft relation.
- [x] Add failing controller tests for the exact four routes.
- [x] Add failing service tests for catalog, clone, replay, unknown template,
      independent ids, origin, checksum, two surface previews, stale edit, rename,
      and append-only Snapshot behavior.
- [x] Run focused direct Vitest and record RED before production edits.

## Task 2: Control Plane GREEN

- [x] Add the migration/schema, internal compiler workspace edge, template
      controller/service, and AppModule registration.
- [x] Compose the first-party Restaurant graph deterministically from delivered
      capabilities and strict Graph contracts.
- [x] Create and validate ready/rendering/active Snapshot V2 state, render both
      surfaces, and persist the active snapshot.
- [x] Implement idempotent clone and optimistic rename-only revision append.
- [x] Run focused tests, Control Plane typecheck/build/tests, and Graph/
      Capabilities/Compiler compatibility.

## Task 3: Workbench RED and GREEN

- [x] Add failing client parser/request tests for catalog, clone, and rename.
- [x] Add failing Home tests for equal Describe and Start from template actions.
- [x] Add failing workspace tests for dual-surface navigation, origin/version,
      Draft revision, nontechnical preview status, title edit, and stale/error state.
- [x] Connect controller state and actions without widening the legacy V1 graph
      editor contract.
- [x] Implement the focused template workspace and responsive styling.
- [x] Run focused tests, Workbench full suite/typecheck/build, and a real browser
      smoke for clone -> preview -> rename -> new revision.

## Task 4: Verification and delivery

- [x] Verify exact manifest, lock importer-only diff, migration, formatting,
      diff-check, banned imports, sensitive material, and no unintended Graph/API
      changes.
- [x] Obtain one independent specification/code review and repair actionable
      findings with focused TDD.
- [x] Re-run fresh package suites, typechecks, builds, and browser smoke.
- [x] Update current status/roadmap/ledger concisely, commit once, push
      non-force, and prove local/upstream equality.

## Outcome

Delivered by the enclosing commit. Fresh final evidence: Control Plane 253/253,
Workbench 384/384, real browser journey 1/1, both package typechecks/builds,
Prisma validation, exact 36-path containment, and independent review
P0/P1/P2=0/0/0. The real Control Plane response is parsed against the same Graph
V3 checksum and exact 8-page customer / 7-page merchant projection rendered by
the compiler; no divergent preview fixture remains.
