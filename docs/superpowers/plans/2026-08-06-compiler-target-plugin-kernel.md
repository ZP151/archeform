# Compiler Target Plugin Kernel Implementation Plan

Goal design:
`docs/superpowers/specs/2026-08-06-compiler-target-plugin-kernel-goal-design.md`

Ledger:
`docs/superpowers/ledgers/2026-08-06-compiler-target-plugin-kernel.md`

Created: 2026-08-06 by the implementing agent from the approved design and the
current `@factory/compiler` structure. Reviewed for internal consistency against
the design's completion criteria before Stage 1.

## Goal

Reconcile Typed Capability Binding Task 2 with accepted Task 2A through fresh
evidence and the existing governance state machine, then introduce
`CompilerTargetPluginV1` (`supports -> plan -> render -> validate`) and move
documentation, policy, and database target ownership out of the centralized
compiler through deterministic file/byte/SHA-256 parity gates across all five
accepted Profiles.

## Architecture

`packages/compiler/src/index.ts` (4565 lines) currently owns planning
(`buildCompilationPlan`, 273-302), the contribution pipelines (304-848,
958-1099), all target renderers, and the single render entry
`generateApplicationBundle` (4000-4565). There is no validation result type;
validation throws. Generated files are `{ path, content }` string pairs
(`GeneratedFile`, 143-146). Target keys are the eight-member
`CompilationTargetKey` union (67-75). The immutable compilation input is
`PublishedGraphInput` (125-129): `publishedRevisionId`, the exact
`ApplicationGraphV1`, and the canonicalized `CapabilityCompositionLockV1`.

The target boundary is additive: a new `core/` module set defines the plugin
contract, registry admission, and generated-file rules; each migrated target
gets a registered plugin under `targets/<target>/`; the facade keeps the
current public surface (`buildCompilationPlan`, `generateApplicationBundle`,
`resolveTargetContributions`, types, runtime re-exports) while delegating
migrated target ownership. Restaurant runtime output remains a specialized
runtime re-export; Restaurant's own docs/DB/policy artifacts stay with
`restaurant-runtime.ts` unless a later Goal migrates them.

## Global constraints

- Only the immutable Published Graph, validated capability composition lock,
  and explicit compiler context drive output. No profile-name semantic branch
  and no mutable Draft input.
- Preserve the Draft -> Publish -> immutable Compilation lifecycle. No reverse
  parsing, no Published Graph or Compilation mutation.
- Output bytes must not change during migration: for each target and each of
  the five Profile fixtures, capture legacy path/bytes/SHA-256, render through
  the plugin, and require an exact match. Any intentional difference needs a
  separately documented decision, not a silent refactor change.
- No new dependency, external source, provider, deployment, new Profile, or
  unrelated capability behavior.
- `packages/compiler/src/index.ts` remains a thin public facade and temporary
  orchestration boundary; no generic `helpers.ts`/`utils.ts`; new production
  files below 500 lines and functions below 60 lines unless a responsibility
  reason is recorded in the ledger.
- Code, tests, comments, and documentation are English. No credentials or raw
  model material in any source or evidence.
- Behavior changes start with a focused failing test (RED) when practical.

## Five Profile parity fixtures

There are no published-Graph JSON fixtures in `packages/compiler`. The five
Profiles (expense-approval, restaurant-ordering, simple-ecommerce,
retail-counter, grocery-pickup) are composed programmatically through
`@factory/capabilities` (`composeProfileDraft` / `composeDefaultCapabilityDraft`
/ `createCapabilityCompositionLock`), and compiler tests wrap the result with
the local `withCompositionLock` helper
(`packages/compiler/test/compilation-plan.test.ts:22-47`). Parity captures the
legacy `generateApplicationBundle` output set (path, bytes, SHA-256) for each
Profile fixture at the pre-migration tip, then re-renders through the migrated
target plugin and compares. Digests are recorded only as evidence values in
the ledger and test assertions, never as raw content dumps.

## Stage 0: Governance reconciliation

Completed on 2026-08-06 with fresh evidence (see the typed-binding ledger
"Task 2 reconciliation with accepted Task 2A — 2026-08-06" section). The
accepted Task 2A boundary closes Task 2's repeated-read P1; Task 2 advances
through its declared task-review, QA, release-review, and PM transitions to
`accepted` before Stage 1 begins. This plan does not modify any Typed Binding
contract, ADR, or task path.

## Stage 1: Plugin kernel

**Files (new):**

- `packages/compiler/src/core/target-plugin.ts` — the public versioned
  contract and result types:

```ts
interface CompilerTargetPluginV1<TPlan> {
  readonly apiVersion: "factory.compiler-target/v1";
  readonly key: CompilationTargetKey;
  supports(input: PublishedCompilationInput): boolean;
  plan(input: PublishedCompilationInput): TPlan;
  render(plan: TPlan): readonly GeneratedFile[];
  validate(files: readonly GeneratedFile[]): TargetValidationResult;
}
```

Supporting types refine the design's shape: `PublishedCompilationInput` is
the facade's canonicalized immutable input view; plans are serializable
plain-data records; `TargetValidationResult` is `{ ok: true }` or
`{ ok: false, issues: readonly TargetValidationIssue[] }` with
`{ target, path, code, message }`.

- `packages/compiler/src/core/generated-files.ts` — `GeneratedFile`
  (`{ path, content }`), path normalization and traversal rejection, duplicate
  path rejection, and SHA-256 digest computation. The facade re-exports the
  `GeneratedFile` type unchanged so existing callers keep compiling.

- `packages/compiler/src/core/target-registry.ts` — deterministic admission
  and ordering: rejects a duplicate plugin key, an unsupported target request,
  output path traversal, duplicate file paths, nondeterministic output (render
  twice and compare bytes/digests), and validation failure; exposes
  `registerCompilerTargetPlugin`, `getCompilerTargetPlugin`, and ordered target
  iteration.

**Tests (new):**

- `packages/compiler/test/target-plugin.test.ts` — lifecycle positive path
  (`supports -> plan -> render -> validate`) and typed plan round-trip.
- `packages/compiler/test/target-registry.test.ts` — fail-closed matrix:
  duplicate key, unsupported target, traversal (`..`, absolute paths, backslashes),
  duplicate output paths, nondeterminism, validation failure; deterministic
  ordering.
- `packages/compiler/test/generated-files.test.ts` — path rules and SHA-256
  digests.

**Facade:** `packages/compiler/src/index.ts` re-exports the new types and
registers the migrated targets; its public exports and
`generateApplicationBundle` behavior stay byte-identical for all current
callers. No target migration happens in this stage; a facade regression suite
(`compilation-plan.test.ts`, `profile-compilation.test.ts`,
`composition-compilation.test.ts`) proves no drift.

**RED:** focused registry/contract tests fail because the kernel does not
exist. **GREEN + refactor:** implement the three core modules, then run the
focused tests, full `@factory/compiler` suite, typecheck, lint, format, and
`git diff --check`. **Commit:** `feat(compiler): add target plugin kernel`.

**Gates:** fresh task review, PM `ready_for_qa`, behavioral QA, PM
`reviewed`, release review, PM `accepted` at the remote-reachable commit
before Stage 2.

## Stage 2: Documentation target migration

**File:** `packages/compiler/src/targets/documentation/target.ts` (split into
plan/render/validate responsibilities within the target directory when the
renderers justify it).

**Scope:** `docs/api-reference.md` (`renderApiReference`, index.ts:3840),
`docs/entity-relationship.md` (`renderEntityRelationshipDiagram`, 3905),
`docs/permission-matrix.md` (`renderPermissionMatrix`, 3931),
`docs/application.md` (`renderDocumentation`, 3943), plus their helpers
(`markdownCell` 3821, `relationshipCardinality` 3825). Wired in
`generateApplicationBundle` at 4521-4537. The Restaurant
`apiReference` artifact stays with `restaurant-runtime.ts` (specialized
runtime, out of scope). No `docs.section` contribution slot is consumed today;
the target does not add new contribution semantics.

**Steps:**

1. RED: focused parity tests comparing plugin-rendered docs against the
   current `generateApplicationBundle` bytes for all five Profile fixtures.
2. Move the renderers into the target behind the plugin lifecycle without
   changing output bytes; the facade calls the registered documentation
   plugin.
3. GREEN + negative tests: unsupported input rejection, path/traversal
   rejection through the registry, deterministic double-render digest check.
4. Remove the centralized renderer functions from `index.ts` only after
   parity passes; keep the facade thin.
5. Run focused tests, full compiler suite, typecheck, lint, format, `git diff
--check`; record per-Profile path/bytes/SHA-256 parity in the ledger.
6. **Commit:** `refactor(compiler): migrate documentation target`.

**Gates:** task review, PM, QA, release review, PM acceptance at the
remote-reachable commit before Stage 3.

## Stage 3: Policy target migration

**File:** `packages/compiler/src/targets/policy/target.ts`.

**Scope:** `api/policy/policy.csv` (`renderCasbinPolicy`, index.ts:1881),
`api/policy/model.conf` (inline string, 4483-4486), `api/src/policy.ts`
(`renderPolicyModule`, 1927; embeds the policy CSV at 1945). Wired at
4407-4409 and 4483-4490. Package-owned `policy.rule` contributions
(`resolveIdentityPolicyRuntimeContribution`, 860-956) feed the policy module;
the migration preserves that contribution wiring exactly (read the wiring at
implementation time and keep the contribution-derived bytes unchanged).

**Steps:** same RED/parity/GREEN/negative/delegation sequence as Stage 2,
with per-Profile path/bytes/SHA-256 parity across all five Profiles.
**Commit:** `refactor(compiler): migrate policy target`. Full gates before
Stage 4.

## Stage 4: Database target migration

**File:** `packages/compiler/src/targets/database/target.ts`.

**Scope:** `database/prisma/schema.prisma` (`renderPrismaSchema`, index.ts:1477)
and the `api/prisma/schema.prisma` duplicate (4411-4422),
`database/prisma/migrations/0001_initial/migration.sql`
(`renderInitialMigration`, 1660), `database/prisma/seed.ts`
(`renderPrismaSeed`, 1729), and the package-owned database contribution merge
path (`additionalPrismaSchemaFragments` / `additionalMigrationFragments`,
4059-4070) fed by order-operations, money-pricing, notification-outbox, and
other `database.schema`/`database.migration` contributions. Runtime code that
consumes the schema (`api/src/prisma-record-store.ts`,
`renderPrismaRecordStore` 2849) stays in the facade/orchestration — the
database target owns schema, migration, and seed only.

**Steps:** same RED/parity/GREEN/negative/delegation sequence; the parity
fixtures additionally assert the package-owned fragment bytes (schema and
migration) remain merged identically. Because migration bytes must not change,
no migration smoke is required; the existing generated-runtime suites
(`money-pricing-runtime`, `order-operations-runtime`,
`notification-outbox-runtime`, `commerce-transaction-runtime`,
`identity-policy-runtime`) run as regression evidence. **Commit:**
`refactor(compiler): migrate database target`. Full gates before acceptance.

## Stage 5: Acceptance and handoff

- Run the complete `@factory/compiler` suite, affected Graph/Capabilities/
  Control Plane/Worker suites, the five-Profile three-target parity
  verification, formatting, secret-boundary, and provenance checks.
- Fresh independent task-review, QA, release-review, and PM contexts complete
  every required transition for each stage.
- Update the Goal ledger, `docs/project-status.md`, and `docs/roadmap.md` from
  observed evidence only; the worktree is clean and every Goal commit is on
  `origin/feat/compiler-target-plugin-kernel`.
- **Commit:** `docs: accept compiler target plugin kernel`.
- Report `GOAL_COMPLETE` with commit hashes, verification commands and exact
  totals, remaining product gaps, and the next recommended Goal.

## Expected commit sequence

1. `docs: reconcile typed binding task 2` (fa57d52) plus the gate-record
   commits (`test: cover strict binding validation branches` 0dbe0cf; PM
   transition records).
2. `docs: create compiler target plugin plan` (this plan + ledger skeleton).
3. `feat(compiler): add target plugin kernel`.
4. `refactor(compiler): migrate documentation target`.
5. `refactor(compiler): migrate policy target`.
6. `refactor(compiler): migrate database target`.
7. `docs: accept compiler target plugin kernel`.

Every gate cites one remote-reachable Target-Commit; a repair creates and
pushes a new commit and restarts the affected gates; an evidence entry never
predicts the hash of the commit that contains it. Never force-push, amend a
pushed commit, or push a known-failing iteration.

## Acceptance mapping

| Design criterion                                                                  | Plan coverage               |
| --------------------------------------------------------------------------------- | --------------------------- |
| Typed Binding Task 2 reconciled through its gates                                 | Stage 0                     |
| `CompilerTargetPluginV1` and Registry with focused positive and fail-closed tests | Stage 1                     |
| Docs, policy, database are independent registered targets                         | Stages 2-4                  |
| Five-Profile file/byte/digest parity with no unexplained difference               | Stages 2-4 parity steps     |
| Facade no longer owns those renderers                                             | Stages 2-4 delegation steps |
| No profile-name branch, no mutable input                                          | Global constraints          |
| Required gates pass                                                               | Every stage gate list       |
| Ledger, roadmap, status, acceptance evidence agree                                | Stage 5                     |
| Fresh independent gate contexts complete every transition                         | Stage 5                     |
| Clean worktree, all commits pushed                                                | Stage 5                     |

## Non-goals

- Isolated verifier or diagnosis-to-Draft-Diff implementation.
- `RequirementSpec`, `CompositionPlan`, or AI provider changes.
- New capability families, Profiles, dependencies, or external source reuse.
- Restaurant runtime extraction or behavior changes.
- Cloud deployment, providers, observability, fleet, upgrade, or rollback.
- Graph, lifecycle, capability-lock, or output-slot contract changes.
- Typed Binding Tasks 3-7 or Commercial Foundation acceptance work.
