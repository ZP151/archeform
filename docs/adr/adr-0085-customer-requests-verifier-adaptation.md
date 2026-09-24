---
title: "ADR-0085: Customer Requests Verifier Adaptation"
status: "Proposed"
date: "2026-09-24"
authors: "Archeform Tech Lead"
tags: ["architecture", "decision", "customer-requests", "verification"]
supersedes: ""
superseded_by: ""
---

# ADR-0085: Customer Requests Verifier Adaptation

## Status and decision gate

**Proposed. Recommendation: keep** the accepted Customer Requests runtime and
Golden profile, with the bounded worker-private integration specified here.
This is a compatibility/security clarification of ADR-0084 IMP-002, not a new
runtime, public response contract, or generic verifier capability.

- **GAT-001**: This document grants no implementation authority. PM must record
  acceptance of its exact SHA-256 before reassigning implementation. Direct
  founder acceptance or the standing independent-review authorization in
  `docs/tech-governance.md` is required. A separate qualified read-only reviewer,
  neither this proposing Tech Lead nor an implementation writer, must return
  `APPROVED_FOR_STANDING_ACCEPTANCE: yes`, P0/P1 `0/0`, bounded reversibility,
  consistency with both authorities, and no unresolved ambiguity or material
  product/business choice. PM records reviewer identity, verdict, evidence and
  the standing authorization at the exact proposal hash. Uncertainty, a `no`,
  security weakening or expanded scope stops this route to acceptance.
- **GAT-002**: Standing acceptance is eligible for independent assessment because
  this proposal stays inside accepted ADR-0084 and source-only Task 3. The author
  does not supply the independent verdict. Normal task review, independent QA,
  judgment, PM acceptance and controller delivery remain necessary afterward.
- **GAT-003**: Only authored tests with substituted fetch/start/stop/process
  functions may execute for this slice. No actual startup, service, database,
  Docker command, provider, cloud, hosting, cleanup, paid resource, Product
  Publish or repository release is authorized. The rejected startup cannot be
  retried or bypassed. Passing tests changes no actual-local or hosted count.

## Context and current accepted profile

- **CTX-001**: The active ledger stopped the worker owner before edits because
  `captureCreatedRecordId` reads only top-level `id`. Both generic chain
  prologues and generic `stored-success` idempotency probes depend on that
  capture. The accepted runtime returns exactly `{request,event}`. Supplying
  fabricated top-level IDs in tests would conceal an integration failure.
- **CTX-002**: `isFlatDeclaredJsonBody` permits primitive records and specific
  existing envelopes. Its three-key correction branch is Work Orders-specific;
  Customer Requests update has different fields. Flat values reject null, while
  a normal Customer Requests reply requires `correctsVersion:null`. Neither
  globally permissive nested-ID search nor general nullable JSON is appropriate.
- **CTX-003**: ADR-0084 is accepted by the ledger at SHA-256
  `8a78888dd9f1996588f475188b4645664c06bf9e1a49561112cdfa89c6f954c6`.
  Its file deliberately retains proposal status; ledger acceptance is the
  authority. Task 2's frozen handoff and repair report specify the actual emitted
  runtime. The delivered Task 2 revision is
  `f003e12a04ce8ca7874426e0d25c0020a3c1286f`.
- **CUR-001**: Preserve the manifests and `pnpm-lock.yaml`: Node
  `>=22.11.0 <23`, pnpm `9.0.0`, resolved TypeScript `5.9.3`, Next `15.5.22`,
  React/DOM `19.2.8`, Nest `10.4.22`, Prisma/client `6.19.3`, BullMQ `5.81.2`,
  ioredis `5.11.1`, Puck `0.22.3`, XYFlow `12.11.2`; images remain floating
  `node:22-alpine`, `postgres:16-alpine`, `redis:7-alpine`. Worker test tools
  remain manifest Vitest `^2.1.8`/resolved `2.1.9` and tsx `^4.19.2`/resolved
  `4.23.1`. Root `package.json`, `apps/compiler-worker/package.json`, relevant
  package manifests, lockfile, Dockerfiles and Compose retain authority.
- **CUR-002**: Preserve `factory.application-graph/v1`, stable `@factory/*`
  identifiers, `customer-requests/v1`, profile `customer-requests@1.0.0`, and
  the four `factory.generated.customer-request-{mutation,mutation-receipt,
history-entry,read}/v1` contracts. The brace notation names four existing
  identifiers, not a new literal identifier. No Graph, API, receipt, definition,
  capability, catalogue, generated output or persisted verification schema
  changes. Preserve Draft -> Publish -> immutable Compilation and exact locks.

## Decision and private interfaces

- **DEC-001**: Reuse the Inventory pattern: an exact compiler selector produces
  a worker-private role-journey witness; one dedicated sequential runner uses
  the existing environment fetch boundary and private response comparator.
  Do not modify `captureCreatedRecordId`, generic chain prologues, generic
  `runIdempotencyProbe`, generic JSON acceptance, Directory/Inventory behavior,
  migration/health/cleanup execution, or historical plan derivation.
- **DEC-002**: `deriveVerificationProfile` calls the already exported
  `selectCustomerRequestsProfile(graph, lock)` before generic derivation.
  A selected exact immutable profile routes to the new private adapter; a
  malformed family candidate throws a bounded `VerificationContractError`,
  never falls through. Unrelated graphs preserve their prior derivation.
  Do not add a compiler export or trust a caller-supplied serialized witness.
- **INT-001**: Keep the assigned private export
  `customerRequestsVerificationProfile(profile: CustomerRequestsProfile):
VerificationProfile`. Add only `customerRequests?: CustomerRequestsProfile`
  to the worker-private `RoleJourneyFixture`. It is supplied by exact derivation,
  is incompatible with inventory/directory/chain/general body/header payloads,
  and is dispatched by `runRoleJourneyProbe` to
  `runCustomerRequestsJourney(context: ProbeContext, profile:
CustomerRequestsProfile): Promise<VerificationStepV1>`. Existing registry and
  journey validation still execute. Use one fixed lifecycle action and bounded
  graph-hash-derived profile key; only migration, health and this journey are
  needed. All six business commands execute inside that journey.
- **INT-002**: Add one optional worker-private `RequestOptions.customerRequests`
  descriptor, validated before fetch. It binds the exact selected profile,
  fixed request kind (`create`, `update`, `reply`, `complete`, `reopen`, `cancel`,
  `list`, `detail`, `history`), declared fixture slot, optional captured request
  ID, and fixed-shape expected result. Expected result is a discriminated union
  for mutation/list/detail/history/error, never a field-path, callback, JSON
  selector, URL, query, arbitrary predicate or executable expression. Error
  expectations use only ADR-0084 API-007 status/code pairs. It is API-port-only
  and mutually exclusive with captureRecordId, inventoryRead and directoryRead.
  Descriptor identity/shape, method, path, body and headers must agree; reject
  inconsistent or additional keys before invoking fetch.
- **INT-003**: The dedicated module exports private validation/comparison helpers
  consumed by the environment. These may use precise TypeScript discriminated
  types for the descriptor and expected fixture state; their semantic contract
  is INT-002 and BND-001..005. `BoundedRequestResult` gains only
  `customerRequestsMatches?: boolean`, `customerRequestsEventId?: string`, and
  `customerRequestsResponseDigest?: string`; it reuses `recordId` for the
  validated nested request ID. Digest is lowercase 64-hex SHA-256. These fields
  remain transient, not new `VerificationStepV1` fields or evidence content.
  No response body, business text, actor object or exception crosses the boundary.
- **INT-004**: Every Customer Requests success and expected denial requires the
  comparator's positive result in addition to its exact status. Capture nested
  `request.id` only after complete successful mutation validation, not by an
  unconditional nested fallback. The runner retains IDs in memory to address
  subsequent fixed routes. This replaces generic chain use for this profile
  only. A missing ID, mismatched request/event relation or wrong later ID fails.
- **INT-005**: Capture a canonical digest of the entire validated mutation
  response, using fixed schema field order, including event ID and recordedAt.
  Retain original status, request ID, event ID and digest in memory. An identical
  replay after later changes must reproduce all four and the original expected
  request/event state. Matching only status or request ID is insufficient.
  Follow replay with authoritative detail/history checks proving current state
  did not rewind and no event was appended. Generic stored-success semantics
  remain unchanged; this profile uses its own stronger stored-success witness.

## Bounds and security

- **BND-001**: Keep the generic parser and its existing limits unchanged. The
  new descriptor activates only the exact six ADR-0084 own-data body grammars.
  A create has only values(subject,description); update has only expectedVersion,
  reason and those values; reply has only expectedVersion,message,correctsVersion;
  complete has only expectedVersion,resolutionMessage; reopen/cancel have only
  expectedVersion,reason. Only reply.correctsVersion may be null on input.
  All objects require exact own data keys; reject arrays, extra/prototype keys,
  inherited/accessor descriptors and deeper nesting. Fixture versions are safe
  integers in `0..2147483647`, excluding negative zero. CorrectsVersion is null
  or a bounded integer; semantic invalid-target tests use well-shaped integers.
- **BND-002**: Synthesized body strings stay at most 512 UTF-8 bytes, at most
  16 keys per object, strings at most 200 code units and subject at most 160;
  use short fixed synthetic text (at most 80 code units) for the main journey.
  Require trimmed nonempty text and ADR-0084 control restrictions. This is a
  deliberately narrower verification fixture subset, not a change to runtime
  maxima of 2000/500. A descriptor never relaxes unrelated fixture parsing.
- **BND-003**: Routes are constructed from the selected entity and a captured
  ID using existing safe-path validation, no query strings, traversal, escaping,
  dynamic command names or alternate endpoints. Read only default bounded pages
  for this journey. Commands use the six fixed operations, create only at the
  collection. Retain the ID pattern `^[a-zA-Z0-9._~-]{1,64}$`; generated IDs
  outside this narrower probe subset fail closed, even though runtime accepts
  some longer IDs. Reject IDs equal to `.` or `..` before route construction.
  Use exactly the three Task 2 fixed fixture session IDs, independent of bound
  role spelling, and bounded existing idempotency headers. No role override,
  arbitrary header, credential, tenant or principal injection is permitted.
- **BND-004**: Read at most 16 KiB of response bytes, with fatal UTF-8 decoding,
  JSON parse failure handled safely, exact key/shape validation and cancellation
  on every exit. Use the existing operation timeout for fetch plus body reading,
  cancel the reader on abort, and check the signal before accepting results.
  Bound the complete private journey to 64 requests, at most two newly created
  requests, ten events per request and ten returned history rows. Check the
  existing journey signal before every request; no unbounded polling or retry
  is added. Overflow, missing/truncated/stalled body and timeout fail closed.
- **BND-005**: Validate the actual Task 2 request/event/read shapes, exact
  apiVersions, expected owner, role, principal, status, version, text snapshots,
  correction linkage and explicit nulls. Timestamps must be canonical valid ISO
  UTC values, not merely parseable strings. Detail verifies nextActor, lastActivity,
  latestReply and historical; list verifies exact owned IDs, order and null end
  cursor; history verifies descending versions, distinct captured event IDs,
  parent identity and null end cursor. Never accept a subset/truncated history as
  complete. Require no-store responses. Expected errors must be exactly `{code}`
  with the expected allowlisted pair; an error carrying foreign data fails.
- **SEC-001**: New summaries/failure codes are fixed bounded literals. Neither
  response bodies, fixture text, session IDs, captured IDs, full digests nor raw
  errors enter persisted evidence/logs; digests here serve transient comparison
  only. Existing duration/status evidence remains allowed. The slice adds no
  SQL/audit observer, process program, network destination or database access.
  Inventory's observation program is not reused or expanded.

## Required authored journey and negative witnesses

- **JRN-001**: Customer A creates version 0; updates metadata at 1; staff replies
  at 2 and corrects its reply at 3; A replies at 4; staff completes at 5; A reopens
  at 6; staff completes again at 7; A reopens at 8 and cancels at 9. Verify fresh
  detail/history at relevant transitions, exact event attribution and metadata
  snapshots, linked correction, customer-visible reply and historical resolution
  after reopen. This covers all six commands, both reply modes, repeated
  resolution/reopen and terminal cancellation with ten events.
- **JRN-002**: Customer B, using the same bound customer role and a distinct fixed
  principal, creates its own request. A and B lists contain only their own IDs;
  staff can read both. B's detail/history and well-shaped mutations against A's
  ID return exact 404 not_found, including attempted replay using A's successful
  command body/key and stale original version. A's detail/history remain intact.
  A's create key reused by B is a different principal scope, not authority to
  replay A's record; exercise this as B's own create and prove distinct owner/ID.
- **JRN-003**: After cancellation, A replays original create and update and staff
  replays original complete, validating INT-005 for each. Verify changed-body
  key conflict, stale version conflict, current-version terminal state conflict,
  role denial (staff create/update/reopen/cancel, customer complete), and invalid
  correction target/duplicate target before terminal state. Recheck final
  history for no extra events. Use fresh bounded keys for distinct commands.
- **TST-001**: First RED tests must invoke the real environment/probe seam with
  nested emitted responses and actual update/null-reply bodies. Substituted fetch
  should execute the real emitted in-memory runtime through the existing module
  loader for end-to-end source proof; static fabricated responses alone cannot
  prove agreement with Task 2. Bootstrap/process/start/stop are authored stubs
  only, with assertions that no actual listener/service/database is invoked.
- **TST-002**: Adversarial comparator tests substitute malformed JSON, invalid
  UTF-8, missing/extra/prototype fields, wrong versions/owners/actors/statuses,
  top-level-only ID, mismatched request/event IDs, unsafe/oversized IDs, swapped
  event IDs, wrong correction references, changed replay timestamp/body/digest,
  duplicate/missing history entries, foreign list rows, wrong/null projections,
  leaking error bodies, oversized/never-ending streams and abort/timeout races.
  Every failure yields only bounded evidence and no retained body/identifier.
- **TST-003**: Invalid descriptors, foreign profile usage, mixed comparison modes,
  method/path/command/body disagreement, generic nested-ID responses, generic
  nullable fields and Customer Requests envelopes without the private descriptor
  must reject without broadening historical behavior. Test canonical, renamed,
  swapped and maximum-length bound roles while retaining the fixed roster.
  Assert deterministic derivation after JSON persistence; changed hash, lock,
  grants, seeds, fields or reply-bearing near-match must fail closed.

## Effects, alternatives and consequences

- **EFF-001**: API/data/adapter effect is solely a worker-internal fixture and
  comparison adapter. Runtime REST outputs, Graph/capability/catalogue/definition
  formats and existing emitted bytes remain unchanged. No package, dependency,
  license, copied source, supply-chain input or provider change. New source is
  Factory-authored under existing repository licensing.
- **EFF-002**: Security effect is narrowly interpreting the already accepted
  response within existing byte/time limits. No weaker authorization, real
  identity, tenant, credential or storage boundary. Operability, queues, Compose,
  environment, hosting and deployment remain unchanged. Existing Docker-socket,
  real identity and generated-product residual-risk owners retain their risks.
- **ALT-001**: **Generic nested-ID fallback and nullable/deep JSON — reject.**
  These widen unrelated verifier behavior and cannot prove receipt identity or
  customer ownership. They are unnecessary given the private journey seam.
- **ALT-002**: **Change runtime to top-level IDs or omit required nulls — reject.**
  This breaks an accepted frozen response/body contract to satisfy a test tool.
- **ALT-003**: **Status-only journeys or fake top-level test responses — reject.**
  These can pass while the real emitted runtime is unusable or leaks records.
- **ALT-004**: **Separate fetch client or generic query/JSON selector engine —
  reject.** It duplicates transport controls or creates authority beyond need.
- **POS-001**: The proposal verifies actual nested responses and same-role
  ownership while preserving generic and historical semantics.
- **NEG-001**: One private adapter and strict comparator require maintenance when
  a separately accepted runtime contract changes. Narrow synthetic bounds do not
  exercise maximum runtime text, large pagination, actual PostgreSQL persistence,
  restart, concurrency, hosted privacy or browser behavior. Task 2 evidence and
  future authorized acceptance remain distinct; this journey cannot replace them.

## Ownership, rollout, rollback and abort

- **OWN-001**: This Tech Lead owns only this new ADR and stops after proposal.
  After recorded acceptance, PM may unpause `customer_requests_verification`
  for only `apps/compiler-worker/src/verifier/customer-requests-verification.ts`
  and `apps/compiler-worker/test/customer-requests-verification.test.ts` under
  the frozen interfaces above. No independent writer expands that assignment.
- **OWN-002**: Root is the serial shared integration owner for
  `apps/compiler-worker/src/verifier/{verification-graph-plan,role-journey,
probes,verification-environment}.ts` and
  `apps/compiler-worker/test/{verification-graph-plan,verification-probes,
verification-environment,verification-logging}.test.ts`. These brace groups
  enumerate exact paths. Root owns evidence/ledger updates and final integration.
  Compiler runtime/profile/UI, Graph, capabilities, dependencies, service setup
  and all other files remain outside this implementation assignment. The UI
  writer retains its separate paths. A shared-contract change stops both workers.
- **IMP-001**: Freeze these interfaces and capture historical plan baselines
  before source edits. Root then integrates the shared seam serially while the
  private owner works only in its two files. Run focused RED then GREEN checks;
  freeze hashes for independent task review and QA. No new public rollout toggle
  or migration is required; only exact-selected new-family verification changes.
- **IMP-002**: Backout removes the new profile route/private seam through normal
  reviewed source changes and explicitly leaves Customer Requests verification
  unsupported/failing closed. Do not route this family to misleading generic
  success. Preserve immutable artifacts, acceptance evidence and business data.
  No database down migration, volume deletion, cleanup or irreversible step.
- **ABT-001**: Stop for changed historical plan/compiled bytes, generic parser
  acceptance drift, weakened timeout/byte/ID controls, missing replay identity,
  owner leakage, unresolvable schema/roster mismatch, evidence leakage, ownership
  conflict, new dependency/endpoint/process/observer, required arbitrary selectors,
  or any actual execution request. Report to PM; do not loosen bounds to pass.

## Measurable verification and evidence

- **VER-001**: Commands below are prospective source checks, not claimed results.
  Existing named suites use their authored substituted environments; inspect
  new tests to ensure they never start real infrastructure.

```text
pnpm --filter @factory/compiler-worker exec vitest run test/customer-requests-verification.test.ts
pnpm --filter @factory/compiler-worker exec vitest run test/verification-environment.test.ts test/verification-probes.test.ts test/verification-graph-plan.test.ts test/verification-logging.test.ts
pnpm --filter @factory/compiler-worker exec vitest run test/inventory-operations-verification.test.ts test/service-work-orders-verification.test.ts test/content-directory-verification.test.ts test/calculated-verification.test.ts test/calculated-verification-probes.test.ts test/numeric-verification-witness.test.ts test/verification-profiles.test.ts
pnpm --filter @factory/compiler-worker typecheck
pnpm --filter @factory/compiler-worker build
pnpm exec prettier --check docs/adr/adr-0085-customer-requests-verifier-adaptation.md apps/compiler-worker/src/verifier/customer-requests-verification.ts apps/compiler-worker/src/verifier/verification-graph-plan.ts apps/compiler-worker/src/verifier/role-journey.ts apps/compiler-worker/src/verifier/probes.ts apps/compiler-worker/src/verifier/verification-environment.ts apps/compiler-worker/test/customer-requests-verification.test.ts apps/compiler-worker/test/verification-graph-plan.test.ts apps/compiler-worker/test/verification-probes.test.ts apps/compiler-worker/test/verification-environment.test.ts apps/compiler-worker/test/verification-logging.test.ts
```

- **VER-002**: Root captures deterministic serialized worker derivations for all
  twelve existing historical definition cases before these edits and compares
  complete profile/registry/journey/step-plan values afterward. Record exact
  source and baseline hashes; never recapture a baseline to erase drift. Existing
  Task 1 compiler captures stay untouched: `before.json` SHA-256
  `c9c6c0245de95ffb7176131e59206aa8ca0bceecb21b5ed70185ae6654f25eba`,
  `historical-equality.json`
  `3f6bd2c708c6b4ccd8391a4cfd24ba532e6e680a0f920213d7639124c18e655d`.
  The already accepted 12/12 immutable emitted-output evidence remains valid for
  unchanged compiler paths. Root's concurrent presentation integration must
  independently prove current emitted-byte parity against those original inputs;
  do not attribute UI changes to this worker slice or overwrite prior receipts.
- **VER-003**: Required outcomes are exact-profile positive/negative witnesses,
  zero unexpected fetch/process/start calls, unchanged historical derivation,
  preserved generic rejection/acceptance cases, bounded safe failure evidence,
  passing affected types/build/format and independent gate receipts. Root records
  commands, exit codes, test counts, source/evidence hashes and limitations in
  `generated/.customer-requests-task3/verification/`, with portable accepted
  receipts under `docs/acceptance/evidence/customer-requests/` and live state in
  `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`.

## References

- **REF-001**: `AGENTS.md`, `docs/tech-governance.md`, `docs/threat-model.md`.
- **REF-002**: `docs/adr/adr-0084-customer-requests-family.md`, especially IMP-002,
  SEC-001..005, API-001..007 and VER-001..007.
- **REF-003**: `generated/.customer-requests-task2/task-2-report.md`, including
  its proxy repair; active delivery ledger's stopped compatibility checkpoint.
- **REF-004**: Worker `verification-environment.ts`, `role-journey.ts`,
  `probes.ts`, `verification-graph-plan.ts`, and
  `inventory-operations-verification.ts`; compiler
  `customer-requests-contract.ts` and `customer-requests-runtime.ts`.
