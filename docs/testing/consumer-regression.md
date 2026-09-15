# Consumer Delivery Regression

This is a developer feedback loop for the consumer-generation roadmap. It
reuses existing suites and the existing bounded process executor. It does not
change package manifests, dependencies, Turbo configuration, CI, product
behavior or the repository release policy.

Run from the checkout root using the supported Node 22 and pnpm 9 installation.
Install the existing frozen dependencies first with `pnpm install
--frozen-lockfile`. Neither lane requires Docker, a model account, hosting, or
production credentials. Do not load provider credentials for these checks.

## Commands and when to use them

```sh
# Inspect exactly which fixed commands will run; no children execute.
node scripts/regression.mjs smoke --dry-run
node scripts/regression.mjs product --dry-run

# Short local-tooling feedback.
node scripts/regression.mjs smoke

# Existing core product package tests, including prerequisite builds.
node scripts/regression.mjs product

# Run after editing the helper itself.
node --test scripts/regression.test.mjs
```

Only `smoke` or `product`, followed optionally by `--dry-run`, is accepted.
There is no command passthrough, arbitrary path, retry, affected-file inference,
or `full` mode. Unknown arguments fail before any child runs.

| Check               | Actual selection                                                                                                                                | Coverage boundary                                                                             |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Focused RED/GREEN   | The test owning the behavior being changed                                                                                                      | Fastest loop; run before broad regression                                                     |
| `smoke`             | `node --test scripts/doctor.test.mjs`, then `node --test scripts/local-product-acceptance.test.mjs`                                             | Tests local-tooling behavior with fixtures; does not perform real acceptance or launch Docker |
| `product`           | Turbo `test` tasks for `@factory/graph`, `@factory/adapters`, `@factory/capabilities`, `@factory/compiler`, `@factory/workbench`, concurrency 4 | Runs selected package suites with their existing upstream `^build` dependencies               |
| Existing full gates | Existing doctor, Prisma generation, format, typecheck, tests, build, notices and source-study checks                                            | Required at their existing integration/release boundaries                                     |
| Actual user journey | Relevant Playwright / `pnpm accept:local` and later accepted hosted journeys                                                                    | Must prove a working business result; distinct from unit/integration suites                   |

The product selection does **not** run the control-plane, compiler-worker,
external-intake, separate UI/recipe package test tasks, real browser journeys,
real model evaluation, live database/queue integration, hosting, or deployment.
Upstream builds do not mean upstream tests ran. Add the relevant owning-package
tests when a change touches an omitted area; do not rely on the lane name alone.

The known main Candidate concurrency failure remains a release blocker. A green
product selection cannot resolve it because external-intake tests are outside
this selection. Do not skip, retry until green, or lower concurrency in the
existing full suite to hide it.

## Select focused tests by the changed user outcome

| Outcome / risk                                     | Existing focused test paths                                                                                                                                 |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Intent and safe clarification                      | `packages/adapters/test/requirement-interpreter.test.ts`; `packages/graph/test/requirement-spec.test.ts`                                                    |
| Intent-to-recipe composition                       | `packages/capabilities/test/product-composer.test.ts`; `packages/capabilities/test/restaurant-product-composition.test.ts`                                  |
| Generated customer/merchant behavior               | `packages/compiler/test/restaurant-customer-runtime.test.ts`; `packages/compiler/test/restaurant-merchant-v3-runtime.test.ts`                               |
| Identity and denied actions                        | `packages/compiler/test/identity-policy-runtime.test.ts`; `packages/capabilities/test/identity-policy.test.ts`                                              |
| Home entry and recovery                            | `apps/workbench/components/workbench-home.test.tsx`; `apps/workbench/lib/product-journey/use-release-journey.test.tsx`                                      |
| Immutable lifecycle and actual service integration | `apps/control-plane/test/lifecycle.service.test.ts`; `apps/control-plane/test/requirement-product-composition.test.ts` — outside the fast product selection |
| Visual/responsive user path                        | `apps/workbench/e2e/home-entry.pw.ts`; `apps/workbench/e2e/template-draft.pw.ts` — real browser environment required                                        |

For example, after changing clarification behavior, build the adapter's existing
upstream dependencies before running its focused test:

```sh
pnpm exec turbo run build --filter=@factory/adapters...
pnpm --filter @factory/adapters exec vitest run test/requirement-interpreter.test.ts
node scripts/regression.mjs product
```

Do not invoke a workspace package's focused Vitest directly in a fresh checkout
before its `dist` dependencies exist. The product lane's existing Turbo task
graph handles this ordering. Control-plane tests additionally require the
existing Prisma-generation/build prerequisites; follow that package and the
active task ledger when exercising them.

## Results, failure and caching

The helper prints a bounded structured summary with fixed step identifiers and
exit status. It does not forward captured child output or environment values.
Failure, spawn error, timeout, interruption or unproven process termination
returns nonzero, stops the selected sequence, and never retries automatically.
Dry-run prints fixed command selection only and performs no tests or builds.

When a step fails, inspect its fixed direct command in dry-run and run that
command locally for test diagnostics. Keep credentials and raw model material
out of copied logs. Fix the owning behavior, then rerun the affected check; a
failed first run remains part of the task evidence.

The product lane retains Turbo's normal local cache semantics. A warm success
may reuse matching task results; it is not necessarily a fresh execution of
every test. For a changed behavior, run its focused test freshly. Existing
release policy owns fresh exact-commit evidence. Do not interpret cached test
success as a new product success-rate measurement.

Initial feedback budgets are 30 seconds for smoke and 120 seconds for a warm
product run on the development machine. Record cold dependency/build time
separately. These are optimization targets rather than gates that disable
tests. If a lane grows too slow, inspect measured stage cost and add a narrower
focused developer command in the task brief; changing this helper's fixed
selection requires a deliberate scoped update with tests.

## Evidence without a second audit process

An ordinary slice closes with focused RED/GREEN evidence, its relevant package
checks, one independent review, and one update to the
[active ledger](../superpowers/ledgers/2026-09-07-consumer-generation-delivery.md).
Record command, exit, elapsed time, code revision/diff scope and any omissions.
Keep already-valid evidence after unrelated documentation or formatting edits;
rerun only affected checks unless a concrete new risk warrants more.

The full direct commands remain `pnpm run doctor:toolchain`, the existing Prisma
generation step when required, `pnpm format:check`, `pnpm typecheck`, `pnpm test`,
`pnpm build`, `pnpm verify:third-party`, and `pnpm verify:source-studies`.
Relevant actual acceptance and security checks remain governed by the active
ledger and delivery policy. The helper is not a new required gate in CI.

Product progress is measured by first-result success, user questions, active
effort, usable-address time and developer rescue. Tests protect those outcomes;
test counts are not product-goal completion.
