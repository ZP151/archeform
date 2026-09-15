import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  // Workspace packages publish ESM. Preserve their built module format instead
  // of applying the CommonJS transform used for these test files.
  build: { external: ["**/packages/*/dist/**"] },
  timeout: 60_000,
  use: {
    baseURL: process.env.FACTORY_E2E_BASE_URL ?? "http://127.0.0.1:5174",
    headless: true,
  },
  reporter: "list",
});
