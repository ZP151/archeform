import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

import { afterEach, describe, expect, it } from "vitest";
import { createCapabilityCompositionLock } from "@factory/capabilities";
import { hashApplicationGraphV3 } from "@factory/graph";

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

function canonicalInput() {
  const fixture = restaurantProductV3Fixture();
  return {
    publishedGraph: fixture.publishedGraph,
    compositionLock: fixture.compositionLock,
  };
}

function restaurantV6Input() {
  const input = canonicalInput();
  const graph = input.publishedGraph.graph;
  graph.metadata.name = "Maison Rivage";
  graph.page.pages.find(({ id }) => id === "customer-menu")!.title =
    "Seasonal Menu";
  const home = graph.page.pages.find(({ id }) => id === "customer-home")!;
  home.blocks = [home.blocks[2]!, home.blocks[0]!, home.blocks[1]!];
  home.recipe.regions[0]!.blockIds = [
    "home-items",
    "home-hero",
    "home-categories",
  ];
  const seedIndex = graph.domain.seedData!.findIndex(
    ({ entity, id }) => entity === "menu-item" && id === "margherita-pizza",
  );
  graph.domain.seedData![seedIndex]!.values.name = "Heirloom tomato pizza";
  graph.seedScenarios[0]!.records[seedIndex]!.values.name =
    "Heirloom tomato pizza";
  graph.experience.theme.mode = "dark";
  input.publishedGraph.graphHash = hashApplicationGraphV3(graph);
  input.compositionLock = createCapabilityCompositionLock({
    graphChecksum: input.publishedGraph.graphHash,
    selections: graph.integration.compositionSelections ?? [],
  });
  return input;
}

function compile(input = canonicalInput()) {
  return generateRestaurantProductApplicationBundle(input);
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

  it("executes one r.6 bundle whose customer and merchant share the Graph-derived catalog state", async () => {
    const first = compile(restaurantV6Input());
    const second = compile(restaurantV6Input());
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
    expect(Object.values(files).join("\n")).not.toMatch(
      /dish-truffle-risotto|dish-seared-salmon/,
    );
    expect(files["src/runtime/seed.mjs"]).toContain(
      '"name":"Heirloom tomato pizza"',
    );
    expect(files["src/runtime/seed.mjs"]).toContain('"price":1400');
    expect(files["test/customer-journey.test.mjs"]).toContain(
      "margherita-pizza",
    );
    expect(files["test/merchant-journey.test.mjs"]).toContain(
      "margherita-pizza",
    );
    expect(files["test/shared-state.test.mjs"]).toContain(
      "Heirloom tomato pizza",
    );
    expect(files["README.md"]).toContain("Maison Rivage");
    const manifest = JSON.parse(files["graph/manifest.json"]);
    expect(
      manifest.surfaces
        .find(({ surfaceKey }: any) => surfaceKey === "customer-mobile")
        .pages.find(({ id }: any) => id === "customer-home")
        .blocks.map(({ id }: any) => id),
    ).toEqual(["home-items", "home-hero", "home-categories"]);

    const root = await mkdtemp(join(tmpdir(), "archeform-product-r6-"));
    roots.push(root);
    for (const file of first.files) {
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
});
