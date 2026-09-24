# Appointment V2 presentation implementation checkpoint

Status: historical initial implementation checkpoint. The independent UI review
found five P2 issues. [Correction round 1](task-3-review-correction.md) now passes
31 focused cases; a final three-case pagination correction passes and the same
reviewer closes all five findings at 0/0/0. Source/component acceptance is complete;
actual Preview and delivered acceptance remain open.
The [source manifest](task-3-source-manifest.json) identifies the four owned files
and their preserved review snapshot. Root completed the UI and tests after the
initial implementer handoff. Accepted ADR-0081/0082 contracts remain unchanged.

## Implemented outcome

- Customers choose named available slots, request appointments, review saved
  notes/times and cancel requested appointments with a reason.
- Staff filter requested/confirmed/cancelled records, load further records,
  confirm, reschedule, confirm again, cancel and read updated business history.
- Administrators create and edit services/schedules and cancel appointments.
  Explicit UTC fields preserve original seconds/fractions on unchanged edits.
- Pending/uncertain operations freeze the command and actor; same-command retry
  preserves method, URL, body and key. Replay refreshes authoritative state.
  Reload never reconstructs or automatically resubmits an uncertain command.
- Definite conflicts preserve drafts, refresh current state and require deliberate
  new intent. Setup conflict handling separates desired values from current values.
- The accepted server clock drives retained seven-day discovery and cursor pages.
  Clock/permission failures expose recovery for customer and staff views.

Reuse follows [the existing handoff](ui-reuse-handoff.md): approved workspace
tokens/styles, native accessible controls and pinned Lucide assets/notices. No new
package, provider, database, Graph contract or public compiler export is added.
Historical helper output is unchanged; only the appointment prefix is added.

## Executed evidence

The real emitted frontend and emitted in-memory runtime execute in a fully
fulfilled Playwright harness: no application listener, external requests, Docker,
provider or PostgreSQL process. Runtime envelopes are not normalized by tests.
The command harness enforces the existing `/events/<event>` route.

Final focused run: **23/23**, including strict generated frontend TypeScript,
complete visible staff chain and refreshed history, administrator cancellation,
flat setup create/full expected-values edit, referenced-slot retiming rejection,
UTC edits under Asia/Singapore browser timezone, capacity/version conflicts,
lost booking/setup responses, replay after intervening state change, no reload
resubmission, late-role read fencing, retained clock recovery, availability cursor
pages and access to appointments after the first twenty.

The combined affected lane passes **133/133**: 23 workspace, 32 immutable
compilation and 78 historical compatibility checks. Subsequent presentation-only
history wording/details and role-strip theme fixes rerun all 23 workspace checks
plus compiler typecheck/build. Facade/shared-helper bytes do not change after
that compatibility run. Formatting and whitespace pass. Earlier setup/read QA
remains valid; this ordinary presentation slice does not repeat that gate.

The initial six-control run was incomplete. Root found and fixed the missing
`/events/` URL falsely accepted by its harness, stale open history, unavailable
administrator cancellation, cancelled-record actions, ambiguous UTC editing,
inaccessible filled textarea labels, hidden mobile navigation text, inaccessible
records beyond twenty, staff read-error recovery, template-like name substitution,
and the unthemed role strip. Failed test outputs remain in task history. Original
UI attempts 001/002/003 are preserved. Early root-interaction-004 captures were
replaced by later runs before unique capture directories were introduced; do not
claim those intermediate images are retained. Every subsequent run has a unique
directory, including failed runs.

## Visual inspection and limits

Final component captures are under
`generated/.appointment-v2-task3-ui/root-interaction-02d5c32b-f1eb-4491-935e-0b8370393433/`.
Root inspects 390 px customer and conflict states, 1440 px staff and administrator
surfaces, and 768 px dark empty/denied states. The corrected mobile canvas uses
the available width; desktop cards group actions compactly; setup controls do not
stretch to the adjacent form; role controls inherit the selected theme. Geometry,
keyboard focus and actual rendered state assertions accompany captures.

These are component images, not live Preview acceptance. Actual authenticated
HTTP, PostgreSQL persistence/restart, automatic consumer entry, deployment and
cleanup remain Task 5. The separate Workbench startup rejection is not retried.
Task 4 default selection is unchanged and its prepared six-case suite remains
one historical pass plus five expected failures. Coverage remains ten logical
definitions and six previously demonstrated runtime families; this V2 replacement
adds no new family count.
