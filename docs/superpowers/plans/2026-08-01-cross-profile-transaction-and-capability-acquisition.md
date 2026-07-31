# Cross-Profile Transaction Kernel and Capability Acquisition Plan

**Status:** Active next implementation slice. Profile readiness and
quarantined Candidate port planning completed on 2026-08-01; neither changes
the required generic transaction-kernel prerequisite.

## Objective

Increase the functional completeness of generated commerce applications while
making reuse from public, permissively licensed software repeatable at scale.

The outcome is not a collection of copied applications. It is a Factory-owned
capability kernel that can be composed into many independently accepted Profile
recipes:

```text
Published Application Graph
  -> immutable capability locks
  -> transaction-safe generated runtime
  -> profile-specific pages and projections

Allowlisted upstream release
  -> immutable snapshot + licence/SBOM/security evidence
  -> source-study or provider proposal
  -> Candidate capability package
  -> contract and fixture verification
  -> Golden package eligible for composition
```

## Why this replaces the unfinished amendment slice

Restaurant Ordering already compiles specialised idempotent commands, an
inventory ledger, audit records, and outbox events. The generic commerce
runtime does not yet offer the equivalent transaction boundary for inventory
reserve/release/decrement, expected-version checks, idempotent replay, and
settlement-adjustment intent. A generic `commerce.order-amendment` package
therefore cannot truthfully be reusable across Restaurant, Ecommerce, Retail
Counter, and Grocery Pickup yet.

Creating that package first would violate the rule that a capability package is
an independently executable and verified asset rather than a catalog label.

## Non-negotiable boundaries

- Factory Application Graph stays the sole business-semantic source of truth.
- Generated targets consume only Published Graph revisions and immutable locks.
- Every upstream source is pinned to an exact release/tag/commit, recorded with
  its licence and notices, and processed in quarantine before it can influence
  a package.
- Upstream source is never allowed to mutate a Graph, select a package, execute
  in the Composer, or supply an arbitrary template path.
- A source copy is allowed only when its exact path/range, source digest,
  licence obligations, notices, adaptation boundary, and replacement test are
  recorded in an immutable source-study record. Copyleft, source-available, or
  commercial paths remain excluded by policy.
- The acquisition pipeline may automate evidence collection and Candidate or
  Golden eligibility. It must fail closed rather than silently accepting an
  ambiguous licence, unavailable commit, failed scanner, or failing fixture.

## Workstream A: reusable transaction kernel

### A1. Define the immutable command contract

Create a versioned contract for a generated command that includes:

- scope-local idempotency key and canonical request digest;
- expected aggregate version;
- all-or-nothing transaction boundary;
- typed audit fact and outbox event declarations;
- explicit compensation/reversal operation; and
- a redacted command receipt for generated clients.

The contract must reject a replay key with a different payload and prove that a
failed command persists no order, inventory, audit, or outbox change.

### A1 review finding — 2026-08-01

A proposed isolated command-receipt increment was rejected before commit. It
would have written the receipt after order and inventory effects, allowing two
concurrent Prisma commands to observe no receipt and reserve stock twice. Its
in-memory receipt also retained a mutable order reference instead of the
original outcome snapshot. No part of that increment is present in the product.

A1 remains unimplemented. The replacement must create/validate a command row,
perform an optimistic version-conditional order update, apply inventory,
ledger, audit, capability and outbox writes, then complete an immutable receipt
inside one Prisma transaction. Its acceptance suite must include concurrent
replay and later-state replay regressions, as well as failed-command rollback.

### A2. Promote reusable inventory semantics

Create immutable successors for the generic inventory/ledger assets whose
declared operations are actually compiled:

```text
reserve -> release -> consume/decrement -> adjustment/reversal
```

They must own location scope, stock ownership, provenance, quantity invariants,
idempotency, and transaction-safe ledger writes. Restaurant-specific table and
kitchen extensions consume this contract; they do not reimplement it.

### A3. Compile the common kernel

Add compiler support for a shared Prisma transaction and generated Nest API
adapter. It must be selected only from locked Golden assets and must not make a
non-Restaurant bundle emit Restaurant controller or schema files.

Required tests cover four independent Profile fixtures:

- Restaurant Ordering;
- Simple Ecommerce;
- Retail Counter; and
- Grocery Pickup.

Each fixture proves reserve, release/cancel, consume/payment, failed-command
rollback, replay, version conflict, audit, and outbox evidence.

### A4. Add `commerce.order-amendment` only after A1-A3

The amendment package consumes the shared command and inventory contracts. It
supports closed line changes, merchant-only mutation, customer read projection,
stock compensation, settlement-adjustment intent, expected version, and
idempotent replay. It does not make a payment-provider call.

Acceptance requires one package lock and the same handler semantics in all four
commerce Profiles.

## Workstream B: capability acquisition pipeline

### B1. Convert research records into machine-actionable intake proposals

Introduce a versioned `PortfolioSourceRecordV1` to Candidate proposal path.
It accepts only allowlisted records already carrying an exact source reference,
licence classification, intended Factory interface, and reuse mode:

```text
direct-dependency | provider-adapter | selective-source-copy | reference-only
```

It produces an immutable proposal with an opaque source digest, evidence
receipt, required scans, source-study requirement, and target capability family.
It never writes a package to the Golden Registry by itself.

### B2. Automate the repeatable evidence work

For every candidate, run without exposing source credentials or model traffic:

1. resolve the exact release/tag/commit and verify the fetched digest;
2. capture licence and third-party notice inventory;
3. generate SBOM and run dependency, secret, SAST, and vulnerability scans;
4. inventory source paths and reject disallowed licences/paths before copying;
5. generate a source-study record and, where copying is permitted, an exact
   copy ledger with original notices;
6. scaffold the Factory package contract, fixture, and negative tests; and
7. run deterministic package, compiler, and removal-path conformance tests.

This makes discovery and evidence inexpensive. It does not permit opaque
upstream application code to enter generated applications.

### B3. Use reuse modes deliberately

| Reuse mode               | Best use                                                         | Examples                                                |
| ------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------- |
| Direct pinned dependency | small infrastructure/UI libraries                                | Puck, React Flow, XState, Prisma, Casbin, OpenTelemetry |
| Provider adapter         | large service with its own runtime/data plane                    | Keycloak, Appwrite, Meilisearch, Novu, payments, Medusa |
| Selective source copy    | compact, pure, permissively licensed algorithm with stable tests | only exact MIT/Apache/BSD/ISC paths after source study  |
| Reference only           | useful product semantics with an incompatible licence or runtime | GPL/AGPL/BSL/commercial systems                         |

The default for a large vertical repository is a provider or reference, not a
copy. The default for a small pure algorithm is a pinned dependency or a
selective, notice-preserving copy with independent tests.

## Capability waves after the transaction kernel

The portfolio already maps 122 scenarios. The delivery unit is a shared
capability family with fixtures and profile recipes, not one hand-written app
per scenario.

1. **Commerce and inventory:** transaction kernel, amendment, price rules,
   promotion eligibility, fulfilment, returns, receipt and provider seams.
2. **Identity and operational records:** OIDC session provider, attachment,
   import/export, search projection, activity stream, durable notification.
3. **Scheduling and service:** availability, reservation/waitlist, assignment,
   dispatch, checklist, SLA and escalation.
4. **Content and engagement:** publication workflow, knowledge search,
   preferences, templates, campaigns and feedback.
5. **Operations and governance:** analytics read models, telemetry, data
   retention, evidence/export, offline command queue, document/print provider.

Every wave first delivers a complete vertical proof, then exposes it as a
locked asset to related Profile recipes. A Profile becomes accepted only when
its Published Graph, simulator, generated API/Web/database/migration, role
journeys, and evidence pass together.

## Initial upstream intake queue

The research portfolio should be projected into proposals in this order:

1. **Direct dependencies:** OpenTelemetry, Workbox, Dexie, React Hook Form,
   TanStack Query, Radix, Lucide, ECharts, MapLibre, and QR rendering.
2. **Provider boundaries:** Keycloak for OIDC, Appwrite as a backend-provider
   comparison, Meilisearch for policy-filtered search, Novu for notification,
   Gotenberg for bounded document rendering, and Valkey/NATS/Temporal where a
   dedicated runtime slice justifies them.
3. **Commerce studies:** Medusa and Saleor as provider/reference comparisons;
   only separately approved permissive, small, pure paths may become a
   selective-source-copy proposal.

No full application repository is copied into `packages/capabilities`.

## Acceptance gates

### Transaction kernel

- Generic commerce compilation implements every declared inventory operation.
- Each of four Profile fixtures passes transaction, compensation, conflict,
  idempotency, audit, outbox, generated migration/API, and isolated output
  tests.
- Restaurant extensions depend on the shared contract and retain no duplicate
  generic inventory authority.
- `commerce.order-amendment` is registered only after the preceding tests pass.

### Acquisition pipeline

- A portfolio record deterministically produces an immutable Candidate proposal
  or a redacted rejection receipt.
- A rejected/ambiguous licence, digest mismatch, unsafe source path, scanner
  failure, or incomplete evidence cannot yield a package lock.
- A permitted selective copy retains notices and has an exact source-copy ledger
  plus independent Factory tests.
- Provider and direct dependency proposals include conformance fixtures and a
  removal/replacement test.
- A generated application can select only verified Golden package locks.

## Immediate implementation order

1. Completed: replace the stale amendment-only steps with this prerequisite
   kernel and publish Profile readiness plus Candidate port-plan preparation.
2. Add failing transaction-kernel tests, then implement A1-A3 through TDD.
3. Migrate the four commerce recipes and prove isolation in the compiler worker.
4. Add the amendment package and its four-profile acceptance suite.
5. Use Candidate port plans to select one independently reviewed source or
   Provider seam only after its dedicated Factory contract is ready.
6. Record verified status and use the resulting Golden assets to begin the
   next capability wave.
