# Event Registration workspace handoff

Planning handoff for accepted ADR-0086 UXR-001..003 and implementation Task 3.
Mode: Operate. This extends the founder-approved generated workspace system;
it introduces no new visual identity, contract, package or approval stage.

## Authority and reuse

Use `docs/design/generated-ui-assembly.md` as the existing product/design authority.
The context tool found no PRODUCT.md or DESIGN.md; that does not erase the approved
system already documented and implemented here. The user's accepted direction and
ADR settle purpose, audience, actions and scope; no new discovery interview is
needed for this handoff. Root inspected the retained Customer Requests
`task3-ui/customer-390.png` against current shared workspace styles: purposeful
cobalt, warm neutral surfaces, readable grouping and compact back/refresh controls.
That image is historical emitted-component evidence, not an Event product capture.

Reuse the ordered assets identified in ADR REU-001..005: approved primitives and
patterns, mobile/merchant shell conventions, existing recipes, then compiler
`renderWorkspaceStyles`, `createGeneratedPageRuntimeProjection` and
`getCustomerIconAssets`. Existing explicit Graph themes and dark mode remain
authoritative. New private composition key is
`event-registration-presentation@1.0.0`; distinct event/registration/attendance
semantics justify it, while colors and density stay token parameters.

No organizer Workbench import, copied Appointment slot picker, external photo or
invented ticket is needed. The content itself supplies a recognizable visual anchor:
local event date, title and venue, supported by admitted clock/person/check icons.
This family has no actual venue-image field; do not imply that a decorative image
depicts the user's venue or uploaded material.

## Phone attendee: find, reserve, return

At 390px, show compact product navigation, Events, and a populated event with a
clear date block, title, local time/zone and venue. Lead with the event identity;
remaining places support the decision without dominating it. The primary action
is View event or Register. A visible full/closed/cancelled state explains why a
place cannot be reserved. Do not fill the first viewport with instructions,
technical identifiers, organizer fields or repeated icon-and-label utilities.

Event detail keeps the event identity and reservation decision together. Register
asks only for the attendee name; the current principal and event are already known.
Saved confirmation leads to the same place in My places, including name correction,
cancel registration and retained history. Reload retrieves saved state. It never
claims a delivered ticket, email, QR credential or unsaved form persistence.

Use a single primary action per active decision. Keep words on Register,
Cancel registration, Save correction and Register again. Back and Refresh may be
icon-only with accessible names/tooltips and 44px targets. Cancellation and
correction reasons belong next to their action, not in a persistent form wall.

## Desktop organizer: manage the event and its roster

At 1440px, event selection and the selected event's workspace use distinct areas.
The selected header shows date, venue and open/closed/cancelled state. Capacity,
Reserved, Remaining and Checked in summarize actual authorized projection fields;
do not invent total attendance across events or client-computed hidden rows.

The roster is the working area. Show two realistic authored attendee rows in the
first viewport with names, current status and authorized Check in actions. Keep
details/correction/history reachable without expanding every row into a full form.
No search or export control appears before the read/API contract supports it.
Load more explicitly reveals additional bounded records.

Create event, correct details/capacity and open/close registration are discoverable
beside event details. Cancel event has its own labelled confirmation describing
its terminal effect on all reservations. Never place it where a user would mistake
it for cancelling one attendee's registration.

At 768px, collapse navigation before compressing the roster. At 390px, an organizer
can use an attendee list with each person's name/status/action together; the whole
document must not horizontally scroll. This is a responsive working surface, not
a separate native application or a second independent dataset.

## State, history and recovery

| State                             | Visible meaning and available next action                                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Empty                             | Attendee sees no events; organizer has a clear Create event action. No fake rows.                                               |
| Loading                           | Preserve workspace geometry, identify loading and prevent accidental duplicate writes.                                          |
| Open/full/closed/past             | Real time/availability projection and labelled status determine registration access.                                            |
| Saved                             | Show the saved place or attendance outcome, then refresh authoritative current state.                                           |
| Whole event cancelled             | Show reason/time on Events, detail, My places and roster; remaining places is zero. Retained check-in is explicitly historical. |
| Individual registration cancelled | Preserve history and offer Register again only when event rules permit it.                                                      |
| Validation                        | Keep entered fields and place actionable error text beside the failed value.                                                    |
| Stale event or record             | Show current facts, retain relevant entered values and require an explicit new submission.                                      |
| Uncertain write                   | Freeze principal/body/key/version in memory; expose exact retry and prevent duplicate new commands.                             |
| Denied or principal switch        | Clear private record/editor/cache/pending state and abort stale reads; never flash a previous person's data.                    |
| Service failure                   | Useful retry with no raw API details or false saved result.                                                                     |
| Missing icon                      | Preserve action meaning, accessible name and usable geometry; no blank business action.                                         |

Use labelled states in addition to color. Whole-event cancellation retains history
without inventing a registration-history entry. Undo check-in remains a correction
of recorded history and cannot reactivate a cancelled event. Refreshes and paginated
reads must not let older requests overwrite newer state or append stale histories.

## One implementation and acceptance batch

Compile the immutable authored fixture with `generateApplicationBundle`. The
emitted-component harness must use the actual `web/app/page-runtime.tsx` and
`web/app/globals.css`, with all network requests intercepted and no listener.
Do not reconstruct theme aliases in tests in a way that hides missing emitter
routing or stylesheet output. Assert Event Registration workspace identity and
the named visible state before taking each image.

Inspect populated phone discovery/detail/My places and desktop roster together,
then dark/explicit-theme, long title/venue/name, full, cancelled and recovery
states at 390/768/1440. Check heading/action hierarchy, visible color and icons,
touch/keyboard/focus, document bounds and actual style/asset geometry. Remove an
asset in a negative test to prove missing-asset detection fails. Fix findings as
one batch, then confirm affected states once rather than starting repeated audits.

Actual generated application acceptance later repeats the applicable visual and
business checks using the same persisted records across phone and desktop. Source
harness screenshots, unit tests or this handoff cannot satisfy actual PostgreSQL,
consumer-effort or hosted-delivery acceptance.
