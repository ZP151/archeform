import { defineConfig } from "vitest/config";

// The generated-runtime suites materialize complete application bundles to
// disk and transform them through vite-node before the first assertion runs;
// under full-suite parallelism each test routinely needs several seconds.
// The 5s vitest default produced load-dependent timeouts, so the per-test
// timeout carries deliberate headroom.
export default defineConfig({
  test: {
    testTimeout: 30000,
  },
});
