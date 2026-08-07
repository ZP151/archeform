# Foundry capability matrix

## Purpose

The capability matrix is the deterministic, machine-computed readiness
report for the shared capability portfolio. One row per current family, one
verdict per family, and counts that always match the rows. The matrix is
honest by construction: a family is counted as eligible only when its
declared evidence record matches the current family digest and passes every
promotion requirement.

## Portfolio summary — 2026-08-08

| Count | Value |
| --- | --- |
| Current families | 23 |
| Eligible | 0 |
| Quarantined | 9 |
| Rejected | 14 |

**Zero families are eligible today, by design**: no family holds two
independent Profile verifier locks yet, and 14 families have not declared a
binding contract in their current manifests. The matrix surfaces exactly
this state so the remaining work is visible and accountable.

## Families by category

| Category | Families |
| --- | --- |
| Core (8) | audit, crud, workflow, notification, identity-context, identity-policy, policy-declarations, location-context |
| Commerce (9) | catalog, cart, line-configuration, money-pricing, inventory, inventory-ledger, order, order-operations, simulated-payment |
| Restaurant (6) | table-session, menu, ordering, kitchen, cashier, reporting |

## Quarantined — manifest requirements met, two-Profile proof outstanding (9)

These families satisfy the manifest-side requirements (binding contract,
verification state, fixtures, contract tests, output slots) and are
quarantined solely for lacking two independent Profile verifier locks:

- commerce.money-pricing
- commerce.order-operations
- core.identity-policy
- core.policy-declarations
- restaurant.cashier
- restaurant.kitchen
- restaurant.ordering
- restaurant.reporting
- restaurant.table-session

## Rejected — binding contract not declared in the current manifest (14)

These families are rejected because their current manifests do not declare a
binding contract. A manifest repair is a prerequisite before any promotion
evidence can be considered:

- core.audit
- core.crud
- core.notification
- core.workflow
- core.identity-context
- core.location-context
- commerce.catalog
- commerce.cart
- commerce.line-configuration
- commerce.inventory
- commerce.inventory-ledger
- commerce.order
- commerce.simulated-payment
- restaurant.menu

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
