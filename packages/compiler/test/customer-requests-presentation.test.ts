import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { mkdirSync } from "node:fs";
import ts from "typescript";
import { afterAll, beforeAll, expect, it } from "vitest";
import { createCapabilityCompositionLock } from "@factory/capabilities";
import {
  hashApplicationGraph,
  resolveExperienceDesignSystem,
} from "@factory/graph";
import { generateApplicationBundle } from "../src/index.js";
import { customerRequestsInput } from "./fixtures/customer-requests.js";
import { loadWorkOrdersRuntime } from "./fixtures/service-work-orders-runtime.js";

const require = createRequire(import.meta.url);
const root = resolve(__dirname, "../../..");
const playwright = require("@playwright/test");
const viteRequire = createRequire(
  createRequire(require.resolve("vitest/package.json")).resolve(
    "vite/package.json",
  ),
);
const bundle = generateApplicationBundle({
  publishedRevisionId: "customer-requests-presentation",
  ...customerRequestsInput(),
});
const source = bundle.files.find(
  (file) => file.path === "web/app/page-runtime.tsx",
)!.content;
const css = bundle.files.find(
  (file) => file.path === "web/app/globals.css",
)!.content;
const evidence = join(root, "generated/.customer-requests-task3/revision-3");
const capture = process.env.FACTORY_CAPTURE_CUSTOMER_REQUESTS_UI === "1";
let browser: any;
let script: string;
const themed = new Map<string, { script: string; css: string }>();
async function emittedTheme(kind: "dark" | "explicit") {
  const cached = themed.get(kind);
  if (cached) return cached;
  const input = customerRequestsInput();
  const graph = structuredClone(input.graph);
  graph.experience.theme.mode = kind === "dark" ? "dark" : "light";
  if (kind === "explicit") {
    const designSystem = structuredClone(
      resolveExperienceDesignSystem(graph.experience),
    );
    designSystem.tokens.colour.light.brand = "#285430";
    designSystem.tokens.colour.light.background = "#fff9e8";
    designSystem.tokens.colour.dark.brand = "#b3d9ba";
    designSystem.tokens.colour.dark.background = "#142b1b";
    graph.experience.designSystem = designSystem;
  }
  const compositionLock = createCapabilityCompositionLock({
    graphChecksum: hashApplicationGraph(graph),
    selections: input.compositionLock.packages,
  });
  const files = generateApplicationBundle({
    publishedRevisionId: "customer-requests-" + kind,
    ...input,
    graph,
    compositionLock,
  }).files;
  const pageSource = files.find(
    (file) => file.path === "web/app/page-runtime.tsx",
  )!.content;
  const pageCss = files.find(
    (file) => file.path === "web/app/globals.css",
  )!.content;
  const pageScript = (
    await viteRequire("esbuild").build({
      stdin: {
        contents:
          pageSource +
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
  const value = { script: pageScript, css: pageCss };
  themed.set(kind, value);
  return value;
}

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
  if (capture) mkdirSync(evidence, { recursive: true });
});
afterAll(async () => {
  await browser?.close();
});

async function workspace(
  width = 390,
  populated = true,
  theme?: "dark" | "explicit",
  initialHold = false,
) {
  const skin = theme ? await emittedTheme(theme) : { script, css };
  const emitted = loadWorkOrdersRuntime(undefined, customerRequestsInput());
  const runtime = new emitted.ApplicationRuntime(
    new emitted.InMemoryRecordStore(),
  );
  const actors: Record<string, any> = {
    "fixture-session-customer-a": {
      principalId: "fixture-principal-customer-a",
      sessionId: "fixture-session-customer-a",
      tenantId: "tenant-local",
      roles: ["customer"],
      expiresAt: "2099-01-01T00:00:00.000Z",
    },
    "fixture-session-customer-b": {
      principalId: "fixture-principal-customer-b",
      sessionId: "fixture-session-customer-b",
      tenantId: "tenant-local",
      roles: ["customer"],
      expiresAt: "2099-01-01T00:00:00.000Z",
    },
    "fixture-session-support-staff": {
      principalId: "fixture-principal-support-staff",
      sessionId: "fixture-session-support-staff",
      tenantId: "tenant-local",
      roles: ["staff"],
      expiresAt: "2099-01-01T00:00:00.000Z",
    },
  };
  let requestId: string | undefined;
  if (populated) {
    const created = await runtime.customerRequestCommand(
      actors["fixture-session-customer-a"],
      "customer-request",
      undefined,
      "create",
      "seed-create",
      {
        values: {
          subject: "A printer needs attention",
          description:
            "The receipt printer stops after the first page.\nPlease help us resume service.",
        },
      },
    );
    requestId = created.body.request.id;
    await runtime.customerRequestCommand(
      actors["fixture-session-support-staff"],
      "customer-request",
      requestId,
      "reply",
      "seed-reply",
      {
        expectedVersion: 0,
        message: "We are checking the paper feed.",
        correctsVersion: null,
      },
    );
  }
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    hasTouch: width <= 768,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  const calls: any[] = [];
  const failedReads: string[] = [];
  page.on("requestfailed", (request: any) => {
    if (request.method() === "GET")
      failedReads.push(
        new URL(request.url()).pathname + new URL(request.url()).search,
      );
  });
  let holdSession: string | undefined = initialHold
    ? "fixture-session-customer-a"
    : undefined;
  let release: (() => void) | undefined;
  let loseResponse = false;
  let failRead = false;
  await page.route("https://requests.test/**", async (route: any) => {
    const request = route.request(),
      url = new URL(request.url());
    if (!url.pathname.startsWith("/api/")) {
      await route.fulfill({
        contentType: "text/html",
        body:
          '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>' +
          skin.css +
          '</style></head><body><div id="root"></div><script>' +
          skin.script +
          "</script></body></html>",
      });
      return;
    }
    const session = request.headers()["x-factory-fixture-session"];
    const actor = actors[session];
    const segments = url.pathname.split("/").filter(Boolean);
    const body = request.postData()
      ? JSON.parse(request.postData())
      : undefined;
    calls.push({
      session,
      method: request.method(),
      path: url.pathname + url.search,
      body,
      key: request.headers()["x-factory-idempotency-key"],
    });
    if (failRead && request.method() === "GET") {
      failRead = false;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: '{"code":"customer_request.unavailable"}',
      });
      return;
    }
    if (session === holdSession && request.method() === "GET") {
      holdSession = undefined;
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    }
    try {
      let result: any,
        status = 200;
      if (request.method() === "GET" && segments.length === 2)
        result = await runtime.customerRequestList(
          actor,
          segments[1],
          url.search.slice(1),
        );
      else if (request.method() === "GET" && segments.length === 3)
        result = await runtime.customerRequestRead(
          actor,
          segments[1],
          segments[2],
        );
      else if (
        request.method() === "GET" &&
        segments.length === 4 &&
        segments[3] === "history"
      )
        result = await runtime.customerRequestHistory(
          actor,
          segments[1],
          segments[2],
          url.search.slice(1),
        );
      else if (request.method() === "POST") {
        const command = segments.length === 2 ? "create" : segments[4];
        const saved = await runtime.customerRequestCommand(
          actor,
          segments[1],
          segments.length === 2 ? undefined : segments[2],
          command,
          request.headers()["x-factory-idempotency-key"],
          body,
        );
        result = saved.body;
        status = saved.status;
        if (loseResponse) {
          loseResponse = false;
          await route.abort("failed");
          return;
        }
      } else throw Error("Unexpected intercepted path");
      await route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(result),
        headers: { "Cache-Control": "no-store" },
      });
    } catch (error: any) {
      await route.fulfill({
        status: error.status ?? 500,
        contentType: "application/json",
        body: JSON.stringify(
          error.body ?? { code: "customer_request.internal_error" },
        ),
        headers: { "Cache-Control": "no-store" },
      });
    }
  });
  await page.goto("https://requests.test/my-requests");
  return {
    page,
    context,
    calls,
    failedReads,
    requestId,
    runtime,
    actors,
    hold: (session: string) => {
      holdSession = session;
    },
    release: () => release?.(),
    lose: () => {
      loseResponse = true;
    },
    failRead: () => {
      failRead = true;
    },
  };
}

it("emits the Customer Requests conversation workspace and its scoped styles", () => {
  expect(source).toContain("customer-requests-presentation@1.0.0");
  expect(css).toContain(".customer-request-v1");
});

it("repair1 keeps the history boundary after refresh supersedes a held earlier page", async () => {
  const harness = await workspace();
  try {
    for (let version = 2; version <= 22; version++) {
      await harness.runtime.customerRequestCommand(
        harness.actors["fixture-session-customer-a"],
        "customer-request",
        harness.requestId,
        "reply",
        "repair-history-" + version,
        {
          expectedVersion: version - 1,
          message: "Follow-up " + version,
          correctsVersion: null,
        },
      );
    }
    await harness.page
      .getByRole("button", { name: /A printer needs attention/ })
      .click();
    await expect
      .poll(() =>
        harness.page
          .getByRole("button", { name: "Load earlier messages" })
          .count(),
      )
      .toBe(1);
    harness.hold("fixture-session-customer-a");
    await harness.page
      .getByRole("button", { name: "Load earlier messages" })
      .click();
    await expect
      .poll(() =>
        harness.calls.some((call) => call.path.includes("beforeVersion=3")),
      )
      .toBe(true);
    await harness.runtime.customerRequestCommand(
      harness.actors["fixture-session-customer-a"],
      "customer-request",
      harness.requestId,
      "reply",
      "repair-newest",
      {
        expectedVersion: 22,
        message: "Newest saved reply",
        correctsVersion: null,
      },
    );
    await harness.page
      .getByRole("button", { name: "Refresh requests" })
      .click();
    await expect
      .poll(() => harness.page.getByText("Newest saved reply").count())
      .toBe(1);
    await expect
      .poll(() =>
        harness.failedReads.some((path) => path.includes("beforeVersion=3")),
      )
      .toBe(true);
    harness.release();
    await expect
      .poll(() =>
        harness.page
          .getByRole("button", { name: "Load earlier messages" })
          .count(),
      )
      .toBe(1);
    await harness.page
      .getByRole("button", { name: "Load earlier messages" })
      .click();
    await expect
      .poll(() => harness.page.getByText("Follow-up 3").count())
      .toBe(1);
  } finally {
    harness.release();
    await harness.context.close();
  }
});

it("repair1 aborts held customer reads on principal switch", async () => {
  const harness = await workspace();
  try {
    harness.hold("fixture-session-customer-a");
    await harness.page
      .getByRole("button", { name: "Refresh requests" })
      .click();
    await expect
      .poll(
        () =>
          harness.calls.filter(
            (call) =>
              call.session === "fixture-session-customer-a" &&
              call.method === "GET",
          ).length,
      )
      .toBeGreaterThan(1);
    await harness.page
      .getByLabel("Local demo · synthetic people")
      .selectOption("fixture-principal-customer-b");
    await expect
      .poll(
        () =>
          harness.failedReads.some(
            (path) => path === "/api/customer-request?limit=20",
          ),
        { timeout: 1500 },
      )
      .toBe(true);
    await expect
      .poll(() => harness.page.getByText("No requests yet").count())
      .toBe(1);
  } finally {
    harness.release();
    await harness.context.close();
  }
});

it("repair1 aborts a held detail read when its principal switches", async () => {
  const harness = await workspace();
  try {
    await expect
      .poll(() =>
        harness.page
          .getByRole("button", { name: /A printer needs attention/ })
          .count(),
      )
      .toBe(1);
    harness.hold("fixture-session-customer-a");
    await harness.page
      .getByRole("button", { name: /A printer needs attention/ })
      .click();
    await expect
      .poll(() =>
        harness.calls.some(
          (call) => call.path === "/api/customer-request/" + harness.requestId,
        ),
      )
      .toBe(true);
    await harness.page
      .getByLabel("Local demo · synthetic people")
      .selectOption("fixture-principal-customer-b");
    await expect
      .poll(() =>
        harness.failedReads.includes(
          "/api/customer-request/" + harness.requestId,
        ),
      )
      .toBe(true);
    await expect
      .poll(() => harness.page.getByText("A printer needs attention").count())
      .toBe(0);
  } finally {
    harness.release();
    await harness.context.close();
  }
});

it("repair1 aborts held earlier history when its principal switches", async () => {
  const harness = await workspace();
  try {
    for (let version = 2; version <= 21; version++) {
      await harness.runtime.customerRequestCommand(
        harness.actors["fixture-session-customer-a"],
        "customer-request",
        harness.requestId,
        "reply",
        "repair-switch-history-" + version,
        {
          expectedVersion: version - 1,
          message: "Follow-up " + version,
          correctsVersion: null,
        },
      );
    }
    await harness.page
      .getByRole("button", { name: /A printer needs attention/ })
      .click();
    await expect
      .poll(() =>
        harness.page
          .getByRole("button", { name: "Load earlier messages" })
          .count(),
      )
      .toBe(1);
    harness.hold("fixture-session-customer-a");
    await harness.page
      .getByRole("button", { name: "Load earlier messages" })
      .click();
    await expect
      .poll(() =>
        harness.calls.some((call) => call.path.includes("beforeVersion=2")),
      )
      .toBe(true);
    await harness.page
      .getByLabel("Local demo · synthetic people")
      .selectOption("fixture-principal-customer-b");
    await expect
      .poll(() =>
        harness.failedReads.some((path) => path.includes("beforeVersion=2")),
      )
      .toBe(true);
    await expect
      .poll(() => harness.page.getByText("No requests yet").count())
      .toBe(1);
  } finally {
    harness.release();
    await harness.context.close();
  }
});

it("repair1 restores keyboard focus across mobile routes and editors", async () => {
  const harness = await workspace();
  try {
    const card = harness.page.getByRole("button", {
      name: /A printer needs attention/,
    });
    await card.focus();
    await harness.page.keyboard.press("Enter");
    await expect
      .poll(() =>
        harness.page
          .getByRole("button", { name: "Back to requests" })
          .evaluate((element: Element) => element === document.activeElement),
      )
      .toBe(true);
    await harness.page.keyboard.press("Enter");
    await expect
      .poll(() =>
        card.evaluate((element: Element) => element === document.activeElement),
      )
      .toBe(true);
    const create = harness.page.getByRole("button", { name: "New request" });
    await create.focus();
    await harness.page.keyboard.press("Enter");
    await expect
      .poll(() =>
        harness.page
          .getByRole("button", { name: "Start request" })
          .evaluate((element: Element) => element === document.activeElement),
      )
      .toBe(true);
    await harness.page.keyboard.press("Enter");
    await expect
      .poll(() =>
        harness.page
          .getByRole("textbox", { name: "Subject" })
          .evaluate((element: Element) => element === document.activeElement),
      )
      .toBe(true);
    await harness.page.getByRole("button", { name: "Close editor" }).click();
    await expect
      .poll(() =>
        harness.page
          .getByRole("button", { name: "Start request" })
          .evaluate((element: Element) => element === document.activeElement),
      )
      .toBe(true);
    await harness.page
      .getByRole("button", { name: "Back to requests" })
      .click();
    await expect
      .poll(() =>
        create.evaluate(
          (element: Element) => element === document.activeElement,
        ),
      )
      .toBe(true);
    await card.focus();
    await harness.page.keyboard.press("Enter");
    const reply = harness.page.getByRole("button", { name: "Send reply" });
    await reply.focus();
    await harness.page.keyboard.press("Enter");
    await expect
      .poll(() =>
        harness.page
          .getByRole("textbox", { name: "Message" })
          .evaluate((element: Element) => element === document.activeElement),
      )
      .toBe(true);
    await harness.page.getByRole("button", { name: "Close editor" }).click();
    await expect
      .poll(() =>
        reply.evaluate(
          (element: Element) => element === document.activeElement,
        ),
      )
      .toBe(true);
  } finally {
    await harness.context.close();
  }
});

it("strictly typechecks the emitted React page", () => {
  const file = join(
    root,
    "apps/workbench/customer-requests-typecheck.tsx",
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
  const program = ts.createProgram([file], options, host);
  expect(
    ts
      .getPreEmitDiagnostics(program)
      .map((item) => ts.flattenDiagnosticMessageText(item.messageText, "\n")),
  ).toEqual([]);
});

it("shows owned conversation and clears it on principal switch", async () => {
  const harness = await workspace();
  try {
    await harness.page
      .getByRole("button", { name: /A printer needs attention/ })
      .click();
    await expect
      .poll(() =>
        harness.page.getByText("We are checking the paper feed.").count(),
      )
      .toBe(1);
    await harness.page
      .getByLabel("Local demo · synthetic people")
      .selectOption("fixture-principal-customer-b");
    await expect
      .poll(() => harness.page.getByText("A printer needs attention").count())
      .toBe(0);
    expect(
      harness.calls.some(
        (call) =>
          call.session === "fixture-session-customer-b" &&
          call.path.includes(harness.requestId!),
      ),
    ).toBe(false);
  } finally {
    await harness.context.close();
  }
});

it("submits a customer request and carries a staff reply back to the customer", async () => {
  const harness = await workspace(390, false);
  try {
    await harness.page
      .getByRole("button", { name: "New request" })
      .first()
      .click();
    await harness.page.getByRole("button", { name: "Start request" }).click();
    await harness.page
      .getByRole("textbox", { name: "Subject" })
      .fill("Access to reports");
    await harness.page
      .getByRole("textbox", { name: "Description" })
      .fill("Please restore access to our weekly reports.");
    await harness.page.getByRole("button", { name: "Submit request" }).click();
    await expect
      .poll(() =>
        harness.page
          .getByRole("heading", { name: "Access to reports" })
          .count(),
      )
      .toBe(1);
    await harness.page
      .getByLabel("Local demo · synthetic people")
      .selectOption("fixture-principal-support-staff");
    await harness.page
      .getByRole("button", { name: /Access to reports/ })
      .click();
    await harness.page.getByRole("button", { name: "Send reply" }).click();
    await harness.page
      .getByRole("textbox", { name: "Message" })
      .fill("Report access has been restored.");
    await harness.page
      .getByRole("button", { name: "Send reply" })
      .last()
      .click();
    await expect
      .poll(() =>
        harness.page.getByText("Report access has been restored.").count(),
      )
      .toBe(1);
    await harness.page
      .getByLabel("Local demo · synthetic people")
      .selectOption("fixture-principal-customer-a");
    await harness.page
      .getByRole("button", { name: /Access to reports/ })
      .click();
    await expect
      .poll(() =>
        harness.page.getByText("Report access has been restored.").count(),
      )
      .toBe(1);
    expect(
      harness.calls
        .filter((call) => call.method === "POST")
        .every((call) => !!call.key),
    ).toBe(true);
  } finally {
    await harness.context.close();
  }
});

it("retries an uncertain reply using its frozen body and key", async () => {
  const harness = await workspace();
  try {
    await harness.page
      .getByRole("button", { name: /A printer needs attention/ })
      .click();
    await harness.page.getByRole("button", { name: "Send reply" }).click();
    await harness.page
      .getByRole("textbox", { name: "Message" })
      .fill("The feed now works.");
    harness.lose();
    await harness.page
      .getByRole("button", { name: "Send reply" })
      .last()
      .click();
    await expect
      .poll(() =>
        harness.page.getByRole("button", { name: "Try again safely" }).count(),
      )
      .toBe(1);
    if (capture)
      await harness.page.screenshot({
        path: join(evidence, "uncertain-390.png"),
        fullPage: true,
      });
    await harness.page
      .getByRole("button", { name: "Try again safely" })
      .click();
    await expect
      .poll(() => harness.page.getByText("The feed now works.").count())
      .toBe(1);
    const replies = harness.calls.filter((call) =>
      call.path.endsWith("/events/reply"),
    );
    expect(replies).toHaveLength(2);
    expect(replies[1]).toMatchObject({
      body: replies[0].body,
      key: replies[0].key,
      session: replies[0].session,
    });
  } finally {
    await harness.context.close();
  }
});

it("shows saved state before consciously reapplying a stale correction", async () => {
  const harness = await workspace();
  try {
    await harness.page
      .getByRole("button", { name: /A printer needs attention/ })
      .click();
    await harness.page.getByRole("button", { name: "Correct details" }).click();
    await harness.page
      .getByRole("textbox", { name: "Subject" })
      .fill("Printer jams after one page");
    await harness.page
      .getByRole("textbox", { name: "Reason" })
      .fill("The first description was too broad.");
    await harness.runtime.customerRequestCommand(
      harness.actors["fixture-session-support-staff"],
      "customer-request",
      harness.requestId,
      "reply",
      "concurrent-reply",
      {
        expectedVersion: 1,
        message: "We found the feed sensor.",
        correctsVersion: null,
      },
    );
    await harness.page.getByRole("button", { name: "Save correction" }).click();
    await expect
      .poll(() => harness.page.getByText("Saved request has changed").count())
      .toBe(1);
    await expect
      .poll(() => harness.page.getByText("We found the feed sensor.").count())
      .toBe(1);
    if (capture)
      await harness.page.screenshot({
        path: join(evidence, "stale-390.png"),
        fullPage: true,
      });
    expect(
      await harness.page.getByRole("textbox", { name: "Subject" }).inputValue(),
    ).toBe("Printer jams after one page");
    await harness.page
      .getByRole("button", { name: "Reapply draft to latest saved request" })
      .click();
    await harness.page.getByRole("button", { name: "Save correction" }).click();
    await expect
      .poll(() =>
        harness.page
          .getByRole("heading", { name: "Printer jams after one page" })
          .count(),
      )
      .toBe(1);
    const updates = harness.calls.filter((call) =>
      call.path.endsWith("/events/update"),
    );
    expect(updates.map((call) => call.body.expectedVersion)).toEqual([1, 2]);
  } finally {
    await harness.context.close();
  }
});

it("keeps correction links and loads earlier conversation pages", async () => {
  const harness = await workspace(1440);
  try {
    await harness.runtime.customerRequestCommand(
      harness.actors["fixture-session-support-staff"],
      "customer-request",
      harness.requestId,
      "reply",
      "staff-correction",
      {
        expectedVersion: 1,
        message: "We are checking the feed sensor instead.",
        correctsVersion: 1,
      },
    );
    for (let version = 3; version < 23; version++) {
      const actor =
        version % 2 === 0
          ? harness.actors["fixture-session-support-staff"]
          : harness.actors["fixture-session-customer-a"];
      await harness.runtime.customerRequestCommand(
        actor,
        "customer-request",
        harness.requestId,
        "reply",
        "page-" + version,
        {
          expectedVersion: version - 1,
          message: "Follow-up message " + version,
          correctsVersion: null,
        },
      );
    }
    await harness.runtime.customerRequestCommand(
      harness.actors["fixture-session-customer-a"],
      "customer-request",
      harness.requestId,
      "reply",
      "late-correction",
      {
        expectedVersion: 22,
        message: "A corrected early follow-up.",
        correctsVersion: 3,
      },
    );
    await harness.page
      .getByRole("button", { name: /A printer needs attention/ })
      .click();
    await expect
      .poll(() =>
        harness.page
          .getByText(
            "Corrects an earlier message. Load earlier messages to see it.",
          )
          .count(),
      )
      .toBe(1);
    await harness.page
      .getByRole("button", { name: "Load earlier messages" })
      .click();
    await expect
      .poll(() => harness.page.getByText("Request submitted").count())
      .toBe(1);
    await expect
      .poll(() =>
        harness.page.getByText(/Corrects support staff's message from/).count(),
      )
      .toBe(1);
    await expect
      .poll(() => harness.page.getByText(/Corrects your message from/).count())
      .toBe(1);
    expect(
      harness.calls.some((call) => call.path.includes("beforeVersion=")),
    ).toBe(true);
  } finally {
    await harness.context.close();
  }
});

it("shows resolution, customer reopen, and terminal cancellation with retained history", async () => {
  const harness = await workspace(1440);
  try {
    await harness.page
      .getByLabel("Local demo · synthetic people")
      .selectOption("fixture-principal-support-staff");
    await harness.page
      .getByRole("button", { name: /A printer needs attention/ })
      .click();
    await harness.page
      .getByRole("button", { name: "Resolve request" })
      .first()
      .click();
    await harness.page
      .getByRole("textbox", { name: "Resolution message" })
      .fill("The printer feed has been repaired.");
    await harness.page
      .getByRole("button", { name: "Resolve request" })
      .last()
      .click();
    await expect
      .poll(() =>
        harness.page.getByText("The printer feed has been repaired.").count(),
      )
      .toBe(1);
    await harness.page
      .getByLabel("Local demo · synthetic people")
      .selectOption("fixture-principal-customer-a");
    await harness.page
      .getByRole("button", { name: /A printer needs attention/ })
      .click();
    await harness.page
      .getByRole("button", { name: "Reopen request" })
      .first()
      .click();
    await harness.page
      .getByRole("textbox", { name: "Reason" })
      .fill("The issue has returned.");
    await harness.page
      .getByRole("button", { name: "Reopen request" })
      .last()
      .click();
    await expect
      .poll(() => harness.page.getByText("The issue has returned.").count())
      .toBe(1);
    await harness.page
      .getByRole("button", { name: "Cancel request" })
      .first()
      .click();
    await harness.page
      .getByRole("textbox", { name: "Reason" })
      .fill("We replaced the printer.");
    await harness.page
      .getByRole("button", { name: "Cancel request" })
      .last()
      .click();
    await expect
      .poll(() =>
        harness.page
          .getByText("Your request was cancelled. Its history is still here.")
          .count(),
      )
      .toBe(1);
    await expect
      .poll(() =>
        harness.page.getByText("The printer feed has been repaired.").count(),
      )
      .toBe(1);
    if (capture)
      await harness.page.screenshot({
        path: join(evidence, "cancelled-1440.png"),
        fullPage: true,
      });
    expect(
      await harness.page.getByRole("button", { name: "Send reply" }).count(),
    ).toBe(0);
  } finally {
    await harness.context.close();
  }
});

it("ignores a late response from the prior principal", async () => {
  const harness = await workspace();
  try {
    harness.hold("fixture-session-customer-a");
    await harness.page
      .getByRole("button", { name: "Refresh requests" })
      .click();
    await expect
      .poll(
        () =>
          harness.calls.filter(
            (call) =>
              call.session === "fixture-session-customer-a" &&
              call.method === "GET",
          ).length,
      )
      .toBeGreaterThan(1);
    await harness.page
      .getByLabel("Local demo · synthetic people")
      .selectOption("fixture-principal-customer-b");
    harness.release();
    await expect
      .poll(() => harness.page.getByText("A printer needs attention").count())
      .toBe(0);
    await expect
      .poll(() => harness.page.getByText("No requests yet").count())
      .toBe(1);
    expect(
      await harness.page.getByRole("heading", { name: "My requests" }).count(),
    ).toBe(1);
    expect(
      await harness.page.getByRole("button", { name: "New request" }).count(),
    ).toBe(1);
    if (capture)
      await harness.page.screenshot({
        path: join(evidence, "empty-390.png"),
        fullPage: true,
      });
  } finally {
    harness.release();
    await harness.context.close();
  }
});

it("loads more requests without substituting another customer's records", async () => {
  const harness = await workspace();
  try {
    for (let index = 0; index < 21; index++)
      await harness.runtime.customerRequestCommand(
        harness.actors["fixture-session-customer-a"],
        "customer-request",
        undefined,
        "create",
        "list-page-" + index,
        {
          values: {
            subject: "Extra request " + index,
            description: "A saved item for paging.",
          },
        },
      );
    await harness.page
      .getByRole("button", { name: "Refresh requests" })
      .click();
    await expect
      .poll(() =>
        harness.page
          .getByRole("button", { name: "Load more requests" })
          .count(),
      )
      .toBe(1);
    await harness.page
      .getByRole("button", { name: "Load more requests" })
      .click();
    await expect
      .poll(() =>
        harness.page.getByRole("button", { name: /Extra request/ }).count(),
      )
      .toBe(21);
    expect(harness.calls.some((call) => call.path.includes("afterId="))).toBe(
      true,
    );
  } finally {
    await harness.context.close();
  }
});

it("shows denial and empty recovery without exposing another customer's request", async () => {
  const harness = await workspace();
  try {
    await harness.page
      .getByLabel("Local demo · synthetic people")
      .selectOption("fixture-principal-customer-b");
    await expect
      .poll(() => harness.page.getByText("No requests yet").count())
      .toBe(1);
    await harness.page.goto(
      "https://requests.test/request-detail?id=" +
        encodeURIComponent(harness.requestId!),
    );
    await expect
      .poll(() =>
        harness.page
          .getByText("This request is no longer available. Refresh your list.")
          .count(),
      )
      .toBe(1);
    if (capture)
      await harness.page.screenshot({
        path: join(evidence, "denied-390.png"),
        fullPage: true,
      });
    expect(
      await harness.page.getByText("We are checking the paper feed.").count(),
    ).toBe(0);
  } finally {
    await harness.context.close();
  }
});

it("keeps loading and unavailable states within the workspace", async () => {
  const harness = await workspace(390, true, undefined, true);
  try {
    await expect
      .poll(() => harness.page.getByText("Loading requests…").count())
      .toBe(1);
    if (capture)
      await harness.page.screenshot({
        path: join(evidence, "loading-390.png"),
        fullPage: true,
      });
    harness.release();
    await expect
      .poll(() =>
        harness.page
          .getByRole("button", { name: /A printer needs attention/ })
          .count(),
      )
      .toBe(1);
    harness.failRead();
    await harness.page
      .getByRole("button", { name: "Refresh requests" })
      .click();
    await expect
      .poll(() =>
        harness.page
          .getByText("The request could not be completed. Try again.")
          .count(),
      )
      .toBe(1);
    if (capture)
      await harness.page.screenshot({
        path: join(evidence, "error-390.png"),
        fullPage: true,
      });
  } finally {
    harness.release();
    await harness.context.close();
  }
});

it("wraps long saved request and conversation text at phone width", async () => {
  const harness = await workspace();
  try {
    const subject = "Printer feed sensor and replacement assembly "
      .repeat(3)
      .slice(0, 150);
    const description =
      "The print job stops after one page and the operator needs a clear next step.\n"
        .repeat(20)
        .slice(0, 1900);
    await harness.runtime.customerRequestCommand(
      harness.actors["fixture-session-customer-a"],
      "customer-request",
      harness.requestId,
      "update",
      "long-details",
      {
        expectedVersion: 1,
        reason: "Clarify the affected assembly.",
        values: { subject, description },
      },
    );
    await harness.runtime.customerRequestCommand(
      harness.actors["fixture-session-support-staff"],
      "customer-request",
      harness.requestId,
      "reply",
      "long-message",
      {
        expectedVersion: 2,
        message:
          "Please check the feed roller and report whether the next sheet advances.\n"
            .repeat(20)
            .slice(0, 1900),
        correctsVersion: null,
      },
    );
    await harness.page
      .getByRole("button", { name: "Refresh requests" })
      .click();
    await harness.page
      .getByRole("button", {
        name: /Printer feed sensor and replacement assembly/,
      })
      .click();
    await expect
      .poll(() => harness.page.getByRole("heading", { name: subject }).count())
      .toBe(1);
    expect(
      await harness.page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
    if (capture)
      await harness.page.screenshot({
        path: join(evidence, "long-390.png"),
        fullPage: true,
      });
    await harness.page.keyboard.press("Tab");
    expect(
      await harness.page.evaluate(() => document.activeElement?.tagName),
    ).toMatch(/BUTTON|SELECT/);
  } finally {
    await harness.context.close();
  }
});

it("renders emitted canonical, dark and explicit-theme workspaces across device widths", async () => {
  const cases = [
    {
      name: "customer-390",
      width: 390,
      theme: undefined as undefined | "dark" | "explicit",
      staff: false,
    },
    {
      name: "customer-768",
      width: 768,
      theme: undefined as undefined | "dark" | "explicit",
      staff: false,
    },
    {
      name: "staff-1440",
      width: 1440,
      theme: undefined as undefined | "dark" | "explicit",
      staff: true,
    },
    { name: "dark-390", width: 390, theme: "dark" as const, staff: false },
    {
      name: "explicit-1440",
      width: 1440,
      theme: "explicit" as const,
      staff: true,
    },
  ];
  for (const item of cases) {
    const harness = await workspace(item.width, true, item.theme);
    try {
      if (item.staff)
        await harness.page
          .getByLabel("Local demo · synthetic people")
          .selectOption("fixture-principal-support-staff");
      if (item.width <= 768)
        await harness.page
          .getByRole("button", { name: /A printer needs attention/ })
          .tap();
      else
        await harness.page
          .getByRole("button", { name: /A printer needs attention/ })
          .click();
      await expect
        .poll(() =>
          harness.page.getByText("We are checking the paper feed.").count(),
        )
        .toBe(1);
      if (item.width === 390 && !item.theme) {
        const answer = await harness.page
          .getByText("We are checking the paper feed.")
          .boundingBox();
        expect(answer!.y + answer!.height).toBeLessThan(900);
      }
      expect(
        await harness.page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(item.width);
      const theme = await harness.page
        .locator(".customer-request-v1")
        .getAttribute("data-theme");
      expect(theme).toBe(item.theme === "dark" ? "dark" : "light");
      if (item.theme === "explicit") {
        expect((await emittedTheme("explicit")).css).toContain(
          "--factory-colour-brand: #285430",
        );
        expect((await emittedTheme("explicit")).css).toContain(
          "--factory-accent: var(--factory-colour-brand)",
        );
      }
      if (capture)
        await harness.page.screenshot({
          path: join(evidence, item.name + ".png"),
          fullPage: true,
        });
    } finally {
      await harness.context.close();
    }
  }
}, 30000);
