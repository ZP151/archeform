# Console Next shadcn preview implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver and independently accept a shadcn-derived Factory Pilot
Console Next that preserves the existing requirement-to-product workflow on
`127.0.0.1:5173` while retaining `apps/web` as rollback.

**Architecture:** A one-time, fixed-SHA shadcn source intake creates a local
candidate snapshot and dependency closure. `apps/console-next` is a new
Next.js 15.5.21 client that uses only local primitive copies and the existing
Factory API. It is a control-console preview, not a generated-application
package and cannot affect Registry/Composer selection.

**Tech Stack:** Python 3.12 integrity tooling; Next.js 15.5.21; React 19.2.7;
TypeScript 5.9.3; local shadcn-derived source; Playwright browser E2E.

## Global Constraints

- Accept only `shadcn-ui/ui@7774cd7dcee1e98d0815aa6e829f33a7fc952fdf`.
- Preserve its MIT notice and retain byte digests of every copied source file.
- No shadcn CLI, URL registry, Git client, package manager, shell adapter, or
  third-party source resolution is allowed in the Console Next runtime,
  Factory API, Registry, Composer, generated applications, or browser tests.
- Console Next binds to `127.0.0.1:5173`, sends the existing
  `X-Factory-Capability` header, and never receives an OpenAI key or generated
  application identity/session.
- Keep `apps/web` runnable and behaviorally unchanged as rollback.
- Do not alter Stage 1 package manifests, adapters, locks, output slots,
  control-plane HTTP contracts, roles, or Compose topology.
- Only approved local primitives may be copied: Accordion, Alert Dialog,
  Badge, Button, Card, Dialog, Dropdown Menu, Input, Label, Select,
  Separator, Sheet, Skeleton, Table, Tabs, Textarea, Sonner, and Tooltip.

---

## File map

| Path | Responsibility |
| --- | --- |
| `tools/console_next_intake.py` | Deterministic source-tree verification, candidate index, closure manifest, and path/notice rejection. |
| `tests/api/test_console_next_intake.py` | Valid and hostile intake fixtures; proves no network/shell invocation. |
| `packages/vendor/shadcn-ui/<sha>/` | Complete immutable upstream source snapshot and unmodified MIT notice. |
| `packages/vendor/shadcn-ui/<sha>/candidate-index.json` | Canonical file digest and `registry:ui` inventory evidence. |
| `packages/vendor/shadcn-ui/<sha>/console-next-closure.json` | Exact selected primitive source, direct/transitive dependency closure, license evidence, and lock digest. |
| `apps/console-next/package.json` | Pinned Console Next runtime profile and scripts. |
| `apps/console-next/package-lock.json` | Exact checked-in dependency closure. |
| `apps/console-next/app/**` | Console route, layout, client state, accessible presentation, local primitive copies, and styles. |
| `apps/console-next/components/ui/**` | MIT-noticed local shadcn-derived primitive copies only. |
| `apps/console-next/README.md` | Local start, rollback, no-runtime-download, and test instructions. |
| `tests/web/console-next-e2e.mjs` | Browser proof against the existing fixture API. |
| `tests/web/console-next-accessibility.mjs` | Keyboard, focus, labels, dialog, and live-status assertions. |
| `docs/superpowers/ledgers/console-next-shadcn-preview.md` | PM-owned execution state and fresh evidence. |

## Task 1: Quarantined source intake and dependency closure

**Files:**
- Create: `tools/console_next_intake.py`
- Create: `tests/api/test_console_next_intake.py`
- Create: `packages/vendor/shadcn-ui/7774cd7dcee1e98d0815aa6e829f33a7fc952fdf/**`
- Create: `packages/vendor/shadcn-ui/7774cd7dcee1e98d0815aa6e829f33a7fc952fdf/candidate-index.json`
- Create: `packages/vendor/shadcn-ui/7774cd7dcee1e98d0815aa6e829f33a7fc952fdf/console-next-closure.json`

**Consumes:** ADR-005 and the approved Console Next specification.

**Produces:** `verify_snapshot(root: Path, expected_commit: str) -> SnapshotIndex`
and a canonical closure manifest for the approved primitive set.

- [ ] **Step 1: Write hostile fixture tests**

  Create temporary source trees that omit `LICENSE.md`, contain a symlink,
  escape the root with `..`, have a changed source commit marker, or contain
  an unindexed `registry:ui` entry. Assert `SnapshotError.code` is respectively
  `missing_license`, `non_regular_file`, `path_escape`, `wrong_commit`, or
  `incomplete_registry_index`.

- [ ] **Step 2: Run the focused test to verify failure**

  Run: `python -m unittest tests.api.test_console_next_intake -v`

  Expected: failure because `tools.console_next_intake` does not exist.

- [ ] **Step 3: Implement canonical local-only intake verification**

  Implement canonical JSON output with sorted paths and SHA-256 file digests.
  Require a complete fixed source tree, an unmodified MIT license, regular
  contained files, the pinned commit, and a complete `registry:ui` inventory.
  The verifier must use `pathlib`, `hashlib`, and local files only; importing
  or calling `urllib`, `requests`, `subprocess`, `os.system`, `npm`, or Git is
  a test failure.

- [ ] **Step 4: Acquire once and verify offline**

  Acquire the exact approved commit as a one-time Controller action, retain
  the complete snapshot below the specified vendor path, run the verifier, and
  write `candidate-index.json`. Derive `console-next-closure.json` from only
  the 18 approved primitive sources and their declared dependency metadata.
  Capture the selected direct/transitive package versions and the digest of the
  exact Console Next lockfile that Task 2 creates.

- [ ] **Step 5: Run focused evidence**

  Run: `python -m unittest tests.api.test_console_next_intake -v`

  Expected: all valid and hostile snapshot tests pass without network or shell
  calls after the snapshot exists.

## Task 2: Console Next shell and locked local primitive set

**Files:**
- Create: `apps/console-next/package.json`
- Create: `apps/console-next/package-lock.json`
- Create: `apps/console-next/next.config.mjs`
- Create: `apps/console-next/tsconfig.json`
- Create: `apps/console-next/app/layout.tsx`
- Create: `apps/console-next/app/page.tsx`
- Create: `apps/console-next/app/globals.css`
- Create: `apps/console-next/components/ui/**`
- Create: `apps/console-next/lib/utils.ts`
- Create: `apps/console-next/README.md`
- Test: `tests/web/console-next-e2e.mjs`

**Consumes:** Task 1 snapshot and closure manifest.

**Produces:** A buildable local Next console whose primitive source maps
one-to-one to the approved vendor closure and whose HTTP behavior is owned by
a client-side `FactoryApi` adapter.

- [ ] **Step 1: Write the failing startup and source-origin assertions**

  Assert the Console Next package uses exact `next@15.5.21`, `react@19.2.7`,
  and `react-dom@19.2.7`; has a lockfile; starts on a caller-supplied loopback
  host/port; and every `components/ui` source file has a matching entry and
  MIT notice in `console-next-closure.json`.

- [ ] **Step 2: Run the assertions to verify failure**

  Run: `node tests/web/console-next-e2e.mjs --assert-package-only`

  Expected: failure because `apps/console-next` is absent.

- [ ] **Step 3: Create the locked runtime and primitive copies**

  Create the Next application with exact versions and a lockfile produced
  during this controlled intake. Copy only approved primitive source from the
  verified snapshot into `components/ui`, retaining MIT notices. Provide
  `cn()` in `lib/utils.ts`; do not invoke `npx shadcn`, query a registry, or
  import from the vendor tree at runtime.

- [ ] **Step 4: Implement the responsive shell**

  Build the header, project lineage navigation, four-stage Tabs, connection
  Sheet, Card sections, live-status region, and diagnostic Accordion. Use
  Button, Input, Label, Textarea, Select, Badge, Card, Sheet, Tabs, Table,
  Dialog, Skeleton, Sonner, Tooltip, and Accordion from the local primitive
  tree. All interactive controls have visible focus, accessible names, and
  keyboard behavior.

- [ ] **Step 5: Verify build and rollback coexistence**

  Run: `npm --prefix apps/console-next ci --ignore-scripts`

  Run: `npm --prefix apps/console-next run build`

  Run: `node --check apps/web/app.js`

  Expected: Console Next builds and the static rollback console remains valid.

## Task 3: Preserve the Factory workflow in Console Next

**Files:**
- Create: `apps/console-next/lib/factory-api.ts`
- Create: `apps/console-next/lib/types.ts`
- Create: `apps/console-next/components/connection-sheet.tsx`
- Create: `apps/console-next/components/project-lineage.tsx`
- Create: `apps/console-next/components/brief-stage.tsx`
- Create: `apps/console-next/components/definition-stage.tsx`
- Create: `apps/console-next/components/plan-stage.tsx`
- Create: `apps/console-next/components/build-stage.tsx`
- Modify: `apps/console-next/app/page.tsx`
- Test: `tests/web/console-next-e2e.mjs`

**Consumes:** Task 2 local primitives and the unchanged Factory API routes.

**Produces:** `FactoryApi.request(path, options)` and one client composition
that preserves create, version, approval, plan, run, retry, artifact, preview,
and stop interactions.

- [ ] **Step 1: Port the existing fixture E2E as a failing Console Next test**

  Start the existing fixture API from `tests/web/workspace-e2e.mjs`, launch
  Console Next on `127.0.0.1:5173`, and assert create -> edit -> save child
  version -> approve -> retry plan -> approve plan -> queue -> ready -> open
  preview -> stop. Preserve the existing XSS-safe labels and capability-header
  assertions.

- [ ] **Step 2: Run the focused E2E to verify failure**

  Run: `node tests/web/console-next-e2e.mjs`

  Expected: failure before the workflow client and stage components exist.

- [ ] **Step 3: Implement the bounded API adapter**

  Copy endpoint semantics from `apps/web/app.js`, but centralize JSON parsing,
  capability-header addition, bounded errors, polling cancellation, and
  response typing in `FactoryApi`. Store the capability only in React memory;
  do not persist it in localStorage or URL state.

- [ ] **Step 4: Implement the four stage components**

  Render structured form editors, immutable version/project selection,
  component-plan explanations, run history, artifact download links, preview
  action, and a confirmation Dialog before stopping a preview. Render all
  server supplied strings as text; never use `dangerouslySetInnerHTML`.

- [ ] **Step 5: Run workflow evidence**

  Run: `node tests/web/console-next-e2e.mjs`

  Expected: the complete fixture-backed workflow passes on Console Next.

## Accelerated execution amendment

The Controller may assign Tasks 2 and 3 to one Frontend writer as one
vertical slice. This is an execution optimization, not a contract change: the
writer must satisfy Task 2's lock/source/build gates before implementing Task
3's workflow, then provide one combined hand-off for independent QA and
review. No second writer may touch `apps/console-next/**` while that slice is
active.

Task 1 records the selected primitive source closure without an application
lock digest, because that lockfile does not exist yet. The combined Task 2/3
writer may update only the `consoleNextLockDigest` field of
`console-next-closure.json` after creating the exact checked-in lockfile. The
final intake verification and QA gate must reject a missing or mismatched
digest. This resolves the otherwise impossible ordering without allowing any
runtime source resolution.

For E2E reuse, the combined writer may create
`tests/web/fixture-control-plane.mjs` and may make the smallest export-only
change to `tests/web/workspace-e2e.mjs` needed to reuse its fixture. Existing
static-console assertions must remain unchanged.

## Task 4: Accessibility, runtime containment, QA, and acceptance

**Files:**
- Create: `tests/web/console-next-accessibility.mjs`
- Modify: `apps/console-next/README.md`
- Modify: `THIRD_PARTY_NOTICES.md`
- Modify: `docs/project-status.md`
- Modify: `docs/superpowers/ledgers/console-next-shadcn-preview.md`

**Consumes:** Tasks 1-3.

**Produces:** Independent accessibility and rollback evidence plus the PM
acceptance decision.

- [ ] **Step 1: Write failing accessibility and no-runtime-download checks**

  Assert keyboard focus reaches navigation, connection Sheet, form controls,
  stage Tabs, stop Dialog, and diagnostic Accordion; every input has a label;
  notices expose `role=status` or `aria-live`; and Console Next contains no
  `fetch` target outside the Factory API nor `npx`, `shadcn`, registry URL, Git,
  or package-manager source resolution in runtime files.

- [ ] **Step 2: Run focused checks to verify failure**

  Run: `node tests/web/console-next-accessibility.mjs`

  Expected: failure until the shell and workflow implement required semantics.

- [ ] **Step 3: Add minimal accessibility and containment fixes**

  Add labels, focus restoration, `aria-current`, live regions, keyboard-safe
  dialogs/sheets, and exact bounded error copy. Keep vendor source only in the
  designated vendor and local primitive directories; do not relax the source
  policy to make a test pass.

- [ ] **Step 4: Run fresh release evidence**

  Run:

  ```powershell
  python -m unittest discover -s tests/agents -v
  python -m unittest discover -s tests/api -v
  python -m unittest discover -s tests/executor -v
  npm --prefix apps/console-next ci --ignore-scripts
  npm --prefix apps/console-next run build
  node tests/web/console-next-e2e.mjs
  node tests/web/console-next-accessibility.mjs
  node --check apps/web/app.js
  git diff --check
  ```

  Expected: all checks pass, static console rollback remains runnable, and no
  secret, raw brief, raw evidence payload, or runtime third-party download is
  observable.

- [ ] **Step 5: Independent review and acceptance**

  A read-only reviewer verifies ADR-005 compliance, exact snapshot identity,
  local lock/source closure, unchanged control-plane contract, rollback, and
  P0/P1 status. QA attaches exact output to the ledger. PM records `accepted`
  only after the reviewer has no unresolved P0/P1 finding.

## Spec coverage review

- Fixed source, notice, snapshot, candidate inventory, closure, and no-runtime
  source resolution: Task 1.
- Exact runtime lock and local shadcn primitives: Task 2.
- Current control-plane workflow and loopback origin: Task 3.
- Accessibility, rollback, evidence privacy, QA, review, and acceptance:
  Task 4.
- Generated UI v2 packages, Registry/Composer selection, and promotion are
  deliberately excluded from this Console Next preview.

## Execution handoff

Plan complete and saved to
`docs/superpowers/plans/2026-07-26-console-next-shadcn-preview.md`.

The Controller owns implementation sequencing. Integration owns the
quarantined intake contract; Frontend owns Console Next only after the intake
closure is frozen; QA and review are read-only until their assigned hand-offs.
