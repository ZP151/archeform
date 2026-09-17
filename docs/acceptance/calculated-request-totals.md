# Calculated request totals: shared capability acceptance

Status: accepted. Implementation, actual PostgreSQL/correction journey, responsive
UI and the complete shared gate pass. Integrated task review, independent Terra
QA and independent Sol release review report P0/P1/P2 0/0/0. PM accepts the bounded
shared capability; the controller owns normal branch delivery.
No seventh product is admitted by this capability change.

## Supported behavior and authority

Accepted ADR-0070 defines a closed quantity-times-unit-price field descriptor,
exact decimal multiplication, explicit operand domains and a server-owned total.
The independent standing reviewer approved exact proposal SHA-256
`38554faa5533b94dd61ac832947bd19f646219959f218d75e36fe733a4e3fc88`, with
P0/P1/P2 0/0/0; PM recorded acceptance before source work.

The descriptor survives Blueprint, Graph, canonicalization, reviewed definition
selection, provider validation, composition, immutable compilation and generated
verification. Unsupported profiles, targets and untrusted AI Graph diffs fail
closed. The initial profile has one integer quantity, one decimal unit price,
one decimal output and one unambiguous business identity. No required date or
category is invented. Existing optional nonnumeric details remain available.

The generated server rejects caller-supplied totals, validates decoded numeric
primitives, merges partial corrections, derives the total and writes one coherent
record inside the existing transaction. Trusted persisted decimals are checked
before lossy conversion. Reads, transitions and receipt replay reject inconsistent
triples. An authorized correction can repair an invalid old total; an invalid
retained operand must be replaced. The original validated response remains the
response to a retry after later edits. No currency, rounding, tax, payment or
arbitrary expression semantics are introduced.

The UI reuses the accepted Approval workspace, native inputs, cards, summary
slots, icons, media and recovery states. A labelled native output previews the
total from its two operands and never becomes a submitted input. Identity v3
projects quantity, unit price and total into cards and matched decision history.
No product-specific branch or new third-party asset is introduced.

## Compatibility and focused checks

The new six-definition current-byte snapshot was captured before production
changes at base `436484fc71f63adf11e8f48938bc5983ac42ca41`. Its SHA-256 remains
`b88e5c9f21907b382d09b877b2208e90aab087b12bd2b365d7aa94cf48ec62e8`.
All 15 compatibility cases pass, retaining the original four/five snapshots and
their bounded physical-identifier inverse. Existing bundles add no calculation
metadata, helpers or whitespace. The independent catalogue CLI passes all 16
cases against the same six-row data digest.

Task 1 focused checks pass: Graph 283, adapters 205 and composer 23. Relevant
builds, typechecks and formatting pass. Compiler checks pass 20 calculated cases,
the protected compatibility cases and unchanged numeric/correction/identity
coverage. Worker checks pass 44 cases across four files, including actual emitted
commands driven through the bounded prerequisite/correction/replay probe executor.
That probe uses the first complete coherent seed row, omits output fields and
rejects unsupported or invalid immutable inputs instead of downgrading them.

One pre-existing verification gap was repaired: the independent catalogue CLI
still expected five entries after Training was admitted. Its exact membership
check now includes Training. The stale check was reproduced RED before the
16-case GREEN run. Current membership does not replace independent old snapshots.

## Actual-runtime failures and repairs

The first 67-file generated fixture built successfully, then failed on its first
valid PostgreSQL partial correction. Prisma wrote numeric `0.07` as decimal
`0.07000000000000001`; the exact total was `0.21`. Post-write validation correctly
rejected the inconsistent row and rolled back. A root-owned transaction reproduced
the serialization behavior and deliberately rolled back without committed changes.

The repair sends canonical decimal strings to Prisma for calculated price/total
create, update and conditional-update writes. The independent reviewer identified
the same seed-upsert path, which now applies the same calculated-only boundary.
Request inputs remain number primitives; quantities remain integers; database
types and old definition output stay unchanged. Both emitted persistence-boundary
regressions were observed RED then GREEN. The scoped independent review closes
the source finding with no new issues, pending actual acceptance.

The replacement fixture uses an explicit coherent `3 / 0.07 / 0.21` seed and
Graph hash `sha256:3ed63637a82a0324d3942302bb0e384c8bb15445cd7b4a73a078fb0fb60232e9`.
Its 67 files reproduce deterministically. Actual attempt 2 passed the database
assertions through restart, including a real post-write rollback injection, then
stopped on a browser-test expectation: integer zero is blocked by native minimum
validation, so a custom form alert is not rendered. The test now explicitly
asserts native quantity range validation and uses decimal zero for the existing
custom-error/no-fetch helper. This correction changes no production source.

Full-gate attempt 1 stopped on formatting in four existing JSON evidence receipts.
Formatting was repaired without changing receipt values; parsed values were
independently compared to HEAD for all four receipts. Actual attempt 3 passed
the complete database and browser correction journey. The final corrected record
has quantity 5, price 149.5 and total 747.5, version 7, two decisions and eight
audits. Alternate seed precision, forged/invalid inputs, role/state denial,
partial correction, corrupted precision, retained-operand repair, post-write
all-table rollback, races, original receipt replay and restart persistence pass.

Visual inspection found a separate usability gap: inherited summary styling hid
quantity/price/total labels. A failing computed-style check reproduced it. The
calculated profile now shows those labels, emphasizes the total and uses concise
"Calculated preview" copy. Final actual checks pass at 390/768/1440 in light and
dark mode and for operand-only forms. Phone summaries/forms and desktop dark
screenshots were visually inspected. The new checklist requires visible numeric
meaning, not merely values present in the DOM.

The final generated manifest reproduces all 67 files and six actual container
source hashes match. Only `web/app/page-runtime.tsx` and `web/app/globals.css`
changed after database acceptance; API, exact arithmetic and seeds remain byte
identical, so the database evidence remains valid. Final presentation evidence
supersedes the earlier unlabelled screenshots for visual acceptance.

Fresh complete gates pass: format (46,664 ms), lint (16,262 ms), typecheck
(41,044 ms), tests (443,372 ms; 29 Turbo tasks) and build (79,635 ms; 17 tasks).
The UI repair occurred after broad test collection; its final 20 calculated and
15 compatibility checks plus actual presentation verification cover the change.
Both exact owned fixture projects have zero containers, networks and volumes.

Evidence: [database and correction](evidence/calculated-request-totals/runtime/),
[final presentation](evidence/calculated-request-totals/presentation/presentation.json),
[source correspondence](evidence/calculated-request-totals/final-source-runtime.json)
and [cleanup](evidence/calculated-request-totals/cleanup.json).

## Required final evidence

- [x] Fresh complete PostgreSQL/browser journey and responsive screenshots.
- [x] Exact alternate seed, partial corrections, forged values, precision
      corruption, all-table rollback, race/retry and restart evidence.
- [x] Runtime source and generated manifest comparison; exact resource cleanup.
- [x] Full shared gate and final task review, independent Terra QA and Sol release
      review, with only affected checks repeated for repairs.
- [x] PM acceptance; normal branch delivery and remote equality precede Equipment data admission.

This authored runtime fixture adds no registered product and does not establish
consumer intake, real-model selection, ordinary-user results, production identity
or cloud hosting. Equipment must pass its separate actual consumer admission.

Independent Terra QA ran Graph 26, provider 7, compiler 20, worker 12 and
compatibility 15 cases. Sol release independently ran Graph 225, provider 7,
compiler/compatibility 35 and worker 12 cases, regenerated the exact 67-file
manifest and checked cleanup. Both verdicts pass without open findings.

Equipment subsequently exposed complete-workspace density gaps with visible
multi-numeric labels. The focused shared CSS repair preserves API/seed output,
all six older bundles, readable labels and 44px controls; the complete multi-record
browser regression and actual consumer attempt4 pass. See
[Equipment acceptance](equipment-procurement.md) for this ordinary repair and
its retained failures. The original shared arithmetic/transaction verdict stands.
