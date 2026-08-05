# Graph-first verified application factory

Date: 2026-08-02
Status: Approved implementation target

## Decision

Factory Pilot is a Graph-first verified application factory. Its business
source of truth is the Application Graph, not generated source, a framework, an
editor document, an AI provider, or a profile template. The immutable lifecycle
is Draft -> Publish -> Compilation; only a Draft can receive a proposed change.

## Why this target

Compilation without generated-application verification only proves artifacts
were emitted. Factory Pilot must instead prove that a Published Graph produces
a safely booted, policy-enforced, idempotent, cleanly removable application.
This makes reusable capability composition and explainable AI changes more
valuable than profile-specific generator branches.

## Delivery shape

### P0: compiler plugins and verification

Introduce `CompilerTargetPluginV1` with this lifecycle:

```text
supports -> plan -> render -> validate
```

Migrate low-risk docs, policy, and database targets first. Compare migrated
output digests to the current compiler before changing authority. Preserve and
explain every intentional difference.

Generated-app verification is:

```text
compile -> isolated boot -> migration/health/API/role journeys/authorization denial
-> idempotency/cleanup -> safe diagnosis -> new Draft Diff
```

Diagnoses are constrained evidence and proposed Draft changes; they cannot
patch generated source or any immutable Published Graph/Compilation. Restaurant
semantics move to capability contributions and bindings, not profile-name
conditionals.

### P1: explainable composition and adapter discipline

Stage AI work as `RequirementSpec -> CompositionPlan -> constrained Graph Diff`.
Plans must expose clarification questions, selected capability versions,
bindings, risks, acceptance scenarios, and explanations. Persist neither raw
prompts/responses nor credentials.

Build cross-profile capabilities first: identity/session, files/media, search,
scheduling, reporting, and notification providers. Component expansion must use
Factory-owned wrappers plus the capability registry. Puck, XYFlow, shadcn, and
TanStack are adapters, not Graph authority.

### Later priorities

- P2: managed deployment, observability, fleet upgrades, and rollbacks.
- P3: additional frontend/backend framework adapters.

## Acceptance gates

1. Plugin lifecycle tests and digest parity evidence cover docs, policy, and
   database migration.
2. An isolated generated application proves migration, health, API, allowed and
   denied role journeys, idempotency, cleanup, and safe Draft-Diff diagnosis.
3. A staged AI proposal is traceable from requirements through capability and
   binding choices to a Draft-only Graph Diff.
4. At least one cross-profile capability has locked versions, validated
   bindings, and generated-application evidence across two Profile Graphs.
5. Workbench additions prove wrapper/registry ownership and cannot persist
   third-party editor state as Graph truth.

## Non-goals

- No direct editing or reverse parsing of generated source.
- No mutation of Published Graphs or Compilations.
- No profile-name conditional semantics.
- No framework or third-party tool as a business-model authority.
- No P2/P3 shortcut around P0/P1 acceptance gates.

## External dependency and source-study policy

Testcontainers for Node, fast-check, and ts-morph are prospective dependencies,
not installed/approved decisions. Dagger and OpenTelemetry are later
candidates. Amplication, Backstage Scaffolder, bolt.diy, Dyad, and OpenHands
are source-study-only architecture references. None implies installation,
copying, or approval. Every adoption remains subject to exact-version review,
licence compatibility, third-party notices, provenance/security evidence,
focused boundary tests, and a removal path.

## Current constraint

Retail Counter and Grocery Pickup have passed their isolated local generated-
application journeys, Preview stop, and cleanup gates. The active constraint is
the unresolved Typed Capability Binding Task 2 reconciliation with accepted
Task 2A. Compiler target extraction must not bypass that compiler-admission
dependency.
