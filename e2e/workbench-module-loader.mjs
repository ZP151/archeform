// Playwright's ESM transform needs an explicit format for these shared TS
// modules on Node 22.11. Keep the application's package/module type unchanged.
let workbenchModules = new Set();

export function initialize(loaderUrl) {
  workbenchModules = new Set(
    [
      "test/consumer-generation-fixture.ts",
      "test/template-draft-fixture.ts",
      "lib/workbench-graph.ts",
      "lib/product-journey/preview-cleanup.ts",
      "lib/product-journey/release-diagnosis.ts",
    ].map((path) => new URL(`../apps/workbench/${path}`, loaderUrl).href),
  );
}

export function load(url, context, nextLoad) {
  return nextLoad(
    url,
    workbenchModules.has(url) ? { ...context, format: "module" } : context,
  );
}
