---
title: "ADR-0072: Appointment Definition Composition Admission"
status: "Proposed"
date: "2026-09-18"
authors: "Archeform Tech Lead"
tags:
  [
    "architecture",
    "decision",
    "appointment",
    "composition",
    "capability",
    "compatibility",
  ]
supersedes: ""
superseded_by: ""
---

# ADR-0072: Appointment Definition Composition Admission

## Status and recommendation

**Proposed.** Recommendation: **experiment** with one bounded extension to the
definition-family registry, capability catalogue and planner, and product
composer so an exact Appointment Booking V1 definition can select the already
accepted `scheduling.appointment@1.0.0` asset. Preserve the seven existing
definition outputs byte for byte and reject every partial or ambiguous
Appointment match.

This is a new stable definition-family identifier, catalogue trigger, lock and
binding derivation rule, and numeric-domain eligibility rule. ADR-0071 accepted
the capability and generated runtime; it did not authorize these shared
composition changes. Modifying ADR-0071 would invalidate its accepted SHA-256,
so this additive ADR records the missing boundary.

This proposal grants no implementation, definition registration, Product
Publish, Compilation, deployment, cloud action, or release authority. PM must
record separate founder acceptance of this exact ADR SHA-256 before Task 4 may
leave RED. The standing policy may satisfy that acceptance only through an
independent read-only review of the exact hash with reviewer identity,
`APPROVED_FOR_STANDING_ACCEPTANCE: yes`, P0/P1 0/0, evidence, and explicit PM
authorization. The proposer cannot provide that review.

The earlier standing acceptances of ADR SHA-256 values
`d06a1a7ed04ae77f578331c724e895ba6cd7aecf4c9438fb5b8be83fd01963e9`,
`6f99354b1f85d4495ca627552ec221cd2b7ae04c799684e13d014decc457b084`,
`fcd07baefd2ae5218a9e479d164409e232f358a3f80d07af36ed99ffe4a0f1ea`,
`89c5af483a6c8829653595b64b82a5a9062b33ebc0f3d660d666ead5d364c527`,
and `93b4eea347b6b6298f803aeddbda317c2b6da8ecdfd699fc08adb0c251f55b8b`
do not authorize this amended contract. Task 4 implementation remains paused
until an independent reviewer and PM accept the new exact SHA-256.

## Context and authority

- **CTX-001**: ADR-0071, accepted at implementation source
  `b8d79696`, authorizes `scheduling.appointment@1.0.0`, its 17-input
  owner-aware binding contract, compiler profile
  `appointment-booking@1.0.0`, and atomic generated claim, release, and move
  semantics. Its accepted content and hash remain unchanged.
- **CTX-002**: The current definition-family registry recognizes only
  `restaurant`, `approval`, and `task`; every non-Restaurant family is checked
  against six fixed `core.*` locks. Appending Appointment data therefore fails
  closed as `definition.unknown-family` or as a lock mismatch.
- **CTX-003**: The current capability catalogue does not expose
  `scheduling.appointment`, and the deterministic planner has no Appointment
  trigger or 17-binding derivation. A data-only append cannot satisfy ADR-0071.
- **CTX-004**: The product composer currently admits numeric domains only for
  the accepted Approval correction target. Appointment duration and capacity
  are positive integers, so an exact additional eligibility rule is required.
- **CTX-005**: The current `factory.composition-plan/v1` graph-symbol grammar
  can carry entity and field symbols. No Graph, plan, Blueprint, definition
  data, capability manifest, generated API, database, or runtime schema version
  change is necessary.
- **CTX-006**: The Task 4 pre-registration run is correctly RED: 192 tests pass
  and the single expected failure states that Appointment is not registered.
  Task 4 must remain RED until this ADR is accepted and its contract is
  implemented and reviewed.
- **CTX-007**: `docs/tech-governance.md` and `docs/threat-model.md` remain the
  controlling technology and security authorities. The Appointment design,
  plan, test fixture, or catalogue data cannot supersede them.
- **CTX-008**: Blueprint V1 has no semantic field tags. Within Schedule,
  `startUtc` and `endUtc` have the same type and requiredness; within
  Appointment, `notes` and `cancellationReason` have the same type and
  requiredness. Structure alone cannot distinguish a semantic exchange inside
  either pair. A contract that both permits arbitrary safe-key renames for
  those slots and rejects their exchange is not decidable from Blueprint V1.
- **CTX-009**: The exact Appointment Graph contains the two accepted positive
  numeric domains. The incumbent compiler facade invokes the Approval numeric
  selector for numeric Graphs before or during page-runtime rendering. Reaching
  the already accepted `appointment-booking@1.0.0` profile therefore needs a
  narrowly conditional facade dispatch. Skipping the Approval selector merely
  because an Appointment lock is present would be unsafe: the compiler must
  independently prove the exact Appointment numeric witness first.
- **CTX-010**: Compatibility evidence currently composes a Graph that still
  contains `integration.compositionSelections`, clones it, removes that member,
  and passes the clone as the immutable compiler input. A `graphSha256` over the
  pre-removal Graph is not the compiler-input hash and cannot prove the lock or
  generated bundle came from the recorded input. The fixture and capture
  receipt must identify the actual post-removal compiler input.
- **CTX-011**: `packages/compiler/package.json` currently has `main` and `types`
  but no `exports` map. After TypeScript emits the private witness, a dependent
  consumer can therefore resolve
  `@factory/compiler/dist/appointment-compilation-admission.js` despite the
  source barrel not re-exporting it. Source-level privacy alone does not meet
  FAC-007.
- **CTX-012**: The current private test helper calls the witness directly. That
  proves the predicate but does not independently prove that the real local
  `renderPageRuntime` function invokes the guard. A private callback seam must
  exercise the actual renderer without creating a public compiler symbol.

## Current and proposed profiles

- **CUR-001**: Keep the accepted Node, pnpm, TypeScript, Next, React, NestJS,
  Prisma, PostgreSQL, Redis, BullMQ, Docker, and Compose profile. Add no package,
  dependency, provider, service, image, process, or persistent store.
- **CUR-002**: Keep `factory.product-definition-data/v1`,
  `factory.product-blueprint/v1`, `factory.application-graph/v1`,
  `factory.product-capability-catalogue/v1`,
  `factory.composition-plan/v1`, `factory.capability/v1`, and
  `factory.capability-binding/v1` unchanged.
- **CUR-003**: Keep Draft -> Publish -> immutable Compilation. Eligibility and
  bindings are derived before immutable composition; no compiler may consume a
  mutable draft or reinterpret a Published Graph.
- **PRO-001**: Add the definition-family key `appointment` with family version
  `appointment-booking/v1`, parameter policy `none/v1`, presentation key
  `appointment-booking` version `1.0.0`, and compiler profile
  `appointment-booking@1.0.0`.
- **PRO-002**: Add optional catalogue asset
  `scheduling.appointment@1.0.0` at manifest digest
  `sha256:eb3f409908e2f4708a3523767a27a0d30ad4277f2c89827b97f9e379dc82738b`
  under the exact trigger `appointment-booking`.
- **PRO-003**: Keep the catalogue API version unchanged. The current catalogue
  projection may gain the one optional asset and trigger, but selection,
  plans, Graphs, hashes, and compiled outputs for all non-matching definitions
  must remain byte identical.
- **PRO-004**: Authorize only the compiler-facade integration needed to route an
  exact, lock-verified Appointment Graph around the Approval-only numeric
  selector and into the already accepted `appointment-booking@1.0.0` profile.
  Production authorization is limited to `packages/compiler/src/index.ts` and
  one compiler-private witness module at exactly
  `packages/compiler/src/appointment-compilation-admission.ts`, plus focused
  compiler tests and compatibility fixtures. It adds no compiler target,
  generated template, runtime behavior, API, route, schema, migration, generated
  file, stable identifier, output ordering, package, or dependency.
- **PRO-005**: Authorize one package-metadata change at exactly
  `packages/compiler/package.json`: retain the existing `main` and `types`
  values and add exactly this closed export map:

  ```json
  {
    "exports": {
      ".": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      }
    }
  }
  ```

  The sole public package specifier remains `@factory/compiler`. This map adds
  no public subpath, symbol, package, version, dependency, script, or runtime
  target. Because dependency coordinates and resolutions do not change,
  `pnpm-lock.yaml` must remain byte identical.

## Decision

### Closed Appointment eligibility witness

- **ELI-001**: Select the `appointment-booking` trigger only when the validated
  Blueprint exactly matches the Appointment V1 structural profile. Product
  keys, definition keys, titles, labels, descriptions, prompts, and prose are
  never selection inputs.
- **ELI-002**: The profile contains exactly three business entities: Service,
  Schedule, and Appointment. Schedule has one required reference to Service;
  Appointment has one required reference to Schedule. Extra business entities,
  missing references, reversed references, or ambiguous reference topology
  fail closed.
- **ELI-003**: Service contains, in the reviewed ordered family slots, a
  required text name, required positive Blueprint `number` duration in minutes
  that projects to a Graph integer, and required boolean active flag. Schedule
  contains a required Service reference, required start and end datetimes,
  required text timezone, required positive Blueprint `number` capacity that
  projects to a Graph integer, and required `open | closed` status. Appointment contains a
  required Schedule reference, required customer-name text, optional notes
  long text, optional cancellation-reason long text, and required
  `requested | confirmed | cancelled` status.
- **ELI-004**: Safe entity-key renames preserve eligibility when the exact
  reference topology still resolves distinct Service, Schedule, and Appointment
  owners. Safe field-key renames preserve eligibility only for slots that are
  structurally unique within their resolved owner: Service name, duration and
  active; Schedule service reference, timezone, capacity and status; and
  Appointment schedule reference, customer name and status. Type, requiredness,
  numeric domain, enum values, relation ownership, field order, workflow, roles,
  and permissions must otherwise remain exact.
- **ELI-005**: The four structurally ambiguous slots use canonical, versioned
  family identifiers. Schedule start is exactly `startUtc` and Schedule end is
  exactly `endUtc`, in that order. Appointment notes is exactly `notes` and
  Appointment cancellation reason is exactly `cancellationReason`, in that
  order. Renaming, duplicating, omitting, or reordering any of these four keys
  prevents `appointment-booking/v1` eligibility. Exact equality to these
  identifiers is contract validation, not fuzzy field-name inference.
- **ELI-006**: The serialized Blueprint is the complete observable witness. If
  keys, order, types, requiredness, and all other serialized contract values are
  unchanged, an alleged hidden exchange of human intent has no machine-visible
  representation and is outside the testable contract. Labels, descriptions,
  and prose neither change the canonical slot meaning nor select a binding.
- **ELI-007**: ADR-0071 permits the capability's owner-aware bindings to carry
  different safe field keys once an authoritative composition supplies them;
  it does not require this Blueprint V1 automatic planner to infer ambiguous
  slots after rename. This family admission is deliberately narrower. Renamed
  valid-field coverage for ADR-0071 remains required for the structurally unique
  slots in ELI-004.
- **ELI-008**: Appointment has the accepted workflow and role-permission
  semantics from ADR-0071 and the Appointment design. Any missing, additional,
  or materially different state, transition, role, or permission prevents the
  trigger.
- **ELI-009**: The family guide validator uses this same strict witness. A
  registry data row may not waive it, and custom catalogue input may not force
  the trigger.

### Lock selection

- **LCK-001**: An exact Appointment match selects the existing six core locks
  plus the Appointment lock. The core locks remain:
  `core.crud@1.0.1`, `core.workflow@1.0.1`,
  `core.identity-policy@1.0.0`, `core.policy-declarations@1.0.0`,
  `core.audit@1.0.2`, and `core.notification@1.1.1`.
- **LCK-002**: The seventh lock is exactly
  `scheduling.appointment@1.0.0` with the digest in PRO-002. The planner must
  reject a missing asset, version drift, digest drift, lifecycle drift,
  incomplete interface closure, or an unregistered physical manifest.
- **LCK-003**: Appointment is mandatory on an exact match in both `standard`
  and `minimal` alternatives. A minimal alternative that omits atomic booking
  would describe a partial and unsafe product; therefore alternative size must
  not weaken Appointment semantics.
- **LCK-004**: Existing trigger meanings and lock selection remain unchanged.
  A Blueprint that does not satisfy ELI-001 through ELI-009 cannot select the
  Appointment asset even if its name or prose mentions booking.
- **LCK-005**: Before compiler-facade Appointment dispatch, the immutable lock
  set is exactly these seven registered Golden coordinates and manifest
  digests, with no missing, additional, duplicate, stale, or lifecycle-drifted
  package:

  ```text
  core.crud@1.0.1                 sha256:8dede9ba8d63bea9b09c7bf7ac6ce784c52595b644d03eca52ea6996a31882d1
  core.workflow@1.0.1             sha256:16ebf7d8128f30e656d7c86e39ef36323991cf7af7ea18a5d81a3ac0e4c06884
  core.identity-policy@1.0.0      sha256:a216444b219f00431820a0df8e2bc3b604296430beb8fa6549f1b40c92025d82
  core.policy-declarations@1.0.0  sha256:56e6ead5aaa6e9f5fe9cf7c608b6b51b16064964cf95cd123bdc3e0725642c54
  core.audit@1.0.2                sha256:fe6616252c7b44efe61d516d305e689f3f593d70d5287baac31b5f31013addc8
  core.notification@1.1.1         sha256:207eaa0fd719013129ba84bd8f66f82219b619ee1f5c9e2d4e3d896c339e6132
  scheduling.appointment@1.0.0    sha256:eb3f409908e2f4708a3523767a27a0d30ad4277f2c89827b97f9e379dc82738b
  ```

  The lock's application Graph checksum must equal the hash of the exact
  immutable Graph supplied to the compiler. A custom catalogue or a correctly
  named package with another digest cannot satisfy this witness.

### Deterministic binding derivation

- **BND-001**: The planner emits every required
  `scheduling.appointment@1.0.0` input exactly once and emits no unknown input:
  `serviceEntity`, `serviceNameField`, `serviceDurationMinutesField`,
  `serviceActiveField`, `scheduleEntity`,
  `scheduleServiceReferenceField`, `scheduleStartField`, `scheduleEndField`,
  `scheduleTimezoneField`, `scheduleCapacityField`, `scheduleStatusField`,
  `appointmentEntity`, `appointmentScheduleReferenceField`,
  `appointmentCustomerNameField`, `appointmentNotesField`,
  `appointmentCancellationReasonField`, and `appointmentStatusField`.
- **BND-002**: Entity inputs use `graph.domain.<entityKey>`. Field inputs use
  `graph.domain.<entityKey>.<emittedFieldKey>`. Reference-field bindings use
  the Graph scalar key emitted by the accepted Blueprint-to-Graph conversion,
  including its deterministic `Id` suffix rule, rather than the raw Blueprint
  reference key when they differ.
- **BND-003**: During composition, a selected asset is resolved by exact key,
  version, and digest to its registered physical manifest. A manifest input of
  type `domain.field` converts its qualified graph symbol to the existing
  owner-aware binding `{ graphSymbol: "graph.domain.<entityKey>", fieldKey:
"<emittedFieldKey>" }`. A `domain.entity` input retains the entity graph
  symbol. No string-suffix heuristic may substitute for manifest input type.
- **BND-004**: Owner, field type, and requiredness are revalidated against the
  immutable composed Graph. Missing owners, cross-entity fields, wrong types,
  duplicate bindings, missing inputs, extra inputs, or custom-catalogue
  references without the exact registered manifest fail before Publish.
- **BND-005**: The catalogue input projection stays
  `{ key, required }`; it gains no serialized `type` field. The physical
  versioned capability manifest remains the type authority, avoiding a second
  drifting schema and preserving the current catalogue contract.

### Numeric-domain semantics

- **NUM-001**: Keep the existing Approval numeric-domain admission rule exact.
  Do not broaden a general `number` or `integer` rule.
- **NUM-002**: Under the complete Appointment witness only, admit numeric
  domains on exactly the Service duration-minutes and Schedule capacity slots.
  Both are required Blueprint `number` fields that project to Graph integers,
  with the exact domain
  `factory.numeric-field-domain/v1`, exclusive minimum `0`, and no calculation.
- **NUM-003**: Missing domains, zero-inclusive or negative domains, maximums or
  steps not present in the reviewed contract, calculations, numeric domains on
  any other Appointment field, or an incomplete Appointment witness fail
  closed. This exception does not authorize numeric-domain changes for another
  family.

### Compiler-facade dispatch

- **FAC-001**: Both compiler-facade seams that would otherwise invoke the
  Approval numeric selector may bypass it only after one shared compiler-private
  predicate, implemented only in
  `packages/compiler/src/appointment-compilation-admission.ts`, proves LCK-005,
  the exact ADR-0071 Appointment runtime profile, and FAC-002 through FAC-005.
  `packages/compiler/src/index.ts` is the sole production importer and invokes
  that predicate at exactly the bundle-generation and page-runtime facade
  seams. The predicate is driven by the verified immutable lock and bound Graph
  fields; it cannot use a product key, definition key, label, route,
  presentation profile, prose, or the mere presence of numeric domains.
- **FAC-002**: Resolve `serviceDurationMinutesField` through its owner-aware
  binding to the exact bound Service entity and resolve
  `scheduleCapacityField` to the exact bound Schedule entity. Each resolved
  field exists exactly once, is required, has Graph type `integer`, and has no
  `calculation`.
- **FAC-003**: Each of those two fields has an own numeric domain exactly equal
  to:

  ```json
  {
    "apiVersion": "factory.numeric-field-domain/v1",
    "minimum": { "value": 0, "inclusive": false }
  }
  ```

  A missing or inherited domain, inclusive or nonzero minimum, maximum, step or
  unknown member, calculation, wrong owner, wrong field, wrong type, or optional
  field rejects compiler admission before any Approval-selector bypass. Graph
  parsing must reject a `step` or other unknown domain member before this
  predicate runs.

- **FAC-004**: Across every field in the immutable Graph, the only fields with
  `numericDomain` are the two exact fields in FAC-002. An additional domain on
  any business, identity, session, injected, or unbound field fails closed.
  Other integer fields without a domain do not satisfy and do not invalidate
  this exact two-domain witness. Independently, no field anywhere in the
  immutable Graph may declare `calculation`, whether the field is bound or
  unbound, numeric or nonnumeric, business-authored or Factory-injected. Any
  calculation rejects the shared predicate before either facade seam bypasses
  the Approval selector.
- **FAC-005**: A missing, additional, duplicate, stale, digest-mismatched, or
  non-Golden lock; incomplete or cross-owner binding; Graph-checksum mismatch;
  altered numeric witness; or failure of the accepted Appointment profile must
  return the existing bounded unsupported-profile/compilation error. It may not
  fall through to Approval, CRUD, Task, `core.scheduling`, or partial
  Appointment output.
- **FAC-006**: Passing FAC-001 through FAC-005 changes only facade dispatch. It
  must call the exact already accepted Appointment template/runtime/API/schema
  path and produce its existing bytes. Any need to alter generated source,
  endpoint behavior, Prisma schema or migration, persisted data, runtime
  authorization, history, or atomicity exceeds this amendment and stops work.
- **FAC-007**: The module named in FAC-001 and all of its symbols are private
  compiler implementation details. They must not be re-exported from
  `packages/compiler/src/index.ts`, any other public barrel, the package export
  map, or the `@factory/compiler` entry point, and no production module other
  than `packages/compiler/src/index.ts` may import them. The root entry's
  enumerated public JavaScript and type symbols must remain identical to source
  base `b8d796961b1ff68c7d5efa1a12fe353aa370eee8`. Every package subpath,
  including `@factory/compiler/dist/*`, `@factory/compiler/src/*`,
  `@factory/compiler/appointment-compilation-admission`, and
  `@factory/compiler/package.json`, must fail through standard Node package
  resolution with `ERR_PACKAGE_PATH_NOT_EXPORTED`. This private extraction
  creates no stable package API or implementation identifier.
- **FAC-008**: To prove the real page-runtime seam independently, the private
  module may expose a test-only single-assignment registration and invocation
  seam. During `packages/compiler/src/index.ts` module initialization, the
  facade registers the actual local `renderPageRuntime` function reference,
  not a wrapper, duplicated predicate, or substitute renderer. The focused
  compiler test imports the private module by repository-relative test path and
  invokes that registered reference with valid and adversarial immutable Graph
  and lock inputs. Missing or repeated registration fails closed. These private
  symbols are covered by FAC-007, are never reachable through a package
  specifier, and may neither alter normal dispatch nor change any generated
  byte.

### Definition-family execution and deterministic seeds

- **DEF-001**: The Appointment registry row declares its compiler profile
  separately from its family version. Existing family rows and their execution
  checks remain unchanged; an implementation may use a backward-compatible
  private fallback for rows that predate the explicit compiler-profile member.
- **DEF-002**: Appointment admission expects the exact seven locks and 17
  owner-aware bindings above. It must compare the composition result rather
  than trusting the proposed row.
- **DEF-003**: Deterministic Appointment seed data, when the registered row
  supplies it, must preserve valid references, positive duration and capacity,
  a timezone, `end > start`, and accepted statuses. It must contain only
  synthetic local fixture values and no prompt, response, credential, or user
  data. Invalid or dangling seed relations fail admission.
- **DEF-004**: Existing generic seed behavior remains unchanged for every old
  family. Appointment-specific seed projection is conditional on the complete
  structural witness and cannot be selected by product or definition key.

## Security and data boundaries

- **SEC-001**: This decision introduces no new tenant, identity, credential,
  persistence, network, browser, or runtime trust boundary. ADR-0071 remains
  authoritative for server-owned availability, customer ownership,
  authorization-before-disclosure, idempotency, serialization, history, and
  audit semantics.
- **SEC-002**: Selection and binding are authority boundaries. Client- or
  model-proposed locks, bindings, digests, numeric domains, seed references, or
  catalogue entries are untrusted and must be recomputed and validated against
  registered manifests and the immutable Graph.
- **SEC-003**: Errors remain safe and bounded. They may identify an invalid
  family, lock, or binding key but must not include raw prompts, model
  responses, credentials, connection strings, tenant data, or record data.
- **SEC-004**: No fuzzy field-name matching, label matching, product-key branch,
  definition-key branch, or prose branch is allowed. Exact comparison to the
  four versioned identifiers in ELI-005 is allowed only for their fixed family
  slots. Every other ambiguous candidate is a rejection condition, not a reason
  to infer a binding.
- **SEC-005**: The compiler is an independent trust boundary. Planner and
  composer acceptance do not authorize it to trust proposed locks, bindings,
  domain counts, or fixture hashes. It revalidates FAC-001 through FAC-005
  against the exact immutable input before selecting the conditional profile or
  suppressing another profile's validation.
- **SEC-006**: The package export map is a fail-closed consumer-resolution
  boundary for compiler internals. It does not claim to sandbox a local process
  that already has direct filesystem access; that residual local-worker risk
  remains owned by the platform and Tech Lead under the threat model. No test
  may pass by deleting the emitted private file or by relying only on source
  text inspection: the built package must allow the root import and reject the
  deep package import from an actual dependent workspace consumer.

## Compatibility and migration

- **CMP-001**: This is an additive experiment with no data migration and no
  version bump. It must not rewrite an existing Published Graph, composition
  input, compilation, receipt, history row, or generated database.
- **CMP-002**: Capture a clean source-base manifest for all seven accepted
  definitions before implementation. After implementation, their definition
  order and bytes, family interpretation, plans, lock sets, bindings, diffs,
  Graph hashes, and compiled file paths and bytes must be identical.
- **CMP-003**: The catalogue's own JSON projection is intentionally allowed to
  add the optional Appointment entry. That additive registry change does not
  waive CMP-002 for any existing product output.
- **CMP-004**: The new Appointment definition is accepted only after two clean
  compilations from the same immutable input produce identical hashes and file
  bytes and its complete local PostgreSQL/API/browser journey passes ADR-0071.
- **CMP-005**: No compatibility path for the archived Python or legacy console
  platform may be added.
- **CMP-006**: Compiler compatibility evidence names `graphSha256` only for
  `hashApplicationGraph(compilerInput.graph)`, where `compilerInput.graph` is
  the exact deep-cloned composed Graph after
  `integration.compositionSelections` is removed and is the Graph actually
  passed to `generateApplicationBundle`. That value must equal
  `compositionLock.applicationGraphChecksum`. A hash of the pre-removal composed
  Graph may be retained under a different descriptive evidence key but cannot
  be called the compiler-input `graphSha256` or satisfy the lock witness.
- **CMP-007**: The immutable old-seven fixture retains a safe capture receipt at
  `docs/acceptance/evidence/appointment-booking/definition-composition/seven-definition-baseline-capture.json`.
  Its only own keys are `parentHead`, `statusPorcelainV1`, `nodeVersion`,
  `pnpmVersion`, `command`, `captureScriptPath`, `captureScriptSha256`,
  `fixturePath`, and `fixtureSha256`. `parentHead` is exactly
  `b8d796961b1ff68c7d5efa1a12fe353aa370eee8`;
  `statusPorcelainV1` is the exact empty string returned by
  `git status --porcelain=v1 --untracked-files=all`; versions are exact command
  outputs; `captureScriptPath` is exactly
  `packages/compiler/test/fixtures/capture-seven-definition-baseline.mjs`;
  `captureScriptSha256` is the SHA-256 of that retained tracked source;
  `fixturePath` is exactly
  `packages/compiler/test/fixtures/seven-definition-baseline.json`; and both
  SHA-256 values use `sha256:` plus 64 lowercase hex characters. Capture occurs
  in a clean isolated checkout of that parent; the receipt is not reconstructed
  from memory. It contains no environment values, credentials, raw
  prompt/response material, absolute user paths, or business records.
- **CMP-008**: The only authorized capture invocation, stored byte-for-byte in
  `receipt.command`, is:

  ```text
  node packages/compiler/test/fixtures/capture-seven-definition-baseline.mjs --parent b8d796961b1ff68c7d5efa1a12fe353aa370eee8 --fixture packages/compiler/test/fixtures/seven-definition-baseline.json --receipt docs/acceptance/evidence/appointment-booking/definition-composition/seven-definition-baseline-capture.json
  ```

  The retained script accepts exactly those named arguments and no others. It
  creates or selects an isolated checkout at the exact parent, verifies the
  clean porcelain status before and after capture, runs without network or
  provider access, records exact Node and pnpm versions, derives the seven
  products through the repository composition/compiler path, writes the
  fixture deterministically, hashes its own retained source and the fixture,
  and writes the closed CMP-007 receipt. A one-off shell expression, manually
  edited fixture, undocumented temporary script, or command mismatch is not
  accepted evidence.

- **CMP-009**: `packages/compiler/package.json` may differ from source base only
  by the exact PRO-005 `exports` member. Existing `name`, `version`, `private`,
  `type`, `main`, `types`, scripts, dependencies, and devDependencies remain
  byte-equivalent in value. All other package manifests and `pnpm-lock.yaml`
  remain byte identical. Existing root imports in `apps/compiler-worker`,
  `apps/control-plane`, repository scripts, and tests must continue to resolve
  without source changes.

## Evidence gates

- **TST-001**: Keep the Task 4 pre-registration test RED until ADR acceptance.
  After authorization, make the focused Appointment registry test pass without
  changing its reviewed product semantics, then run the complete adapter data
  and requirement-interpreter suites.
- **TST-002**: Add planner tests proving exact Appointment selection in both
  `standard` and `minimal`, all seven exact locks, all 17 exact bindings, the
  reference `Id` emission rule, owner-aware field conversion, interface
  closure, and deterministic output.
- **TST-003**: Add adversarial tests for stale version or digest, unregistered
  physical manifest, custom-catalogue injection, missing or extra input,
  duplicate binding, wrong owner or field type, relation reversal, extra
  entity, workflow or permission drift, and omitted Appointment lock.
- **TST-004**: Add rename-invariance tests for entity keys and only the
  structurally unique field slots listed in ELI-004. Independently reject
  renaming or reordering `startUtc`, `endUtc`, `notes`, or
  `cancellationReason`; reject exchanged canonical key positions, changed
  requiredness, extra numeric domains, missing positive domains, calculation
  presence, and Approval-regression attempts. Do not claim to detect a hidden
  semantic exchange when the serialized Blueprint is byte-equivalent.
- **TST-005**: Add seed tests proving referential integrity, positive capacity
  and duration, non-equal ordered timestamps, valid timezone and statuses, and
  absence of raw user or provider data.
- **TST-006**: Run the focused capability catalogue, plan alternatives, product
  composer, Appointment scheduling, composition contract, adapter admission,
  Product Definition Data, and requirement-interpreter suites; then run scoped
  package typecheck and build checks.
- **TST-007**: Recompile all seven accepted definitions from their immutable
  inputs and compare the source-base manifest byte for byte. Compile
  Appointment twice and compare its immutable Graph hash and every emitted
  file byte. No snapshot update may conceal drift.
- **TST-008**: Run the repository capability verifier and the complete
  ADR-0071 PostgreSQL/API/browser evidence gate before counting Appointment as
  an accepted product or demonstrated runtime family.
- **TST-009**: Store commands, source commit, exact ADR SHA-256, tool versions,
  outputs, hashes, independent review, and artifact paths under the active PM
  ledger and `docs/acceptance/evidence/appointment-booking/`. A screenshot alone
  is not evidence of composition or runtime correctness.
- **TST-010**: At both compiler-facade seams, prove the exact two-domain witness
  permits the accepted Appointment profile and skips only the Approval numeric
  selector. Independently reject missing duration or capacity domain; an extra
  domain; wrong owner, binding, type, or requiredness; inclusive, nonzero,
  maximum-bearing, or otherwise altered bounds; a calculation; unknown `step`;
  missing, extra, duplicate, stale-version, stale-digest, or non-Golden locks;
  incomplete bindings; and Graph-checksum mismatch. Every rejection occurs
  before template rendering and emits no partial bundle.
- **TST-011**: At both compiler-facade seams, independently add a validly shaped
  `calculation` to a bound duration or capacity field, an unbound business
  field, and a Factory-injected identity or session field. Each case must reject
  before Approval-selector bypass and before any generated file is emitted,
  even when the exact two numeric domains and all seven locks otherwise match.
- **TST-012**: Prove `graphSha256` equals both the actual post-removal immutable
  compiler-input Graph hash and the lock checksum, differs from the pre-removal
  composed Graph hash when selections were present, and is stable across both
  Appointment compilations. Independently parse and verify the closed CMP-007
  receipt, exact CMP-008 command, exact parent HEAD, empty status, retained
  capture-script hash, tool versions, and fixture SHA-256 without printing
  prohibited material.
- **TST-013**: Prove the shared witness is implemented only at
  `packages/compiler/src/appointment-compilation-admission.ts`, is imported in
  production only by `packages/compiler/src/index.ts`, and is called by both
  facade seams. Compare the package's enumerated public JavaScript and type
  exports with source base `b8d796961b1ff68c7d5efa1a12fe353aa370eee8` and
  prove no witness symbol or private subpath is public. Retain the old-seven
  byte comparison and dual Appointment byte comparison while exercising this
  private module boundary.
- **TST-014**: After a clean compiler build, run an actual Node ESM process from
  the dependent `apps/compiler-worker` workspace. Prove `import("@factory/compiler")`
  succeeds and exposes the same root symbols as the source-base entry. Prove
  imports of the emitted witness through
  `@factory/compiler/dist/appointment-compilation-admission.js`, the equivalent
  source and extensionless subpaths, and `@factory/compiler/package.json` each
  reject specifically with `ERR_PACKAGE_PATH_NOT_EXPORTED`. Validate the exact
  PRO-005 map and CMP-009 manifest and lockfile invariants.
- **TST-015**: Prove FAC-008 registers exactly the real local
  `renderPageRuntime` reference once. Invoke it through the repository-relative
  private test seam for a valid Appointment and for every TST-010/TST-011
  numeric, calculation, lock, binding, and checksum mutation. The valid case
  must equal the normal bundle's `web/app/page-runtime.tsx` bytes; every invalid
  case must reject before renderer output. A helper that calls only
  `exactAppointmentNumericWitness` does not satisfy this gate.

## Verification commands

Run these commands from the repository root after implementation. Each named
pre-existing test path and verifier script exists at the source base. New
Appointment, package-resolution, and real-renderer assertions belong in the
existing focused test files. The sole new verification executable authorized
by this amendment is the exact retained CMP-008 capture script; it is not a
runtime or product executable.

- **VER-001 — Planner, composer, binding, and adversarial gate**:

  ```powershell
  pnpm --filter @factory/capabilities exec vitest run test/plan-alternatives.test.ts test/product-composer.test.ts test/composition-contract.test.ts test/appointment-scheduling.test.ts test/capability-registry.test.ts
  ```

  The command must cover both alternatives, all seven locks, all 17 bindings,
  manifest-owned field conversion, unique-slot rename invariance, fixed
  ambiguous-slot identifiers and order, and every rejection in TST-003 and
  TST-004. A passing broad package suite cannot replace these focused
  assertions.

- **VER-002 — Definition-family admission gate**:

  ```powershell
  pnpm --filter @factory/adapters exec vitest run test/appointment-definition-admission.test.ts test/product-definition-data.test.ts test/requirement-interpreter.test.ts
  ```

  Before acceptance and implementation, this is the recorded RED command. At
  GREEN it must prove append-only eight-row admission, valid seeds, exact family
  identifiers, and unchanged ordered values for the old seven rows.

- **VER-003 — Old-seven bytes and dual Appointment compilation**:

  ```powershell
  pnpm --filter @factory/compiler build
  pnpm --filter @factory/compiler exec vitest run test/index-exports.test.ts test/definition-data-compatibility.test.ts test/definition-data-authoring.test.ts test/appointment-booking-runtime.test.ts
  ```

  Extend the existing `definition-data-compatibility.test.ts` harness with an
  independently captured source-base `b8d79696` manifest for all seven accepted
  definitions. The same test command must compare ordered paths, bytes, per-file
  SHA-256 values, whole-bundle hashes, plan/Graph hashes, and compile the new
  Appointment immutable input twice with identical results. The export test
  enforces FAC-007, FAC-008, and TST-013 through TST-015, including the
  sole-importer boundary, the exact package export map, actual consumer import
  success and deep-import rejection, and invocation of the registered real
  renderer. The same command also executes TST-010 through TST-012: the reported
  `graphSha256` hashes the actual
  post-removal compiler input and equals the lock checksum; every
  compiler-facade numeric, calculation, or lock mutation fails before output;
  and the closed capture receipt matches the retained script and command.
  Updating expected old-seven bytes to make this command pass is forbidden.

- **VER-004 — Built definition and capability verifier gate**:

  ```powershell
  pnpm --filter @factory/adapters build
  node scripts/verify-product-definition-data.mjs
  pnpm --filter @factory/capabilities exec vitest run test/capability-registry.test.ts test/appointment-scheduling.test.ts
  ```

  The existing definition verifier must report eight valid, distinct, admitted
  rows while preserving the seven historical keys and source-to-built byte
  equality. The capability tests are the repository's existing manifest,
  digest, fixture, contract, and registry verifier for the selected asset; no
  replacement script or unregistered manifest is accepted.

- **VER-005 — Scoped static and build gate**:

  ```powershell
  pnpm --filter @factory/graph --filter @factory/capabilities --filter @factory/adapters --filter @factory/compiler typecheck
  pnpm --filter @factory/graph --filter @factory/capabilities --filter @factory/adapters --filter @factory/compiler build
  pnpm exec prettier --check packages/capabilities/src packages/capabilities/test packages/adapters/src/requirements packages/adapters/test packages/compiler/test scripts/verify-product-definition-data.mjs docs/adr/adr-0072-appointment-definition-composition-admission.md docs/acceptance/evidence/appointment-booking/definition-composition/seven-definition-baseline-capture.json
  ```

  `packages/compiler/package.json` may differ only as specified by PRO-005 and
  CMP-009. The lockfile and every other package manifest must remain byte
  identical to their accepted source-base versions.

- **VER-006 — Integrated regression gate**:

  ```powershell
  pnpm --filter @factory/capabilities test
  pnpm --filter @factory/adapters test
  pnpm --filter @factory/compiler test
  pnpm typecheck
  pnpm build
  ```

  This supplements VER-001 through VER-005; it does not replace their explicit
  selection, adversarial, compatibility, or determinism assertions.

- **VER-007 — Evidence recording**: The baseline owner first captures the
  old-seven fixture through the retained CMP-008 script, which owns and verifies
  the clean isolated checkout of the exact parent HEAD and stores the bounded
  CMP-007 receipt. PM then opens one PowerShell transcript before VER-001, runs
  VER-001 through VER-006 without omitting a command, stops the transcript, and
  records source and ADR identity. The complete capture command is literal and
  measurable:

  ```powershell
  node packages/compiler/test/fixtures/capture-seven-definition-baseline.mjs --parent b8d796961b1ff68c7d5efa1a12fe353aa370eee8 --fixture packages/compiler/test/fixtures/seven-definition-baseline.json --receipt docs/acceptance/evidence/appointment-booking/definition-composition/seven-definition-baseline-capture.json
  if ($LASTEXITCODE -ne 0) { throw "Seven-definition baseline capture failed." }
  pnpm --filter @factory/compiler exec vitest run test/definition-data-compatibility.test.ts
  if ($LASTEXITCODE -ne 0) { throw "Baseline receipt or compatibility verification failed." }
  ```

  The integrated evidence commands are:

  ```powershell
  $appointmentEvidenceDirectory = "docs/acceptance/evidence/appointment-booking/definition-composition"
  New-Item -ItemType Directory -Force -Path $appointmentEvidenceDirectory | Out-Null
  Start-Transcript -Path "$appointmentEvidenceDirectory/verification.log" -Force
  git rev-parse HEAD
  pnpm --version
  node --version
  # Run VER-001 through VER-006 here and stop immediately on any non-zero exit.
  Stop-Transcript
  git rev-parse HEAD | Set-Content "$appointmentEvidenceDirectory/source-commit.txt"
  (Get-FileHash "docs/adr/adr-0072-appointment-definition-composition-admission.md" -Algorithm SHA256).Hash.ToLower() | Set-Content "$appointmentEvidenceDirectory/adr-0072.sha256"
  Get-ChildItem -Path $appointmentEvidenceDirectory -File | Where-Object Name -ne "evidence.sha256" | Sort-Object Name | Get-FileHash -Algorithm SHA256 | ForEach-Object { "$($_.Hash.ToLower())  $($_.Path.Replace((Get-Location).Path + '\\', ''))" } | Set-Content "$appointmentEvidenceDirectory/evidence.sha256"
  ```

  PM records the exact command exit codes and test counts from
  `verification.log`, the old-seven baseline manifest path and hash, both
  Appointment compiler-input/lock/bundle hashes, validated CMP-007 receipt,
  reviewer verdict, and evidence manifest hash in
  `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`.
  Evidence must contain no credentials, environment values, raw prompts or
  responses, connection strings, absolute user paths, or business records. If
  the transcript would capture any such value, stop and use bounded test
  summaries instead.

## Rollback and stop conditions

- **RBK-001**: Before the first Appointment Publish, rollback is removal of the
  Appointment registry row, trigger, optional catalogue entry, planner binding
  derivation, bounded numeric-domain branch, compiler-facade dispatch guard,
  private real-renderer test seam, and the compiler export map. The compiler
  manifest then returns exactly to its source-base value, and the seven
  source-base outputs must still match their recorded bytes.
- **RBK-002**: After any Appointment Publish, retain exact readers, planners,
  compilers, and generated-runtime support for its immutable version. Stop new
  Appointment admissions by disabling the registry entry through a new
  governed decision; never rewrite historical Graphs or compilations.
- **STP-001**: Stop and return to Tech Lead review if any existing definition
  or compiled byte changes, any accepted identifier or schema version must
  change, or implementation requires a new dependency, database, API, runtime,
  provider, service, or Compose topology.
- **STP-002**: Stop if eligibility depends on a product key, definition key,
  label, description, prompt, prose, fuzzy match, or field-name guess. Stop if a
  structurally unique slot from ELI-004 cannot support a safe rename, or if an
  implementation admits an ambiguous slot without the exact identifier and
  position in ELI-005.
- **STP-003**: Stop if `minimal` omits Appointment, any of the 17 inputs is
  missing or extra, a lock or digest drifts, a custom catalogue can bypass the
  registered manifest, or an owner-aware field binding cannot be proved.
- **STP-004**: Stop if numeric domains are accepted outside the exact two
  Appointment slots, if Approval behavior broadens or regresses, or if invalid
  and dangling seeds are admitted.
- **STP-005**: Stop if implementation would change ADR-0071's runtime,
  authorization, customer ownership, history scope, persistence, or atomic
  capacity semantics. Such a change requires a separate proposed ADR.
- **STP-006**: Stop if either facade can bypass Approval validation without the
  complete FAC-001 through FAC-005 witness, if the two facade seams implement
  different predicates, if the witness is implemented outside the exact
  FAC-001 module, imported by a production module other than
  `packages/compiler/src/index.ts`, or exported through any public compiler
  surface. Stop if any bound, unbound, business, identity, session, or injected
  field with `calculation` reaches bypass, if the public JavaScript or type
  export surface drifts, or if an invalid Appointment-shaped Graph produces any
  partial generated file.
- **STP-007**: Stop if `graphSha256` hashes a Graph other than the exact compiler
  input, does not equal the lock checksum, or if the old-seven fixture lacks a
  contemporaneous clean-checkout CMP-007 receipt created only by the exact
  CMP-008 command and retained script. A claimed historical capture
  reconstructed from memory is not accepted evidence.
- **STP-008**: Stop if the compiler export map exposes any key other than `.`,
  changes the root target, breaks an existing root consumer, requires a
  dependency or lockfile change, or permits any `@factory/compiler/*` package
  subpath. Stop if the page-runtime test seam registers a wrapper or duplicate
  renderer, can be registered twice, becomes publicly reachable, changes
  normal rendering, or fails to exercise the actual `renderPageRuntime`
  function.

## Consequences

### Positive

- **POS-001**: The reviewed Appointment definition can reach the already
  accepted runtime through one deterministic and reviewable composition path.
- **POS-002**: Structural selection and manifest-owned binding conversion keep
  model output and catalogue proposals outside the authority boundary.
- **POS-003**: The exact compatibility gate prevents expansion of product
  variety from destabilizing the seven accepted products.

### Negative

- **NEG-001**: Canonical keys and order for four ambiguous slots are a deliberate
  V1 constraint. Those four slots cannot be renamed through automatic family
  admission until a separately versioned semantic-slot contract is accepted.
- **NEG-002**: The planner and composer gain one family-specific closed witness
  and require broader adversarial and byte-compatibility evidence.
- **NEG-003**: `standard` and `minimal` cannot differ by omitting the booking
  capability for this family, limiting optimization until a safe smaller
  Appointment contract exists.
- **NEG-004**: The closed export map intentionally rejects previously possible
  but undocumented deep imports. Repository search found no accepted consumer;
  discovery of one stops implementation for explicit compatibility review.

## Alternatives considered

### Keep the current shared composition contract

- **ALT-001**: **Description**: Leave Task 4 RED and do not register
  Appointment.
- **ALT-002**: **Rejection reason**: Safe but does not deliver the accepted
  Appointment experiment or exercise ADR-0071 through Product Definition Data.

### Append the definition under an existing family

- **ALT-003**: **Description**: Treat Appointment as Task or Approval and reuse
  the six fixed locks.
- **ALT-004**: **Rejection reason**: Produces a false composition that omits the
  atomic booking capability and violates family, numeric-domain, and runtime
  evidence boundaries.

### Add semantic tags or bump Graph/Blueprint schemas now

- **ALT-005**: **Description**: Introduce versioned semantic slot identifiers
  to remove the ordered-slot constraint.
- **ALT-006**: **Rejection reason**: Better for a future generalized family
  system, but unnecessary for one bounded experiment and would expand schema,
  migration, compatibility, and security scope.

### Use fuzzy names or model inference to derive bindings

- **ALT-007**: **Description**: Fuzzily match entity or field names, labels, or
  model prose to the 17 inputs rather than freezing four exact ambiguous-slot
  identifiers.
- **ALT-008**: **Rejection reason**: Non-deterministic, rename-sensitive, and an
  unsafe authority transfer to untrusted text. Exact equality to the four
  ELI-005 identifiers is a bounded versioned contract and does not authorize
  this alternative.

### Rely on source-barrel privacy without a package export map

- **ALT-009**: **Description**: Keep only the source-level no-re-export rule and
  treat emitted `dist/*` files as private by convention.
- **ALT-010**: **Rejection reason**: Node resolves the undeclared package
  subpath today, so convention does not enforce FAC-007 at the consumer
  boundary. The exact root-only export map is smaller and reversible.

### Inline or duplicate the witness to avoid an emitted private module

- **ALT-011**: **Description**: Move the witness back into `index.ts` or copy it
  into each facade seam so no private compiled module exists.
- **ALT-012**: **Rejection reason**: This removes the already reviewed shared
  predicate boundary or permits seam drift. A root-only export map protects the
  private module without changing runtime semantics.

## Ownership

- **OWN-001**: Tech Lead owns this proposed contract and any future amendment.
- **OWN-002**: PM owns founder or standing-policy acceptance, source-base
  freeze, disjoint write assignment, evidence ledger, and stop-condition
  enforcement.
- **OWN-003**: The implementation owner may change only the accepted
  definition-family, capability catalogue/planner, composer, the bounded
  compiler-facade dispatch in `packages/compiler/src/index.ts`, the exact
  compiler-private witness module
  `packages/compiler/src/appointment-compilation-admission.ts`, the exact
  PRO-005 metadata in `packages/compiler/package.json`, and focused test,
  fixture, and evidence paths, including the exact retained CMP-008 capture
  script and CMP-007 receipt. No other compiler production path or package
  manifest is in scope, and `pnpm-lock.yaml` remains frozen. ADR-0071
  templates/runtime, generated API/database/schema/migrations, and unrelated
  catalogue data remain frozen.
- **OWN-004**: Independent reviewer verifies exact-hash conformance, old-seven
  byte compatibility, adversarial cases, and zero P0/P1 findings before PM may
  authorize registration or Publish.

## References

- **REF-001**: `docs/adr/adr-0071-atomic-appointment-booking.md`.
- **REF-002**:
  `docs/superpowers/specs/2026-09-18-appointment-booking-v1-design.md`.
- **REF-003**:
  `docs/superpowers/plans/2026-09-18-appointment-booking-v1.md`.
- **REF-004**:
  `.superpowers/sdd/2026-09-18-appointment-booking-v1/task-4-report.md`.
- **REF-005**: `docs/tech-governance.md` and `docs/threat-model.md`.
