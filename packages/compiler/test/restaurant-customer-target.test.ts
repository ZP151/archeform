import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawn, spawnSync } from "node:child_process";

import { afterEach, describe, expect, it } from "vitest";

import { restaurantProductV3Fixture } from "./fixtures/restaurant-product-v3.js";
import {
  generateRestaurantCustomerApplicationBundle,
  generateVersionedApplicationBundle,
  sha256Digest,
} from "../src/index.js";
import { pathToFileURL } from "node:url";

const roots: string[] = [];
afterEach(async () =>
  Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  ),
);

function compile() {
  const fixture = restaurantProductV3Fixture();
  return generateRestaurantCustomerApplicationBundle({
    publishedGraph: fixture.publishedGraph,
    compositionLock: fixture.compositionLock,
  });
}

describe("Restaurant customer bundle target", () => {
  it("renders the exact safe deterministic customer bundle", () => {
    const first = compile();
    const second = compile();
    expect(first.rootDirectory).toBe(
      "restaurant-product-restaurant-product-v3-published-1",
    );
    expect(first.graphHash).toBe(
      "sha256:13656b65e143d14dc0c812a7b955240527644506eb4d2518a4b2ed277e3caa23",
    );
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
      "src/generated/fine-dining.mjs",
      "src/customer/app.mjs",
      "src/customer/styles.css",
      "test/customer-journey.test.mjs",
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
    expect(
      first.files.every(
        ({ path }) =>
          !path.includes("\\") && !path.includes("..") && !path.startsWith("/"),
      ),
    ).toBe(true);
  });

  it("declares local scripts, complete manifests, and no private generated imports", () => {
    const bundle = compile();
    const files = Object.fromEntries(
      bundle.files.map(({ path, content }) => [path, content]),
    );
    expect(JSON.parse(files["package.json"])).toEqual({
      name: "restaurant-product-restaurant-product-v3-published-1",
      private: true,
      type: "module",
      scripts: {
        start: "node src/server.mjs",
        test: "node --test test/customer-journey.test.mjs",
      },
    });
    const manifest = JSON.parse(files["graph/manifest.json"]);
    expect(manifest).toMatchObject({
      apiVersion: "factory.restaurant-customer-bundle/v1",
      graphHash: bundle.graphHash,
      publishedRevisionId: "restaurant-product-v3-published-1",
      source: {
        customer: {
          digest:
            "sha256:626d3460b3c7591df86fedf8df16430c61d77428e1ed272604fa4d798630cf5e",
        },
      },
    });
    expect(files["README.md"]).toMatch(/local|simulated payment|file-backed/i);
    for (const [path, content] of Object.entries(files))
      if (path.endsWith(".mjs"))
        expect(content).not.toMatch(/from\s+["']@factory\//);
  });

  it("contains exactly eight routes, two dynamic routes, and five tabs without merchant closure", () => {
    const files = Object.fromEntries(
      compile().files.map(({ path, content }) => [path, content]),
    );
    const app = files["src/customer/app.mjs"];
    for (const route of [
      "/",
      "/menu",
      "/menu/:itemId",
      "/cart",
      "/checkout",
      "/orders",
      "/orders/:orderId",
      "/profile",
    ])
      expect(app).toContain(JSON.stringify(route));
    expect(app).toContain("matchCustomerRoute");
    expect(app).toContain('fetch("/api/');
    expect(app.match(/label:/g)).toHaveLength(5);
    expect(Object.keys(files).some((path) => path.includes("merchant"))).toBe(
      false,
    );
    expect(app).not.toMatch(/restaurant-merchant|\/merchant/);
  });

  it("executes the generated customer journey tests", async () => {
    const bundle = compile();
    const root = await mkdtemp(join(tmpdir(), "archeform-customer-bundle-"));
    roots.push(root);
    for (const file of bundle.files) {
      const path = join(root, file.path);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, file.content, "utf8");
    }
    const result = spawnSync(
      process.execPath,
      ["--test", join(root, "test/customer-journey.test.mjs")],
      { encoding: "utf8", timeout: 30_000 },
    );
    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(result.stdout).toMatch(/pass 2/);
  });

  it("starts from the package script entry and serves all eight customer routes", async () => {
    const bundle = compile();
    const root = await mkdtemp(join(tmpdir(), "archeform-customer-start-"));
    roots.push(root);
    for (const file of bundle.files) {
      const path = join(root, file.path);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, file.content, "utf8");
    }
    const child = spawn(process.execPath, ["src/server.mjs"], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
    });
    try {
      const port = await new Promise<number>((resolvePort, reject) => {
        const timer = setTimeout(
          () => reject(new Error("Generated start entry did not listen.")),
          10_000,
        );
        child.once("exit", (code) => {
          clearTimeout(timer);
          reject(new Error(`Generated start entry exited with ${code}.`));
        });
        child.stdout.on("data", (chunk) => {
          const match = String(chunk).match(/127\.0\.0\.1:(\d+)/);
          if (match) {
            clearTimeout(timer);
            resolvePort(Number(match[1]));
          }
        });
      });
      for (const route of [
        "/",
        "/menu",
        "/menu/dish-truffle-risotto",
        "/cart",
        "/checkout",
        "/orders",
        "/orders/order-0001",
        "/profile",
      ]) {
        const response = await fetch(`http://127.0.0.1:${port}${route}`);
        expect(response.status).toBe(200);
        expect(await response.text()).toContain(
          '<main class="factory-screen mobile-shell"',
        );
      }
      const generatedUi = await fetch(
        `http://127.0.0.1:${port}/generated/customer-restaurant-ui.mjs`,
      );
      expect(generatedUi.status).toBe(200);
      expect(await generatedUi.text()).toContain(
        "export function renderMobileProductShell",
      );
      const controller = await import(
        `${pathToFileURL(join(root, "src/customer/app.mjs")).href}?controller=${Date.now()}`
      );
      const originalFetch = globalThis.fetch;
      globalThis.fetch = (input, init) =>
        originalFetch(new URL(String(input), `http://127.0.0.1:${port}`), init);
      try {
        const added = await controller.invokeCustomerAction(
          "cart.add",
          controller.normalizeCustomerFormAction(
            { quantity: "1" },
            {
              itemId: "dish-truffle-risotto",
              expectedVersion: "1",
              idempotencyKey: "controller-add",
            },
          ),
        );
        expect(added.cart.total).toBe(3200);
        const updated = await controller.invokeCustomerAction("cart.update", {
          lineId: added.cart.items[0].id,
          quantity: 2,
          expectedVersion: 2,
          idempotencyKey: "controller-update",
        });
        expect(updated.cart.total).toBe(6400);
        const removed = await controller.invokeCustomerAction("cart.delete", {
          lineId: added.cart.items[0].id,
          expectedVersion: 3,
          idempotencyKey: "controller-delete",
        });
        expect(removed.cart.items).toEqual([]);
        await controller.invokeCustomerAction("cart.add", {
          itemId: "dish-truffle-risotto",
          quantity: 1,
          expectedVersion: 4,
          idempotencyKey: "controller-readd",
        });
        const paid = await controller.invokeCustomerAction("checkout.pay", {
          expectedVersion: 5,
          idempotencyKey: "controller-pay",
        });
        expect(paid.order.status).toBe("paid");
        const profile = await controller.invokeCustomerAction(
          "profile.update",
          controller.normalizeCustomerFormAction(
            {
              displayName: "Controller Guest",
              locale: "en-SG",
              marketingOptIn: "true",
            },
            {
              expectedVersion: "1",
              idempotencyKey: "controller-profile",
            },
          ),
        );
        expect(profile.profile.displayName).toBe("Controller Guest");
      } finally {
        globalThis.fetch = originalFetch;
      }
    } finally {
      if (child.exitCode === null) {
        const exited = new Promise<void>((resolveExit) => {
          child.once("exit", () => resolveExit());
        });
        child.kill();
        await exited;
      }
    }
  });

  it("rejects every invalid Task 1 input and dispatches the governed V3 product", () => {
    const fixture = restaurantProductV3Fixture();
    const invalid = [
      fixture.graph,
      fixture.baseDraft,
      { publishedGraph: fixture.publishedGraph },
      {
        publishedGraph: {
          ...fixture.publishedGraph,
          graphHash: `sha256:${"8".repeat(64)}`,
        },
        compositionLock: fixture.compositionLock,
      },
      {
        publishedGraph: fixture.publishedGraph,
        compositionLock: fixture.compositionLock,
        extra: true,
      },
    ];
    for (const input of invalid)
      expect(() =>
        generateRestaurantCustomerApplicationBundle(input as never),
      ).toThrow("Restaurant product compilation input is invalid.");
    const product = generateVersionedApplicationBundle({
      publishedGraph: fixture.publishedGraph,
      compositionLock: fixture.compositionLock,
    });
    expect(
      product.files.some(({ path }) => path === "src/merchant/app.mjs"),
    ).toBe(true);
  });
});
