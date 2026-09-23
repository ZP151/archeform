# Consumer Product Acceptance Checklist

Effective: 2026-09-10, following the founder's D2.4 screenshot feedback.
Applies to every new or materially changed generated product family, definition,
recipe and consumer journey. This is the shared acceptance matrix referenced by
[delivery policy](../delivery-policy.md); the active PM ledger owns task status.
Technology, security, lifecycle and deployment authorities remain unchanged.

## Prepare acceptance with the task

Before implementation, the task owner records the intended users, primary job,
supported/excluded business scope, required roles and data, core journey and
material exceptions. Map every dimension below to a concrete case, expected
result and evidence method. Reuse existing checks and assets; add only missing
coverage. Identify the most important phone screen and the first useful action.
Set scenario-specific success targets before measuring, including time to usable
result, material questions, technical handoffs and manual rescue. Keep planning
targets distinct from measured results and service guarantees.

Do not clone the Expense screen into unrelated products. Reuse interaction
patterns while choosing summaries, navigation, media and actions around each
family's real user task. A generic field dump is not a finished product UI.

### Presentation regressions following repeated founder rejection

Declare the actual first-viewport composition before implementation: navigation,
main action, record/content identity, important summaries and state hierarchy.
Bind family-specific observable targets to it, such as first action position and
visible meaningful records; do not apply an arbitrary card count to every family.
Retain rejected images as anti-references. A rejection withdraws the associated
visual acceptance even when prior automated and agent review results were green.

For shared templates, exercise at least two materially different current
definitions when both consume the changed presentation. Verify emitted stylesheet
HTTP success, computed layout and visible icon/media geometry in the real app.
Prove the detector fails when the relevant assets are disabled or missing. These
checks diagnose loading; they do not establish visual quality. The existing
review must also compare actual before/after images for deliberate composition,
legibility, task reach, density, meaningful graphics and responsive navigation.
Record functional, mechanical visual and qualitative visual conclusions separately.
Do not describe internal review as founder or ordinary-user acceptance.

For a selected visual concept, attach the exact target to the task and compare
it with the actual rendered product at matching widths and relevant states.
Record deliberate deviations required by real business behavior; do not silently
fall back to the rejected layout. Useful media must decode in the generated app,
have the correct crop/aspect ratio, remain available without unapproved remote
requests and degrade to a usable layout when absent. Decorative category imagery
must not masquerade as actual records or uploaded evidence. Routine icon-only
actions retain accessible names and 44 px targets; meaningful business decisions
retain clear words. Apply the [assembly guide](../design/generated-ui-assembly.md)
to future recipes and interpretation/configuration changes. These checks are part
of the existing review and add no separate gate.

When a summary contains several numeric values, people must be able to distinguish
their meanings without opening an editor. Keep meaningful quantity, unit-price
and total labels visibly readable, with appropriate emphasis for the outcome.
Check computed clipping and geometry as well as DOM text: an accessible label
hidden by a one-pixel style does not establish visual comprehension. Preserve
declared units and avoid inventing currency. Derived fields must be read-only,
preview from valid operands and show the saved authoritative result after reload.
For changed numeric persistence behavior, prove the actual database adapter and
seed path with precision-sensitive values and transactional rollback; in-memory
arithmetic alone is insufficient. Reuse this shared evidence for unchanged rows.

For a recipe's action-position or density criterion, the cheap emitted-browser
check must render its complete workspace, including navigation, heading, hero,
filters and business labels. An isolated card cannot establish the first action's
position on the page. Keep the accepted recipe bounds and 44 px controls; fix
composition spacing rather than weakening a failed threshold. Reuse this focused
check before expensive actual generation, within the existing review.

## Required acceptance dimensions

Before expensive generated-product builds, focused exact-profile tests must pass
the immutable Graph and its separately persisted composition lock through a JSON
round trip. Compare the resulting public compiler output with the original input
and retain malformed-data rejection cases. This catches persistence representation
differences without weakening value, digest or authority checks. It belongs to the
existing regression lane and adds no approval stage.

Scope generated-product status/error assertions to the product workspace when a
framework adds global live regions. Retain the business assertion and verify the
framework interaction with its installed implementation before an expensive rerun;
do not weaken the expected outcome to silence a locator failure.

| Dimension                          | Observable acceptance condition                                                                                                                                                                                                                                                                      | Evidence                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Need and definition fidelity       | The result satisfies the supported business intent, roles, fields and rules. Defaults are safe; only material unknowns trigger questions. Unsupported requirements remain explicit rather than silently discarded.                                                                                   | Requirement-to-outcome cases, including coarse intent and at least one material ambiguity or unsupported case relevant to the slice.                                                                                                                                                                                                   |
| Ordinary-user effort               | A user can reach and perform the primary task without mandatory schema, template-ID, code, Diff or manual lifecycle decisions. Progress and recovery use business language.                                                                                                                          | Record first usable result, questions, technical handoffs, corrections/rescue and task completion. Report each first attempt and subsequent repair separately.                                                                                                                                                                         |
| Complete business journey          | Perform the real primary action, its downstream work by other roles when applicable, and read the resulting state after reload. Navigation and visible actions lead to meaningful working destinations.                                                                                              | Actual generated-app interaction and persisted result, not only seeded screenshots, a compiler pass or mocked success.                                                                                                                                                                                                                 |
| Business correctness and access    | Validate declared types, constraints, relationships, time/money semantics, state transitions and allowed/denied actions. Test ownership, conflicts, capacity or duplicates when relevant to the supported business.                                                                                  | Focused regression and appropriate actual runtime checks. Demo role selection is not authenticated identity or requester data isolation.                                                                                                                                                                                               |
| Complete interaction states        | Relevant empty, loading, populated, validation-error, service-error, success, pending/disabled and permission-denied states remain understandable and recoverable. Prevent unintended duplicate submission and preserve entered data when recovery allows it.                                        | Reproducible affected-state checks; representative screenshots for states whose layout changes. Irrelevant states need a reason, not invented UI.                                                                                                                                                                                      |
| Visual product quality             | Actual generated screens have a clear primary action, readable hierarchy, intentional spacing and useful summaries. Secondary technical details do not dominate. Reused icons or relevant imagery aid recognition; assets load and have usable fallbacks. Status is not communicated by color alone. | Inspect real generated screenshots of the primary screen, input/task screen and outcome. Check font/icon/image loading, clipping, overlap, excessive blank space and broken assets. Tests or axe alone cannot establish visual acceptance.                                                                                             |
| Responsive and accessible use      | At 390/768/1440 px, the complete primary journey remains usable: readable content, reachable routes/actions, no accidental document overflow or overlays hiding controls, useful desktop width, and keyboard/focus/label/error semantics. Phone touch controls target at least 44 x 44 px.           | Automated layout/accessibility checks plus visual inspection. Test long labels/data and narrow supported widths where they stress changed layouts; distinguish deliberate internal scrolling from document overflow. Do not require all content or long forms above the fold; keep the primary task apparent and its action reachable. |
| Delivery, persistence and recovery | The claimed environment can open the delivered app, retain state and recover from relevant failures. Hosted/private claims require actual URL, identity/access and operational evidence under accepted authority.                                                                                    | Bind evidence to the tested source/revision/compilation and environment. Confirm generated-runtime health and exact temporary-resource cleanup. Local Preview does not prove public deployment or hosted readiness.                                                                                                                    |

Use imagery when it serves the product: menus/catalogs may need item images,
whereas approval tools may need only meaningful icons and status hierarchy.
Neither decorative photos nor an additional UI library is a universal requirement.
Use approved assets first, retain provenance/licenses, and check missing media.

## Adapt the matrix to the business

These are examples for defining cases, not claims of implemented capability:

| Product family    | Core outcome and important exceptions                                                                                                    | Primary presentation to inspect                                                                                 |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Approval          | Create, submit, decide, retain result; invalid transition and unauthorized decision.                                                     | Scannable request summary, clear status and valid action, accessible details.                                   |
| Appointment       | Select service/time, book, manage/cancel; unavailable slot, conflict, timezone and capacity rules.                                       | Legible availability and selected time, confirmation and recovery.                                              |
| Ordering/catalog  | Find item, choose options, submit order and follow status; quantity, price, unavailable item and duplicate submission.                   | Useful item media when available, discoverable options/cart, clear totals and order status.                     |
| Inventory/tasks   | Create/update, assign or change state and retrieve result; invalid quantity, conflicting updates or access restrictions as declared.     | Search/filter/list or board suited to the job, readable priority/quantity/status and an actionable detail view. |
| Content/directory | Find and view an entry, then complete its declared contact, submission or management action; no results, missing media and access rules. | Scannable content, useful imagery, search/navigation and a working next action.                                 |

## Evidence and decision in one existing review

Use one acceptance record in the task's existing ledger or evidence document;
do not introduce another approval stage. Include:

- Scope, family/case, intended outcome and predeclared targets.
- Source/revision/compilation, environment, date and tested viewport sizes.
- A result for each dimension: `pass`, `fail`, `deferred` or `not applicable`,
  linked to evidence. A deferred item needs an owner and next task; not applicable
  needs a business reason. Unsupported capability is not passed by relabelling it.
- Commands/outcomes, actual generated screenshots and a short visual observation.
  Keep the old baseline; bind new evidence to the new result. If reusing evidence,
  explain why its behavior and source paths remain unaffected.
- Distinct deterministic-fixture, real-model and ordinary-user findings. Use safe
  synthetic data and bounded metadata; never retain credentials, personal data
  or raw model prompts/responses in screenshots, logs or acceptance documents.
- The accepted scope, unresolved limitations and next product task.

A failed or missing applicable business, visual or usability condition blocks
acceptance of that product outcome even when technical tests pass. A narrower
slice may be accepted with explicit limits; unfinished required outcomes must
remain open and must not count as a completed product family. Physical-phone
and ordinary-user evidence is required to claim real-device usability or reduced
user effort; viewport tests and shorter screenshots cannot establish those claims.

Keep verification proportional: new families require their own complete journey
and actual responsive visual evidence; changed paths receive focused regression
and affected-state confirmation. Reuse unchanged evidence instead of rerunning
every state at every width, every family, or every model evaluation on each edit.
Inspect one screenshot batch, group observed corrections, and confirm the affected
results. Existing independent review covers this matrix; do not add separate
visual, QA and PM audit waves. Existing contract/security/release gates and
bounded provider/runtime authorization still apply.

### Closed-loop product acceptance, following 2026-09-12 feedback

Prepare one realistic scenario that continues after the first successful action:
incorrect input -> correction -> submission -> decision/result -> follow-up or
explicit closure. Include the highest-frequency negative outcome (for example a
rejected request) and an interrupted operation. Record what the user can do next
without rebuilding the app or asking the model to add a missing screen.

Do not exclude ordinary correction, result visibility or follow-up merely because
the current template lacks it, then label the narrowed demonstration a mature
product. If a required outcome is missing, record the family as a functional
prototype and name the next implementation slice. Keep separate counts for
registered definitions, demonstrated runtime families and product-complete
journeys; never equate them.

Assess visual quality against the user's direction as well as mechanics. Useful
brand/selection/status color and recognizable library icons must aid scanning.
Familiar repeat actions such as Refresh may be icon-only with a stable accessible
name, native title/tooltip, keyboard support and a 44 px target. Consequential
business actions retain clear words. Test that no visual label remains where
icon-only was requested; an aria label alone does not verify text removal.

One reviewer evaluates the complete journey, actual images and user effort in the
existing review. No extra audit stage. Agent approval or passing axe/geometry
checks cannot overrule explicit user rejection. Cross-contract/security gates
remain applicable only at their existing boundaries.

Complete-workspace density checks must include representative record counts and
role-dependent chrome: at least the seed plus two distinct authored records,
realistic title lengths, and closed global history where available. Verify the
existing first-action and first-two-summary bounds before expensive generation;
a single isolated card or empty page cannot prove these outcomes. Check invalid
input by its required meaning unless exact wording is an explicit copy contract.

Scope generated-product browser assertions to the product workspace. Framework
live regions, including Next's route announcer, may share `alert` or `status`
roles with business feedback. Keep exact business assertions inside that scope;
do not weaken them or use the first matching global node to avoid ambiguity.
When a fixture omits framework chrome, include that chrome in a focused locator
check before the actual lifecycle run. This is a test-authoring convention, not
another acceptance gate.
