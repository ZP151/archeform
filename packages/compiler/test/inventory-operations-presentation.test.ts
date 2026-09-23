import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import ts from "typescript";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { generateApplicationBundle } from "../src/index.js";
import { inventoryOperationsInput } from "./fixtures/inventory-operations.js";
import { loadInventoryRuntime } from "./fixtures/inventory-operations-runtime.js";
import {
  inventoryOperationsPresentation,
  renderInventoryOperationsWorkspace,
} from "../src/inventory-operations-presentation.js";
import { selectInventoryOperationsProfile } from "../src/inventory-operations-contract.js";

const require = createRequire(import.meta.url);
const root = resolve(__dirname, "../../..");
const bundle = generateApplicationBundle({
  publishedRevisionId: "inventory-ui",
  ...inventoryOperationsInput(),
});
const source = bundle.files.find(
  (file) => file.path === "web/app/page-runtime.tsx",
)!.content;
const css = bundle.files.find(
  (file) => file.path === "web/app/globals.css",
)!.content;
const playwright = require("@playwright/test"),
  browserExpect = playwright.expect;
const viteRequire = createRequire(
  createRequire(require.resolve("vitest/package.json")).resolve(
    "vite/package.json",
  ),
);
const evidence = join(
  root,
  "docs/acceptance/evidence/inventory-operations/task3-ui",
);
let browser: any, script: string;
beforeAll(async () => {
  script = (
    await viteRequire("esbuild").build({
      stdin: {
        contents:
          source +
          '\nimport {createRoot} from "react-dom/client"; createRoot(document.getElementById("root")!).render(<GeneratedApplication requestedPath={window.location.pathname}/>);',
        loader: "tsx",
        resolveDir: join(root, "apps/workbench"),
      },
      bundle: true,
      write: false,
      platform: "browser",
      format: "iife",
      jsx: "automatic",
      define: { "process.env.NODE_ENV": '"production"' },
    })
  ).outputFiles[0].text;
  browser = await playwright.chromium.launch({ headless: true });
  mkdirSync(evidence, { recursive: true });
});
afterAll(async () => {
  await browser?.close();
});

/** Real emitted React and runtime; browser-local request adapter, no PostgreSQL claim. */
async function workspace(width = 390, populate = true) {
  const emitted = loadInventoryRuntime(),
    store = new emitted.InMemoryRecordStore(),
    runtime = new emitted.ApplicationRuntime(store);
  const command = (
    operation: string,
    id?: string,
    body: unknown = {
      values: { sku: "CABLE-USB-C", name: "USB-C charging cable" },
    },
    key = crypto.randomUUID(),
  ) =>
    runtime.inventoryCommand(
      "stockkeeper",
      "browser",
      "stock-item",
      id,
      operation,
      key,
      body,
    );
  let cable: any, pad: any;
  if (populate) {
    cable = (await command("create")).body;
    pad = (
      await command("create", undefined, {
        values: { sku: "PAD-A5", name: "A5 writing pad" },
      })
    ).body;
    cable = (
      await command("receive", cable.id, {
        expectedVersion: 0,
        quantity: 10,
        reason: "Stockroom delivery",
      })
    ).body.item;
  }
  const context = await browser.newContext({
      viewport: { width, height: 844 },
    }),
    page = await context.newPage();
  page.setDefaultTimeout(5000);
  const requests: any[] = [],
    errors: string[] = [],
    remote: string[] = [];
  page.on("pageerror", (error: Error) => errors.push(error.message));
  page.on("request", (request: any) => {
    if (!request.url().startsWith("https://inventory.test/"))
      remote.push(request.url());
  });
  let fault: string | undefined, release: (() => void) | undefined;
  await page.route("https://inventory.test/**", async (route: any) => {
    const request = route.request(),
      url = new URL(request.url()),
      method = request.method();
    if (!url.pathname.startsWith("/api/")) {
      await route.fulfill({
        contentType: "text/html",
        body:
          '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>' +
          css +
          '</style></head><body><div id="root"></div><script>' +
          script +
          "</script></body></html>",
      });
      return;
    }
    const role = (request.headers()["x-factory-fixture-session"] ?? "").replace(
        "fixture-session-",
        "",
      ),
      parts = url.pathname.split("/").filter(Boolean);
    const body = request.postData()
        ? JSON.parse(request.postData())
        : undefined,
      key = request.headers()["x-factory-idempotency-key"];
    requests.push({
      method,
      role,
      url: url.pathname + url.search,
      body,
      raw: request.postData(),
      key,
    });
    const lose = fault === "network" && method !== "GET",
      hold = fault === "hold" && method === "GET" && parts[3] === "movements";
    if (lose || hold) fault = undefined;
    try {
      let result: any;
      if (method === "GET")
        result =
          parts[3] === "movements"
            ? await runtime.inventoryHistory(
                role,
                parts[1],
                parts[2],
                url.search,
              )
            : parts[2]
              ? await runtime.inventoryRead(role, parts[1], parts[2])
              : await runtime.inventoryList(role, parts[1], url.search);
      else
        result = (
          await runtime.inventoryCommand(
            role,
            "browser",
            parts[1],
            parts[2],
            method === "PATCH" ? "update" : (parts[4] ?? "create"),
            key,
            body,
          )
        ).body;
      if (hold)
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      if (lose) {
        await route.abort("failed");
        return;
      }
      await route.fulfill({
        status: method === "POST" ? 201 : 200,
        contentType: "application/json",
        body: JSON.stringify(result),
      });
    } catch (error: any) {
      await route.fulfill({
        status: error.status ?? 500,
        contentType: "application/json",
        body: JSON.stringify(
          error.body ?? { code: "inventory.internal_error" },
        ),
      });
    }
  });
  await page.goto("https://inventory.test/");
  await page.getByLabel("Demo role").selectOption("stockkeeper");
  await browserExpect(
    page.getByRole("heading", { name: "Stock on hand", exact: true }),
  ).toBeVisible();
  const open = async () => {
    await page
      .getByRole("link", { name: "USB-C charging cable", exact: true })
      .click();
    await browserExpect(page.locator(".inventory-balance")).toContainText("10");
  };
  return {
    page,
    context,
    runtime,
    command,
    cable,
    pad,
    requests,
    errors,
    remote,
    open,
    setFault: (value: string) => {
      fault = value;
    },
    release: () => release?.(),
  };
}
async function fillMovement(
  page: any,
  operation: string,
  quantity: string,
  reason: string,
) {
  await page.getByRole("button", { name: operation, exact: true }).click();
  await browserExpect(page.locator("#inventory-amount")).toBeFocused();
  const amountBox = await page.locator("#inventory-amount").boundingBox();
  expect(amountBox.y).toBeGreaterThanOrEqual(0);
  expect(amountBox.y + amountBox.height).toBeLessThanOrEqual(844);
  await page
    .getByLabel(
      operation === "Adjust stock" ? "Adjustment (each)" : "Quantity (each)",
      { exact: true },
    )
    .fill(quantity);
  await page.getByLabel("Reason", { exact: true }).fill(reason);
}
async function submit(page: any, label: string) {
  await page
    .locator(".inventory-editor")
    .getByRole("button", { name: label, exact: true })
    .click();
}
async function capture(page: any, name: string) {
  await page.screenshot({
    path: join(evidence, name + ".png"),
    fullPage: true,
  });
}

describe("Inventory Operations presentation", () => {
  it("emits the private workspace and strict frontend TypeScript through the public compiler", () => {
    expect(source).toContain("inventory-operations-presentation@1.0.0");
    expect(source).toContain("Issue stock");
    expect(css).toContain(".inventory-v1");
    expect(
      bundle.files.find((file) => file.path === "THIRD_PARTY_NOTICES.md")
        ?.content,
    ).toContain("Lucide");
    expect(inventoryOperationsPresentation).toMatchObject({
      key: "inventory-operations-presentation",
      version: "1.0.0",
      iconPackage: "lucide-static@0.468.0",
    });
    const file = join(
      root,
      "apps/workbench/inventory-typecheck.tsx",
    ).replaceAll("\\", "/");
    const options: ts.CompilerOptions = {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      jsx: ts.JsxEmit.ReactJSX,
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      esModuleInterop: true,
    };
    const host = ts.createCompilerHost(options),
      read = host.readFile.bind(host),
      exists = host.fileExists.bind(host);
    host.readFile = (name) => (name === file ? source : read(name));
    host.fileExists = (name) => name === file || exists(name);
    expect(
      ts
        .getPreEmitDiagnostics(ts.createProgram([file], options, host))
        .map((item) => ts.flattenDiagnosticMessageText(item.messageText, "\n")),
    ).toEqual([]);
  });
  it("escapes Graph text and substitutes only template placeholders", () => {
    const input = inventoryOperationsInput(),
      profile = selectInventoryOperationsProfile(
        input.graph,
        input.compositionLock,
      )!;
    input.graph.metadata.name =
      "CONFIG_JSON ICONS_JSON HEADER_CHANNEL </script>";
    const emitted = renderInventoryOperationsWorkspace(
      input.graph,
      profile,
      true,
    );
    expect(emitted).toContain(
      '"name":"CONFIG_JSON ICONS_JSON HEADER_CHANNEL \\u003c/script>"',
    );
    expect(emitted).not.toContain("</script>");
  });
  it("starts empty and creates normalized zero-balance items through the visible form", async () => {
    const s = await workspace(390, false);
    try {
      await browserExpect(
        s.page.getByRole("heading", { name: "Your stockroom starts here" }),
      ).toBeVisible();
      await capture(s.page, "empty-390");
      const add = s.page
        .locator(".inventory-empty")
        .getByRole("link", { name: "Add item" });
      expect((await add.boundingBox()).y).toBeLessThan(844);
      await add.click();
      await browserExpect(
        s.page.getByLabel("SKU", { exact: true }),
      ).toBeFocused();
      await s.page.getByLabel("SKU", { exact: true }).fill("cable-usb-c");
      await s.page
        .getByLabel("Item name", { exact: true })
        .fill("USB-C charging cable");
      await capture(s.page, "create-390");
      await submit(s.page, "Add item");
      await browserExpect(s.page.locator(".inventory-balance")).toHaveText(
        "0each available",
      );
      await browserExpect(s.page.locator(".inventory-sku")).toHaveText(
        "CABLE-USB-C",
      );
      expect(
        (
          await s.runtime.inventoryHistory(
            "stockkeeper",
            "stock-item",
            (await s.runtime.inventoryList("observer", "stock-item")).records[0]
              .id,
          )
        ).records,
      ).toEqual([]);
      await fillMovement(s.page, "Receive stock", "10", "Stockroom delivery");
      await submit(s.page, "Receive stock");
      await browserExpect(s.page.locator(".inventory-balance")).toHaveText(
        "10each available",
      );
      await browserExpect(
        s.page.locator(".inventory-movements li"),
      ).toHaveCount(1);
      expect(s.errors).toEqual([]);
    } finally {
      await s.context.close();
    }
  });
  it.each([390, 768, 1440])(
    "shows two full authored summaries and phone primary issue in a %i px workspace",
    async (width) => {
      const s = await workspace(width);
      try {
        await browserExpect(s.page.locator(".inventory-record")).toHaveCount(2);
        for (const row of await s.page.locator(".inventory-record").all()) {
          const box = await row.boundingBox();
          expect(box.y + box.height).toBeLessThan(844);
          await browserExpect(row).toContainText("each");
        }
        expect(
          await s.page
            .locator(".inventory-record h3 a")
            .first()
            .evaluate((element: HTMLElement) => ({
              border: getComputedStyle(element).borderWidth,
              height: element.getBoundingClientRect().height,
            })),
        ).toEqual({ border: "0px", height: 44 });
        expect(
          await s.page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        ).toBe(true);
        await capture(s.page, "populated-" + width);
        await s.open();
        const issue = await s.page
          .getByRole("button", { name: "Issue stock", exact: true })
          .boundingBox();
        expect(issue.y + issue.height).toBeLessThan(844);
        expect(
          await s.page
            .getByRole("button", { name: "Refresh", exact: true })
            .evaluate((element: HTMLElement) => {
              const rect = element.getBoundingClientRect();
              return rect.width >= 44 && rect.height >= 44;
            }),
        ).toBe(true);
        await capture(s.page, "detail-" + width);
        expect(s.remote).toEqual([]);
        expect(s.errors).toEqual([]);
      } finally {
        await s.context.close();
      }
    },
  );
  it("issues, links a compensating correction, and changes only the name while retaining server history", async () => {
    const s = await workspace();
    try {
      await s.open();
      await fillMovement(s.page, "Issue stock", "3", "Supplies for the team");
      await browserExpect(s.page.locator(".inventory-proposal")).toHaveText(
        "Proposed balance: 7 each.",
      );
      await capture(s.page, "issue-input-390");
      await submit(s.page, "Issue stock");
      await browserExpect(s.page.locator(".inventory-balance")).toHaveText(
        "7each available",
      );
      await s.page.setViewportSize({ width: 1440, height: 844 });
      const original = s.page
        .locator(".inventory-movements li")
        .filter({ hasText: "Stockroom delivery" });
      await original
        .getByRole("button", { name: "Correct this movement" })
        .click();
      await browserExpect(s.page.locator("#inventory-amount")).toBeFocused();
      await s.page.getByLabel("Adjustment (each)", { exact: true }).fill("-1");
      await s.page
        .getByLabel("Reason", { exact: true })
        .fill("One cable missing from original delivery");
      await capture(s.page, "adjust-input-1440");
      await submit(s.page, "Adjust stock");
      await browserExpect(s.page.locator(".inventory-balance")).toHaveText(
        "6each available",
      );
      await browserExpect(
        s.page.locator(".inventory-movements li"),
      ).toHaveCount(3);
      const before = (
        await s.runtime.inventoryHistory(
          "stockkeeper",
          "stock-item",
          s.cable.id,
        )
      ).records;
      expect(
        before.find((entry: any) => entry.kind === "adjust").correctionOf,
      ).toBe(before.find((entry: any) => entry.kind === "receive").id);
      await s.page
        .getByRole("button", { name: "Edit name", exact: true })
        .click();
      await browserExpect(
        s.page.getByLabel("Item name", { exact: true }),
      ).toBeFocused();
      await s.page
        .getByLabel("Item name", { exact: true })
        .fill("USB-C charging cable (1 metre)");
      await submit(s.page, "Save name");
      await browserExpect(s.page.locator(".inventory-identity h2")).toHaveText(
        "USB-C charging cable (1 metre)",
      );
      await s.page.reload();
      await browserExpect(s.page.locator(".inventory-balance")).toHaveText(
        "6each available",
      );
      await browserExpect(
        s.page.locator(".inventory-movements li"),
      ).toHaveCount(3);
      expect(
        (
          await s.runtime.inventoryHistory(
            "stockkeeper",
            "stock-item",
            s.cable.id,
          )
        ).records,
      ).toEqual(before);
      expect(
        await s.runtime.inventoryRead("observer", "stock-item", s.pad.id),
      ).toMatchObject({ quantity: 0, version: 0 });
      await capture(s.page, "result-1440");
      expect(s.errors).toEqual([]);
    } finally {
      await s.context.close();
    }
  });
  it("keeps insufficient-stock intent and rejects fractions and negative zero without sending them", async () => {
    const s = await workspace();
    try {
      await s.open();
      await fillMovement(s.page, "Issue stock", "11", "Team supplies");
      await submit(s.page, "Issue stock");
      await browserExpect(s.page.getByRole("alert")).toContainText(
        "not enough stock",
      );
      await browserExpect(
        s.page.getByLabel("Quantity (each)", { exact: true }),
      ).toHaveValue("11");
      expect(
        await s.page.locator('label[for="inventory-reason"]').textContent(),
      ).toBe("Reason");
      await browserExpect(
        s.page.getByLabel("Reason", { exact: true }),
      ).toHaveValue("Team supplies");
      await capture(s.page, "insufficient-390");
      expect(
        (
          await s.runtime.inventoryHistory(
            "stockkeeper",
            "stock-item",
            s.cable.id,
          )
        ).records,
      ).toHaveLength(1);
      const writes = s.requests.filter((item) => item.method !== "GET").length;
      for (const value of ["1.5", "-0", "1e2", "1000000001"]) {
        await s.page.getByLabel("Quantity (each)", { exact: true }).fill(value);
        await submit(s.page, "Issue stock");
        await browserExpect(s.page.getByRole("alert")).toContainText(
          "positive whole-number",
        );
      }
      expect(s.requests.filter((item) => item.method !== "GET")).toHaveLength(
        writes,
      );
      await s.page.getByLabel("Quantity (each)", { exact: true }).fill("3");
      await submit(s.page, "Issue stock");
      await browserExpect(s.page.locator(".inventory-balance")).toHaveText(
        "7each available",
      );
    } finally {
      await s.context.close();
    }
  });
  it("requires fresh balance review and explicit confirmation before a new stale-intent command", async () => {
    const s = await workspace();
    try {
      await s.open();
      await fillMovement(s.page, "Issue stock", "3", "Phone supplies");
      await s.command("receive", s.cable.id, {
        expectedVersion: 1,
        quantity: 2,
        reason: "Concurrent delivery",
      });
      await submit(s.page, "Issue stock");
      await browserExpect(s.page.getByRole("alert")).toContainText(
        "Stock changed",
      );
      await capture(s.page, "stale-390");
      await browserExpect(
        s.page
          .locator(".inventory-editor")
          .getByRole("button", { name: "Issue stock", exact: true }),
      ).toBeDisabled();
      await s.page
        .getByRole("button", { name: "Refresh current stock", exact: true })
        .click();
      await browserExpect(s.page.locator(".inventory-proposal")).toHaveText(
        "Proposed balance: 9 each.",
      );
      expect(s.requests.filter((item) => item.method !== "GET")).toHaveLength(
        1,
      );
      await browserExpect(
        s.page.getByLabel("Reason", { exact: true }),
      ).toHaveValue("Phone supplies");
      await submit(s.page, "Confirm issue stock with latest stock");
      await browserExpect(s.page.locator(".inventory-balance")).toHaveText(
        "9each available",
      );
      const writes = s.requests.filter((item) => item.method !== "GET");
      expect(writes[0].key).not.toBe(writes[1].key);
      expect(writes.map((item) => item.body.expectedVersion)).toEqual([1, 2]);
      expect(
        (
          await s.runtime.inventoryHistory(
            "stockkeeper",
            "stock-item",
            s.cable.id,
          )
        ).records,
      ).toHaveLength(3);
    } finally {
      await s.context.close();
    }
  });
  it("retries exactly the saved body and key after response loss without adding a second movement", async () => {
    const s = await workspace();
    try {
      await s.open();
      await fillMovement(s.page, "Issue stock", "3", "Uncertain issue");
      s.setFault("network");
      await submit(s.page, "Issue stock");
      await browserExpect(s.page.getByRole("alert")).toContainText(
        "not confirmed",
      );
      await capture(s.page, "uncertain-390");
      await browserExpect(
        s.page.getByLabel("Quantity (each)", { exact: true }),
      ).toBeDisabled();
      await browserExpect(
        s.page.getByRole("button", { name: "Back to stock", exact: true }),
      ).toBeDisabled();
      await s.page
        .getByRole("button", { name: "Retry same change", exact: true })
        .click();
      await browserExpect(s.page.locator(".inventory-balance")).toHaveText(
        "7each available",
      );
      await browserExpect(
        s.page.locator(".inventory-movements li"),
      ).toHaveCount(2);
      const writes = s.requests.filter((item) => item.method !== "GET");
      expect(writes).toHaveLength(2);
      expect(writes[0].raw).toBe(writes[1].raw);
      expect(writes[0].key).toBe(writes[1].key);
      expect(
        (
          await s.runtime.inventoryHistory(
            "stockkeeper",
            "stock-item",
            s.cable.id,
          )
        ).records,
      ).toHaveLength(2);
    } finally {
      await s.context.close();
    }
  });
  it("clears private history, correction intent and late reads on role change", async () => {
    const s = await workspace();
    try {
      await s.open();
      await browserExpect(
        s.page.locator(".inventory-movements li"),
      ).toHaveCount(1);
      await fillMovement(
        s.page,
        "Issue stock",
        "2",
        "Private correction reason",
      );
      await s.page.getByLabel("Demo role").selectOption("observer");
      await browserExpect(s.page.locator(".inventory-history")).toHaveCount(0);
      await browserExpect(s.page.locator(".inventory-editor")).toHaveCount(0);
      await browserExpect(
        s.page.getByRole("button", { name: "Issue stock", exact: true }),
      ).toHaveCount(0);
      await s.page.getByLabel("Demo role").selectOption("stockkeeper");
      await browserExpect(
        s.page.locator(".inventory-movements li"),
      ).toHaveCount(1);
      s.setFault("hold");
      await s.page
        .getByRole("button", { name: "Refresh", exact: true })
        .click();
      await browserExpect
        .poll(
          () =>
            s.requests.filter((item) => item.url.includes("/movements?"))
              .length,
        )
        .toBeGreaterThanOrEqual(3);
      await s.page.getByLabel("Demo role").selectOption("observer");
      s.release();
      await browserExpect(s.page.locator(".inventory-history")).toHaveCount(0);
      expect(
        s.requests.filter(
          (item) => item.role === "observer" && item.url.includes("/movements"),
        ),
      ).toEqual([]);
      expect(s.errors).toEqual([]);
    } finally {
      s.release();
      await s.context.close();
    }
  });
  it("uses literal search, no-results recovery and bounded item/history pages", async () => {
    const s = await workspace(768);
    try {
      await s.page.getByLabel("Search stock", { exact: true }).fill("%_");
      await s.page.getByRole("button", { name: "Search", exact: true }).click();
      await browserExpect(
        s.page.getByRole("heading", { name: "No matching items" }),
      ).toBeVisible();
      await capture(s.page, "no-results-768");
      await s.page
        .getByRole("button", { name: "Clear filters", exact: true })
        .click();
      await browserExpect(s.page.locator(".inventory-record")).toHaveCount(2);
      for (let index = 0; index < 20; index++)
        await s.command("create", undefined, {
          values: {
            sku: "EXTRA-" + String(index).padStart(2, "0"),
            name: "Extra stock item " + index,
          },
        });
      await s.page
        .getByRole("button", { name: "Refresh", exact: true })
        .click();
      await browserExpect(s.page.locator(".inventory-record")).toHaveCount(20);
      await s.page.getByRole("button", { name: "Next", exact: true }).click();
      await browserExpect(s.page.locator(".inventory-record")).toHaveCount(2);
      expect(
        s.requests.some(
          (item) =>
            item.url.includes("offset=20") && item.url.includes("limit=20"),
        ),
      ).toBe(true);
      await s.page
        .getByRole("button", { name: "Previous", exact: true })
        .click();
      await s.open();
      for (let index = 0; index < 20; index++)
        await s.command("receive", s.cable.id, {
          expectedVersion: index + 1,
          quantity: 1,
          reason: "Additional delivery " + index,
        });
      await s.page
        .getByRole("button", { name: "Refresh", exact: true })
        .click();
      await browserExpect(
        s.page.locator(".inventory-movements li"),
      ).toHaveCount(20);
      await s.page.getByRole("button", { name: "Next", exact: true }).click();
      await browserExpect(
        s.page.locator(".inventory-movements li"),
      ).toHaveCount(1);
    } finally {
      await s.context.close();
    }
  });
  it("wraps long names in dark mode, retains visible focus and makes no media requests", async () => {
    const s = await workspace();
    try {
      const longName =
        "Charging cable with a long descriptive stockroom name ".repeat(2);
      await s.command("update", s.cable.id, {
        expectedVersion: 1,
        values: { name: longName },
      });
      await s.page.emulateMedia({
        colorScheme: "dark",
        reducedMotion: "reduce",
      });
      await s.page.reload();
      await browserExpect(
        s.page.getByRole("link", { name: longName.trim(), exact: true }),
      ).toBeVisible();
      await s.page
        .locator("main")
        .evaluate((element: HTMLElement) => (element.dataset.theme = "dark"));
      await s.page.getByRole("button", { name: "Search", exact: true }).focus();
      expect(
        await s.page
          .getByRole("button", { name: "Search", exact: true })
          .evaluate(
            (element: HTMLElement) => getComputedStyle(element).outlineStyle,
          ),
      ).not.toBe("none");
      expect(
        await s.page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await capture(s.page, "dark-long-name-390");
      expect(await s.page.locator("img,video").count()).toBe(0);
      expect(s.remote).toEqual([]);
      expect(s.errors).toEqual([]);
    } finally {
      await s.context.close();
    }
  });
});
