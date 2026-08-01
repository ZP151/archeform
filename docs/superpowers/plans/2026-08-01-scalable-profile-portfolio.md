# Scalable Profile Portfolio Implementation Plan

> **For implementation agents:** use focused TDD. A capability family is not
> complete until it has a versioned asset or Provider contract, deterministic
> fixtures, compiler output, and a cross-Profile journey. Do not copy an
> external repository wholesale.

**Goal:** Turn Factory Pilot from five bounded starter Profiles into a scalable
Application Graph portfolio by expanding shared business capability families,
automating controlled external-source intake, and accepting each generated
Profile independently.

**Architecture:** Application Graph remains the source of truth. The Factory
owns contracts, validation, fixtures, compiler adapters, and generated output.
External projects enter only through fixed-source Candidates and are reused as
pinned dependencies, Provider adapters, template adapters, selective source
ports, or reference-only records.

## Portfolio target

One hundred business scenarios should be represented as combinations of roughly
twenty-five to thirty-five reusable families, not as one hundred handwritten
applications. The first portfolio ring is:

```text
identity/session          money/pricing              catalog/cart/order
inventory/ledger          workflow/audit             notification/outbox
reservation/queue         fulfilment/delivery        membership/promotion
media/documents           search/import              reports/read-models
payments (simulated)      scheduling                 locations/tenancy
realtime (provider)       printing/scanning          observability/fleet
```

Each family must define its reusable Graph bindings and bounded extension
points before any UI or generated runtime claims it is available.

## External-source release lanes

| Lane      | Allowed use                                                 | Examples to study                                 | Required gate                                                               |
| --------- | ----------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------- |
| Pin       | Published package stays a dependency                        | decimal arithmetic, QR/barcode, client validation | version/integrity, licence/notice, SBOM, vulnerability and fixture evidence |
| Adapter   | Factory calls a bounded Provider interface                  | OIDC, email, object storage, mapping, deployment  | provider contract, local fake, outage and removal tests                     |
| Template  | Package contributes declared generated files                | UI block, Nest module, Prisma projection          | locked target, input schema, output-slot validation and generated fixture   |
| Port      | A small, audited upstream module becomes Factory-owned code | hardened parser, narrowly useful pure algorithm   | source study, exact commit, attribution, conformance and removal test       |
| Reference | Architecture informs a Factory implementation only          | Medusa, Amplication, vendor products              | source-study record; no code copying                                        |

Candidates are never executed, installed in generated applications, or marked
Golden merely because they have an acceptable licence or many stars.

## Delivery order

### 0. Establish a truthful baseline

**Files:**

- `docs/audits/2026-08-01-platform-and-profile-completeness.md`
- `docs/project-status.md`

1. Preserve the audit as the live implementation baseline.
2. Move obsolete nested historical governance narratives out of the current
   status summary into an archived record; retain links, not conflicting
   implementation claims.
3. The Workbench home must project only actual asset/readiness states.

**Acceptance:** asset/profile counts can be regenerated from physical manifests,
and no status line calls a skipped browser journey or Candidate a released
application capability.

### 1. Complete persistent shared commerce operations

**Files:**

- New `packages/capabilities/assets/commerce.order-operations/1.1.0/`
- New `packages/capabilities/src/assets/commerce/order-operations-v1-1-0.ts`
- `packages/capabilities/src/assets/index.ts`
- `packages/compiler/src/index.ts`
- `packages/compiler/test/order-operations-runtime.test.ts`
- `packages/capabilities/test/order-operations-package.test.ts`

1. Write failing tests showing a process restart preserves payment receipts and
   idempotency keys and a duplicate command cannot alter an order twice.
2. Release a new immutable package version. It must declare a database schema
   contribution for `OrderOperationReceipt` and a package-owned persistence
   interface; do not edit `1.0.1`.
3. Compile that contribution into the Prisma schema, migration and
   `PrismaRecordStore`; remove the generic runtime receipt `Map`.
4. Ensure all four commerce Profiles lock the same new package version through
   Draft composition, not Profile-name conditionals.

**Acceptance:** restart, concurrent/stale version, duplicate idempotency,
partial capture, refund, audit and stock effects pass against generated
storage. A missing database contribution fails compilation closed.

### 2. Prove Restaurant and Ecommerce as independent generated products

**Files:**

- `apps/compiler-worker/test/order-operations-lifecycle.test.ts`
- `apps/compiler-worker/test/compilation-executor.test.ts`
- `e2e/generated-restaurant.spec.ts`
- `e2e/generated-ecommerce.spec.ts`
- `docs/acceptance/`

1. Materialise two separately published Graphs and create two distinct Compose
   projects under the artifact root.
2. Run Restaurant customer table session -> order -> simulated payment ->
   kitchen -> serve journey.
3. Run Ecommerce catalog -> cart -> checkout -> stock update -> order lifecycle
   journey.
4. Run browser E2E only against those fresh isolated instances, then terminate
   them and verify volumes/network cleanup.

**Acceptance:** both Profiles use the shared locked order-operations package
but generate different Graph-defined UI, schema and state transitions; each
journey passes independently with immutable artifact evidence.

### 3. Automate external-source discovery and triage

**Files:**

- `packages/external-intake/src/discovery.ts`
- `packages/external-intake/src/jobs.ts`
- `apps/intake-cli/src/`
- `docs/research/`
- `docs/ecosystem/`

1. Add a declarative Discovery Index for the portfolio families with fixed
   queries and source classifications. No user-supplied URL or arbitrary
   source body is allowed.
2. Resolve default branches to full commits before quarantine eligibility.
3. Batch evidence collection and module inventory; record aggregate status
   without exposing source URLs or bodies to the Workbench.
4. Produce Candidate port plans that nominate exactly one reuse lane and
   required conformance/removal gates.

**Acceptance:** at least the money, identity, media, search/import,
notification, scanning, and release-control families produce deterministic
Candidate proposals. No Candidate changes a Graph, generated output, or
Golden registry.

### 4. Deliver reusable horizontal family batches

Implement sequentially, each as a new versioned asset package plus at least
two Profile uses:

1. **Money/pricing/promotion:** decimal arithmetic, tax/promotion calculation,
   price snapshots and refund allocation.
2. **Identity/session:** provider-neutral OIDC/session contract, local fake,
   role/user lifecycle, passkey-ready extension point.
3. **Notification/outbox:** durable message intent, template/version,
   idempotency, local sender fake and provider outage policy.
4. **Reservation/queue/scheduling:** availability, hold/confirm/cancel,
   capacity and timezone-safe state transitions.
5. **Fulfilment/delivery:** delivery/pickup status, inventory handoff and
   provider-neutral dispatch contract.
6. **Media/import/search:** hostile input boundary, file/derivative metadata,
   canonical import, tenant-filtered derived search index.
7. **Reporting/observability/fleet:** read-model definitions, report outputs,
   health/log/metric contracts, generated version/upgrade/rollback record.

**Acceptance for a batch:** two different Profile Graphs use the same package
lock; their validated bindings produce different UI/schema/workflow output;
negative dependency, digest, unapproved-provider and out-of-slot tests fail
closed.

### 5. Make the Workbench the thirty-minute creation path

**Files:** `apps/workbench`, `packages/adapters`, `apps/control-plane`, and
Graph schema/test packages as required.

1. Create a guided brief-to-Graph proposal that returns a validated Graph diff
   only; raw model input/output is never retained.
2. Add starter choice, required capability selection, Page/Domain/Flow/Policy
   readiness checks and visual role simulation.
3. Embed visual editors through adapters: Puck for PageModel and React Flow for
   Flow/relationship/lineage views. The Graph stays authoritative.
4. Publish the preview gate: readable generated-file change, role journey list,
   compilation estimate and explicit irreversible action.
5. Use one Factory design system for Workbench and generated UI assets so a
   visual block has a versioned source and a common test fixture.

**Acceptance:** a user can describe Restaurant, Expense or Ecommerce, choose a
validated proposal, adjust UI/domain/flow/policy without source code, simulate
roles, publish, compile and inspect a running local application. The AI cannot
select packages, write files, set paths/URLs, or bypass Graph validation.

### 6. Scale Profiles without duplicating runtime code

For every new Profile, create only:

```text
profile Graph recipe + fixtures + role journeys + branded page composition
```

It must reference existing family packages. A new package is justified only
when no existing contract can express the business invariant. Initial
representative Profiles should be Invoice/Billing, Appointment Booking,
Warehouse Receiving, Field Service, Customer Support, Property Maintenance,
Learning Administration, Event Registration, Procurement Request, and Case
Management.

**Acceptance:** each Profile separately passes Graph validation, publish,
compiler, generated API/database/web, role journey and cleanup. It cannot make
an availability claim merely from a planning taxonomy or Candidate mapping.

## Verification policy

- All deterministic CI remains fixture-based.
- Final acceptance of each Profile requires one guarded real OpenAI Graph-Diff
  run using an environment-only key, with no credential, raw prompt or raw
  response written to state, logs, screenshots, artifacts, or reports.
- A real model run is validation of AI integration, not a substitute for
  deterministic compiler and product-journey tests.
- Third-party notices, source-study records, SBOM/provenance evidence and
  removal tests are release gates for every non-reference reuse.
