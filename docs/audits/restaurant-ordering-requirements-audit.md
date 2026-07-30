# Restaurant Ordering Requirements Audit

Updated: 2026-07-30

## Release conclusion

**Accepted for the implemented local Restaurant MVP.** The current-source
`Workbench → Publish → Control Plane → Worker preview → generated application
→ Stop → scoped cleanup` lifecycle passed with isolated Node 22 Customer and
Merchant browser journeys. See
[`../acceptance/restaurant-ordering-mvp.md`](../acceptance/restaurant-ordering-mvp.md)
for the immutable identifiers, redacted launch evidence, and exact cleanup
postconditions.

This acceptance does not establish the composition-first platform goal. The
current Profile remains a full starter Graph with Restaurant-specific compiler
behavior; the missing parameterized capability composition kernel is the next
platform priority.

Status labels:

- **Proven** — code and focused test or generated Node 22 evidence exists.
- **Partial** — an underlying field or operation exists, but the requested
  user-facing or governed product capability does not.
- **Absent** — no supported Graph capability, generated surface, or test.
- **Unverified** — implementation may exist, but the required evidence does
  not yet prove it at the stated scope.

## Customer application

| Capability                                        | Status  | Current evidence or gap                                                                                                                                |
| ------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| QR/table entry                                    | Proven  | Opaque `/table/:token` route, active-session validation, and token-digest storage; generated Customer journey resolves a table session.                |
| Login, saved store, location                      | Absent  | No identity, member, saved-store, or location-selection Graph model.                                                                                   |
| Manual table verification                         | Absent  | Customer entry intentionally accepts only an opaque session token.                                                                                     |
| Categories, search, details                       | Proven  | `menu-category`/`menu-item`, category/query API, name/description/price/preparation data, and Customer menu view.                                      |
| Dish images in the Customer view                  | Partial | `menu-item.imageUrl` is required by the profile but the Customer menu renderer does not render it.                                                     |
| Cart quantities and item note                     | Proven  | Customer line add/update uses `quantity` and `lineNote`; generated Node 22 evidence adds two noted items.                                              |
| Whole-order note                                  | Proven  | Submit persists `orderNote`; the generated journey verifies it in the receipt.                                                                         |
| Configurable specifications and cooking modifiers | Partial | Safe `order-line.modifiers` receipt projection exists, but the Customer UI sends an empty modifier array and there is no option-group/selection model. |
| Remove a cart line                                | Partial | The profile declares `cart.remove`, but the generated Customer UI exposes quantity update rather than a removal control.                               |
| Submit, simulated full payment, lifecycle state   | Proven  | Compiled flow progresses cart → submitted → paid → accepted → preparing → ready → served; Customer journey verifies payment and status.                |
| WeChat, Alipay, member balance, real money        | Absent  | Only bounded simulated `cash` and `card` methods exist.                                                                                                |
| Partial payment, split bill, suspended credit     | Absent  | One full payment applies to one order; there are no settlement or credit entities.                                                                     |
| History and receipt                               | Proven  | Session-bound status/history/receipt endpoints and generated routes are tested.                                                                        |
| Review, images, repeat order                      | Absent  | No review, media, customer identity, or reorder capability.                                                                                            |
| Membership, points, coupons, discounts            | Absent  | No member, loyalty, promotion, voucher, or price-rule model.                                                                                           |
| Reservation, waitlist, estimate                   | Absent  | No reservation or queue Graph capability.                                                                                                              |
| Pickup, delivery, tracking                        | Absent  | `fulfilmentType` is stored but no executable pickup/delivery workflow exists.                                                                          |

## Merchant application

| Capability                                       | Status  | Current evidence or gap                                                                                                                                  |
| ------------------------------------------------ | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Open, seat, close table                          | Proven  | Manager table transitions are compiled and exercised in the Merchant journey.                                                                            |
| Merge/move table, hold/reopen order              | Absent  | Table flow has no merge, transfer, hold, or reopen semantics.                                                                                            |
| Availability and stock adjustment                | Proven  | Merchant view supports availability and audited stock changes; runtime enforces optimistic versions.                                                     |
| Create/edit menu item or category                | Absent  | Merchant UI lists items and toggles availability/stock but has no authoring operation.                                                                   |
| Specifications, cooking methods, multiple prices | Absent  | Menu has one price; untyped modifier JSON is not merchant-configurable.                                                                                  |
| Inventory reserve/release/decrement/adjust       | Proven  | Profile effects and runtime tests cover submission reserve, cancellation release, payment decrement, adjustments, audit, and atomic rollback.            |
| Merchant order amendment, refund, correction     | Partial | Cancellation is audited and proven. Customer may update a cart line before submission, but Merchant amendments and post-payment correction do not exist. |
| Kitchen queue and preparation                    | Proven  | Deterministic `accept → preparing → ready` transitions compile and run.                                                                                  |
| Kitchen priority and table ordering              | Proven  | Ticket priority/table fields and deterministic sort tests exist.                                                                                         |
| Realtime kitchen updates                         | Absent  | Transactional outbox is present; no active realtime transport/provider reaches the generated UI.                                                         |
| Cashier payment and receipt                      | Proven  | Cashier supports simulated payment, receipt, and browser print invocation.                                                                               |
| Split settlement, accounting, hanging account    | Absent  | No provider contract or financial settlement model.                                                                                                      |
| Receipt/label/invoice printing                   | Partial | Browser printing exists; no governed printer or label provider exists.                                                                                   |
| Marketing and membership operations              | Absent  | No member/campaign/promotion capability.                                                                                                                 |
| Dashboard                                        | Partial | Sales, order count, preparation average, cancellations, and low stock are compiled; category/time/customer/repeat metrics and exports are absent.        |
| RBAC and audit                                   | Proven  | Restaurant roles, Casbin permissions, bounded actions, and audit effects are validated and tested.                                                       |
| Import, export, administrative lock              | Absent  | No such Graph capability or generated surface.                                                                                                           |

## Platform evidence

| Requirement                                           | Status                          | Evidence                                                                                                                                                                      |
| ----------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Factory-owned Graph and Golden assets                 | Proven                          | Restaurant profile validates entities, relations, roles, pages, operations, flow semantics, and Golden asset locks.                                                           |
| Draft → Publish → immutable compile                   | Proven at integration scope     | Graph, Control Plane, compiler, and Worker tests protect the published-only boundary.                                                                                         |
| Generated Web/API/PostgreSQL/Casbin/XState/tests/docs | Proven for direct compilation   | Restaurant compiler emits deterministic artifacts; Node 22 generated Compose passed.                                                                                          |
| Current Workbench-driven preview lifecycle            | Proven for local Node 22 scope  | The accepted isolated lifecycle created a Draft, published it, compiled 65 artifacts, ran Customer and Merchant journeys, stopped the same preview, and verified exact cleanup. |
| Command consistency and idempotency                   | Proven for implemented commands | Transactional Prisma operations use expected version, idempotency, audit, capability events, and outbox evidence.                                                             |
| Offline experience                                    | Absent                          | No service worker, cache, reconciliation policy, offline command queue, or offline E2E evidence.                                                                              |
| First load ≤1.5 seconds                               | Unverified                      | No performance budget or browser measurement.                                                                                                                                 |
| Payment success ≥99.9 percent                         | Unverified                      | Payment is simulated; no provider monitoring or reliability data exists.                                                                                                      |
| Security and privacy                                  | Partial                         | Opaque table tokens, session ownership, Casbin, and bounded projections exist; user authentication, retention, encryption policy, rate limiting, and compliance tests do not. |

## Dependency-ordered delivery

1. Implement **Parameterized Capability Composition v1** before adding more
   Restaurant-only behavior: typed bindings, additive Graph and executable
   target contributions, typed requirements/provides, immutable composition
   locks, and fail-closed collision/namespace validation.
2. Convert shared commerce assets so Restaurant and Simple Ecommerce compile
   from identical package versions with different validated bindings. Remove
   compiler-owned Restaurant behavior as each asset migrates.
3. Add **declared menu option groups and modifiers** as versioned Restaurant
   Graph assets: option groups, options, bounded rules, price deltas,
   availability, Customer selectors, and Merchant configuration.
4. Add **versioned order amendments** on the same line configuration model:
   Merchant add/remove/change operations, compensation rules, inventory
   differences, audit/outbox events, and report consistency. Post-payment
   refund remains a later payment-provider slice.
5. Add a reusable **Identity and Membership** foundation before loyal points,
   coupons, reviews, saved stores, member prices, or real payment.
6. Make `fulfilmentType` executable through a pickup slice, then a separate
   delivery/address/courier slice; add reservations/waitlist independently.
7. Introduce payment, printer, realtime, offline, and performance providers
   only behind their own contracts, fixtures, conformance tests, and release
   gates.
8. Expand Appointment, Ticketing, and other profiles only from Factory-owned
   contracts informed by fixed-version, license-reviewed source studies.
