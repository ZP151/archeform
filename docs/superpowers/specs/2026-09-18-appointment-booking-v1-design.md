# Appointment Booking v1 Design

**Status:** Draft for review. No runtime implementation is authorized by this
document.

**Product objective:** Add the eighth locally accepted product only after a
customer can request an available appointment, staff can confirm or move it,
and the system can reject capacity conflicts, cancel the booking, persist the
result, and recover from retries without exposing platform lifecycle work to the
ordinary user.

**Baseline:** Seven locally accepted definitions across Restaurant Ordering,
Approval, and Task families. The current branch is
`codex/consumer-delivery-roadmap` at `583bc179`; the accepted Graph lifecycle
and six historical output snapshots remain immutable compatibility boundaries.

## Product contract

The supported job is a small service business that offers named services in
administrator-created time slots. A customer chooses a service and an open slot
and submits a request. Staff confirms or reschedules the request. A customer or
staff member can cancel it. An administrator manages services and slots.

The first supported slice deliberately uses a slot model instead of arbitrary
calendar arithmetic:

- `service`: name, duration in minutes, active flag;
- `schedule`: service reference, UTC start and end instants, IANA timezone,
  positive capacity, and open/closed status;
- `appointment`: schedule reference, customer name, notes, cancellation reason,
  and requested/confirmed/cancelled status. The cancellation reason is optional
  while active and required for a cancel command.

The schedule owns the displayed interval and timezone. The appointment selects a
schedule; it cannot submit an arbitrary timestamp or timezone. A schedule with
capacity one is the primary acceptance case, while the capability contract may
support any positive capacity so the reusable boundary is not tied to one demo.
The server requires `end > start`, validates the timezone, and stores instants
canonically. It counts active appointments for the selected schedule inside the
same transaction that creates or moves a request. A full schedule rejects the
operation without changing the appointment, history, or capacity state.

The flow is:

```text
open slot -> requested -> confirmed
                    \-> cancelled
confirmed -> rescheduled request -> confirmed
```

Rescheduling changes the same appointment record to a new open schedule and
records the old and new schedule in immutable history. Cancellation releases
the capacity. Replays of the same command are idempotent; stale versions and
simultaneous claims fail with a safe conflict response.

Roles are `customer`, `staff`, and `administrator`. These are local demo roles
for this slice and do not claim authenticated identity or tenant isolation.
Customer can create/read/cancel the selected appointment in the demo journey,
staff can read, confirm, reschedule, and cancel, and administrator can manage
services and schedules and inspect or cancel appointments. Any future
record-level ownership rule is a separate identity contract.

The immutable `factory.product-blueprint/v1` representation keeps one unique
`cancel` transition, from `requested` to `cancelled`, owned by `customer`,
because that contract permits one actor per transition key. The appointment
capability command authorization separately freezes cancellation for customer,
staff, and administrator across the active requested/confirmed states. The
generated `/events/cancel` command therefore enforces the capability
authorization and atomic release semantics even when a role is not the actor
of the generic blueprint transition. This mapping preserves the business
contract without changing Graph V1 or duplicating a transition key.

## Reuse and new capability boundary

The existing `core.scheduling@1.0.0` asset remains unchanged. It currently
declares only `schedule.plan` and a datetime-field binding; that is useful
provenance and a planning primitive, not evidence of capacity enforcement.

The implementation proposes a separate versioned capability,
`scheduling.appointment@1.0.0`, with the effect `appointment.booking` and
declared bindings for service, schedule, appointment, interval, timezone,
capacity, schedule reference, and status fields. Its API template owns only
the atomic claim, release, and move operations. Existing generic Graph flows,
record storage, audit, receipt, retry, and generated form/list primitives remain
the adapters around it.

No product-name conditional is added to the compiler. The definition selects the
capability through the normal composition lock. Existing approval, task, and
ordering definitions must produce byte-identical outputs. If the Tech Lead
determines that this effect changes a stable Graph or runtime contract, the
required proposed ADR and founder acceptance precede implementation. A rejected
or materially ambiguous capability decision sends this goal to the short
admission/regression lane instead of weakening the appointment scope.

## User-facing composition

Reuse the approved tokens, icons, native controls, cards, and responsive states.
Add no calendar library in v1. The first UI is a useful schedule picker and
appointment list/detail flow:

- customer view leads with open services and slots, then the primary request
  action and the current booking state;
- staff view leads with pending requests, the next decision, and a compact
  reschedule control that preserves the selected timezone label;
- administrator view exposes service and slot management separately from
  customer bookings;
- summaries show service, local date/time with timezone, customer, status, and
  the next allowed action; cancelled records retain their reason and history;
- loading, unavailable-slot, conflict, permission-denied, retry, empty, dark,
  media-fallback, and narrow-screen states are explicit and recoverable.

The presentation must exercise at least three records, a long service name,
one cancelled record, and a closed history section at 390px before any expensive
Factory run. Primary actions remain reachable with 44px targets and no document
overflow. Internal history can be progressive, but service, slot, timezone, and
status cannot be hidden behind an editor.

## Acceptance evidence

The product is not counted until all of these are demonstrated against an
immutable Published Graph and isolated Compilation:

1. Customer creates a valid appointment in an open slot and sees its persisted
   requested state after reload.
2. Staff confirms it; a second customer claim on capacity-one slot is rejected
   atomically and remains unchanged.
3. Staff reschedules the same record to another open slot; old capacity is
   released, the new slot is claimed, and history contains both intervals and
   timezones.
4. Customer or staff cancels; the slot becomes available and the cancellation
   reason survives reload. Repeated cancel, stale version, and lost-response
   replay produce no duplicate transition or audit effect.
5. Invalid interval, unsupported timezone, closed slot, missing service,
   forbidden role/state action, and forged server-owned availability fields are
   rejected without a partial write.
6. Generated UI passes the complete workspace checks at 390/768/1440px, light
   and dark themes, form/list/history states, media failure, loading/error
   recovery, visible icons, labelled timezones, and no overflow. A provider-free
   emitted browser test runs before image construction.
7. Actual local PostgreSQL/API/browser acceptance records ready time, full
   journey time, model calls, technical handoffs, manual rescue, exact
   compilation/source identity, and owned resource cleanup. Authored fixtures,
   real-model evidence, ordinary-user observations, and hosted delivery remain
   separate claims.

Compatibility includes the six-definition frozen fixture, the current seven-row
catalogue order, generated manifests for unchanged products, and the immutable
Draft -> Publish -> Compilation boundary. Any new database, queue, dependency,
identity, deployment, or serialized Graph decision follows `docs/tech-governance.md`
and `docs/threat-model.md` before implementation.

## Explicit exclusions

V1 does not include payments, reminders, external calendar synchronization,
recurring appointments, waitlists, arbitrary overlapping intervals, multiple
staff/resources per slot, public sharing, real authentication, tenant-aware
ownership, or production hosting. These are material future capabilities, not
silent assumptions in the definition.

## Exit and fallback

The small goal exits only when the definition is registered, independently
reviewed, locally accepted through the complete journey, and the ordinary
reviewer reports no open P0/P1/P2 findings. The broader mature-platform goal
continues with the next distinct definition, a measured short regression lane,
and a low-risk real-use pilot.

If interval or capacity semantics cannot be implemented with an atomic server
boundary and truthful evidence, stop the Appointment product before admission.
Keep the current seven products accepted and execute the short definition
admission/index lane instead. Never count a renamed approval row or a UI-only
calendar as a new product family.
