# CUI-06 Isolated Console Copy Runner Extension

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` or `superpowers:executing-plans`
> task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run every CUI-06 browser harness from an owned OS-temporary copy of
the Console so Next can never write the workspace
`apps/console-next/next-env.d.ts`.

**Architecture:** Each harness creates one validated temporary directory under
the operating-system temporary root, copies the locked Console source while
excluding all build output, and links only its copied `node_modules` path to
the existing locked workspace dependency tree. Next starts with the copied
Console as its working directory and writes only an output directory inside
that copy. The harness terminates only its own spawned root, then removes only
the validated temporary copy; the workspace Console is read-only evidence.

**Tech Stack:** Node.js built-ins (`fs`, `os`, `path`, `child_process`),
existing Next.js 15 dependency tree, existing Playwright/browser fixture; no
new npm package, dependency, runtime, or production topology.

## Global Constraints

- This is a founder-authorized test-only extension of CUI-06. Only
  `tests/web/console-next-e2e.mjs` and
  `tests/web/console-next-accessibility.mjs` may change.
- The workspace `apps/console-next/next-env.d.ts` must never be written by a
  browser harness. Capture its bytes before every harness, assert equality
  while the copied runner is live, and assert equality after every success or
  controlled failure path.
- Create copies only through `mkdtempSync(join(tmpdir(),
  'factory-pilot-console-'))`. Before removal, validate that the real path is
  a direct owned child of `realpathSync(tmpdir())` and its basename begins
  `factory-pilot-console-`; reject all other removal targets.
- Copy the workspace Console source recursively except `node_modules`, `.next`,
  and every entry whose basename starts `.next-`. Do not copy current test
  output, user build output, or a workspace junction into the temporary root.
- Create exactly one local directory junction/symlink at
  `<copy>/node_modules` to the existing locked
  `apps/console-next/node_modules`. Validate `realpathSync(<copy>/node_modules)`
  equals the workspace locked dependency path. No installation, registry
  resolution, lockfile write, or dependency mutation is allowed.
- Start Next only with `cwd` equal to the copied Console root and its copied
  Next binary path. `FACTORY_CONSOLE_DIST_DIR` must be a relative owned name
  inside the copy. Do not honor `FACTORY_CONSOLE_REUSE=1` in an isolated test:
  reusing a user service would invalidate the copy boundary.
- Existing user services, ports, workspace paths, process names, and broad
  process groups are never cleanup targets. Keep the exact-owned-root
  termination/fail-closed behavior from CUI-06 for the copied runner only.
- If owned-root termination cannot be verified, fail closed and preserve the
  temporary copy for inspection; never remove it and never write the workspace
  `next-env.d.ts`.
- A nonzero Windows `taskkill` result is a safe degraded-tree success only when
  the runner is already a validated OS-temp copy, its exact owned root PID is
  subsequently verified absent (`ESRCH`), deletion of that exact validated
  temporary copy succeeds, and the harness records
  `degraded-tree-termination`. Every other nonzero-taskkill combination is
  fail-closed and retains the temporary copy for inspection.
- No production Console, API/proxy, package, lockfile, canonical UI asset,
  generated application, contract, or runtime code may change.

---

### Task 1: Replace workspace-mutating browser runners with validated temporary copies

**Files:**
- Modify: `tests/web/console-next-e2e.mjs`
- Modify: `tests/web/console-next-accessibility.mjs`

**Interfaces:**
- Consumes: workspace source root `apps/console-next`, its existing locked
  `node_modules`, existing fixture control plane, `waitForServer`, and the
  current exact-owned-process fail-closed cleanup seam.
- Produces: a local harness helper in each test file with this shape:

  ```js
  function createIsolatedConsoleCopy(label) {
    return {
      copyRoot: '/validated/os-temp/factory-pilot-console-.../console-next',
      distDir: '.next-test-...',
      workspaceNextEnvBefore: Buffer,
      removeOwnedCopy: () => void,
    };
  }
  ```

  The returned `copyRoot` is the only `cwd` for spawned Next, and
  `removeOwnedCopy()` removes only the validated OS-temporary parent after
  owned-root termination/absence succeeds.
- Does not produce: a reusable product runner, a workspace copy, a changed
  package lock, an external command target, a new environment contract, or a
  new production artifact.

- [ ] **Step 1: Write focused RED regressions for the isolation boundary**

  In both browser harnesses, add assertions that fail against the current
  workspace runner:

  ```js
  const workspaceNextEnvBefore = readFileSync(workspaceNextEnvPath);
  const runner = createIsolatedConsoleCopy('workflow');

  assert.notEqual(realpathSync(runner.copyRoot), realpathSync(workspaceConsoleRoot));
  assert.equal(realpathSync(join(runner.copyRoot, 'node_modules')), realpathSync(join(workspaceConsoleRoot, 'node_modules')));
  assert.deepEqual(readFileSync(workspaceNextEnvPath), workspaceNextEnvBefore);
  assert.equal(existsSync(join(runner.copyRoot, '.next')), false);
  ```

  Add a controlled failure-path test that starts a copied runner, forces its
  owned cleanup to fail closed, and proves the workspace `next-env.d.ts` bytes
  are unchanged. It must not manually write the workspace file. The test may
  inspect a retained copy but must remove it only after the copied root has
  been independently terminated and its exact PID is absent.

- [ ] **Step 2: Run the focused RED checks**

  Run:

  ```powershell
  node tests/web/console-next-e2e.mjs
  node tests/web/console-next-accessibility.mjs
  ```

  Expected: the new assertions fail because current runners use the workspace
  Console as `cwd`, create `.next-test-*` beneath it, and rely on writing then
  restoring workspace `next-env.d.ts`.

- [ ] **Step 3: Implement validated copy creation and locked dependency linking**

  In each harness, retain a distinct `workspaceConsoleRoot` only for read-only
  source/lock assertions. Add these local helpers with the same behavior in
  both files:

  ```js
  function isOwnedTemporaryChild(candidate, label) {
    const tempRoot = realpathSync(tmpdir());
    const realCandidate = realpathSync(candidate);
    const relation = relative(tempRoot, realCandidate);
    assert.ok(relation && !relation.startsWith('..') && !isAbsolute(relation), `${label} must stay below the OS temp root.`);
    assert.ok(basename(realCandidate).startsWith('factory-pilot-console-'), `${label} must have the owned temp prefix.`);
    return realCandidate;
  }
  ```

  `createIsolatedConsoleCopy(label)` must:

  1. capture `readFileSync(workspaceNextEnvPath)`;
  2. create and validate a `mkdtempSync` parent;
  3. `cpSync` the workspace Console into `<parent>/console-next` with a filter
     that excludes only `node_modules`, `.next`, and names beginning `.next-`;
  4. assert the copied `package.json`, `package-lock.json`, and `next-env.d.ts`
     exist while no copied `.next*` output exists;
  5. create `<copy>/node_modules` as a `junction` on Windows and a directory
     symlink elsewhere, then assert its `realpathSync` equals the original
     locked workspace `node_modules`; and
  6. return the copy root, a randomized relative dist name, captured workspace
     bytes, and an owned-copy validation/removal function.

  Do not use `cpSync` with dereferenced dependencies, do not create a link to
  anything except the exact workspace `node_modules`, and do not copy or write
  any workspace build output.

- [ ] **Step 4: Start and clean Next only from the copied root**

  Replace each spawned Next command with the copied binary and copied working
  directory:

  ```js
  const runner = createIsolatedConsoleCopy('accessibility');
  const nextBin = join(runner.copyRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
  const server = spawn(process.execPath, [nextBin, 'dev', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: runner.copyRoot,
    stdio: 'ignore',
    env: { ...process.env, FACTORY_CONSOLE_DIST_DIR: runner.distDir },
  });
  ```

  Reject `FACTORY_CONSOLE_REUSE === '1'` before spawning an isolated test.
  Thread `runner.copyRoot` into all local source/bin/output paths used by that
  browser run. Keep fixture credentials process-local and do not log them.

  Cleanup first applies existing fail-closed exact-owned-root termination to
  the child spawned from `runner.copyRoot`. If and only if it returns verified
  absence, validate the temporary parent again and `rmSync` that parent. If
  Windows `taskkill` returned nonzero, permit this path only after exact-root
  `ESRCH` plus successful removal; push `degraded-tree-termination` before
  reporting cleanup success. Do
  not call `writeFileSync(workspaceNextEnvPath, ...)` anywhere in either
  runner; instead assert workspace bytes equal `runner.workspaceNextEnvBefore`
  before spawn, after readiness, after normal cleanup, and after every
  controlled failure assertion.

- [ ] **Step 5: Prove GREEN behavior and write evidence**

  Run:

  ```powershell
  py -3.12 -m unittest tests.api.test_console_ui_sources -v
  npm --prefix apps/console-next run preflight
  node tests/web/console-next-e2e.mjs
  node tests/web/console-next-accessibility.mjs
  git diff --check
  ```

  Expected: both browser suites pass from copied roots; their normal paths
  remove only their validated OS-temporary parents; controlled failure paths
  fail closed without changing workspace `next-env.d.ts`; no `.next-test-*`
  output is created below the workspace Console; and all existing UI/browser
  evidence remains green.

- [ ] **Step 6: Hand off for the mandatory review chain**

  Record changed paths, RED/GREEN output, temporary-parent values with only
  safe basename/path classifications (not credentials), owned PID lifecycle
  evidence, `next-env.d.ts` workspace-byte equality, and residual risks in the
  CUI-06 ledger. A new read-only task review, QA rerun, and independent release
  review are mandatory before the PM changes the ledger state.

## Extension Verification Matrix

| Requirement | Required evidence |
| --- | --- |
| Workspace protection | `next-env.d.ts` byte equality before/during/after normal and controlled-failure paths; no harness `writeFileSync` targets it. |
| Temporary-copy containment | Validated OS-temp parent, copied source excludes `.next*`, and all spawned Next `cwd` values equal the copy root. |
| Locked dependency reuse | Copy `node_modules` is exactly a local junction/symlink resolving to workspace locked `node_modules`; no package command executes. |
| Safe cleanup | Only exact owned spawned root may be terminated; verified absence precedes removal; only validated temporary parent is removed. |
| Degraded Windows tree termination | A controlled nonzero `taskkill` plus exact-root `ESRCH` and successful copy removal records `degraded-tree-termination`; every other case fails closed. |
| Failure safety | Controlled cleanup failure retains only the owned temporary copy and leaves workspace source/`next-env.d.ts` unchanged. |
| Existing product evidence | Existing workflow/accessibility, overlay, Lineage, source, and preflight assertions continue to pass. |

## Execution Handoff

Assign exactly one fresh `frontend` test-harness writer for this extension. The
writer may edit only the two listed browser harnesses. A shared-asset or
production-path change stops work and returns it to integration. No commit,
branch, external process target, or environment mutation is implied by this
task card.
