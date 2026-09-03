# Foundry capability matrix

## Purpose

The capability matrix is the deterministic, machine-computed readiness
report for the shared capability portfolio. One row per current family, one
verdict per family, and counts that always match the rows. The matrix is
honest by construction: a family is counted as eligible only when its
declared evidence record matches the current family digest and passes every
promotion requirement.

## Portfolio summary — 2026-08-08 (Batch 5)

| Count            | Value |
| ---------------- | ----- |
| Current families | 27    |
| Eligible         | 16    |
| Partial          | 0     |
| Quarantined      | 11    |
| Rejected         | 0     |

**Sixteen families are eligible after Batch 5**: every current family
declares the strict binding contract (Task 6 Batch 0 repaired the 23
pre-existing manifests; Batch 1 declares it from birth), so none are
rejected. Batch 3 declared the isolated-verifier profile locks; Batch 4
recorded the reviewed verification digest literals on the four remaining
locked assets (commerce.cart, core.audit, core.crud, core.workflow); Batch
5 extended the three profile recipes deterministically — core.files-media
joined the eligible set with its second Profile lock and its reviewed
digest literals, and core.approvals, core.search and restaurant.menu
recorded their first Profile locks (still quarantined until a second
Profile locks them). The 11 without two-Profile proof stay quarantined.
The matrix surfaces exactly this state so the remaining work is visible
and accountable.

## Families by category

| Category       | Families                                                                                                                                                  |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core (12)      | audit, crud, workflow, notification, identity-context, identity-policy, policy-declarations, location-context, files-media, search, scheduling, approvals |
| Commerce (9)   | catalog, cart, line-configuration, money-pricing, inventory, inventory-ledger, order, order-operations, simulated-payment                                 |
| Restaurant (6) | table-session, menu, ordering, kitchen, cashier, reporting                                                                                                |

## Eligible — two-Profile locks and reviewed verification digests (16)

These families carry profile locks from two or more of the three isolated
verifier profile graphs (expense-approval, simple-ecommerce,
restaurant-ordering) at the current asset digest, and their evidence
records mirror the reviewed fixture and contract-test digest literals of
the current assets:

- commerce.cart
- commerce.catalog
- commerce.inventory
- commerce.inventory-ledger
- commerce.line-configuration
- commerce.money-pricing
- commerce.order
- commerce.order-operations
- core.audit
- core.crud
- core.files-media
- core.identity-policy
- core.location-context
- core.notification
- core.policy-declarations
- core.workflow

## Partial — two-Profile locks, verification digest literals outstanding (0)

No current family is partial: Batch 4 recorded the reviewed verification
digest literals on the four assets that lacked them (commerce.cart,
core.audit, core.crud, core.workflow), and Batch 5 recorded them on
core.files-media when its second Profile lock arrived.

## Quarantined — two-Profile proof outstanding (11)

These families satisfy the manifest-side requirements (binding contract,
verification state, fixtures, contract tests, output slots) but hold
fewer than two independent Profile verifier locks. Batch 5 recorded the
first Profile lock for core.approvals (expense-approval), core.search
(simple-ecommerce) and restaurant.menu (restaurant-ordering); a second
Profile lock is the remaining proof:

- core.approvals
- core.identity-context
- core.scheduling
- core.search
- commerce.simulated-payment
- restaurant.table-session
- restaurant.menu
- restaurant.ordering
- restaurant.kitchen
- restaurant.cashier
- restaurant.reporting

## Rejected — binding contract not declared in the current manifest (0)

No current family is rejected: every manifest declares the strict binding
contract after the Task 6 Batch 0 repair.

## How to read the matrix

- The matrix is computed from the current family list and the declared
  evidence records; it cannot be argued with or overridden.
- Repairing a manifest changes the family digest, which invalidates its
  evidence record until the record is deliberately re-declared.
- A family moves to eligible only after the manifest is complete, the
  evidence record is re-declared, and two independent Profile verifier locks
  are recorded.
- See the [promotion policy](promotion-policy.md) for the verdict
  definitions and the counted-family requirements.
