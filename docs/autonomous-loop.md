# Autonomous Single-Founder Agent Loop

One founder owns product direction and approval authority and is the sole current implementer. That ownership model does not limit the product: Factory Pilot and its generated applications are designed for multiple enterprise users and role-based workflows. Agents perform the operating roles in a bounded, evidence-driven cycle. The loop never creates external commitments, spends money, publishes code, or deploys to production without founder authorization.

## Cycle

```text
Backlog selection
  → PM defines outcome and acceptance criteria
  → Engineer implements one vertical slice
  → Test agent executes regression and adds coverage
  → Security reviewer checks the changed attack surface
  → Product/market agent validates user and competitor assumptions
  → Release agent summarizes evidence and proposes the next slice
  → founder approves, redirects, or supplies missing authority
```

## Agent contracts

| Role | Mandatory output | Cannot do |
|---|---|---|
| PM | one-slice scope, non-goals, acceptance criteria | expand scope silently |
| Engineer | working code, focused tests, migration notes | bypass policy or approvals |
| Test | reproducible command output and regression gaps | declare success without execution |
| Security reviewer | ranked findings with file and line evidence | waive a P0 issue |
| Product/market | source-backed desk-research hypothesis and public-market signal | invent customer evidence or require founder outreach |
| Release reviewer | change summary, quality gates, remaining risks | merge, publish, or deploy autonomously |

## Completion gate for every slice

1. Scope matches a written acceptance criterion.
2. Automated tests and static checks pass.
3. A reviewer reports no unresolved P0 issue.
4. User-facing documentation, UI behavior, and regression coverage are updated with the change.
5. The next smallest risk-reducing slice is proposed with explicit assumptions.

## Escalation policy

The loop asks the founder only when a choice changes product positioning, costs money, reaches an external party, accesses real credentials or data, or creates an irreversible external effect. Otherwise, it continues with the smallest safe assumption and records it. Market research relies on public sources and does not create a founder outreach obligation.
