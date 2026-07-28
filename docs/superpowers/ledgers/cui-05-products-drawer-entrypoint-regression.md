# Task Ledger: CUI-05 Products Drawer Entrypoint Regression

- **State:** accepted
- **Owner:** pm
- **Single write owner:** `/root` (integration)
- **Specialization:** integration
- **Contract owner:** integration
- **Contract status:** frozen; no contract change
- **Contract artifact:** accepted CUI-01 overlay matrix and
  `docs/contracts/factory-ui-kit-v1.2.md` (`factory-ui-kit/v1.2`)
- **Allowed write paths:** `apps/console-next/components/console-workspace.tsx`,
  `tests/api/test_console_ui_sources.py`, `tests/web/console-next-e2e.mjs`,
  `tests/web/console-next-accessibility.mjs`, this ledger, and
  `docs/superpowers/plans/2026-07-28-cui-05-products-drawer-entrypoint-regression.md`.
  After every owned CUI-05 browser/build harness has exited, `/root` may modify
  `apps/console-next/tsconfig.json` only to normalize `include` exactly to
  `["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"]`.
  No other tsconfig field, source glob, alias, `exclude`, or path is authorized.
  No other path, including `docs/project-status.md`, Factory UI assets, CSS,
  API, proxy, package, or generated asset, is authorized before PM acceptance.
- **Read-only parallel work:** source/E2E review only after writer hand-off;
  no concurrent production or test writer.
- **Approved ADR:** not required. This is a focused Console regression assertion
  over existing `projectsOpen` state and the accepted overlay matrix; it adds no
  dependency, framework, API/data contract, asset identity, or topology.
- **Plan:** `docs/superpowers/plans/2026-07-28-cui-05-products-drawer-entrypoint-regression.md`

## Current read-only finding

Current `ConsoleWorkspace` already routes all three entry points to the same
`setProjectsOpen(true)` state and renders `FactorySheet` with `side="left"`:

| Entrypoint | Current code path | Existing proof |
| --- | --- | --- |
| Left rail | `#open-products-trigger` → `setProjectsOpen(true)` | Workflow E2E proves left geometry and focus restoration. |
| Topbar project switcher | `.console-project-switcher` → `setProjectsOpen(true)` | No dedicated E2E geometry/focus assertion. |
| Command > Open products | command item → `setProjectsOpen(true)` | Workflow E2E proves left geometry, but not topbar parity. |

The source test proves the left sheet and command action exist but does not
exercise all three entry points at runtime. CUI-05 therefore adds coverage; it
does not presume a code fix is needed.

## Outcome

Prove and preserve that every Products-selection entry point opens the same
left-edge Products drawer, with correct close/focus restoration, while Evidence
remains right, Command/Stop remain centered, and Lineage remains floating.

## Non-goals

- Changing `FactorySheet`, its side/modal behavior, CSS, the accepted overlay
  matrix, project selection semantics, command contents, or any API/proxy/
  generated-product/package/Registry/Composer/Executor behavior.
- Starting, stopping, deleting, or reusing a founder development server as an
  implementation side effect. Runtime troubleshooting is verification guidance,
  not a permission to manipulate unknown processes.

## Acceptance criteria

1. Browser E2E independently activates the left rail, topbar project switcher,
   and Command > Open products entry points. For each, it proves the resulting
   dialog title is `Products`, its bounding box is left-edge (`x < 24` at the
   controlled desktop viewport), and its product rows are usable.
2. Closing via Close and Escape restores focus to the actual opener for each
   path: `#open-products-trigger`, `.console-project-switcher`, and the
   command-menu option/Command trigger according to the existing modal return
   behavior. The Command path must not leave a centered command dialog open
   beneath a left Products drawer.
3. Regression coverage reasserts the complete matrix in the same controlled
   run: Products left; Evidence right; Command and Stop center; Lineage floating
   with existing focus containment. It may reuse existing assertions but cannot
   weaken or delete them.
4. Source regression confirms all three entry points continue to share
   `projectsOpen` and the sole Products sheet remains `side="left"` with its
   stable restore-focus ID.
5. Browser verification starts an isolated owned Next server by default. If a
   manual localhost page is stale, returns HTTP 500, or visually differs from
   an owned harness, the hand-off records the diagnostic rule: do not treat
   cache refresh as proof; use an owned E2E server or the governed
   `npm --prefix apps/console-next run dev` launcher with a unique
   `.next-founder-*` output. Never terminate or delete an unknown/founder-owned
   process/output directory.
6. Focused source and browser tests, Console preflight, syntax, and diff checks
   pass with no unresolved P0/P1. A production build is optional only if no
   source change occurs; if it is run, its output must be isolated and the
   existing tsconfig authority is unchanged.

## Required verification gate

```powershell
py -3.12 -m unittest tests.api.test_console_ui_sources -v
npm --prefix apps/console-next run preflight
node tests/web/console-next-e2e.mjs
node tests/web/console-next-accessibility.mjs
node --check apps/web/app.js
git diff --check
```

## Implementation evidence

- **RED:** `node tests/web/console-next-e2e.mjs` failed after the new topbar
  assertion: Escape closed the left Products drawer but focus did not return to
  the topbar project switcher. The former shared sheet used the hard-coded
  `open-products-trigger` restore target for every entry point.
- **GREEN:** `ConsoleWorkspace` now records the Products opener before opening
  the same `FactorySheet(side="left")`. The rail, topbar, and Command paths
  supply stable IDs; the shared drawer restores focus to the matching opener.
  Changed paths are `apps/console-next/components/console-workspace.tsx`,
  `tests/api/test_console_ui_sources.py`, and
  `tests/web/console-next-e2e.mjs`.
- **Focused evidence:**
  `py -3.12 -m unittest tests.api.test_console_ui_sources -v` (10/10 PASS);
  `node tests/web/console-next-e2e.mjs` (PASS, isolated owned server);
  `node tests/web/console-next-accessibility.mjs` (PASS);
  `npm --prefix apps/console-next run preflight` (PASS);
  `node --check apps/web/app.js` (PASS); `git diff --check` is clean apart
  from the pre-existing tsconfig CRLF advisory.
- **Residual risk:** the founder-owned `127.0.0.1:5173` page may be an older
  dev-server output or lack its local control-plane service. Acceptance relies
  on the owned isolated browser harness rather than cache refresh. No CSS,
  component asset, API, or generated-product identity changed.
- **Review repair:** the first task review found that pre-creation rail and
  Command checks did not prove usable rows and used generic dialog locators.
  The repaired E2E now creates a product, then independently exercises rail,
  topbar, and Command entry points against `dialog[name="Products"]`; each
  path proves the selected product row is singular, visible, and enabled.
  Close/Escape focus restoration remains asserted for the originating control.
  The repaired owned-server workflow passed.

## Task review / QA / release review

- **Task review:** PASS after one evidence repair. The reviewer found that the
  initial test had not proven usable rows after product creation; the repaired
  E2E closed that gap using named Products dialogs and three independent
  entry-point checks. Re-review found no P0/P1.
- **QA:** PASS with no P0/P1. Source suite (10/10), Console preflight, owned
  browser workflow, accessibility workflow, JavaScript syntax, and diff gate
  all passed. QA confirmed Products left, Evidence right, Command/Stop center,
  and Lineage floating, with correct origin focus restoration.
- **Harness hygiene:** QA's owned Next harness expanded the tsconfig `include`
  array. Under the PM's explicit narrow authorization, `/root` restored only
  that array to `next-env.d.ts`, `**/*.ts`, `**/*.tsx`, and
  `.next/types/**/*.ts`; no other tsconfig field changed.
- **Release review:** PASS after the authorized tsconfig normalization. No P0/P1
  remains; the review confirmed the topbar focus repair uses the existing sole
  left Products sheet and leaves the Evidence/Command/Stop/Lineage matrix
  unchanged.

## PM decision

- **2026-07-28:** This ledger is intentionally `planned`. The read-only audit
  found that code already shares the left Products state, rail and Command
  runtime coverage exists, and topbar runtime parity is the only missing
  assertion. No writer is dispatched until the Controller authorizes this
  narrow test-first regression slice.
- **2026-07-28:** Founder-delegated Controller authorized the requested
  layout-correction regression. PM advances CUI-05 from `planned` to
  `implementing` and assigns `/root` as the sole integration writer for the
  explicitly listed Console/source/browser-test paths. CUI-04 and generated
  Approval UI 2.2 work remain preserved and out of scope; no project-status
  update is authorized before acceptance.
- **2026-07-28:** CUI-05 QA completed without P0/P1. Its owned Next harness
  normalized the repository tsconfig include paths. Founder-delegated
  Controller authorizes `/root`, after all owned harnesses have exited, to
  restore only the frozen four-entry `include` list above before subsequent
  diff/review gates. This does not authorize any other tsconfig change.
- **2026-07-28:** The repaired task review, QA, and independent release review
  all passed with no P0/P1. PM advances the ledger from `implementing` to
  `ready_for_qa`, then `reviewed`, then `accepted`. The stale founder-server
  diagnostic remains verification guidance only; accepted behavior is proved by
  the owned isolated E2E server. Ongoing generated Approval UI 2.2 work is
  explicitly outside this Console-only acceptance.
