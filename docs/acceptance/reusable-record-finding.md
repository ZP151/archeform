# B2 Reusable Record Finding Acceptance

Prepared: 2026-09-11. Status: business functionality verified; visual acceptance
withdrawn following the founder's repeated rejection on 2026-09-11.

The historical results below describe the B2 commit and the internal review at
that time. They do not establish current visual acceptance. See the
[shared workspace repair](approval-workspace-repair.md) for the reproduced cause,
rejected presentation, stronger observable targets and replacement evidence.

The [plan](../superpowers/plans/2026-09-11-reusable-record-finding.md) fixes the
product outcome and all eight acceptance dimensions before implementation.
B2 serves requesters and reviewers locating existing Expense/Purchase records.
It keeps the accepted one-stage business semantics, demo roles and local-only
delivery boundary. It adds no business definition or runtime family.

## Required evidence

- Same shared interaction emitted for Expense and Purchase; non-approval bundle
  preservation, generated TypeScript verification and affected compiler tests.
- Declared-field search, case/whitespace normalization, conjunctive workflow
  status filtering, result count and one-action reset; undeclared data is not
  searchable. Stable status choices must survive zero matching rows.
- Actual Purchase create/submit/approve/reject with filtered actions and visible
  outcome feedback, persisted exact values after reload, existing role/state
  denial and audit API checks.
- Search no-match recovery distinct from database-empty, safe loading/service
  recovery, and keyboard/label/touch behavior for the changed controls.
- Actual generated phone search/results and no-match screens, tablet and desktop
  screenshots, visually inspected for hierarchy, useful icons, clipping, layout
  and reachable actions. All widths 390/768/1440 pass relevant layout and axe.
- Prepared local deterministic selection ready within 300000 ms, no questions,
  technical handoffs or in-run rescue. Find a known record in two input changes
  and restore results in one clear action. Record actual metrics and failures;
  these are scenario targets, not model quality or ordinary-user evidence.
- Bind final sources, runtime image and immutable Compilation; exact Factory
  and Preview resources removed, one independent review and branch delivery.

## Explicit limits and reused evidence

The filtering is local to the existing authorized API result set; it does not
provide server search, pagination or a large-data performance promise. Demo role
selection is not real identity or requester isolation. H1 hosted identity/access
and D2.5 real-model/ordinary-user validation remain open. No dependency or media
source is counted as admitted merely because it appears in desk research.

Reuse B1's unchanged interpretation/unsupported-intent, field validation and
business-definition evidence. Actual affected list, actions, recovery and visual
states receive fresh evidence. Do not duplicate unrelated family/full-provider
checks or introduce another audit stage.

## Implementation and verification

ADR-0055 was independently accepted under the founder's standing policy at
SHA-256 `fb0fa42d1d88cfad61b19a16b1ecbcd89980ba537f5fa0ebb6a52279702c9c22`.
The existing compiler approval-card renderer now composes search, status,
clear/count/no-match and surviving action feedback. No package, source, media,
public registry asset, definition or runtime family was added. Both Expense and
Purchase use the same implementation. Workflow options come from the unique
structural approval flow's declared states; other capability-effect flows can
share the entity and are not used as status sources.

The change also invalidates pending callbacks across role/entity/block changes,
including role A -> B -> A and unmount. Each pending operation captures its own
set so an old completion cannot release a newer operation's duplicate lock.
An executed emitted-component test reproduced an extra stale fetch when the
guards were deliberately removed, then passed with them restored.

| Verification                  | Result                                                                                                                  |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Focused emitted-runtime tests | 28/28, including Expense and Purchase generated TypeScript checks                                                       |
| Full compiler suite           | 39 files, 665/665, 252.14 seconds; one run, recovered live process monitoring                                           |
| Compiler typecheck/build/lint | Pass                                                                                                                    |
| E2E parsing/format            | Pass; actual confirmation is recorded separately below                                                                  |
| Legacy/Restaurant output      | Existing ordered byte snapshots unchanged                                                                               |
| Expense output                | Intentionally updated B2 deterministic bundle digest `96e531eb1db10f96dcaeaf65a046e6a4dd13eb291c4f73e06a6be5e6db80372e` |
| Source review                 | No actionable production findings; two E2E coverage gaps corrected in the same review                                   |

Runtime build uses the unchanged tracked compiler-worker Dockerfile. New image
manifest/index is `cdc2a0dca64e98182650aa22617240655c3e03e997c0e5f855218af3a707f4aa`,
config `f727db3a9b347e67b6883359803447cdf168d9d1ef0c6991429e5fecfe77170a`.
Running compiler source matches
`91a09198dc1a89b90053dcb5633679c52f789fd4c261b384ddbb47572375dc69`;
compiler test hash is
`a484bcae3c8aea5a7bd02b0a8ef5e213f20a3cf25378217860c8f1f0b3392eb0`.
Reused Workbench provider-interpreter source matches the accepted B1 hash
`de82747547f98bcea385e2639e0e3f151e21550755372b8e36acd8a5a6e1c420`.
Both Workbench and Control Plane model-key presence checks are false, and both
HTTP readiness checks pass. Only the authored interpretation is substituted;
all later business and immutable-delivery behavior is real.

## Actual runtime attempts

First attempt: Compilation `cmtvre5j2000dnx4tv0j6ff9q` reached ready in
189510 ms and failed at 224293 ms during the manager-decision test. The first
Submit action ended at 771/592/592 px for 390/768/1440, and manager layout/axe
passed at all widths. The failure was an exact-label test locator: a native
nested label contains option text in Playwright's label-text lookup, while its
computed accessible combobox name is correctly `Status filter`. A minimal
Chromium reproduction found exact-label count 0 and exact-role/name count 1.
Root corrected only the E2E locator to the exact accessible combobox role/name;
product source, native labels and images are unchanged. This attempt is not
counted as accepted. Its log and first form PNG remain in ignored task evidence.
Preview `preview-2ba113bf-1d28-4895-8dba-310afa799e09` stopped with zero exact-label
containers, networks and volumes.

Confirmation E2E source hash:
`8c2b0143f85c68dc66c323fda0528efb685872bd848ffc57bc2685498828b760`.
The root ledger separately authorizes the fresh provider-free confirmation on
the same isolated Factory `factory-t9-record-b2-20260911`; this does not add a
cloud/provider/release authority or an extra audit stage.

Confirmation: **1/1 passed, exit 0, zero runner retries**. Compilation
`cmtvrlwme002gnx4t04tnf7q7` reached ready in **177061 ms** and completed the
business/finder/recovery checks in **187601 ms**. Questions, technical handoffs
and in-run rescue were **0/0/0**; the earlier failed harness attempt remains
separate. Two input changes found the known request; one clear action restored
all three records. These are prepared local deterministic-selection results,
not a model-classification benchmark, physical-phone trial or usability study.

| Consumer dimension | Final evidence and disposition                                                                                                                                                                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Need fidelity      | Pass for unchanged supported Purchase/Expense semantics; both compile the shared behavior. Reuse B1 material-clarification and unsupported-intent evidence because interpretation is unchanged.                                                                                                         |
| Effort             | Pass against the declared local target: 177061 ms ready, no questions/handoffs/rescue in the confirmation, two-input find and one-action clear. Real-user effort measurement remains deferred to D2.5.                                                                                                  |
| Complete business  | Pass: two real UI requests, submit, manager approve/reject while filtered, disappearing terminal row with surviving success, exact field values after reload, procurement audit API and working navigation.                                                                                             |
| Correctness/access | Pass: requester decision/audit 403, repeated terminal transition 403, declared scalar-only and conjunctive filtering, generation invalidation, old pending-lock isolation. Delayed role-bound read shows no former-view records. Demo roles do not establish private identity.                          |
| Interaction states | Pass for affected populated/no-match/reset/loading/503/empty and recovery. Real filtered success survives disappearance; focused callback/pending-lock checks pass. Reuse unchanged typed form validation, policy/read-denial and safe error mapping evidence; no new approval or validation semantics. |
| Visual             | Pass for the bounded business UI: root and the independent reviewer inspected all six actual images. Useful title/amount/status/icons and Details remain visible, finder controls are compact, and clear/count/no-match are readable. Empty no-match space is intentional.                              |
| Responsive/access  | Pass: all three roles at 390/768/1440 plus phone search/no-match, no overflow or axe violations, 44 px phone controls and keyboard clear/Details. Initial Submit ends at 771/592/592 px. This is viewport evidence, not physical-device testing.                                                        |
| Delivery/recovery  | Pass for local immutable delivery and persisted records. Both Preview projects stopped and Factory down-v succeeded; exact-label queries found zero containers including stopped, networks and volumes for all three projects. Hosted/private delivery remains deferred to H1.                          |

## Visually inspected evidence

| Image                                                                           | SHA-256                                                            |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [Phone form](evidence/consumer-record-finding/b2-form-390.png)                  | `2b01609c94ba27214a1b2691408c8f02129819983936a81d002c63899f32c23b` |
| [Phone search result](evidence/consumer-record-finding/b2-search-390.png)       | `98c4d2e96fd7132357b85d64b735dcf295300af421ae373171ad8d08ff450437` |
| [Phone no-match recovery](evidence/consumer-record-finding/b2-no-match-390.png) | `00e9c261235d8d548e64236bd464417d678e21ca9a9bcd05534d132c77781aff` |
| [Phone results](evidence/consumer-record-finding/b2-results-390.png)            | `2c8978d35a82818712c1e48776bd8703180b75b9b01d6c26ca0692f5c16fde3c` |
| [Tablet results](evidence/consumer-record-finding/b2-results-768.png)           | `8d2c9b9b0b140122cd1d159ec504117c8f08d411ca0ca6c29b13189f6fc2dd7a` |
| [Desktop results](evidence/consumer-record-finding/b2-results-1440.png)         | `0f6731a7b3164ce91da8fa21ecd9f4903911f75bd302deae806ac997281104ca` |

The form is byte-identical to the inspected B1 form; B2 does not claim a form
redesign. The finder is stacked on phone and horizontal at larger widths;
records remain one column at 768 and two at 1440. Native focus is visible and
the existing icons load. No new photography is needed for the supported
approval job; media remains a separate family-driven supply task.

Confirmation Preview `preview-8ea96914-6ca3-4203-bbfe-40e800e8300e` stopped.
After Factory teardown, all nine exact project/resource checks returned zero.
Independent `/root/b2_review` reports scoped source/business/visual/evidence
P0/P1/P2 **0/0/0**. Root accepts this ordinary local iteration under delivery
policy; this is not the final repository-release gate and authorizes no release.
The bounded commit and normal iteration-branch push are recorded by Git and
the active ledger. Next is a complete Task-family journey using shared finding
with task-oriented summaries; new-family admission still needs its own exact
semantics and applicable acceptance. Delivered counts remain three canonical
definitions and two runtime families.
