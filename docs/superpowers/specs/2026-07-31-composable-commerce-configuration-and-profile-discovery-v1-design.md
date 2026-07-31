# Composable Commerce Configuration and Profile Discovery v1 design

Status: proposed for controller review on 2026-07-31.

## Purpose

Turn the current Order Operations foundation into a discoverable, reusable
capability kernel rather than a set of hidden starter profiles or Restaurant
special cases.

The release has two coupled outcomes:

1. A Workbench user can discover and create every registered Profile from one
   authoritative Profile catalog, inspect its locked capabilities, and see its
   lifecycle/readiness without a duplicated frontend list.
2. Restaurant Ordering, Simple Ecommerce, Retail Counter, and Grocery Pickup
   can compose one evolved generic package version,
   `commerce.line-configuration@1.1.0`, and one new package,
   `commerce.order-amendment@1.0.0`.

The release deliberately does not try to finish every restaurant feature. It
provides reusable components for configurable products, price decisions, and
auditable order changes. Reservation/waitlist, identity/loyalty, delivery,
real payments, realtime transport, printing, and offline commands remain
separate capability slices with their own contracts.

## Evidence and current gap

The current source tree contains five `FactoryProfile` values:

- `expense-approval`
- `restaurant-ordering`
- `simple-ecommerce`
- `retail-counter`
- `grocery-pickup`

The current Workbench home and guided-creation frontend duplicate an
incomplete, three-item profile list. Retail Counter and Grocery Pickup can be
composed and compiled, but a business user cannot choose them from the
Workbench. The UI also labels all listed Profiles as Golden even though the
Golden lifecycle applies to their locked capability packages, not to a Profile
string itself.

Restaurant Ordering proves a local, generated user and merchant workflow for
table session, menu browsing, cart, simulated payment, kitchen fulfilment,
cashier activity, inventory adjustment, audit, a limited dashboard, and the
existing `commerce.line-configuration@1.0.0` asset. That asset is currently
locked by the commerce recipes but its manifest only advertises Restaurant and
Ecommerce, and it lacks the cross-profile snapshot semantics and compiled
runtime contract required by this release. It does not provide post-submission
order amendments, reservations, waitlists, delivery, real payments,
membership, promotions, realtime transport, or offline command replay.

## Product boundary

### Included

- An authoritative `FactoryProfileDescriptorV1` exported by
  `@factory/capabilities` and consumed by all Workbench profile discovery and
  guided creation UI.
- A profile catalog Home view that shows every descriptor, its category,
  description, capability-package count, optional capability choices, locked
  package maturity, and direct create action.
- `commerce.line-configuration@1.1.0`, an immutable successor to the existing
  Golden `1.0.0` package, for item option groups, options, bounded selection
  constraints, availability, price snapshots, and declared price adjustments.
- `commerce.order-amendment@1.0.0`, a physical Golden capability package for
  versioned merchant order modifications after submission and before an
  irreversible fulfilment boundary.
- Compiled API, Prisma schema/migrations, Casbin policy, XState transitions,
  customer and merchant PageModel projections, fixtures, test journeys,
  audit, inventory compensation, and outbox evidence for both capabilities.
- Parameterized bindings that allow the same package versions to target
  `menu-item`/`order`, `product`/`order`, `retail-item`/`counter-sale`, and
  `grocery-item`/`pickup-order` without compiler dispatch by Profile name.

### Explicitly excluded

- Phone, WeChat, Alipay, or provider-backed customer identity.
- Real payment, refunds, split settlements, stored value, credit, and money
  movement. An amendment may produce a bounded settlement-adjustment intent;
  it cannot call a payment provider.
- Reservations, waitlists, delivery, pickup dispatch, reviews, loyalty,
  coupons, campaigns, table merge/transfer, printer providers, realtime
  delivery, offline mutations, performance SLA proof, or AI recommendations.
- Whole-source-tree vendoring or runtime activation of TastyIgniter, Bagisto,
  InvenTree, Medusa, Saleor, or any other external project.

## Authoritative Profile catalog

`@factory/capabilities` exports one immutable catalog. A descriptor is
metadata about an approved Factory composition recipe; it is not a mutable
Graph, a Golden asset, or executable code.

```ts
export type FactoryProfileDescriptorV1 = {
  readonly apiVersion: "factory.profile-descriptor/v1";
  readonly profile: FactoryProfile;
  readonly label: string;
  readonly description: string;
  readonly category: "approval" | "commerce";
  readonly scenarioTags: readonly string[];
  readonly requiredCapabilities: readonly string[];
  readonly defaultOptionalCapabilities: readonly OptionalCapabilityKey[];
};

export function listFactoryProfiles(): readonly FactoryProfileDescriptorV1[];
export function getFactoryProfileDescriptor(
  profile: FactoryProfile,
): FactoryProfileDescriptorV1;
```

The catalog is derived from the same immutable Profile-composition recipe that
creates an initial Draft. It fails closed if a descriptor references an
unknown profile, required capability, or optional capability. It may not
contain package source, URLs, local paths, raw prompts/responses, credentials,
or arbitrary rendering instructions.

`apps/workbench/lib/profile-starters.ts` becomes a thin compatibility-free
projection of `listFactoryProfiles()`. The Home page and Guided Creation drawer
must both consume that projection. The UI calculates package maturity from
each selected composition lock and labels it `Verified capability packages`,
not `Golden Profile`.

## Generic line-configuration capability

`commerce.line-configuration@1.0.0` remains immutable. The release creates
`commerce.line-configuration@1.1.0` as its next physical asset version with a
new digest, manifest, adapter declaration, templates, fixtures, and
package-local contract tests. It does not mutate or replace an existing
Published Composition Lock.

It binds the following Graph symbols:

```ts
type LineConfigurationBindingsV1 = {
  readonly catalogEntity: GraphEntityBinding;
  readonly optionGroupEntity: GraphEntityBinding;
  readonly optionEntity: GraphEntityBinding;
  readonly orderLineEntity: GraphEntityBinding;
  readonly merchantRole: GraphRoleBinding;
  readonly customerRole: GraphRoleBinding;
  readonly catalogRoute: GraphRouteBinding;
  readonly merchantRoute: GraphRouteBinding;
};
```

Every configured Profile declares these domain concepts using its own naming
and IDs. A Profile validator proves fields and relations before Publish:

| Concept                    | Required fields                                                                          | Required relation       |
| -------------------------- | ---------------------------------------------------------------------------------------- | ----------------------- |
| catalog option group       | `name`, `selectionMode`, `minimumSelections`, `maximumSelections`, `active`, `sortOrder` | owned by catalog entity |
| catalog option             | `label`, `priceDelta`, `available`, `sortOrder`                                          | owned by option group   |
| order-line option snapshot | `label`, `priceDelta`, `quantity`                                                        | owned by order line     |

`selectionMode` is the closed enum `single | multiple`; maximum selection must
be positive, no lower than minimum, and never exceed the declared number of
available options. A selected option is copied into an order-line snapshot
with its label and price delta at order time. Later menu changes therefore do
not rewrite historical receipts, reports, inventory evidence, or amendments.

The package compiles:

- Customer product/menu configuration controls that emit only validated option
  identifiers and quantities.
- Merchant option-group and option management pages using declared fields and
  Casbin guards.
- Server-side selection, availability, price-delta, and total calculations.
- Prisma structures, migrations, fixture data, API validation, page bindings,
  generated journey tests, and API documentation.

The client cannot provide a price, total, availability result, option label,
or arbitrary option schema as an authority.

## Generic order amendment capability

`commerce.order-amendment@1.0.0` is a second physical package. It has no
authority over payment providers and does not permit a generic client PATCH of
an order.

```ts
type OrderAmendmentBindingsV1 = {
  readonly orderEntity: GraphEntityBinding;
  readonly orderLineEntity: GraphEntityBinding;
  readonly amendmentEntity: GraphEntityBinding;
  readonly inventoryLedgerEntity: GraphEntityBinding;
  readonly merchantRole: GraphRoleBinding;
  readonly customerRole: GraphRoleBinding;
  readonly merchantRoute: GraphRouteBinding;
  readonly amendmentFlow: GraphFlowBinding;
};
```

Every amendment command requires an order ID, expected version, idempotency
key, non-empty reason, and a closed command input. Supported v1 commands are
line quantity change, line add, line removal, and whole-order cancellation
before the declared irreversible fulfilment state. Every successful command
in one database transaction must:

1. validate actor policy, order state, expected version, and replay key;
2. append an immutable amendment record that captures before/after totals and
   affected line snapshots;
3. reserve, release, or restore inventory through the existing ledger rules;
4. calculate a server-authoritative settlement-adjustment intent without
   moving money;
5. update the order version and declared FlowModel state; and
6. append audit and outbox evidence.

The generated Merchant UI shows bounded choices and a conflict/retry state.
The customer UI can read a redacted amendment/status projection only for an
order it is entitled to read. The package must reject duplicate idempotency
keys with different payloads, stale versions, unavailable configured options,
forbidden actor roles, modifications after fulfilment, and every command that
would leave inventory/audit/outbox records inconsistent.

## Package composition and compiler rule

The four commerce Profiles select the exact same current versions of
`commerce.line-configuration@1.1.0` and `commerce.order-amendment@1.0.0`. Their
bindings differ only in Graph symbols. Compiler selection is keyed exclusively
by the immutable Composition Lock and validated bindings, never by a Profile
label, entity literal, route name, source path, or generated-output path.

Restaurant may retain its separate table-session, kitchen, cashier, and
reporting packages. Those packages must consume the generic configured-line
and amendment outputs through declared contracts; they cannot fork or replace
the generic price, amendment, inventory, or audit authority.

## Workbench behaviour

The Home catalog presents all profile descriptors in stable category/name
order. Each card has a compact capability count, scenario tags, package
verification summary, number of existing applications, and `Create` action.
The Guided Creation drawer takes its template list, description, and optional
capability toggles from the same catalog. A newly added descriptor therefore
appears in both locations without changing Workbench business data.

The Profile catalog is summary-only. It never exposes Draft Graph bodies,
source artifacts, package templates, source-study contents, raw AI traffic,
credentials, or provider configuration. Selecting a descriptor still creates a
mutable Draft, and the existing Draft -> Publish -> immutable Compilation
lifecycle remains unchanged.

## Source reuse and supply-chain boundary

The existing external portfolio remains valuable for fast discovery but not
direct runtime adoption:

- TastyIgniter (MIT) is a source-study input for restaurant configuration,
  reservation, table, and ordering terminology.
- Bagisto (MIT) is a source-study input for catalog, promotion, checkout, and
  POS vocabulary.
- InvenTree (MIT) is a source-study input for stock movement and traceability
  scenarios.
- Medusa (MIT) and Saleor (BSD-3-Clause) are paired source-study inputs for
  neutral provider boundaries, not generated-app dependencies.

Fresh External Intake verification confirms its former P1 boundaries are
already repaired: a malformed or sensitive item is blocked independently
inside a batch, and a source-study projection runtime-validates and rejects
undeclared fields. The verified boundary does not promote a Candidate, copy
source, or add a package. A fixed-reference batch can therefore produce
fixed-SHA, licence, notice, SBOM, scanning, module-inventory, and quarantined
Candidate evidence. Only an exact-path source study with attribution, tests,
removal path, and an independently authored Factory adapter may lead to a
source-fragment proposal.

## Error handling and safety

- Publish fails when a Profile lacks its required capability locks, typed
  bindings, domain entities/fields/relations, roles, FlowModel events, or
  PageModel routes.
- Compiler admission fails before file generation for a missing,
  digest-mismatched, or incompatible package, invalid selected option,
  output-slot collision, or
  any adapter attempt outside its declared slots.
- Mutations use server-side validation, Casbin policy, expected revision,
  idempotency, and a transaction. No UI state or queued event is canonical.
- Generated page blocks receive bounded DTOs only. They cannot choose
  packages, executable props, local/remote paths, arbitrary URLs, or provider
  secrets.
- Source intake never makes upstream bytes selectable by a Draft, compiler,
  Worker, generated app, or provider until a separate Factory-authored
  promotion is accepted.

## Acceptance evidence

1. Capabilities tests prove descriptors cover exactly all registered
   `FactoryProfile` values, reference only valid recipes/capabilities, and
   remain stable under historical lock replay.
2. Workbench tests prove all five current descriptors appear on Home and in
   Guided Creation; creating each one uses its catalog identity rather than a
   frontend-maintained array.
3. Compiler tests prove all four commerce Profiles share the exact two new
   package versions while compiling distinct Graph-bound entity names, routes,
   schemas, and labels; Restaurant-only files are absent for non-Restaurant
   output.
4. Generated browser/API journeys prove a configured item with a valid
   option changes the server total; invalid or unavailable option choices are
   rejected; merchant edits are audited and do not mutate historical order
   snapshots.
5. Generated journeys prove every amendment is versioned, replay-safe,
   policy-gated, inventory-consistent, audit/outbox backed, and cannot run
   after its declared fulfilment boundary. A failed amendment produces no
   partial writes.
6. Worker evidence proves each Published commerce Graph produces isolated
   artifacts and cleanup only removes the corresponding Compose project.
7. External Intake regression verification continues to prove malformed or
   sensitive sibling items do not abort valid batch intake, and source-study
   projection inputs reject undeclared, sensitive, executable, and
   product-bound fields.
8. No credentials, raw AI prompts/responses, external source bytes, or
   provider secrets appear in Graph state, generated files, artifacts, logs,
   test fixtures, screenshots, or reports.

## Delivery sequence

1. Add failing descriptor/catalog tests, implement the canonical descriptor
   export, and refactor Workbench Home/Guided Creation to consume it.
2. Add failing capability package and semantic-validation tests for configured
   catalog entities, option selections, and price snapshots.
3. Create and register the immutable `commerce.line-configuration@1.1.0`
   successor package, then apply validated bindings to all four commerce
   Profile graphs.
4. Add failing package/compiler/runtime tests for the amendment transaction
   contract, then create and register
   `commerce.order-amendment@1.0.0` with typed bindings and profile Graph
   declarations.
5. Compile the two package contributions and generated customer/merchant
   projections from immutable locks; add Node and Worker isolation evidence.
6. Run a fixed-reference bulk intake against the first selected sources and
   retain only quarantined evidence; preserve the existing non-promotion rule.
7. Run full relevant package, Workbench, compiler, Worker, intake, browser,
   generated-app, typecheck, lint, build, and `git diff --check` verification;
   update acceptance, status, notices, and source-study records truthfully.

## Deferred next capability slice

`scheduling.reservation@1.0.0` and `capacity.waitlist@1.0.0` follow this
release. They will be separate Graph-first packages for availability,
resources, reservation lifecycle, queue ticket, estimated wait, notification
intent, and auditable merchant actions. They will serve Restaurant, Appointment,
Room Booking, Desk Booking, Vehicle Booking, and Service Booking profiles.
