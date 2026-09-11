# Generated approval decision history

Date: 2026-09-12. Status: accepted for bounded local delivery.

## User outcome and limits

Finance and Procurement can open Decision history in the generated application
and relate persisted Approve/Reject decisions to readable business records, the
recorded demo role and actual time. Both Expense and Purchase compose the same
private interaction. It starts closed, uses existing icons/token colors and keeps
routine Refresh icon-only. Empty, loading, safe failure and keyboard Retry are
explicit states. Role changes clear and close the panel and invalidate old reads.

The server retains existing read/audit authority. This is a local role fixture,
not verified identity or owner privacy. History joins the current record identity;
it is not a decision-time snapshot. Reasons, correction, resubmission, pagination
and uncertain-write reconciliation are not provided by this slice. Counts remain
three definitions and two demonstrated runtime families, not mature products.

## Decision and source identity

Accepted ADR-0059 SHA-256 is
`5baaf7119acec0c4c76820585cbc1dcd20ac83a799f5fbab7b72920623e0f37d`.
Its ADR-0058 predecessor was delivered at
`aefe0d813332761d2ffd2a6636d59943a88f0273`, equal to the remote branch tip.
Root recorded standing acceptance and sole source ownership before implementation.

Frozen source SHA-256:

| File                                                       | Digest                                                             |
| ---------------------------------------------------------- | ------------------------------------------------------------------ |
| `packages/compiler/src/index.ts`                           | `989a687be112b57234ed1a9107c96501c78206548edcf9309756666c603e0631` |
| `packages/compiler/src/approval-workspace-presentation.ts` | `33ee1b269e4e560af275fe7e7cbbfc43f5e5a3abda4fd548f2d4a68c9d7d519e` |
| `packages/compiler/src/approval-decision-history.ts`       | `f1089f7caf1342b3c2afa05cad300af27393bfbdb6227ba8267cfcbfe9776065` |
| `packages/compiler/test/composition-page-runtime.test.ts`  | `269399c2e2942e2a3c7efead67fc6fc1c49b5274238f5652358fda7ed0990018` |

Built worker image
`sha256:952cc00ee73dc690593b02556f9cc8a28b6638fd49d9ee34ec338e320318afce`
contains byte-identical production source. Only the compiler-worker image is new;
the existing accepted CP/WB images, topology and pinned dependencies are retained.

## Focused verification

RED failed because generated applications had no Decision history component.
Final focused compiler suite passed **34/34** in 14.42 seconds, including strict
emitted TypeScript, payload validation, ordered decision selection without
deduplication, Purchase/Expense identities and fallback, safe Details, exact time,
independent read/audit eligibility, same-scope request deduplication, error/retry,
and A/B/A role races. Build, typecheck and lint passed.

Comparison with the delivered predecessor changes only `web/app/page-runtime.tsx`
and `web/app/globals.css` in both approval definitions. All 33 API/database files
per definition remain byte exact, now frozen by focused regression tests.
Appointment, Restaurant and nonapproval full-bundle baseline checks remain green.
The private workspace is 1.2.0/sentinel 3; history is 1.0.0/sentinel 1. No package,
public registry, Graph/API/server/data/permission or lifecycle contract changed.

One independent source review found a desktop Retry target below the 44 px
contract. A scoped rule corrected it before the image was built; browser evidence
checks both desktop and phone error targets. Final combined review is clean.

Safe local logs and compatibility evidence are ignored under
`.superpowers/sdd/2026-09-12-decision-history/`. They contain no credentials or raw
model messages. Actual fixture evidence uses synthetic business records only.

## Actual generated applications

Both existing deterministic interpretation/selection lanes passed **2/2 in
6.9 minutes**, one worker and zero retries. There were no production changes or
test-helper changes after the accepted source freeze and image build.

| Definition | Compilation                 | Ready / first task time |
| ---------- | --------------------------- | ----------------------- |
| Expense    | `cmtx9cipw000ds94t5mjty3b2` | 166451 / 179953 ms      |
| Purchase   | `cmtx9gltf002gs94tf9nvgthe` | 186269 / 207308 ms      |

Each created and submitted two real persisted records, approved one and rejected
one through the UI. Before decisions, its declared auditor saw No decisions yet.
After reload, the auditor saw two ordered real decisions with business identity,
Approve/Reject, Demo role: Manager, and valid persisted times. Requester/reviewer
roles had no panel or browser audit request and direct requests returned 403.
An injected 500 exposed only the safe message; keyboard Retry recovered. Holding
both authorized reads, switching role, then releasing them could not expose old
history; switching back began closed/empty and fetched fresh data on opening.

At 390/768/1440, open/closed history, CSS/icon loading, visible controls, neutral
rows and zero axe/overflow checks passed. Error-state Retry targets also passed
at 1440 and 390. All **21 actual PNGs** were visually inspected: eight new history
views and the thirteen retained form/navigation/list/search/no-match scenarios.
The closed panel preserves the accepted first-viewport summary bounds, and the
requester's first action remains at 550 px (Expense) / 573 px (Purchase) on phone.

See [Purchase history on phone](evidence/consumer-approval-decision-history/decision-history-390.png),
[desktop](evidence/consumer-approval-decision-history/decision-history-1440.png),
and [Expense history](evidence/consumer-approval-decision-history/expense/decision-history-390.png).
The real runtime covers the light Graph themes; the unchanged ADR-0058 light/dark
brand/navigation/action evidence is retained with its original source boundary.
No new dark-mode history or ordinary-user study is claimed.

Each lane used zero questions, zero technical handoffs and one interpretation
fixture. This measures the local deterministic path, not real-model accuracy or
production hosting. Existing business mutation outcomes, persistence, search,
filters and role/state denials remained green.

## Exact cleanup

Both Previews stopped. Factory teardown exited 0, and fresh exact-label queries
found zero containers (including stopped), networks and volumes for all three:

- `factory-t9-history-20260912`
- `factory-preview-preview-f4dfaa7b-76d1-4f5a-bb60-d5773155d803`
- `factory-preview-preview-95cb1d78-3fba-4804-a6dc-ff3427203e6b`

No unrelated runtime was removed. Full safe logs are `e2e.log`, `build.log`,
`compatibility.json`, `runtime-suite.log`, and `cleanup.json` in the ignored
evidence directory above.

## Ordinary delivery decision

Independent nonwriter `/root/b2_review` completed the combined source, business,
visual and evidence review: **P0/P1/P2 0/0/0**. It inspected all eight new history
captures and the four changed retained captures; the other nine retained captures
are byte-identical to ADR-0058. Root inspected all 21 images. No actionable finding
remains in this slice. Root accepts and authorizes one normal branch commit/push.
This is not a repository-release verdict, cloud deployment, founder visual
approval or proof of a mature approval product.
