# Workbench Access Contextual Editor Plan

**Date:** 2026-08-14
**State:** Ready for writer
**Design:** [2026-08-14-workbench-access-contextual-editor-design.md](../specs/2026-08-14-workbench-access-contextual-editor-design.md)
**Authority:** ADR-0021, ADR-0022
**Base:** `a857df58c0e2d8b86782d24aee68be3c8f7dd166`

## Objective

Deliver one bounded V3 Access contextual editor: Builder -> Access on the
Restaurant template Draft renders the declared roles/permissions and admits
exactly one write — add a team role with a bounded `table-session`/`read`
permission — appended as Draft r.7 and one active Snapshot V2.

## Writer authority

One Sol writer owns every path below. Parallel writers are not authorized:
role/permission admission is a shared security boundary. The writer may only
change the exact implementation manifest; governance records are
controller-owned at delivery.

## Exact implementation manifest

1. `apps/control-plane/src/template/template-access-edit.ts`
2. `apps/control-plane/src/template/template.service.ts`
3. `apps/control-plane/src/template/template.controller.ts`
4. `apps/control-plane/test/template.service.test.ts`
5. `apps/control-plane/test/template.controller.test.ts`
6. `apps/workbench/lib/control-plane-client.ts`
7. `apps/workbench/hooks/use-workbench-controller.ts`
8. `apps/workbench/components/template-access-workspace.tsx`
9. `apps/workbench/components/workbench.tsx`
10. `apps/workbench/components/template-access-workspace.test.tsx`
11. `apps/workbench/lib/control-plane-client.test.ts`

## Delivery subject

`feat(workbench): add governed restaurant access editing`

## RED criteria (before implementation)

- Control Plane: `captureTemplateAccessRevisionInput` rejects a malformed,
  duplicate, empty, or undeclared role key and any non-bounded command; the
  apply function rejects a canonical-role removal and any drift.
- Workbench: the Access surface routes to the V3 access editor only when a
  template Draft is active; the editor renders the declared roles and only
  enables save for a valid, new Graph-key role.

## GREEN criteria (acceptance)

- A valid new role with its bounded permission is appended as the next Draft
  revision and one active Snapshot V2, and the returned instance reflects it.
- Every rejected input fails closed with the fixed redacted error and no
  Draft/Snapshot mutation.
- Full Control Plane and Workbench suites pass; Graph 661/661, Compiler
  615/615, and Capabilities 384/384 remain green; both no-emit/build gates
  pass; direct Prettier and `git diff --check` are clean.

## Delivery authority

Only the controller may stage the frozen paths, commit with the exact subject,
push without force, and prove local `HEAD` equals upstream with a clean tree.
