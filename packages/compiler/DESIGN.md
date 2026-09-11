# Generated approval workspace

## Direction and purpose

Build a compact, familiar business inbox. The first viewport must show useful
records and their next action, not a stack of navigation, filters and field labels.
This replaces the founder-rejected B2 presentation; it is not founder visual
acceptance. Product truth is recorded in PRODUCT.md. Existing Graph theme tokens
remain authoritative, including edited colors, typography and dark mode.

Seven grounded structures considered were an office ledger, a dispatch board,
a correspondence inbox, a calendar agenda, a case-folder index, a banking
transaction register and a procurement comparison sheet. The direction exercise
selected the third structure. Dense aligned content and progressive disclosure
serve both requesters and reviewers without inventing business information.
Physical theatrical treatments would weaken task clarity here; retain disciplined
alignment, legible state cues and responsive transformation, not their motifs.

## First viewport

- Desktop: distinct quiet sidebar containing application identity, all full Graph
  route labels and honest demo-role control; broad working canvas with a compact
  contextual heading and primary creation action. One coherent list surface with
  aligned business rows, restrained separators and a clear toolbar.
- Phone: compact identity bar, native Navigation disclosure with full labels when
  opened, a small demo-role control, then the task. No clipped horizontal nav.
  Closed navigation must not consume the viewport. At 390 x 900 the first enabled
  record action ends within 650 px and at least two of three populated records
  have their identifying summary visible without scrolling.
- Tablet: same deliberate compact navigation and readable content width; do not
  squeeze a desktop sidebar and desktop columns into an unusable middle size.

## Components and state

Compose one private shared presentation recipe. Retain approved native controls,
the pinned seven Lucide approval icons, Graph bindings, typed fields, search,
status filtering, result counts and mutation feedback. The current canonical
Expense and Purchase variants must both use it. No extra dependency is required.
Record titles dominate; amounts use tabular numerals without inventing currency
units. Dates remain unambiguous. Secondary field labels stay accessible, with
full details disclosed on demand. Status color belongs to the badge, not a large
tinted record. Avoid giant amounts, redundant Item headings and nested cards.

Forms use a deliberate field grid, readable labels, suitable native inputs and a
clear submit footer. Loading, failure, empty and no-match use the same composed
surface and keep recovery controls usable. Keep B2 scope invalidation, role
denials and all real data behavior. Preserve keyboard focus and 44 px touch
targets; navigation disclosure is the principal responsive interaction.

## Finish and acceptance

Compare actual generated desktop, tablet, phone list and form images against the
rejected B2 images. Verify full navigation access, hierarchy, density, typography,
state differentiation and both Expense/Purchase data. No assertion that an icon,
axe pass or absence of overflow proves visual finish. Check CSS responses,
computed recipe styles and actual SVG geometry. Deliberately disable CSS and
remove icons to prove those checks detect degradation. Retain real business
create/submit/approve/reject, persistence, filtering and permission checks.
The scoped independent review receives the user's rejection and before/after
images. Report functional, mechanical visual and human visual conclusions
separately. Ordinary-user validation remains open until actually performed.

## Direction correction — 2026-09-12

The founder requests stronger color hierarchy and less redundant action text.
Use the existing Graph accent and accent-text pair for the identity/sidebar band;
keep the content surface readable, use a clear selected navigation surface and
stronger success/warning/error badge fills. Preserve compact neutral business
rows. Color must distinguish identity, selection and status instead of tinting
every entire record. Verify light/dark colors and contrast from resolved tokens.

## Decision outcome interaction

ADR-0059 composes one private `approval-decision-history@1.0.0` panel into the
accepted workspace. Reuse the existing read/audit authority, request headers,
field labels/formatters, summary identities, Details disclosure, neutral surfaces,
semantic badges and four already-pinned icons. The ordered registry/recipe/template/
source-study search found no interaction combining these read-only business
outcomes with role-scope invalidation; the private first-party module owns that
gap, records UNLICENSED provenance, and adds no catalog entry or dependency.

Default closed, it keeps the task workspace compact. Opening shows current
readable record identity, actual persisted decision, recorded demo role and time.
It never claims verified people, decision-time snapshots or a reason absent from
the current API. Both reads must validate before rendering. Unauthorized roles
have no panel/fetch, and a role change closes and clears it before old responses
can render. Empty, loading, safe error, Retry and icon-only Refresh are required.
Actual UI evidence must show both decisions after reload for both definitions.

Refresh becomes the existing Lucide refresh-cw icon in a 44 px control with
aria-label/title Refresh and unchanged disabled/loading behavior. Keep words for
Submit/Approve/Reject because their consequences must be clear. Remove no factual
Graph labels. Current function tests and screenshots do not prove user visual
acceptance; the prior neutral direction has been rejected.
