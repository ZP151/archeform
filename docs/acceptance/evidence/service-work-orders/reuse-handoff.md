# Work Orders runtime and presentation reuse handoff

Status: source inspection and implementation preparation, 2026-09-24. This is
not runtime or visual acceptance. Accepted ADR-0080 owns the business contract;
the current Task 1 selector interface must freeze before dependent source starts.

## Ordered reuse inspection

1. `packages/ui-primitives/src/index.ts` provides the approved button, input,
   label, select, card and badge source/state conventions. `ui-patterns` provides
   form-field, data-table, confirmation-dialog, navigation and six recovery
   states. Use their accessibility and native-control conventions. The generic
   confirmation dialog alone has no controlled Work Orders mutation/retry state.
2. `packages/generated-ui/src/index.ts` supplies mobile-product-shell and
   merchant-workspace-shell. Its other business ports are Restaurant-specific.
   `screen-recipes`, `experience-recipes` and `product-recipes` currently bind
   Restaurant pages, pricing, payments and kitchen actions. Reuse shell/token
   composition; do not falsely bind dispatch to Restaurant business blocks.
3. `packages/workbench-ui/src/index.ts` explicitly forbids a generated runtime
   dependency. Existing Workbench shell landmarks and focus behavior are useful
   references; operator controls and the builder navigation stay out of products.
4. Generated `task-workspace-presentation.ts` already composes native records,
   correction controls and the private Approval workspace helpers. Shared
   `renderWorkspaceStyles`, `renderWorkspaceDataHelpers` and generated page
   projection are reusable. The shell hard-codes role selection and Task/Approval
   content; it cannot represent two technicians with the same role correctly.
   Inventory and Appointment provide retained conflict inputs, current-state
   refresh after replay and business-readable history patterns.
5. `docs/ecosystem/source-studies/README.md` requires pinned source-study authority
   before upstream copying. No new external implementation is needed. Existing
   `getCustomerIconAssets` validates lucide-static 0.468.0 asset digests and license.
   Reuse its local navigation/person/clock/refresh/check icons and emitted notice.

The accepted distinct key is `service-work-orders-presentation@1.0.0`,
Factory-authored, UNLICENSED. It owns assignment-aware dispatch/technician
interaction, not a color-only variant. Keep existing registry descriptors and
old generated outputs unchanged. Any shared style-helper extension must preserve
all current profile bytes and be included in the assigned presentation slice.

## Concrete runtime reuse boundary

- Reuse Task/Inventory transaction, expected-version, receipt and history
  conventions and `mutation-write-protection.ts`; inspect exact accepted Work
  Orders envelopes rather than copying Task's five-field metadata contract.
- Task `requestHeaders(role)` derives one fixture session per role. It is not
  suitable for two distinct technician principals. The server fixture hook and
  emitted principal chooser must agree on compiler-owned sessions, while the
  server independently derives principal/tenant/role/session and assignment.
- Authorize the current assignee before replaying a receipt. After reassignment,
  the old technician cannot use list/detail/history or an old successful command
  receipt to recover another technician's record. Preserve the accepted 404.
- Metadata correction records all five before/after values; cancel records a
  reason, and resolve records a report. Do not rename a Task completion event or
  discard prior reports after reopen. Each accepted command yields one versioned
  immutable business history event.

## Scenario composition

Desktop dispatch starts with an actionable queue showing title, location,
priority, state and assignee, plus Create. Detail exposes correction, assignment,
reassignment, reopen, cancellation and readable history when allowed. Counts must
describe actual loaded/authorized records; do not invent totals or operating KPIs.

Mobile technicians start with their assigned work, useful location and a reachable
Start or Resolve action. Keep report entry and history readable at 390 px. Due
date is a date-only value, not a promised appointment or route-planning feature.
Use visible priority/state hierarchy, meaningful accent color and existing icons.
Refresh and repeated navigation may be icon-only with accessible names and 44 px
targets. Core business actions keep clear labels. No photograph or map is needed
to satisfy this job; do not invent an unsupported upload/location integration.

The demo principal chooser must clearly identify the dispatcher and two synthetic
technicians. On reassignment/denial, remove stale detail and history, refresh the
authorized queue and show a useful explanation. Freeze principal and exact
command while a result is uncertain; after retry, refresh authoritative state.
Definite validation/conflict preserves typed values and shows current saved data
before an explicit reapply. Empty, loading, error and cancelled states remain
distinct; an empty authorized queue is not a network failure.

### Visual reference inspected before implementation

The Impeccable context loader resolves this new target to
`packages/compiler/PRODUCT.md` and `packages/compiler/DESIGN.md`; no Work Orders
surface implementation exists yet. Keep the established Graph-driven design
system and confirmed cobalt hierarchy, purposeful color and accessible icon
actions. This extends the approved application world; it does not introduce a
new brand, font, asset dependency or theme override. Some historical product
counts in those design documents are stale; the active PM ledger owns counts.

Root visually inspects Inventory's existing `task3-ui/populated-390.png` and
`populated-1440.png`. They demonstrate native fields, clear quantity emphasis,
local refresh/search icons and responsive navigation. They are earlier Inventory
component evidence, not Work Orders designs or current actual acceptance. Their
single broad list leaves substantial unused desktop space and does not express
assignment or a resolution report. Do not copy that screen and rename its rows.

Use a desktop queue with a coordinated adjacent detail/work area when width
permits: location, priority, status and assignee should be scanned without opening
each record; selection reveals the actual next action and recent history. On a
phone, lead with the technician's assigned queue and transition to a full-width
detail/report view, retaining a reachable return action. Put location and Start
or Resolve near the top rather than below a long field list. The representative
390 px populated fixture should expose its first permitted action within 650 px.
Forms retain visible labels; routine navigation and Refresh use icons with names.

Keep status, priority and cancellation visually distinct using existing semantic
tokens, typography and icons together. Scope any queue summaries to actually
loaded authorized records; do not imply global totals from a paginated result.
Use clear grouping and a restrained brand accent, not a wall of explanatory copy
or decorative metrics. Preserve explicit Graph themes and verify light/dark when
supported. Existing local icon assets suffice; a decorative stock image is not
required for this field-work scene.

## Verification carried into the existing case

Use full emitted styles/runtime and actual SVG assets for component checks, with
strict emitted types. Assert the named state before each image. Inspect phone
technician and desktop dispatcher compositions, relevant tablet recovery, focus,
touch and absence of horizontal overflow. Component evidence does not establish
PostgreSQL behavior or delivered endpoints.

The later actual case follows the ADR's shared-record sequence: create a mistaken
order, correct, assign A, start as A, correct, reassign B, deny A, resolve as B,
reopen and resolve again; cancel a mistaken duplicate. Assert both reports and
correction/assignment history. Retain exact interrupted retry, immutable identities,
measured effort and owned cleanup. The recorded startup rejection remains in
force; no alternative service startup, Docker run or hosting action is authorized
by this preparation. Actual and hosted acceptance stay separately open.
