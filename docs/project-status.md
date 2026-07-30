# Factory Pilot delivery status

Updated: 2026-07-30

## Current milestone

Factory Pilot has a TypeScript Application Graph platform with mutable Drafts,
immutable Published revisions, deterministic compilation, a Workbench Home,
and three composed starter profiles. Restaurant Ordering is now release-accepted
as an isolated generated application. The next active slice is Parameterized
Capability Composition: replace starter-Graph copying and compiler-owned profile
branches with independently versioned packages that contribute Graph and target
artifacts through declared parameters and immutable composition locks.

The active design and task-level migration plan are
[`superpowers/specs/2026-07-30-parameterized-capability-composition-design.md`](superpowers/specs/2026-07-30-parameterized-capability-composition-design.md)
and
[`superpowers/plans/2026-07-30-parameterized-capability-composition.md`](superpowers/plans/2026-07-30-parameterized-capability-composition.md).
The public-source candidate map is
[`research/2026-07-30-profile-capability-source-study.md`](research/2026-07-30-profile-capability-source-study.md).

## Current evidence

`pnpm test` passed on this branch on 2026-07-30: 11 Turbo tasks and 490 tests
across Graph (12), capabilities (66), adapters (20), compiler (161),
compiler-worker (69), Control Plane (97), and Workbench (65). This is
development evidence on host Node 24.18.0; it does not replace the Node 22
generated-runtime release gate.

Restaurant Ordering evidence is documented in
[`acceptance/restaurant-ordering-mvp.md`](acceptance/restaurant-ordering-mvp.md):

- A Published Restaurant Graph compiles deterministically to 65 artifacts.
- An isolated Node 22 generated stack passed its Customer and Merchant
  Playwright journeys (2/2): opaque table entry, menu search, line and
  whole-order notes, submit, full simulated payment, status/history/receipt;
  table lifecycle, menu availability and stock, kitchen transitions, cashier
  capture, cancellation/audit/inventory, and operational reporting.
- Generated Customer Decimal values are normalized and rejected before cart
  state commits; malformed line or total data cannot partially update the cart.
- The local Factory Compose definition forwards the optional Restaurant demo
  bootstrap value only to the Worker. Generic preview configuration remains
  independent of that input; Restaurant preview remains fail-closed when it is
  absent.
- The current-source Workbench lifecycle has been independently accepted. It
  created a Restaurant Draft, published it, compiled 65 immutable artifacts,
  started a generated Node 22 preview, completed Customer and Merchant
  journeys, stopped the preview, and removed only the run-owned generated
  containers, network, volumes, and Worker runtime directory. The reproducible,
  redacted run identity, digests, images, ports, command shapes, and cleanup
  evidence are in the acceptance record.
- Preview Web readiness now tolerates the proven short post-Compose startup
  race, but caps all sanitized readiness retries at 30 seconds (and at the
  broader operation timeout when shorter). Worker regression coverage is 73/73
  for the focused package suite, including transient recovery, permanent
  failure, cancellation, and exact-project cleanup.

## Accepted release gate

The full `Workbench → Publish → Control Plane → Worker preview → generated
Restaurant → Stop → scoped cleanup` sequence is accepted. No user-owned Docker
resource was stopped or removed during validation. The reviewed acceptance
record is [`acceptance/restaurant-ordering-mvp.md`](acceptance/restaurant-ordering-mvp.md).

## Product capability gap

The current Restaurant Profile satisfies the initial dine-in MVP, not the full
commercial point-of-sale scope. The requirement-by-requirement evidence is in
[`audits/restaurant-ordering-requirements-audit.md`](audits/restaurant-ordering-requirements-audit.md).

| Area                | Verified now                                                                             | Not yet a generated capability                                                                  |
| ------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Customer entry      | Opaque table-session link and session-bound orders                                       | Customer login, saved stores, manual-table verification, location selection                     |
| Menu and cart       | Categories, search, quantities, item and order notes                                     | Dish media, configurable specifications/modifiers in the Customer UI, promotions                |
| Checkout            | Submit, full simulated `cash` or `card` payment, receipt                                 | Real payment providers, split/partial payment, member balance, suspended credit                 |
| Customer lifecycle  | Status, session history, receipt                                                         | Reviews, images, repeat order, membership, points, coupons, delivery, pickup                    |
| Merchant operations | Tables, menu availability, stock, kitchen queue, cashier, cancellation, audit, dashboard | Merge/move tables, order amendment, printing, promotions, member operations, data import/export |
| Platform proof      | Draft, Publish, deterministic compile, Workbench-driven Node 22 generated-app proof      | Parameterized asset composition, generic target contributions, and Puck PageModel round trips  |

## Recommended next slices

1. Design and freeze **Parameterized Capability Composition v1**: typed
   package parameters; additive Graph contributions; executable target
   contributions; typed requirements/provides; canonical immutable composition
   locks; and safe collision/merge rules.
2. Convert the shared core and commerce assets so Restaurant Ordering and
   Simple Ecommerce select identical package versions with different validated
   parameter bindings. Remove compiler-owned handler/version selection for
   those assets.
3. Make Puck a validated PageModel adapter: Factory owns route, component,
   interaction, and design-token semantics; Puck edits only approved visual
   component data. Add a role-aware browser simulator from the same Graph.
4. Move Restaurant-specific behavior into parameterized assets and remove the
   Restaurant compiler fork. New feature breadth then arrives as reusable
   capability packages, not manual Profile-only implementation.
5. Conduct fixed-version source studies for high-value candidate ecosystems
   before adopting any dependency or implementation pattern. External projects
   remain governed dependencies, provider contracts, or reference-only sources.

## Constraints

- Factory Application Graph remains the source of truth. Editors, AI,
  generated code, and providers are adapters.
- Credentials and raw model input/output never enter Git, reports, generated
  artifacts, state, logs, or screenshots.
- External source may not be copied without a fixed-version source-study,
  compatible license, notices, tests, and Factory-owned adapter boundary.
- Docker Node 22 is the release environment. Host Node 24 is useful only for
  development checks and emits the expected engine warning.
