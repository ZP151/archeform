# Composable Order Operations and Profile Expansion Design

Date: 2026-08-01

## Decision

Factory Pilot will not complete Restaurant Ordering by adding a larger
Restaurant-specific compiler or by treating a cloned restaurant repository as
the product. It will grow an executable, package-owned operations kernel that
can be selected by multiple Application Graph Profiles.

The first expansion establishes the reusable foundations necessary for a
production-oriented restaurant experience while proving that the same assets
can compile an ecommerce application. It also turns Workbench Home into a
truthful capability-portfolio surface: it will show what each Profile can
currently generate, which capabilities are present, and which requested
operations remain unavailable.

## Current state

Restaurant Ordering already has version-locked assets for table session,
ordering, kitchen, cashier, reporting, catalog, cart, inventory and audit. It
compiles a bounded local application with table-session entry, menu browsing,
configured lines, cart, simulated payment, kitchen transitions, cashier
actions, and basic reporting.

It does not yet prove order amendment, durable idempotent transactions,
customer membership, promotions, booking, waitlist, delivery, actual payment,
printing, realtime transport, offline reconciliation, or a package-owned
target projection for every Restaurant surface. The catalog contains 19
capability families and 38 versioned assets, but that is not evidence of
equivalent business completeness across five Profile starters.

## Product model

```text
Published Application Graph
  -> Profile Recipe and exact component locks
  -> package input validation
  -> package-owned target contributions
  -> generated Web/API/database/tests/docs
  -> isolated local preview

Fixed external repository
  -> immutable quarantine snapshot and evidence
  -> automatic reuse classification
  -> non-promoting Candidate scaffold
  -> package or Provider conformance
  -> selectable Golden component
```

The Graph remains the sole semantic source of truth. A Profile recipe merely
seeds a Draft and package locks; generated targets consume only a Published
Revision and its validated Composition Lock.

## First expansion: Order Operations Kernel

### `commerce.transaction/v1`

This component owns the generic command envelope required by any stateful
commercial flow:

- idempotency key and persisted command receipt;
- expected aggregate revision and stale-write rejection;
- database transaction boundary;
- immutable audit fact and outbox event written with the domain mutation;
- deterministic failure response with no partial inventory, payment, or
  report changes.

It has no payment provider or arbitrary effect execution. Restaurant and
Ecommerce bind their own Order, payment, inventory and audit Graph symbols to
the same component contract.

### `commerce.order-amendment/v1`

This component owns a change set before the declared irreversible fulfilment
boundary:

- add, remove, quantity, modifier, line-note and order-note changes;
- server-side recalculation from current catalog configuration;
- inventory reservation delta and compensation;
- revision conflict detection and idempotent replay;
- audit and outbox evidence; and
- a policy-checked cancellation path.

Restaurant uses the component for a table order; Ecommerce uses it for a cart
or pending order. Neither target may infer behavior from a Profile label.
Paid refunds, split settlement, credit, tax calculation and real payment
providers are deliberately separate later packages.

### Package-owned generated surfaces

The selected package adapters provide only declared target slots:

- customer cart and order-status blocks;
- merchant change-order block;
- Nest route/controller/service contributions;
- Prisma schema/migration additions;
- XState transitions and role journeys;
- fixtures, API tests and generated-document references.

The Compiler validates slots, order and dependencies. It must not retain a
Restaurant condition after a concern has moved into an adapter.

## Workbench Home: Profile readiness instead of aggregate-only counts

Workbench Home receives a source-free, read-only `ProfileReadinessV1` summary
for each starter Profile:

```ts
type ProfileReadinessV1 = {
  profile: string;
  label: string;
  generatedTargets: readonly (
    "simulator" | "web" | "api" | "database" | "tests" | "docs"
  )[];
  capabilityState: readonly {
    key: string;
    status: "available" | "partial" | "planned" | "provider-required";
  }[];
  latestCompilation: "none" | "queued" | "running" | "succeeded" | "failed";
};
```

The Home UI displays concise, filterable Profile cards and coverage chips.
It never displays raw source URLs, evidence blobs, raw AI prompts/responses,
credentials or arbitrary package metadata. The User can select a Profile,
open its Graph, see exactly what the generated target supports, and navigate
to candidate lanes for planned capability groups.

## Automated external reuse

The source-intake pipeline already creates quarantined Candidate proposals
from eligible fixed records. This expansion adds an automatic
`CandidatePortPlanV1` projection for source-study candidates. It records only
the immutable source identity, permitted reuse mode, exact intended Factory
interface, discovered language/runtime compatibility, requested source paths,
notice obligation identifiers, and required conformance fixtures.

It must not contain source bytes, credentials, raw scanner output, arbitrary
code, provider configuration, mutable Graph data, or Golden authority. A
permissively licensed TypeScript utility with a clean bounded path can proceed
to a Factory-owned port automatically after the generated conformance suite
passes. A whole vertical runtime, mixed-license directory, incompatible
language runtime, GPL/AGPL path, or provider-dependent module remains a
Provider or reference-only lane.

Initial high-leverage lanes are:

| Factory capability                      | Reuse lane                           | Candidate sources               | Profiles enabled                                    |
| --------------------------------------- | ------------------------------------ | ------------------------------- | --------------------------------------------------- |
| Transaction, order, pricing, fulfilment | source study / Provider comparison   | Medusa, Mercur, Saleor, Bagisto | Restaurant, ecommerce, retail, grocery, marketplace |
| Menu, table, reservation, queue         | source study                         | TastyIgniter                    | Restaurant, appointment, venue, hospitality         |
| Identity, membership, access            | Provider                             | Keycloak, Appwrite              | every authenticated profile                         |
| Notifications and integrations          | Provider / selective connector study | Activepieces, Novu              | every event-driven profile                          |
| Documents and receipts                  | Provider                             | Gotenberg                       | restaurant, retail, invoicing, contracts            |
| Search and operational analytics        | Provider / dependency                | Meilisearch, Apache ECharts     | commerce, CRM, knowledge, support                   |

## Explicit exclusions for this expansion

- No real money movement, payment credentials, settlement or refunds.
- No Graph-owned provider credentials or source-repository code execution.
- No whole-repository import, submodule, generated-app source import, or
  compiler fallback based on a Profile name.
- No claim that a Candidate, source study, or component count equals an
  accepted production Profile.

## Acceptance evidence

1. Restaurant and Ecommerce bind the same immutable transaction and order
   amendment package versions using different Graph symbols.
2. Generated applications reject stale revisions, replay idempotent commands,
   and leave inventory, audit and outbox state unchanged on a failed command.
3. Restaurant accepts an allowed pre-fulfilment amendment and records its
   inventory, audit and reporting deltas; the same journey passes for
   Ecommerce.
4. A non-selected Profile cannot emit any route, migration, page block, test
   fixture, or effect from either package.
5. Workbench Home displays source-free per-Profile readiness and updates after
   compilation status changes.
6. An eligible fixed source produces a deterministic `CandidatePortPlanV1`;
   prohibited or incompatible source paths fail closed without an installed
   package, source copy, Graph mutation, or provider activation.

## Follow-on sequence

Once the Order Operations Kernel passes two-Profile acceptance, the next
packages are `commerce.fulfilment`, `identity.member`,
`scheduling.reservation`, and `commerce.pricing`. Each adds a second Profile
only when its shared component contract and generated journey are proven.
