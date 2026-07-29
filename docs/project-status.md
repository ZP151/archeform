# Factory Pilot delivery status

Updated: 2026-07-30

## Current milestone

The TypeScript Application Graph foundation is implemented. The active product
decision is to turn the existing Restaurant Ordering starter into the first
substantive, independently accepted business Profile, while making the
Workbench home useful for discovering, creating, and operating Profiles.

## Verified evidence

- `@factory/capabilities`: 26 unit tests passed on 2026-07-30.
- `@factory/compiler`: 88 unit tests passed on 2026-07-30.
- `@factory/workbench`: 55 unit tests passed on 2026-07-30.
- The current Restaurant Ordering starter declares menu, cart, order,
  inventory, simulated-payment, notification, audit, and workflow
  capabilities. Its focused browser journey covers menu selection, cart
  checkout, simulated payment, kitchen preparation, and ready status.
- The Workbench implements mutable Drafts, immutable Published revisions,
  compilation status, Graph editing surfaces, guided profile creation, and
  generated-artifact inspection.

## Gaps to the Restaurant Ordering product target

- The generated Restaurant application is a minimal three-route example, not
  a customer and merchant product suite.
- There is no table or QR context, order- or line-level notes, table lifecycle,
  cashier workflow, cancellation/change audit, kitchen prioritisation,
  receipt, operational reporting, or offline customer experience.
- Authentication is role simulation rather than customer identity and scoped
  merchant access.
- The Workbench has creation and editor surfaces but no functional home that
  surfaces product portfolio, recent drafts, compilation health, or Profile
  readiness.
- Existing end-to-end generated-app coverage is opt-in and has not yet become
  a reproducible Restaurant acceptance run in a Node 22 environment.

## Risks and constraints

- The local host runs Node 24.18.0; the repository supports Node >=22.11.0 and
  <23. Docker-based verification remains the release environment.
- Open-source projects must enter only as pinned dependencies, documented
  adapters/providers, or approved source studies. Whole-repository copying is
  prohibited.
- The prior preview-runtime hardening slice has implementation and focused
  test evidence, but its final independent re-review was interrupted by this
  product reprioritisation. It is not release-accepted.

## Next decision

Approve a bounded first Restaurant Ordering acceptance slice. The recommended
slice is dine-in ordering: QR/table context, menu customisation, cart,
simulated payment, kitchen queue, cashier action, inventory adjustment, audit,
and a small merchant dashboard. Delivery, reservations, loyalty, coupons,
reviews, and real payment integrations remain separately composable follow-up
capabilities.
