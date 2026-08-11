---
title: "ADR-0009: Application Graph V2 Shared Contract"
status: "Accepted"
date: "2026-08-11"
decision_date: "2026-08-11"
decision_source: "Founder chat"
authors: "Archeform Tech Lead"
tags: ["architecture", "application-graph", "serialization", "compatibility"]
supersedes: ""
superseded_by: ""
---

# ADR-0009: Application Graph V2 Shared Contract

## Status

**Accepted — 2026-08-11. Decision source: founder chat.**

## Recommendation

**Keep** the current accepted Golden runtime profile and propose an additive,
versioned `factory.application-graph/v2` shared data contract. This is not a
runtime migration and does not replace `factory.application-graph/v1`.

The Tech Lead stops with this proposal. PM must not authorize Task 1 or infer
approval from the product design or implementation plan. Stop for the founder
to explicitly accept or reject this ADR.

## Context

The current profile stores, publishes, hashes, exchanges, and compiles
`factory.application-graph/v1`. A mutable Draft is an append-only revision
timeline; Publish creates a separate immutable Published revision; Compilation
accepts only that digest-verified Published Graph and its immutable composition
lock.

The prompt-to-polished product contract needs one Graph to express bounded
product intent, two explicit surfaces, screen/page recipes, experience tokens,
business-facing editor bindings, and an immutable pre-Publish preview snapshot.
Adding those structures to V1 would change an accepted serialization and could
invalidate historic hashes.

## Decision drivers

- Preserve every historic Published V1 byte sequence, hash, exchange, and
  Compilation input as immutable evidence.
- Keep Graph as the source of truth while model, editor, compiler, and runtime
  systems remain adapters.
- Give independent frontend and backend tasks one explicit, versioned,
  testable shared contract before paths diverge.
- Fail closed across version, capability, tenant, security, preview, and
  compilation boundaries without compatibility inference.
- Avoid a runtime/framework migration that the restaurant outcome does not
  require.

## Proposed decision

If accepted, add `factory.application-graph/v2` beside V1. V2 may add only the
shared data required by the approved product contract: bounded product intent,
surface ownership, page and experience recipe references, declared editor
bindings, and the data necessary to create an immutable
`DraftPreviewSnapshotV1`.

V2 does not authorize the model to select packages, versions, paths, routes,
providers, source, credentials, executable code, or runtime destinations. A
deterministic planner chooses approved recipe and capability locks. Publish
continues to create an immutable Published revision, and production compilers
continue to accept Published Graphs only.

No current runtime component changes merely because this ADR is accepted:
Node.js 22, Next.js 15, React 19, NestJS 10, Prisma 6/PostgreSQL 16, BullMQ
5/Redis 7, TypeScript compiler targets, and local Docker Compose remain the
current Golden profile.

## Compatibility and adapters

- V1 and V2 have separate top-level serialization identifiers and schema
  entry points. No parser guesses a version from shape.
- Existing V1 Drafts, Published revisions, hashes, composition locks, exports,
  and Compilation results remain readable and byte-identical.
- Published V1 content is immutable. It is never rewritten, backfilled, or
  rehashed as V2.
- Model, Puck, XYFlow, exchange, Control Plane, compiler, and source-mode
  adapters declare which Graph version they consume and produce. An
  unsupported version fails closed.
- V2-to-V1 down-conversion is not supported. V1 inspection does not make an
  historic revision eligible for new admission under V2 rules.
- New projects may select V2 only after the accepted implementation passes its
  contract gate. Existing V1 projects stay V1 unless a user explicitly creates
  a migration Draft.

## Migration

1. Freeze the V2 schemas, canonical serialization, hashing vectors, browser
   entry, error codes, and preview-snapshot boundary in Task 1.
2. Add version-dispatch adapters that preserve the existing V1 branch without
   modification.
3. Add a deterministic V1-to-V2 Draft migration that produces a new Draft
   revision, records source V1 identity and migration version, and never
   mutates a Published revision.
4. Require explicit user review and Publish of the migrated Draft to create a
   new V2 Published revision and hash.
5. Enable new-project V2 selection only after contract review, QA, founder ADR
   acceptance, PM acceptance, and the reviewed commit/push gate.

The migration is reversible until a migrated Draft is published: discard the
new Draft revision and continue using V1. Publishing V2 is not reversible in
place; rollback means selecting the last valid V1 Published revision for its
existing V1-capable consumers or creating a new corrective V2 Draft. No data
is converted back into an historic V1 revision.

Abort if canonical hashes are nondeterministic, V1 fixtures change, an adapter
cannot fail closed, a preview can create a Compilation, or a compiler consumes
a mutable Draft.

## Threats and controls

- **Version confusion:** require the exact top-level identifier at every
  parser, exchange, persistence, and compiler boundary.
- **Historic mutation:** keep Published V1 rows append-only and verify stored
  hashes before exchange or Compilation.
- **Unsafe model authority:** validate bounded intent only; deterministic code
  owns recipes, capabilities, paths, source, and providers.
- **Preview promotion:** bind preview to immutable
  `DraftPreviewSnapshotV1`; forbid deployment, export, Published promotion, and
  Compilation creation.
- **Cross-tenant or stale-revision access:** verify actor, tenant, Graph,
  revision, and digest together for every read and mutation.
- **Adapter drift:** publish shared fixtures and parity tests for browser,
  server, compiler, exchange, and editor consumers.
- **Raw model or credential leakage:** retain validated local semantics and
  safe digests only; exclude raw prompts, responses, hidden reasoning,
  credentials, and sensitive request bodies from persistence and evidence.

`docs/threat-model.md` remains the security authority. This ADR cannot waive a
required control or accept residual risk.

## Alternatives considered

### Keep V1 unchanged and omit the new product semantics

This protects compatibility but cannot represent the approved two-surface
product and editor contract. Recommend `reject` for the product outcome.

### Extend V1 in place

This risks changing accepted parsing, canonical bytes, and historic hashes.
Recommend `reject`.

### Replace the current runtime profile with a new platform

The product outcome does not require a framework, language, database, queue,
or Compose migration. Recommend `reject`.

### Experiment with an unpersisted side document

This would split source-of-truth authority between Graph and adapter state.
Recommend `reject`.

### Add the versioned V2 contract while keeping the runtime profile

This preserves V1, gives adapters an explicit boundary, and keeps migration
reviewable. Recommend `keep` for the runtime profile and accept the additive
contract proposal.

## Measurable verification

An accepted implementation must provide focused RED/GREEN evidence and prove:

1. V1 parse, canonical serialization, hash, exchange, browser export, Publish,
   and Compilation fixtures remain byte-identical.
2. V2 valid fixtures round-trip identically across Node and browser entries;
   wrong/unknown versions and cross-version payloads fail closed.
3. V1-to-V2 migration creates a new Draft revision with deterministic lineage
   and does not update or delete any Published V1 row.
4. Pre-Publish preview accepts only an immutable digest-bound snapshot and
   rejects export, deployment, promotion, and Compilation.
5. Production Compilation rejects Drafts and preview snapshots and accepts only
   the exact immutable Published revision and hash.
6. Tenant, authorization, hostile-input, raw-model-material, credential, and
   adapter-parity adversarial tests pass.

Exact commands and evidence paths must be frozen in the Task 1 ledger before
implementation. At minimum they include focused Graph tests, Graph build and
typecheck, Control Plane lifecycle tests, compiler contract tests, browser
entry parity, Prettier, and `git diff --check`.

## Consequences

### Positive

- The shared product contract becomes explicit and versioned without changing
  the Golden runtime profile.
- V1 Published evidence and compatibility remain intact.
- Adapters and parallel tasks receive one frozen contract and fail-closed
  version boundary.

### Negative

- Two Graph versions must coexist and require deliberate adapter coverage.
- Migration creates new Draft/Published history rather than rewriting old
  records.
- Task 1 and all dependent work remain blocked until founder acceptance and PM
  authorization.

## Founder decision gate

Decision: **Accepted**.

Date: **2026-08-11**.

Decision source: **founder chat**.

Founder response: `接受，继续`.

This records the response to the exact ADR-0009 accept/reject gate. D0 remains
subject to its independent release-review, PM-acceptance, and reviewed
commit/push gates before Task 1 may begin.
