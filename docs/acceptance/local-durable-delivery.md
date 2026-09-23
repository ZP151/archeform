# Local durable delivery rehearsal

Status: accepted as a narrow local rehearsal after actual attempt 4 and the
existing independent review, P0/P1/P2 0/0/0.
No hosted deployment or production adapter is accepted.

This checks a missing ordinary-user outcome: a generated application can receive
a compatible revision while retaining its business records, and a failed revision
does not leave the user without a working application. It is separate from CI,
Git delivery and disposable Preview startup.

## Scope and reproduction

Authority: [ADR-0075](../adr/adr-0075-local-durable-delivery-rehearsal.md), accepted
SHA-256 `d2cf85a5bd0bc299e4144a81e708b4407532d081bf087f4e49f8549f2f9167bb`.

The provider-free fixture assembles two immutable Published Team Task revisions
of the same logical application through public composition/compiler entry points.
Only the list-page title changes. Both complete file manifests are checked, and
database artifacts must remain identical before any application command starts.
Actual containers use owned labels, loopback endpoints and isolated synthetic
PostgreSQL storage. The existing database is bootstrapped once. No real user
application, cloud account, credential or external service is involved.

```sh
node --test scripts/local-durable-delivery.test.mjs
node scripts/local-durable-delivery.mjs plan
node scripts/local-durable-delivery.mjs run
```

The actual run is bounded to 15 minutes including a cleanup reserve. Safe phase
JSON and screenshots are written under Playwright's output directory. Preserve
failed evidence before the next run; a passing unit test is not a passed rollout.

## Required outcomes

- Create, correct and transition records under revision A with retained history.
- Reject an unready B candidate while A remains readable and writable.
- Promote healthy B at the same gateway, retaining A records and accepting B writes.
- Roll back to retained A executable image IDs while preserving B writes.
- Restore a verified backup into separate storage; confirm IDs/history/receipts,
  replay an original A command and perform a new action without changing the main app.
- Reject changed database artifacts before execution. The experiment makes no
  promise of automatic rollback across destructive schema changes.
- Remove only exactly owned runtime resources and record incomplete cleanup.

## Actual attempts

| Attempt | Run ID                     | Result                                                                                                                                                                                                                                                                                                                               |
| ------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1       | `f5c6514c05895336ea7a93e5` | Failed after application image build on an unconditional PostgreSQL pull. A short-image-ID cleanup comparison also failed. Exact owned images were subsequently removed; no database or application containers were created. Failed source is retained for diagnosis.                                                                |
| 2       | `1798403ec468377082ef5661` | Failed after A readiness. Unphased assertions and buffer-only attachments prevented localization. All owned Docker resources were removed. This run remains failed.                                                                                                                                                                  |
| 3       | `15a8e326e3b1e87aafc670bd` | Failed at the A screenshot assertion after create/read/correct/transition/history passed. The screenshot visibly contains both authored records. Actual emitted-DOM reproduction proves the title includes its responsive field label, which the exact-text locator omitted. Scoped cleanup and independent resource inventory pass. |
| 4       | `7dd8d049d3ef0673fa227d1b` | Passed all 24 phases and scoped cleanup, exit 0 with `delivery.completed`. Independent run-label inventory confirms no owned containers, volumes, images or networks.                                                                                                                                                                |

Attempt 3's [safe evidence](evidence/local-durable-delivery/attempt-03/safe-evidence.json)
and [failure screenshot](evidence/local-durable-delivery/attempt-03/failure.png)
are retained. Earlier failed attempts are not rewritten as successful.

The locator correction is limited to the test helper and its emitted-browser
regression. The exact heading is visible at 390/1280/1440, excludes a similarly
named sibling and fails for a hidden or removed target. Root independently
confirms that focused case; the owner reports 34/34 harness tests. Generated
application behavior is unchanged.

## Passed local outcome

The fourth run passes failed-candidate retention, healthy B promotion, B create
and correction, PostgreSQL restart, backup, retained-image rollback and separate
restore. Audit/receipt counts progress from 4/4 after the initial A actions to
5/5 after a write during candidate failure, 7/7 after B writes and 8/8 after a
post-rollback write. The same record IDs and versions remain readable. Original
A-command replay after rollback and restore adds no duplicate receipt or audit
entry. Separate restored-app activity leaves the main database snapshot unchanged.
This Task fixture declares zero capability effects; it does not prove nonzero
outbox delivery.

Safe HTTP diagnostics retain one transient `403 task.denied` during the phase
sequence that includes readiness polling after PostgreSQL restart. Subsequent
readiness and business checks pass. This result does not mean every request during
a restart succeeded or establish uninterrupted availability.

Recorded phase execution totals 145,345 ms, excluding final cleanup and other
unphased overhead; it is not an end-to-end availability SLA. Build took 71,683 ms,
healthy B switching 5,171 ms, rollback 18,460 ms and separate restore 10,544 ms.
The custom-format synthetic backup is 17,837 bytes with its digest retained.

Evidence: [safe results](evidence/local-durable-delivery/attempt-04/safe-evidence.json),
[independent resource proof](evidence/local-durable-delivery/attempt-04/root-resource-proof.json),
[revision A](evidence/local-durable-delivery/attempt-04/revision-a.png),
[revision B](evidence/local-durable-delivery/attempt-04/revision-b.png) and
[rollback](evidence/local-durable-delivery/attempt-04/rollback-a.png).
Root visually confirms the B page heading and return to A with authored records;
the API/history checks establish persistence beyond the visible first viewport.

Tested harness SHA-256: `0573555324ded2a14aad38d205e5245d0557f7612965f1a9bf1967b6c1b41c30`.
Tested spec SHA-256: `3f6c8a53b0ef9f5ca8fdea93d4574df95258b633c8cf3cf189c00d5dc36731a5`.
Tested fixture SHA-256: `54ee1a4121af29a31990dfe0e133d07d4c52d011e038ea3b9942993fcd98ecd2`.
The safe evidence independently binds actual Graph/lock, complete bundle and
Docker image identities. All source is based on branch HEAD `ac627b676ed6ac4495645b60e1d4f67bf913a3ce`
plus these uncommitted test files; this is not a claim that HEAD already contains them.

## Limits and next delivery work

The focused harness suite also passes 34/34 cases with native TypeScript stripping
disabled, covering the supported Node 22.11 execution mode. Its test-only loader
transpiles the actual fixture in memory with the existing TypeScript dependency;
the harness, fixture and actual acceptance spec hashes above remain unchanged.
The existing independent reviewer clears this bounded follow-up at P0/P1/P2
0/0/0. No deployment behavior changes or additional Docker rehearsal are implied.

The rehearsal is synthetic, local and schema-compatible. It does not establish
real-user effort, private identity, tenancy, TLS, operational monitoring, a
deployment provider, or a production backup policy. Those belong to the hosted
pilot once its concrete environment is supplied and its adapter is accepted.

Earlier Windows client scratch paths and a failed fake-test worker remain
`cleanup_required` after automatic approval review rejected their cleanup with
`blocked by policy`. Their exact identities and non-retry rule remain in the
[PM ledger](../superpowers/ledgers/2026-09-07-consumer-generation-delivery.md).
Successful teardown of a later Docker run does not clear those residuals.
