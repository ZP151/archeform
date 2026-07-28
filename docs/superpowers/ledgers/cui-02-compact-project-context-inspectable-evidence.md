# Task Ledger: CUI-02 Compact Project Context & Inspectable Evidence

- **State:** accepted
- **Owner:** pm
- **Single write owner:** `/root` (integration)
- **Specialization:** integration
- **Contract owner:** integration
- **Contract status:** frozen
- **Contract artifact:** `docs/contracts/factory-ui-kit-v1.2.md` (`factory-ui-kit/v1.2`)
- **Allowed write paths:** `apps/console-next/components/console-workspace.tsx`, `apps/console-next/app/globals.css`, `apps/console-next/tsconfig.json` solely after owned CUI-02 harness exit to normalize `include` to exactly `["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"]`, `tests/api/test_console_ui_sources.py`, `tests/web/console-next-e2e.mjs`, `tests/web/console-next-accessibility.mjs`, this ledger, `docs/superpowers/plans/2026-07-28-cui-02-compact-project-context-inspectable-evidence.md`, and `docs/project-status.md` on acceptance. No other tsconfig field or path is authorized.
- **Read-only parallel work:** task review, QA, and release review after writer hand-off only; no concurrent writer.
- **Approved ADR:** not required. This is a bounded Console composition change inside frozen `factory-ui-kit/v1.2`; it changes no framework, dependency, API/data contract, package identity, Registry/Composer rule, or topology.
- **Plan:** `docs/superpowers/plans/2026-07-28-cui-02-compact-project-context-inspectable-evidence.md`

## Outcome

The Console presents long project context compactly without losing its accessible
full name, makes lifecycle stages discoverable at narrow widths, and makes
evidence inspectable through visible filenames plus compact accessible actions.

## Non-goals

- Any canonical Factory UI asset/contract, overlay-matrix, Sheet API, API,
  control-plane, Executor, Registry, Composer, generated-app, package, or
  dependency change.
- Mutating canonical 1.0/1.1/1.2 assets, generated `ui.*@2.1.0` packages,
  locks, sidecars, or rollback evidence.
- Adding Settings, Help, new evidence content, or a new lifecycle action.

## Audit conclusion and acceptance criteria

1. A long selected project name is visually truncated without expanding the
   top bar, while the project-switcher exposes the full name through its
   accessible name and contextual tooltip/title. Version/state context remains
   readable and focusable.
2. At 390 px, 560 px, and 768 px, all four lifecycle stages remain discoverable
   and keyboard-operable without page-level horizontal overflow; the active
   stage remains identifiable and unavailable stages retain their valid disabled
   semantics.
3. Build evidence remains closed/count-first until opened. In its right sheet,
   every artifact exposes a visible filename and a compact download action with
   an accessible name, keyboard focus, visible focus treatment, tooltip/context,
   and stable selector. Bounded diagnostics and artifact download behavior stay
   intact.
4. Remove only audit-identified redundant Brief-context copy; retain labelled
   Name/requirement inputs, presets, validation/error notices, and the
   requirement-to-definition workflow meaning. No raw brief, credential,
   capability, or model response becomes visible.
5. Source regressions prove no obsolete Brief copy/evidence icon-only rendering
   remains. Browser regressions cover long-name focus/accessible name, stage
   discovery at 390/560/768, evidence filename/download/focus restoration, and
   existing overlay/focus behavior.
6. Focused source tests, Console workflow/accessibility E2E, preflight/build,
   full API/agent suites, syntax, and diff gates pass with no unresolved P0/P1.

## Stop rules

- A need to change the v1.2 canonical asset, overlay matrix, Sheet semantics,
  API/data behavior, generated package, or path outside this ledger stops work.
- A compact action lacking a visible filename/context or accessible name, or a
  narrow layout with hidden stages/focus loss/overflow, blocks QA.

## Required verification gate

```powershell
py -3.12 -m unittest tests.api.test_console_ui_sources -v
python -m unittest discover -s tests/agents -v
python -m unittest discover -s tests/api -v
npm --prefix apps/console-next run preflight
npm --prefix apps/console-next run build
node tests/web/console-next-e2e.mjs
node tests/web/console-next-accessibility.mjs
node --check apps/web/app.js
git diff --check
```

## Implementation evidence

- **RED:** the focused source contract first failed for absent long-name
  accessibility, narrow stage discovery, visible evidence filenames, compact
  download actions, and audited Brief-copy removal.
- **GREEN (2026-07-28):** focused source contract passed 9/9; agent governance
  passed 4/4; the full API suite exited 0; Console preflight, JavaScript syntax,
  and diff checks passed; and an isolated production build emitted
  `.next-cui02-release/BUILD_ID`. Workflow E2E passed long-name `aria`/`title`,
  visible keyboard-operable stages at 390/560/768, and evidence
  filename/download behavior. Accessibility E2E passed after the UI change.
  Final `tsconfig.json` include is exactly `next-env.d.ts`, `**/*.ts`,
  `**/*.tsx`, and `.next/types/**/*.ts`.
- **Residual P2:** dead Brief-context CSS remains after its rendered copy was
  removed. It is deferred to a separate CSS-hygiene slice; no live behavior,
  API, contract, or generated asset is affected.

## Task review

- Independent task review found no P0/P1.

## QA

- Focused QA accepted the GREEN evidence with no P0/P1.

## Release review

- Initial independent release review found P1; the writer remediated it and the
  scoped re-review accepted the task with no remaining P0/P1. The documented
  dead Brief-context CSS is P2 only.

## PM decision

- **2026-07-28:** Founder-delegated Controller authorized CUI-02 as a
  serialized Console-only refinement. `/root` is the sole writer; the task is
  `implementing`. Acceptance requires fresh evidence plus task review, QA, and
  independent release review with no P0/P1.
- **2026-07-28:** PM advanced CUI-02 from `implementing` to `ready_for_qa` on
  the recorded GREEN evidence. Task review and QA found no P0/P1, advancing it
  to `reviewed`. After P1 remediation and an independent clean re-review,
  Founder-delegated Controller accepted the slice and PM advanced it to
  `accepted`.
