# E2E module-loading correction

Date: 2026-09-24. Source base: `22852e923c313d071266769bf9810937aad47017`.

Remote CI [35973664121](https://github.com/ZP151/archeform/actions/runs/35973664121)
passes on Node 22.x and fails on the supported minimum 22.11.0 when CommonJS
Playwright tests require ESM workspace packages. Local Node 22.23.2 reproduces
that failure with `NODE_OPTIONS=--no-experimental-require-module`.

The correction sets an ESM scope only for `e2e`, uses existing built public
entrypoints and adds whole-directory discovery to the current CI matrix. No
dependency, supported version, application module type or runtime logic changes.
Initial full discovery also identifies a direct adapter TypeScript source import
in the old approval case; replacing it and the related diagnostic import fixes
Node's strip-only parameter-property failure. No test is excluded to obtain green.

Root observes strict full discovery of 90 tests in 36 files, 18/18 pure-helper
tests, tracked E2E no-emit types and changed-file formatting passing. Independent
ordinary reviewer `work_orders_integrated_qa` repeats types/helpers and both normal
and strict discovery, verifies unchanged hashes for all ten scoped files and
returns P0/P1/P2 0/0/0. Detailed local receipts remain at
`generated/.e2e-module-review/review.md` and `review.json`.

The local flag is a reproduction aid, not an actual Node 22.11 run. A pushed
revision must still pass both remote Node jobs. The existing non-failing
Workbench fixture module-type warning remains outside the correction. Actual
E2E journeys, service/database startup, provider calls, cleanup and deployment
were not run; all pending product acceptance gates remain open.
