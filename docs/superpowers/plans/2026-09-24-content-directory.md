# Content Directory implementation plan

> **For agentic workers:** Execute this plan with subagent-driven-development or
> executing-plans, one serialized shared-contract owner at a time. Check the exact
> ADR acceptance in the active ledger before writing implementation source.

**Goal:** Deliver a reusable directory where readers find useful content and
curators create, correct, show and hide the same persisted entries.

**Architecture:** The fixed Content/Directory profile composes six accepted core
capabilities. A single lock-bound selector drives bounded server reads, atomic
mutations, generated presentation and verification. Ordinary users choose no
template IDs, schemas or deployment machinery.

**Tech stack:** Existing TypeScript, Node 22, pnpm 9, React/Next, Nest, Prisma 6
and PostgreSQL 16. Existing local Lucide SVGs; no new dependencies or services.

## Global constraints

- ADR-0074 is accepted at SHA-256
  `91ad7bc1bf806fafaa4bbfa656be428567138123c632a2219c48b17195728919` through
  the standing independent-review authority recorded in the active ledger.
- Fields, limits, roles, routes, receipt semantics and errors are specified by
  ADR-0074 FAM-001..007 and API-001..007, not inferred from this plan.
- Draft -> Publish -> immutable Compilation; preserve all existing output bytes.
- Keep catalogue limits and package versions. The accepted SEA amendment permits
  only the two named compiler-root selector/type exports; all others stay fixed.
- English code/UI/docs; no credentials, raw model material or external media URLs.
- Existing demo-role scope only; no private/public hosting or delivered email claim.
- Root owns integration and Git. Do not overwrite separately owned root Eval V2 work.

## Task 1: freeze baseline and implement exact profile eligibility

**Paths:** new `packages/compiler/src/content-directory-contract.ts`, new
`packages/compiler/test/content-directory-contract.test.ts`, additive
`packages/compiler/test/fixtures/eight-definition-baseline.json`, and focused
test fixture support. Existing historical baseline files stay byte-identical.

**Interface:** Private `selectContentDirectoryProfile(graph, compositionLock)`
returns an immutable profile for the exact accepted shape, `undefined` for an
unrelated family, and throws a bounded error for malformed directory candidates.
The implementation owner freezes its concrete TypeScript profile in the ledger
before the dependent emitter work. The accepted SEA amendment exposes only this
selector and its readonly profile type through the compiler root for the worker.

- [x] Capture actual old-eight Published inputs, separate locks and ordered bundle
      digests from the recorded unmodified base. Reuse
      `currentDefinitionDataCompilationEvidence` and verify relevant source identity
      before capture. Store fixed expected values, not a runtime-generated expectation.
- [x] RED: positive fixture selects the profile; wrong digest/binding, extra field,
      widened grants, wrong state/transition, page binding and incomplete candidate
      must fail. Unrelated eight definitions remain unselected and byte-identical.
- [x] GREEN: implement the private exact selector using existing schemas and
      manifest digests; no generic CRUD fallback for malformed candidates.
- [x] Run `pnpm --filter @factory/compiler test -- content-directory-contract.test.ts definition-data-compatibility.test.ts`.

Representative assertion (test fixtures supply actual Published inputs):

```ts
expect(
  selectContentDirectoryProfile(valid.graph, valid.compositionLock),
).toMatchObject({
  key: "content-directory",
  version: "1.0.0",
});
expect(() =>
  selectContentDirectoryProfile(widened.graph, widened.compositionLock),
).toThrow();
```

## Task 2: implement reads and transactional commands

**Paths:** private directory contract/emitter module; narrow
`packages/compiler/src/index.ts` integration; new
`packages/compiler/test/content-directory-runtime.test.ts`.

**Consumes:** Task 1's exact selected profile and existing generated record store,
authorization, receipt and conditional-write patterns. **Produces:** ADR-0074
bounded list/detail and create/correct/show/hide behavior through actual HTTP seams.

- [x] RED: reader list/detail must not reveal hidden entries; SQL wildcard-shaped
      search remains literal; invalid/duplicate queries fail; reads use bounded
      database predicates rather than loading the entire table.
- [x] RED: invalid values perform no writes; stale and concurrent same-version
      commands admit one winner; replay survives restart; conflicting key/body is 409.
- [x] GREEN: add profile-scoped emitted methods and controller/proxy dispatch,
      preserving generic routes for all prior products. Transactions include record,
      receipt and safe audit/effects. Deny alternate generic mutation bypasses.
- [x] Run `pnpm --filter @factory/compiler test -- content-directory-runtime.test.ts content-directory-contract.test.ts definition-data-compatibility.test.ts`.
- [x] Verify the actual Prisma adapter with two rows, hidden reads, transactional
      failure and concurrent writes before claiming database correctness.

Root confirms 162 focused/compatibility cases, emitted API and package typechecks,
and a corrected actual PostgreSQL probe. The first probe's business assertions
passed but its Windows in-process client cleanup failed. Both owned containers
were removed; automatic command approval blocked subsequent temporary-client
directory removal, so two scratch paths remain recorded as `cleanup_required` in
the ledger. This narrow runtime result is not full family or cleanup acceptance.

## Task 3: admit canonical data and meaningful interpretation

**Paths:** `packages/adapters/src/requirements/definition-family-registry.ts`,
`product-definition-data.ts` only if its fixed family discriminator requires the
accepted addition, `definitions/product-definitions.v1.json`, catalogue selection
integration, new `packages/adapters/test/content-directory-definition.test.ts`,
and existing current-membership tests/tool bindings. Historical lists stay fixed.

- [x] RED: validate one canonical Knowledge Resource Directory and reject unsupported
      contacts, submissions, arbitrary URLs, uploads, private identity and extra rules.
- [x] GREEN: add the fixed family and definition with correct checksum, guidance,
      primary job, success/correction/failure journeys and existing lock bindings.
- [x] Prove rough directory intent routes to the correct definition in deterministic
      fixtures and unsupported needs remain explicit. Do not claim real-model accuracy.
- [x] Run `pnpm --filter @factory/adapters test -- content-directory-definition.test.ts product-definition-data.test.ts requirement-interpreter.test.ts`.
- [x] Register the executable case binding when its actual file exists; do not
      manufacture an acceptance file merely to increase accepted counts.

Task 3 source review is clear after correcting provider limits to match the
accepted runtime. Current working-tree registration is nine, while acceptance
remains eight. The real executable case and real, explicitly partial emitted-browser
evidence now restore the routing-only index. Root's full eight-step definition lane
passes. Keep the admission with its family integration until actual product
acceptance; the preflight evidence does not count as a ninth accepted product.

## Task 4: compose scenario-specific UI and verification

**Paths:** new private `packages/compiler/src/content-directory-presentation.ts`,
focused presentation tests, narrow compiler facade/styles and existing worker
`verification-graph-plan.ts`, `verification-profiles.ts`, `role-journey.ts`,
`probes.ts` with affected tests. Shared ownership remains serialized.

- [x] RED: full workspace supports reader search/detail and curator edit/visibility;
      switching role clears prior data and ignores outstanding prior-role responses.
- [x] GREEN: compose existing primitives, local icons and states. Use useful
      category/title/summary hierarchy; detail exposes real body text, not a blank
      landing page. Curator forms retain edits on failure and explain conflicts.
- [x] Render full workspace at 390/768/1440, with long content, meaningful populated
      rows, no results and absent decorative media; check real computed geometry.
- [x] Adapt actual bounded verifier probes to the directory list envelope without
      changing previous-family response assumptions. Execute emitted runtime probes.
- [x] Run `pnpm --filter @factory/compiler test -- content-directory-presentation.test.ts content-directory-runtime.test.ts definition-data-compatibility.test.ts` plus affected worker tests.

Task 4 source and actual-case readiness review is 0/0/0. Root independently passes
10 UI and 39 worker cases, plus the full definition lane; owner runs broader
compiler/worker regression and typechecks. Browser tests use the emitted in-memory
runtime, and worker tests use a Prisma delegate double. Actual generated-product
and PostgreSQL-backed acceptance is still Task 5 below.

## Task 5: actual product acceptance and delivery

**Paths:** `e2e/content-directory.spec.ts`, reusable existing acceptance helpers,
`docs/acceptance/content-directory.md`, evidence directory and PM status/ledger.

- [x] Run the short lane before expensive image construction; assemble actual
      immutable Published input, compile, verify and start the owned local app.
- [x] Run `pnpm exec playwright test e2e/content-directory.spec.ts --workers=1`:
      create two entries, find/read, show, correct, hide, show again; verify ID/state
      continuity, denied reader writes, hidden reads, conflicts, retry and restart.
- [x] Inspect actual generated screenshots for both scenario roles and their
      relevant mobile/desktop states. Compare against the approved visual principles;
      CSS loading alone is not a product-quality verdict.
- [x] Record exact source/lock/Compilation identity, failures, ready time, cleanup,
      and required shared-contract review evidence. Reuse unaffected evidence.
- [x] Only after all applicable outcomes pass, increment accepted definitions and
      runtime families, commit/push through the controller and move to Inventory.

The current family does not implement continuous hosted deployment. Durable
upgrades and rollback are explicitly tracked in the parent September 24 plan.

Actual attempt 3 `4775a00c-fc89-4d8b-8485-aacf5f818464` passes the whole case,
with 22/22 isolated verification steps, 208,554 ms readiness and 209,512 ms first
management completion. Root and independent Terra QA inspect actual responsive
screens; QA passes 168 focused tests at P0/P1/P2 0/0/0. Preview and separate
outer-stack cleanup are proven. Failed attempts remain preserved. The final
family-boundary Sol review now closes 0/0/0 and PM accepts nine local definitions
across five demonstrated runtime families for controller commit/push. This is not
a main integration, repository release or hosted deployment approval.
