---
title: "ADR-0068: Bounded Generated Database Identifiers"
status: "Proposed"
date: "2026-09-17"
authors: "Archeform Tech Lead"
tags:
  [
    "architecture",
    "decision",
    "compiler",
    "database",
    "prisma",
    "postgresql",
    "generated-source",
  ]
supersedes: ""
superseded_by: ""
---

# ADR-0068: Bounded Generated Database Identifiers

## Status and recommendation

**Proposed** | Accepted | Rejected | Superseded | Deprecated

Recommendation: **migrate** only future affected Compilations from implicit
PostgreSQL physical names to the conditional
`factory.generated-database-identifiers/v1` compiler policy defined below.
Keep the current accepted Golden technology profile, logical Application Graph
identifiers, Prisma model and field names, generated API delegates, and every
historic immutable Compilation unchanged.

This proposal is not accepted. It authorizes no production or test source
change, Product Publish, Compilation, Preview, provider call, external resource,
database mutation, deployment, Git action, or release. It is eligible for the
founder's 2026-09-01 standing acceptance only if a separate qualified read-only
reviewer returns `APPROVED_FOR_STANDING_ACCEPTANCE: yes`, reports P0/P1 `0/0`,
finds the implementation bounded and reversible, and PM records this ADR's
exact hash, reviewer, verdict, and evidence. The proposing Tech Lead cannot
accept, review, or implement this ADR.

## Context and trigger

- **CTX-001 — Reproduced failure**: Definition-batch attempt 3 compiled and
  Published application ID
  `publication-review-acceptance-<uuid>`, then failed generated Preview startup.
  The retained diagnostic records Prisma `P1012` with four validation errors:
  the generated Principal and Session primary-key and index identifiers share a
  long prefix and truncate to identical PostgreSQL names. A same-artifact build
  reproduced the failure. Cleanup succeeded. At current base
  `bbb1e23c68f05e3ae213ceaf167737eb0fe86779`, a fresh generated schema for exact
  requirement ID
  `publication-review-acceptance-12345678-1234-1234-1234-123456789abc` again
  fails pinned Prisma CLI `6.19.3` validation with the same four Principal and
  Session `@id`/`@@index` collisions.
- **CTX-002 — Test workaround is not a repair**: The accepted batch changed its
  fixture to a shorter `batch-<uuid>` ID and then passed. That restores test-run
  isolation only. The Graph accepts identifiers up to 128 characters, and the
  generic product composer deliberately derives
  `<application-id>-principal` and `<application-id>-session`; therefore a valid
  long application ID can still produce an unusable generated database.
- **CTX-003 — Current compiler cause**: The database target converts entity keys
  directly to PascalCase Prisma model and SQL table identifiers. It leaves
  Prisma `@id`, `@unique`, `@@index`, and `@relation` database names implicit
  while independently rendering SQL tables, indexes, unique constraints, and
  foreign keys. PostgreSQL 16 limits identifiers to 63 bytes and silently
  truncates longer identifiers. The current assembled-storage check detects
  exact duplicate strings through `assertUniqueDatabaseStorageNames`, but does
  not reject overlength names or collisions after PostgreSQL truncation.
- **CTX-004 — Governance trigger**: Correcting this defect changes the generated
  Prisma/PostgreSQL target and its database identifier compatibility contract.
  `AGENTS.md` and `docs/tech-governance.md` require a proposed ADR before any
  implementation. The current threat model additionally requires fixed reviewed
  compiler targets, immutable Published input, deterministic generated source,
  and fail-closed validation.
- **CTX-005 — Scope**: This decision covers only compiler-owned database
  identifiers reachable from the reproduced generic application path: domain
  table mappings, primary keys, field uniqueness, declared indexes, and
  explicit many-to-one/one-to-many/one-to-one foreign keys. It does not redesign
  Graph identifiers, columns, implicit many-to-many join models, compiler
  contribution formats, application identity, or product definitions.
- **CTX-006 — Compatibility correction**: Paused implementation evidence found
  that ordinary historical test inputs already contain SQL-only overlength
  authentication foreign-key candidates even when Prisma's implicit candidate
  is safe. The policy correctly maps those future database objects because
  DEC-001 triggers when either emitted stream is unsafe. Consequently, a new
  Compilation from the same Published Graph can have changed paired Prisma
  schema/migration bytes even though it does not reproduce the Principal/Session
  collision. A full compiler run passed 785 of 793 tests; the eight failures
  were direct complete-bundle legacy comparisons, not Graph, runtime, or
  non-database behavior failures. Requiring both all-overlength repair and
  direct whole-bundle byte identity is contradictory and is corrected below.

## Current accepted and proposed profiles

- **CUR-001 — Current accepted Golden profile**: Node `>=22.11.0 <23`, root
  package manager `pnpm@9.0.0`, TypeScript `^5.7.2` resolved `5.9.3`, Next
  `^15.1.0` resolved `15.5.22`, React and React DOM `^19.0.0` resolved `19.2.8`,
  Puck `^0.22.3` resolved `0.22.3`, XYFlow `^12.3.6` resolved `12.11.2`, NestJS
  `^10.4.15` resolved `10.4.22`, Prisma and `@prisma/client` `^6.1.0` resolved
  `6.19.3`, BullMQ `^5.34.10` resolved `5.81.2`, ioredis `^5.4.2` resolved
  `5.11.1`, PostgreSQL `16-alpine`, Redis `7-alpine`, and Dockerfiles using the
  floating-major `node:22-alpine` tag. The manifests, `pnpm-lock.yaml`, tracked
  Dockerfiles, and `infra/docker-compose.yml` remain executable authorities.
- **CUR-002 — Current accepted contracts**: The implemented Graph serialization
  remains `factory.application-graph/v1`; the database target plan remains
  `factory.compiler-target/v1`; the compiler package is private
  `@factory/compiler@0.1.0`. The lifecycle remains mutable Draft -> immutable
  Published Graph -> immutable Compilation. Current generated physical names
  are natural Prisma/PostgreSQL derivations with only one specialized bounded
  foreign-key helper for duplicate relation endpoints.
- **PRO-001 — Proposed profile**: Keep every CUR-001 version, image tag,
  manifest, lockfile, service, and topology coordinate. Keep CUR-002 public and
  serialized contracts. Add the compiler-private, deterministic
  `factory.generated-database-identifiers/v1` policy to the existing database
  target for future affected Compilations only. No dependency, Graph version,
  API version, data envelope, database provider, ORM, or Compose change is
  proposed.
- **PRO-002 — Profile separation**: CUR-001 and CUR-002 remain the accepted
  Golden profile until founder acceptance is recorded. PRO-001 is a proposed
  compiler output profile, not an amendment inferred from this roadmap.
  Historical Published Graph and Compilation artifacts remain byte-immutable.
  Future Compilations use PRO-001 whenever either legacy database stream is
  unsafe, including ordinary baseline inputs with an overlength SQL-only
  foreign key. Exact compatibility therefore means unchanged canonical and
  projection results, unchanged non-database generated files, and database-file
  changes limited to the explicit mapped identifiers required by this policy;
  it does not mean regenerating every old complete bundle byte-for-byte.

## Decision

- **DEC-001 — Conditional explicit physical mapping**: Preserve the logical
  Prisma model and field names consumed by generated TypeScript. Collect the
  current Prisma-derived and SQL-renderer-derived physical candidates
  separately. Map an object when either candidate is unsafe under BID-001
  through BID-010 or when its owning physical table is mapped. For a mapped
  object, emit an explicit Prisma database mapping and render the identical
  resolved name in the initial SQL migration. Use `@@map` for a physical table,
  `@id(map: ...)` for its primary key, `@unique(map: ...)` for declared or
  synthesized one-to-one uniqueness, `@@index(..., map: ...)` for a declared
  index, and `@relation(..., map: ...)` for an explicit foreign key. SQL table
  references, named `PRIMARY KEY`/`UNIQUE` constraints, `CREATE INDEX`, and
  `ADD CONSTRAINT` consume that same allocation result only for mapped objects.
- **DEC-002 — Exact compatibility by non-emission**: Do not add explicit maps
  to a safe current model merely to normalize style. If the owning table is
  unmapped and both the Prisma and SQL legacy candidates are independently at
  most 63 UTF-8 bytes and unique in their relevant emitted namespace, leave the
  Prisma name implicit and preserve the current SQL bytes. This deliberately
  preserves the current safe asymmetry: Prisma declared indexes derive names
  from table plus ordered fields while SQL uses table plus declaration ordinal;
  Prisma foreign keys derive owner plus scalar field while SQL uses the current
  target-to-owner relation candidate. A model whose table is mapped keeps its
  current logical Prisma name and client delegate, but every table-dependent
  primary-key, unique, index, and owner-side foreign-key name is explicitly
  mapped so Prisma cannot derive a new implicit candidate from the mapped table.
- **DEC-003 — Fail closed outside the bounded mapping surface**: Reject before
  generated files are returned if an unsafe or colliding physical name belongs
  to a column, an implicit Prisma many-to-many join table or join constraint, a
  free-form package contribution, or another identifier for which this ADR does
  not define matching Prisma and SQL emission. The fixed safe error must not
  include the raw identifier. A later explicit join-model or column-mapping
  change requires its own decision; it cannot be hidden in this repair.
- **DEC-004 — No upstream identifier shortening**: Do not shorten application,
  entity, relation, field, Graph, Published revision, or Compilation IDs. Do not
  modify composition locks or hashes, add aliases, guess compatibility, or
  branch on `publication-review`. The compiler repairs the physical database
  namespace from the immutable Published Graph.

## Bounded identifier algorithm

- **BID-001 — Collected objects**: Before rendering, collect every
  database-target-owned physical object in the affected surface: each domain
  table; its primary key; each declared unique field; each relation-owned scalar
  field on which the renderer synthesizes `@unique`/`UNIQUE` for a one-to-one
  relation; each declared index with its zero-based declaration ordinal and
  ordered fields; and each explicit non-many-to-many relation foreign key with
  its relation ordinal, owner, target, scalar field, and referenced field. Also
  collect existing fixed compiler/contribution identifiers as reserved names
  without rewriting them.
- **BID-002 — Semantic identity**: Give each allocatable object the canonical
  ASCII semantic key
  `factory.generated-database-identifiers/v1\0<namespace>\0<kind>\0<table>\0<ordered-fields>\0<ordinal-or-relation-identity>`.
  `<kind>` is exactly one of `tb`, `pk`, `uq`, `ix`, or `fk`. Ordered fields and
  relation identity use validated logical Graph/Prisma names, never labels,
  display text, runtime data, provider output, or database state. Hash the full
  semantic key with the existing SHA-256 helper.
- **BID-003 — Two legacy candidates**: Allocate tables first because their
  physical result controls Prisma's implicit dependent names. A table has one
  shared legacy candidate: the current PascalCase entity name. For each
  dependent semantic object, retain both candidates that current code would
  produce. A primary-key candidate is `<physical-table>_pkey`; a
  declared/synthesized single-field unique candidate is
  `<physical-table>_<field>_key`. A declared index's Prisma candidate is
  `<physical-table>_<ordered-fields>_idx`; its SQL candidate remains
  `<logical-table>_<zero-based-index-ordinal>_idx`. An explicit foreign key's
  Prisma candidate is `<physical-owner-table>_<scalar-field>_fkey`; its SQL
  candidate remains the output of the existing target-to-owner plus duplicate
  relation-suffix helper. These are candidate inventories, not a normalization
  request.
- **BID-004 — Natural-name preservation and mapping trigger**: Check the Prisma
  and SQL candidate sets independently in their actual namespaces. Preserve an
  object without a map only when its table is unmapped and both candidates are
  at most 63 UTF-8 bytes, occur once in their respective namespace, and do not
  collide with a fixed reserved name. If either side is unsafe or the owning
  table is mapped, map the semantic object once. Duplicate semantic keys are a
  malformed target and fail closed; allocation order cannot make one duplicate
  win. A mapped target table updates all schema/SQL table references but does
  not by itself force a foreign-key-name map on an otherwise safe unmapped owner.
- **BID-005 — Bounded form**: For every mapped object, use the table candidate
  for `tb` and the Prisma legacy candidate as the readable source for `pk`,
  `uq`, `ix`, and `fk`. Emit
  `<readable-prefix>_<kind>_<digest16>`, where `digest16` is the first 16
  lowercase hexadecimal characters of SHA-256 and `readable-prefix` is the
  longest whole-byte prefix of the natural candidate that keeps the complete
  result at or below 63 UTF-8 bytes. Current Graph database identifiers are
  ASCII, but the implementation must measure bytes and must not split a UTF-8
  code point.
- **BID-006 — Collision escalation**: Reserve all preserved names from both
  emitted candidate inventories first. Sort mapped objects by the complete
  semantic key. If the BID-005 result is already
  occupied in its relevant namespace, replace it with
  `<kind>_<digest60>`, using the first 60 lowercase hexadecimal digest
  characters for an exact 63-byte name. If that result is occupied by a
  different semantic key, fail closed with
  `Generated database identifier allocation failed.` No counter, random value,
  generation order, application-specific branch, or PostgreSQL truncation may
  resolve a collision.
- **BID-007 — Namespaces**: For each emitted stream, maintain the PostgreSQL
  schema relation namespace across physical tables and every ordinary,
  primary-key-backed, and unique-constraint-backed index. Maintain a
  conservative schema-wide mapped-constraint namespace across primary keys,
  unique constraints, and foreign keys, in addition to checking each table's
  constraint namespace. Column names remain per-table inputs and are checked
  for length/collision but are not remapped by this ADR. The Prisma and SQL
  legacy streams are checked independently; their safe asymmetric names are not
  considered collisions with each other because only one stream is materialized
  at a time during its corresponding validation/migration operation.
- **BID-008 — Paired output and preflight**: The Prisma schema and initial
  migration receive one immutable allocation result from the plan/render step.
  They must not run separate allocators or re-hash rendered text. Schema/SQL
  name equality is required only for explicitly mapped objects; safe untouched
  objects retain their current asymmetric bytes. Extend
  `assertUniqueDatabaseStorageNames` to check byte bounds and namespace safety
  independently over the actual untouched Prisma candidates and rendered SQL,
  then check explicit-map parity for mapped objects before returning files.
- **BID-009 — Reproduced path**: For a future
  `publication-review-acceptance-<uuid>` Graph, the long Principal and Session
  Prisma models remain logically named from their Graph entities. Their
  physical tables, primary keys, subject uniqueness, declared indexes, and
  Session-to-Principal foreign key receive distinct bounded names. No product
  key or UUID parsing is permitted.
- **BID-010 — Validated snapshot**: Allocate names and render both database
  files from the same local `graph` returned by
  `assertValidApplicationGraph(plan.graph)` inside `renderDatabaseFiles`. The
  allocator must not consume `plan.graph` separately, retain a pre-validation
  reference, or validate one snapshot and render another.

## Compatibility, API, catalog, security, and operability effects

- **API-001 — API and adapter compatibility**: Public request/response/error,
  actor/authentication, authorization, queue, Graph, capability, adapter, and
  generated REST contracts are unchanged. Prisma model/field names and emitted
  TypeScript delegate access remain unchanged through physical mapping. There
  is no frontend/backend request artifact change.
- **DAT-001 — Data compatibility**: No existing database is migrated in place.
  A new affected Compilation creates a new isolated generated database from its
  paired mapped schema and initial migration. A previously successful immutable
  Compilation retains its exact source, database names, hash, and inspection
  behavior. A previously failed long-ID Compilation is not rewritten; a new
  Compilation is required from the same immutable Published Graph.
- **CMP-001 — Historical immutable baseline**: The pre-implementation
  `packages/compiler/test/fixtures/five-definition-baseline.json` at base
  `bbb1e23c68f05e3ae213ceaf167737eb0fe86779` has SHA-256
  `421447a597e6593045b1fe317ed0c83e6469f5540c6156620d05af2503670ae5`.
  Its Restaurant Ordering, Expense Approval, Purchase Request Approval, Team
  Task Tracking, and Publication Review canonical/projection/complete ordered
  bundle entries are immutable evidence of the old generator and must never be
  regenerated or replaced with post-migration hashes. Historic Published
  Graphs and Compilations remain exact. The existing five-profile database
  target parity digests use safe identifiers and remain directly exact.
- **CMP-002 — Future Compilation delta**: Direct regeneration of the five
  baseline Graphs under PRO-001 may change only
  `database/prisma/schema.prisma`, its byte-identical
  `api/prisma/schema.prisma` copy, and
  `database/prisma/migrations/0001_initial/migration.sql`, and only at explicit
  mapped identifier declarations/usages selected by BID-001 through BID-010.
  All five standard baseline IDs have overlength SQL authentication foreign-key
  candidates of 77 to 93 bytes. Purchase Request additionally has a 64-byte
  Prisma Session index candidate
  `DataBaselinePurchaseRequestApprovalSession_subjectRef_status_idx` while its
  SQL ordinal candidate is a safe 48 bytes. These are required future-output
  migrations, not permission to rewrite historical fixtures.
- **CMP-003 — Strict legacy comparison**: Compatibility tests may apply a
  test-only inverse projection after normal generation. It must recognize an
  explicit allowlist of the baseline semantic objects and their exact old
  tokens. For the protected five-definition fixture this allowlist is exactly
  six objects: one authentication foreign key in each definition and the
  Purchase Request Session `subjectRef,status` index. The observed future delta
  is exactly fifteen files: the same three database paths in each of five
  bundles. The helper must require each mapped name to be paired in both schema
  copies and the matching SQL role; reverse only those tokens in those paths;
  and fail on a missing, duplicate, safe, unpaired, unexpected, or seventh map.
  The restored complete ordered bundle must equal the untouched old digest.
  Existing older Approval/Appointment fixtures may use their own separate exact
  three-object allowlist; neither allowlist is a production product branch. Any
  unrelated mutation, including whitespace or a non-database byte, remains
  visible and fails the old digest. This helper is forbidden in production,
  artifact generation, Preview, migration, or acceptance execution. No blanket
  regex normalization and no new expected bundle hash is allowed.
- **CMP-004 — Numeric-policy separation**: Accepted ADR-0069 and its
  absent-policy compatibility checks consume PRO-001 after this decision. With
  numeric policy absent they may introduce zero delta beyond the exact ADR-0068
  database mappings. The unchanged five-definition fixture, canonical and
  projection values, non-database files, and strict CMP-003 restored digests
  remain the cross-ADR evidence. Numeric work cannot widen this mapping set or
  weaken the legacy comparison.
- **CAT-001 — Catalog impact**: Zero capability, product-definition, product
  recipe, compiler-target, UI, screen, asset, source-study, or provider catalogue
  entries are added or changed. The policy is a compiler-private output rule,
  not a sixth product definition or a new runtime family.
- **LIC-001 — License and supply chain**: No package, image, lockfile, copied
  source, asset, notice, download, or license changes. The implementation uses
  the repository's existing SHA-256 helper and pinned Prisma/PostgreSQL profile.
- **SEC-001 — Security boundary**: The compiler still consumes only a validated,
  digest-bound immutable Published Graph. Hashing a semantic identifier grants
  no authority and includes no credential, prompt, response, record content, or
  personal data. Browser, tenant, role, queue, provider, filesystem, Docker, and
  deployment trust boundaries are unchanged.
- **SEC-002 — Fail-closed evidence**: Invalid or unsupported identifier shapes
  fail before artifact emission or Preview startup with a fixed bounded error.
  Logs and evidence may report the kind and count only; they must not print raw
  Graph input, generated schema bodies, credentials, prompts, responses, or
  database URLs.
- **OPS-001 — Operability**: Valid long-ID generic applications can migrate and
  boot on the existing PostgreSQL 16 local topology. Explicitly mapped objects
  use identical schema and migration names; safe legacy asymmetry remains
  unchanged. Failure moves from late Compose startup to focused compiler/Prisma
  validation. Mapped names are less immediately readable, but retain a readable
  prefix, kind tag, and deterministic digest. Services, ports, volumes,
  readiness, cleanup, and preview expiry remain unchanged.

## Consequences

### Positive

- **POS-001**: A valid long application ID no longer makes Principal and Session
  database objects collide after PostgreSQL truncation.
- **POS-002**: One deterministic allocator makes explicitly mapped Prisma and
  SQL names agree, while the extended preflight independently validates safe
  untouched asymmetric names before external process startup.
- **POS-003**: Historical artifacts and baseline evidence remain immutable;
  strict inverse comparison proves that mapped database tokens are the only
  future-output delta while canonical, projection, and non-database bytes stay
  exact.
- **POS-004**: Unsupported identifier surfaces fail early and safely instead of
  relying on PostgreSQL's silent truncation.

### Negative

- **NEG-001**: The database target gains dual-candidate namespace allocation,
  mapped-object parity logic, and independent untouched-stream checks that must
  remain synchronized.
- **NEG-002**: Physical database names for affected future Compilations are
  partially hashed, which reduces direct readability during manual diagnosis.
- **NEG-003**: Long or colliding column names and implicit many-to-many join
  identifiers remain unsupported; this proposal turns those cases into early
  failures rather than silently broadening the schema model.
- **NEG-004**: Recompiling the same affected Published Graph after this migration
  produces a new Compilation with different generated bytes. That is required
  repair behavior, but the prior Compilation remains immutable and is never
  replaced.
- **NEG-005**: Historical whole-bundle tests need a narrow test-only inverse
  projection to compare against old digests. That helper is intentionally
  brittle and requires an explicit baseline-object allowlist so it cannot hide
  unrelated drift.

## Alternatives considered

### Keep implicit names and shorten upstream entity IDs

- **ALT-001 — Description**: Change the product composer to replace
  `<application-id>-principal` and `<application-id>-session` with short opaque
  entity keys, or impose a shorter application-ID limit.
- **ALT-002 — Rejection reason**: Entity and application identifiers are stable
  Graph, binding, policy, lock, and generated API inputs. Changing them requires
  a versioned Graph/data migration, changes hashes and historical semantics, and
  treats a physical PostgreSQL limit as a product identity rule.

### Fail fast for every long natural identifier

- **ALT-003 — Description**: Reject compilation whenever any generated physical
  name exceeds 63 bytes or would collide after truncation.
- **ALT-004 — Rejection reason**: It is a safe fallback and remains required for
  unsupported surfaces, but as the sole behavior it leaves valid application
  IDs inside the accepted Graph contract unable to generate an application.
  Explicit mapping solves the reproduced path without changing product identity.

### Map only names that already collide

- **ALT-005 — Description**: Preserve overlength names when current objects do
  not collide, and map only the four Principal/Session names that Prisma already
  rejects.
- **ALT-006 — Rejection reason**: This would preserve more regenerated test
  bytes but leave valid future SQL identifiers dependent on PostgreSQL's silent
  63-byte truncation. A later object sharing that prefix could collide, and the
  generated migration would no longer express its actual physical name. The
  accepted goal is bounded deterministic identifiers for affected future
  Compilations, not only suppression of today's P1012 instance.

### Accept PostgreSQL truncation or add collision counters

- **ALT-007 — Description**: Let PostgreSQL truncate names, or append an
  allocation-order counter when a duplicate is observed.
- **ALT-008 — Rejection reason**: Silent truncation already caused P1012.
  Counters make output depend on traversal order and can change unrelated names.
  Neither provides stable mapped-object schema/migration parity or a collision
  proof.

### Change Prisma, PostgreSQL, or the runtime topology

- **ALT-009 — Description**: Upgrade or replace the ORM/database, patch Prisma,
  or add a migration service that renames objects after creation.
- **ALT-010 — Rejection reason**: Published Prisma versions expose explicit
  physical mappings, so a dependency or topology transition is unnecessary.
  Those alternatives widen supply-chain, data-migration, and operability risk
  without addressing compiler determinism.

## Migration, ownership, rollback, and abort conditions

- **OWN-001 — Contract owner**: After acceptance, PM assigns one serialized
  Compiler Database Target Owner for
  `factory.generated-database-identifiers/v1`. That owner alone changes
  `packages/compiler/src/targets/database/target.ts` and focused tests in
  `packages/compiler/test/database-target-parity.test.ts`. Root retains the
  untouched five-definition fixture, strict test-only legacy comparison helper
  and its existing compatibility-test call sites, actual generated-product
  validation, evidence, ledger, service lifecycle, and all Git operations. The
  helper may live only under `packages/compiler/test/fixtures/`; it cannot be
  imported by production source or update expected hashes.
- **OWN-002 — Frozen-contract judgment**: There is no frontend work. The public
  Graph/API/data contract is frozen and unchanged, but this proposed physical
  database policy is not frozen until founder acceptance and PM recording. Its
  schema renderer, migration renderer, compatibility gate, generated templates,
  and end-to-end smoke remain one serialized integration task. They are not
  safe for disjoint parallel writers. A required change to the algorithm,
  `DatabasePlanV1`, generated API delegates, or any shared Graph/API/data
  artifact stops implementation and returns to Tech Lead review.
- **MIG-001 — Implementation order**: First add a focused failing test that
  compiles the reproduced long Publication application and proves current
  Prisma validation failure. Then implement the two-pass allocation once and
  feed both schema and SQL renderers. Add namespace, byte-bound, collision,
  deterministic-repeat, safe-asymmetry, mapped-object parity, and fail-closed
  unsupported-surface cases. Add CMP-003 restoration assertions without
  changing the protected fixture. Finally run direct canonical/projection and
  non-database comparisons, restored historical whole-bundle comparisons,
  package checks, pinned Prisma validation, and one actual isolated
  generated-product journey.
- **MIG-002 — Affected future graphs**: The migration applies only to new
  Compilations whose target-owned table, primary-key, unique, declared-index, or
  explicit foreign-key Prisma or SQL candidate is overlength or colliding. Safe
  new Graphs retain current output. Existing Drafts and Published Graphs require
  no conversion; historic Compilations are never rebuilt in place.
- **ROL-001 — Rollback**: Before delivery, revert only the accepted target and
  focused-test commit. After a mapped Compilation exists, stop producing new
  mapped Compilations and revert the compiler for future work; do not edit or
  downgrade the immutable mapped artifact or its database. Existing mapped
  generated source remains internally paired and inspectable. Remove only exact
  task-owned local Preview resources through normal cleanup.
- **ABT-001 — Abort conditions**: Abort if the protected baseline file/hash or
  any historical artifact is rewritten; if canonical, projection, Graph, lock,
  logical Prisma model/delegate, or non-database generated bytes drift; if a
  database delta is not an exact BID-selected paired mapping; if CMP-003 fails
  to restore every old complete-bundle digest or hides an unrelated mutation;
  or on application-ID shortening, product-key branch, mapped schema/migration
  mismatch, identifier over 63 bytes, namespace collision, order-dependent
  output, raw identifier leakage, required implicit join-model/column rewrite,
  dependency/lockfile/catalog/Compose change, or failed actual migration, role
  journey, persistence, cleanup, or immutable lifecycle check.
- **IRR-001 — Irreversible steps**: None. This proposal authorizes no existing
  database rename, destructive migration, Published Graph rewrite, Compilation
  replacement, external resource, provider action, release, or deployment.

## Measurable verification plan

- **VER-001 — Focused RED/GREEN**: At exact pre-change source, a focused test
  using `publication-review-acceptance-12345678-1234-1234-1234-123456789abc`
  must reproduce invalid/colliding natural Principal/Session database names.
  After implementation, the same immutable input must emit distinct names no
  longer than 63 UTF-8 bytes for both physical tables, both primary keys,
  Principal `subjectRef` uniqueness, both declared indexes, and the
  Session-to-Principal foreign key. Two generations must be byte-identical.
- **VER-002 — Namespace and abort cases**: Prove natural-name preservation;
  collisions between two derived objects; collisions with fixed reserved names;
  BID-005/BID-006 digest collision escalation through an injected allocator unit
  case; duplicate semantic-key rejection; multibyte byte measurement; and fixed
  safe errors containing no raw identifier. Include a short safe table with a
  long legal indexed field for which only Prisma's field-derived index candidate
  is unsafe, and require one shared explicit index map. Include safe declared
  index and foreign-key cases whose Prisma/SQL legacy names differ, and require
  their complete schema and migration bytes to remain exact. Include a mapped
  table and prove its primary key, declared and synthesized one-to-one unique
  constraints, indexes, and owner-side foreign keys are explicitly mapped from
  the final physical table while all SQL references use that table. Retain
  early rejection for unsupported long columns and implicit many-to-many names.
  Prove allocation and rendering consume the same validated local Graph snapshot
  rather than the mutable `plan.graph` reference.
- **VER-003 — Prisma and SQL reality**: Write the generated long-ID schema and
  migration only to a task-owned temporary directory, set a syntactically valid
  non-secret placeholder `DATABASE_URL`, and run pinned Prisma `6.19.3`
  validation through
  `pnpm --filter @factory/control-plane exec prisma validate --schema <generated-schema>`.
  Then apply the emitted migration to an isolated `postgres:16-alpine` instance,
  query `pg_class` and `pg_constraint`, and assert exact expected names, maximum
  byte length 63, namespace uniqueness, and zero truncation notices. Delete the
  temporary directory and isolated database resources after the result.
- **VER-004 — Historical and future compatibility**: Verify the root-owned
  baseline file is
  still SHA-256
  `421447a597e6593045b1fe317ed0c83e6469f5540c6156620d05af2503670ae5`
  and every recorded canonical, projection, file count, and historical complete
  ordered bundle digest is untouched. For new generation, compare canonical and
  projection results and every non-database file directly. Assert that changed
  paths are exactly the fifteen expected instances of both Prisma schema copies
  and the initial migration, and that the delta contains exactly the six
  BID-selected paired maps from CMP-003. Apply CMP-003 only in tests and require
  all five restored bundles plus existing Task and Approval legacy bundles to
  match their original digests. Mutate one unrelated source byte and require
  comparison to fail. Run existing safe five-profile database parity directly.
  No baseline or expected hash may be re-recorded.
- **VER-005 — Commands**: Run from the consumer-delivery worktree with provider
  credentials unused:

  ```powershell
  pnpm --filter @factory/compiler exec vitest run test/database-target-parity.test.ts
  pnpm --filter @factory/compiler exec vitest run test/compilation-plan.test.ts test/definition-data-compatibility.test.ts test/task-compatibility.test.ts test/task-correction-compatibility.test.ts test/approval-correction-runtime.test.ts test/composition-page-runtime.test.ts test/generic-approval-identity.test.ts
  pnpm --filter @factory/compiler test
  pnpm --filter @factory/compiler typecheck
  pnpm --filter @factory/compiler build
  pnpm --filter @factory/compiler lint
  pnpm exec prettier --check docs/adr/adr-0068-bounded-generated-database-identifiers.md packages/compiler/src/targets/database/target.ts packages/compiler/test/database-target-parity.test.ts
  git diff --check
  git diff --exit-code -- package.json pnpm-lock.yaml infra/docker-compose.yml packages/graph
  ```

- **VER-006 — Actual generated validation**: Root runs one isolated long-ID
  Publication Review Publish -> immutable Compilation -> migration -> ready
  Preview -> create/correct/resubmit/approve -> persistent reload journey with
  authorization denial and idempotent retry checks. Acceptance requires exact
  generated-source identity and zero task-owned containers, networks, volumes,
  Preview rows, and temporary directories after teardown. No fixture shortening
  may be used for this long-ID case.
- **VER-007 — Cross-ADR absence check**: Before numeric-domain work may claim
  compatibility, rerun VER-004 on numeric-policy-absent inputs against the
  accepted identifier implementation. Require no additional changed path, map,
  restored byte, canonical/projection value, or non-database byte beyond the
  exact ADR-0068 delta.
- **VER-008 — Evidence location and claims**: Record the proposal decision,
  owner, exact commands, exit codes, Prisma/PostgreSQL versions, bounded counts,
  five-definition digest comparison, actual journey result, and cleanup counts
  in `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md` and a
  task-scoped safe receipt under `docs/acceptance/evidence/`. Evidence must not
  contain credentials, database URLs, raw prompts/responses, request bodies, or
  generated schema dumps. A local pass grants no main integration, repository
  release, Product Publish, external provider, cloud, or deployment authority.

## References

- **REF-001**: `AGENTS.md`.
- **REF-002**: `docs/tech-governance.md`.
- **REF-003**: `docs/threat-model.md`.
- **REF-004**:
  `docs/acceptance/evidence/definition-batch-one/attempt3-diagnostic.json`.
- **REF-005**:
  `docs/acceptance/evidence/definition-batch-one/independent-review.md`.
- **REF-006**:
  `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`.
- **REF-007**: `docs/adr/adr-0065-product-definition-data-and-validation.md`.
- **REF-008**: `docs/adr/adr-0066-generic-approval-record-identity-and-summary.md`.
- **REF-009**: `docs/adr/adr-0067-candidate-conformance-verification-race.md`.
