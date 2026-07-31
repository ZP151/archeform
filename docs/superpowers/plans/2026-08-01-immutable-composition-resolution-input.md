# Immutable Composition Resolution Input Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` task-by-task.

**Goal:** Derive every immutable capability composition and lock from one descriptor-validated, Factory-owned input snapshot.

**Architecture:** Public callers retain current structural input types. `captureResolutionInputV1` captures raw selections and composition-bearing manifests before resolution. Private snapshot-only functions then match, validate, normalize, canonicalize, and hash only owned frozen values.

**Tech Stack:** Node 22.11.0, TypeScript, pnpm, Vitest; no new dependency.

## Global Constraints

- Preserve Draft -> Publish -> immutable Compilation.
- Valid ordinary JSON retains exact composition bytes and lock digests.
- Fail closed for accessors, symbols, inherited array entries, sparse arrays, custom prototypes, cycles, and repeated raw reads.
- Do not modify Graph serialization, physical assets, Profile recipes, Compiler behavior, Provider activation, source intake, or legacy code.
- All code, tests, comments, and documentation are English.

## Task 1: Add adversarial RED evidence

**Files:**

- Modify: `packages/capabilities/test/composition-contract.test.ts`
- Modify: `packages/capabilities/test/typed-binding-contract.test.ts`

**Produces:** Failing tests proving that raw values need one owned capture.

- [ ] Add a parameter getter whose first result is a required `graph-symbol` parameter and whose second result is an optional `number` parameter. Resolving `{ entity: 7 }` must reject and the getter count must be zero after the descriptor boundary is implemented.
- [ ] Add parameter-array and `fieldTypes` accessor-element tests; neither getter may run.
- [ ] Add inherited index `0`, sparse-array, extra own array property, symbol-key, custom-array-prototype, cycle, and selection/lock/binding accessor tests.
- [ ] Preserve a valid canonical composition digest as the control.
- [ ] Run `pnpm --filter @factory/capabilities test -- --run test/composition-contract.test.ts test/typed-binding-contract.test.ts`; record RED before implementation.
- [ ] Commit only this RED evidence with `test: expose composition input rereads`.

## Task 2: Capture one immutable resolution input

**Files:**

- Modify: `packages/capabilities/src/composition.ts`
- Test: `packages/capabilities/test/composition-contract.test.ts`
- Test: `packages/capabilities/test/typed-binding-contract.test.ts`

**Produces:** `captureResolutionInputV1` and private opaque snapshot types.

- [ ] Implement `captureDataRecord(value, path, context)` using `Object.getOwnPropertyDescriptors` before any property value read. Accept only `Object.prototype` or `null`, own enumerable string-keyed data descriptors, and reject every accessor, symbol, invalid prototype, or cycle.
- [ ] Implement `captureDataArray(value, path, context)`. Accept only `Array.prototype`, dense own data indices, and no extra keys. Reject inherited holes, sparse arrays, accessors, symbols, custom properties, invalid prototypes, and cycles.
- [ ] Implement `captureResolutionInputV1(input, assets)`. Capture selections, locks, bindings, manifest identity, binding contract, input schema, parameters, field types, interfaces, dependencies, and contributions; use one `WeakMap` and deep-freeze all null-prototype records and dense arrays.
- [ ] Re-run Task 1. All exotic inputs must reject before output; valid digest control must be unchanged.
- [ ] Commit with `feat: capture immutable composition input`.

## Task 3: Resolve and hash owned snapshots only

**Files:**

- Modify: `packages/capabilities/src/node.ts`
- Modify: `packages/capabilities/src/index.ts`
- Modify: `packages/capabilities/src/composition.ts`
- Test: `packages/capabilities/test/composition-contract.test.ts`
- Test: `packages/capabilities/test/typed-binding-contract.test.ts`

**Produces:** Public capture before verification or overlap checks, snapshot-only matching, deeply immutable strict-contract compilation, binding normalization, canonical selection, and lock hashing.

**Repair round 1:** Independent review of implementation commit `73accc24a68d55308d127717e36cd63130024f3e` returned FAIL with two P1s. Task 3 remains `implementing`; repair is limited to the exact five paths above.

- [ ] Introduce private `ResolutionInputSnapshotV1`, `ManifestSnapshotV1`, `SelectionSnapshotV1`, and `ValidatedManifestContractV1` types.
- [ ] Make `createVerifiedCapabilityCompositionLock` and `composeCapabilityDraft` capture caller-owned selections and locks before any package verification, provider-overlap check, or other read, then reuse that same owned snapshot for every downstream operation. A self-redefining accessor must not let a public entry point verify one asset or overlap set and resolve or lock another.
- [ ] Refactor internals so a captured manifest contract is compiled once and the same immutable parameter and binding maps are consumed by validation, normalization, canonicalization, dependency resolution, and hashing.
- [ ] Deep-freeze every compiled parameter- and binding-schema value, including nested arrays and records. Read-only map mutation guards alone do not satisfy runtime immutability.
- [ ] Remove internal raw reads of `input.selections`, `selection.lock`, `selection.bindings`, `asset.manifest`, `manifest.parameters`, and `fieldTypes` after capture.
- [ ] Add a coherent-output test and resolve the largest registered composition 100 times, asserting a single digest.
- [ ] Run focused tests, all Capabilities tests, typecheck, lint, and build on Node 22.11.0.
- [ ] Commit with `fix: resolve compositions from owned snapshots`.

## Task 4: Verify downstream compatibility and release readiness

**Files:**

- Modify only focused Capabilities regression tests if required.
- Modify: `docs/project-status.md`
- Modify: `docs/superpowers/ledgers/2026-08-01-typed-capability-binding-validation.md`

**Produces:** Evidence permitting Typed Binding Task 3 to resume.

- [ ] Run all Capabilities tests plus all Compiler tests, Compiler typecheck, Compiler lint, and `git diff --check`.
- [ ] Resolve the largest registered composition 1,000 times on Node 22.11.0. Record only p95 timing and distinct digest count; require p95 <= 20 ms and exactly one digest.
- [ ] Require task review, behavioral QA, release review, and fresh acceptance verification in that order. A new P1 returns to architecture review, not another local validation patch.
- [ ] Commit acceptance evidence only after every gate passes using `docs: accept immutable composition boundary`.

## Plan self-review

- **Coverage:** Tasks 1-3 eliminate raw rereads across records, arrays, manifests, selections, bindings, and canonical locks. Task 4 proves downstream compatibility.
- **Dependencies:** Tasks are serialized; no Profile, physical asset, Graph, Workbench, Provider, Candidate Intake, or compiler feature task runs in parallel.
- **Scope:** The plan changes no serialized application or package format.
