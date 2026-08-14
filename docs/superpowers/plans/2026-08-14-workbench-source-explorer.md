# Workbench Source Explorer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a truthful read-only Source explorer for one succeeded immutable Compilation using its registered manifest and existing digest-verifying content endpoint.

**Architecture:** Harden the Workbench client boundary around selected artifact content, make the controller latest-selection authoritative, and extend the existing Code canvas with a complete path-ordered artifact tree and verified viewer. No Control Plane, Graph, compiler, persistence, dependency, or runtime path changes.

**Tech Stack:** TypeScript, React 19, Next.js 15, Vitest, React DOM test utilities, Playwright, existing Workbench Control Plane client.

## Global Constraints

- Base and upstream are exactly `35da63df867dc0271254b1cbad38e5613a27c348`; Task 7D is delivered there.
- The visible journey is exactly `Builder -> Code -> Source` and is enabled only for a `succeeded` immutable Compilation.
- Reuse `GET /compilations/:compilationId` and `GET /compilations/:compilationId/artifact-content?path=...`; no Control Plane route or code change.
- The artifact manifest is tree authority. Content is visible only after exact selected path/digest admission and the existing server rehash.
- Selection clears stale content. Pending shows the selected path with no old code. Failure shows no unverified code. Only the latest selection may settle visible state.
- Defer search, diff, editing, overlays, ZIP, Git, export, Draft Preview Snapshot content, and current-Draft source claims.
- No Graph, Capabilities, Product/Screen/Experience Recipe, Compiler, generated runtime, Prisma/database, dependency/package/lock, provider/network/service, Docker, Compose, or deployment change.
- One writer owns exactly the nine implementation paths below. The ninth is test-only fixture repair; any tenth path is a PM stop.
- Do not run `pnpm`, `corepack`, install, network, provider/model, service, Docker, or Compose commands. Use only existing local runtimes.

---

## Exact implementation manifest

1. `apps/workbench/lib/control-plane-client.ts`
2. `apps/workbench/lib/control-plane-client.test.ts`
3. `apps/workbench/hooks/use-workbench-controller.ts`
4. `apps/workbench/components/workbench.tsx`
5. `apps/workbench/components/canvases/code-canvas.tsx`
6. `apps/workbench/components/canvases/code-canvas.test.tsx` (new)
7. `apps/workbench/app/globals.css`
8. `apps/workbench/e2e/source-explorer.pw.ts` (new)
9. `apps/workbench/components/shell/workbench-shell.test.tsx`

## Frozen interfaces

```ts
export type WorkbenchCompilationArtifact = {
  readonly path: string;
  readonly digest: string;
  readonly mediaType: string;
  readonly sizeBytes?: number | null;
};

export function admitCompilationArtifactContent(
  input: unknown,
  selected: WorkbenchCompilationArtifact,
): WorkbenchArtifactContent;

getCompilationArtifact(
  compilationId: string,
  selected: WorkbenchCompilationArtifact,
): Promise<WorkbenchArtifactContent>;
```

The controller adds:

```ts
readonly selectedArtifact: WorkbenchCompilationArtifact | null;
readonly artifactError: string | null;
readonly inspectArtifact: (artifactPath: string) => void;
```

The fixed malformed-response and visible failure messages are respectively:

```text
Control Plane artifact response is invalid.
Generated artifact could not be inspected.
```

## Task 1: Strict manifest and artifact-content admission

**Files:**

- Modify: `apps/workbench/lib/control-plane-client.test.ts`
- Modify: `apps/workbench/lib/control-plane-client.ts`

**Produces:** `WorkbenchCompilationArtifact` and the pure
`admitCompilationArtifactContent` boundary used by Task 2.

- [x] **Step 1: Write the failing manifest-descriptor tests**

  Add focused cases around `getCompilation` proving a succeeded Compilation
  admits and preserves every valid registered descriptor, rejects duplicate or
  empty/absolute/backslash/dot-segment paths, rejects malformed SHA-256,
  nonempty-media-type violations, and unsafe optional byte sizes, and does not
  mutate the response when consumers later sort a copy.

  ```ts
  expect(compilation.artifacts).toEqual([
    {
      path: "api/package.json",
      digest: `sha256:${"a".repeat(64)}`,
      mediaType: "application/json",
      sizeBytes: 128,
    },
    {
      path: "web/app/page.tsx",
      digest: `sha256:${"b".repeat(64)}`,
      mediaType: "text/typescript",
      sizeBytes: 256,
    },
  ]);
  ```

- [x] **Step 2: Write the failing exact-response tests**

  Table-drive either JSON key order, exact path/digest match, and frozen copied
  success. Reject null, arrays, custom prototypes, inherited, extra, symbol,
  non-enumerable, accessor, boxed, throwing/revoked Proxy, wrong path/digest,
  malformed digest, non-string content, and content beyond the server's
  1,000,000-byte boundary. Assert getters/conversion hooks remain zero where
  observable and every rejection has only the fixed message.

  ```ts
  const admitted = admitCompilationArtifactContent(
    { content: "export const ready = true;\n", digest, path },
    { path, digest, mediaType: "text/typescript", sizeBytes: 27 },
  );
  expect(admitted).toEqual({
    path,
    digest,
    content: "export const ready = true;\n",
  });
  expect(Object.isFrozen(admitted)).toBe(true);
  ```

- [x] **Step 3: Run the focused RED**

  From `apps/workbench`:

  ```powershell
  node node_modules/vitest/vitest.mjs run lib/control-plane-client.test.ts
  ```

  Expected: FAIL because the exported type/parser and descriptor-bound method
  do not exist and current artifact parsing admits invalid descriptors.

- [x] **Step 4: Implement the minimal strict admission primitive**

  Introduce the exported descriptor type, validate safe unique artifact rows in
  `compilationResponse`, and implement bounded own-descriptor capture for the
  exact three-property response. Return only a frozen primitive copy. Keep the
  existing client method signature until Task 2 changes its consumer and method
  atomically.

  ```ts
  return Object.freeze({
    path: pathDescriptor.value,
    digest: digestDescriptor.value,
    content: contentDescriptor.value,
  });
  ```

- [x] **Step 5: Run the focused GREEN**

  ```powershell
  node node_modules/vitest/vitest.mjs run lib/control-plane-client.test.ts
  ```

  Expected: PASS with no response material printed.

## Task 2: Source vertical slice and latest-selection authority

**Files:**

- Modify: `apps/workbench/lib/control-plane-client.ts`
- Modify: `apps/workbench/lib/control-plane-client.test.ts`
- Modify: `apps/workbench/hooks/use-workbench-controller.ts`
- Modify: `apps/workbench/components/workbench.tsx`
- Modify: `apps/workbench/components/canvases/code-canvas.tsx`
- Create: `apps/workbench/components/canvases/code-canvas.test.tsx`
- Modify: `apps/workbench/app/globals.css`
- Create: `apps/workbench/e2e/source-explorer.pw.ts`

**Consumes:** Task 1's admitted manifest descriptors and content parser.

**Produces:** the exact visible Builder -> Code -> Source outcome, a descriptor-
bound request, and latest-selection-authoritative controller state.

- [x] **Step 1: Write the failing succeeded-only and complete-tree tests**

  Assert queued/failed/absent Compilation exposes no interactive Source tree.
  A succeeded Compilation renders every row once in code-unit path order with
  path, media type, optional formatted size, digest accessible name, and a
  path callback from the exact row. Prove the input artifact array order is
  unchanged.

  ```tsx
  expect(
    [...container.querySelectorAll("[data-source-path]")].map((node) =>
      node.getAttribute("data-source-path"),
    ),
  ).toEqual(["api/package.json", "web/app/page.tsx"]);
  ```

- [x] **Step 2: Write the failing viewer-state tests**

  Cover idle, selected pending, fixed artifact failure, mismatched content
  suppression, exact admitted success, and an unrelated `operationError` while
  admitted content remains visible. Pending/artifact failure must show the
  selected path and no `<code>` content. Selection buttons are native keyboard
  controls with visible focus and `aria-current`/selected semantics.

  ```tsx
  expect(container.textContent).toContain("Verifying registered artifact");
  expect(
    container.querySelector("[aria-label='Verified source content'] code"),
  ).toBeNull();
  ```

- [x] **Step 3: Write the failing descriptor-bound client-method test**

  Require `getCompilationArtifact(compilationId, selected)` to encode only the
  selected path, issue one GET, and apply Task 1's parser against the same
  descriptor. Prove a response with another registered path or digest rejects
  with the fixed malformed-response message.

  ```ts
  await client.getCompilationArtifact("compilation-1", artifact);
  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringContaining(
      "/compilations/compilation-1/artifact-content?path=web%2Fapp%2Fpage.tsx",
    ),
    expect.objectContaining({ method: "GET" }),
  );
  ```

- [x] **Step 4: Create the browser lifecycle RED**

  In the new E2E file, mock only existing Control Plane requests. Return one
  succeeded immutable Compilation with two registered artifacts deliberately
  out of display order. Delay valid A, make the first B request fail, and make
  the B retry return exact valid content. Navigate by keyboard, select A then B,
  and assert B pending has no A code, B failure has no code, B retry succeeds,
  and late A cannot replace B.

- [x] **Step 5: Run the focused REDs**

  ```powershell
  node node_modules/vitest/vitest.mjs run lib/control-plane-client.test.ts components/canvases/code-canvas.test.tsx
  node node_modules/playwright/cli.js test e2e/source-explorer.pw.ts --workers=1
  ```

  Expected: FAIL because the client still accepts a free path, CodeCanvas has
  no Source region, and the controller preserves stale/free-path state.

- [x] **Step 6: Implement the descriptor-bound client and controller latch**

  Change the client method atomically with its controller consumer. Preserve the
  controller's existing path callback for Activity-sheet compatibility, but
  resolve that path to exactly one current Compilation descriptor and ignore an
  absent/unregistered path. Store a fresh frozen copy of the resolved descriptor
  and a `useRef` request token. Increment the token before each selection and on
  Compilation identity change; clear content synchronously; and admit
  completion only for the latest token. Clear dedicated `artifactError` on
  selection and Compilation invalidation; only current-token failure sets the
  fixed artifact error. `operationError` remains independent and never controls
  Source visibility.

  ```ts
  const selected = compilation.artifacts?.find(
    (artifact) => artifact.path === artifactPath,
  );
  if (!selected) return;
  const token = ++artifactRequestToken.current;
  setSelectedArtifact(selected);
  setArtifactSnapshot(null);
  setArtifactError(null);
  setArtifactLoading(true);
  void controlPlane.getCompilationArtifact(compilation.id, selected).then(
    (content) => {
      if (artifactRequestToken.current === token) setArtifactSnapshot(content);
    },
    () => {
      if (artifactRequestToken.current === token)
        setArtifactError("Generated artifact could not be inspected.");
    },
  );
  ```

- [x] **Step 7: Implement and compose the minimal Source region**

  Copy and sort artifacts without mutation. Render one labelled list/tree and
  one viewer in the existing Code canvas. Gate it on exact succeeded status and
  suppress content unless its path/digest still match the selected descriptor.
  Preserve the Graph facts, diff, adapters, exchange, and preview sections.

  ```tsx
  const verified =
    artifactSnapshot?.path === selectedArtifact?.path &&
    artifactSnapshot.digest === selectedArtifact.digest
      ? artifactSnapshot
      : null;
  ```

- [x] **Step 8: Add the base accessible layout**

  Use existing tokens, native buttons, labelled list/viewer/status regions,
  `aria-current`, `aria-live`, `min-width: 0`, 44px controls, descriptor wrapping,
  code-pane scrolling, and existing focus-visible conventions. Do not add a
  stylesheet or registry asset.

- [x] **Step 9: Run focused/browser/no-emit GREEN**

  ```powershell
  node node_modules/vitest/vitest.mjs run lib/control-plane-client.test.ts components/canvases/code-canvas.test.tsx
  node node_modules/playwright/cli.js test e2e/source-explorer.pw.ts --workers=1
  node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json
  ```

  Expected: PASS. Stop instead of starting a service if the existing Playwright
  harness is unavailable.

## Task 3: Reload and 390px browser hardening

**Files:**

- Modify: `apps/workbench/app/globals.css`
- Modify: `apps/workbench/e2e/source-explorer.pw.ts`

**Consumes:** Task 2's complete vertical slice.

**Produces:** reload, keyboard, target-size, and 390px evidence without another
fixture or source path.

- [x] **Step 1: Extend the browser test with reload and narrow-view REDs**

  Reload after verified B, return to Code, and prove no content is restored
  without a new selection. At 1440px and 390px use keyboard navigation and
  assert labelled live status/viewer, visible focus, 44px selection targets,
  `documentElement.scrollWidth === clientWidth`, and no fixed-width overflow.

- [x] **Step 2: Run the browser RED**

  ```powershell
  node node_modules/playwright/cli.js test e2e/source-explorer.pw.ts --workers=1
  ```

  Expected: FAIL only on missing narrow/reload behavior or evidence.

- [x] **Step 3: Apply the minimum responsive correction**

  Keep the desktop tree/viewer split, collapse it to one column at the existing
  narrow breakpoint, and constrain both columns and code pane with `min-width: 0`
  and bounded overflow. Preserve all Task 2 authority state.

- [x] **Step 4: Run browser GREEN**

  ```powershell
  node node_modules/playwright/cli.js test e2e/source-explorer.pw.ts --workers=1
  ```

  Expected: one serialized journey passes at both widths and after reload.

## Task 4: Compatibility, review, and delivery gates

**Files:** all exact nine implementation paths; no additional path.

Evidence: independent re-review is clean; targeted Terra returns `PASS`; final
Sol after the P2 characterization returns `RELEASE_ACCEPT`, actionable
P0/P1/P2=0/0/0; and `PM_DELIVERY_AUTHORITY YES` covers only the exact 15 paths.
The A/B characterization pins stale failure plus valid success so only the
current token controls artifact error and admitted content.

- [x] **Step 1: Repair only the malformed shell-test digest, then rerun tests**

  The first full Workbench run is the recorded RED: 480/482 pass; the only two
  failures share `sha256:journey` in
  `apps/workbench/components/shell/workbench-shell.test.tsx`. The strict client
  correctly rejects that malformed mock. Change only that existing test value
  to one valid `sha256:` digest with exactly 64 lowercase hexadecimal digits;
  do not weaken validation, synthesize a digest, or change production code.

  ```powershell
  node node_modules/vitest/vitest.mjs run components/shell/workbench-shell.test.tsx
  node node_modules/vitest/vitest.mjs run lib/control-plane-client.test.ts components/canvases/code-canvas.test.tsx
  node node_modules/vitest/vitest.mjs run
  ```

  Expected: all Workbench tests pass with no snapshot update.

- [x] **Step 2: Run no-emit and Next build**

  ```powershell
  node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json
  node node_modules/next/dist/bin/next build
  ```

  Expected: both pass using existing local dependencies.

- [x] **Step 3: Rerun the targeted browser**

  ```powershell
  node node_modules/playwright/cli.js test e2e/source-explorer.pw.ts --workers=1
  ```

- [x] **Step 4: Prove exact containment and static evidence**

  Require Expected9/Actual9 implementation equality, index zero, and no
  unrelated untracked path. Run direct Prettier check on the exact nine,
  `git diff --check`, browser-import closure, no focused tests or temporary
  markers, no logging/input echo, no route/Control Plane/Graph/Compiler/Prisma/
  dependency/lock drift, and no sensitive material in changed hunks.

- [x] **Step 5: Independent intended-vs-implemented review**

  Pause the writer. One fresh read-only reviewer reconciles ADR-0017, design,
  plan, delivery policy, exact diff, server reader authority, manifest binding,
  hostile response admission, stale-selection latch, succeeded-only UI,
  dedicated artifact-error isolation, accessibility/responsive behavior, tests,
  and exact containment. Any P0/P1
  returns to the same writer for bounded TDD repair inside the exact nine,
  followed by re-review.

- [x] **Step 6: Targeted real-browser QA**

  On the independently reviewed tree, one fresh read-only QA pass reruns the
  focused suites and exact Playwright journey and probes malformed/extra/
  accessor responses, path/digest mismatch, failure clearing, A/B race,
  keyboard focus, reload, and 390px overflow. No broad cross-package or service
  gate is required for this ordinary Workbench-only slice.

- [x] **Step 7: Final Sol response-boundary review**

  One fresh independent Sol reviewer inspects the exact QA-passed tree and may
  return release acceptance only with actionable P0/P1=0, exact-nine
  containment, and no weakening of server rehash or client descriptor binding.

- [ ] **Step 8: Controller-only delivery (PM acceptance complete)**

  PM/controller stages exactly nine implementation plus six governance paths,
  proves Expected15/Actual15 equality with zero missing, unexpected, unstaged,
  or untracked path, runs staged diff/sensitive checks, and commits exactly:

  ```text
  feat(workbench): add governed source explorer
  ```

  Push without force, then prove local `HEAD` equals upstream and the worktree
  and index are clean. Any equality or containment failure stops delivery.

## Exact controller governance manifest

1. `docs/adr/adr-0017-workbench-source-explorer.md`
2. `docs/project-status.md`
3. `docs/roadmap.md`
4. `docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md`
5. `docs/superpowers/plans/2026-08-14-workbench-source-explorer.md`
6. `docs/superpowers/specs/2026-08-14-workbench-source-explorer-design.md`

## Stop conditions

Stop before any tenth implementation path; new Control Plane route/code;
Compilation creation; Draft Preview Snapshot source; search/diff/edit/overlay/
ZIP/Git/export; Graph/Capabilities/recipe/Compiler/generated-runtime; Prisma/
database; dependency/package/lock; provider/network/service; Docker/Compose;
deployment; or Access/Workflow authority change. A server/client descriptor
mismatch is a failure to display, never permission to relabel or recover from
unregistered content.
