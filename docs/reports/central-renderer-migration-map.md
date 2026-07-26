# Central-renderer migration map

**Status:** Explorer discovery report.
**Scope:** Composable Internal Approval Suite (CIS-02).
**Contract status:** Proposed slots below are inputs to ADR 003 and the
`factory-component/v1` / `factory-composition/v1` contract freeze; they are
not a frozen contract.

## Finding

The current renderer is centralized in
`apps/api/control_plane.py` (`_render_vnext_application`, lines 892-1003).
It copies one monolithic leave template, then overwrites backend, data, UI,
tests, documentation, smoke, lock, and evidence files from a validated
definition. The required future component set is specified in
`docs/agent-workstreams/composable-internal-approval-suite.md`.

## Responsibility map

| Current responsibility | Current evidence | Future owner and proposed Composer slot | Regression evidence |
| --- | --- | --- | --- |
| Fixed six-component selection, compatibility, and plan lock | `apps/api/control_plane.py:568-632`; `packages/catalog/components.json` | **Registry + Composer**; `meta/component-lock`, `meta/composition-plan` | `tests/api/test_component_planner.py:46-170` covers canonical Golden selection, incompatibility, tampered digests, and duplicate providers. |
| Template-root traversal and copying | `apps/api/control_plane.py:2500-2540` | **Composer**; declared `runtime/scaffold/**` slots only. Retain reparse-point, regular-file, and containment checks. | `tests/api/test_control_plane.py:382-450` covers unowned paths, junctions, symlinks, and output escapes. |
| Runtime topology, PostgreSQL bootstrap, and Docker files | `packages/templates/leave-approval/docker-compose.yml`; copied from `packages/templates/leave-approval/**` | `data.postgres-runtime`; `runtime/compose`, `runtime/postgres-init`, `runtime/backend-image`, `runtime/frontend-image` | `tests/api/test_control_plane.py:156-183` proves the rendered topology; `tests/executor/test_worker.py:145-205` covers fixed commands and ready status. |
| API endpoint generation and typed field handling | `apps/api/control_plane.py:1640-1868`; `apps/api/control_plane.py:2008-2024` | `backend.record-api`; `backend/api/records`, `contracts/openapi` | `tests/api/test_component_planner.py:171-312` covers actor/page enforcement, compilable quote/backslash labels, and definition-driven roles and fields. |
| Demo actor recognition and authorization guards | `apps/api/control_plane.py:1727-1736` in generated backend source | `backend.rbac`; `backend/authz`, `frontend/authz-contract` | Preserve role denial and page-actor matrix coverage in `tests/api/test_component_planner.py:171-189`. |
| Submit/approve/reject lifecycle | `apps/api/control_plane.py:1767-1847` | `workflow.single-level-approval`; `backend/workflow/approval` | Generated lifecycle tests originate at `apps/api/control_plane.py:1939-1994`; preserve submit, approve, audit, and unauthorized-decision cases. |
| Record schema, constraints, and grants | `apps/api/control_plane.py:1870-1937` | `data.postgres-runtime` owns bootstrap/grants; `backend.record-api` contributes the declared record-schema fragment; Composer merges only this slot. | `tests/api/test_component_planner.py:313-460` verifies definition-driven output and append-only schema behavior. |
| Append-only audit behavior | `apps/api/control_plane.py:1849-1860`; `apps/api/control_plane.py:1905-1935` | `ops.audit-log`; `backend/audit`, `data/audit-schema` | Preserve submit/approve/audit smoke and append-only-trigger assertions. |
| Combined React page, dynamic fields, list, queue, and audit view | `apps/api/control_plane.py:2026-2280` | `ui.app-shell`, `ui.approval-form`, `ui.my-requests`, and `ui.approval-queue`; `frontend/features/**`, assembled by Composer-owned `frontend/app/page.tsx` | Retain API/UI actor-matrix, generated-source compilation, and browser smoke coverage. |
| Page metadata and visual shell | `apps/api/control_plane.py:2283-2305`; `packages/templates/leave-approval/frontend/app/globals.css` | `ui.app-shell`; `frontend/app-shell`, `frontend/styles` | Add package fixture tests and an assembled-app snapshot/smoke. |
| README, smoke test, and frontend E2E fixture | `apps/api/control_plane.py:2307-2331`; `apps/api/control_plane.py:2333-2498` | Composer-owned `docs/readme`, `tests/smoke`, `tests/e2e`; components supply declarative fixtures, not executable adapters. | `tests/api/test_control_plane.py:184-276` covers role-aware smoke and its offline help/startup budget. |
| Definition, lock, manifest, run summary, and Executor request | `apps/api/control_plane.py:908-1003`; `apps/api/control_plane.py:1005-1049` | **Composer/control plane only**; `meta/application-definition`, `meta/component-lock`, `meta/render-manifest`, `meta/run-summary`, `meta/executor-request` | `tests/api/test_executor_handoff.py:67-205` and `tests/executor/test_worker.py:206-387` cover checksum-bound handoff, tampering, and path escapes. |

## Required future package coverage

The target package list adds packages that have no current generated-app
equivalent: `ui.login-page`, `ui.home-page`, `ui.profile-page`, and
`ui.system-settings-page`. The current root page combines an actor selector,
form, record list, queue, and audit display. Each new package therefore needs
a defined input fixture and output slot before implementation.

`backend.session-auth` is also a functional gap: the current generated app
recognizes a supplied `X-Demo-Actor` header but has no session implementation.

There is no dedicated target owner for the current audit UI. ADR 003 must
either assign its presentation slot to `ui.app-shell` or introduce an audit
UI package. Leaving the ownership implicit would recreate central-renderer
coupling.

## Migration order

1. Freeze `factory-component/v1` and `factory-composition/v1`, including
   slots, merge policy, validated-input provenance, package digest rules, and
   audit-UI ownership.
2. Split the leave template into package fixtures without changing generated
   output; retain the current renderer as a comparison oracle.
3. Replace fixed catalog labels with package manifests and Registry
   resolution; prove deterministic locks for the same definition.
4. Assemble the leave output from declared slots and compare its manifest
   paths/checksums before running API, smoke, and Executor regressions.
5. Add an expense fixture. It must resolve to the same key/version/digest
   locks while varying only validated fields, labels, schema, and UI.
6. Remove the composable-path fallback to `_render_vnext_application` only
   after the two-product proof passes. The legacy renderer remains a rollback
   boundary, never an implicit Composer fallback.

## Migration coupling risks

- The renderer overwrites nine dynamic paths after copying static files.
  Components cannot safely share current paths such as `backend/app/main.py`
  or `frontend/app/page.tsx`.
- Field semantics are duplicated across Python, SQL, React, OpenAPI, backend
  tests, E2E, and smoke generation. A canonical validated-input fixture is
  required to prevent drift.
- The catalog hard-codes six ordered capabilities in
  `apps/api/control_plane.py:40-47`, while the target has fourteen packages.
  The Registry contract must replace this fixed cardinality and ordering.
- Compose and the Executor expect root-level `docker-compose.yml` and
  `smoke_test.py`; their slots are compatibility-critical.
- Current digests validate catalog records, not package contents. The new
  digest must cover each manifest and declared asset set before the Executor
  accepts a lock.

## Preconditions and evidence boundary

The CIS ledger remains `planned` and identifies founder acceptance of ADR 003
and contract freeze as the current gate:
`docs/superpowers/ledgers/composable-internal-approval-suite.md`. ADR 003 and
the `factory-component/v1` / `factory-composition/v1` frozen artifacts were
not present at the time of discovery. This report does not approve those
decisions or alter implementation scope.
