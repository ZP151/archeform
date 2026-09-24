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

## Cross-directory follow-up

Run [35976097920](https://github.com/ZP151/archeform/actions/runs/35976097920)
passes fully on Node 22.x. Node 22.11.0 passes full tests/build and definition
checks, then rejects named imports from five shared Workbench TypeScript modules.
The local reproduction also needs `--no-experimental-strip-types`; the earlier
single flag did not reproduce this second difference.

A test-only loader supplies the ESM format hint for exactly those five URLs,
delegating transformation and other URLs to Playwright. Production package module
types, engine versions and dependencies are unchanged. The hook uses Node's
existing registration API and local source via a data URL: registering its file URL
first waited in Playwright's source-map transport and was interrupted; that attempt
is not a passing result. No external URL is loaded. See the
[Node module hook contract](https://nodejs.org/download/release/v22.6.0/docs/api/module.html#customization-hooks).

Root now runs discovery with both native require-module and strip-types disabled:
92 tests in 37 files. All 20 pure helpers pass, including two new shared-module
calls in a Playwright worker. Their transports and cleanup callbacks are entirely
in-memory; they perform no provider call or resource operation. Tracked no-emit
types and formatting pass. The same ordinary reviewer repeats checks, verifies
the five changed source identities and returns P0/P1/P2 0/0/0; local receipts are
`generated/.e2e-workbench-module-review/review.md` and `review.json`. Actual remote
minimum-version validation remains the next required observation.
