# Console Next Dependency-Security Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` task-by-task. Each task has one writer, one test cycle, and explicit review evidence.

**Goal:** Produce a reproducible Console Next dependency closure with no high or critical production audit findings, without changing Factory or generated-application contracts.

**Architecture:** Keep the accepted Next 15 / React 19 profile. Add a deterministic, offline closure-capture CLI to the existing intake verifier, then use exact npm root overrides for the two audited transitive packages. The checked-in lockfile and canonical closure record remain mutually verifying evidence.

**Tech Stack:** Python 3.12 intake verifier, Node 22.11.0, npm 10.9.0, Next.js 15.5.21, React 19.2.7.

## Global Constraints

- ADR-011 is accepted; no Next major upgrade, generated-application package change, Factory API contract change, or cloud work is allowed.
- Overrides must be exact: `postcss@8.5.23` and `sharp@0.35.3`.
- The closure is generated only from the checked-in lockfile and verified source snapshot; no manual JSON edit is permitted.
- A passing audit requires zero high and zero critical findings for `npm --prefix apps/console-next audit --omit=dev --json`.
- No model call, raw brief, capability token, or local credential is used or recorded by this slice.

---

### Task 1: Make closure recapture a supported, tested command

**Files:**

- Modify: `tests/api/test_console_next_intake.py`
- Modify: `tools/console_next_intake.py`

**Interfaces:**

- Consumes: `write_console_next_closure(root, index, lockfile)`.
- Produces: `main(["capture-console-next", "--snapshot", ..., "--lockfile", ...]) -> int` and canonical `console-next-closure.json`.

- [ ] **Step 1: Write the failing command-contract test**

```python
status = main([
    "capture-console-next", "--snapshot", str(root), "--lockfile", str(lockfile),
])
self.assertEqual(0, status)
self.assertEqual(expected, json.loads((root / "console-next-closure.json").read_text()))
```

- [ ] **Step 2: Run the focused test and confirm it fails because the subcommand is absent.**

Run: `py -3.12 -m unittest tests.api.test_console_next_intake.ConsoleNextIntakeTests.test_capture_command_writes_canonical_closure -v`

- [ ] **Step 3: Add only the `capture-console-next` argparse branch.** It verifies the immutable snapshot, resolves paths through `repository_path`, writes through `write_console_next_closure`, and prints a stable non-secret success line. It rejects missing/invalid lockfiles through the existing `SnapshotError` channel.

- [ ] **Step 4: Re-run the focused test and the complete intake suite.**

Run: `py -3.12 -m unittest tests.api.test_console_next_intake -v`

### Task 2: Regenerate the exact Console dependency closure

**Files:**

- Modify: `apps/console-next/package.json`
- Modify: `apps/console-next/package-lock.json`
- Modify: `packages/vendor/shadcn-ui/7774cd7dcee1e98d0815aa6e829f33a7fc952fdf/console-next-closure.json`

**Interfaces:**

- Consumes: the Task 1 `capture-console-next` command and exact lockfile inventory.
- Produces: an exact npm closure in which `postcss` is `8.5.23` and `sharp` is `0.35.3`.

- [ ] **Step 1: Add a failing focused lock inventory assertion** in `tests/web/console-next-e2e.mjs` that resolves the closure packages and expects the two exact remediation versions.

- [ ] **Step 2: Run the package-only assertion and confirm it fails against the current closure.**

Run: `node tests/web/console-next-e2e.mjs --assert-package-only`

- [ ] **Step 3: Add an `overrides` object with only the two exact versions to `package.json`; run `npm install --package-lock-only --ignore-scripts`; then run the supported capture command.** Do not hand-edit package-lock or the closure JSON.

- [ ] **Step 4: Re-run the package-only assertion and Console preflight.**

Run: `node tests/web/console-next-e2e.mjs --assert-package-only`

Run: `npm --prefix apps/console-next run preflight`

### Task 3: Verify the remediation candidate

**Files:**

- No new production files.

- [ ] **Step 1: Record the production audit result.**

Run: `npm --prefix apps/console-next audit --omit=dev --json`

Expected: zero high and zero critical.

- [ ] **Step 2: Verify production rendering and governed browser behavior.**

Run: `npm --prefix apps/console-next run build`

Run: `node tests/web/console-next-e2e.mjs`

Run: `node tests/web/console-next-accessibility.mjs`

- [ ] **Step 3: Verify the Factory API, Executor, and generated approval product remain intact.**

Run: `py -3.12 -m unittest discover -s tests/api -v`

Run: `py -3.12 -m unittest discover -s tests/executor -v`

Run: `node tests/web/generated-composable-preview-e2e.mjs`

- [ ] **Step 4: Perform independent release verification.** Review every lockfile and closure delta, run `git diff --check`, and leave the Console quarantined if any high/critical advisory, integrity mismatch, failed build, browser regression, or P0/P1 finding remains.

## Coverage Review

- ADR-011 DEC-001/DEC-002: Task 2 retains the profile and applies only exact overrides.
- ADR-011 DEC-003: Task 1 makes recapture a deterministic supported command; Task 2 uses it.
- ADR-011 DEC-004/DEC-005: Task 3 is the promotion gate and abort condition.
- ADR-011 VRF-001 through VRF-005: Tasks 1–3 retain command, lock, closure, audit, build, browser, regression, and review evidence.
