import { defineConfig } from "@playwright/test";
import { register } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { readFileSync } from "node:fs";

const loaderUrl = pathToFileURL(
  resolve(__dirname, "e2e/workbench-module-loader.mjs"),
);
// A data URL avoids reentering Playwright's source-map transport while Node
// synchronously registers the hook. The hook still delegates all TS transforms.
register(
  `data:text/javascript,${encodeURIComponent(readFileSync(loaderUrl, "utf8"))}`,
  {
    data: loaderUrl.href,
  },
);

export default defineConfig({
  testDir: "./e2e",
  // Tests and workspace packages use ESM. Preserve built package modules rather
  // than transforming their published output through the test loader.
  build: { external: ["**/packages/*/dist/**"] },
  timeout: 60_000,
  use: {
    baseURL: process.env.FACTORY_E2E_BASE_URL ?? "http://127.0.0.1:5174",
    headless: true,
  },
  reporter: "list",
});
