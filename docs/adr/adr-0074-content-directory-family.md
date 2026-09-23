---
title: "ADR-0074: Content and Directory Family"
status: "Proposed"
date: "2026-09-24"
authors: "Archeform Tech Lead"
tags: ["architecture", "decision", "directory", "definition", "compiler"]
supersedes: ""
superseded_by: ""
---

# ADR-0074: Content and Directory Family

## Status and recommendation

**Proposed.** Recommendation: **experiment** with one curated Knowledge Resource
Directory definition and a reusable, fixed Content/Directory family. A reader
finds and reads useful entries on a phone. A curator creates, corrects, shows,
and hides entries in a desktop management view, with the same actions usable
on smaller screens. Management is this definition's declared complete action.
There is no contact-delivery or reader-submission promise.

Keep the accepted Golden profile, existing capability package bytes and all
previous generated outputs. Reuse six current core locks; add no physical
capability package. The new stable family identity, compiler selection,
generated reads, mutation and presentation contracts require this decision.
An Approval decision or a renamed Task does not satisfy the visibility contract.

This proposal authorizes no implementation or external action. PM must record
direct founder acceptance or the exact standing independent-review acceptance
under `docs/tech-governance.md`, including this file's SHA-256, independent
reviewer identity, `APPROVED_FOR_STANDING_ACCEPTANCE: yes`, P0/P1 0/0,
evidence and write ownership before implementation. The proposer cannot review
their own ADR. Product Publish, repository release, provider calls, credentials,
paid resources, cloud actions and deployment remain separately governed.

## Context and current profile

- **CTX-001**: Investigation base is
  `62c53884897a7f72c3a4c9fe25c2b010491515fd` in the isolated
  `codex/definition-regression-entry` worktree. The September 13 scale roadmap
  requires finding a useful entry, completing its declared action, correcting
  it, and handling missing media and no results. Live product acceptance counts
  belong to the PM ledger; catalogue rows and existing capability files do not
  establish accepted families.
- **CTX-002**: `definition-family-registry.ts` admits Restaurant, Approval,
  Task and Appointment. Its exact-family validation, semantic fingerprint,
  immutable locks, projection checks and fixed-file definition loader are
  reusable. There is no admitted Content/Directory family at this base.
- **CTX-003**: Blueprint V1 requires at least one workflow. Its existing
  `submit` and `cancel` verbs can represent the real two-state directory
  visibility lifecycle without changing the action vocabulary. Graph V1
  already represents all required fields, pages, roles and transitions.
- **CTX-004**: `core.search@1.0.0` and `core.files-media@1.0.0` are present,
  but their emitted effect handlers append capability events. Those handlers
  do not establish bounded catalogue queries, file storage, upload, image
  decoding or reader visibility. Do not select them merely to claim features.
  Other callable portfolio assets, including inventory, are outside this ADR.
- **CUR-001**: Keep Node `>=22.11.0 <23`, `pnpm@9.0.0`, TypeScript `^5.7.2`
  resolved `5.9.3`, Next `^15.1.0` resolved `15.5.22`, React/React DOM
  `^19.0.0` resolved `19.2.8`, Puck `^0.22.3` resolved `0.22.3`, XYFlow
  `^12.3.6` resolved `12.11.2`, NestJS `^10.4.15` resolved `10.4.22`,
  Prisma/client `^6.1.0` resolved `6.19.3`, BullMQ `^5.34.10` resolved
  `5.81.2`, and ioredis `^5.4.2` resolved `5.11.1`. Root/package manifests
  and `pnpm-lock.yaml` govern these versions. Keep the floating-major images
  `node:22-alpine`, `postgres:16-alpine`, `redis:7-alpine`; no new dependency,
  service, port, queue, database technology or Compose topology is proposed.
- **CUR-002**: Keep `factory.application-graph/v1`,
  `factory.product-blueprint/v1`, `factory.product-definition-data/v1`,
  `factory.product-definition-catalogue/v1`, `factory.capability/v1`,
  `factory.capability-binding/v1` and the existing composition-lock format.
  Mutable Draft -> immutable Published Graph -> immutable Compilation remains
  mandatory. No compiler consumes a mutable Draft and no historic hash changes.

## Decision

### Reuse investigation, in required order

| Order                  | Exact existing assets                                                                                                                                                                                                                                                                                          | Decision and gap                                                                                                                                                                                                                                                                                                                                     |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Approved registries | `packages/ui-primitives/src/index.ts`: `button`, `input`, `label`, `select`, `card`, `badge`, `dialog`; `packages/ui-patterns/src/index.ts`: `form-field`, `data-table`, `compact-sidebar-navigation`, `loading-state`, `empty-state`, `validation-state`, `error-state`, `confirmation-state`, `denial-state` | Compose existing primitives, states and navigation conventions. A directory card can be a composition of `card`, text and a real detail link; no new style-only card key.                                                                                                                                                                            |
| 2. Recipes             | `packages/generated-ui/src/index.ts`: `mobile-product-shell`, `merchant-workspace-shell`, `menu-item-card`, `category-rail`; `packages/screen-recipes/src/index.ts`; `packages/product-recipes/src/index.ts`: `restaurant-ordering`; `packages/experience-recipes/src/index.ts`: `fine-dining`                 | Reuse shell/category navigation concepts and existing tokens. Restaurant menu cards require price/availability, and Restaurant recipes require unrelated business bindings. Do not falsify those ports or mutate their frozen descriptors.                                                                                                           |
| 3. Workbench           | `apps/workbench/components/shell/workbench-shell.tsx`, `apps/workbench/components/journey/requirement-summary.tsx`                                                                                                                                                                                             | Reuse semantic landmarks, role-labelled navigation and safe summary conventions only. Workbench source is an operator UI and must not become a generated runtime dependency.                                                                                                                                                                         |
| 4. Generated templates | `packages/compiler/src/approval-workspace-presentation.ts`, `task-workspace-presentation.ts`, `task-mutation-contract.ts`, `mutation-write-protection.ts`, `page-runtime-projection.ts`, `approval-visual-assets.ts`                                                                                           | Reuse native form/record-loading, token, safe-error, scoped receipt and conditional-write mechanisms where compatible. Parameterize shared helpers only with tests proving old output bytes unchanged. Directory content and reader visibility require one distinct private presentation, not Approval progress/history or Task completion controls. |
| 5. Pinned studies      | `docs/ecosystem/source-studies/README.md` and its Amplication/Medusa records; `docs/research/2026-08-12-archeform-ui-registry-reuse-inventory.md`                                                                                                                                                              | No pinned directory UI source authorizes copying. Add no third-party source, Base44 assets, package or source-study dependency. New composition is first-party `UNLICENSED`.                                                                                                                                                                         |

- **REU-001**: The documented semantic gap is a reader catalogue plus curator
  editor over visibility-filtered content. Add only private presentation key
  `content-directory-presentation@1.0.0` in
  `packages/compiler/src/content-directory-presentation.ts`, recording the
  above reuse keys, first-party provenance and focused tests. A private family
  composition is not a new universal UI registry or rules engine.
- **REU-002**: Reuse `approval-workspace-material` from
  `approval-visual-assets.ts` only as optional decorative workspace atmosphere
  in the curator view, retaining its existing digest, dimensions, license and
  provenance. It is never a photograph of an entry. Reader cards use useful
  text and category labels without forced photography. Missing, blocked or
  undecodable decorative media must leave every action and text available.
  There is no new media key, user URL field, upload, remote image fetch or
  first-party binary asset in this experiment. Keep `lucide-static@0.468.0`
  and its retained notice for already allowlisted local icons only.

### Family, data and selection contracts

- **FAM-001**: Add fixed registry key `content-directory`, family version
  `content-directory/v1`, parameter policy `none/v1`, admission presentation
  `{ key: "content-directory-presentation", version: "1.0.0" }` and compiler
  profile `content-directory@1.0.0`. The initial definition key is
  `knowledge-resource-directory`, definition version `1.0.0`. Selection may
  choose reviewed definitions and bounded business text only; it cannot choose
  execution modules, paths, routes, packages, query code or media locations.
- **FAM-002**: Exactly one business entity has these reserved fields:
  `title` (required Blueprint text / Graph string), `summary` (required text /
  string), `body` (required long-text / text), `category` (required enum).
  The composer adds `status` (required enum, exactly `hidden`, `listed`).
  Factory-owned record identity and concurrency metadata remain server-owned.
  No relations, extra business fields, numeric domains or calculated fields
  are admitted by this family version. Reserve field names because Blueprint
  V1 cannot distinguish two same-typed semantic slots by structure alone.
- **FAM-003**: Entity, actor, workflow and page keys may use safe existing
  identifiers; labels are presentation data. Exactly two demo actor grants
  exist: reader `read`, curator `create,read,update,submit,cancel`, each scoped
  to this entity. Exactly one workflow starts in `hidden`, with transitions
  `hidden --submit--> listed` and `listed --cancel--> hidden`, both assigned
  to the curator. UI labels are `Show entry` and `Hide entry`. These change
  local catalogue visibility, not platform Product Publish or web deployment.
  No delete, approval, terminal decision, reader write or ownership claim.
- **FAM-004**: Category options are 2..12 distinct reviewed strings, each
  1..40 characters. For duplicate comparison, normalize each value with
  ECMAScript `trim().normalize("NFC")`, escape every regular-expression syntax
  character in one normalized value, and test the other against the fully
  anchored literal pattern `^(?:escapedValue)$` with flags `iu`. This uses
  native ECMAScript Unicode-aware simple case folding, not locale collation
  or full case folding: `Straße` and `STRAẞE` are duplicates; `i` and `ı`
  remain distinct; `ß` and `ss` intentionally remain distinct. Do not use
  upper/lowercase conversion as an approximation or introduce folding tables
  or dependencies. Rejection applies when any pair compares equal.
  The first definition uses `Guides`, `Reference`, `Checklists`. Category
  variation is supported data; it does not by itself count as a distinct job.
  Exactly three page intents bind to the entity: list, form and detail. The
  detail presentation supplies curator correction and visibility actions;
  readers receive catalogue and detail navigation only. No invented dashboard
  or nonfunctional link is required.
- **FAM-005**: Reuse these exact locks and their current manifest digests from
  `definition-family-registry.ts`'s `fixedLocks` and physical manifests:
  `core.crud@1.0.1`, `core.workflow@1.0.1`,
  `core.identity-policy@1.0.0`, `core.policy-declarations@1.0.0`,
  `core.audit@1.0.2`, `core.notification@1.1.1`. Keep ordinary owner-aware
  binding derivation and dependency closure. Notification remains the existing
  local workflow infrastructure; this definition promises no email, SMS,
  webhook or delivered notification. No new catalogue trigger is necessary.
- **FAM-006**: Extend the fixed family validator/projector and interpreter
  catalogue in `packages/adapters/src/requirements/definition-family-registry.ts`
  and checked-in `definitions/product-definitions.v1.json`. Preserve strict raw
  JSON checking, size limits, unknown-key/version rejection, fingerprinting,
  journey validation and projection/lock checks. Preserve the existing
  `provenance.decision: "ADR-0065"` authoring-format coordinate; record this
  family's authority in its acceptance evidence rather than widening that
  literal or implying ADR-0065 alone accepted a new family.
- **FAM-007**: One compiler-owned selector verifies the true immutable
  Published Graph and separate digest-verified composition lock together:
  exact six packages/versions/digests/bindings, fields, enum values, two grants,
  transitions, initial state, three page bindings and absence of extra behavior.
  It drives API, store, presentation and verification selection consistently.
  A directory-shaped candidate with a malformed witness fails with a bounded
  unsupported-profile error before artifact acceptance, never generic CRUD or
  Approval fallback. A product title, definition key or package presence alone
  cannot activate it. Keep compiler exports root-only; the proposed selector
  seam amendment below permits only the existing selector and its readonly
  result type at that root, never a witness bypass. Test both normal compilation
  and the actual emitted-page path.

### Generated read and mutation contracts

- **API-001**: Keep generated entity route grammar. Exact-profile
  `GET /api/:entity` accepts only optional `q`, `category`, `offset`, `limit`.
  `q` is trimmed plain text, 0..120 characters; `category` is one exact declared
  value; offset is an integer 0..10000 (default 0), limit 1..50 (default 20).
  Reject duplicate/unknown query keys, malformed numbers and unsupported
  categories as safe 400. Literal case-insensitive substring search covers
  title and summary, AND the category filter. SQL wildcard characters are
  literal, never query syntax. Ordering is title ascending then ID ascending.
- **API-002**: Return
  `{ apiVersion: "factory.generated.directory-list/v1", records, offset, limit, hasMore }`.
  Read at most limit+1 matches through a parameterized database query, returning
  at most limit records. No unbounded full-table fetch or browser-only search.
  List records contain only `id,title,summary,category,status,version`; detail
  additionally returns `body`. `GET /api/:entity/:recordId` keeps a single-record
  response. Reader list/detail queries enforce `status = listed` at the server;
  hidden and absent IDs yield the same safe 404. Curators can read both states.
  No hidden counts, bodies, history or receipt data may leak through list,
  detail, verification, generic routes or role-switch caches.
- **API-003**: Add exact generated identifiers
  `factory.generated.directory-command/v1` and
  `factory.generated.directory-receipt/v1`. Bodies are strict own-data JSON:

  ```ts
  type DirectoryValuesV1 = {
    title: string;
    summary: string;
    body: string;
    category: string;
  };
  // POST /api/:entity
  type DirectoryCreateV1 = { values: DirectoryValuesV1 };
  // PATCH /api/:entity/:recordId: full replacement of the four business fields
  type DirectoryCorrectV1 = {
    expectedVersion: number;
    values: DirectoryValuesV1;
  };
  // POST /api/:entity/:recordId/events/submit or /events/cancel
  type DirectoryVisibilityV1 = { expectedVersion: number };
  ```

  Creation starts hidden at version 0. Correction is allowed in either state
  and retains ID and status. Every successful correction/visibility transition
  increments version once; visibility transitions must match the current state.
  Reject client ID, status, version-in-values, timestamps, unknown/inherited
  members, arrays, accessors, missing fields and unsafe expectedVersion values.
  Correction is not a replacement entry and cannot silently show hidden content.

- **API-004**: Server validation trims business strings; title is 1..120,
  summary 1..280 and body 1..12000 characters. Body allows newlines and tabs
  but no other control characters; title/summary/category allow no controls.
  Category must equal a declared value after trimming. Render all business
  values as plain text, never HTML or executable Markdown. Equivalent client
  validation improves feedback but cannot replace the server checks.
- **API-005**: All mutations require existing header
  `x-factory-idempotency-key` matching `[A-Za-z0-9._:-]{1,128}`. Authorize the
  server-resolved demo actor/role before record or receipt disclosure. Scope
  receipts by length-delimited Published checksum, actor scope, role, entity,
  record ID or `$create`, and command; persist a key digest, not a raw key.
  Bind to a hash of the canonical validated body. Matching replay returns the
  original status and full record response (201 create, 200 otherwise) after
  restart, with no duplicate write, audit or capability effect. Same key with
  another body is 409 `directory.idempotency_conflict`.
- **API-006**: Reuse conditional-write and serializable transaction patterns
  from Task/Appointment: compare expected version and state, update record,
  append safe audit/capability evidence, and save receipt atomically in the
  generated database. Concurrent same-version writes yield exactly one success;
  concurrent same-key requests converge on one receipt. Failed writes roll back
  all effects. Serialization retry is bounded to three attempts, then safe 409
  `directory.retry_required`, with the same request eligible for later retry.
  No process-memory receipt authority. No alternate generic update/event path
  may bypass these rules.
- **API-007**: Errors are safe bounded codes: 400 `directory.invalid_request`,
  403 `directory.forbidden`, 404 `directory.not_found`, 409
  `directory.version_conflict`, `directory.invalid_state`,
  `directory.idempotency_conflict` or `directory.retry_required`; unexpected
  failures are safe 500 without exception/request content. Version conflicts
  may include only current ID/status/version after authorization. UI retains
  entered fields on conflict, refreshes current state, and requires explicit
  correction resubmission with a new key. Uncertain network outcomes retain
  the exact body/key for an explicit retry. Role changes clear prior-role data
  and invalidate pending responses before showing another role's view.

### Presentation and honest admission

- **UXP-001**: Reader mobile flow is category/search -> useful summary ->
  complete plain-text entry -> return with the search preserved. Curator desktop
  flow is create hidden entry -> inspect -> show -> find -> correct same entry
  -> hide -> correct -> show again. Navigation contains actual supported routes.
  Primary actions use words, controls are at least 44 px, long text wraps, and
  keyboard focus reaches filters, detail, edit and recovery controls.
- **UXP-002**: Compose loading, empty catalogue, no matching results, clear
  filters, pending save, validation, denied action, stale conflict, retry,
  missing media and success from existing patterns. A no-results state explains
  the active filters and has a working reset. Reader-hidden detail is a safe
  not-found state. Preserve explicit Graph typography/theme choices and inspect
  actual 390/768/1440 layouts, supported dark mode and reduced motion.
- **UXP-003**: Add one canonical definition only after the actual job passes.
  Its primary job is curator `submit` of the resource entity to `listed`.
  Required correction/failure journeys include same-record edit, hide/show,
  stale write, retry replay, reader mutation denial and hidden detail denial.
  Real-model classification and consented ordinary-user studies are separate
  evidence; fixture selection does not establish either. This first-party
  family source change is a measured platform extension, not a data-only win.
- **UXP-004**: Explicit exclusions remain visible in interpretation:
  reader submissions, comments, approval moderation, delivered contact/email,
  personal/private ownership, production authentication, external links as a
  contact action, rich text, upload, full-text relevance, crawling, arbitrary
  CMS schemas, search indexing services and public hosting. A material demand
  for any excluded behavior requires clarification, not silent omission.

## Proposed selector seam amendment — 2026-09-24

- **SEA-001**: Recommendation: **keep** the accepted Golden profile and exact
  Directory selection behavior, with one additive compiler-root seam. This is
  a proposed amendment to the previously accepted ADR bytes at SHA-256
  `b4a99874f595006c9809ff2a09a429e253bb3b7fe6aec54aefd0cc1abeb2c9e3`.
  The original family recommendation remains `experiment`. This amendment is
  not accepted by its proposer; PM must record separate acceptance of its exact
  new hash before relaxing the existing frozen no-new-exports contract.
- **SEA-002**: Current implementation keeps
  `selectContentDirectoryProfile` in compiler-private
  `packages/compiler/src/content-directory-contract.ts`. The worker already
  depends on `@factory/compiler`, whose manifest exposes only `.` mapped to
  `dist/index.js` and `dist/index.d.ts`; worker TypeScript `rootDir` is `src`.
  Task 4 needs the same Graph-plus-separate-lock selection to derive actual
  Directory probes. The compiler root already exposes
  `selectAppointmentRuntimeProfile` and `AppointmentRuntimeProfile`; that
  precedent alone does not authorize Directory exports.
- **SEA-003**: Permit exactly two additive root re-exports from the existing
  Directory contract module: value `selectContentDirectoryProfile` and type
  `ContentDirectoryProfile`. Preserve the existing signature
  `(graph: ApplicationGraphV1, compositionLock?: CapabilityCompositionLockV1)
  => ContentDirectoryProfile | undefined`, the detached deeply frozen readonly
  result, and all existing validation. An unrelated Graph returns `undefined`;
  a Directory candidate with a missing or invalid separate lock, invalid Graph,
  hash, package, digest, binding, grants, transition or page fails with the
  existing bounded unsupported-profile error. The optional parameter does not
  authorize lock-free Directory selection. No caller-supplied profile/witness,
  skip-validation flag, renderer, mutable registry or admission callback becomes
  public. The selector remains implemented once in its private module.
- **SEA-004**: Worker imports the value, and the type only if needed, through
  `@factory/compiler`. It passes the actual immutable Published Graph and its
  separate composition lock, uses the returned profile to select Directory
  verification, and propagates or safely maps selector rejection without
  generic CRUD or Approval fallback. This read-only derivation does not prove
  Published identity by itself or replace existing authenticated queue,
  immutable lifecycle, graph-hash, compilation or artifact checks. No new API
  request field, Graph serialization, family version, capability/catalogue
  coordinate, package version, package export-map key or runtime behavior is
  introduced. Manifests, dependency ranges, lockfile, licenses, supply chain,
  tenant/credential boundaries and local-only operability remain unchanged.
- **SEA-005**: Reject relative compiler `src` imports: they cross the package
  boundary and conflict with the worker build root. Reject relative compiler
  `dist` imports or new subpath exports: they couple the worker to private file
  layout or widen the package contract unnecessarily. Reject a duplicated
  worker predicate or weaker package/title heuristic: its validation can drift
  from the authoritative compiler selector. The positive consequence is one
  exact fail-closed selection implementation; the negative consequence is a
  small public-root maintenance commitment to the existing function/type.
- **SEA-006**: PM owns acceptance, the contract-freeze update and serialized
  integration assignment. The assigned compiler/worker owner may then add the
  two re-exports and consume them in the existing verifier with focused tests;
  other exports and selector semantics stay fixed. This Tech Lead changes only
  this proposed ADR. Roll back the new worker import/use and root re-exports
  together if needed; preserve immutable Compilations, evidence and app data.
  There is no migration or irreversible action. Stop the seam on weakened
  validation, caller-provided witness authority, source-layout bypass, old
  output drift or a wider contract need. Independent work wholly inside its
  existing frozen contract may continue; dependent seam integration waits for
  the recorded acceptance and updated ownership.
- **SEA-007**: After acceptance, add failing tests that import the actual root
  selector and exercise `deriveVerificationProfile` with a true Published Graph
  and separate lock, plus missing/stale/wrong-digest/wrong-binding locks and
  malformed Directory candidates. Assert rejection before probe execution and
  no generic fallback; prove valid Directory selection uses the actual selector
  without a mocked or duplicate predicate. Run
  `pnpm --filter @factory/compiler test -- content-directory-contract.test.ts content-directory-runtime.test.ts content-directory-presentation.test.ts definition-data-compatibility.test.ts`
  and
  `pnpm --filter @factory/compiler-worker test -- verification-graph-plan.test.ts`,
  then `pnpm --filter @factory/compiler build`,
  `pnpm --filter @factory/compiler-worker build` and
  `pnpm --filter @factory/compiler-worker typecheck` in dependency order.
  Inspect the built root JavaScript/declarations and execute its real selector
  to establish the value/type boundary; package exports must still contain only
  `.`. Execute actual generated Directory probes, not only a helper test.
  Fixed old-eight Published projections and every generated bundle byte must
  match the independently captured baseline without refreshing expectations.
  Record source/ADR identity, commands, results and independent review in
  `docs/acceptance/content-directory.md` and the active consumer delivery ledger.
  These are required implementation checks, not claimed executed evidence.

## Effects, alternatives and consequences

- **EFF-001**: Graph/Blueprint/definition serialization versions and package
  manifests stay unchanged. New-family generated API/store behavior is
  conditional on the complete witness. Existing Control Plane lifecycle and
  worker authentication/containment remain unchanged. Verification derives
  actual directory probes; it must not treat an event log or helper-only test
  as proof that the API/browser action works.
- **EFF-002**: The visibility predicate strengthens the new family boundary;
  it does not provide real person identity or production tenant isolation.
  Demo role selection is explicitly a local prototype affordance, not access
  control suitable for public hosting. Credentials, raw AI prompts/responses
  and request bodies remain excluded from evidence and logs. Business entry
  values persist only as intended application records/authorized receipt data.
- **ALT-001**: **Keep only generic CRUD** is smaller but rejected for this
  experiment: it lacks explicit reader visibility, safe correction and a
  complete directory experience. A record count or landing page misses the job.
- **ALT-002**: **Reuse Approval as publication review** is rejected: its
  recorded decision does not implement discoverable listed content or curator
  visibility. Publication Review remains its existing independent product.
- **ALT-003**: **Create a general CMS/search/upload capability** is rejected
  for this slice: schema-driven rules, rich content and storage/providers expand
  boundaries without evidence that this first job needs them. Consider a
  physical reusable capability later only when another admitted consumer needs
  that contract; do not manufacture a package merely for a new family label.
- **POS-001**: One bounded reusable content lifecycle supplies a semantically
  distinct family while preserving the existing definition authoring pipeline,
  stable Graph and six verified packages.
- **NEG-001**: Fixed fields, plain text and two roles intentionally limit
  coverage. Offset pagination can shift under concurrent catalogue edits;
  refresh is explicit, and this experiment promises no snapshot browsing.
  Text/category variation alone does not establish additional product coverage.
- **NEG-002**: A conditional compiler profile adds maintenance and real
  database/browser verification cost. No production-scale search performance,
  arbitrary directories or public access maturity follows from local success.

## Implementation, rollback and ownership

- **IMP-001**: PM first records accepted exact ADR hash, implementation owner,
  frozen shapes above, tests, source base and disjoint paths in
  `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`.
  Graph selection, generated routes/store/templates and verifier integration
  are one serialized ownership slice; a shared-contract change stops parallel
  consumers and returns to governance. This ADR changes only this document.
- **IMP-002**: Proposed implementation paths are the adapter family/data
  files; new compiler-private `content-directory-contract.ts` and
  `content-directory-presentation.ts`; narrow compiler facade/emitter changes
  in `packages/compiler/src/index.ts`; necessary existing mutation-protection,
  verifier and family-routing integration; focused tests and one reusable
  `e2e/content-directory.spec.ts`. Extend existing composition machinery only
  where exact binding/verification evidence proves a gap; do not add new Graph
  fields or weaken shared validators. The proposed selector seam amendment
  permits only its two named additive root exports after separate acceptance;
  all other new public compiler exports remain prohibited.
- **IMP-003**: Start with failing family/admission, hidden-read and stale-edit
  tests. Freeze all current canonical projections and complete generated bundle
  hashes before source changes, including the current Appointment path. Retain
  existing four/five/six/seven-definition fixtures byte-for-byte; any additional
  current baseline is additive and captured from the actual immutable Published
  Graph plus separate lock, never a pre-removal composition Graph. Do not
  regenerate historic fixtures to excuse output drift.
- **IMP-004**: Concrete native seams at the investigation base are
  `generateApplicationBundle` (single profile selection),
  `renderApplicationRuntime` (authorized list/record commands),
  `renderPrismaRecordStore` (currently unbounded `list` using `findMany`),
  `renderApiMain` (entity controller), `renderWebProxyRoute` (query forwarding),
  `renderPageRuntime` and `renderWebStyles`, all in compiler `src/index.ts`.
  The directory branch must add its bounded store query and role predicate
  rather than call the unbounded generic list then hide rows in React.
  `renderTaskMutationRuntime`, `renderTaskPrismaStore`, `renderTaskApi` in
  `task-mutation-contract.ts` and `writeProtectionFragments` in
  `mutation-write-protection.ts` supply the existing transaction/receipt/CAS
  pattern; introduce directory methods without altering Task strings.
  `apps/compiler-worker/src/verifier/verification-graph-plan.ts`,
  `verification-profiles.ts`, `role-journey.ts` and `probes.ts` are the bounded
  generated-probe integration seams. Profile reads use API-002, while all
  other family read response shapes stay unchanged. Tests must inspect the
  emitted runtime and execute the actual probe path after these integrations.
- **MIG-001**: New Compilations emit a new generated schema and scoped receipt
  storage only for this profile. Existing generated applications/databases are
  not upgraded or migrated. There is no automatic destructive migration, data
  conversion, dual write or irreversible step. Durable upgrades require the
  separately governed delivery work, not inference from this family admission.
- **ROL-001**: Stop new admission and revert only the experiment's source/data
  additions. Preserve immutable prior Compilations, evidence and app data.
  Locally created test resources may be torn down only by exact test identity
  under existing acceptance ownership; rollback does not delete user records.
- **ABT-001**: Abort on any existing output drift, hidden-data disclosure,
  mutable compiler input, non-atomic write/receipt, generic mutation bypass,
  raw material exposure, new dependency/provider/media URL, production identity
  claim, unsupported definition auto-admission or need to weaken a boundary.
  Ambiguous witness/semantic slots fail closed. Scope expansion or unresolved
  product choices require a revised proposal and independent acceptance.

## Measurable verification and evidence

- **VER-001**: Proposed focused suites:
  `pnpm --filter @factory/adapters test -- content-directory-definition.test.ts product-definition-data.test.ts requirement-interpreter.test.ts`;
  `pnpm --filter @factory/compiler test -- content-directory-runtime.test.ts content-directory-presentation.test.ts definition-data-compatibility.test.ts`.
  Tests cover exact positive witness; missing/extra fields, swapped roles,
  widened permissions, reversed transitions, unknown family/version, wrong
  locks/digests/owner binding, forged query/body, wildcard literals, Unicode
  category comparison under FAM-004 (including `Straße`/`STRAẞE` rejection,
  `i`/`ı` and `ß`/`ss` distinction, trim/NFC equivalence and literal regex
  metacharacters),
  HTML-shaped text and attempted generic-path bypass. Run the malformed matrix
  through actual compiler/page seams, not only a selection helper.
- **VER-002**: Run affected adapter/compiler typecheck, build and lint after
  source freeze, plus `pnpm regression definitions` and
  `node scripts/definition-case-index.mjs --check` after adding its one derived
  case binding. Run shared capabilities/Graph suites if integration touches
  their code; otherwise reuse unchanged evidence with exact source identity.
  Built batch validation must report the new entry separately from existing
  rows, and all prior immutable projections/bundles must remain byte-equal.
- **VER-003**: Proposed actual local acceptance command is
  `pnpm exec playwright test e2e/content-directory.spec.ts --workers=1` using
  existing isolated lifecycle/Compose helpers. It must exercise the true
  Published Graph/lock, bounded verification executor, emitted runtime,
  PostgreSQL and browser. Create two distinct authored entries; find/read the
  correct title/body; show, correct, hide and show the same ID; prove reader
  no-results/hidden-detail behavior; malformed/role/state denials; simultaneous
  stale edits and same-key create; connection interruption; restart replay;
  exactly one audit/effect per accepted mutation; no generic bypass; and reload
  persistence. A helper-only or in-memory run is insufficient.
- **VER-004**: Capture and inspect actual populated/search/detail/editor,
  pending/error/conflict, no-results and missing-media views at 390/768/1440,
  plus dark mode where supported. Verify no unintended remote requests, image
  decode/fallback, useful entry identity, retained search/edits, readable long
  text, keyboard access and 44 px controls. Reuse unchanged approved materials;
  no separate approval round is required per button or screenshot.
- **VER-005**: Evidence lives in
  `docs/acceptance/content-directory.md` and
  `docs/acceptance/evidence/content-directory/`, referenced by the active ledger.
  Record source/Published/lock/bundle hashes, attempt failures, ready time,
  first completed management job, manual rescues, exact cleanup and separate
  definition/family/accepted-journey counts. Prepared-local ready target remains
  five minutes with no technical handoff or manual rescue; report the measured
  outcome rather than changing the target after failure. Record authored versus
  model/user evidence separately. None of these commands has run for this
  proposal; they are implementation acceptance requirements.

## Standing acceptance eligibility

- **GAT-001**: This proposal is eligible for consideration under the September
  1 standing policy because it is a bounded reversible experiment inside the
  founder's family-expansion goal, retains the accepted stack and immutable
  lifecycle, introduces no external action and weakens no security boundary.
  Eligibility is not acceptance. The independent reviewer must confirm all
  six technology decision-gate requirements and no unresolved material product
  choice; uncertainty or a P0/P1 finding requires stopping/escalation.
- **GAT-002**: The reviewer must explicitly assess the choice of a complete
  curator management action, local-only demo-role semantics, server visibility,
  six-lock structural selection, plain-text/media limits, backwards byte
  equality and rollback. Normal task review, QA and controller-only delivery
  gates remain after acceptance. This experiment grants no repository release,
  Product Publish, hosting or deployment authority by itself.

## References

- **REF-001**: `AGENTS.md`, `docs/tech-governance.md`, `docs/threat-model.md`,
  `docs/delivery-policy.md`.
- **REF-002**: `docs/superpowers/plans/2026-09-13-product-definition-scale.md`,
  `docs/product-definition-authoring.md`, `docs/design/generated-ui-assembly.md`.
- **REF-003**: ADR-0063/0064 (Task mutation/correction), ADR-0065 (definition
  data), ADR-0071/0072/0073 (Appointment runtime/admission/immutable patch).
- **REF-004**: Exact source paths in the reuse table and family/runtime sections;
  `scripts/definition-case-bindings.mjs` and the active consumer delivery ledger.
