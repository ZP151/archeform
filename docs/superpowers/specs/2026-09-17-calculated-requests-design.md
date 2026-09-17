# Calculated requests and Equipment admission

## Product outcome and authority

An ordinary user can describe an equipment funding request and receive a local
responsive approval application assembled from reviewed definition data. Entering
quantity and estimated unit price produces a consistent total automatically.
Managers can return or approve the request; the requester corrects the same record
and resubmits it. Users do not choose Graph versions, templates or lifecycle steps.

The founder has authorized continuing this roadmap. Stable serialization and
runtime behavior still require the existing Tech Lead ADR and independent
standing-acceptance process before implementation. ADR-0070 is the proposed
technical authority; this product design does not replace it or authorize a new
runtime, package, provider, deployment or currency-settlement policy.

## Approach selection

| Approach                                                                                            | Delivery effect                                                                                                      | Decision                                      |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| One registered quantity-times-unit-price calculation with strict operands and a server-owned result | Reuses the Approval lifecycle, controls, summaries and persistence; bounded reusable semantics unlock a distinct job | Selected direction, subject to ADR acceptance |
| Arbitrary user/model expressions                                                                    | Requires a wider language, evaluation and security contract before its benefit is demonstrated                       | Defer                                         |
| Equipment-specific runtime conditionals                                                             | Adds a new code-maintenance obligation for each product and weakens data-based assembly                              | Reject                                        |

## Business slice

The Equipment request contains an item identity, required positive integer
quantity, required positive estimated unit price, derived total and justification.
The resulting total is an estimate in consistent unspecified units; no currency
code, rounding, payment, reimbursement, stock reservation or supplier ordering is
inferred. Material demands for those outcomes remain clarification. Private
requester identity, tenant isolation and real procurement integrations are not
provided by local selectable demo roles.

Quantity and unit price are editable in allowed request states. The total is
visible but never an editable source of truth. The server calculates it inside
the existing atomic mutation, validates authoritative stored values before
submission and rejects tampering without audit, receipt, version or state changes.
The exact finite-number/Decimal policy is frozen in ADR-0070; no approximate or
silent rounding fallback may be introduced during implementation.

Use the generic requester/reviewer/auditor pattern with employee, manager and
finance labels. Keep one-stage return, correction, resubmission, approval, role
denial, stale-write rejection and exact retry after restart. Distinctness from
Purchase Request rests on authoritative quantity/unit-price/derived-total
semantics, not changed labels or decorative assets.

## Presentation and reuse

Keep the approved cobalt workspace, navigation, icons, local illustration,
responsive cards and decision history. Root searched approved registries first:
existing cart-line and order-summary assets expose quantity/price/output patterns,
but their commerce actions do not own Approval recovery. Reuse Approval's native
field controls, form state, summary slots and history projection. A computed value
uses a read-only output with a clear label; no fabricated date or enum is added
solely to satisfy an older selector. Exact summary placement follows the accepted
structural profile, and business identity plus quantity/cost must be scannable.

Inspect actual primary, input, validation, pending/recovery and outcome states at
390/768/1440. Check loaded CSS/icons/media, 44px controls, no overflow, reachable
primary actions, dark mode and useful missing-media behavior. Existing assets and
unchanged family evidence are reused; one ordinary definition review includes
visual acceptance after the shared capability's required boundary review.

## Measurable acceptance

1. Preserve all six existing canonical definitions, provider projections and
   complete current generated bundles, plus the untouched historical four/five
   baselines. The new six-entry fixture is captured before implementation at
   `436484fc`; never regenerate a failing baseline.
2. Prove exact expected multiplication, invalid quantities/prices, unsupported
   products, stale/tampered derived data, malicious client totals and boundary
   behavior with focused failing tests before implementation.
3. Exercise actual PostgreSQL create/edit/reload, submit/return/correct/resubmit/
   approve, competing updates, lost-response retries and API restart. Editing
   either operand recalculates the same record's total and remains atomic.
4. Produce two distinct approved equipment requests; visible item/quantity/cost
   summaries and history distinguish them without opening Details. Verify
   justification and return reasons after reload.
5. Drive an authored selection through actual Publish, immutable Compilation,
   verification and preview within the prepared-local 300,000ms target. Record
   attempts, questions, technical handoffs and in-run manual rescues separately.
   Authored fixtures do not establish model selection or ordinary-user outcomes.
6. Count Equipment as the seventh locally accepted definition only after all
   applicable business/UI checks, independent review and exact resource cleanup.
   It remains within the existing Approval family; family count does not increase.

## Engineering optimization handoff

After this local slice passes, produce a separate detailed delivery-engineering
plan grounded in measured source, test, build, evidence and coordination costs.
Prioritize repeatable definition admission, module ownership, bounded automated
regression selection, cached local build/setup and concise current-state records.
Name redundant steps to remove and safeguards to retain, with owners, disjoint
paths, acceptance metrics and rollback. No broad rewrite or new framework is
implicitly authorized by a recommendation. Preserve business and UI acceptance
while reducing repeated work.
