# Reusable Definition Bank Acceptance

Status: **accepted for the canonical local demo**. Independent
`/root/d24_review` reports P0/P1/P2 `0/0/0` and
`APPROVED_FOR_LOCAL_ACCEPTANCE: yes`; root accepts B1 for controller delivery.

## Intended outcome and targets

Under accepted ADR-0054, the consumer interpreter selects a private reviewed
definition; the bank projects complete business semantics for deterministic
planning, composition and immutable compilation. Purchase Request is a third
definition within the existing approval runtime family. It is a one-stage local
demo, with requester, manager and procurement roles. It ends at a recorded
decision, without ordering, payments or authenticated private records.

Predeclared targets for the prepared local Factory: one Create product action,
zero material questions for supported canonical intent, zero technical handoffs,
zero manual repair during a successful consumer run, and usable Preview within
five minutes after that action. Measure actual time; this is a local experiment
target, not an SLA or model-latency claim. Infrastructure image preparation is
reported separately. Two UI requests must complete opposite manager decisions
and retain them after reload. First useful mobile action must be visible within
a 390 x 900 viewport on the initial single-record list.

## Applicable acceptance matrix

| Dimension                | Concrete case and expected outcome                                                                                  | Evidence / result                                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Need fidelity            | Exact registered semantics and preserved Restaurant/Expense outputs; privacy remains material.                      | **Pass**: adapter and Workbench regressions. Real-model classification is deferred.                                                                          |
| User effort              | Automatic standard composition and immutable delivery without manual lifecycle choices.                             | **Pass for fixture lane**: 155561 ms ready; one interpretation, zero questions/handoffs/rescue in the successful run.                                        |
| Complete journey         | Two UI requests, opposite manager decisions, procurement read/audit and retained results after reload.              | **Pass**: actual generated application and API. Audit API is not an audit browser UI.                                                                        |
| Business/access          | Exact six values, typed amount/date, required fields, wrong-role and terminal-state denial.                         | **Pass**: real create/transition/read results; requester decision/audit and repeated terminal decision return 403. Demo roles do not prove identity/privacy. |
| Interaction states       | Loading/disabled, safe error, empty/create, populated, form success and state-valid actions.                        | **Pass**: actual browser with injected read transport states, then restoration of all three real rows. Unchanged form/mutation regression is reused.         |
| Visual quality           | Item leads; Amount/Status and Needed by are readable; icons load and Details is secondary.                          | **Pass**: four actual images independently inspected, then matched byte-for-byte to final run. Decorative photos are not relevant here.                      |
| Responsive/accessibility | Readable roles/cards, keyboard Details, current navigation, mobile targets, no document overflow or axe violations. | **Pass**: all three roles at 390/768/1440; mobile controls >=44 px. Physical-phone usability is deferred.                                                    |
| Delivery/recovery        | Immutable compilation/verification/Preview, retained records and exact runtime teardown.                            | **Pass locally**: final successful lane and zero resources for Factory/all four Preview projects. Hosted operation remains H1.                               |

## Implementation verification

Base: `3337f390856c9cea6493890d4749749a9167474f`, branch
`codex/consumer-delivery-roadmap`. The active ledger records independent standing
acceptance of amended ADR-0054
`1f1c4c63a44a53b884428941bf754a0b93c7cabc0b80fb9fa9ae02363a3814a0`.

| Check                 | Result                                                                                                                                                                  |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Adapter focused RED   | Registered Purchase initially rejected with `requirement.output_invalid`.                                                                                               |
| Adapter full tests    | 184/184 across 11 files; later strengthened follow-up-context subset 8/8.                                                                                               |
| Compiler focused RED  | Missing Item heading reproduced; unrelated preceding test-helper error is excluded from RED evidence.                                                                   |
| Compiler full tests   | 662/662 across 39 files, including emitted Purchase strict TypeScript.                                                                                                  |
| Responsive repair     | One conditional native-select 10 rem rule: focused RED then 4/4 GREEN, including old ordered bundle hashes and title/date behavior. Reuse unaffected 662-test evidence. |
| Package checks        | Adapter/compiler typecheck, build and exact formatting passed; corrected compiler rechecked.                                                                            |
| Workbench integration | 14/14 affected consumer-generation tests and typecheck passed.                                                                                                          |
| Harness               | Playwright lists one Purchase lane; exact business values, allowed/denied actions, known navigation and all three roles at all three widths are asserted.               |

Final compiler source SHA-256:
`5202c72ce443901c65f85f49b5ef4515c61ad7502facebe177cc299debc6100e`.
Compiler test: `0a940c2c9a2d668c1e9bf3082b796fa66794db46c96a185fc49b6742c326f20d`.
Root E2E: `7d5cb42c18dd32c1066a52c46e6ae14170d42f846685d6a8b491beb4591505ee`.

The ordered Expense bundle remains
`4aa544c03beb9a9f61e10b3b5252a255e0c397411f5d887e4435a34979537332`;
Restaurant, Appointment and non-approval baseline hashes also remain exact.
Canonical Expense and Restaurant interpretation hashes remain unchanged.

First runtime reached immutable delivery and the two opposing manager decisions,
then failed at the 768 px procurement text-fit assertion. The 90 px available
text area was 1.34 px short of the measured label under a conservative arrow
reserve. The conditional 10 rem rule provides 118 px with unchanged mobile
flex sizing. This is a measured sizing-margin defect, not visually proven
clipping. The first preview stopped with zero exact-label resources; its safe
log and form image remain in ignored task `first-pass`. The first confirmation reached ready in
157624 ms and passed repaired role layouts, procurement audit and exact values
after reload. It then exposed a harness-only navigation expectation error:
the unchanged composer excludes form/detail from navigation and adds a
Requester list for the secondary entity. Root corrected the expected array;
no product code changed. That preview also stopped with zero exact resources.
The next lane reached ready in 166939 ms and passed the corrected navigation,
all nine role/viewport checks and four screenshots, then matched Next.js's empty
route announcer as well as the actual service-error alert. Root scoped those
two assertions to the generated application; production source did not change.
That preview also stopped cleanly. The final passing lane remains separate from
these three failed attempts: one product sizing defect and two harness defects.

## Final actual run and images

`pnpm exec playwright test e2e/consumer-purchase-request.spec.ts --workers=1 --retries=0`
passed **1/1** on 2026-09-10. Prepared local Factory
`factory-t9-bank-b1-20260910` used loopback Workbench 15180 / Control Plane 13020,
with model keys empty. Tracked-Dockerfile image preparation succeeded separately
and is excluded from the prepared-run timing. Final compiler image config is
`7fad4fbd13806001b15c3ee0bbbf4067c03bf82d790a188b870a176a52fe98e4`, with matching
source hash. The unchanged Workbench image config is
`6b59aa857d160dcaf739363505f254ad3b7bc0a8ac05b31cc726936d61639c16`.

Final compilation: `cmtugsinf006mpe4t4x5i0ajy`.
Final preview: `preview-67d39d75-e034-4c1c-b563-aab09efe3bf8`.
Ready: **155561 ms**; business and recoverable-state completion: **163345 ms**.
Two requests, one approved/one rejected, retained exact values after reload;
procurement audit API and role/state denials passed. Questions/handoffs/rescue
in this successful run: **0/0/0**. The three earlier repair attempts above remain
part of delivery history, not a claimed first-attempt success rate.

Initial Submit ends at 570/470/470 px for 390/768/1440 widths. All nine
role/viewport layout and axe checks pass; native keyboard Details and 44 px
mobile controls pass. Empty/loading/error were injected only at read transport,
then removed; the actual API restored all three real records. No mutation
response or populated record response was simulated.

| Actual image                                                              | SHA-256                                                            |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [Phone form](evidence/consumer-purchase-request/b1-form-390.png)          | `2b01609c94ba27214a1b2691408c8f02129819983936a81d002c63899f32c23b` |
| [Phone results](evidence/consumer-purchase-request/b1-results-390.png)    | `09554dfe0998cddde96b6de17d2a6bd158362d474036e418c5dd6a651621c7e7` |
| [Tablet results](evidence/consumer-purchase-request/b1-results-768.png)   | `faee45d5da90941fca479475b3a3ec3aeb3fd7e5e170d80450259d4c0467b918` |
| [Desktop results](evidence/consumer-purchase-request/b1-results-1440.png) | `ab26c4f67011424f99c5c7b3568174701208b80388e98d0889ed52810fc830fb` |

Root and the independent reviewer inspected this exact image batch. Final-run
hashes match it byte-for-byte. Item titles wrap cleanly, task values and textual
status are visible, icons load, Details stays secondary, mobile stacks cards
and desktop uses two columns. The navigation uses deliberate internal horizontal
scrolling at narrow widths, without document overflow. The form fits readable
label/control spacing and a clear Create action; long native input values remain
editable through the input's own horizontal scrolling.

After exact Preview stop and Factory `down -v`, explicit Docker label queries
found zero containers (including stopped), networks and volumes for the Factory
and all four Preview projects. Unrelated resources were not removed. No provider,
cloud deployment or repository release occurred.

## Evidence boundaries and next product work

The interpreter fixture passes an authored compact selection through the actual
provider adapter parser and bank. It makes no model/network call and cannot
prove coarse-intent classification accuracy, token reduction, ordinary-user
effort improvement or real-phone usability. Those remain separate D2.5/B3
measurements. It does prove selection-to-assembly integration when the remaining
lifecycle and business actions run on the actual generated application.

Real identity, requester-only rows, hosting and operational recovery remain H1.
Private audit API access is tested only under fixture role selection; no audit
browser is delivered. Orders, supplier management, budget thresholds, multi-level
review, file storage and payment remain material exclusions. Existing server
validation and authorization are retained; UI hiding never substitutes for them.

Material candidates and licensing constraints are in the
[supply research](../research/2026-09-10-reusable-assembly-supply.md). B2 admits a
small reusable asset against a concrete screen gap; B3 expands business
families with complete journeys; B4 grows retrieval-backed definitions. Neither
source discovery nor styling permutations count as validated applications.
