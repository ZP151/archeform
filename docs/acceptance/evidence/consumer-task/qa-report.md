# Team Task B3 Independent Terra QA

QA_PASS: yes

Open findings: P0 0 / P1 0 / P2 0

## Scope and evidence boundary

This independent QA covers the provider-free, isolated local Task runtime
attempt 2 after the completed task review. It validates the actual immutable
Publish, Compilation, verification, generated Preview, generated HTTP/browser,
and PostgreSQL path. The acceptance source is frozen at base
`d28f1fedf4fa0aaefe3e81492cabd857db69d8cb`; the five acceptance-harness
files in `docs/acceptance/evidence/consumer-task/acceptance-source-identity.json`
were rehashed and match.

Attempt 1 remains retained as a failed observation. It stopped before Publish:
the Workbench received the authored interpretation once but did not render Task
delivery. Investigation demonstrated that Task family recognition compared the
database `CompositionReview.applicationGraphId` with semantic Graph bindings.
The emitted Graph instead binds to the checksum-validated requirement ID. A
focused fixture with distinct database and Graph IDs reproduced the failure;
the owner corrected that identity comparison, reran focused consumer-hook
coverage (34/34), rebuilt the affected Workbench image, and obtained the
scoped review pass. This is a closed historical P1, not an open acceptance
finding.

## Executable results

| Evidence | Result |
| --- | --- |
| Actual authorized Playwright lane, `e2e/consumer-task.spec.ts` | 1/1 passed in 3.5 minutes. One authored selection, automatic Publish/Compilation/verification/Preview, and 177,738 ms to ready. |
| Actual business transitions | Two distinct tasks; create, Start, Complete, completed filter, Reopen, retained feedback, final Complete, search/no-match/clear, reload persistence, service recovery, and stale-role protection passed. |
| Authorization and rejected paths | Viewer read passed; Viewer Create/Start/Complete/Reopen returned 403; invalid Member transition returned the required safe denial; malformed Create returned 400; stale transition and competing writes returned the expected 409 paths. |
| Retry, concurrency, and persistence | Lost-response Create and Start recovered with stored replay; same-key/different-body conflict passed; competing Start gave one 200 and one version conflict; reload retained values and status. |
| Actual PostgreSQL mutation facts | Audit and receipt counts were `[5,2,1]` for lifecycle, replay/race, and recovered Create records; stored key shape was digest-only and raw-key retention was false. No keys or bodies were emitted in the log. |
| Immutable lifecycle | `runtime-outcomes.json` records verification `succeeded`, a digest-only evidence reference, and the exact generated Preview in `stopped` state. |
| Responsive/UI evidence | Inspected all 16 actual PNGs under `docs/acceptance/evidence/consumer-task/team-task-tracking`: 390, 768, and 1440 list/results views plus home, form, Viewer, pending, retry, recovery, no-match, and filtered-feedback states. The generated app is a usable cobalt workspace with native controls, icons, clear task hierarchy, readable form spacing, useful feedback, and visible role-specific actions. It is not a text-only surface. |
| Fast emitted UI regression | `e2e/consumer-task-ui.spec.ts`: 1/1 passed in 7.9 seconds, including the separate empty-versus-no-match check. This is supplementary authored transport evidence, not a substitute for the actual lane. |
| Final source and diff checks | Fresh acceptance-harness SHA-256 check: 5/5 match. `git diff --check` completed without whitespace errors; Git printed only the existing CRLF-normalization warning for the ledger. |
| Resource cleanup | `cleanup.json` records zero containers, networks, and volumes for the Factory project, the generated Preview project, and the verifier Preview project. |

No QA-authored regression test was needed: the runtime identity defect had an
owner-authored focused reproduction and regression, and the empty/no-match UI
gap received a separate focused emitted-DOM regression.

## Acceptance assessment

The actual lane demonstrates the required shared-board path: a Member can
create, start, complete, reopen, and complete again; a Viewer can read but is
server-denied all writes; assignee remains display-only. The state-changing
paths show idempotency, retry, optimistic-concurrency rejection, audit/receipt
cardinality, digest-only stored keys, and PostgreSQL persistence. The immutable
Compilation/Preview lifecycle and exact cleanup are evidenced. The observed UI
states meet the bounded responsive and qualitative presentation requirements.

## Coverage limits and release notes

- The selection transport is an authored deterministic fixture. It does not
  establish real-model selection accuracy or user-effort claims.
- Demo roles are not authentication; this slice has no tenant or private
  assignment boundary. Assignee is display text only.
- Post-creation editing, private assignments, notifications, calendars,
  integrations, and hosted deployment remain intentionally outside this
  bounded prototype.
- Evidence is local and loopback-only. No provider call, cloud action, or
  external deployment occurred.
- This QA verdict does not replace the required independent release review or
  authorize a Git release, main integration, or cloud deployment.
