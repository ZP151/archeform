import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

import { afterEach, describe, expect, it } from "vitest";

import { restaurantProductV3Fixture } from "./fixtures/restaurant-product-v3.js";
import {
  generateRestaurantProductApplicationBundle,
  sha256Digest,
} from "../src/index.js";

const roots: string[] = [];
afterEach(async () =>
  Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  ),
);

function compile() {
  const fixture = restaurantProductV3Fixture();
  return generateRestaurantProductApplicationBundle({
    publishedGraph: fixture.publishedGraph,
    compositionLock: fixture.compositionLock,
  });
}

describe("Restaurant product V3 target", () => {
  it("assembles one deterministic dual-surface bundle with shared runtime and trusted starts", () => {
    const first = compile();
    const second = compile();
    expect(first.files.map(({ path }) => path)).toEqual([
      "package.json",
      "README.md",
      "graph/manifest.json",
      "src/server.mjs",
      "src/runtime/state.mjs",
      "src/runtime/policy.mjs",
      "src/runtime/api.mjs",
      "src/runtime/seed.mjs",
      "src/generated/customer-restaurant-ui.mjs",
      "src/generated/merchant-restaurant-ui.mjs",
      "src/generated/fine-dining.mjs",
      "src/customer/app.mjs",
      "src/customer/styles.css",
      "src/merchant/app.mjs",
      "src/merchant/styles.css",
      "test/customer-journey.test.mjs",
      "test/merchant-journey.test.mjs",
      "test/shared-state.test.mjs",
    ]);
    expect(
      first.files.map((file) => [
        file.path,
        file.content,
        sha256Digest(file.content),
      ]),
    ).toEqual(
      second.files.map((file) => [
        file.path,
        file.content,
        sha256Digest(file.content),
      ]),
    );
    const files = Object.fromEntries(
      first.files.map(({ path, content }) => [path, content]),
    );
    expect(JSON.parse(files["package.json"]).scripts).toEqual({
      "start:customer": "node src/server.mjs customer",
      "start:merchant": "node src/server.mjs manager",
      test: "node --test test/*.test.mjs",
    });
    const manifest = JSON.parse(files["graph/manifest.json"]);
    expect(manifest.surfaces.map(({ surfaceKey }: any) => surfaceKey)).toEqual([
      "customer-mobile",
      "merchant-desktop",
    ]);
    expect(manifest.runtimeSchemaVersion).toBe(1);
    expect(manifest.source).toHaveProperty("customer");
    expect(manifest.source).toHaveProperty("merchant");
  });

  it("executes generated customer, merchant, and cross-surface journeys", async () => {
    const bundle = compile();
    const root = await mkdtemp(join(tmpdir(), "archeform-product-target-"));
    roots.push(root);
    for (const file of bundle.files) {
      const path = join(root, file.path);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, file.content, "utf8");
    }
    const result = spawnSync(
      process.execPath,
      [
        "--test",
        join(root, "test/customer-journey.test.mjs"),
        join(root, "test/merchant-journey.test.mjs"),
        join(root, "test/shared-state.test.mjs"),
      ],
      { encoding: "utf8", timeout: 30_000 },
    );
    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(result.stdout).toMatch(/pass 4/);
  });

  it("contains only static local generated imports and both exact route trees", () => {
    const files = Object.fromEntries(
      compile().files.map(({ path, content }) => [path, content]),
    );
    expect(files["src/customer/app.mjs"]).toContain(
      'from "../generated/customer-restaurant-ui.mjs"',
    );
    expect(files["src/merchant/app.mjs"]).toContain(
      'from "../generated/merchant-restaurant-ui.mjs"',
    );
    expect(Object.values(files).join("\n")).not.toMatch(
      /from\s+["']@factory\/|\beval\s*\(|\bFunction\s*\(/,
    );
    expect(files["src/customer/app.mjs"]).not.toContain("merchantRoutes");
    expect(files["src/merchant/app.mjs"]).not.toContain("customerRoutes");
  });
});
