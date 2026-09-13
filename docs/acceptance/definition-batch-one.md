# Representative definition batch one

Status: accepted for bounded local delivery after actual acceptance and one
independent review; in-scope P0/P1/P2: 0/0/0.
Base: `327eb9086ff79f521e87e4db072120763b95b3e5`.
Authority: user-requested roadmap expansion; ADR-0065 data/family authority and
accepted ADR-0066 shared presentation correction (exact decision in the PM ledger).

## Candidate decisions

These six authored roadmap briefs were reviewed for business support. This is
not a six-entry JSON validator execution or model classification benchmark.
Only Publication was authored as a new catalogue row in this batch;
unwritten candidates have no claimed strict-schema result or runtime pass.

| Candidate                 | Business distinction                                          | Current disposition                                                                                               |
| ------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Publication Review        | Title/body/channel reviewed, returned, corrected and approved | Fifth data row; actual journey passed with one shared presentation extension                                      |
| Training Funding Approval | Course/session/fee and justification                          | Blocked: currency permits any finite number; a positive-cost domain is missing                                    |
| Equipment Requisition     | Positive quantity, unit cost and calculated total             | Blocked: quantity/range and arithmetic invariants are missing; a pure Purchase rename is only a duplicate control |
| Travel Authorization      | Ordered trip interval and budget                              | Blocked: typed dates do not enforce ordering or declared budget rules                                             |
| Leave Request             | Interval, overlap and available allowance                     | Blocked: interval ordering, cross-record overlap and entitlement rules                                            |
| Access Request            | Requested authority and actual provisioning result            | Blocked: real identity/resource authority and provisioning integration                                            |

The next reusable extension should address numeric domains first: the same gap
blocks both Training and Equipment. Calculations, date intervals and identity
remain separate contracts. A later Tech Lead decision must define their Graph,
runtime and verification semantics before implementation. No demand is silently
removed to inflate supported-product counts.

## Collection regression

Before new runtime services, both Playwright configurations failed collection
with `exports is not defined in ES module scope`. The package resolves to the
built `packages/adapters/dist/index.js` (source-map stacks named TypeScript);
native Node loading succeeds. Playwright's CommonJS require transform rewrote
the symlinked workspace ESM dependency while retaining `import.meta`, producing
an invalid mixed module. This was a test-loader failure, not missing UI assets.

Both test configurations now exclude built workspace package `dist` files from
transformation. Native ESM loading preserves the shipped fixed JSON path. Fresh
collection passes: three actual root product lanes and twenty Workbench cases.
Production module format, dependencies and the accepted data loader are unchanged.
Package builds must precede acceptance so tests consume current built data.

## Required acceptance evidence

The new definition reuses the approved Approval shell and correction behavior.
Evidence records actual generated business actions, immutable compilation,
responsive screenshots, runtime identity and exact cleanup. Provider responses
are authored fixtures; zero provider calls and zero ordinary-user sessions.
External publishing, scheduling, media storage and private identity are excluded.
Approval means a recorded editorial decision, not publication to any channel.

### Actual presentation finding

The first real runtime reached immutable compile/verification/Preview but its
record card had no visible business identity or channel. The existing selector
only promotes Expense/Purchase fields. Before-image facts and screenshots are
retained in `evidence/definition-batch-one/before-summary-fix/`. The hero, styling,
icons and navigation loaded correctly. No record photo is required by this
product design; the inherited photo assertion is being aligned with that scope.

The missing identity was corrected through the shared, structurally selected
record title/summary/history projection under accepted ADR-0066. The repair
reuses current components and styles, preserves the original four emitted
bundles, and adds no Publication-specific compiler branch. Merely showing data
inside collapsed Details does not satisfy visible identity acceptance.

### Shared correction and repeatable acceptance

The generic profile is now emitted only after the exact correction selector
identifies one eligible entity with one required short-string business title.
One immutable projection supplies that title and at most two declared enum
summaries to both cards and decision history. Long text stays in Details.
The original four bundles remain byte-identical. The complete compiler suite
passes 776 tests across 48 files, including 12 executable generic identity cases.
Compiler typecheck, build and formatting pass. The design detector reported only
the unchanged baseline Inter font; this does not justify changing approved UI.

Actual attempt 2 stopped before Publish because the acceptance fixture reused
attempt 1's already-applied requirement ID. The safe diagnostic records HTTP 200
for interpretation and HTTP 409 for requirement creation, with no page error.
The test now uses an independent requirement identity per run while retaining
the same identity throughout one logical run. This is test isolation, with no
change to production conflict or lifecycle behavior. The failed log is retained.
Final acceptance also covers the image-disabled fallback explicitly; optional
record photographs must not weaken title/channel/status/action visibility.

Attempt 3 passed requirement creation, Publish and compilation, then stopped at
generated Prisma validation. Rebuilding the same immutable artifacts reproduced
four P1012 errors: the long fixture ID caused the generated Principal/Session
primary-key and index names to truncate to identical PostgreSQL identifiers.
The fixture now uses `batch-${randomUUID()}` once per run, retaining uniqueness
with a shorter prefix. This does not repair arbitrary long application IDs.
The existing compiler namespace-length limitation is tracked before broad batch
scale; no Graph, database or historical output contract was changed in this
presentation slice. The failed run and its successful cleanup remain evidence.

Attempt 4 passed the real correction journey: the same record reached version 7
and Approved, retained two decisions/eight audit events, and passed lost-response
replay, API restart, concurrent-edit/write and role/state denials. Both authored
records and their decision summaries were visibly distinct. A remaining test
setup error applied the initial-list viewport assertion while history was open
above the list. The helper now checks unchanged initial density with history
collapsed, then opens history for separate identity assertions and screenshots.
The complete failed attempt's 29 files are preserved in `evidence/definition-batch-one/attempt4/`.

## Final actual result

Attempt 5 passes: one test in 4.3 minutes. The prepared local app became ready
in 191,368 ms through one authored interpretation and one automatic
Publish -> Compile -> Verify -> Preview sequence. Compilation
`cmtzswgoo006yo255vft4jnfo` and its artifact fingerprint remained immutable
throughout the business journey. This is one local sample, not a cold-start,
real-model, ordinary-user or hosted-production performance benchmark.

Two separately authored submissions reached Approved with distinct titles and
blog/newsletter channels. The corrected first record retained version 7, two
decisions and eight audit events. Native/API required-field and enum validation,
auditor mutation denial, submitted-state edit denial, response-loss replay after
API restart, return retry, concurrent edit/write rejection and persisted reload
pass. Content body and editorial notes remain readable in Details.

Final evidence contains 37 actual PNGs across 390/768/1440, including correction,
retry/conflict, two-record lists, matched decision history, dark presentation and
broken-hero fallback. Stylesheets, icons, tokens, focus, touch targets, contrast,
non-overlap and initial list density pass; opening history is tested separately.
The same shared regression helper is available for later Approval definitions.

The [final log](evidence/definition-batch-one/e2e-attempt5.log),
[checks](evidence/definition-batch-one/checks.json),
[runtime identity](evidence/definition-batch-one/runtime-identity.json) and
[cleanup](evidence/definition-batch-one/cleanup.json) retain reproducible facts.
The [independent review](evidence/definition-batch-one/independent-review.md)
passes, including personal inspection of 22 representative final screenshots.
The [product scorecard](evidence/definition-batch-one/product-scorecard.json)
separates definitions, shared changes, actual runs and unproven outcomes.
All four task Preview rows are stopped. Ten exact Factory, Preview, verifier and
build-diagnostic projects have zero containers, networks and volumes.

The batch adds one definition, zero per-product execution/UI branches, zero
dependencies/assets and one shared presentation extension. Coverage is five
registered definitions over three demonstrated runtime families. General long-ID
database naming, numeric domains, calculated totals, date relationships,
identity/provisioning and hosted delivery remain explicit future work.
