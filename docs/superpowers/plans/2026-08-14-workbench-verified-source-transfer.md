# Workbench Verified Source Transfer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user copy or download only the currently verified Source Explorer file without adding another request or authority boundary.

**Architecture:** Keep transfer state and native browser effects inside `CodeCanvas`, beside the existing private `verifiedArtifact` derivation. Copy and download consume the exact admitted content already bound to the current succeeded Compilation and selected manifest path/digest; selection and authority changes invalidate local transfer state.

**Tech Stack:** TypeScript, React 19, Next.js 15, native Clipboard/Blob/Object URL APIs, Vitest, React DOM test utilities, Playwright, existing Workbench Source Explorer.

## Global Constraints

- Base and upstream are exactly `84a90c4b17fe30bc35921fb25aebf228009678be`; Task 8B Source Search is delivered there with subject `feat(workbench): add source search`.
- The founder standing instruction `参考以下总结，若符合项目目标，则持续接受而迭代。` covers this bounded, additive/reversible, local deterministic UI slice. No Tech Lead dispatch or ADR is required because it changes no stable API, Graph, security, runtime, persistence, dependency, lifecycle, or generated-source contract.
- Add exact visible actions `Copy current file` and `Download current file` inside the existing verified Source viewer. Both remain disabled unless the existing `verifiedArtifact` is non-null.
- Copy passes the exact admitted `verifiedArtifact.content` string to `navigator.clipboard.writeText` without trimming, normalization, parsing, or decoration. It uses fixed no-echo states and a monotonic token plus current-authority check so an older completion cannot update a newer selection.
- Both transfer actions are disabled while the clipboard promise is pending, so another local action cannot supersede its status; selection or authority invalidation still suppresses its late completion.
- Download creates one UTF-8 Blob from the exact admitted content with `application/octet-stream`, supplies a deterministic safe basename hint, clicks one local anchor, and revokes the Object URL exactly once from `finally` whenever creation succeeded.
- The filename helper takes only the final `/`-delimited manifest segment; replaces C0 controls, DEL, and `<>:"/\\|?*` with `_`; removes trailing periods and spaces; returns `source.txt` if the result is empty, `.` or `..`; and prefixes `_` when the result begins with Windows device stem `CON`, `PRN`, `AUX`, `NUL`, `CLOCK$`, `COM1`-`COM9`, or `LPT1`-`LPT9`, case-insensitively and before an optional extension. It never changes the manifest path or selection.
- Fixed transfer copy is exact: `Copying current file…`, `Copied current file.`, `Current file could not be copied.`, `Download started.`, and `Current file could not be downloaded.` No source, path, digest, browser error, or hostile value is logged or echoed.
- Selection, selection pending/failure, or Compilation invalidation disables both actions, increments the transfer token, and clears transfer state. Transfer actions do not clear verified content on their own.
- Copy/download never call `onInspectArtifact`, `fetch`, the Control Plane client, or any endpoint. Existing path filter, current-file find, verified viewer, selection races, and unrelated operation errors remain unchanged.
- Do not add a component, client, hook, controller, API, Control Plane path, Graph/Capability/recipe/Compiler/runtime path, Prisma/database path, dependency/lockfile, provider/network/service, Docker/Compose, or deployment change.
- ZIP is stopped because no bounded archive/export contract or direct Workbench ZIP dependency exists. Source Diff is stopped because no durable discoverable previous-Compilation baseline exists. Git and Source Overlay remain deferred.
- One Sol writer owns exactly four implementation paths. Any fifth implementation path is a PM stop.
- Do not run package-manager, install, network, provider/model, service, Docker, or Compose commands. Use existing local runtimes only.

---

## Exact implementation manifest

1. `apps/workbench/components/canvases/code-canvas.tsx`
2. `apps/workbench/components/canvases/code-canvas.test.tsx`
3. `apps/workbench/app/globals.css`
4. `apps/workbench/e2e/source-explorer.pw.ts`

## Frozen private interfaces

Keep all additions private to `code-canvas.tsx`; do not export a new Workbench interface:

```ts
type SourceTransferStatus =
  | "Copying current file…"
  | "Copied current file."
  | "Current file could not be copied."
  | "Download started."
  | "Current file could not be downloaded."
  | null;

function sourceDownloadFilename(path: string): string;
```

`sourceDownloadFilename` is exactly:

```ts
const unsafeSourceFilenameCharacterPattern =
  /[\u0000-\u001f\u007f<>:"\/\\|?*]/gu;
const trailingSourceFilenameCharacterPattern = /[. ]+$/u;
const windowsDeviceSourceFilenamePattern =
  /^(?:con|prn|aux|nul|clock\$|com[1-9]|lpt[1-9])(?:\.|$)/iu;

function sourceDownloadFilename(path: string): string {
  const basename = path.split("/").at(-1) ?? "";
  const scrubbed = basename
    .replace(unsafeSourceFilenameCharacterPattern, "_")
    .replace(trailingSourceFilenameCharacterPattern, "");
  if (scrubbed === "" || scrubbed === "." || scrubbed === "..") {
    return "source.txt";
  }
  return windowsDeviceSourceFilenamePattern.test(scrubbed)
    ? `_${scrubbed}`
    : scrubbed;
}
```

The transfer authority is the current succeeded Compilation identity plus the currently selected and admitted path/digest. Copy captures both an incremented token and that authority; success or failure may set state only when both still equal the current values.

## Task 1: Verified-only copy and safe single-file download

**Files:**

- Modify: `apps/workbench/components/canvases/code-canvas.test.tsx`
- Modify: `apps/workbench/components/canvases/code-canvas.tsx`

**Consumes:** the existing private `verifiedArtifact`, current Compilation, selected manifest descriptor, loading/error state, and `onInspectArtifact` callback.

**Produces:** two local verified-only actions, a safe filename hint, and fixed local transfer status.

- [x] **Step 1: RED verified-only action admission**

  Extend the component test helper to locate `Copy current file` and `Download current file`. Assert both are disabled with no selection, queued/failed Compilation, loading, artifact error, null content, and path/digest mismatch; both enable only for the existing admitted `verifiedArtifact`.

  ```tsx
  expect(buttonLabelled("Copy current file").disabled).toBe(true);
  expect(buttonLabelled("Download current file").disabled).toBe(true);
  ```

  Rerender verified content and require both to enable without another `onInspectArtifact` call.

- [x] **Step 2: RED exact asynchronous copy and fixed failure**

  Stub `navigator.clipboard.writeText` with a controllable promise. Click copy and require the single call argument to be byte-for-byte the admitted content string, including Unicode and hostile HTML text. Require `Copying current file…`, then the fixed success after resolution. Reject with hostile error material and require only `Current file could not be copied.`, with verified content and existing find highlights preserved.

  ```tsx
  expect(writeText).toHaveBeenCalledWith(verifiedContent);
  expect(transferStatus()).toBe("Copied current file.");
  expect(container.textContent).not.toContain("HOSTILE_CLIPBOARD_DETAIL");
  ```

- [x] **Step 3: RED the copy race**

  Start copy for artifact A, then select or rerender pending artifact B before A resolves or rejects. Require transfer state to clear synchronously, both actions to disable for B, and A's late completion to leave B with no transfer status. Prove the old copy was authorized exactly once with A's content and never claims B was copied.

- [x] **Step 4: RED safe filename and exact download bytes**

  Capture the Blob passed to `URL.createObjectURL`, the temporary anchor's `href`/`download`, its click, and `URL.revokeObjectURL`. Cover ordinary nested paths, C0/DEL and `<>:"/\\|?*`, trailing period/space, a valid manifest basename such as `...` that scrubs empty, and case-insensitive Windows device names with extensions.

  ```text
  web/app/page.tsx         -> page.tsx
  web/report<final>?.tsx   -> report_final__.tsx
  web/...                  -> source.txt
  api/CON.json             -> _CON.json
  ```

  Require the Blob's bytes to equal `new TextEncoder().encode(content)`, its type to be `application/octet-stream`, the anchor to click once, and the created URL to be revoked once even when `click()` throws. Creation or click failure uses only `Current file could not be downloaded.`; success uses only `Download started.`.

- [x] **Step 5: Run the focused RED**

  From `apps/workbench`:

  ```powershell
  node node_modules/vitest/vitest.mjs run components/canvases/code-canvas.test.tsx
  ```

  Expected: FAIL because the transfer controls, filename rule, local status, token race, and deterministic URL cleanup do not exist.

- [x] **Step 6: GREEN the smallest private implementation**

  Add only private helpers/state/refs in `CodeCanvas`. Derive an authority key from the current Compilation plus selected/admitted path and digest. Invalidate the token and status before invoking `onInspectArtifact`, and in an effect keyed by the existing Compilation/selection/loading/error/verified dependencies. Copy catches locally and checks token plus authority before setting a fixed terminal state.

  Download must use the exact cleanup shape:

  ```ts
  let objectUrl: string | null = null;
  try {
    objectUrl = URL.createObjectURL(
      new Blob([verifiedArtifact.content], {
        type: "application/octet-stream",
      }),
    );
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = sourceDownloadFilename(verifiedArtifact.path);
    link.click();
    setSourceTransferStatus("Download started.");
  } catch {
    setSourceTransferStatus("Current file could not be downloaded.");
  } finally {
    if (objectUrl !== null) {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {
        // Fixed no-echo state already owns user-visible reporting.
      }
    }
  }
  ```

  Do not add logging, another request, a parent callback, or an exported type.

- [x] **Step 7: Run focused GREEN**

  ```powershell
  node node_modules/vitest/vitest.mjs run components/canvases/code-canvas.test.tsx
  ```

  Expected: PASS with exact content transfer, fixed states, stale-copy suppression, safe filename hints, and deterministic URL cleanup.

## Task 2: Accessible responsive transfer controls

**Files:**

- Modify: `apps/workbench/components/canvases/code-canvas.test.tsx`
- Modify: `apps/workbench/components/canvases/code-canvas.tsx`
- Modify: `apps/workbench/app/globals.css`

**Consumes:** Task 1 actions and status.

**Produces:** native keyboard actions and 390px-safe Source-scoped presentation.

- [x] **Step 1: RED accessibility and preservation**

  Require two native `type="button"` controls beside the current-file heading, disabled semantics before verification, keyboard activation after verification, a dedicated polite status region, and no change to filter/find values or marks after copy/download. Both actions are disabled while the clipboard promise is pending and remain bound only to current verification.

- [x] **Step 2: RED narrow layout**

  Pin Source-scoped selectors for a wrapping action row, 44px minimum targets, existing focus-visible treatment, `min-width: 0`, wrapped fixed status, and zero horizontal overflow at 390px. Do not add fixed action-row width or a new token/component.

- [x] **Step 3: GREEN existing Source styling**

  Add only the smallest `.source-transfer-*` rules in `globals.css`, reusing existing Source colors, borders, radius, type, spacing, and narrow breakpoint.

- [x] **Step 4: Run focused GREEN**

  ```powershell
  node node_modules/vitest/vitest.mjs run components/canvases/code-canvas.test.tsx
  ```

## Task 3: Real-browser exact transfer proof

**Files:**

- Modify: `apps/workbench/e2e/source-explorer.pw.ts`

**Consumes:** the existing serialized Source Explorer route counters, hostile verified content, failure/pending flow, filter, and find journey.

**Produces:** one real Chromium proof that transfer stays local and current.

- [x] **Step 1: RED pending/failure and zero-request behavior**

  Assert both actions are disabled before selection, during delayed selection, and after fixed artifact failure. After verified retry, record the artifact-content request counter, use both actions, and prove the counter and all other route counters remain unchanged.

- [x] **Step 2: RED real clipboard and download bytes**

  Grant only the Playwright clipboard permission needed by the local page. Keyboard-activate copy, read clipboard text, and require exact equality with hostile verified source without executable DOM or echoed content. Capture the Playwright download, require its suggested filename to be the safe basename hint, read its bytes, and require exact UTF-8 equality with the same admitted source.

- [x] **Step 3: RED invalidation, keyboard, and 390px**

  Start another delayed selection after a successful transfer. Require transfer state to clear immediately, actions to disable, and a late completion not to restore old status. Preserve path filtering and current-file find before transfer; at 1440px and 390px verify keyboard focus, 44px targets, wrapped controls, and `documentElement.scrollWidth === clientWidth`.

- [x] **Step 4: Run browser GREEN**

  ```powershell
  node node_modules/playwright/cli.js test e2e/source-explorer.pw.ts --workers=1
  ```

  Expected: PASS with exact clipboard/download bytes, safe filename, current-authority state, zero new requests, and both viewport contracts.

## Task 4: Compatibility, independent review, and controller delivery

**Files:** exact four implementation paths only.

Evidence: mandatory RED was unit 28/44 plus browser 1/1 with production untouched. GREEN is focused 44, full Workbench 517, no-emit, Next, and browser 1/1; exact-eight static/containment gates are clean. The independent review closes P0/P1/P2=0/0/0 with `READY_FOR_DELIVERY YES`.

- [x] **Step 1: Run focused and full Workbench tests**

  ```powershell
  node node_modules/vitest/vitest.mjs run components/canvases/code-canvas.test.tsx
  node node_modules/vitest/vitest.mjs run
  ```

- [x] **Step 2: Run Workbench no-emit and Next build**

  ```powershell
  node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json
  node node_modules/next/dist/bin/next build
  ```

- [x] **Step 3: Rerun the real browser**

  ```powershell
  node node_modules/playwright/cli.js test e2e/source-explorer.pw.ts --workers=1
  ```

- [x] **Step 4: Prove exact-four containment and static evidence**

  Require Expected4/Actual4 implementation equality and index zero. Run direct Prettier on the exact four, `git diff --check`, focused-test/browser-import scans, and explicit absence of new fetch/client/hook/API/Control Plane/dependency/lock/log/raw-HTML code. Prove ZIP, Diff, Git, overlays, content preload, and extra paths remain absent.

- [x] **Step 5: Independent Sol review**

  Pause the writer. One fresh read-only intended-vs-implemented Sol review reconciles this plan, exact diff, verified-only authority, exact clipboard/download bytes, stale async suppression, basename safety, Object URL cleanup, fixed no-echo failures, zero-request behavior, filter/find preservation, accessibility/390px evidence, and exact-four containment. Any P0/P1 returns to the same writer for bounded TDD repair inside the exact four, followed by re-review. No separate Terra or final Sol gate is required for this ordinary deterministic UI slice.

- [ ] **Step 6: Controller-only exact-eight delivery (PM acceptance complete)**

  Task 8C is accepted, not delivered. PM/controller stages exactly four implementation plus four governance paths, proves Expected8/Actual8 with zero missing, unexpected, unstaged, or unrelated untracked path, and runs staged diff/sensitive checks. Commit exactly:

  ```text
  feat(workbench): add verified source transfer
  ```

  Push without force, then prove local `HEAD` equals upstream and the worktree and index are clean. Any equality or containment failure stops delivery.

## Exact governance manifest

1. `docs/project-status.md`
2. `docs/roadmap.md`
3. `docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md`
4. `docs/superpowers/plans/2026-08-14-workbench-verified-source-transfer.md`

## Stop conditions

Stop before any fifth implementation path; exported interface or parent callback; client/hook/controller/API/Control Plane change; another artifact request or content preload; clipboard/download of unverified content; non-fixed error echo; missing stale-copy suppression or URL cleanup; ZIP/archive, Source Diff/baseline, Git, edit/replace/overlay, Draft Preview Snapshot content, Compilation creation, Graph/Capabilities/recipe/Compiler/runtime/Prisma/dependency/lock/provider/network/service/Docker/Compose/deployment change. A need for any of these returns to PM instead of widening.
