# PM ledger — Honest Requirement-to-Product Closure

Goal authority: `docs/superpowers/plans/2026-08-09-honest-requirement-to-product-closure.md`.
Branch: `feat/governed-composition-capability-foundry`. Iteration states use
`planned -> implementing -> ready_for_qa -> reviewed -> accepted`.

## 2026-08-09 — Task 1: Reopen product closure and pin the honest acceptance boundary

State: `implementing` (Task 1 RED record landed).

- The prior Base44-inspired Golden Path S8 evidence is retained as **fixed
  Expense replay evidence**; P1 Product Closure is **reopened** because the
  replay does not prove requirement-to-product generation (see
  `docs/acceptance/requirement-to-product-closure.md`, status correction).
- `e2e/golden-path.spec.ts` no longer clicks
  `guided-template-expense-approval`. It now pins two prompt-driven scenarios
  from an empty workspace:
  - **Prompt A — Expense Approval**: free-form brief -> `Requirement summary`
    containing expense/manager/finance; no template selection.
  - **Prompt B — Appointment Booking**: free-form brief -> `Requirement
    summary` containing appointment/service; no Profile/template UI on the
    primary frame at any point.
- RED evidence (2026-08-09, compose stack `factory-pilot` up):
  `pnpm exec playwright test e2e/golden-path.spec.ts --list` lists both
  scenarios; the focused browser run reports **2 failed** — both tests time
  out at `getByLabel('Requirement brief')` (element not found) because the
  empty-workspace requirement composer does not exist yet.
- Commit: `test(product): reopen requirement-to-product closure` (TBD hash).
