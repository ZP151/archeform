import { assertRequirementSpec, type RequirementSpecV1 } from "@factory/graph";

/**
 * Bounded Discuss state machine over the RequirementSpecV1 contract.
 *
 * Discuss clarifies the outcome, actors, constraints, unresolved questions,
 * and acceptance scenarios. It never mutates a Draft: the module exports no
 * Graph model and no Draft operation — the only output is a schema-valid
 * RequirementSpecV1, produced only when every *required* clarification is
 * answered. Unresolved required questions block Plan (fail-closed).
 */

export interface ClarificationQuestion {
  readonly key: string;
  readonly required: boolean;
  readonly question: string;
  readonly options: readonly string[];
}

/** Deterministic clarification set for the Expense Approval outcome. */
export const EXPENSE_APPROVAL_CLARIFICATIONS: readonly ClarificationQuestion[] =
  [
    {
      key: "approval-threshold",
      required: true,
      question:
        "What is the highest expense amount a manager may approve without escalation?",
      options: ["500", "1000", "5000"],
    },
    {
      key: "manager-role",
      required: true,
      question: "Which role is the first approver of a submitted expense?",
      options: ["manager"],
    },
    {
      key: "audit-trail",
      required: true,
      question:
        "Must every approval transition record an audit event visible to finance?",
      options: ["audit-required", "audit-optional"],
    },
    {
      key: "multi-level-approval",
      required: false,
      question:
        "Must expenses above the manager threshold escalate to a second approval level?",
      options: ["no-escalation", "finance-escalation"],
    },
  ];

export type ClarificationKey =
  (typeof EXPENSE_APPROVAL_CLARIFICATIONS)[number]["key"];

export interface ClarificationAnswer {
  readonly key: ClarificationKey;
  readonly answer: string;
  readonly deferred: boolean;
}

export interface DiscussSession {
  readonly mode: "discuss";
  readonly answers: readonly ClarificationAnswer[];
}

export type RequirementBuildResult =
  | { readonly ok: true; readonly spec: RequirementSpecV1 }
  | {
      readonly ok: false;
      readonly reason: "unresolved-required-questions";
      readonly unresolved: readonly ClarificationKey[];
    };

export function clarificationQuestions(): readonly ClarificationQuestion[] {
  return EXPENSE_APPROVAL_CLARIFICATIONS;
}

export function startExpenseApprovalDiscuss(): DiscussSession {
  return { mode: "discuss", answers: [] };
}

function clarificationByKey(key: string): ClarificationQuestion {
  const question = EXPENSE_APPROVAL_CLARIFICATIONS.find((q) => q.key === key);
  if (question === undefined) {
    throw new Error(`Unknown clarification question '${key}'.`);
  }
  return question;
}

export function answerClarification(
  session: DiscussSession,
  key: ClarificationKey,
  answer: string,
): DiscussSession {
  const question = clarificationByKey(key);
  if (!question.options.includes(answer)) {
    throw new Error(`'${answer}' is not a valid answer for '${key}'.`);
  }
  return {
    mode: "discuss",
    answers: [
      ...session.answers.filter((a) => a.key !== key),
      { key, answer, deferred: false },
    ],
  };
}

export function deferClarification(
  session: DiscussSession,
  key: ClarificationKey,
): DiscussSession {
  clarificationByKey(key);
  return {
    mode: "discuss",
    answers: [
      ...session.answers.filter((a) => a.key !== key),
      { key, answer: "", deferred: true },
    ],
  };
}

export function canPlan(session: DiscussSession): boolean {
  return unresolvedRequired(session).length === 0;
}

function unresolvedRequired(
  session: DiscussSession,
): readonly ClarificationKey[] {
  return EXPENSE_APPROVAL_CLARIFICATIONS.filter(
    (q) => q.required && !answered(session, q.key),
  ).map((q) => q.key as ClarificationKey);
}

function answered(session: DiscussSession, key: ClarificationKey): boolean {
  const entry = session.answers.find((a) => a.key === key);
  return entry !== undefined && !entry.deferred;
}

function answerValue(session: DiscussSession, key: ClarificationKey): string {
  const entry = session.answers.find((a) => a.key === key);
  return entry === undefined || entry.deferred ? "" : entry.answer;
}

export function buildRequirementSpec(
  session: DiscussSession,
): RequirementBuildResult {
  const unresolved = unresolvedRequired(session);
  if (unresolved.length > 0) {
    return { ok: false, reason: "unresolved-required-questions", unresolved };
  }
  return {
    ok: true,
    spec: assertRequirementSpec(expenseApprovalSpec(session)),
  };
}

function expenseApprovalSpec(session: DiscussSession): RequirementSpecV1 {
  const threshold = answerValue(session, "approval-threshold");
  const auditTrail = answerValue(session, "audit-trail");
  const escalation = answerValue(session, "multi-level-approval");
  const openQuestions = EXPENSE_APPROVAL_CLARIFICATIONS.map((q) => {
    const entry = session.answers.find((a) => a.key === q.key);
    const answer =
      entry === undefined || entry.deferred ? undefined : entry.answer;
    return answer === undefined
      ? { question: q.question }
      : { question: q.question, answer };
  });
  const constraints: RequirementSpecV1["constraints"] = [
    {
      key: "approval-threshold",
      kind: "cost",
      statement: `Expenses up to ${threshold} currency units may be approved by a manager alone.`,
    },
  ];
  if (auditTrail === "audit-required") {
    constraints.push({
      key: "audit-trail",
      kind: "compliance",
      statement:
        "Every approval transition records an audit event visible to finance.",
    });
  }
  if (escalation === "finance-escalation") {
    constraints.push({
      key: "escalation",
      kind: "compliance",
      statement:
        "Expenses above the manager threshold escalate to finance for a second approval.",
    });
  }
  return {
    apiVersion: "factory.requirement-spec/v1",
    requirementId: "expense-approval",
    outcome:
      "Expense Approval — employees submit expense records with amount and description; managers approve or reject submitted expenses; finance audits the approval trail.",
    actors: [
      {
        key: "employee",
        label: "Employee",
        description: "Submits expense records.",
      },
      {
        key: "manager",
        label: "Manager",
        description: "Approves or rejects submitted expenses.",
      },
      {
        key: "finance",
        label: "Finance",
        description: "Audits the expense approval trail.",
      },
    ],
    domainConcepts: [
      {
        key: "expense",
        label: "Expense",
        description:
          "A submitted expense record with amount, description, and status.",
      },
      {
        key: "expense-principal",
        label: "Expense principal",
        description: "The identity that owns expense records.",
      },
      {
        key: "expense-session",
        label: "Expense session",
        description: "The submitter session that records expenses.",
      },
    ],
    workflows: [
      {
        key: "expense-review",
        label: "Expense review",
        description: "Draft, submit, approve, or reject an expense.",
      },
    ],
    constraints,
    openQuestions,
    acceptanceScenarios: [
      {
        key: "employee-submit",
        given:
          "an employee with a draft expense record under the approval threshold",
        when: "the employee submits the expense",
        then: "the record enters the review workflow awaiting manager action",
      },
      {
        key: "manager-approve",
        given: "a submitted expense within the manager threshold",
        when: "the manager approves it",
        then: "the record is approved and the approval is recorded in the audit trail",
      },
      {
        key: "manager-reject",
        given: "a submitted expense",
        when: "the manager rejects it",
        then: "the record is rejected and the employee sees the outcome",
      },
      {
        key: "unauthorized-approve-denied",
        given: "an employee role",
        when: "the employee attempts to approve an expense",
        then: "the action is denied by policy and the denial is recorded",
      },
      {
        key: "finance-audit",
        given: "an approved expense",
        when: "finance audits it",
        then: "the audit event is recorded and visible to finance",
      },
    ],
  };
}

/**
 * Deterministic starter session for the whole journey, reproducible without
 * AI: threshold 1000, manager first approver, audit required, no escalation.
 */
export function expenseApprovalRequirementStarter(): DiscussSession {
  return answerClarification(
    answerClarification(
      answerClarification(
        answerClarification(
          startExpenseApprovalDiscuss(),
          "approval-threshold",
          "1000",
        ),
        "manager-role",
        "manager",
      ),
      "audit-trail",
      "audit-required",
    ),
    "multi-level-approval",
    "no-escalation",
  );
}

export function expenseApprovalRequirementStarterSpec(): RequirementSpecV1 {
  const built = buildRequirementSpec(expenseApprovalRequirementStarter());
  if (!built.ok) {
    throw new Error("Starter requirement must be plan-ready.");
  }
  return built.spec;
}
