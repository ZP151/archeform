import { defineConfig } from "vitest/config";

// The generated-runtime suites materialize complete application bundles to
// disk and transform them through vite-node before the first assertion runs;
// under full-suite parallelism each test routinely needs several seconds.
// The 5s vitest default produced load-dependent timeouts, so the per-test
// timeout carries deliberate headroom.
//
// The default threads pool is unstable for this suite in full runs
// (tinypool workerData loss and stack-overflow worker crashes on this
// machine's fork/worker lifecycle); the documented deterministic check
// "compiler N/N single-fork" therefore pins the forks pool with a single
// fork here, so the ledger's execution-mode claim is a committed artifact
// rather than a manual invocation detail.
export default defineConfig({
  test: {
    testTimeout: 30000,
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
