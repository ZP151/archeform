# Task correction independent QA

`QA_PASS: yes`

Open findings: P0 0 / P1 0 / P2 0.

This verdict covers the bounded local generated Task correction journey. It does
not authorize a cloud deployment, Product Publish beyond the exercised local
acceptance lane, `main` integration, or a repository release.

## Executable evidence

- `pnpm exec playwright test e2e/consumer-task-ui.spec.ts --reporter=list`:
  exit 0, 2/2 passed in 10.4 seconds. This independently exercised emitted
  React/CSS at 390/768/1440 plus correction drafts, pending locking, validation
  and service recovery, unknown-result retry, conflict continuity and asset
  negative controls. It is explicitly synthetic transport evidence.
- `pnpm exec tsc -p docs/acceptance/evidence/consumer-task-correction/e2e-typecheck.json`:
  exit 0 with no diagnostics.
- Actual root-controlled command recorded in
  `actual-runtime-attempt-4.log`: 1/1 passed in 4.0 minutes. It exercised
  immutable local Publish, Compilation, all twelve verifier steps, generated
  Preview, actual generated HTTP/browser and PostgreSQL. The safe business
  record reports correction versions 0 through 7; same-ID/status correction in
  both editable states; Viewer, invalid-state, stale and changed-body denials;
  lost committed-response recovery after API restart with the exact key/body;
  and reload continuity.
- Read-only independent manifest check: all 22 production/package-test and
  acceptance hashes match `source-identity.json` and
  `acceptance-source-identity.json`.
- Read-only independent resource check: all seven retained Factory/verifier/
  Preview project names have zero containers, networks and volumes. This agrees
  with `cleanup.json` and `runtime-facts.json`.
- Read-only independent screenshot-inventory check: all 24 final actual PNGs
  exist and match their SHA-256 entries. I visually inspected the complete
  final set: creation, phone/tablet/desktop lists, prefilled correction,
  pending, recovery, conflict, unknown retry, result and Viewer states. The
  screens show readable hierarchy, labelled native fields, visible focus,
  reachable business actions, status icon/text pairing, no observed document
  overflow, clipping, overlap or replacement glyphs. The changed final pending
  screenshot was inspected directly; the other 12 shared attempt-3/final
  images have identical hashes.

Persisted PostgreSQL evidence from the actual lane is exact: audit and receipt
counts are both `[5,2,1,8]`; stored receipt keys are all digest-shaped and no
raw key is retained. Final runtime evidence binds the Control Plane (10 source
files), rebuilt compiler worker (10 source files), and Workbench (5 source
files) to their tested images. The final verifier is successful and its
correction update replay and update-denial steps both passed.

## Retained failed attempts

- Attempt 1 stopped before Publish because the supplied Factory project name
  failed the existing `factory-t9-` guard. The renamed project was the sole
  environment correction; source, images and contract were unchanged.
- Attempt 2 reached verification but its recomplete probe crashed because a
  nullable description crossed the existing flat-value boundary. The separate
  fresh-chain gap would have failed the next update probe, rather than causing
  that recomplete crash. The serialized owner added a bounded string fixture,
  reused the existing chain helpers and added derived-plan probe evidence; the
  rebuilt worker passed the relevant review and checks.
- Attempt 3 completed all verifier steps but the browser test expected disabled
  `Start` after Reopen even though the actual record was `in-progress`, whose
  correct action is disabled `Complete`. The retained image demonstrated this;
  attempt 4 changed only that E2E assertion, evidence-directory isolation and
  the Viewer 390px capture helper, then passed. These were E2E evidence-path
  changes; no production code or image was changed.

## Scope limits

Selection used an authored deterministic fixture with no provider call. This
does not demonstrate real-model selection accuracy, ordinary-user effort,
authentication or tenant isolation, private assignment, hosting, deployment or
general task-management maturity. Assignee remains display text. Compatibility
and full package evidence are retained from the reviewed final implementation;
no unaffected suite was rerun after the final E2E-only correction.
