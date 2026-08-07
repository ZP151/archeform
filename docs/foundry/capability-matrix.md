# Foundry capability matrix

## Purpose

The capability matrix is the deterministic, machine-computed readiness
report for the shared capability portfolio. One row per current family, one
verdict per family, and counts that always match the rows. The matrix is
honest by construction: a family is counted as eligible only when its
declared evidence record matches the current family digest and passes every
promotion requirement.

## Portfolio summary — 2026-08-08

| Count            | Value |
| ---------------- | ----- |
| Current families | 24    |
| Eligible         | 0     |
| Quarantined      | 24    |
| Rejected         | 0     |

**Zero families are eligible today, by design**: every current family
declares the strict binding contract (Task 6 Batch 0 repaired the 23
pre-existing manifests; Batch 1 declares it from birth), so none are
rejected; all 24 are quarantined solely for lacking two independent
Profile verifier locks. The matrix surfaces exactly this state so the
remaining work is visible and accountable.

## Families by category

| Category       | Families                                                                                                                   |
| -------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Core (9)       | audit, crud, workflow, notification, identity-context, identity-policy, policy-declarations, location-context, files-media |
| Commerce (9)   | catalog, cart, line-configuration, money-pricing, inventory, inventory-ledger, order, order-operations, simulated-payment  |
| Restaurant (6) | table-session, menu, ordering, kitchen, cashier, reporting                                                                 |

## Quarantined — manifest requirements met, two-Profile proof outstanding (24)

All current families satisfy the manifest-side requirements (binding
contract, verification state, fixtures, contract tests, output slots) and
are quarantined solely for lacking two independent Profile verifier locks:

- core.audit
- core.crud
- core.files-media
- core.notification
- core.workflow
- core.identity-context
- core.identity-policy
- core.policy-declarations
- core.location-context
- commerce.catalog
- commerce.cart
- commerce.line-configuration
- commerce.money-pricing
- commerce.inventory
- commerce.inventory-ledger
- commerce.order
- commerce.order-operations
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
