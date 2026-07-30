# Commercial Capability Foundation Design

## Decision

Factory Pilot will add a **Commercial Capability Foundation** rather than a
larger Restaurant-specific application. The foundation contains four versioned,
Golden capability packages:

1. `core.identity-context`
2. `core.location-context`
3. `commerce.line-configuration`
4. `commerce.inventory-ledger`

They extend the Factory Application Graph, compile through the immutable
composition lock, and are available to Restaurant Ordering and Simple
Ecommerce. Future Appointment, Ticketing, and Internal Operations profiles
must consume the same contracts rather than reimplement their own identity,
location, configurable-line, or stock movement models.

This decision adopts the recommended first iteration in
[`../research/2026-07-30-commercial-profile-capability-intake.md`](../research/2026-07-30-commercial-profile-capability-intake.md).
It does not approve source copying, a new third-party dependency, a production
identity provider, or a payment provider.

## Outcome

A Restaurant Ordering Draft can select an approved commercial foundation and
compile to a customer and merchant prototype where:

- a customer enters a declared location context through an opaque QR/table
  session or a validated manual table code;
- a customer chooses bounded menu option groups, makes valid selections,
  sees the server-computed line price, and adds a line with item and order
  notes;
- a merchant creates and changes menu-option availability and menu stock
  through declared actions;
- a submitted, cancelled, or adjusted order records an immutable stock
  movement with a reason, order reference, actor context, and audit evidence;
- invalid context, option cardinality, unavailable option, stale order,
  negative stock, or conflicting inventory command fails before state changes.

The exact same package identities must also be selectable in Simple Ecommerce
with different Graph-symbol bindings. Restaurant-specific table and kitchen
behavior remains an adapter around the common foundation; the compiler must
not use a package-name/version branch to choose the new behavior.

## Product boundary

The Foundation is not a claim of a complete commercial POS. The following
remain separate, provider-governed follow-up slices:

| Concern                                               | Reason it is not in this Foundation                                                                 |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Phone, WeChat, Alipay, or password login              | Requires an identity-provider contract, credentials, privacy review, and account recovery behavior. |
| Real payment, split settlement, stored value, refunds | Requires payment-provider contracts and financial lifecycle evidence.                               |
| Delivery, courier tracking, external maps             | Requires an address and logistics provider boundary.                                                |
| Promotions, coupons, loyalty, reviews                 | Requires customer-profile, pricing, and eligibility contracts.                                      |
| Reservation, queue, offline, realtime, printing       | Each needs its own durable event/availability/provider contract.                                    |
| Cloud deployment and multi-tenant administration      | Not part of a local published-Graph compilation proof.                                              |

`core.identity-context` is deliberately provider-neutral. It compiles local,
role-scoped prototype context from opaque subject/session facts. It does not
store a password, provider token, phone number, raw location, or external
credential. A future identity Provider may resolve those facts but may not
become the PolicyModel or Application Graph authority.

## Capability contracts

### `core.identity-context/v1`

**Provides:** `core.principal-context@v1`.

**Graph contribution:** a scoped principal/session entity and declared actor
context on commands. It references the existing PolicyModel role, never a
free-text role name.

**Bindings:** `principalEntity`, `sessionEntity`, and `defaultRole`, all exact
Graph symbols.

**Generated surface:** a local context resolver used by a generated API and
simulator; a customer-facing "continue as guest" state is permitted only when
the profile explicitly grants it. Merchant operations always require a declared
merchant role.

**Failure rule:** a command with an expired, unknown, role-incompatible, or
location-incompatible context rejects before an order, option selection, or
stock movement is written.

### `core.location-context/v1`

**Provides:** `core.location-context@v1` and requires
`core.principal-context@v1` only when the selected profile requires an
identified customer.

**Graph contribution:** a location entity, context resolution fields, and a
declared service channel. Restaurant binds a table/session; Ecommerce binds a
store or fulfilment location. A location code is a validated Graph field, not
a path or free-form composition parameter.

**Bindings:** `locationEntity`, `contextEntity`, `locationCodeField`, and
`customerRole` as exact Graph symbols.

**Generated surface:** an opaque route/session resolver plus a manual code
resolver. The browser may submit a code, but the generated API validates it and
returns a safe context projection.

**Failure rule:** inactive, expired, mismatched, or manually invalid contexts
do not create a cart or expose a location's catalog.

### `commerce.line-configuration/v1`

**Provides:** `commerce.configured-line@v1`; requires
`commerce.catalog-item@v1` and `core.location-context@v1`.

**Graph contribution:** option-group, option, and line-selection entities;
relations to catalog items; bounded minimum/maximum and required-selection
rules; exact decimal price deltas; availability fields; customer and merchant
PageModel blocks; API operations and customer/merchant role permissions.

**Bindings:** `catalogEntity`, `lineEntity`, `optionGroupEntity`,
`optionEntity`, `customerRole`, `merchantRole`, `catalogPage`, and
`merchantPage`, all exact Graph symbols.

**Generated surface:** customer option selectors with selection summaries and
server-authoritative calculated price; merchant configuration and availability
controls. It may render a configured line but cannot process arbitrary
scripts, option formulas, HTML, remote assets, or URLs.

**Failure rule:** unknown options, duplicate options, an unavailable option,
an option from a different catalog item, required/minimum/maximum violation,
or decimal values not representable by the declared pricing rules reject
atomically.

### `commerce.inventory-ledger/v1`

**Provides:** `commerce.stock-movement@v1`; requires
`commerce.order-event@v1`, `commerce.catalog-item@v1`, and
`core.location-context@v1`.

**Graph contribution:** immutable stock movement records with movement kind,
quantity delta, reason, command idempotency key, actor context, location,
and optional order reference. It adds explicit reserve, release, decrement,
and merchant-adjust effects and an operational projection, but it never lets a
PageModel block mutate stock directly.

**Bindings:** `catalogEntity`, `stockField`, `movementEntity`, `orderEntity`,
`locationEntity`, `merchantRole`, and `auditRole`, all exact Graph symbols.

**Generated surface:** server-side transactional effects, merchant adjustment
controls, and a read-only ledger projection. Restaurant and Ecommerce use the
same movement semantics with different entity/page bindings.

**Failure rule:** duplicate command idempotency keys, negative available stock,
missing order reference for a system movement, or an unauthorised adjustment
reject before both stock and movement rows mutate.

## Composition and compiler rules

Every package is a physical asset under:

```text
packages/capabilities/assets/<package-key>/<version>/
  component.json
  adapter.json
  templates/
  fixtures/
  tests/
```

The TypeScript registration, physical package manifest, template digests,
fixtures, contract tests, `provides`/`requires`, Graph contributions, and
executable contributions must agree. A package declares only safe output
slots and package-local generated namespaces. The composer resolves the
complete dependency graph, validates all Graph symbols at Draft and Publish
boundaries, and writes the exact package identities and contribution digests
to the immutable Published composition lock.

Each Foundation package declares SHA-256 digests for the exact bytes of its
fixture and contract evidence in addition to its manifest, template, and
executable-contribution digests. Those two evidence files are JSON contracts:
the server-only Node verifier must confirm they are regular files inside the
verified package root, match the declared exact-byte digests, and parse as
JSON. A missing, malformed, symlinked, escaped, or byte-mismatched evidence file
invalidates the package. This requirement is Foundation-only for this slice;
it does not change or reinterpret the identity of an accepted historical
package.

The pure composition factory remains browser-compatible and performs registry,
dependency, binding, and canonical-lock validation without filesystem access.
A separate server-only Node factory first resolves each selected registry
identity and verifies its physical package and evidence, then delegates to that
pure factory to create the canonical composition lock. The Control Plane
Publish boundary must use the server-only verified factory before persisting a
Published revision or immutable composition lock. No browser-compatible module
may import Node filesystem code, and successful Draft-only composition is not
physical-package acceptance evidence.

The generic Compiler reads only the lock for Foundation target contributions.
It must reject missing providers, a non-Golden package, changed content,
duplicate target paths, a Graph/lock mismatch, or a handler that writes outside
its declared slot. Existing Restaurant-specific runtime behavior may remain
until it is separately migrated, but none of these four new capabilities may
add a `restaurant-ordering` compiler branch.

## Profile recipes and Workbench Home

The Workbench Home gains a capability-focused Profile view before an app is
created:

- a profile card shows required and optional package count, lifecycle, locked
  versions, provider dependencies, and the customer/merchant surfaces it
  contributes;
- selecting Restaurant Ordering shows the customer and merchant journeys that
  become available from the Foundation, rather than presenting a completed
  vertical app as a static template;
- selecting Simple Ecommerce shows the same common package identities with its
  own Graph bindings and resulting storefront/merchant surfaces;
- unsupported combinations show their failed dependency or policy reason
  before a Draft is created;
- Draft creation remains explicit. The Home never publishes, compiles, or
  retrieves external packages.

The current fixed starter Graphs may seed the first recipes, but the active
creation path must continue through `composeDefaultCapabilityDraft` and the
generic immutable composition lock.

## Data and command flow

```text
Customer or Merchant page
  -> validated route/context request
  -> generated API command
  -> PolicyModel + location/principal context validation
  -> configured-line or inventory transaction
  -> audit / outbox facts
  -> safe projection to Web and simulator

Draft Graph + package selections
  -> semantic and composition validation
  -> server-only registry + physical package/evidence verification
  -> Publish immutable Graph + verified package lock
  -> Compiler contribution resolution
  -> isolated Web / API / PostgreSQL / journeys / docs
```

No command accepts raw model output, source, SQL, a route path, a target file,
a URL, or a credential. AI may later propose a Draft Graph Diff; the normal
Draft validation and package resolver must accept it before it can be
published. Deterministic tests remain fixture-only. Final profile acceptance
uses at most five guarded real-model calls when a local environment key is
available; credentials and raw requests/responses remain process-local and are
not persisted.

## Acceptance criteria

The Foundation is accepted only when all of these are evidenced:

1. Each of the four packages is independently physical, registered, versioned,
   digest-verified, Golden, fixture-backed, contract-tested, and provides its
   declared interface. Fixture and contract-evidence exact bytes are
   digest-protected and valid JSON.
2. Restaurant and Ecommerce select the same package identities where their
   declared requirements overlap, but use different validated Graph bindings,
   routes, fields, fixtures, UI labels, and journeys.
3. A Restaurant generated application supports opaque QR/table context and a
   validated manual table entry; it rejects an invalid context without cart or
   order mutation.
4. Customer option selection enforces item ownership, availability,
   cardinality, and server-computed price; the Merchant can alter availability
   only through a role-gated command.
5. Inventory reserve, release, decrement, and merchant adjustment write
   immutable movement facts and audit evidence atomically. A failure leaves no
   partial stock or movement state.
6. Workbench Home accurately exposes the selected packages, dependencies,
   lifecycle, customer/merchant surfaces, and blocked combinations before
   Draft creation.
7. Missing/incompatible package, invalid binding, tampered digest, invalid
   option selection, stale command, invalid context, or unauthorised stock
   action fails closed. Direct verified-factory and actual Control Plane Publish
   tests prove physical package or evidence tampering cannot produce or persist
   an immutable composition lock.
8. Unit, composition, compiler, Workbench, generated API, generated role
   journey, and isolated Node 22 Compose tests cover both profiles. The final
   release evidence verifies scoped cleanup and at most five guarded real AI
   Graph-Diff calls when local credentials are configured.

## Source and licensing boundary

The source study records TastyIgniter, Keycloak, InvenTree, Workbox, Eventyay,
and Backstage as fixed references only. No source, UI, migration, provider
runtime, or dependency is copied or installed by this decision. Any future
adoption requires a separate decision that identifies the exact source,
license notice, SBOM, security review, provider boundary, fixtures, and
conformance tests. Projects under incompatible or restricted licenses remain
excluded.

## Deferred sequence

After Foundation acceptance, the next capability increments are:

1. `commerce.price-rule`, `commerce.promotion`, `commerce.payment-attempt`,
   `commerce.order-amendment`, `core.receipt`, and `workflow.compensation`.
2. `core.availability`, `core.reservation`, `core.queue`,
   `workflow.deadline`, and `core.event-envelope`.
3. Appointment, Ticketing, and Internal Operations profile adapters, each
   composed from the accepted common contracts.
