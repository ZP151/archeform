# Customer Requests workspace handoff

Date: 2026-09-24. Planning evidence for accepted ADR-0084 UXR-001..003 and
implementation-plan Task 3, not rendered-product acceptance or a new contract.
Mode: Operate. Inherit the founder-approved expressive workspace system and the
existing generated UI assembly guide. No new visual approval stage is introduced.

## Visual authority and reuse

Root inspected the retained expressive Approval `workspace-results-390.png` and
`workspace-results-1440.png` under
`docs/acceptance/evidence/consumer-expressive-approval/`. They establish the
approved use of purposeful accent color, clear selected navigation, readable
records, compact familiar icon controls and meaningful state. They are historical
Approval evidence, not Customer Requests screenshots. Current
`approval-workspace-presentation.ts` still supplies the shared native workspace
styles; Work Orders composes its own family semantics on that foundation.

Ordered source inspection:

| Source                                                                    | Reuse                                                                                                                             | Boundary                                                                                                                |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `ui-primitives`, `ui-patterns`, `generated-ui`, `workbench-ui` registries | Button/input/label/select/card/badge, form-field, compact-sidebar-navigation and interaction-state contracts                      | Registry descriptors are not proof that generated React calls executable components; record actual emitter/helper reuse |
| `screen-recipes`, `experience-recipes`, `product-recipes`                 | Responsive shell and state conventions                                                                                            | Restaurant order-timeline and payment states have incompatible business ports                                           |
| Workbench shell                                                           | Landmarks, focus restoration and dismissible navigation conventions                                                               | Do not import the operator Workbench into generated apps                                                                |
| Compiler workspace/page/identity/recovery helpers                         | `renderWorkspaceStyles`, `createGeneratedPageRuntimeProjection`, `getCustomerIconAssets`; existing role/command recovery patterns | The new transcript needs its own bounded adapter; do not clone the entire Work Orders emitter                           |
| Pinned source-study index and generated UI guide                          | Existing local provenance and supply rules                                                                                        | No upstream source, remote photo, new package or Base44 asset is admitted                                               |

The ADR-authorized new private key is `customer-requests-presentation@1.0.0`.
Its distinct work is the attributed conversation, linked correction and next-actor
projection. Styling variations use existing tokens and the `customer-request`
prefix. Keep explicit Graph theme choices and dark mode; never use screenshots
as permission to override a declared Graph theme. The canonical definition can
select existing design data through its accepted configuration path.

## Role-specific composition

- **Customer, 390px:** a compact identity/demo control and request list lead to
  the selected request. The detail starts with subject, current status and who
  should reply. The conversation and applicable next action follow directly;
  back navigation preserves the path to the list. The form asks only subject and
  description. Corrections collect their required reason in context.
- **Staff, 1440px:** status-filtered triage and selected conversation share useful
  width. List rows expose subject, real status, next actor and saved activity.
  Detail makes the request description and attributed answers readable; reply and
  Resolve request remain distinct consequential actions. No invented KPI tiles,
  unread counters, delivery receipts, assignment controls or SLA indicators.
- **Tablet, 768px:** collapse navigation before squeezing reading width. A focused
  detail view is acceptable; all authorized actions and routes remain reachable.
  Phone layout is not merely the desktop panel narrowed until it overflows.

Use resolved accents for selected navigation, the primary action and modest
conversation emphasis. Author name/role, timestamp and message structure establish
meaning independently of color. A staff message must be distinguishable without
turning the screen into a wall of colored boxes. Keep comfortable text measure,
wrapped long subjects and preserved line breaks. No stock image is necessary for
a text conversation; the Approval equipment photo must not become a fictional
attachment, avatar or customer record.

`refresh-cw` and `arrow-left` already exist in the pinned icon supply and suit
Refresh and Back with accessible names/tooltips and 44px targets. `circle-check`,
`circle-x`, `clock` and `user-round` can support status/identity without replacing
their text meaning. Consequential Submit request, Send reply, Save correction,
Resolve request, Reopen and Cancel request keep clear labels. The declared Graph
navigation values `list/inbox` are not SVG asset keys in the current allowlist;
use existing compatible rendered navigation icons instead of fetching arbitrary
assets or assuming every Lucide name is admitted.

## One acceptance batch, including recovery

Task 3's existing emitted-component tests and Task 4's actual product review
cover this matrix; do not add a separate visual audit workflow.

| State                         | Observable result                                                                                              |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Empty customer list           | The user can create the first request; no fabricated messages or counts                                        |
| Populated list / staff queue  | Subject, status and next actor can be scanned; selected detail is evident                                      |
| Reply / resolution            | A fresh customer view reads the saved staff text and status with attribution                                   |
| Correction                    | Original and linked correction are distinguishable; another principal's message has no correction action       |
| Reopen / cancellation         | Earlier resolution remains historical after reopen; cancelled request is visibly terminal with retained reason |
| Long transcript               | Load earlier messages preserves readable chronology and explicit paging; it never silently truncates history   |
| Stale or uncertain write      | Typed text remains recoverable; exact retry uses the frozen command and does not become a new submission       |
| Principal switch              | Old request, messages, draft and pending command disappear; late responses cannot repopulate them              |
| Loading / error / denial      | Useful state and recovery appear within the workspace; no raw transport diagnostics or unexplained blank pane  |
| Theme / responsive / keyboard | 390/768/1440, dark and explicit theme preserve hierarchy, contrast, focus, touch targets and document bounds   |

Before capturing, assert the named visible business state. Inspect mobile and
desktop together, including the form, actual saved outcome and one layout-changing
recovery state; group any corrections and confirm only affected evidence. Check
local icon/style delivery and computed geometry, but do not substitute those
mechanical checks for inspecting the generated screen. Actual PostgreSQL,
ordinary-user, real-device and hosted claims each still require their own evidence.
