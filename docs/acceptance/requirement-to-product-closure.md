# Honest Requirement-to-Product Closure — acceptance record

Status: **REOPENED — pending**. Authority:
`docs/superpowers/plans/2026-08-09-honest-requirement-to-product-closure.md`.
Ledger: `docs/superpowers/ledgers/2026-08-09-honest-requirement-to-product-closure.md`.

## Status correction (2026-08-09)

The 2026-08-09 `GOAL_COMPLETE` report for the Base44-inspired Golden Path
proves a **fixed Expense Approval replay**: the browser journey selects the
`guided-template-expense-approval` starter, clicks fixed clarification
answers, accepts one of three canned Expense framings, and applies a
single-token/layout adjustment. It does not prove product closure: a blank or
non-Expense workspace cannot start the journey, and no free-form requirement
ever enters the system.

The prior S8 evidence (clean checkout, suites, E2E, docker-level cleanup
proof) is **retained as fixed Expense replay evidence** only, and the P1
Product Closure gate is **reopened** by the 2026-08-09 honest
requirement-to-product closure plan.

## Pending scenarios

Each scenario starts from an **empty workspace** and a **free-form
requirement**. No Profile, starter, template, or canned framing may be
selected at any point of the journey.

### Scenario A — Expense Approval

```text
Build an expense approval application. Employees submit expenses with
amount, category, date, receipt, and notes. Managers approve or reject them,
and finance can audit all decisions.
```

### Scenario B — Appointment Booking

```text
Build an appointment booking application. Customers choose a service and an
available time, staff confirm or reschedule appointments, and administrators
manage services, schedules, and cancellations.
```

## Acceptance criteria (both scenarios)

1. The Graph, pages, routes, roles, permissions, workflows, navigation, seed
   scenarios, and role journeys derived from the two prompts **differ
   materially** — distinct entities, fields, pages, and flows, proven by
   distinct Published Graph hashes and material-difference assertions.
2. Both products are **editable in Page Studio** (multi-page, route-aware,
   responsive preview) and edits survive Publish and compilation.
3. Both products complete the full lifecycle: Publish -> immutable
   Compilation -> isolated verification -> independent boot -> role journeys
   with authorization denial -> runnable preview -> clean removal of
   containers, networks, volumes, and artifact directories.
4. Final local acceptance runs both prompts through the **real OpenAI
   interpreter** using only the local environment key. Only parsed schemas
   and safe evidence are persisted; raw briefs as provider prompts, raw
   provider responses, and credentials are never persisted or reported.
5. Clean-checkout acceptance from a frozen lockfile and a fresh Compose
   stack.
6. Automated axe-class accessibility on both generated applications; light
   theme default, dark theme functional.
7. Action inventory verified: no visible inert control, placeholder menu,
   unrelated inspector, or decorative disabled button remains.

## Evidence ledger

- **2026-08-09 — Task 1 (boundary reopened, RED):** the E2E setup that
  clicked `guided-template-expense-approval` was replaced with two
  prompt-driven scenarios (Prompt A Expense Approval, Prompt B Appointment
  Booking) that start from an empty workspace, enter the free-form brief,
  and expect a Requirement Summary without any Profile/template selection.
  `pnpm exec playwright test e2e/golden-path.spec.ts --list` lists both
  scenarios; the focused browser run is **RED — 2 failed**, both timing out
  at `getByLabel("Requirement brief")` (element not found) because the
  empty-workspace requirement composer does not exist yet. Commit: TBD.
- **2026-08-09 — Task 8 (fixture-mode journeys GREEN; real-model runs
  pending):** both prompt scenarios now drive the full release pipeline in
  the Compose stack — free-form brief -> interpretation -> review ->
  alternatives -> plan apply -> Draft -> Page Studio edit -> Publish
  (immutable revision, `sha256:` graph hash) -> Compilation -> graph-derived
  isolated verification (role journeys + idempotency + `-denied-`
  authorization denial) -> preview boot (`main.generated-app`) -> Stop and
  clean up (containers, networks, volumes, `/artifacts/.preview-runs`
  removed). Run 11: 2 passed (5.4m, serial), genuine double-green — Prompt A
  graph `cmsljhbj80002qh4t7h7bom68`, Prompt B `cmsljjmbb0026qh4t3jyspf2j`,
  materially different published hashes
  (sha256:8c4f4011… vs sha256:f595e9b8…), verifications succeeded (worker
  jobs 16/17), evidence 10/10 and 14/14 steps with 0 failed, preview
  cleanup proven. The interpreter used the `FACTORY_FIXTURE_MODE=1`
  development lever; acceptance criterion 4 (real OpenAI provider from the
  local environment key, no lever) remains open as Task 9, along with
  criteria 5-7 (clean-checkout acceptance, axe accessibility + themes,
  action inventory). Detailed per-run record including the run-9 false-green
  and run-10 failed-verification root causes: ledger Task 8 section.
