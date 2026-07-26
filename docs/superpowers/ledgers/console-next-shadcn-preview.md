# Console Next shadcn preview ledger

**PM-owned state machine:** `planned -> implementing -> ready_for_qa -> reviewed -> accepted`

The Controller exercises founder-delegated PM authority. Only the active task's
single named writer may modify production paths.

## Programme state

| Field | Value |
| --- | --- |
| State | accepted |
| Scope | A shadcn-derived, local Console Next preview for Factory Pilot. |
| Approved design | `docs/superpowers/specs/2026-07-26-console-next-shadcn-design.md` — approved by the founder on 2026-07-26. |
| Approved ADR | ADR-005, limited to source intake and Console Next preview; no generated application v2 selection or promotion. |
| Source authorization | The founder authorized the one-time, exact-SHA public source acquisition and local vendoring required by the approved design. |
| Source baseline | Root source baseline `d14b41dec8dd5009e1c7393e76b540ec7522a71b`; current remote-tracked branch is `main`. |
| Contract status | Factory API, Stage 1 component contracts, generated locks, roles, and Compose topology are frozen. |
| Rollback | `apps/web` stays runnable, unchanged, and is the rollback console. |

## Acceptance gates

1. The only vendored upstream source is the exact ADR-005 commit with its MIT
   notice, candidate index, source digests, and selected primitive closure.
2. Console Next has an exact lockfile and uses local primitive copies only.
3. Console Next preserves `127.0.0.1:5173`, the Factory capability header,
   all four workflow stages, retry/stop/artifact behavior, and bounded output.
4. Browser E2E and accessibility checks pass; static `apps/web` still passes
   syntax/rollback smoke.
5. No P0/P1 review finding, runtime source download, generated-app package
   change, raw brief/evidence leak, credential leak, or contract mutation.

## Tasks

| ID | Task | Owner | State | Allowed write paths | Completion gate |
| --- | --- | --- | --- | --- | --- |
| CNP-01 | Intake verifier and fixed source snapshot | Integration | accepted | `tools/console_next_intake.py`; `tests/api/test_console_next_intake.py`; `packages/vendor/shadcn-ui/**` | Accepted after focused 8/8 hostile tests and independent re-review with no P0/P1/P2. |
| CNP-02/03 | Locked Console Next vertical slice: local primitives, workflow parity, and browser E2E | Frontend | accepted | `apps/console-next/**`; `tests/web/console-next-e2e.mjs`; `tests/web/fixture-control-plane.mjs`; smallest export-only change to `tests/web/workspace-e2e.mjs`; complete lockfile capture in the vendor closure; source-intake tests for fail-closed preflight | Accepted after fixed-digest lifecycle preflight, structured editor/artifact E2E, and source-containment review. |
| CNP-04 | Accessibility, QA, review, and acceptance | QA / Reviewer / PM | accepted | `tests/web/console-next-accessibility.mjs`; `THIRD_PARTY_NOTICES.md`; ledger/status after hand-off | Accepted after final independent GO review and five consecutive accessibility passes with loopback cleanup. |

## Stop rules

- An intake failure, changed source commit, missing notice, unpinned closure,
  source policy violation, or attempt to alter frozen contracts stops the
  writer and returns to the Controller.
- Console Next must not be used by generated applications or choose component
  packages. Promotion remains outside this programme.
- A hand-off reports changed paths, exact commands, RED/GREEN evidence,
  residual risks, and an assertion that no secret/raw source archive/raw
  evidence entered browser or generated output.

## Acceptance evidence and residual risk

- Final release review: GO with no P0/P1/P2 findings after the focus-restoration
  repair.
- Final QA: five serial accessibility passes; preflight, production build,
  source closure, full loopback workflow including artifact download and stop,
  intake hostile tests, static rollback syntax, and final port cleanup all
  passed.
- `npm audit --omit=dev --json` still reports three high-severity advisories
  through the exact locked Next.js dependency tree (`next`, `postcss`, and
  `sharp`). There is no compatible automatic fix for the approved Next 15
  profile. This is a recorded preview-only P2: it blocks production or Golden
  promotion until a separate dependency-security ADR and remediation slice are
  accepted.
