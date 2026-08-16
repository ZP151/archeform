---
Date: 2026-08-08
Status: Proposed
Owner: Product Closure
Scope: Expense Approval Golden Path only
References:
  - docs/superpowers/specs/2026-08-08-base44-inspired-golden-path-design.md
  - docs/architecture/application-graph-platform.md
  - https://github.com/mattpocock/skills
---

# Adaptive Requirement Interview Design

## Outcome

Improve the precision of requirement intake for the Expense Approval Golden
Path without changing Factory Pilot's authority model:

```text
Discuss interview -> RequirementSpec -> Plan alternatives -> Graph Diff -> Draft
```

The interview helps a user who has an incomplete business request reach a
reviewable, testable requirement. It does not create, mutate, publish, or
compile an Application Graph.

## Context

The existing Expense Approval Discuss model asks four fixed questions. It
correctly blocks Plan until required answers exist, but it does not select the
next question from earlier answers, explain recommended choices, or use the
user's completed session as the baseline of Plan alternatives. The current
alternative builder checks that the session is plan-ready, then constructs
fixed `standard`, `strict`, and `light` framings independently of the user's
answers.

Base44's public planning flow supports separate discussion and planning before
building. The `grill-me` method contributes a complementary interaction
principle: resolve dependent decisions one at a time and provide a recommended
answer. Factory Pilot adopts those interaction principles only. No Base44 or
`mattpocock/skills` source, assets, prompts, schemas, or runtime dependencies
are copied or installed.

## Decision

Introduce a Factory-owned, deterministic **Adaptive Requirement Interview**
for the Expense Approval profile. It replaces the fixed four-question sequence
inside Discuss mode with a bounded decision graph.

Each question is a source-controlled record with:

- a stable key and plain-language question;
- an applicability predicate over previously structured answers;
- a `blocking` or `deferrable` planning policy;
- a typed answer set or bounded value rule;
- a recommended answer and a business-readable rationale;
- declared `RequirementSpecV1` effects; and
- declared Plan and acceptance-scenario impact summaries.

The selection engine chooses exactly one unanswered applicable question per
step. It orders questions by blocking policy, then dependency order, then
stable key. It never asks a question that is inapplicable, already answered,
or explicitly deferred where deferral is allowed.

## Initial Expense Approval Decision Graph

The first release is intentionally bounded to the current Expense Approval
capability portfolio.

| Key                   | Question                                                      | Policy     | Recommendation                                           | Why it matters                                                                                |
| --------------------- | ------------------------------------------------------------- | ---------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `outcome`             | What business outcome should expense approval improve?        | blocking   | Controlled employee expense review                       | Establishes the acceptance target before solution detail.                                     |
| `first-approver`      | Who may make the first decision?                              | blocking   | Manager                                                  | Determines policy role bindings and approval journey.                                         |
| `manager-threshold`   | What maximum amount may that role approve without escalation? | blocking   | 1000 currency units                                      | Determines approval constraint and escalation applicability.                                  |
| `audit-visibility`    | Must finance see every approval or rejection event?           | blocking   | Required                                                 | Determines audit acceptance evidence and role visibility.                                     |
| `escalation-policy`   | What happens above the manager threshold?                     | blocking   | No escalation                                            | Makes capability gaps explicit before planning.                                               |
| `submission-evidence` | Must a submission create an audit event?                      | deferrable | Required                                                 | Affects the expected workflow/audit scenario; a deferral remains visible as an open question. |
| `receipt-policy`      | Must an employee attach a receipt?                            | deferrable | Not in the first release                                 | Prevents falsely implying file capability support.                                            |
| `success-measure`     | What proves the workflow is useful?                           | blocking   | Submit, decision, finance audit, and denial journey pass | Produces an observable acceptance scenario rather than a vague success claim.                 |

The question catalogue must not advertise unsupported second-level approval,
receipt storage, external identity, payment, or production compliance as
available behavior. When an answer requests an unsupported capability, the
interview records a bounded limitation and routes the user to a compatible
answer or a blocked clarification; it does not invent a Graph change.

## Data Flow and Authority

```text
Factory-owned QuestionDefinitionV1 catalogue
  -> deterministic InterviewSessionV1
  -> schema-valid RequirementSpecV1
  -> deterministic CompositionPlanV1
  -> constrained Graph Diff against mutable Draft
```

`InterviewSessionV1` is transient Workbench state. It contains only structured
question keys, selected answer keys or bounded values, deferral state, and the
catalogue version. It is not an Application Graph, a Graph Diff, provider
output, or a source of runtime authority.

`RequirementSpecV1` remains the persisted requirement boundary. It receives
only the declared structured effects of answers, including explicit deferred
items in `openQuestions`. Raw user chat, AI prompt text, AI responses,
credentials, and free-form hidden reasoning are never persisted.

An optional AI adapter may suggest a bounded clarification candidate to the UI
in a later slice. It cannot alter the catalogue, mark a question answered,
choose a recommendation, create a RequirementSpec, select capability locks,
or apply a Graph Diff. The deterministic catalogue and mapper remain the test
and CI authority.

## Plan Alternative Semantics

The completed user interview creates the **baseline** `RequirementSpecV1` and
the primary Plan alternative. The system may present at most two comparison
alternatives:

- **Stricter**: one declared, supported change from the baseline; and
- **Lighter**: one declared, supported change from the baseline.

An alternative must display its exact answer delta, resulting requirement
delta, capability-lock delta, affected Graph symbols, acceptance-scenario
delta, known limitations, and compatibility status. It cannot override any
unrelated user answer. If a supported comparison cannot be produced, it is
omitted rather than substituted with a fixed framing.

## User Experience

Discuss presents one question at a time with:

1. progress as answered applicable questions over known applicable questions;
2. the recommended answer preselected but requiring explicit confirmation;
3. a concise rationale and visible downstream impact;
4. a safe deferral action only for deferrable questions; and
5. an accessible back action that preserves previous structured answers.

The UI shows a short Requirement Summary before Plan. The user must explicitly
confirm that summary. The confirmation permits plan generation but does not
publish, mutate a Draft, or start compilation.

## Failure and Safety Rules

- An unknown question, unknown answer, duplicate answer, malformed catalogue,
  cycle, missing dependency, or impossible applicability state fails closed.
- A deferred blocking question blocks Plan and is reported by stable question
  key.
- A deferred deferrable question becomes a visible `RequirementSpecV1`
  `openQuestion`; it may not silently become a default.
- A stale or catalogue-version-mismatched session cannot generate a plan until
  it is migrated by a deterministic, tested migration or restarted.
- A requirement answer cannot introduce arbitrary URLs, package references,
  source code, credentials, executable actions, or unconstrained Graph paths.
- Only the existing accepted, checksum-bound CompositionPlan and Draft-only
  Graph Diff paths can advance after Discuss.

## Verification

Focused tests must prove:

1. question order is deterministic and one question is returned at a time;
2. applicability, dependencies, deferral, recommendation confirmation, and
   unknown-input rejection are correct;
3. the same completed session produces the same RequirementSpec checksum;
4. user answers form the primary Plan baseline and comparison alternatives
   change only their declared answer delta;
5. unsupported escalation or receipt answers are surfaced as limitations or
   blocked clarifications, never invented capability locks;
6. Discuss exports no Graph/Draft mutation surface and does not persist raw
   prompt or response material; and
7. the existing Expense Approval Plan, Graph Diff, Draft-only, browser, and
   compiler regressions remain green.

## Non-goals

- Restaurant Ordering, Simple Ecommerce, and cross-profile interview reuse.
- Free-form or indefinite AI interviewing.
- Persisting a conversation transcript.
- Automatic Graph edits, publishing, compilation, deployment, or capability
  admission.
- New external packages, copied third-party source, or Base44 integration.

## Success Measures

The slice reports only aggregated, non-sensitive measures:

- percentage of sessions that reach a confirmed Requirement Summary;
- percentage of Plan requests that return a planner clarification;
- baseline Plan acceptance rate;
- rate of accepted-plan return to Discuss before applying a Draft Diff; and
- median question count and time to confirmed summary.

These measures are product-evaluation inputs, not gates for changing the
Graph, plan, or runtime authority.
