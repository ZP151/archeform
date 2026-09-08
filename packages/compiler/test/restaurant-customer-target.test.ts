import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawn, spawnSync } from "node:child_process";

import { afterEach, describe, expect, it } from "vitest";
import { createCapabilityCompositionLock } from "@factory/capabilities";
import { hashApplicationGraphV3 } from "@factory/graph";

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
  return generateRestaurantCustomerApplicationBundle(input);
}

async function loadGeneratedCustomerApp(input = canonicalInput()) {
  const root = await mkdtemp(join(tmpdir(), "archeform-customer-app-"));
  roots.push(root);
  const bundle = compile(input);
  const files = Object.fromEntries(
    bundle.files.map(({ path, content }) => [path, content]),
  );
  for (const file of bundle.files) {
    const path = join(root, file.path);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, file.content, "utf8");
  }
  const app = await import(
    `${pathToFileURL(join(root, "src/customer/app.mjs")).href}?v=${Date.now()}`
  );
  return { root, files, app };
}

describe("Restaurant customer bundle target", () => {
  it("renders local library icons with accessible text and retains the upstream license", async () => {
    const { app, files } = await loadGeneratedCustomerApp();
    const state = { catalog: [], orders: [], cart: { items: [] }, profile: {} };
    const empty = app.renderCustomerPage("/orders", state);
    expect(empty).toContain('class="lucide lucide-house"');
    expect(empty).toContain('class="lucide lucide-receipt-text"');
    expect(empty).toContain('aria-label="Refresh status"');
    expect(empty).not.toContain("data-lucide=");
    expect(files["THIRD_PARTY_NOTICES.md"]).toContain("lucide-static 0.468.0");
    expect(files["THIRD_PARTY_NOTICES.md"]).toContain("ISC License");
    expect(files["src/customer/app.mjs"]).not.toMatch(/from ["']lucide/);
    for (const [status, icon] of [
      ["preparing", "chef-hat"],
      ["ready", "circle-check"],
      ["cancelled", "circle-x"],
      ["toString", "circle-help"],
    ]) {
      const html = app.renderCustomerPage("/orders", {
        ...state,
        orders: [{ id: "1", items: [], status }],
      });
      expect(html).toContain(`class="lucide lucide-${icon}"`);
    }
  });

  it("marks exactly one native navigation destination for customer routes", async () => {
    const { app } = await loadGeneratedCustomerApp();
    const state = { catalog: [], orders: [], cart: { items: [] }, profile: {} };
    for (const [path, destination] of [
      ["/", "/"],
      ["/menu", "/menu"],
      ["/menu/missing", "/menu"],
      ["/cart", "/cart"],
      ["/checkout", "/cart"],
      ["/orders", "/orders"],
      ["/orders/missing", "/orders"],
      ["/profile", "/profile"],
    ]) {
      const html = app.renderCustomerPage(path, state);
      expect(html.match(/aria-current="page"/g), path).toHaveLength(1);
      expect(html, path).toContain(`href="${destination}" aria-current="page"`);
    }
  });

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
      "THIRD_PARTY_NOTICES.md",
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

  it("renders readable populated orders, refresh links, and safe values", async () => {
    const { app } = await loadGeneratedCustomerApp();
    const state = {
      settings: { currency: "USD" },
      catalog: [],
      cart: { version: 1, items: [] },
      profile: { version: 1, marketingOptIn: false },
      orders: [
        {
          id: "order-14",
          items: [
            { id: "line-1", name: "Margherita pizza", quantity: 2 },
            { id: "line-2", name: "<script>alert(1)</script>", quantity: 1 },
          ],
          total: 1400,
          paymentStatus: "simulated-paid",
          status: "preparing",
        },
        {
          id: "order/special id",
          items: [{ id: "line-3", name: "Cappuccino", quantity: 3 }],
          total: 2500,
          paymentStatus: "card",
          status: "mystery-state",
        },
      ],
    };
    const list = app.renderCustomerPage("/orders", state);
    expect(list).not.toContain("No orders yet");
    expect(list).toContain("Items");
    expect(list).toContain("Payment");
    expect(list).toContain("Total");
    expect(list).toContain("Fulfilment");
    expect(list).toContain("Paid (simulated)");
    expect(list).toContain("Preparing");
    expect(list).toContain("Status unavailable");
    expect(list).not.toContain("mystery-state");
    expect(list).toContain('href="/orders/order-14"');
    expect(list).toContain('href="/orders/order%2Fspecial%20id"');
    expect(list).toContain('href="/orders"');
    expect(list).toContain("× 2");
    expect(list).not.toContain("<script>");
    const orderLinks = [...list.matchAll(/href="\/orders\/([^"]+)"/g)].map(
      (match) => match[1],
    );
    expect(new Set(orderLinks).size).toBe(2);
    const orderIds = state.orders.map((value) => encodeURIComponent(value.id));
    expect(orderLinks.filter((value) => orderIds.includes(value)).length).toBe(
      2,
    );

    const detail = app.renderCustomerPage("/orders/order-14", state);
    expect(detail).toContain("Order order-14");
    expect(detail).toContain("USD 14.00");
    expect(detail).not.toContain("Order confirmed");
    expect(detail).toContain("Preparing");
    expect(detail).toContain('href="/orders/order-14"');
    expect(detail).toContain("Paid (simulated)");
    expect(detail).not.toContain("Order detail");
  });

  it("renders empty orders and malformed currency in required readable fallback text", async () => {
    const { app } = await loadGeneratedCustomerApp();
    const empty = app.renderCustomerPage("/orders", {
      settings: {},
      catalog: [],
      cart: { version: 1, items: [] },
      profile: { version: 1, marketingOptIn: false },
      orders: [],
    });
    expect(empty).toContain("No orders yet");

    const malformed = app.renderCustomerPage("/orders/order-0001", {
      settings: { currency: "US" },
      catalog: [],
      cart: { version: 1, items: [] },
      profile: { version: 1, marketingOptIn: false },
      orders: [
        {
          id: "order-0001",
          items: [{ name: "Latte", quantity: 1 }],
          total: 1200,
          paymentStatus: "simulated-paid",
          status: "ready",
        },
      ],
    });
    expect(malformed).toContain("Currency unavailable");
    expect(malformed).toContain("Ready");
  });

  it("keeps one refresh control, rejects inherited statuses, and resolves encoded detail ids once", async () => {
    const { app } = await loadGeneratedCustomerApp();
    const order = {
      id: "order/special id",
      items: [{ name: "Pizza", quantity: 1 }],
      total: 1400,
      paymentStatus: "simulated-paid",
      status: "toString",
    };
    const state = {
      settings: { currency: "ZZZ" },
      catalog: [],
      cart: { items: [], version: 1 },
      profile: {},
      orders: [order, { ...order, id: "second-order", status: "constructor" }],
    };
    const list = app.renderCustomerPage("/orders", state);
    expect(list.match(/aria-label="Refresh status"/g)).toHaveLength(1);
    expect(list.match(/Status unavailable/g)).toHaveLength(2);
    expect(list).not.toContain("function");
    expect(list).toContain("ZZZ 14.00");
    const route = "/orders/" + encodeURIComponent(order.id);
    const detail = app.renderCustomerPage(route, state);
    expect(detail).toContain('href="' + route + '"');
    expect(detail).not.toContain("%252F");
    expect(detail).toContain("Pizza");
    const empty = app.renderCustomerPage("/orders", { ...state, orders: [] });
    expect(empty.match(/aria-label="Refresh status"/g)).toHaveLength(1);
    const missing = app.renderCustomerPage("/orders/missing", state);
    expect(missing).toContain("Order unavailable");
    expect(missing).not.toContain("Order Unknown");
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

  it("uses only admitted Graph record identities in the r.6 generated customer journey", async () => {
    const bundle = compile(restaurantV6Input());
    const files = Object.fromEntries(
      bundle.files.map(({ path, content }) => [path, content]),
    );
    const generated = Object.values(files).join("\n");
    expect(generated).not.toMatch(/dish-truffle-risotto|dish-seared-salmon/);
    expect(files["src/runtime/seed.mjs"]).toContain('"id":"margherita-pizza"');
    expect(files["src/runtime/seed.mjs"]).toContain(
      '"name":"Heirloom tomato pizza"',
    );
    expect(files["test/customer-journey.test.mjs"]).toContain(
      "margherita-pizza",
    );
    expect(files["README.md"]).toContain("Maison Rivage");
    const manifest = JSON.parse(files["graph/manifest.json"]);
    expect(
      manifest.pages
        .find(({ id }: any) => id === "customer-home")
        .blocks.map(({ id }: any) => id),
    ).toEqual(["home-items", "home-hero", "home-categories"]);

    const root = await mkdtemp(join(tmpdir(), "archeform-customer-r6-"));
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
        "/menu/margherita-pizza",
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
              itemId: "margherita-pizza",
              expectedVersion: "1",
              idempotencyKey: "controller-add",
            },
          ),
        );
        expect(added.cart.total).toBe(1400);
        const updated = await controller.invokeCustomerAction("cart.update", {
          lineId: added.cart.items[0].id,
          quantity: 2,
          expectedVersion: 2,
          idempotencyKey: "controller-update",
        });
        expect(updated.cart.total).toBe(2800);
        const removed = await controller.invokeCustomerAction("cart.delete", {
          lineId: added.cart.items[0].id,
          expectedVersion: 3,
          idempotencyKey: "controller-delete",
        });
        expect(removed.cart.items).toEqual([]);
        await controller.invokeCustomerAction("cart.add", {
          itemId: "margherita-pizza",
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
