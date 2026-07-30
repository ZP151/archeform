# Factory Pilot delivery status

Updated: 2026-07-30

## Current milestone

Factory Pilot has a TypeScript Application Graph platform with mutable Drafts,
immutable Published revisions, deterministic compilation, a Workbench Home,
and three composed starter profiles. The active release slice is Restaurant
Ordering. Its generated Customer and Merchant applications are functionally
substantial, but the profile is not release-accepted until the same artifact
is started and stopped through a current Workbench, Control Plane, and Worker
stack.

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

## Release gate and active blocker

The full `Workbench → Publish → Control Plane → Worker preview → generated
Restaurant → Stop → scoped cleanup` sequence remains unproven. The prior
running Factory stack is stale; a fresh current-source stack began building,
then Docker Desktop's daemon reported that it could not start. No user-owned
container or daemon was stopped. Restarting Docker Desktop would interrupt
user-owned local containers, so it requires explicit authorization.

Until that rerun passes, Restaurant Ordering must remain **not accepted** even
though its direct generated Node 22 application journeys pass.

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
| Platform proof      | Draft, Publish, deterministic compile, direct generated-app Node 22 proof                | Current Workbench-driven Restaurant preview and cleanup release proof                           |

## Recommended next slices

1. Restore Docker Desktop and complete the current Workbench-driven Restaurant
   release gate without changing the user-owned local stack.
2. Design and implement **Restaurant order amendments and declared menu
   modifiers**: profile-declared option groups, bounded per-line selections,
   versioned Merchant changes/cancellations, inventory/audit/report effects,
   and generated Customer/Merchant surfaces. This is the most reusable next
   capability because it improves Restaurant and establishes a parameterized
   configuration pattern for future commerce profiles.
3. Add Customer identity and membership as a separate Policy/Identity slice;
   do not mix it with payment, loyalty, coupons, or real-money integrations.
4. Expand independent profiles from Factory-owned contracts—Appointment and
   Ticketing are candidates—only after fixed-version source studies and
   capability designs. External projects remain governed dependencies,
   provider contracts, or reference-only sources.

## Constraints

- Factory Application Graph remains the source of truth. Editors, AI,
  generated code, and providers are adapters.
- Credentials and raw model input/output never enter Git, reports, generated
  artifacts, state, logs, or screenshots.
- External source may not be copied without a fixed-version source-study,
  compatible license, notices, tests, and Factory-owned adapter boundary.
- Docker Node 22 is the release environment. Host Node 24 is useful only for
  development checks and emits the expected engine warning.
