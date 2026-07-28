# Task Ledger: Console UI 1.3 Compact Lineage and Command Accessibility

- **State:** accepted
- **Owner:** pm
- **Single write owner:** `/root/console_visual_audit` (frontend)
- **Specialization:** frontend
- **Contract owner:** integration
- **Contract status:** frozen
- **Contract artifact:** `docs/contracts/factory-ui-console-v1.3.md`
- **Approved ADR:** `docs/adr/016-factory-ui-visual-convergence-and-generated-icon-actions.md`
- **Plan:** `docs/superpowers/plans/2026-07-28-console-ui-1-3-compact-lineage-command.md`
- **Allowed write paths:**

  ```text
  packages/ui-kit/factory-ui-console/1.3.0/**
  apps/console-next/components/factory-ui/**
  apps/console-next/components/console-workspace.tsx
  apps/console-next/app/globals.css
  apps/console-next/tsconfig.json (only after an owned harness exits, and only
  to normalize `include` exactly to `next-env.d.ts`, `**/*.ts`, `**/*.tsx`,
  and `.next/types/**/*.ts`)
  tools/factory_ui_kit.py
  tests/api/test_factory_ui_kit.py
  tests/api/test_console_ui_sources.py
  tests/web/console-next-e2e.mjs
  tests/web/console-next-accessibility.mjs
  docs/contracts/factory-ui-console-v1.3.md
  docs/superpowers/ledgers/console-ui-1-3-compact-lineage-command.md
  docs/superpowers/plans/2026-07-28-console-ui-1-3-compact-lineage-command.md
  ```

## Outcome

Produce a distinct immutable Console UI successor that makes Lineage a compact
bottom-right work window and makes Command keyboard-correct, without changing
the established Products/Evidence/Stop layout matrix or any Factory runtime
contract.

## Acceptance criteria

1. Exact `factory-ui-console@1.3.0` canonical/copy identity verifies and
   cannot collide with generated `factory-ui@1.3.0`.
2. Compact Lineage is bottom-right, bounded, maximizable, focus-contained, and
   usable without clipping at 390, 560, 768, 900, and desktop widths.
3. Products stays left, Evidence stays right, and Command/Stop stay centered.
4. Command exposes an accessible combobox/listbox/active-descendant sequence.
5. Source, accessibility, browser, preflight/build, and independent review
   evidence have no unresolved P0/P1.

## Stop rules

Stop for a dependency/API/state/route change, an existing identity mutation,
generated asset touch, or any regression of the overlay matrix.

## PM decision

- **2026-07-28:** ADR-016 is accepted and this ledger records the frozen
  Console contract. Founder-delegated Controller authorizes the independent,
  serialized Console line to begin. `/root/console_visual_audit` is the sole
  frontend writer within the listed paths; generated UI paths remain excluded.
- **2026-07-28:** The founder-delegated Controller authorizes `/root` to
  remove only temporary `.next-*` type paths injected by the isolated owned
  production-build harness. This restores the tracked TypeScript include
  boundary and does not change Console source, generated assets, or contracts.

## Implementation evidence (writer; no state transition)

- **2026-07-28:** Implemented Tasks 1–3 only. Created the distinct
  `factory-ui-console@1.3.0` canonical asset and synchronized the live Console
  copy to its inventory-locked CSS, tokens, and React primitives. Historical
  `factory-ui@1.2.0` verification now uses an isolated rollback copy; generated
  `factory-ui@1.3.0` is rejected when the Console namespace is required.
- **RED evidence:**
  - `py -3.12 -m unittest tests.api.test_factory_ui_kit.FactoryUiKitTests.test_console_successor_uses_its_own_immutable_identity tests.api.test_factory_ui_kit.FactoryUiKitTests.test_generated_ui_canonical_cannot_satisfy_console_successor_identity tests.api.test_factory_ui_kit.FactoryUiKitTests.test_console_successor_copy_drift_fails_closed -v` failed with `TypeError: verify_factory_ui_kit() got an unexpected keyword argument 'expected_key'` before the successor verifier existed.
  - `node tests/web/console-next-e2e.mjs` failed with `compact Lineage must be a bounded bottom-right work window rather than a tall side sheet` before compact geometry was added.
  - `py -3.12 -m unittest tests.api.test_console_ui_sources.ConsoleUiSourcesTests.test_console_command_search_exposes_combobox_active_descendant_semantics -v` failed because `role="combobox"` was absent.
- **GREEN evidence:**
  - `py -3.12 -m unittest tests.api.test_factory_ui_kit tests.api.test_console_ui_sources -v` — 27 tests passed.
  - `node tests/web/console-next-e2e.mjs` — `console-next workflow: PASS`; verifies the overlay matrix, compact Lineage at desktop/390/560/768/900 widths, maximize/restore, and focus restoration.
  - `node tests/web/console-next-accessibility.mjs` — `console-next accessibility and runtime containment: PASS`; verifies combobox active-descendant behavior after ArrowDown plus focus containment.
  - `npm --prefix apps/console-next run preflight` — `console-next preflight: PASS`.
  - `git diff --check` — completed successfully; Git emitted only the pre-existing CRLF normalization warning for `apps/console-next/tsconfig.json`.
- **Residual risks:** The independent task review, QA, full `npm` preflight/build,
  and release review are still required before any PM state change. No package
  promotion, generated asset change, API change, dependency change, or ledger
  state transition was made by this writer.

## Review repair evidence (writer; no state transition)

- **2026-07-28:** Resolved the task-review P1/P2 findings only.
  - **P1:** Compact Lineage now uses `height: min(396px, calc(50vh - 1px))`;
    its compact graph grid no longer forces a 330px canvas minimum. The
    1280×700 browser regression proves the bottom-right window is strictly
    below half-height while maximize remains a separate path.
  - **P2:** Command `aria-expanded` now reflects `commandOpen`, not the
    number of matches. The zero-results browser regression proves the visible
    listbox remains expanded and `aria-activedescendant` is absent.
- **RED evidence:**
  - `node tests/web/console-next-e2e.mjs` failed with `compact Lineage must remain below half-height while bottom-right anchored at 1280x700` before the compact-height repair.
  - `node tests/web/console-next-accessibility.mjs` failed because the visible
    zero-results popup reported `aria-expanded="false"` before the combobox repair.
- **GREEN evidence:**
  - `py -3.12 -m unittest tests.api.test_factory_ui_kit tests.api.test_console_ui_sources -v` — 27 tests passed.
  - `node tests/web/console-next-e2e.mjs` — `console-next workflow: PASS`.
  - `node tests/web/console-next-accessibility.mjs` — `console-next accessibility and runtime containment: PASS`.
  - `npm --prefix apps/console-next run preflight` — `console-next preflight: PASS`.
  - `git diff --check` — completed successfully; only the existing CRLF warning
    for `apps/console-next/tsconfig.json` was emitted.
- **Residual risks:** Independent task re-review, QA, build, and release review
  are still required. No ledger state, package promotion, generated asset,
  dependency, API, or contract was changed.

## PM reconciliation and acceptance

- **2026-07-28:** QA independently passed with no P0/P1 findings. It ran the
  27 focused source tests, Console browser workflow, accessibility suite, and
  preflight. The tests verify the layout matrix: Products is a left drawer;
  Evidence is a right drawer; Command and Stop are centered; Lineage is a
  bounded bottom-right floating work window.
- **2026-07-28:** The required `npm --prefix apps/console-next run build`
  passed after optimized compilation, type checking, and static-page
  generation. The isolated harness's transient TypeScript paths were removed
  under the recorded narrow authorization; `tsconfig.json` now has exactly its
  frozen four include entries. `git diff --check` has no errors (only Git's
  non-blocking CRLF advisory).
- **2026-07-28:** Independent release re-review passed with no remaining
  P0/P1. The PM advances the recorded sequence `implementing → ready_for_qa →
  reviewed → accepted`. No generated package promotion, generated application
  mutation, external dependency change, or runtime contract change is implied
  by this acceptance.
