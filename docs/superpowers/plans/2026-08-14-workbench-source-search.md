# Workbench Source Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add local manifest-path filtering and inert find-in-current-file highlighting to the delivered verified Source Explorer.

**Architecture:** Keep both queries and all derived results inside `CodeCanvas`; consume only the already admitted Compilation manifest and current verified artifact content. Path filtering never requests content, and find renders bounded React text/`mark` children without HTML parsing or another authority boundary.

**Tech Stack:** TypeScript, React 19, Next.js 15, Vitest, React DOM test utilities, Playwright, existing Workbench Source Explorer.

## Global Constraints

- Base and upstream are exactly `8c2767bb2c333d2086ca1b2d0f8cdc4c348bf7f0`; Task 8A is delivered there.
- The founder standing instruction `参考以下总结，若符合项目目标，则持续接受而迭代。` covers this bounded, reversible, deterministic UI slice. No Tech Lead dispatch or ADR is required because no stable API, Graph, security, runtime, persistence, dependency, or lifecycle contract changes.
- Add two separate controls inside the existing verified Source Explorer: `Filter source files` and `Find in current file`.
- Both queries are literal, case-insensitive, deterministic, and limited to 120 UTF-16 code units through controlled inputs with `maxLength={120}` plus an `onChange` clamp using `.slice(0, 120)`.
- Path filtering consumes only registered manifest paths, shows all paths when empty, shows an explicit no-result state, and never invokes `onInspectArtifact` or any network/client action while typing.
- Find consumes only the current `verifiedArtifact.content`; it is cleared and disabled during selection pending/failure and on Compilation invalidation.
- Find reports the exact count of non-overlapping literal matches. It renders at most the first 500 match ranges as React `<mark>` elements and preserves the remaining source as inert text, preventing 1 MB content from creating an unbounded DOM.
- Never use `dangerouslySetInnerHTML`, an HTML parser, raw HTML injection, or content-driven React elements.
- Do not preload or search every artifact. Do not add an API, client, hook, controller, service, index, worker, or persisted search state.
- Defer semantic search, regex, replacement, Diff, editing, Source Overlay, ZIP, Git, export, Draft Preview Snapshot content, and Compilation creation.
- One Sol writer owns exactly four implementation paths. Any fifth implementation path is a PM stop.
- Do not run package-manager, install, network, provider/model, service, Docker, or Compose commands. Use existing local runtimes only.

---

## Exact implementation manifest

1. `apps/workbench/components/canvases/code-canvas.tsx`
2. `apps/workbench/components/canvases/code-canvas.test.tsx`
3. `apps/workbench/app/globals.css`
4. `apps/workbench/e2e/source-explorer.pw.ts`

## Frozen local behavior

No exported interface changes. `CodeCanvas` adds local state and pure private
helpers equivalent to:

```ts
const maximumSourceQueryLength = 120;
const maximumRenderedSourceMatches = 500;

type SourceMatchPlan = {
  readonly count: number;
  readonly ranges: readonly {
    readonly start: number;
    readonly end: number;
  }[];
};
```

`buildSourceMatchPlan(content, query)` treats a nonempty query as an escaped
literal Unicode case-insensitive global pattern. Matches are non-overlapping;
`count` scans the complete admitted content, while `ranges` retains at most 500
original-string code-unit spans. Rendering slices the original string into
React text and `<mark>` children. Empty query returns count zero, no ranges, and
the unchanged source with no match-count message.

The accessible result messages are exact:

```text
No source files match.
No matches.
1 match.
{count} matches.
{count} matches. Highlighting the first 500.
```

## Task 1: Component-local path filtering and find admission

**Files:**

- Modify: `apps/workbench/components/canvases/code-canvas.test.tsx`
- Modify: `apps/workbench/components/canvases/code-canvas.tsx`

**Consumes:** existing sorted Compilation artifacts and `verifiedArtifact`.

**Produces:** two independent local searches with no request or authority
change.

- [x] **Step 1: RED the manifest-path filter**

  Render three mixed-case paths. Type into the labelled `Filter source files`
  input and assert literal case-insensitive path matching, original path order,
  empty-query restoration, and `No source files match.` for zero rows. Keep an
  `onInspectArtifact` spy at zero throughout typing and clearing.

  ```tsx
  changeInput("Filter source files", "WEB/APP");
  expect(sourcePaths()).toEqual(["web/app/page.tsx"]);
  expect(onInspectArtifact).not.toHaveBeenCalled();
  ```

- [x] **Step 2: RED find availability and invalidation**

  Assert `Find in current file` is disabled with no selection, pending content,
  fixed artifact failure, path/digest mismatch, and non-succeeded Compilation.
  Start from verified content with a query, then rerender each invalid state and
  prove the controlled query clears, the input disables, all `<mark>` elements
  disappear, and no artifact request fires.

- [x] **Step 3: RED exact literal matching and inert rendering**

  Cover empty, no-match, one-match, mixed-case multi-match, regex metacharacter,
  and non-overlapping results. Use hostile source containing `<script>` and
  `<img onerror>` text; assert exact original `textContent`, expected `<mark>`
  text, and zero `script`/`img` elements. Prove no `dangerouslySetInnerHTML` and
  no `onInspectArtifact` call from find typing.

  ```tsx
  changeInput("Find in current file", "SCRIPT");
  expect(matchStatus()).toBe("2 matches.");
  expect(viewer.querySelectorAll("mark")).toHaveLength(2);
  expect(viewer.querySelector("script")).toBeNull();
  ```

- [x] **Step 4: RED query and render caps**

  Assert both inputs expose `maxLength=120`. Use admitted content with more than
  500 one-character matches; require the exact total, exactly 500 `<mark>`
  elements, the message `{count} matches. Highlighting the first 500.`, and
  complete original viewer `textContent` apart from the separate status copy.

- [x] **Step 5: Run the component RED**

  From `apps/workbench`:

  ```powershell
  node node_modules/vitest/vitest.mjs run components/canvases/code-canvas.test.tsx
  ```

  Expected: FAIL because the two inputs, match planning, inert highlighting,
  invalidation, and caps do not exist.

- [x] **Step 6: GREEN the smallest local implementation**

  Import only React `useEffect`, `useMemo`, `useRef`, and `useState`. Keep the
  path filter independent from selection. Derive filtered rows with a lowercase
  literal `includes` comparison. Derive an effective empty find query whenever
  `verifiedArtifact` is null, and use an effect keyed by Compilation identity,
  selected path/digest, loading, error, and verified path/digest to clear stored
  find state on invalidation.

  Implement an escaped literal `/giu` scan for original-string match indices,
  exact counting, and 500-range retention. Render source through React slices:

  ```tsx
  <code>
    {renderSourceWithMarks(verifiedArtifact.content, sourceMatchPlan.ranges)}
  </code>
  ```

  Do not change `onInspectArtifact`, Source props, the client, or controller.

- [x] **Step 7: Run focused component GREEN**

  ```powershell
  node node_modules/vitest/vitest.mjs run components/canvases/code-canvas.test.tsx
  ```

  Expected: PASS with exact inert text and zero request calls from either input.

## Task 2: Accessible responsive search controls

**Files:**

- Modify: `apps/workbench/components/canvases/code-canvas.test.tsx`
- Modify: `apps/workbench/components/canvases/code-canvas.tsx`
- Modify: `apps/workbench/app/globals.css`

**Consumes:** Task 1 local behavior.

**Produces:** labelled keyboard controls, bounded result status, and 390px-safe
layout using existing Source tokens.

- [x] **Step 1: RED accessibility semantics**

  Require native `type="search"` inputs with exact visible labels, unique label
  association, accessible match/no-result status, disabled semantics for find,
  source-list navigation preserved after filtering, and `<mark>` styling that
  does not remove text contrast. Verify tab order is filter, artifact rows, find,
  then existing downstream controls.

- [x] **Step 2: RED the narrow CSS contract**

  Pin selectors for 44px controls, `min-width: 0`, query text overflow safety,
  wrapped result copy, highlighted text inheritance, and the existing 390px
  single-column Source layout. No fixed pixel width may be added to either
  input.

- [x] **Step 3: Run accessibility/CSS RED**

  ```powershell
  node node_modules/vitest/vitest.mjs run components/canvases/code-canvas.test.tsx
  ```

- [x] **Step 4: GREEN the existing-source styling**

  Add only Source-scoped form, status, and `mark` rules in `globals.css`. Reuse
  current colors, borders, radius, monospace type, focus-visible treatment, and
  narrow breakpoint. Do not add a component, registry asset, or stylesheet.

- [x] **Step 5: Run component GREEN**

  ```powershell
  node node_modules/vitest/vitest.mjs run components/canvases/code-canvas.test.tsx
  ```

## Task 3: Real-browser local-only proof

**Files:**

- Modify: `apps/workbench/e2e/source-explorer.pw.ts`

**Consumes:** existing Task 8A route counters and Task 1-2 UI.

- [x] **Step 1: RED path filtering without content loading**

  Before selecting a file, record artifact-content request count. Filter with
  mixed case, assert only matching registered paths remain, exercise the no-
  result state, clear to restore all rows, and prove the request count never
  changes.

- [x] **Step 2: RED current-file find across authority states**

  Assert find is disabled before selection, pending, and fixed failure. After a
  verified retry, search mixed-case hostile literal content, assert exact match
  count and `<mark>` text with no executable DOM node, then select another file
  and prove the query/highlights clear immediately while pending.

- [x] **Step 3: RED keyboard and 390px behavior**

  Use keyboard focus for both search inputs and artifact selection. At 1440px
  and 390px assert 44px inputs, live result copy, complete source text, and
  `documentElement.scrollWidth === clientWidth`.

- [x] **Step 4: Run browser GREEN**

  ```powershell
  node node_modules/playwright/cli.js test e2e/source-explorer.pw.ts --workers=1
  ```

  Expected: the serialized Source journey passes without a new route, service,
  or content preload.

## Task 4: Compatibility, review, and delivery

**Files:** exact four implementation paths only.

Evidence: mandatory TDD RED is unit 6/15 plus browser 1/1; initial GREEN is
focused 15, full Workbench 488, no-emit, Next, and browser 1/1. Independent
review found one P1: same-ID Compilation replacement retained stale find state.
Repair RED 1/16 becomes GREEN 16/16; fresh full Workbench 489, no-emit, Next,
browser 1/1, and exact-eight static gates pass. The same reviewer closes with
P0/P1/P2=0/0/0 and `READY_FOR_DELIVERY YES`.

- [x] **Step 1: Run focused and full Workbench tests**

  ```powershell
  node node_modules/vitest/vitest.mjs run components/canvases/code-canvas.test.tsx
  node node_modules/vitest/vitest.mjs run
  ```

  Expected: all Workbench tests pass with no snapshot update.

- [x] **Step 2: Run no-emit and Next build**

  ```powershell
  node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json
  node node_modules/next/dist/bin/next build
  ```

- [x] **Step 3: Rerun the real browser**

  ```powershell
  node node_modules/playwright/cli.js test e2e/source-explorer.pw.ts --workers=1
  ```

- [x] **Step 4: Prove exact containment and static evidence**

  Require Expected4/Actual4 implementation equality and index zero. Run direct
  Prettier on the exact four, `git diff --check`, browser-import and focused-test
  scans, and explicit absence of `dangerouslySetInnerHTML`, new fetch/client/
  hook/API/search-service/index code, and sensitive material.

- [x] **Step 5: Independent review**

  Pause the writer. One fresh read-only intended-vs-implemented review
  reconciles this plan, delivery policy, exact diff, local-only request proof,
  verified-content authority, invalidation, literal/count/cap behavior, inert
  React rendering, keyboard/390px evidence, and exact-four containment. Any
  P0/P1 returns to the same Sol writer for bounded TDD repair inside the exact
  four, followed by re-review. No separate Terra or final Sol gate is required
  for this ordinary deterministic UI slice.

- [ ] **Step 6: Controller-only delivery (PM acceptance complete)**

  PM/controller stages exactly four implementation plus four governance paths,
  proves Expected8/Actual8 with zero missing, unexpected, unstaged, or unrelated
  untracked path, and runs staged diff/sensitive checks. Commit exactly:

  ```text
  feat(workbench): add source search
  ```

  Push without force, then prove local `HEAD` equals upstream and the worktree
  and index are clean. Any equality or containment failure stops delivery.

## Exact governance manifest

1. `docs/project-status.md`
2. `docs/roadmap.md`
3. `docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md`
4. `docs/superpowers/plans/2026-08-14-workbench-source-search.md`

## Stop conditions

Stop before any fifth implementation path; API/client/hook/controller change;
content preload; search service/index/worker; raw HTML; unbounded match DOM;
regex or semantic search; Diff/edit/replace/overlay/ZIP/Git/export; Draft Preview
Snapshot content; Compilation creation; Graph/Capabilities/recipe/Compiler/
runtime/Prisma/dependency/lock/provider/network/service/Docker/Compose/
deployment change. A need for any of these returns to PM instead of widening.
