# Task Ledger: CUI-03 Brief-context CSS Hygiene

- **State:** accepted
- **Owner:** pm
- **Single write owner:** `/root` (integration)
- **Specialization:** integration
- **Contract owner:** integration
- **Contract status:** frozen; no contract change
- **Contract artifact:** `docs/contracts/factory-ui-kit-v1.2.md` (`factory-ui-kit/v1.2`)
- **Allowed write paths:** `apps/console-next/app/globals.css`, `tests/api/test_console_ui_sources.py`, and `apps/console-next/tsconfig.json` solely after the owned CUI-03 browser harness exits to normalize `include` to exactly `["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"]`; this ledger, `docs/superpowers/plans/2026-07-28-cui-03-brief-context-css-hygiene.md`, and `docs/project-status.md` on acceptance only. No other tsconfig field or path is authorized.
- **Read-only parallel work:** task review, QA, and release review after the writer hand-off only; no concurrent writer.
- **Approved ADR:** not required. This is a deletion-only CSS hygiene slice inside the frozen Console composition: it adds no dependency, framework, API/data contract, asset identity, Registry/Composer rule, or runtime topology.
- **Plan:** `docs/superpowers/plans/2026-07-28-cui-03-brief-context-css-hygiene.md`

## Outcome

Remove the dead CSS that styled CUI-02's eliminated Brief-context panel, while
preserving the live Brief composer, the accepted CUI-02 project/evidence
behavior, and the full Console overlay matrix.

## Non-goals

- Altering `console-workspace.tsx`, any lifecycle copy, visibility state,
  Sheet side, focus behavior, or layout behavior that is not a dead
  Brief-context selector.
- Changing `factory-ui-kit/v1.2`, canonical Factory UI assets, generated
  `ui.*@2.1.0` packages, locks, API/control-plane/Executor behavior, or
  dependencies.
- Removing live Brief composer selectors including `brief-workbench`,
  `brief-composer`, `brief-form`, `brief-name-row`, `brief-editor`,
  `brief-editor-footer`, or `brief-presets`.
- Reformatting unrelated CSS or deleting test-owned Next output directories.

## Acceptance criteria

1. `globals.css` contains none of the CSS selectors that have no matching
   rendered Console source: `.brief-context-panel`, `.brief-context-list`, or
   `.brief-context-foot`, including their dark and responsive variants.
2. The source regression explicitly fails if any of those selectors returns;
   it also establishes that the live Brief composer selectors remain present.
3. Existing Browser workflow and accessibility evidence continues to prove the
   accepted CUI-02 lifecycle, Products-left/Evidence-right/Command-and-
   Stop-center/Lineage-floating overlay matrix, keyboard focus behavior, and
   Brief-to-definition flow after the deletion.
4. Focused source tests, Console browser workflow/accessibility checks,
   preflight, isolated production build, JavaScript syntax, and diff gates
   pass with no unresolved P0/P1.

## Stop rules

- Stop and return to PM if the deletion requires a Console TSX change, a
  `factory-ui@1.2.0` change, an overlay/API/contract change, or any generated
  package update.
- A browser regression in the Brief, lifecycle, evidence, or any overlay
  direction/focus flow blocks QA; do not compensate by loosening that test.

## Required verification gate

```powershell
py -3.12 -m unittest tests.api.test_console_ui_sources -v
node tests/web/console-next-e2e.mjs
node tests/web/console-next-accessibility.mjs
npm --prefix apps/console-next run preflight
$env:FACTORY_CONSOLE_DIST_DIR = '.next-cui03-verify'; npm --prefix apps/console-next run build
node --check apps/web/app.js
git diff --check
```

The owned browser and build harnesses may write transient Next output and
normalise `tsconfig.json`. If that occurs, the writer must restore only the
existing accepted `include` list after the owned harnesses exit:

```json
["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"]
```

No other `tsconfig.json` field or path is authorized.

## Implementation evidence

- **RED:** the obsolete Brief-context panel selectors were present in the
  pre-CUI-03 `globals.css` source and had no matching rendered Console source.
- **GREEN (2026-07-28):** writer-confirmed focused source suite passed 9/9;
  the scoped CSS no longer contains `.brief-context-panel`,
  `.brief-context-list`, or `.brief-context-foot`; Console workflow and
  accessibility E2E passed; and `git diff --check` passed. The only permitted
  post-harness configuration action is normalising the frozen four-entry
  `tsconfig.json` include list.

## Task review

- This deletion-only task reuses the accepted CUI-02 workflow and overlay
  coverage. No behavioral or contract finding was raised.

## QA

- Focused source and browser behavior remained green; no QA finding was raised.

## Release review

- No release-blocking finding was raised for this deletion-only hygiene change.

## PM decision

- **2026-07-28:** Founder-delegated Controller authorized this serialized,
  deletion-only Console hygiene slice. `/root` is the sole writer. It is
  `implementing`; task review, QA, and independent release review with no
  unresolved P0/P1 remain mandatory before acceptance.
- **2026-07-28:** The required CUI-03 browser harness completed. PM authorized
  `/root` to normalise only `apps/console-next/tsconfig.json`'s frozen
  four-entry `include` list after that harness exits.
- **2026-07-28:** On the writer-confirmed 9/9 focused source result, Console
  workflow/accessibility E2E passes, and clean diff gate, the
  Founder-delegated Controller accepted this deletion-only slice. PM advances
  the ledger to `accepted`; no status-document change is made in this
  ledger-only reconciliation.
