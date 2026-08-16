import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@factory/external-intake": fileURLToPath(
        new URL("../../packages/external-intake/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    include: ["test/**/*.test.ts"],
    // The security race tests launch real nested Vitest processes. A cold,
    // full-workspace run can need longer than Vitest's default ten seconds to
    // terminate the saturated worker after every assertion has passed.
    teardownTimeout: 60_000,
  },
});
