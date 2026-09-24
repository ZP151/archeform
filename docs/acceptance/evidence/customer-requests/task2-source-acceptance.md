# Customer Requests Task 2 source acceptance

PM accepts this source slice on 2026-09-24 after the independent task review,
one scoped proxy-error repair, Terra QA and final source judgment close with
P0/P1/P2 0/0/0. It implements the accepted request conversation runtime and
transport contract. Responsive UI, consumer admission and actual delivery remain
subsequent work.

The generated runtime supports owned requests, metadata correction, replies and
linked message corrections, staff resolution, customer reopen and terminal
cancellation. Authorization precedes receipt replay. Request mutation, history,
body-free audit and retry receipt share the transaction; reads are owner-filtered
and bounded. The existing transaction, write-protection and identity seams are
reused. Fixture principals are synthetic; this is not real private authentication.

The initial review found that completed upstream failures could expose arbitrary
error content through the proxy. The scoped repair validates exact error
status/code pairs and returns a safe unavailable response for malformed failures.
The original finding and its closure are retained in `task2-review.json` and
`task2-re-review.json`; no unresolved finding is deferred.

Fresh independent QA passed 147 cases: 56 runtime, 38 compilation/transport,
46 contract and 7 export cases. Compiler no-emit typechecking passed. An isolated
QA comparator proved current derivation and immutable Published input output
equality for all twelve historical physical definitions. It read the original
capture and wrote only QA-owned output. The writer's earlier build and unaffected
evidence were retained; they are not represented as new QA executions.

The original final five-source repair manifest SHA-256 is
`ed5e77ddb7b268ff48142423bb8f7a32350e6f84b5736761b7a718663c7a1fcb`.
Portable manifest values are in `task2-source-manifest.json`; QA and final
judgment are in `task2-qa.json` and `task2-final-source-judgment.json`.
The complete generated method/roster/response handoff remains at
`generated/.customer-requests-task2/task-2-report.md`, SHA-256
`952087b02ded9b729f68ee716c5d8137a2b74befae4ae22c584983d17001dd9f`.
Portable JSON formatting does not change its recorded source identities.

Controller delivery is commit `f003e12a04ce8ca7874426e0d25c0020a3c1286f`.
[CI run 35984013856](https://github.com/ZP151/archeform/actions/runs/35984013856)
passes both Node 22.11.0 and 22.x jobs at that exact revision. The retained watch
exits 0 and a fresh run read confirms both conclusions. This evidence does not
cover later uncommitted presentation/verifier work.

These tests execute emitted modules with memory or substituted Prisma/fetch
adapters. Actual PostgreSQL races, restart, rollback and faults, complete customer
journeys, visually inspected generated UI, consumer effort and hosted upgrades
remain unverified. No service/startup, cloud deployment, main integration or
repository release is accepted. Delivered product counts are unchanged.
