# Reusable numeric domains acceptance

Status: accepted and delivered at `9eabe817`, with remote equality verified.
Integrated task review, independent Terra QA and Sol release review pass after
the exact Decimal correction; final P0/P1/P2 are 0/0/0. Final-source runtime
comparison passes. No sixth definition was registered in this capability task.

## Accepted contract and scope

ADR-0069 exact SHA-256
`9a3ab7bc033e78584f8c60876ec54c3813b3019e4074b0156d1a7f9b704d6350`
was accepted through the existing standing authority before implementation.
Numeric fields may carry explicit finite lower/upper bounds. Policy-bearing
integers use Int32; decimals preserve the existing database type and do not infer
currency scale or positivity. Absence preserves old output. Only the approved
Approval correction profile supports this first numeric capability.

The five existing product definitions remain the coverage baseline. This task
uses a first-party authored numeric fixture derived from the existing Approval
family, with course title, positive fee, session date and justification. It is
not a registered Training product and does not establish consumer selection.

## Focused implementation evidence

Graph Task 1: 781 tests in 22 files pass; build, typecheck and lint pass. Independent
task review found and then confirmed the repair for optional omitted fields named
constructor/toString. Final Task 1 review has P0/P1/P2 0/0/0. Frozen Task 2 full
suites pass: adapters 233, capabilities 412, compiler 862 (49 files, including all
five protected compatibility cases), worker 320. All four package builds,
typechecks and lint pass. The numeric compiler suite passes 47 focused cases.
The initial over-strict composer gate rejected Standard planning while deriving
Minimal alternatives; focused RED/GREEN moved lock enforcement to actual
composition. The failed full runs are retained in the task report separately.

## Actual Prisma and browser fixture

The generated 63-file fixture runs its unchanged generated Compose topology with
PostgreSQL 16, pinned Prisma, API and web. Task-owned loopback ports are 13021 and 15181. It uses local demo roles and no model/provider calls. The fixture input and
artifact manifest are retained in the ignored task workspace for final comparison.

Actual Playwright final attempt 5 passes 1/1 in 34.5 seconds against
`factory-preview-numeric-runtime-20260917`:

- Nine invalid create cases, including zero, negative, wrong JSON types and a
  nonfinite parsed number, return 400 with unchanged records, receipts and audit.
- Five invalid updates preserve the entire persisted snapshot.
- A positive 0.0000001 decimal survives actual persistence and create replay.
- A deliberately invalid stored fee prevents submit without side effects;
  a valid API correction recovers the record.
- A disallowed workflow state returns 403 before validation of a deliberately
  invalid stored fee, preserving authorization ordering without side effects.
- Invalid browser create and edit values issue zero mutation requests.
- Return/correct/resubmit/approve reaches version 7, two decisions and eight
  audit events; lost-response replay, API restart, conflicting writes, wrong-role
  and submitted-state denial preserve the established correction behavior.
- Actual 390/768/1440 screens preserve the approved cobalt/photo/icon presentation,
  with fee and session date in the summary. Root inspected 390px summary and
  invalid-edit screenshots. Independent QA inspected all three responsive sizes.

See [numeric runtime receipt](evidence/numeric-field-domains/runtime/numeric-runtime.json)
and [correction receipt](evidence/numeric-field-domains/runtime/correction-journey.json).
This fixture's runtime duration is not time from a consumer prompt to a ready app.

Attempt 3 also passed, then final source changed generated API and web files.
Root regenerated and rebuilt the owned fixture and reran the affected actual
journey as attempt 4 (34.8 seconds). The precision correction below required a
new API build and final attempt 5; the generated web source stayed identical.
Final-source regeneration matches all 63 files in the
retained build manifest. Source hashes read inside the actual API and web
containers match those files; see [source receipt](evidence/numeric-field-domains/final-source-runtime.json).

Earlier attempts remain distinct: attempt 1 stopped on an ambiguous test selector
matching Next's route announcer; attempt 2 stopped on the existing test helper's
exact preview-project naming guard. Root scoped the selector and recreated only
the owned fixture under the required preview prefix. Neither required product
source changes. The prior owned project was stopped with its fixture data.

## Final acceptance and handoff

Release review identified one P1: converting a trusted persisted Decimal through
JavaScript Number before validating its domain could admit an exact out-of-range
value. Exact sign/significand/exponent comparison now precedes that conversion;
trusted Decimal bounds are not rechecked against the rounded response projection.
Request primitives and integer checks remain unchanged. Existing JSON response
projection can still round; this is not an arbitrary-precision currency API.

Focused RED reproduced six invalid bounds being accepted and three valid values
inside exclusive bounds being denied. Corrected tests pass 90/90: 76 numeric
cases and 14 original-definition compatibility cases. Compiler build, typecheck
and affected formatting pass. Existing full-suite evidence is retained for
unchanged paths.

A separate actual PostgreSQL fixture with inclusive bounds 1 and 125.5 rejects
stored values 0.99999999999999999 and 125.50000000000000001. Each denial preserves
exact stored state, version, audit and receipts. Correcting to 125.5 allows the
same previously denied command key; replay has no side effects. This test passes
in 2.5 seconds; together with attempt 5, the final actual run passes 2/2 in 35.8
seconds. See [precision receipt](evidence/numeric-field-domains/decimal-precision-runtime.json)
and [precision source identity](evidence/numeric-field-domains/precision-source-runtime.json).
All 63 regenerated files match the precision fixture build manifest and its
actual API source hash matches. No generated schema or database type changed.

Integrated task review is approved and ready for QA. Its one documentation P2
(stale attempt-3 wording) is reconciled above. Independent Terra QA passes with
P0/P1/P2/P3 0/0/0/0, independently running Graph 236, adapters 166, capabilities
18, compiler 47 and worker 1 focused tests and inspecting final receipts and
390/768/1440 images. All three exact owned fixture projects have zero remaining
containers, networks or volumes; see [cleanup](evidence/numeric-field-domains/runtime-cleanup.json).

The narrow independent Terra correction QA passes 90 fresh tests; Sol closes the
original P1 with P0/P1/P2 0/0/0. PM accepts this bounded shared capability for
normal commit/push. Admit Training through a
separate definition-data change and full consumer journey. No hosted identity,
ordinary-user result, real-model selection or cloud deployment is claimed.
