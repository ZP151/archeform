# Adaptive Requirement Interview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fixed Expense Approval Discuss questionnaire with a deterministic, one-question-at-a-time interview whose confirmed answers produce the baseline requirement used for planning.

**Architecture:** A Factory-owned question catalogue defines applicability, answer policy, recommendation, rationale, and declared requirement effects. A pure Workbench interview state machine selects the next applicable question and maps only structured answers into `RequirementSpecV1`; the existing deterministic planner remains the only path from that requirement to a `CompositionPlanV1` and constrained Draft Diff.

**Tech Stack:** TypeScript, Vitest, Next.js Workbench, `@factory/graph`, and the existing deterministic `@factory/capabilities` planner.

## Global Constraints

- Scope is Expense Approval only; Restaurant Ordering, Simple Ecommerce, and reusable cross-profile interview infrastructure are excluded.
- The Application Graph remains the source of truth. Discuss must not create, mutate, publish, compile, or run a Graph.
- Persist only the schema-valid `RequirementSpecV1`, existing checksum-bound review data, and safe structured values already permitted by those contracts. Never persist raw chat, prompts, provider responses, credentials, URLs, package references, source code, executable actions, or hidden reasoning.
- The question catalogue is Factory-owned and deterministic. Do not install `mattpocock/skills`, Base44 software, or any new dependency; no third-party source is copied.
- Build cannot start without an accepted checksum-bound plan. The compiler consumes only immutable Published Graphs.
- Every behavior change begins with a focused failing Vitest test. Existing golden-path regressions remain green.
- This plan adds no compatibility layer for the archived Python or legacy-console platform.

---

## File Structure

| Path                                                                 | Responsibility                                                                                                                          |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/workbench/lib/golden-path/interview-catalog.ts`                | Factory-owned Expense Approval question definitions, applicability predicates, recommendations, and requirement-effect declarations.    |
| `apps/workbench/lib/golden-path/interview-catalog.test.ts`           | Catalogue order, dependency, policy, unsupported-answer, and source-boundary tests.                                                     |
| `apps/workbench/lib/golden-path/discuss-model.ts`                    | Immutable interview session, next-question selection, answer/defer/confirmation transitions, progress, and `RequirementSpecV1` mapping. |
| `apps/workbench/lib/golden-path/discuss-model.test.ts`               | Session, fail-closed, mapping, determinism, and no-Graph-mutation tests.                                                                |
| `apps/workbench/lib/golden-path/plan-alternatives.ts`                | Baseline-first deterministic planning and optional single-delta comparison alternatives.                                                |
| `apps/workbench/lib/golden-path/plan-alternatives.test.ts`           | Baseline-answer propagation, delta isolation, omitted-comparison, and deterministic-plan tests.                                         |
| `docs/superpowers/plans/2026-08-08-base44-inspired-golden-path.md`   | Golden Path sequence that makes this slice a prerequisite for Plan acceptance.                                                          |
| `docs/superpowers/ledgers/2026-08-08-base44-inspired-golden-path.md` | PM-owned state and evidence record after the implementation hand-off.                                                                   |

## Task 1: Define the deterministic Expense Approval question catalogue

**Files:**

- Create: `apps/workbench/lib/golden-path/interview-catalog.ts`
- Create: `apps/workbench/lib/golden-path/interview-catalog.test.ts`

**Consumes:** `RequirementSpecV1` constraints, open-question, and acceptance-scenario fields; the approved [Adaptive Requirement Interview design](../specs/2026-08-08-adaptive-requirement-interview-design.md).

**Produces:** An immutable `expenseApprovalInterviewCatalog()` whose entries are ordered, typed, and safe to expose in Discuss.

**Interfaces:**

```ts
export type InterviewQuestionKey =
  | "outcome"
  | "first-approver"
  | "manager-threshold"
  | "audit-visibility"
  | "escalation-policy"
  | "submission-evidence"
  | "receipt-policy"
  | "success-measure";

export interface InterviewQuestionV1 {
  readonly key: InterviewQuestionKey;
  readonly blocking: boolean;
  readonly dependsOn: readonly InterviewQuestionKey[];
  readonly options: readonly string[];
  readonly recommendedAnswer: string;
  readonly rationale: string;
  readonly applies: (
    answers: ReadonlyMap<InterviewQuestionKey, string>,
  ) => boolean;
  readonly impact: readonly string[];
}

export function expenseApprovalInterviewCatalog(): readonly InterviewQuestionV1[];
```

- [ ] **Step 1: Write focused failing catalogue tests**

```ts
it("orders one applicable blocking question before its dependent question", () => {
  const catalog = expenseApprovalInterviewCatalog();
  expect(catalog.map((question) => question.key)).toContain(
    "manager-threshold",
  );
  const escalation = catalog.find(
    (question) => question.key === "escalation-policy",
  )!;
  expect(escalation.dependsOn).toEqual(["manager-threshold"]);
});

it("keeps receipt storage outside the first capability portfolio", () => {
  const receipt = expenseApprovalInterviewCatalog().find(
    (question) => question.key === "receipt-policy",
  )!;
  expect(receipt.blocking).toBe(false);
  expect(receipt.impact).toContain("unsupported:receipt-storage");
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `pnpm --filter @factory/workbench test -- interview-catalog.test.ts`

Expected: FAIL because `interview-catalog.ts` does not exist.

- [ ] **Step 3: Implement the closed catalogue**

```ts
export function expenseApprovalInterviewCatalog(): readonly InterviewQuestionV1[] {
  return [
    outcomeQuestion,
    firstApproverQuestion,
    managerThresholdQuestion,
    auditVisibilityQuestion,
    escalationPolicyQuestion,
    submissionEvidenceQuestion,
    receiptPolicyQuestion,
    successMeasureQuestion,
  ];
}
```

Implement every entry listed in the design with a non-empty rationale, a
recommended answer contained in `options`, unique stable keys, and a pure
`applies` predicate. The escalation question applies only after a threshold
answer. Unsupported receipt handling must describe a limitation rather than
declare a file capability or Graph operation.

- [ ] **Step 4: Run focused catalogue tests and confirm GREEN**

Run: `pnpm --filter @factory/workbench test -- interview-catalog.test.ts`

Expected: PASS with deterministic order, policies, recommendations, and
unsupported-capability coverage.

## Task 2: Replace the fixed Discuss state machine with an adaptive interview

**Files:**

- Modify: `apps/workbench/lib/golden-path/discuss-model.ts`
- Modify: `apps/workbench/lib/golden-path/discuss-model.test.ts`

**Consumes:** Task 1's `InterviewQuestionV1` catalogue.

**Produces:** A serializable immutable `DiscussSession` that exposes exactly
one next question, explicit answer or deferral actions, and a confirmed
requirement-summary gate without exposing any Graph or Draft mutation API.

**Interfaces:**

```ts
export interface DiscussAnswer {
  readonly key: InterviewQuestionKey;
  readonly value: string | null;
  readonly deferred: boolean;
}

export interface DiscussSession {
  readonly mode: "discuss";
  readonly catalogVersion: "expense-approval/v1";
  readonly answers: readonly DiscussAnswer[];
  readonly requirementSummaryConfirmed: boolean;
}

export function nextDiscussQuestion(
  session: DiscussSession,
): InterviewQuestionV1 | null;
export function answerDiscussQuestion(
  session: DiscussSession,
  key: InterviewQuestionKey,
  value: string,
): DiscussSession;
export function deferDiscussQuestion(
  session: DiscussSession,
  key: InterviewQuestionKey,
): DiscussSession;
export function confirmRequirementSummary(
  session: DiscussSession,
): DiscussSession;
export function canPlan(session: DiscussSession): boolean;
```

- [ ] **Step 1: Write focused failing state-machine tests**

```ts
it("returns exactly one blocking question and advances only after an explicit answer", () => {
  const start = startExpenseApprovalDiscuss();
  expect(nextDiscussQuestion(start)?.key).toBe("outcome");
  const answered = answerDiscussQuestion(start, "outcome", "expense-approval");
  expect(nextDiscussQuestion(answered)?.key).toBe("first-approver");
  expect(start.answers).toEqual([]);
});

it("rejects a deferred blocking question and accepts a deferred deferrable question", () => {
  expect(() =>
    deferDiscussQuestion(startExpenseApprovalDiscuss(), "outcome"),
  ).toThrow(/blocking/i);
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `pnpm --filter @factory/workbench test -- discuss-model.test.ts`

Expected: FAIL because the adaptive session API and summary-confirmation gate
do not exist.

- [ ] **Step 3: Implement immutable interview transitions**

```ts
export function nextDiscussQuestion(
  session: DiscussSession,
): InterviewQuestionV1 | null {
  const answers = new Map(
    session.answers
      .filter((answer) => !answer.deferred && answer.value !== null)
      .map((answer) => [answer.key, answer.value!]),
  );
  return (
    expenseApprovalInterviewCatalog().find(
      (question) =>
        question.applies(answers) &&
        !session.answers.some((answer) => answer.key === question.key),
    ) ?? null
  );
}
```

Validate unknown keys, unavailable questions, duplicate values, inapplicable
answers, and unsupported option values before returning a new session. Refuse
deferral for blocking questions. `confirmRequirementSummary` must reject any
session with an unanswered applicable blocking question or an outstanding next
question. `canPlan` returns true only after successful confirmation and no
blocking question remains.

- [ ] **Step 4: Run focused state-machine tests and confirm GREEN**

Run: `pnpm --filter @factory/workbench test -- discuss-model.test.ts`

Expected: PASS for deterministic next-question selection, immutability,
deferral policy, summary confirmation, and fail-closed input handling.

## Task 3: Map structured answers into the baseline RequirementSpec

**Files:**

- Modify: `apps/workbench/lib/golden-path/discuss-model.ts`
- Modify: `apps/workbench/lib/golden-path/discuss-model.test.ts`
- Modify: `packages/graph/test/requirement-spec.test.ts`

**Consumes:** Task 2's confirmed `DiscussSession`.

**Produces:** A schema-valid deterministic `RequirementSpecV1` that contains
the user-confirmed baseline, with explicit deferrable questions represented in
`openQuestions` and no raw interview transcript.

**Interfaces:**

```ts
export type RequirementBuildResult =
  | { readonly ok: true; readonly spec: RequirementSpecV1 }
  | {
      readonly ok: false;
      readonly reason: "unconfirmed-summary" | "unresolved-blocking-question";
      readonly unresolved: readonly InterviewQuestionKey[];
    };

export function buildRequirementSpec(
  session: DiscussSession,
): RequirementBuildResult;
```

- [ ] **Step 1: Write focused failing mapper tests**

```ts
it("uses the confirmed threshold as the baseline requirement constraint", () => {
  const session = confirmRequirementSummary(
    completeExpenseInterview({ "manager-threshold": "5000" }),
  );
  const result = buildRequirementSpec(session);
  expect(result).toMatchObject({ ok: true });
  if (!result.ok) return;
  expect(result.spec.constraints[0]?.statement).toContain("5000");
});

it("preserves a deferred receipt decision as an unanswered open question", () => {
  const result = buildRequirementSpec(confirmedSessionWithDeferredReceipt());
  expect(result).toMatchObject({ ok: true });
  if (!result.ok) return;
  expect(
    result.spec.openQuestions.some((question) =>
      question.question.includes("receipt"),
    ),
  ).toBe(true);
});
```

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `pnpm --filter @factory/workbench test -- discuss-model.test.ts && pnpm --filter @factory/graph test -- requirement-spec.test.ts`

Expected: FAIL because the fixed requirement mapper does not derive its
baseline from the adaptive session or require confirmation.

- [ ] **Step 3: Implement the declared answer-to-requirement mapping**

Map only the catalogue's declared effects to `outcome`, actors, domain
concepts, workflows, constraints, open questions, and acceptance scenarios.
Include the selected threshold, audit visibility, escalation disposition,
submission evidence, and success measure. A deferred receipt answer stays an
unanswered open question with a limitation; it must not create a capability
lock, a file field, or a Graph operation. Pass the result through
`assertRequirementSpec` before returning it.

- [ ] **Step 4: Run focused mapper tests and confirm GREEN**

Run: `pnpm --filter @factory/workbench test -- discuss-model.test.ts && pnpm --filter @factory/graph test -- requirement-spec.test.ts`

Expected: PASS with stable requirement checksums for equal completed sessions,
visible deferred questions, and no transcript/Graph payload surface.

## Task 4: Make the confirmed interview the Plan baseline

**Files:**

- Modify: `apps/workbench/lib/golden-path/plan-alternatives.ts`
- Modify: `apps/workbench/lib/golden-path/plan-alternatives.test.ts`

**Consumes:** Task 3's confirmed baseline `RequirementSpecV1` and the existing
deterministic `planComposition` function.

**Produces:** One `baseline` alternative plus zero to two supported
single-answer comparison alternatives, each derived from the user's actual
answers and not from a separate fixed framing session.

**Interfaces:**

```ts
export type PlanAlternativeKey = "baseline" | "stricter" | "lighter";

export interface PlanAlternative {
  readonly key: PlanAlternativeKey;
  readonly answerDelta: readonly {
    readonly key: InterviewQuestionKey;
    readonly from: string;
    readonly to: string;
  }[];
  readonly requirement: RequirementSpecV1;
  readonly plan: CompositionPlanV1;
}
```

- [ ] **Step 1: Write focused failing baseline and delta tests**

```ts
it("uses the user's confirmed answer as the baseline alternative", () => {
  const result = planExpenseApprovalAlternatives(
    confirmedThreshold5000Session(),
  );
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  const baseline = result.alternatives.find(
    (alternative) => alternative.key === "baseline",
  )!;
  expect(baseline.requirement.constraints[0]?.statement).toContain("5000");
  expect(baseline.answerDelta).toEqual([]);
});

it("changes only the declared answer in a comparison alternative", () => {
  const result = planExpenseApprovalAlternatives(
    confirmedThreshold1000Session(),
  );
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  for (const alternative of result.alternatives.filter(
    (item) => item.key !== "baseline",
  )) {
    expect(alternative.answerDelta).toHaveLength(1);
  }
});
```

- [ ] **Step 2: Run focused plan tests and confirm RED**

Run: `pnpm --filter @factory/workbench test -- plan-alternatives.test.ts`

Expected: FAIL because current alternatives are fixed `standard`, `strict`,
and `light` sessions independent of the completed interview.

- [ ] **Step 3: Implement baseline-first alternatives**

Build the first alternative directly from `buildRequirementSpec(session)` and
the existing planning base. Generate `stricter` and `lighter` only when one
catalogue-declared, supported answer can change without changing another user
answer. Rebuild the RequirementSpec from that one-answer mutation, plan it,
and surface its exact delta, affected Graph symbols, compatibility, risks,
acceptance scenarios, and known limitations. Omit an invalid, unsupported, or
planner-clarification comparison rather than guessing.

- [ ] **Step 4: Run focused plan tests and confirm GREEN**

Run: `pnpm --filter @factory/workbench test -- plan-alternatives.test.ts`

Expected: PASS for actual-answer propagation, single-delta isolation,
determinism, compatible locks, and safe comparison omission.

## Task 5: Integrate the interview slice into the Golden Path delivery train

**Files:**

- Modify: `docs/superpowers/plans/2026-08-08-base44-inspired-golden-path.md`
- Modify: `docs/superpowers/ledgers/2026-08-08-base44-inspired-golden-path.md`
- Test: `apps/workbench/lib/golden-path/discuss-model.test.ts`
- Test: `apps/workbench/lib/golden-path/plan-alternatives.test.ts`

**Consumes:** Tasks 1-4 and the existing S1/S2 evidence.

**Produces:** A recorded S1A delivery gate before S2 acceptance, with current
evidence and remaining UI wiring stated accurately.

- [ ] **Step 1: Write a failing delivery-order assertion**

Add a narrow document or model test that asserts a confirmed interview is
required before Plan alternatives are returned. Do not advance the PM ledger
state in a test.

- [ ] **Step 2: Run the test and confirm RED**

Run: `pnpm --filter @factory/workbench test -- discuss-model.test.ts -- plan-alternatives.test.ts`

Expected: FAIL until the baseline-first plan gate from Task 4 exists.

- [ ] **Step 3: Record the hand-off after implementation evidence exists**

Add S1A as `ready_for_qa` only after Tasks 1-4 pass. The PM records exact
commands, commit identifiers, reviewer results, residual limitations, and the
fact that Workbench mode-shell wiring remains owned by S7. Do not mark S1,
S1A, or S2 accepted without fresh QA and release evidence.

- [ ] **Step 4: Run the proportional regression set and confirm GREEN**

Run:

```powershell
pnpm --filter @factory/graph test -- requirement-spec.test.ts
pnpm --filter @factory/workbench test -- discuss-model.test.ts plan-alternatives.test.ts graph-diff-visual.test.ts build-model.test.ts
pnpm --filter @factory/workbench typecheck
pnpm --filter @factory/capabilities test
pnpm --filter @factory/control-plane test
pnpm --filter @factory/compiler-worker test
pnpm --filter @factory/workbench lint
git diff --check
```

Expected: all commands pass. Any stale baseline checksum, unsupported answer,
unconfirmed summary, raw-material leak, or fixed-framing regression blocks the
slice.

## Self-Review

- Spec coverage: Tasks 1-3 implement the bounded decision graph, one-question
  flow, recommendations, deferrals, explicit limitations, and structured
  RequirementSpec mapping. Task 4 repairs baseline semantics. Task 5 records
  sequencing and verification evidence.
- Boundaries: No task installs an external dependency, copies third-party
  source, permits AI authority, changes the Application Graph lifecycle, or
  adds a cross-profile interview abstraction.
- Type consistency: `InterviewQuestionKey`, `DiscussSession`,
  `RequirementBuildResult`, and `PlanAlternativeKey` are defined before their
  consumers and use the same names in every task.
