import { defineConfig } from "vitest/config";

// The published-artifact suites materialize complete application bundles to
// disk and transform them through vite-node before the first assertion runs;
// under full-suite parallelism each test routinely needs several seconds and
// order-operations lifecycle tests sit within a second of the 5s vitest
// default. The default produced load-dependent timeouts (a fresh full run
// recorded 154/158 with four 5s timeouts), so the per-test timeout carries
// deliberate headroom, mirroring packages/compiler.
export default defineConfig({
  test: {
    testTimeout: 30000,
  },
});
