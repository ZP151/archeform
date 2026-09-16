# Numeric Field Domains Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Enforce explicit reusable numeric rules through the Approval generation pipeline and show meaningful constrained amount/date summaries, enabling subsequent Training Funding admission.

**Architecture:** An optional self-versioned numeric policy is carried by Blueprint V1 and Graph V1. Shared semantic validation preserves legacy absence behavior; the compiler conditionally emits server/client enforcement and the numeric Approval summary profile. Training registration is a later data admission after this capability is accepted.

**Tech Stack:** Existing TypeScript/Zod/Prisma/PostgreSQL and approved generated React components; no new dependency, database type or UI asset.

## Global Constraints

- Work only in `C:/Users/15492/Develop/Archeform/.worktrees/consumer-delivery` on `codex/consumer-delivery-roadmap`.
- ADR-0069 exact SHA-256 `9a3ab7bc033e78584f8c60876ec54c3813b3019e4074b0156d1a7f9b704d6350` is the proposed contract. No implementation until its standing acceptance is recorded in the active PM ledger.
- Follow the shared product design `docs/superpowers/specs/2026-09-17-definition-reliability-and-training-design.md`.
- Preserve original five canonical/provider baselines and historical immutable Graph/Compilation bytes. Numeric absence adds zero output delta beyond the six physical-name mappings allowed by subsequently amended ADR-0068 (`11580a2fcdae5e1fb8c6a94494905ce6c19809a10b37a7a6cc8457da071cd69c`). Its strict test-only inverse must still recover the original complete bundle digests. Never recapture a golden fixture.
- Keep outer V1 discriminators and legacy unknown-key stripping. Only new policy/bound objects are strict. No numeric default when the property is absent.
- Policy-bearing integers use Int32, inclusive `-2147483648..2147483647`; decimals use finite JSON numbers and existing unqualified SQL DECIMAL. No currency scale or positivity inference.
- Default composed witnesses stay number `12` and currency `125.5`. Reject incompatible policies rather than changing old seeds or inventing a new authoring field. Explicit Graph seed data may supply another valid witness.
- Preserve authorization, concurrency, idempotency, Draft/Publish/Compilation boundaries. No raw model material or credentials in evidence.
- Root owns all Git, resources, actual evidence, status and acceptance. Owners have disjoint paths and must preserve others' work. Contract changes stop the parallel wave.
- Graph-only Task 1 may run alongside the frozen ADR-0068 database owner. Task 2 compiler integration starts after that source owner freezes its work; no second writer touches the database target.

### Task 1: Graph policy and fail-closed conversion

**Files:**

- Create: `packages/graph/src/numeric-field-domain.ts`.
- Modify: `packages/graph/src/product-blueprint.ts`, `packages/graph/src/model.ts`, `packages/graph/src/index.ts`, `packages/graph/src/browser.ts`, `packages/graph/src/application-graph-adapter.ts`.
- Create: `packages/graph/test/numeric-field-domain.test.ts`.
- Modify only as needed for direct integration cases: `packages/graph/test/product-blueprint.test.ts`, `packages/graph/test/application-graph.test.ts`, `packages/graph/test/application-graph-adapter.test.ts`, `packages/graph/test/browser-entry.test.ts`.

**Interfaces:** Export these pure, browser-safe interfaces from both Graph entries:

```typescript
type NumericFieldType = "integer" | "decimal";
type NumericFieldDomainV1 = {
  apiVersion: "factory.numeric-field-domain/v1";
  minimum?: { value: number; inclusive: boolean };
  maximum?: { value: number; inclusive: boolean };
};
// Export a Zod schema named numericFieldDomainSchema for the exact nested shape.
function isNumericFieldDomainValidForType(
  domain: NumericFieldDomainV1,
  type: NumericFieldType,
): boolean;
function isNumericFieldValueAllowed(
  value: unknown,
  type: NumericFieldType,
  domain: NumericFieldDomainV1,
): boolean;
```

The value helper accepts only finite number primitives; it performs no coercion. The type helper checks bound representation and nonempty intervals, including Int32 discreteness. Blueprint maps number/currency to integer/decimal before calling it. Trusted persisted Decimal normalization belongs to Task 2, not this helper.

- [x] Write failing focused tests for exact shape, closed nested keys, missing bounds, wrong types, nonfinite bounds, inverted/equal/exclusive ranges and Int32 edge emptiness.

  ```typescript
  const positive = {
    apiVersion: "factory.numeric-field-domain/v1" as const,
    minimum: { value: 0, inclusive: false },
  };
  expect(isNumericFieldValueAllowed(125.5, "decimal", positive)).toBe(true);
  expect(isNumericFieldValueAllowed(0, "decimal", positive)).toBe(false);
  expect(isNumericFieldValueAllowed("125.5", "decimal", positive)).toBe(false);
  expect(isNumericFieldValueAllowed(3_000_000_000, "integer", positive)).toBe(
    false,
  );
  ```

- [x] Run `pnpm --filter @factory/graph exec vitest run test/numeric-field-domain.test.ts` and retain the RED result before source edits.
- [x] Add the optional policy to numeric Blueprint/Graph fields, reject its use on other types, retain unchanged outer parsing and absence serialization. Keep V2/V3 schemas untouched.
- [x] Validate policy-bearing Graph seeds and witness availability under AUT-006. Distinguish absent optional values from a required operational witness; do not alter legacy seed validation when no policy exists.
- [x] Reject constrained V1-to-V2 conversion explicitly before copying the domain. Test valid published checksum plus constrained conversion rejection; old conversion output must remain exact.
- [x] Add an absent-policy unknown-key stripping regression, canonical/hash preservation checks and browser export verification. No filesystem or Node import in the new shared module.
- [x] Run Graph focused/full tests, build, typecheck and affected formatting. Write the report in this plan's workspace with RED/GREEN, exact exports, affected paths and limitations. No Git or service actions.

### Task 2: Propagate and enforce the accepted contract

**Files:**

- Modify: `packages/adapters/src/requirements/openai-interpreter.ts`, `packages/adapters/src/requirements/definition-family-registry.ts`, `packages/adapters/src/requirements/product-definition-data.ts` and focused tests under `packages/adapters/test/`.
- Modify: `packages/capabilities/src/product-composer.ts` and `packages/capabilities/test/product-composer.test.ts`.
- Modify: `packages/compiler/src/index.ts`, `packages/compiler/src/approval-mutation-contract.ts`, `packages/compiler/src/approval-workspace-presentation.ts`; reuse `packages/compiler/src/approval-decision-history.ts` without changing old output.
- Create: `packages/compiler/test/approval-numeric-domain.test.ts`; extend focused approval correction/identity tests when directly affected.
- Modify: `apps/compiler-worker/src/verifier/verification-graph-plan.ts` and its affected tests.

**Interfaces:** Consume Task 1 exports verbatim. Carry an optional `numericDomain` field without adding serialized keys when absent. No new runtime route/envelope, product-key branch, database schema or baseline change.

- [x] Write failing propagation, provider type-gate, definition fingerprint, unsupported-family and generated API tests before behavior edits.
- [x] Mirror the exact nested policy in provider/local authoring schemas, remove only provider-null absence in canonical projection, and never let registered selection overwrite reviewed rules. Keep the generic Graph-diff provider closed to this property.
- [x] Copy policy into Approval Graph fields, validate unchanged deterministic witnesses and reject incompatible composition. Verifier requests consume validated Graph witness values instead of hardcoded invalid numeric examples.
- [x] Conditionally emit the descriptor and shared numeric checks. API create/update rejects malformed/out-of-range primitives before persistence. Submit/resubmit validates the full authoritative stored record after authorization and before transition. Trusted Decimal normalization is separate from untrusted payload parsing; validate post-write/read values inside the existing transaction boundary.
- [x] Preserve exact retry and concurrency semantics; invalid numeric writes create no record/version/receipt/audit changes. Test positive corrections, repeat retries, stale versions, direct malformed payloads and stored invalid values.
- [x] Reuse generated form controls with native inclusive limits, safe integer exclusive limits and explicit decimal-exclusive client feedback. Client-invalid input must not call fetch; server denial remains authoritative and recoverable.
- [x] Emit `approval-workspace-presentation@2.3.0`, `approval-record-identity/v2` and `factory.generated.approval-numeric-domain/v1` only for the exact numeric-enabled structural profile. Require one unique required short-string title, one constrained numeric business field and one required temporal business field. Render numeric then temporal summaries in cards and matched history, using existing formatting/assets/CSS; ambiguous or unsupported targets fail closed.
- [x] Run affected suites plus complete five-definition compatibility and deterministic repeat generation. Record the UI reuse search and unchanged registry keys. Do not register Training in this task.

### Task 3: Shared-contract acceptance and handoff to data admission

**Owner:** Root with the existing task reviewer, independent Terra QA and independent Sol release reviewer for this shared boundary.

**Files:** `docs/acceptance/numeric-field-domains.md`, safe evidence under `docs/acceptance/evidence/numeric-field-domains/`, active ledger, authoring guide and status/roadmap.

- [x] Exercise generated InMemory and actual Prisma persistence with policy-bearing authored fixtures, including invalid create/update/submit and successful correction/retry. Record exact source and actual database behavior without raw values or credentials.
- [x] Run affected full package tests/typecheck/build and unchanged five-definition compatibility. Review schema/propagation/runtime/UI as one integrated shared contract; fix concrete findings and rerun affected cases only.
- [x] Record the existing independent QA/release verdicts once for this capability boundary. No per-row repetition of that ceremony.
- [x] Root accepts and commits/pushes the bounded shared capability, verifying remote equality. Preserve ongoing root-owned planning files explicitly.
- [x] Start a separate Training Funding data-admission task using this accepted capability and the existing generic Approval E2E helper. Require actual 390/768/1440 screens, positive fee/date/justification, return/correct/resubmit/approve, denial, retry, persistence and effort measurements before increasing the accepted definition count.
