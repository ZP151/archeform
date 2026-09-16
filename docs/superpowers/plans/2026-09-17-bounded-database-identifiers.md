# Bounded Database Identifiers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Make the reproduced long-ID application generate a valid, usable local database without changing normal existing products or logical identifiers.

**Architecture:** One private allocation result in the database target supplies conditional physical mappings to both Prisma and SQL. The exact algorithm and compatibility boundary are ADR-0068; production work starts only after its hash-bound standing acceptance is in the PM ledger.

**Tech Stack:** Existing TypeScript, Node 22, pnpm 9, Prisma 6.19.3 and PostgreSQL 16; no dependency or service-topology changes.

## Global Constraints

- Workspace: `C:/Users/15492/Develop/Archeform/.worktrees/consumer-delivery`; base `bbb1e23c68f05e3ae213ceaf167737eb0fe86779`.
- Follow the product design in `docs/superpowers/specs/2026-09-17-definition-reliability-and-training-design.md` and accepted ADR-0068 verbatim.
- Preserve mutable Draft -> immutable Published Graph -> immutable Compilation.
- No Graph/model/delegate renames, product branches, package changes or baseline rewrites.
- Amended ADR-0068 SHA-256 `11580a2fcdae5e1fb8c6a94494905ce6c19809a10b37a7a6cc8457da071cd69c` permits exactly six physical-name mappings across fifteen database-file instances in future regeneration of the protected five fixtures. All other bytes remain exact. Strict test-only allowlisted inverse comparison must recover original complete bundle digests and reject unrelated changes. The original fixture SHA-256 remains `421447a597e6593045b1fe317ed0c83e6469f5540c6156620d05af2503670ae5`; never recapture it.
- No credentials, database URLs, raw model material or generated schema dumps in evidence.
- One compiler owner; root owns compatibility fixture/helper tests, E2E, runtime resources, evidence and all Git. Workers are not alone and must preserve others' changes.
- The numeric-domain proposal is independently prepared but its source implementation follows this frozen database task.

### Task 1: Paired bounded database mapping

**Owner:** Compiler implementation agent after standing acceptance.

**Files:**

- Modify: `packages/compiler/src/targets/database/target.ts`.
- Test: `packages/compiler/test/database-target-parity.test.ts`.

**Interfaces:** Consume the existing `DatabasePlanV1` and `PublishedCompilationInput`. Keep the exported target and serialized plan unchanged. Introduce only private allocation structures/helpers; both existing schema and SQL renderers consume the same allocation. ADR-0068 BID-001 through BID-008 are the naming contract.

- [ ] Add focused RED tests using the actual Publication definition composed with requirement ID `publication-review-acceptance-e4f0c704-4f1c-4f1d-9699-d91aa0104021`. Reuse the same interpretation/composition/Published lock construction as `test/fixtures/definition-data-compatibility.ts`. The root's pre-change Prisma validation already independently reproduces four P1012 failures; retain the test failure too.

  ```typescript
  const first = databaseTargetPlugin.render(databaseTargetPlugin.plan(input));
  const second = databaseTargetPlugin.render(databaseTargetPlugin.plan(input));
  expect(first).toEqual(second);
  const schema = first.find(
    (file) => file.path === "database/prisma/schema.prisma",
  )!.content;
  expect(schema).toContain("@@map(");
  expect(schema).toContain("@id(map:");
  ```

  `input` is the `buildCompilationInput` result for that composed immutable fixture. Add assertions over parsed map declarations and SQL identifiers: all resolved names are at most 63 UTF-8 bytes, globally distinct where required, and each mapped name appears in the matching SQL role. Verify logical model names remain unchanged. Assertions must prove actual mapping semantics, not just substring existence.

- [ ] Run `pnpm --filter @factory/compiler exec vitest run test/database-target-parity.test.ts` and record the failing new assertion before production edits.
- [ ] Collect names and reservations before rendering. Preserve safe candidates, allocate unsafe objects with the ADR semantic key and SHA-256 prefix, reserve names before deterministic sorted allocation, and fail closed on unresolved collisions. Keep safe historical output byte-identical. Both renderers use this one result; no post-render text-replacement repair.
- [ ] Cover tables, primary keys, field uniqueness, declared indexes and explicit foreign keys. Preserve logical Prisma names and delegates. Reject unsupported long columns and implicit M2M identifiers with a fixed safe error; do not copy raw input into the error.
- [ ] Add paired-output, equal-prefix, reserved-name, deterministic-repeat, natural-name-preservation and unsupported-surface tests. Exercise digest escalation through a private test seam or mocked existing hash helper without exposing a public configurable algorithm. Do not add a public export solely for tests.
- [ ] Run focused tests, compiler typecheck, full compiler tests and formatting. Root separately owns new five-definition compatibility assertions; do not edit its fixture or helper.
- [ ] Write a concise report in the plan workspace with files, RED/GREEN counts, exact commands and remaining concerns. Do not commit, push, create services or edit the ADR. Root requests the one independent implementation review after actual validation evidence is available.

### Task 2: Compatibility and actual long-ID business acceptance

**Owner:** Root, with one independent reviewer after implementation.

**Files:**

- Modify: `packages/compiler/test/fixtures/definition-data-compatibility.ts`.
- Modify: `packages/compiler/test/definition-data-compatibility.test.ts`.
- Retain: `packages/compiler/test/fixtures/five-definition-baseline.json`.
- Modify: `e2e/helpers/approval-definition-batch.ts`.
- Create: `e2e/approval-long-identifier.spec.ts`.
- Create: `docs/acceptance/bounded-database-identifiers.md` and safe receipts under `docs/acceptance/evidence/bounded-database-identifiers/`.
- Update: status, roadmap and active PM ledger after observed results.

**Interfaces:** Extend the test-only compatibility helper with an optional key list whose default remains the original four. Extend `ApprovalDefinitionCase` with optional `requirementIdPrefix`; default stays `batch`, and the new long-ID case uses `publication-review-acceptance`. The underlying business journey and existing Publication case remain unchanged.

- [ ] Assert the new five-definition fixture against the real complete generator using only the amended ADR's strict mapping inverse, keeping the old four-fixture bytes intact. Both cases must prove the allowed mapping inventory before restoring it for hash comparison. Current schema/SQL map names must agree; reject unknown/seventh mappings and unrelated byte changes.

  ```typescript
  expect(
    currentDefinitionDataCompatibility(
      expected.entries.map(
        (entry: { definitionKey: string }) => entry.definitionKey,
      ),
    ),
  ).toEqual(expected.entries);
  ```

- [ ] Reuse the actual Approval journey with a unique long identifier per attempt:

  ```typescript
  const requirementId = `${definition.requirementIdPrefix ?? "batch"}-${randomUUID()}`;
  ```

  The new spec passes the existing Publication case with that prefix and a separate evidence directory. It must not shorten the input or rebuild a historical Compilation.

- [ ] Rebuild the compiler, regenerate the exact original long input, validate with pinned Prisma and inspect emitted SQL names in a task-owned isolated PostgreSQL 16 instance. Check zero truncation notices and namespace uniqueness. Runtime services and any temporary directories belong to root; never print environment values.
- [ ] Run the actual long-ID Publish/compile/verification/Preview journey, creating distinct submissions and proving correction, resubmission, decision, denial, retry and persistence. Retain actual source/compilation/runtime identity. Reuse the established responsive/image-failure checks as part of the existing case; do not invent another visual gate.
- [ ] Tear down exact task-owned Preview and Factory resources and verify absence. Failed attempts remain recorded separately; no old evidence directory is overwritten.
- [ ] Have one independent reviewer evaluate code, test evidence and actual images. Resolve concrete findings and rerun only affected checks. No new Graph/security contract is introduced in this task.
- [ ] Root records accepted scope and limitations, formats changed files, runs `git diff --check`, commits the bounded task and pushes the branch normally. Verify local HEAD equals the remote branch tip and account for any ongoing root-owned planning files. The long Goal continues into the separately accepted numeric-domain plan.
