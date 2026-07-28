# Task Ledger: console-lifecycle-overlay-refinement

- **State:** accepted
- **Owner:** pm
- **Single write owner:** `/root` (integration)
- **Specialization:** integration
- **Contract owner:** integration
- **Contract status:** frozen
- **Contract artifact:** `docs/contracts/console-local-proxy-v1.md` (`console-local-proxy/v1`) and `docs/contracts/factory-ui-kit-v1.md` (`factory-ui-kit/v1`)
- **Allowed write paths:** `apps/console-next/components/console-workspace.tsx`, `apps/console-next/components/factory-ui/factory-ui.tsx`, `apps/console-next/components/factory-ui/factory-ui.css`, `apps/console-next/app/globals.css`, `apps/console-next/package.json`, `packages/ui-kit/factory-ui/1.0.0/factory-ui.css`, `packages/ui-kit/factory-ui/1.0.0/factory-ui.manifest.json`, `tools/console_next_dev.py`, `tests/api/test_console_next_dev.py`, `tests/web/fixture-control-plane.mjs`, `tests/web/console-next-e2e.mjs`, `tests/web/console-next-accessibility.mjs`, `docs/superpowers/plans/2026-07-27-console-lifecycle-overlay-refinement.md`, this ledger, and `docs/project-status.md` on acceptance.
- **Read-only parallel work:** task review, QA, and release review only after the integration hand-off; no parallel production or test writer.
- **Approved ADR:** no new ADR required. This is a Console-only presentation, local developer-launcher, and test-hygiene change within accepted ADR-006, ADR-007, and ADR-012; it adds no framework, dependency, API, data, Registry, Composer, Executor, or deployment-topology change.
- **Plan:** `docs/superpowers/plans/2026-07-27-console-lifecycle-overlay-refinement.md`

## Outcome

The local Factory Console presents a compact connected lifecycle route instead
of a card grid; all transient surfaces obey one deliberate placement and
keyboard-containment policy; and founder development plus browser E2E runs use
their own disposable Next output directories without overwriting each other.

## Non-goals

- Changing the frozen Console proxy, control-plane API, generated-app, Registry,
  Composer, Executor, package, trust, lifecycle, or identity contracts.
- Adding a UI/runtime dependency, a framework, a cloud service, a deployment
  path, a real-model call, or a new production credential.
- Redesigning the accepted Factory UI Kit, changing light as the default, or
  mutating the promoted `ui.*@2.1.0` generated-product family.
- Removing or weakening bounded evidence, preview-stop confirmation, loopback
  enforcement, accessibility, or existing responsive coverage.

## Safety invariants

- Browser requests remain only through `console-local-proxy/v1`; capability
  tokens, upstream URLs, raw briefs, model replies, API keys, and signing values
  remain absent from browser code, output directories, logs, and test evidence.
- `factory-ui-kit/v1`, Registry promotion/trust policy, immutable package locks,
  generated application output, and Executor cleanup behavior remain frozen.
- Under ADR-007 dual distribution, an overlay-geometry change to the controlled
  Console `factory-ui.css` must be copied byte-for-byte to
  `packages/ui-kit/factory-ui/1.0.0/factory-ui.css` and accompanied by the
  matching re-hash in its manifest. This is a required canonical-sync operation,
  not a Factory UI Kit contract, package, dependency, or API change; no other
  canonical asset or manifest field is authorized.
- The local launcher creates and removes only a child process's uniquely named
  `apps/console-next/.next-founder-*` output directory; it never deletes `.next`,
  an existing founder directory, a fixture directory, or any path outside the
  Console root.
- E2E cleanup runs only after its owned child server exits and deletes only its
  own unique `.next-test-*` directory. Reused founder servers are never stopped
  or cleaned by an E2E process.
- The shared browser fixture may change only so `fixture.close()` calls
  `closeAllConnections()` before `close()`; this drains owned loopback fixture
  connections that otherwise hang the accessibility harness. It is test-only
  cleanup, not a production/API contract change.

## Dependencies

- Accepted Console Control Center ledger and frozen `console-local-proxy/v1`.
- Accepted generated UI v2.1 ledger, including its remaining P2 isolated-build
  directory hygiene follow-up.
- Fresh read-only audits on 2026-07-27: the visual audit found the lifecycle
  card grid, non-contained/brittle floating lineage, and persistent build
  evidence; the runtime audit reproduced a shared `.next` overwrite that made
  dynamic routes return HTTP 500 while a fresh isolated build rendered.

## Acceptance criteria

1. Lifecycle navigation is a compact, connected, keyboard-operable route with
   explicit ordered progression and current-state indication. It is not a
   four-card grid; existing valid/invalid stage gating and lifecycle actions are
   unchanged.
2. Build evidence is closed by default. The Build canvas exposes an accessible,
   count-first evidence trigger and retains the existing bounded right-side
   evidence sheet, artifact download, and diagnostics only after the trigger is
   opened. No persistent `build-evidence-peek` or duplicate status panel remains.
3. The overlay matrix is exact: Products opens as a left sheet; Command and Stop
   open as centered, focus-trapping dialogs; Evidence opens as a right sheet;
   Lineage opens as a bounded floating work window and can maximize/restore
   inside the viewport. The floating Lineage surface is keyboard-contained,
   Escape/Close restores focus to the opening control, and no background control
   can receive Tab focus while it is open.
4. Lineage placement is responsive: on desktop it begins below the Console
   chrome without covering the lifecycle route's primary actions; on narrow
   screens it remains fully inside the viewport with a usable graph canvas. The
   compact form has no minimap and maximize remains usable.
5. `npm --prefix apps/console-next run dev` launches through a local Python
   wrapper that gives each founder process a fresh `.next-founder-<pid>-<nonce>`
   output directory, passes no API capability to browser code, waits for the
   child process, and removes only its own directory when that child exits.
6. Each browser harness owns a different `.next-test-<pid>-<nonce>` directory,
   waits for its spawned Next child to exit before cleanup, removes that exact
   directory on both pass and failure, and does not alter a reused founder
   server. Browser tests prove the directory no longer exists after cleanup.
7. Preflight, production build, focused launcher test, workflow/accessibility
   E2E, required agent/API/syntax/diff checks pass with no P0/P1 task-review,
   QA, or release-review finding.

## Overlay placement contract

| Surface | Placement | Modal / keyboard rule | Close rule |
| --- | --- | --- | --- |
| Products | left edge sheet | modal; focus remains in sheet | Escape or Close returns to its opening control |
| Command menu | viewport center | modal; initial focus is search | Escape or Close returns to command trigger |
| Stop preview | viewport center | modal; initial focus is Cancel | Escape or Close returns to Stop preview |
| Build evidence | right edge sheet | modal; focus remains in sheet | Escape or Close returns to evidence trigger |
| Product lineage | bounded floating window; maximize/restore within viewport | modal with a clear/non-dimming backdrop permitted; Tab cannot reach background | Escape or Close returns to the control that opened it |

## Coordination

This is a serialized integration task because `FactorySheet`, workspace state,
Console CSS, local-start commands, and both browser harnesses jointly define
the visible behavior and cleanup boundary. No frontend/backend split is
permitted. A change to either frozen contract stops work and returns ownership
to PM/integration governance.

## Implementation evidence

- **Changed paths:** `apps/console-next/app/globals.css`,
  `apps/console-next/components/console-workspace.tsx`,
  `apps/console-next/components/factory-ui/factory-ui.css`,
  `apps/console-next/components/factory-ui/factory-ui.tsx`,
  `apps/console-next/package.json`,
  `packages/ui-kit/factory-ui/1.0.0/factory-ui.css`,
  `packages/ui-kit/factory-ui/1.0.0/factory-ui.manifest.json`,
  `tools/console_next_dev.py`, `tests/api/test_console_next_dev.py`,
  `tests/web/fixture-control-plane.mjs`, `tests/web/console-next-e2e.mjs`, and
  `tests/web/console-next-accessibility.mjs`.
- **RED:** the writer first records failures for the card-grid selector,
  background focus escape from Lineage, default-visible evidence, shared/stale
  E2E output, and absent founder-launcher isolation.
- **GREEN (2026-07-28):** `py -3.12 -m unittest
  tests.api.test_console_next_dev -v` passed 3/3; `npm --prefix
  apps/console-next run preflight` and `npm --prefix apps/console-next run
  build` passed; `node tests/web/console-next-accessibility.mjs` passed; `node
  tests/web/console-next-e2e.mjs` passed; `node --check apps/web/app.js` passed;
  and `git diff --check` passed with a CRLF warning only. Stale test-output
  directories were manually removed only after confirming no owner process.
- **Residual risks:** dark-mode visual parity and reduced-motion coverage are
  P2 follow-ups unless the writer can add them without expanding this bounded
  acceptance scope. The current scope must not claim either as accepted absent
  evidence.

## Task review

- Fresh task review found no P0/P1. The review covered the frozen-contract
  boundary, overlay matrix, focus loop/focus restoration, output-path
  containment, canonical CSS/manifest synchronization, and cleanup ownership.

## QA

- Fresh QA found no P0/P1. It validated the isolated browser flows, launcher
  cleanup, and the accepted overlay/keyboard behavior using the recorded
  accessibility and workflow E2E evidence.

## Release review

- Fresh independent release review found no P0/P1. The remaining dark-mode
  visual-parity and reduced-motion work remains outside this accepted slice.

## PM decision

- **2026-07-27:** Founder-delegated Controller authorized this bounded internal
  Console refinement and the single serialized integration owner. The task is
  `planned`; no production or test writer has been dispatched, no frozen core
  contract has changed, and acceptance remains contingent on fresh evidence.
- **2026-07-27:** Founder-delegated Controller authorized the hand-off from
  `planned` to `implementing` for `/root` as the only integration writer.
- **2026-07-28:** After the recorded implementation evidence, PM advanced the
  task from `implementing` to `ready_for_qa`. Fresh QA and task review reported
  no P0/P1, so PM advanced it from `ready_for_qa` to `reviewed`.
- **2026-07-28:** Founder-delegated Controller authorized acceptance. Fresh
  independent release review reported no P0/P1, so PM advanced CUI-01 from
  `reviewed` to `accepted`. No production/API contract changed.
