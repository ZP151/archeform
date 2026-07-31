# Profile Capability Supply Chain Design

Date: 2026-08-01

## Decision

Factory Pilot will extend coverage through a governed capability supply chain,
not by hand-building a monolithic Restaurant application or importing complete
upstream applications. Restaurant Ordering is the first proof because its
customer, merchant, kitchen, inventory, payment, and reporting concerns
generalise to retail, ecommerce, reservations, and service operations.

The Application Graph remains the source of truth. A source repository,
provider, visual editor, or generated application never becomes a source of
truth for a Factory Profile.

## Current evidence and gap

The local platform compiles five Profile starters: Expense Approval, Restaurant
Ordering, Simple Ecommerce, Retail Counter, and Grocery Pickup. The registry
contains 19 capability families and 33 versioned physical packages. Restaurant
has locally accepted table sessions, menu browsing, carts, stock reservation,
simulated payment, kitchen transitions, cashier actions, audit, and basic
reporting.

That is not a complete restaurant product. Identity, membership, promotions,
reservations, waitlists, delivery, real settlement, split payment, refunds,
printer delivery, realtime transport, offline conflict handling, and operational
exports are absent or intentionally narrow. External intake can acquire a fixed
source into quarantine and verify redacted evidence, but it cannot yet create a
Candidate proposal.

## Product model

    Portfolio source record
      -> fixed-reference acquisition and evidence
      -> non-promoting Candidate proposal
      -> Factory-owned package or Provider adapter
      -> Profile recipe with validated Graph bindings
      -> Published Graph compilation
      -> generated application and evidence

The Candidate stage is declarative. It contains a proposed Factory key, small
declared schemas, safe fixtures, an adapter projection, and a conformance plan.
It contains no copied upstream source, source bytes, credentials, raw AI
content, executable snippets, URLs, arbitrary SQL, or Graph mutation authority.

## Reuse lanes

| Lane | Use | Required outcome |
| --- | --- | --- |
| Pinned dependency | A small technical primitive such as Puck or XState | Pinned version, notice, wrapper, regression and removal test |
| Provider adapter | A mature external runtime such as Keycloak or Gotenberg | Factory contract, fake provider, conformance, redaction and replacement path |
| Selective source study | A small permissively licensed implementation fragment | Fixed commit, exact paths, copy ledger, notice, fixture, conformance and removal test |
| Reference only | Domain vocabulary or architecture such as ERPNext or Odoo | No copied source, package, UI asset, schema, or runtime |

Whole-repository imports, Git submodules, and source-directory imports from
external repositories are prohibited. A permissive licence enables evaluation;
it does not grant an automated source-copy decision.

## Restaurant capability map

| Capability subgraph | Current state | First Factory target | Cross-profile use |
| --- | --- | --- | --- |
| Table/session and location context | Present, Restaurant-specific | typed location/session bindings | pickup, appointment, venue, counter sale |
| Catalog and configured line | Present or partial | menu options, modifiers, price deltas, availability | ecommerce, retail, spare parts, booking extras |
| Cart, order, stock and audit | Present; generic kernel incomplete | durable order amendment and compensation | ecommerce, retail, grocery, service parts |
| Customer identity and membership | Gap | identity context, member tier, wallet and points projection | CRM, B2B portal, loyalty, subscriptions |
| Pricing and promotion | Gap | rules, coupons, member price and calculated discount projection | commerce, booking, billing |
| Reservation and waitlist | Gap | availability, reservation, queue, estimate and reminders | restaurant, appointments, rooms, rentals |
| Fulfilment | Narrow pickup field | pickup, delivery address, dispatch state and tracking events | grocery, delivery, field service, ecommerce |
| Kitchen and realtime | Kitchen flow present; transport absent | transport-neutral order event contract | service dispatch, support queue, fulfilment |
| Settlement and printing | Simulated full payment and browser print | settlement contract, receipt and label render Provider | invoices, certificates, reports, retail |
| Analytics and export | Basic Restaurant metrics | aggregate metric contract, governed export and dashboard projection | every Profile family |

The next executable Restaurant capability will be commerce.order-amendment/v1.
Merchant add, remove, quantity, modifier, and cancellation changes must be
versioned; calculate inventory differences; preserve audit and outbox facts; and
project recalculated totals and reports. It is a package capability, not a
Restaurant compiler branch.

## Workspace Home

Workbench Home will become a portfolio operation surface with four compact,
action-oriented panels:

1. Profile catalog: supported recipes, required package count, generated
   applications, and coverage state.
2. Capability coverage: Golden, Candidate, Provider, reference-only, and gap
   counts by capability family.
3. Source intake: fixed-reference records, quarantine outcomes, Candidate
   status, and policy-only exclusions. It never displays source content,
   credentials, raw prompts, or raw scanner output.
4. Compilation health: queue, failed compilations, latest successful targets,
   and links to immutable evidence.

The browser reads typed summaries only. It does not calculate trust or read
filesystem data.

## First implementation boundary

Portfolio Candidate Intake and Workspace Portfolio Intelligence will add:

- deterministic conversion of a completed, verified, intake-eligible Portfolio
  source into a non-promoting CandidateProposalV1;
- explicit Factory-authored source-to-candidate blueprints;
- rejection of policy-only, unverified, mismatched, source-byte-bearing, or
  arbitrary-effect proposal inputs;
- a source-free public Portfolio statistics projection consumed by a Control
  Plane read-only summary endpoint; and
- Workbench Home panels for Profile, capability, source-intake, and compilation
  summaries.

It does not copy upstream source, create a Golden package, invoke an upstream
runtime, create Provider configuration, or change a Published Graph. The
Control Plane and Workbench must not import @factory/external-intake. They
consume only a separately published, source-free projection with numeric
Portfolio counts and fixed safe labels. The External Intake package verifies
that projection against its full internal Portfolio metadata.

## Acceptance criteria

- A fixed, verified, eligible Portfolio source yields exactly one deterministic
  Candidate proposal with declarative artifacts only.
- Policy-only, absent evidence, mismatched acquisition, source path, source
  bytes, credential-shaped value, unsafe effect, or duplicate proposal inputs
  fail closed without registry mutation.
- The Candidate Registry can persist the proposal in quarantined state and pass
  its fixture conformance lifecycle.
- Workspace summary reports only typed counts and stable public identifiers.
  It omits source content, evidence blobs, credentials, prompts and responses.
- Workbench Home shows all four panels in light and dark themes without
  changing Draft -> Publish -> immutable Compilation.
- Existing Control Plane, External Intake, Capabilities, Compiler, and
  Workbench tests remain green.

## Source-study priorities

1. TastyIgniter: Restaurant menu, reservation, multi-location, pickup, and
   delivery vocabulary; an MIT source-study candidate, not a runtime import.
   It remains source-study-only until a separately validated PHP inventory
   adapter exists. The first TypeScript Candidate-proof uses Medusa as a
   provider-adapter candidate, never as a runtime import.
2. Medusa and Saleor: independent commerce comparisons used to define a neutral
   Provider contract.
3. Keycloak, NATS, Gotenberg, Workbox, and OpenTelemetry: Provider or pinned
   dependency studies for identity, events, documents, offline shell, and
   observability.
4. Superset: Analytics Provider study with Factory-generated aggregates and
   policy-filtered queries.
5. Odoo, ERPNext, Open Source POS, and Twenty: reference-only architecture and
   domain vocabulary until path-specific licensing and compatibility decisions
   are recorded.

## Deferred work

Production identity, payments, printing, realtime, offline mutation replay,
and cloud deployment each need their own Provider contract and Profile
acceptance suite. Restaurant order amendment, reservation/waitlist, and
pricing/promotion are independent capability-package projects after this first
supply-chain and Home-intelligence project.
