# CUI-08 Console/Generated Asset-Topology Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` or `superpowers:executing-plans`
> task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a Console-only `factory-ui-console@1.6.0` candidate whose
canonical and live Console CSS have no generated-application selector residue,
while proving existing generated application assets neither import nor rely on
Console CSS.

**Architecture:** The candidate is a one-way successor cloned from immutable
Console 1.5, then stripped only of the generated-application-owned selector
block. A new frozen source contract names the three distributions, their
canonical roots, allowed live mapping, and selector ownership. The existing
digest verifier binds the live Console copy to candidate 1.6; existing
generated-package canonical evidence remains read-only and is verified as an
independent distribution. Static source guards plus Console and generated-app
browser regressions make the separation observable. The sole permitted
presentation-lifecycle exception outside the three-file asset map is
`LineageDag`: it schedules an epoch-safe post-ResizeObserver refit only after
React Flow has committed its new size, preventing Restore/Close→Open geometry
races without changing graph data or asset topology.

**Tech Stack:** Existing Python 3.12 verifier/tests, Next.js 15/React 19
Console, existing generated Next.js Docker/browser fixtures; no new package,
dependency, runtime, API, or model call.

## Global Constraints

- CUI-08 is a candidate-only `factory-ui-console@1.6.0` successor. Do not
  edit, rehash, relabel, or otherwise mutate accepted Console 1.4, candidate
  Console 1.5, any of their manifests/replay evidence, or any canonical
  generated `factory-ui` asset.
- All generated application assets are immutable in this slice, including
  `packages/ui-kit/factory-ui/{1.0.0,1.3.0,1.4.0}/`, every
  `packages/components/ui.*/{2.1.0,2.2.0,2.3.0}/`, Composer scaffold assets,
  generated locks, and generated outputs. They are read-only test inputs.
- Candidate 1.6 may change only the Console distribution, its exact live
  mapping, its verifier/source-contract evidence, and focused regressions.
  It must never become Golden, satisfy a generated `factory-ui` dependency,
  enter component selection, or authorize a release/deployment.
- `factory-ui-console` and generated `factory-ui` remain separate identities.
  The Console live map is exactly `factory-ui.css`, `tokens.css`, and
  `react/factory-ui.tsx`; every mapped file must be byte-identical to candidate
  1.6 and inventory-bound by `factory-ui.manifest.json`.
- The three-file live asset map remains exact. The only Controller-approved
  CUI-08 exception is
  `apps/console-next/components/factory-ui/lineage-dag.tsx`, a Console
  presentation-lifecycle file outside that map. It may only implement the
  epoch-safe refit lifecycle defined in Task 3; it cannot change source
  ownership, graph data, selection, generated assets, or APIs.
- The source contract must define Console-owned selector prefixes
  (`.factory-`, `.lineage-`, `.react-flow`, `[data-factory-ui="1.6.0"]`
  Console-root rules) and generated-owned prefixes (`.fp-` and
  `[data-factory-ui="1.4.0"].fp-app` family). Candidate Console CSS must
  contain no `.fp-` selector, `.fp-app` selector, or generated-app scoped
  rule. Generated assets must contain no import, path, or canonical reference
  to `factory-ui-console`, `apps/console-next`, or Console versions.
- Preserve all accepted Console interaction invariants: Products opens left,
  Evidence opens right, Command/Stop remain centered, Lineage remains
  floating/controlled-full-window, keyboard/focus behavior, themes, reduced
  motion, safe Lineage content, and 14-package geometry remain unchanged.
- Preserve generated-app behavior and trust evidence: signed-out isolation,
  role-aware submit/approve/audit flows, current canonical digest sidecars,
  component locks, package dependency relations, and Docker cleanup remain
  unchanged.
- Use TDD. Any unexpected source, browser, build, Docker, or cleanup result
  requires `.agents/skills/systematic-debugging` before repair. This slice
  does not call a real model.

## File Structure and Ownership

| Path | CUI-08 responsibility |
| --- | --- |
| `docs/contracts/factory-ui-asset-topology-v1.md` | Frozen ownership table, canonical roots, live map, selector deny/allow rules, and rejection conditions. |
| `packages/ui-kit/factory-ui-console/1.6.0/**` | New immutable candidate copied from Console 1.5, with generated selector block absent and truthful 1.6 manifest. |
| `apps/console-next/components/factory-ui/{factory-ui.css,tokens.css,factory-ui.tsx}` | Live Console mapping, byte-identical to candidate 1.6 only. |
| `apps/console-next/components/factory-ui/lineage-dag.tsx` | Controller-approved Console presentation exception: epoch-safe post-size-commit refit and no other topology/data behavior. |
| `tools/factory_ui_kit.py` | Existing verifier mapping extended for candidate 1.6 without weakening historic Console/generated verification. |
| `tests/api/test_factory_ui_kit.py` | Identity, digest, immutability, and generated-distribution-independence regressions. |
| `tests/api/test_console_ui_sources.py` | Source-contract, selector ownership, and live/candidate mapping regressions. |
| `tests/web/console-next-e2e.mjs` | Existing Console lifecycle/Lineage workflow regression; no fixture contract change. |
| `tests/web/console-next-accessibility.mjs` | Existing Console keyboard, focus, theme, reduced-motion, and narrow viewport regression. |
| `tests/web/generated-approval-app-e2e.mjs` | Read-only generated-app browser proof that the packaged application still owns its styles and role-aware flow. |
| `tests/web/generated-composable-preview-e2e.mjs` | Read-only composed-preview/Docker evidence that no Console stylesheet is required. |

The frozen contract is owned by `integration`; implementation is serialized
under that owner because the source contract spans Console and generated
distribution boundaries. No frontend or generated-asset writer runs in
parallel. A request to alter selector ownership, the three-file live map, a
generated sidecar, or a generated package pauses the task and returns to the
contract owner.

---

### Task 1: Freeze the asset-topology contract and RED regressions

**Files:**
- Create: `docs/contracts/factory-ui-asset-topology-v1.md`
- Modify: `tests/api/test_factory_ui_kit.py`
- Modify: `tests/api/test_console_ui_sources.py`

**Interfaces:**
- Consumes: `CONSOLE_COPY_MAP`, `verify_factory_ui_kit`,
  `verify_generated_ui_distribution`, canonical Console 1.4/1.5 roots, and
  generated canonical/package roots already declared by
  `tests/api/test_factory_ui_kit.py`.
- Produces: `factory-ui-asset-topology/v1`, a frozen source contract whose
  required records are:

  ```markdown
  | Distribution | Key/version | Canonical root | May map live Console files | Owns selectors |
  | Console candidate | factory-ui-console@1.6.0 | packages/ui-kit/factory-ui-console/1.6.0 | yes: exactly 3 | .factory-, .lineage-, .react-flow |
  | Generated successor | factory-ui@1.4.0 | packages/ui-kit/factory-ui/1.4.0 | no | .fp-, .fp-app |
  ```

  It must enumerate the exact three-file live map and declare rejection IDs:
  `console_generated_selector_present`,
  `generated_console_reference_present`,
  `console_candidate_copy_digest_mismatch`, and
  `historical_distribution_mutated`.
- Does not produce: a new generated canonical asset, changed package lock,
  generated-app CSS migration, or runtime selector transformation.

- [ ] **Step 1: Write failing source-contract and independence tests**

  In `tests/api/test_factory_ui_kit.py`, add a
  `CONSOLE_TOPOLOGY_CANDIDATE_CANONICAL` constant for
  `packages/ui-kit/factory-ui-console/1.6.0`. Add a test that calls:

  ```python
  verify_factory_ui_kit(
      CONSOLE_TOPOLOGY_CANDIDATE_CANONICAL,
      CONSOLE,
      expected_key="factory-ui-console",
      expected_version="1.6.0",
  )
  ```

  Snapshot byte hashes for every file in Console 1.4 and 1.5 before testing
  candidate behavior. After verification, assert those snapshots are exactly
  unchanged. Retain the existing generated-distribution verifier calls for
  2.1, 2.2, and 2.3 and assert their `canonical` sidecars do not name
  `factory-ui-console`.

  In `tests/api/test_console_ui_sources.py`, read the new topology contract,
  candidate CSS, and live Console CSS. Assert all exact deny markers are
  absent from both Console files:

  ```python
  forbidden_console_markers = (".fp-", ".fp-app", "Generated approval-product distribution")
  ```

  Scan every read-only generated `component.json`, `canonical-ui.json`, and
  template source. Assert none contains any of:

  ```python
  forbidden_generated_references = (
      "factory-ui-console", "apps/console-next",
      "factory-ui-console@1.4.0", "factory-ui-console@1.5.0",
      "factory-ui-console@1.6.0",
  )
  ```

- [ ] **Step 2: Run focused RED checks**

  Run:

  ```powershell
  py -3.12 -m unittest tests.api.test_factory_ui_kit tests.api.test_console_ui_sources -v
  ```

  Expected: candidate 1.6 identity is unavailable and the Console selector
  ownership test fails because Console 1.5/live CSS contains the `.fp-` block.
  Record the exact failing test names and messages in the CUI-08 ledger.

- [ ] **Step 3: Write the frozen contract without changing source assets**

  Create `docs/contracts/factory-ui-asset-topology-v1.md` with:

  ```markdown
  # Factory UI Asset Topology v1

  - schema: factory-ui-asset-topology/v1
  - Console candidate: factory-ui-console@1.6.0
  - generated successor: factory-ui@1.4.0
  - Console live map: factory-ui.css, tokens.css, react/factory-ui.tsx
  - Console CSS deny set: .fp-, .fp-app, Generated approval-product distribution
  - generated CSS deny set: factory-ui-console, apps/console-next
  - historic roots: Console 1.4/1.5 and all generated roots are immutable
  ```

  Add the full ownership/rejection table from this task's Interfaces block.
  The contract must state that only a separately governed generated-asset task
  may change generated CSS or package sidecars.

- [ ] **Step 4: Verify the contract-only change**

  Run:

  ```powershell
  py -3.12 -m unittest tests.api.test_console_ui_sources -v
  git diff --check
  ```

  Expected: contract parsing/source guard is active, while candidate identity
  and selector ownership still fail until Task 2.

### Task 2: Materialize the immutable Console 1.6 separation candidate

**Files:**
- Create: `packages/ui-kit/factory-ui-console/1.6.0/factory-ui.css`
- Create: `packages/ui-kit/factory-ui-console/1.6.0/tokens.css`
- Create: `packages/ui-kit/factory-ui-console/1.6.0/react/factory-ui.tsx`
- Create: `packages/ui-kit/factory-ui-console/1.6.0/factory-ui.manifest.json`
- Modify: `apps/console-next/components/factory-ui/factory-ui.css`
- Modify: `apps/console-next/components/factory-ui/tokens.css`
- Modify: `apps/console-next/components/factory-ui/factory-ui.tsx`
- Modify only for the P1 lifecycle repair:
  `apps/console-next/components/factory-ui/lineage-dag.tsx`
- Modify: `tools/factory_ui_kit.py`
- Modify: `tests/api/test_factory_ui_kit.py`
- Modify: `tests/api/test_console_ui_sources.py`

**Interfaces:**
- Consumes: accepted Console 1.5 bytes as copy source and
  `factory-ui-asset-topology/v1` deny/allow rules.
- Produces: candidate `factory-ui-console@1.6.0` with the same three-file
  inventory schema and component inventory as 1.5, `data-factory-ui="1.6.0"`
  in its Console primitive, and live Console files that digest-match candidate
  1.6 exactly.
- Does not produce: a generated package version, a modified generated
  stylesheet, selector aliases, a Console fallback into generated CSS, or a
  change to existing Console 1.4/1.5 inventories. `lineage-dag.tsx` is a
  presentation-only exception and may not modify graph model data, selection,
  generated-app behavior, or the three-file live map.

- [ ] **Step 1: Copy Console 1.5 to a new candidate, then remove only the generated block**

  Copy only the three mapped files from
  `packages/ui-kit/factory-ui-console/1.5.0/` to the corresponding 1.6 paths.
  Update only the Console version marker(s) in the copied primitive to
  `1.6.0`. In copied `factory-ui.css`, delete the complete comment and rule
  region beginning with:

  ```css
  /* Generated approval-product distribution.
  ```

  through the end of its generated `.fp-*` responsive/reduced-motion rules.
  Do not delete Console `.factory-*`, `.lineage-*`, `.react-flow*`, stage rail,
  sheet, theme, or reduced-motion rules. Do not edit the 1.5 source.

- [ ] **Step 2: Regenerate truthful candidate evidence and exact live mapping**

  Build `factory-ui.manifest.json` with the existing
  `factory-ui-kit/v1` schema, key `factory-ui-console`, version `1.6.0`, the
  unchanged required component list, and exactly these inventory paths:

  ```text
  factory-ui.css
  tokens.css
  react/factory-ui.tsx
  ```

  Compute each `sha256:` digest from the final candidate bytes. Extend the
  verifier/test constants only to identify 1.6 as a Console candidate. Then
  copy final candidate CSS, tokens, and React primitive bytes to the three
  mapped live Console destinations. Do not hand-edit the live copy after the
  byte copy.

- [ ] **Step 3: Make the static separation tests green**

  Ensure the source guards prove:

  ```text
  candidate/live Console: no .fp-, no .fp-app, no generated distribution comment
  generated roots: no Console key/path/version reference
  Console 1.4 and 1.5: hash-identical to their pre-task snapshots
  generated 2.1/2.2/2.3: existing canonical evidence still verifies unchanged
  candidate/live map: every one of the three bytes/digests matches 1.6
  ```

- [ ] **Step 4: Run candidate and historic identity evidence**

  Run:

  ```powershell
  py -3.12 -m unittest tests.api.test_factory_ui_kit tests.api.test_console_ui_sources -v
  ```

  Expected: candidate 1.6 and its live map verify; tampering the live CSS
  fails `console_candidate_copy_digest_mismatch`; 1.4/1.5 snapshots and every
  generated distribution verification remain unchanged.

### Task 3: Repair and prove deterministic Console presentation lifecycle and generated independence

**Files:**
- Modify for the P1 repair:
  `apps/console-next/components/factory-ui/lineage-dag.tsx`
- Modify only if a demonstrated gap requires it:
  `tests/web/console-next-e2e.mjs`
- Modify only if a demonstrated gap requires it:
  `tests/web/console-next-accessibility.mjs`
- Modify only if a demonstrated gap requires it:
  `tests/web/generated-approval-app-e2e.mjs`
- Modify only if a demonstrated gap requires it:
  `tests/web/generated-composable-preview-e2e.mjs`

**Interfaces:**
- Consumes: candidate 1.6 live Console mapping, frozen Console interaction
  invariants, and untouched generated 2.3 package family/fixture outputs.
- Produces: an epoch-safe `LineageDag` refit lifecycle and browser evidence
  that repeated Restore/Close→Open containment is deterministic while Console
  behavior and generated app behavior remain independently styled and runnable.
- Does not produce: changed product requirements, generated package edits,
  new browser dependencies, model calls, cloud targets, or fixture-contract
  changes.

- [ ] **Step 1: Run existing browser gates before changing browser tests**

  Run:

  ```powershell
  node tests/web/console-next-e2e.mjs
  node tests/web/console-next-accessibility.mjs
  node tests/web/generated-approval-app-e2e.mjs
  node tests/web/generated-composable-preview-e2e.mjs
  ```

  Expected: Console workflow retains lifecycle, 14-package Lineage geometry,
  Products/Evidence/Command/Stop placement, and no browser error caused by
  absent `.fp-*` rules. Generated app proof still passes signed-out isolation,
  role-aware submit/approve/audit, and generated runtime/Docker cleanup without
  loading a Console stylesheet.

- [ ] **Step 2: Diagnose the Restore lifecycle race before changing it**

  Use `.agents/skills/systematic-debugging` and preserve its evidence in the
  ledger. Reproduce the first-run 1440×900 failure using the existing
  `tests/web/console-next-e2e.mjs` containment helper at lines 556–559.
  Record whether React Flow reports stale canvas dimensions, whether a
  ResizeObserver callback arrives before/after the Restore size commit, and
  whether a pending animation frame from a prior compact/full state applies a
  stale `fitView`. Do not alter the graph model, node positions, edge data,
  selected-node state, or any generated source while diagnosing.

- [ ] **Step 3: Write a repeated failing Restore/Close→Open geometry regression**

  In `tests/web/console-next-e2e.mjs`, reuse the existing rendered-canvas
  measurement helper that checks every `.react-flow__node` rectangle and both
  `getScreenCTM()`-transformed endpoints of every `.react-flow__edge-path`.
  At 1440×900, run at least five complete cycles:

  ```text
  open compact Lineage → maximize → restore → measure containment
  → close → reopen → measure containment
  ```

  Then resize to 1280×720 and run at least three identical cycles. Await the
  existing ready/settled condition before each measurement; do not replace
  measurement with model-coordinate assertions or fixed sleeps. The RED test
  must fail on the prior stale-refit implementation with the reported Restore
  overflow or another actual out-of-canvas rect/endpoint.

- [ ] **Step 4: Implement an epoch-safe post-size-commit refit in `LineageDag`**

  Keep the existing `ReactFlowInstance` ref and selection state. Add a
  monotonically increasing lifecycle epoch (`refitEpochRef`) and a cancellable
  frame handle. Every graph/compact/maximize/restore/reopen transition and the
  `ResizeObserver` callback increments the epoch and schedules a refit for the
  captured epoch. The callback must wait through two animation-frame turns:

  ```ts
  const epoch = ++refitEpochRef.current;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (epoch !== refitEpochRef.current || !canvas.isConnected) return;
    flowRef.current?.fitView({ padding: compact ? 0.12 : 0.16, duration: 0 });
  }));
  ```

  Before `fitView`, re-read nonzero canvas width/height from the current DOM
  node. Cancel pending frames and invalidate the epoch on unmount/Close. This
  ensures a superseded pre-Restore callback cannot refit a post-Restore canvas.
  Do not clear selection, mutate nodes/edges, persist state, call an API, or
  change the three-file asset map.

- [ ] **Step 5: Make lifecycle and separation regressions green**

  Run the repeated browser regression from Step 3 at 1440×900 and 1280×720.
  Each cycle must report all node rectangles and both transformed edge
  endpoints inside the current canvas. Then run the existing Console and
  generated browser gates. Record every cycle's node/edge count and any
  isolated runner cleanup outcome in the ledger.

- [ ] **Step 6: Add a browser separation assertion only when the existing gate cannot observe it**

  If needed, add a read-only DOM assertion in the Console test that the active
  Console document has no `.fp-app` root and an assertion in the generated-app
  test that its application root uses its packaged canonical stylesheet rather
  than a URL/path containing `console-next` or `factory-ui-console`. Keep all
  existing workflow assertions. Do not assert implementation-only generated
  stylesheet hashes in browser tests; API identity tests own digest evidence.

- [ ] **Step 7: Run full behavior and source gate**

  Run:

  ```powershell
  npm --prefix apps/console-next run preflight
  npm --prefix apps/console-next run build
  node tests/web/console-next-e2e.mjs
  node tests/web/console-next-accessibility.mjs
  node tests/web/generated-approval-app-e2e.mjs
  node tests/web/generated-composable-preview-e2e.mjs
  git diff --check
  ```

  Expected: all behavior passes without a Console-to-generated stylesheet
  dependency; no test starts/stops a user-owned service, and isolated runner
  cleanup remains limited to its validated temporary copy.

### Task 4: Governed hand-off, review, and acceptance

**Files:**
- Modify: `docs/superpowers/ledgers/cui-08-console-generated-asset-topology-cleanup.md`

**Interfaces:**
- Consumes: Task 1–3 RED/GREEN evidence and immutable root snapshots.
- Produces: a complete hand-off that permits read-only task review, QA, and
  independent release review.

- [ ] **Step 1: Record the writer hand-off**

Record exact commands/output, changed paths, candidate 1.6 manifest/copy
digests, 1.4/1.5 and generated-root immutability evidence, browser/Docker
cleanup result, and residual risk. Do not mark the ledger ready for QA.

- [ ] **Step 2: Task-review gate**

  A read-only task reviewer verifies the source contract, selector boundary,
  truthful candidate identity, live-map digests, historic/generated
  immutability, absence of Console references in generated sources, and all
  acceptance criteria. P0/P1 returns to the same integration writer.

- [ ] **Step 3: QA gate**

  QA reruns the API identity/source suite, preflight/build, Console
  workflow/accessibility suite, and generated browser/composable-preview
  suite. QA may modify only a named browser regression after evidence shows a
  gap; it cannot alter assets, contracts, or ledger state.

- [ ] **Step 4: Independent release review and PM decision**

  The release reviewer reruns all gates and confirms that CUI-08 neither
  promotes 1.6 nor alters any generated asset. PM may move the ledger through
  `reviewed → accepted` only if QA/release review report no unresolved P0/P1.
  The accepted result remains a candidate-only source-topology correction.

## CUI-08 Verification Matrix

| Requirement | Required evidence |
| --- | --- |
| Explicit topology contract | Contract names canonical roots, selector owners, live map, immutable roots, and rejection IDs. |
| Candidate/live identity | 1.6 manifest and all three live files verify byte-for-byte; a deliberate live-copy mutation fails closed. |
| Console CSS separation | Candidate/live source scans reject `.fp-`, `.fp-app`, and generated distribution comment/region. |
| Generated independence | Generated sidecars/templates reject Console key/path/version references; existing generated verifier passes unchanged. |
| Historic immutability | Pre/post byte snapshots prove Console 1.4/1.5 and all generated roots unchanged. |
| Console usability | Preflight/build plus workflow/accessibility prove the accepted overlay, keyboard/focus/theme/reduced-motion behavior and repeated epoch-safe Restore/Close→Open Lineage containment at 1440×900 and 1280×720. |
| Generated usability | Generated approval/composable-preview browser evidence proves signed-out and role-aware flow plus cleanup with no Console CSS dependency. |
| Governance | Task review, QA, independent release review, and PM acceptance have no unresolved P0/P1; no Golden promotion. |

## Execution Handoff

This plan starts only after PM moves the matching CUI-08 ledger from
`planned` to `implementing` and assigns one serialized `integration` writer.
The first writer must read `AGENTS.md`, `docs/project-status.md`,
`docs/contracts/factory-ui-console-v1.3.md`, this plan, the CUI-08 ledger,
and the frozen topology contract before editing. No commit, branch, external
publication, deployment, real model call, or generated-asset mutation is
implied by this plan.
