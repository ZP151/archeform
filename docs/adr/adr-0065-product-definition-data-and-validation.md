---
title: "ADR-0065: Product Definition Data and Batch Validation"
status: "Proposed"
date: "2026-09-13"
authors: "Archeform Tech Lead"
tags:
  [
    "architecture",
    "decision",
    "product-definitions",
    "requirements",
    "validation",
    "security",
  ]
supersedes: ""
superseded_by: ""
---

# ADR-0065: Product Definition Data and Batch Validation

## Status and recommendation

**Proposed** | Accepted | Rejected | Superseded | Deprecated

Recommendation: **migrate** the four private, canonical definition entries from
per-definition executable projectors to reviewed
`factory.product-definition-data/v1` values parsed from one checked-in JSON
catalogue. A fixed, versioned family registry continues to own all executable
projection, parameter, Graph, compiler, verifier and presentation behavior.
The data drives canonical Requirement/Blueprint values, provider selection
schema and guidance, and supported/clarification projection; it cannot select
an import, package, route, provider, compiler target, template or component.

This bounded migration ships exactly the four already delivered definitions.
It adds **zero** definitions, distinct business semantics, runtime families or
product-complete journeys. The provider-free batch validator proves the
authoring boundary and reports unsupported candidates and cosmetic duplicates;
it does not force a fifth entry through an existing family. The first later
representative batch is a separate product task after this foundation passes.

This proposal is not accepted. It authorizes no source or test change, Product
Publish, Compilation, Preview, provider call, external resource, deployment,
Git action or release. It is eligible for the founder's 2026-09-01 standing
acceptance only if a separate qualified read-only reviewer returns
`APPROVED_FOR_STANDING_ACCEPTANCE: yes`, P0/P1 `0/0`, no material ambiguity,
and PM records this ADR's exact hash, reviewer, evidence and standing authority.
The proposing Tech Lead cannot accept or implement this ADR.

## Context and decision boundary

- **CTX-001**: The private catalogue currently registers four static TypeScript
  entries: `restaurant-ordering`, `expense-approval`,
  `purchase-request-approval` and `team-task-tracking`. Each entry combines a
  Zod selection schema, provider JSON Schema, guide, instruction, canonical
  structure and executable projector. Expense and Purchase share
  `createApprovalDefinition`; Restaurant and Task retain independent projectors.
  This is a useful four-entry proof but still requires executable source work
  for every definition.
- **CTX-002**: A metadata inventory beside those projectors would not reduce
  authoring effort. The reviewed data must be the source for the canonical
  Requirement/Blueprint values and their selection projection. Fixed family
  code may interpret that data only within an already admitted contract.
- **CTX-003**: Root captured all four catalogue structures, guides,
  instructions, selection JSON Schemas, supported/clarification projections,
  true Published Graphs, separate composition locks and complete ordered
  generated bundles from clean `f8cdfe81`. The immutable baseline is
  `packages/compiler/test/fixtures/definition-data-baseline.json`, with
  recorded SHA-256
  `585efce4cf6383abdf323ba8d9de1d2f9b928f254a9cdb907e83698d2c3b28ea`.
  It is compatibility authority and must never be regenerated after production
  migration.
- **CTX-004**: Existing runtime admission is shape-bound. Restaurant V3 checks
  its exact composition profile, surfaces, 15 pages, seven journeys, 99 field
  authorities, 135 binding policies and canonical lock. Approval correction
  checks one exact draft/submitted/approved/returned flow, three authority
  roles, seven pages, four entities, six exact locks and bindings, and fixed
  transition effects. Task correction checks its exact five business fields,
  status flow, two grants, five pages, three entities, and six exact locks and
  bindings. A data entry cannot widen any of these selectors.
- **CTX-005**: Definition input and provider output remain untrusted. A prompt
  may choose a registered definition and bounded identity/question data, but it
  cannot author or select executable material. Definition files are reviewed
  first-party source, not provider output, runtime plugins or user uploads.
- **CTX-006**: The smallest useful scale foundation is the four-entry migration,
  strict candidate validation, deterministic duplicate detection and a
  provider-free batch command. New family variants, retrieval, real-model
  evaluation and the 30-entry milestone remain later goals.

## Current accepted and proposed profiles

- **CUR-001 — Current accepted Golden technology profile**: Node
  `>=22.11.0 <23`, root package manager `pnpm@9.0.0`, TypeScript `^5.7.2`
  resolved `5.9.3`, Next `^15.1.0` resolved `15.5.22`, React and React DOM
  `^19.0.0` resolved `19.2.8`, Puck `^0.22.3` resolved `0.22.3`, XYFlow
  `^12.3.6` resolved `12.11.2`, NestJS `^10.4.15` resolved `10.4.22`, Prisma
  `^6.1.0` resolved `6.19.3`, BullMQ `^5.34.10` resolved `5.81.2`, ioredis
  `^5.4.2` resolved `5.11.1`, PostgreSQL `16-alpine`, Redis `7-alpine`, and
  Dockerfiles on floating-major `node:22-alpine`. Manifests, lockfile,
  Dockerfiles and Compose remain executable authorities.
- **CUR-002 — Current adapter and lifecycle profile**: Private
  `@factory/adapters@0.1.0` uses OpenAI `^4.77.0` resolved `4.104.0` and Zod
  `^3.24.1` resolved `3.25.76`. Public contracts remain
  `factory.requirement-interpretation-result/v1`,
  `factory.requirement-spec/v1`, `factory.product-blueprint/v1`,
  `factory.composition-plan/v1`, `factory.composition-decision/v1`, and
  implemented `factory.application-graph/v1`; Restaurant's accepted compiler
  path retains its existing V3 input. Mutable Draft -> immutable Published
  Graph -> immutable Compilation remains unchanged.
- **CUR-003 — Current definition profile**: Four private static TypeScript
  entries use families `restaurant`, `approval`, and `task`; parameter policies
  are `restaurant-menu` or `none`. Each entry owns executable projection and
  duplicates registration facts across schema, guide, instruction and
  canonical structure.
- **PRO-001 — Proposed private data profile**: Keep every CUR-001/CUR-002
  coordinate, service, public identifier and lifecycle rule. Add private
  serialization `factory.product-definition-catalogue/v1`, whose entries are
  exactly `factory.product-definition-data/v1`. A server-only loader reads the
  one exact adjacent JSON file as bounded UTF-8 bytes; the package build copies
  that exact named file to the matching `dist` location with a fixed-path helper.
  It uses no JSON-module import, directory discovery or path supplied by data.
  No TypeScript setting, manifest range, lockfile resolution or dependency
  changes.
- **PRO-002 — Proposed execution profile**: Replace per-definition projectors
  with one generic projection function plus exactly three fixed registry rows:
  `restaurant` / `restaurant-ordering/v3`, `approval` /
  `approval-correction/v1`, and `task` / `task-correction/v2`. Registry code,
  never JSON or provider output, owns the parameter parser, family semantic
  validator, Graph projection handoff, compiler/verifier admission expectation
  and presentation binding.
- **PRO-003 — Distinction from Golden**: PRO-001/PRO-002 are a proposed private
  adapter serialization and registry arrangement. They are not part of the
  accepted Golden profile unless the separate acceptance record is completed.
  They do not create a public plugin, package export, Graph/API version, runtime
  target, database schema or UI catalogue entry.

## Frozen product-definition data contract

- **DAT-001 — Catalogue envelope**: The checked-in JSON root is the strict
  object `{ apiVersion: "factory.product-definition-catalogue/v1",
definitions: ProductDefinitionDataV1[] }`, with no other keys. UTF-8 input is
  at most 2 MiB. `definitions` contains 1 through 100 entries in declared order.
  Before `JSON.parse` or projection, one deterministic raw-JSON guard tokenizes
  those bounded bytes, keeps a decoded member-name set for each object frame,
  and rejects a repeated decoded name, including escape-equivalent names such as
  `"key"` and `"\u006bey"`. The same guard handles the shipped file and candidate
  bytes received through CLI standard input. Standard parsing then yields only
  JSON primitives, arrays and ordinary objects; closed schemas reject non-finite
  numbers, unsupported Unicode control characters and every unknown field. The
  tokenizer performs no projection or value coercion and uses only the platform
  runtime.
- **DAT-002 — Entry identity and binding**: Every strict entry has exactly
  `apiVersion`, `definitionKey`, `definitionVersion`, `familyBinding`,
  `parameterPolicy`, `primaryJob`, `canonical`, `selection`, `journeys`,
  `admissionExpectations`, and `provenance`. `apiVersion` is exactly
  `factory.product-definition-data/v1`; `definitionKey` is a lower-kebab Graph
  key of 1..128 characters; and `definitionVersion` is exactly `1.0.0` in this
  migration. `familyBinding` is exactly one PRO-002 key/version pair.
  `parameterPolicy` is exactly `none/v1` for Approval and Task or
  `restaurant-menu/v1` for Restaurant. Cross-pair combinations are rejected.
- **DAT-003 — Primary job**: `primaryJob` has exactly `actorKey`, `operation`,
  `entityKey`, and `successState`; each key is a 1..128 character Graph key and
  `successState` may be `null`. The family validator requires all non-null keys
  and the operation to resolve to the canonical roles, permissions, entity and
  workflow or to the fixed Restaurant authority. This data participates in
  semantic identity; display prose does not substitute for it.
- **DAT-004 — Canonical projection**: `canonical` has exactly `spec` and
  `blueprint`, parsed by the existing strict V1 RequirementSpec and
  ProductBlueprint authorities. The stored canonical checksum must match its
  stored spec. The generic projector copies this data, overrides only the
  validated selection's `requirementId`, `outcome`, `materialQuestions` and
  `title`, recomputes `requirementChecksum`, and derives clarifications with the
  existing function. No entry-supplied function runs. The family validator then
  requires the result to satisfy its fixed PRO-002 contract.
- **DAT-005 — Selection data**: `selection` has exactly `providerGuide` and
  `providerInstruction`. `providerGuide` is a family-specific closed object
  validated by the fixed registry; every nested key is enumerated by that
  family schema. `providerInstruction` is reviewed safe business text of
  1..24,000 characters, excluding NUL and C0/C1 control characters except
  ordinary newline. It is the exact static instruction component, never
  concatenated with a definition file path, executable text, user input or raw
  provider output. The selection Zod branch and provider JSON Schema are
  generated from `definitionKey`, the fixed common selection envelope and the
  registry-owned parameter policy; data cannot provide a JSON Schema fragment.
- **DAT-006 — Journeys**: `journeys` has exactly `correction` and `failure`,
  each containing 1..16 strict cases. A case has exactly `key` and `steps`; a
  step has exactly `actorKey`, `entityKey`, `operation`, `fromState`,
  `toState`, and `expectation`. Keys use the Graph-key bound; nullable states
  are Graph keys or `null`; expectation is one of `success`, `denied`,
  `validation-error`, `version-conflict`, `retry-replay`, or `not-found`.
  There are 1..16 steps per case. Family validation resolves every actor,
  entity, operation and state against the canonical data/fixed authority and
  requires at least one ordinary correction/recovery case and one denial or
  failure case. These cases describe verification; they cannot name a route,
  request body, code function or shell action.
- **DAT-007 — Admission expectations**: `admissionExpectations` has exactly
  `capabilityLocks`, `presentation`, and `compilerProfile`. Each capability lock
  has only `key`, `version`, and `manifestDigest`; presentation has only `key`
  and `version`. Every value must exactly equal the fixed registry row and the
  current approved capability catalogue. These are checked claims, not runtime
  selectors. The registry derives actual locks, bindings, compiler profile and
  presentation from the canonical Graph. A data mismatch is rejected rather
  than applied.
- **DAT-008 — Provenance**: `provenance` has exactly `origin`, `owner`,
  `license`, `reviewedOn`, and `decision`. For this first-party migration they
  are exactly `factory-first-party`, `Archeform Product Definition Owner`,
  `UNLICENSED`, an ISO `YYYY-MM-DD` date, and `ADR-0065`. A future copied or
  third-party origin is outside V1 and requires source-study provenance under
  the existing supply-chain policy before a new contract version.
- **DAT-009 — Strict executable exclusion**: The schema has no executable or
  selector field for `module`, `import`, `package`, `path`, `route`, `provider`,
  `target`, `component`, `command`, `script`, `code`, `url`, `function`,
  environment material or template loading. The sole `template` key permitted
  by V1 is the existing Approval `providerGuide.template` closed object, exactly
  `{ key: "approval-definition-template", version: "2.0.0" }`. The Approval
  family schema compares that legacy, non-executing identity with its fixed
  registry row; it cannot select, locate or load a template. Unknown keys fail.
  Strings are never evaluated, imported, resolved as paths or used as registry
  keys except fields explicitly enumerated above. The loader performs no `eval`,
  dynamic import, filesystem scan, network call, package resolution or template
  loading and deep-freezes the parsed copy.

## Fixed registry, projection and selector behavior

- **REG-001 — Registry ownership**: A closed TypeScript map keyed by exact
  `(familyBinding.key, familyBinding.version)` supplies the family-specific
  guide schema, parameter parser, semantic validator, canonical authority
  comparison and expected existing presentation/profile values. Adding or
  changing a registry row is a family-contract change and requires a later ADR;
  adding reviewed definition data within a frozen row does not select new code.
- **REG-002 — Restaurant row**: It retains the existing menu parameter parser,
  canonical Restaurant authority, Restaurant V3 exact Graph validator and
  generated target. Unsupported surfaces, roles, pages, journeys, bindings,
  authorities, live payment, menu fields or integrations remain clarification
  or admission failure. A title or menu example is not another definition.
- **REG-003 — Approval row**: It retains the exact one-stage correction family:
  one draft/submitted/approved/returned flow with submit/approve/reject/update,
  requester/reviewer/auditor grants, reason/history behavior, required page
  roles, six exact capability locks and existing approval presentation. Fields
  may differ only where the already generated typed form/runtime supports their
  exact Blueprint types; reserved fields, changed authority, extra states,
  thresholds, multiple reviewers, private ownership and integrations fail.
- **REG-004 — Task row**: It retains exact Task correction V2: title,
  description, display-only assignee, dueDate, priority low/medium/high;
  not-started/in-progress/completed; start/complete/reopen; Member and Viewer;
  five pages and six exact locks/bindings. Renamed fields, private assignment,
  extra states/actions or different correction policy fail. Consequently a
  renamed Task candidate is a semantic duplicate, not coverage.
- **REG-005 — Actual data-driven dispatch**: The catalogue parser creates every
  canonical structure, selection schema, provider JSON Schema, provider guide,
  instruction and projector dispatch from parsed data plus the fixed row. The
  current four definition modules may remain compatibility re-export shims, but
  they cannot contain definition descriptors, canonical values or executable
  per-definition projection branches. Catalogue validation proves its exported
  structures originate from the parsed entries.
- **REG-006 — Public compatibility**: Supported and clarification selections
  keep the exact existing request fields, dispositions, question categories,
  title/ID/text bounds and business parameter behavior. Unknown definition keys
  fail the strict union. Existing generated-blueprint fallback remains
  unchanged and never treats invalid registered-definition data as a fallback.
  Historic interpretations, Drafts, Published revisions, locks and Compilations
  remain immutable.

## Semantic fingerprint, batch admission and diagnostics

- **VAL-001 — Fingerprint input**: For each valid entry, construct a strict
  semantic projection containing family key/version, parameter policy,
  `primaryJob`, canonical role slots and permission actions, entity slots and
  field key/type/required/options/reference semantics, page intent/entity-slot
  bindings, workflow slots with state/transition semantics, ordered
  correction/failure steps and expectations, capability lock
  identities/digests, and presentation/compiler-profile expectation. Exclude
  definition key/version, correction/failure case keys, all labels, titles,
  descriptions, outcome prose, provider guide/instruction, examples, ordering
  that the contract declares set-like, and provenance.
- **VAL-002 — Fingerprint normalization and algorithm**: After a family row
  validates an entry, it maps only structurally proven, non-behavioral role,
  entity and workflow aliases to that row's fixed semantic slots. For example,
  the Approval requester/reviewer/auditor are resolved from their grants and
  transitions, its primary entity from the one admitted approval flow, and its
  workflow from that flow; a mere re-key cannot create coverage. The same slot
  map is applied consistently to `primaryJob`, permissions, references, pages,
  workflows and journey steps. Ambiguous or structurally changed aliases fail
  family validation; V1 does not normalize arbitrary field, state, operation or
  business semantics. Normalize strings to NFC. Preserve field order, page
  order, workflow transition order and the step order inside each case because
  these can affect behavior. Treat the correction case collection and failure
  case collection as order-insensitive and sort their key-free canonical case
  bodies; sort other arrays only where the contract declares set semantics.
  Sort object keys lexicographically, hash UTF-8 canonical JSON with SHA-256,
  and report `sha256:` plus 64 lowercase hexadecimal characters. The computed
  fingerprint is never accepted from data.
- **VAL-003 — Duplicate semantics**: Duplicate `definitionKey` rejects every
  colliding entry with `definition.duplicate-key`; no first/last winner is
  selected. An equal semantic fingerprint across different keys rejects every
  member with `definition.duplicate-semantics`. Cosmetic title, label, color,
  prose, guide, example, case re-key/reordering, or a fixed-family role/entity/
  workflow re-key therefore never raises the distinct or admitted count. Field
  order and ordered journey steps remain semantic and are never discarded to
  manufacture a duplicate. Diagnostic order is input index, then stable reason
  code.
- **VAL-004 — Safe result**: The command emits exactly
  `factory.product-definition-validation-report/v1` with `attempted`, `valid`,
  `distinct`, `admitted`, `durationMs`, `entries`, and `reasonCounts`.
  Each entry contains only input `index`, a definition key when it passed the
  safe key parser, computed fingerprint when available, verdict
  `admitted|rejected`, and sorted reason codes. It never prints raw data,
  provider instructions/guides, canonical business values, prompts/responses,
  file contents, stack traces, paths, credentials or offending values.
- **VAL-005 — Stable reasons**: V1 reasons are the closed set
  `definition.invalid-json`, `definition.batch-limit`,
  `definition.unknown-key`, `definition.unknown-version`,
  `definition.duplicate-key`, `definition.duplicate-semantics`,
  `definition.unknown-family`, `definition.unsupported-family-version`,
  `definition.invalid-binding`, `definition.invalid-canonical`,
  `definition.unsupported-semantics`, `definition.missing-correction`,
  `definition.missing-failure`, `definition.projection-drift`, and
  `definition.execution-drift`. Unexpected internal faults return only
  `definition.validation-failed` on stderr and exit nonzero.
- **VAL-006 — Admission meaning**: `valid` means the strict V1 data parses;
  `distinct` means its semantic fingerprint is unique; `admitted` additionally
  means its fixed family validator and execution expectations pass and it is in
  the checked-in catalogue. Candidate batches are validation inputs only and
  cannot mutate that catalogue. The shipped acceptance result is exactly four
  attempted, valid, distinct and admitted existing definitions, with zero new
  distinct definitions. An adversarial candidate run intentionally exits
  nonzero and reports bounded reasons.
- **VAL-007 — Command**: After the adapters build, run provider-free
  `node packages/adapters/dist/requirements/definition-batch-cli.js` against
  the fixed checked-in catalogue copy when no argument is present. The only
  accepted argument is exact `--stdin`. In that mode, candidate input comes only
  from standard input: accumulate at most 2 MiB plus one sentinel byte, reject an
  oversize stream before UTF-8 decoding, decode once with fatal UTF-8 handling,
  and then apply DAT-001. The CLI never accepts or reads a candidate path.
  Unknown, additional or path-shaped arguments exit `2` with one fixed safe
  message that includes no argument value, path or stack. Exit `0` only when
  every input entry is admitted and the report is deterministic apart from
  `durationMs`; malformed/invalid UTF-8, duplicate-member, schema, semantic and
  oversize candidate input exits `1` with only the safe VAL-004 report and stable
  reason codes; an unexpected internal or fixed-source IO failure exits `2`.
  Tests inject bytes or bounded stdin and perform no candidate file read.

## Compatibility, security, catalogue and operability effects

- **API-001**: No public API, Graph, Requirement, Blueprint, plan, error,
  database, queue, hash or lifecycle contract changes. The new identifiers are
  private adapter data/report identifiers. No frontend/backend request contract
  is introduced.
- **CMP-001**: All four canonical structures, guides, instructions, generated
  selection schemas, supported/clarification projections, true Published
  Graphs, separate locks and complete ordered bundles must match CTX-003 exactly.
  Family selectors and Workbench family detection remain unchanged. A mismatch
  is migration failure, never a baseline refresh.
- **CAT-001**: The private definition catalogue remains four entries and three
  demonstrated runtime families. Public capability, product recipe, UI,
  presentation, screen recipe, compiler target and source-study catalogues have
  zero additions. Candidate validation does not count as catalogue admission.
- **SUP-001**: Dependency, license and copied-source impact is zero. Existing
  Node, TypeScript, Zod, `node:crypto`, `node:fs` and stream behavior suffice.
  No package, lockfile, TypeScript option, asset, font, notice, network download
  or external source is introduced.
- **SEC-001**: The browser, requirement and provider remain untrusted. Provider
  output can select only the generated strict branch. Definition data cannot
  choose executable code or cross a credential, tenant, identity, filesystem,
  Docker, deployment or arbitrary-network boundary. Raw prompts/responses and
  credentials remain excluded from source, persistence, evidence and output.
- **OPS-001**: Runtime services, Compose topology, ports, storage, queues,
  retries, model calls, token budget, preview behavior and cleanup do not
  change. Validation is local, provider-free, bounded to 2 MiB/100 entries and
  emits one deterministic summary. The existing browser requirements entry does
  not import this server-only catalogue. Built-package verification must prove
  the fixed copy is byte-equal to its source, present at the exact adjacent
  `dist` path, raw-guarded and loadable under Node 22.

## Ownership and parallelism

- **OWN-001 — Contract owner**: The assigned serialized `@factory/adapters`
  integration owner owns the V1 schema, JSON catalogue, fixed registry, generic
  projector, generated selection surfaces and batch CLI. Root owns the existing
  baseline fixture/test, plan, ledger, acceptance evidence and every Git or
  runtime action.
- **OWN-002 — Freeze judgment**: Once this exact ADR is independently accepted
  and PM records its hash, the V1 shape is frozen enough for one serialized
  implementation owner. It is **not** frozen for disjoint frontend/backend
  writers because the data, parser, family registry and projection dispatch are
  one shared contract. No frontend or backend production work is required.
- **OWN-003 — Serialized integration**: JSON loading, public projection parity,
  family binding, immutable Graph/lock derivation and complete generated-bundle
  comparison remain serialized integration work. Generated templates, shared
  API/Graph contracts, Compose topology and end-to-end smoke paths remain
  unchanged and cannot be parallelized into this slice. Read-only review and
  provider-free adversarial validation may follow after source freeze.

## Consequences

### Positive

- **POS-001**: A reviewed definition can be authored as bounded data while fixed
  code retains execution authority, removing the per-definition projector as
  the immediate scaling bottleneck.
- **POS-002**: Duplicate fingerprints and honest attempted/valid/distinct/
  admitted counts prevent cosmetic catalogue inflation.
- **POS-003**: Exact four-definition and complete-bundle parity makes the
  migration reversible and allows unchanged runtime/UI evidence to be reused.

### Negative

- **NEG-001**: The V1 JSON is a load-bearing source artifact; every edit needs
  strict parse, family support and compatibility checks.
- **NEG-002**: Natural-language selection guidance remains reviewed data and
  requires semantic review; structural validation cannot prove model-selection
  quality. Real-model and ordinary-user evaluation remain separate.
- **NEG-003**: Fixed family rows deliberately reject many useful products. This
  foundation does not itself advance beyond four definitions or three families.

## Alternatives considered

### Keep static TypeScript projectors

- **ALT-001**: **Description**: Retain the current four-entry bank and add more
  executable descriptors/projectors.
- **ALT-002**: **Rejection reason**: It preserves the exact authoring bottleneck
  this roadmap slice must remove and cannot measure configuration-only additions.

### Add metadata beside existing projectors

- **ALT-003**: **Description**: Validate job/provenance metadata while canonical
  structures and selection remain hand-coded.
- **ALT-004**: **Rejection reason**: It creates an inventory, not data-driven
  authoring, and permits metadata/projector drift.

### Load a module or template named by each definition

- **ALT-005**: **Description**: Let JSON name an import, package, template,
  route, component or compiler target.
- **ALT-006**: **Rejection reason**: It turns reviewed/provider-shaped data into
  executable and supply-chain authority, violating the threat-model boundary.

### Admit a nominal 30-entry batch now

- **ALT-007**: **Description**: Duplicate current families with different names,
  copy or color to reach the numeric milestone.
- **ALT-008**: **Rejection reason**: It provides no distinct business semantics
  or execution evidence and hides missing family capabilities.

## Implementation, migration, rollback and aborts

- **MIG-001 — Serialized product paths**: After recorded acceptance, the one
  integration owner may add
  `packages/adapters/src/requirements/product-definition-data.ts`,
  `definition-family-registry.ts`,
  `definitions/product-definitions.v1.json`, and
  `definition-batch-cli.ts`, plus the fixed-path
  `packages/adapters/scripts/copy-product-definition-data.mjs`; refactor
  `definition-selection-catalogue.ts`, the four current definition-selection
  modules and `approval-definition-template.ts` so values/projectors come from
  parsed data; and update only the package build/validation scripts required to
  copy the exact file and run the provider-free command.
  `openai-interpreter.ts` may change only if required to consume the same derived
  catalogue exports. The loader reads only its fixed adjacent shipped file URL;
  candidate mode reads only standard input and has no caller-supplied file API.
  No package-root or browser export is added.
- **MIG-002 — Focused tests**: Add
  `packages/adapters/test/product-definition-data.test.ts` and extend
  `packages/adapters/test/requirement-interpreter.test.ts`. Start with failures
  for duplicate raw JSON member names including escape-equivalent names,
  unknown keys/version/family, executable-shaped keys, invalid binding, missing
  correction/failure, duplicate definition key, unsupported semantics, batch
  limits, safe diagnostics and deterministic output. An adversarial clone that
  changes cosmetic prose, case keys, case collection order and only the fixed
  family's non-behavioral role/entity/workflow keys must produce the same
  fingerprint and `definition.duplicate-semantics`; reordered steps or fields
  must not be normalized away. CLI tests cover default source, valid stdin,
  invalid/duplicate-member stdin, an input stream exceeding 2 MiB, empty and
  malformed UTF-8 input, unknown/additional/path-shaped arguments, fixed safe
  exit-2 text, and proof that candidate mode performs no file read. Positive
  tests cover all four data-driven supported/clarification projections.
- **MIG-003 — Compatibility authority**: Root retains sole ownership of
  `packages/compiler/test/fixtures/definition-data-baseline.json`,
  `packages/compiler/test/fixtures/definition-data-compatibility.ts`, and
  `packages/compiler/test/definition-data-compatibility.test.ts`. The
  implementation owner must not regenerate them. Run them after adapter source
  freeze to prove the four exact Published/lock/bundle projections.
- **MIG-004 — No data migration**: Existing interpretations and immutable
  artifacts remain untouched. Future process startup reads the new checked-in
  catalogue. There is no database migration, conversion job, dual-write,
  provider call or irreversible step.
- **ROL-001 — Rollback**: Revert only MIG-001/MIG-002 paths and restore the four
  prior static entries/projectors. Historic artifacts and the root baseline
  remain valid. No persistent data or external resource requires repair.
- **ABT-001 — Abort conditions**: Stop on any CTX-003 hash drift, unsupported
  existing entry, generated schema/instruction/guide difference, selection or
  clarification difference, compiler/worker selector change, public export,
  new dependency, dynamic import/evaluation, directory discovery, a production
  path influenced by data or user input, unsafe diagnostic value, nonzero
  additional admitted count, or need to alter Graph/API/DB/UI/Compose behavior.
  Return material family expansion to Tech Lead and PM rather than weakening
  validation.

## Measurable verification plan

- **VER-001 — Focused adapter behavior**:
  `pnpm --filter @factory/adapters test -- product-definition-data.test.ts requirement-interpreter.test.ts`
  passes all positive and adversarial cases, including the raw duplicate-member
  guard, re-key/reorder fingerprint matrix, valid/invalid/oversize stdin,
  unknown argument handling and no candidate path read, followed by
  `pnpm --filter @factory/adapters typecheck`, `build`, and `lint`.
- **VER-002 — Built command**: On Node 22, run
  `node packages/adapters/dist/requirements/definition-batch-cli.js` twice.
  Both runs exit `0`, raw-guard and parse the byte-equal fixed JSON copy, report
  exact counts `4/4/4/4`, and match after removing `durationMs`. Run the reviewed
  adversarial batch through exact `--stdin`; it exits `1`, emits only VAL-004
  fields and expected reason counts, and leaves the working tree unchanged.
  Oversize stdin exits `1`; an unknown or path-shaped argument exits `2` without
  echoing it. No candidate path is opened in any run.
- **VER-003 — Exact round trip**:
  `pnpm --filter @factory/compiler test -- definition-data-compatibility.test.ts task-compatibility.test.ts task-correction-compatibility.test.ts`
  passes against the immutable root fixtures. It proves all four canonical,
  guide, instruction, schema, supported/clarification, Published Graph,
  separate-lock and ordered-bundle values remain exact.
- **VER-004 — Supply/security checks**: Review the diff for package/lock/public
  export/runtime changes; scan tracked output and safe command reports for
  credential or raw prompt/response material without printing secrets. Verify
  no dynamic import, `eval`, network access, path from data, or executable field
  exists.
- **VER-005 — Review and evidence**: One normal contract-level task review,
  proportionate independent QA and final release review inspect source identity,
  command outputs and compatibility results. PM records decision evidence and
  final counts in
  `docs/acceptance/evidence/product-definition-data/` and the active delivery
  ledger. Unchanged Task/Approval/Restaurant runtime and responsive screenshot
  evidence may be reused because VER-003 proves byte equality; any drift invokes
  ABT-001 instead of silently creating a new baseline.

## References

- **REF-001**: `AGENTS.md`.
- **REF-002**: `docs/tech-governance.md`.
- **REF-003**: `docs/threat-model.md`.
- **REF-004**: `docs/adr/adr-0054-reusable-definition-bank.md`.
- **REF-005**: `docs/adr/adr-0064-team-task-same-record-field-correction.md`.
- **REF-006**: `docs/superpowers/plans/2026-09-13-product-definition-scale.md`.
- **REF-007**: `docs/superpowers/specs/2026-09-13-definition-data-design.md`.
- **REF-008**:
  `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`.
