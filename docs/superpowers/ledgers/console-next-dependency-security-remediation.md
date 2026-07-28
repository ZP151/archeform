# Console Next Dependency-Security Remediation Ledger

**PM-owned state machine:** `planned -> implementing -> ready_for_qa -> reviewed -> accepted`

## Programme state

| Field | Value |
| --- | --- |
| State | accepted |
| Outcome | A reproducible Console dependency closure with no high or critical production audit findings. |
| Non-goals | Next major migration, generated-application dependencies, Factory API contracts, component contracts, cloud deployment, model calls. |
| Approved ADR | `docs/adr/011-console-next-dependency-security-remediation.md` (accepted 2026-07-27) |
| Plan | `docs/superpowers/plans/2026-07-27-console-next-dependency-security-remediation.md` |
| Contract owner/status | integration / frozen (existing Console local-proxy contract is unchanged) |
| Single production write owner | integration |
| Allowed paths | `apps/console-next/package.json`, `apps/console-next/package-lock.json`, `tools/console_next_intake.py`, `packages/vendor/shadcn-ui/7774cd7dcee1e98d0815aa6e829f33a7fc952fdf/console-next-closure.json`, focused intake and Console tests, this ledger. |
| Abort rule | Any remaining high/critical production advisory, closure mismatch, integrity/license gap, Console build failure, browser regression, or P0/P1 review finding keeps the Console quarantined. |

## Acceptance criteria

- `capture-console-next` deterministically derives the canonical closure from the pinned snapshot and lockfile.
- `package.json` has only exact `postcss@8.5.23` and `sharp@0.35.3` overrides; the lockfile is regenerated, never hand-edited.
- The closure captures the new lockfile digest, package integrity values, and package versions.
- Production npm audit has zero high and zero critical advisories.
- Intake, build, Console E2E, accessibility, API, Executor, generated-product E2E, and diff checks pass.

## Tasks

| ID | Task | Specialization | State | Evidence |
| --- | --- | --- | --- | --- |
| DSR-01 | Add deterministic closure-capture command and test | integration | accepted | RED/GREEN focused intake tests; closure capture is canonical and deterministic |
| DSR-02 | Apply exact overrides and regenerate closure | integration | accepted | Exact `postcss@8.5.23` and `sharp@0.35.3` overrides, regenerated lockfile and closure |
| DSR-03 | Execute security and cross-product verification | integration | accepted | Fresh audit has 0 high/critical; Console build/E2E/accessibility, API 168/168, Executor 26/26, agent 4/4, generated-product browser E2E, and diff checks passed |

## Evidence log

- 2026-07-27: ADR-011 accepted by the founder-delegated controller. Baseline audit reported three high advisories through `postcss@8.4.31` and `sharp@0.34.5`; this is a remediation trigger, not a promotion approval.
- 2026-07-27: DSR-01 through DSR-03 accepted. `npm audit --omit=dev --json` reported 0 high and 0 critical production vulnerabilities after the approved exact overrides. The closure, preflight, build, browser, API, Executor, and generated-product verification gates passed.
