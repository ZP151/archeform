# Task Ledger: factory-ui-kit-1-1-console-sheet-extension

- **State:** accepted
- **Owner:** pm
- **Single write owner:** `/root` (integration)
- **Specialization:** integration
- **Contract owner:** integration
- **Contract status:** frozen
- **Contract artifact:** proposed `docs/contracts/factory-ui-kit-v1.1.md` (`factory-ui-kit/v1.1`)
- **Allowed write paths:** the single integration writer may change only `packages/ui-kit/factory-ui/1.1.0/**`, `apps/console-next/components/factory-ui/**`, `apps/console-next/tsconfig.json` solely to normalize its `include` list after harness execution to `['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts']`, `tools/factory_ui_kit.py`, `tools/console_next_intake.py`, `tests/api/test_factory_ui_kit.py`, `tests/api/test_console_ui_sources.py`, `tests/web/console-next-e2e.mjs`, `tests/web/console-next-accessibility.mjs`, `docs/contracts/factory-ui-kit-v1.1.md`, `docs/adr/013-factory-ui-1-1-console-successor.md`, this ledger, the paired plan, and `docs/project-status.md` on acceptance. The `tsconfig.json` authority excludes every compiler option, exclusion, path mapping, and source glob change.
- **Read-only parallel work:** Tech Lead ADR/contract proposal and read-only code/test mapping only. No implementation, generated-UI, Registry, Composer, or test writer may start.
- **ADR requirement:** required. Tech Lead must write proposed `docs/adr/013-factory-ui-1-1-console-successor.md`; Founder-delegated Controller must accept it before the v1.1 contract is frozen or implementation begins.
- **Plan:** `docs/superpowers/plans/2026-07-28-factory-ui-kit-1-1-console-sheet-extension.md`

## Outcome

Create a governed `factory-ui@1.1.0` canonical successor for the controlled
Console only. It adds explicit Sheet modal/overlay controls and deterministic
focus restoration while generated `ui.*@2.1.0` remains locked to immutable
canonical `factory-ui@1.0.0` CSS/tokens.

## Non-goals

- Change any `packages/ui-kit/factory-ui/1.0.0/**` artifact or manifest.
- Change `packages/components/ui.*/2.1.0/**`, their locks, canonical sidecars,
  generated output, Registry/trust records, Composer behavior, or selection.
- Add a dependency, framework, API/data contract, deployment topology, external
  source, production credential, or real-model call.
- Promote `factory-ui@1.1.0` into generated application selection.

## Migration and rollback

1. Tech Lead proposes ADR-013 with exact 1.0.0 → 1.1.0 inventory/digest,
   compatibility, security/accessibility, migration, rollback, and verification
   details. Founder-delegated Controller acceptance is a prerequisite.
2. Integration creates a new canonical `packages/ui-kit/factory-ui/1.1.0/`
   directory from 1.0.0 and changes only the Console Sheet semantic surface.
   It copies the full controlled Console Factory UI distribution from 1.1.0 and
   updates the selected copy-verifier identity.
3. The verifier rejects any missing, altered, or version-mixed Console copy and
   proves every `ui.*@2.1.0` artifact remains on exact 1.0.0 CSS/token digests.
4. Rollback selects the verified 1.0 Console copy/verifier identity and removes
   only the unaccepted 1.1 Console distribution. It never rewrites 1.0.0,
   generated 2.1 locks, Registry evidence, or materialized output.

## Acceptance criteria

1. Accepted ADR-013 and frozen `factory-ui-kit/v1.1` define the Console-only
   Sheet props `modal?: boolean`, `overlay?: 'dim' | 'clear' | 'none'`,
   `effectiveModal = modal ?? side !== 'floating'`, and deterministic
   close/focus restoration. Legacy floating Sheets remain non-modal; only
   Console Lineage passes `modal` explicitly with `overlay="clear"`.
2. Canonical 1.1 has a complete manifest, inventory, CSS/token digests, React
   primitives, fixtures, tests, SPDX data, and verification evidence. The
   Console copy is exact; source-contract tests reject every copy drift.
3. The accepted CUI-01 overlay matrix remains intact. Floating Lineage uses an
   explicit modal/clear-overlay configuration, contains keyboard focus, and
   restores the opener after Escape and Close.
4. `ui.*@2.1.0` source, locks, sidecars, output, and selection contain no 1.1
   reference and remain tied to exact 1.0.0 CSS/token digests and marker.
5. Factory UI Kit and Console source-contract tests are current, including
   drift/mixed-version negatives; `python -m unittest discover -s tests/api -v`
   is green, as are Console preflight/build/E2E/accessibility, agent, syntax,
   and diff gates.
6. A temporary-copy rollback proof rejects a tampered Console 1.1 file or
   manifest, restores verified Console 1.0, and leaves generated 2.1 locks and
   output intact.

## Stop rules

- No implementation until ADR-013 is accepted and the v1.1 contract is frozen.
- A change to 1.0, generated 2.1, Registry policy, Composer behavior, or API/
  data contract stops the task and returns it to governance.
- Console-copy drift, generated 1.1 reference, unresolved P0/P1, or failed
  rollback proof blocks QA.

## Required verification gate

```powershell
py -3.12 -m unittest tests.api.test_factory_ui_kit -v
py -3.12 -m unittest tests.api.test_console_ui_sources -v
python -m unittest discover -s tests/api -v
npm --prefix apps/console-next run preflight
npm --prefix apps/console-next run build
node tests/web/console-next-e2e.mjs
node tests/web/console-next-accessibility.mjs
python -m unittest discover -s tests/agents -v
node --check apps/web/app.js
git diff --check
```

## Implementation evidence

- **GREEN (2026-07-28):** v1.1 marker regression and targeted tests passed;
  full API and agent suites, Console workflow/accessibility E2E, Console
  preflight and production build, JavaScript syntax, and `git diff --check`
  passed. E2E verified Products-left, Evidence-right, Command/Stop-center, and
  floating Lineage with its explicit modal/clear overlay and focus restoration.
- **Residual P2:** untracked, test-owned `.next-ui11-review` and
  `.next-ui11-release` output directories cannot be deleted in this
  policy-bound environment. They are not source changes and do not alter the
  accepted canonical/Console copy or generated-UI lock boundary.

## Task review

- Fresh task review found no P0/P1.

## QA

- Fresh QA found no P0/P1 and advanced the task from `ready_for_qa` to
  `reviewed` after the green gates above.

## Release review

- Independent release review passed with no P0/P1. The P2 untracked test-output
  note remains a policy-environment cleanup item only.

## PM decision

- **2026-07-28:** This successor is `planned`. CUI-01 remains accepted. No
  source writer is authorized until Tech Lead proposes ADR-013,
  Founder-delegated Controller accepts it, and integration records the frozen
  `factory-ui-kit/v1.1` contract.
- **2026-07-28:** Fresh targeted unit tests, Console workflow/accessibility
  E2E, full API and agent suites, JavaScript syntax, and `git diff --check`
  were reported green. The only remaining v1.1 implementation hygiene item is
  removal of harness-created `.next-test-*` entries from `tsconfig.json` after
  all harnesses stop. The task remains `implementing` until its exact stable
  include form is restored and the final diff gate is recorded; it may then move
  to `ready_for_qa` without a contract change.
- **2026-07-28:** After normalization and the recorded green gates, PM advanced
  v1.1 from `implementing` to `ready_for_qa`. QA/task review found no P0/P1, so
  PM advanced it to `reviewed`. Founder-delegated Controller accepted the
  independent release review with no P0/P1, so PM advanced it to `accepted`.
