import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { mkdirSync } from "node:fs";
import ts from "typescript";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { generateApplicationBundle } from "../src/index.js";
import { contentDirectoryInput } from "./fixtures/content-directory.js";
import { loadDirectoryRuntime } from "./fixtures/content-directory-runtime.js";
import { renderContentDirectoryWorkspace } from "../src/content-directory-presentation.js";
import { selectContentDirectoryProfile } from "../src/content-directory-contract.js";

const require = createRequire(import.meta.url);
const root = resolve(__dirname, "../../..");
const bundle = generateApplicationBundle({
  publishedRevisionId: "directory-ui",
  ...contentDirectoryInput(),
});
const source = bundle.files.find(
  (f) => f.path === "web/app/page-runtime.tsx",
)!.content;
const css = bundle.files.find((f) => f.path === "web/app/globals.css")!.content;
const playwright = require("@playwright/test");
const browserExpect = playwright.expect;
const viteRequire = createRequire(
  createRequire(require.resolve("vitest/package.json")).resolve(
    "vite/package.json",
  ),
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
});
afterAll(async () => {
  await browser?.close();
});
const initialValues = {
  title: "A practical guide to better project handovers",
  summary:
    "Keep decisions, responsibilities and next steps clear when work changes hands.",
  body:
    "Start with the decisions that matter.\n\n" +
    "Write down the next owner and one clear next step. ".repeat(90),
  category: "Guides",
};
async function workspace(width = 390) {
  const emitted = loadDirectoryRuntime(),
    store = new emitted.InMemoryRecordStore(),
    runtime = new emitted.ApplicationRuntime(store);
  const hidden = (
    await runtime.directoryCommand(
      "curator",
      "fixture",
      "resource",
      undefined,
      "create",
      "setup-hidden",
      { values: { ...initialValues, title: "Private draft resource" } },
    )
  ).body;
  const listed = (
    await runtime.directoryCommand(
      "curator",
      "fixture",
      "resource",
      undefined,
      "create",
      "setup-listed",
      { values: initialValues },
    )
  ).body;
  await runtime.directoryCommand(
    "curator",
    "fixture",
    "resource",
    listed.id,
    "submit",
    "setup-show",
    { expectedVersion: 0 },
  );
  for (const [index, values] of [
    {
      title: "Decision log reference",
      summary: "A shared vocabulary for decisions, assumptions and owners.",
      body: "Record the decision, its owner, and the reason it matters.",
      category: "Reference",
    },
    {
      title: "Release readiness checklist",
      summary:
        "Review the essentials before handing a release to the next team.",
      body: "Confirm ownership.\nReview open risks.\nAgree the next checkpoint.",
      category: "Checklists",
    },
  ].entries()) {
    const entry = (
      await runtime.directoryCommand(
        "curator",
        "fixture",
        "resource",
        undefined,
        "create",
        "setup-extra-" + index,
        { values },
      )
    ).body;
    await runtime.directoryCommand(
      "curator",
      "fixture",
      "resource",
      entry.id,
      "submit",
      "show-extra-" + index,
      { expectedVersion: 0 },
    );
  }
  const context = await browser.newContext({
      viewport: { width, height: 900 },
    }),
    page = await context.newPage();
  page.setDefaultTimeout(5000);
  const requests: any[] = [];
  let fault: string | undefined;
  let release: (() => void) | undefined;
  await page.route("https://directory.test/**", async (route: any) => {
    const request = route.request(),
      url = new URL(request.url());
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
    );
    const method = request.method(),
      body = request.postData() ? JSON.parse(request.postData()) : undefined;
    requests.push({
      method,
      role,
      url: url.pathname + url.search,
      body,
      key: request.headers()["x-factory-idempotency-key"],
    });
    if (fault === "hold-curator" && role === "curator" && method === "GET") {
      fault = undefined;
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    }
    const loseResponse = fault === "network" && method !== "GET";
    if (loseResponse) fault = undefined;
    if (fault === "create-conflict" && method === "POST") {
      fault = undefined;
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: '{"code":"directory.version_conflict"}',
      });
      return;
    }
    if (fault === "conflict" && method === "PATCH") {
      fault = undefined;
      const current = await runtime.directoryRead(
        "curator",
        "resource",
        listed.id,
      );
      await runtime.directoryCommand(
        "curator",
        "other",
        "resource",
        listed.id,
        "update",
        "external-update",
        {
          expectedVersion: current.version,
          values: {
            ...initialValues,
            summary: "A newer summary from another curator.",
          },
        },
      );
    }
    try {
      const parts = url.pathname.split("/").filter(Boolean);
      let result: any;
      if (method === "GET")
        result = parts[2]
          ? await runtime.directoryRead(role, "resource", parts[2])
          : await runtime.directoryList(role, "resource", url.search);
      else
        result = (
          await runtime.directoryCommand(
            role,
            "browser",
            "resource",
            parts[2],
            method === "PATCH" ? "update" : (parts[4] ?? "create"),
            request.headers()["x-factory-idempotency-key"],
            body,
          )
        ).body;
      if (loseResponse) {
        await route.abort("failed");
        return;
      }
      await route.fulfill({
        status: method === "POST" && !parts[2] ? 201 : 200,
        contentType: "application/json",
        body: JSON.stringify(result),
      });
    } catch (error: any) {
      await route.fulfill({
        status: error.status ?? 500,
        contentType: "application/json",
        body: JSON.stringify(error.body ?? { code: "failed" }),
      });
    }
  });
  await page.goto("https://directory.test/");
  return {
    page,
    context,
    requests,
    runtime,
    listed,
    hidden,
    setFault: (value: string) => {
      fault = value;
    },
    release: () => release?.(),
  };
}

describe("emitted directory workspace", () => {
  it("emits strict TypeScript and preserves substitution-like application names", () => {
    const original = contentDirectoryInput(),
      profile = selectContentDirectoryProfile(
        original.graph,
        original.compositionLock,
      )!;
    const input = structuredClone(original);
    input.graph.metadata.name = "CONFIG_JSON HEADER_CHANNEL DATA_HELPERS";
    expect(
      renderContentDirectoryWorkspace(input.graph, profile, true),
    ).toContain('"applicationName":"CONFIG_JSON HEADER_CHANNEL DATA_HELPERS"');
    // Rendering uses already-selected profile data; metadata names are literal display values.
    const file = join(
      root,
      "apps/workbench/directory-typecheck.tsx",
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
  it("selects the private directory workspace and licensed local assets", () => {
    expect(source).toContain("content-directory-presentation@1.0.0");
    expect(css).toContain(".directory-v1");
    expect(
      bundle.files.find((f) => f.path === "THIRD_PARTY_NOTICES.md")?.content,
    ).toContain("Lucide");
    expect(source).not.toContain("ApprovalDecisionHistory");
    expect(source).toContain('"book-open"');
    expect(source).toContain('"file-text"');
    expect(source).toContain('"list-checks"');
  });
  it("finds full plain-text content and curates the same entry through visible and hidden states", async () => {
    const s = await workspace();
    const { page } = s;
    try {
      await browserExpect(
        page.getByRole("link", { name: initialValues.title }),
      ).toBeVisible();
      await browserExpect(page.getByText("Private draft resource")).toHaveCount(
        0,
      );
      await page.getByLabel("Search resources").fill("handover");
      await page.getByRole("button", { name: "Search", exact: true }).click();
      await page.getByRole("link", { name: initialValues.title }).click();
      await browserExpect(page.locator(".directory-body")).toHaveText(
        initialValues.body,
      );
      await page.getByRole("link", { name: "Back to resources" }).click();
      await browserExpect(page.getByLabel("Search resources")).toHaveValue(
        "handover",
      );
      expect(s.requests.some((r) => r.url.includes("q=handover"))).toBe(true);
      await page.getByLabel("Demo role").selectOption("curator");
      await page.getByRole("link", { name: initialValues.title }).click();
      await page.getByRole("button", { name: "Edit entry" }).click();
      await page
        .getByLabel("Summary", { exact: true })
        .fill("A corrected handover summary.");
      await page.getByRole("button", { name: "Save changes" }).click();
      await browserExpect(
        page.getByText("A corrected handover summary."),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Hide entry", exact: true })
        .click();
      await browserExpect(
        page.getByRole("button", { name: "Show entry", exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Show entry", exact: true })
        .click();
      expect(
        (await s.runtime.directoryRead("reader", "resource", s.listed.id))
          .summary,
      ).toBe("A corrected handover summary.");
    } finally {
      await s.context.close();
    }
  }, 30000);
  it("retains edits for explicit conflict recovery and the exact body/key for a network retry", async () => {
    const s = await workspace(1440),
      { page } = s;
    try {
      await page.getByLabel("Demo role").selectOption("curator");
      await page.getByRole("link", { name: initialValues.title }).click();
      await page.getByRole("button", { name: "Edit entry" }).click();
      await page
        .getByLabel("Title", { exact: true })
        .fill("My corrected guide");
      s.setFault("conflict");
      await page.getByRole("button", { name: "Save changes" }).click();
      await browserExpect(page.getByRole("alert")).toContainText("changed");
      await browserExpect(
        page.getByLabel("Title", { exact: true }),
      ).toHaveValue("My corrected guide");
      await browserExpect(
        page.getByRole("button", { name: "Save changes" }),
      ).toBeDisabled();
      const before = s.requests.filter((r) => r.method === "PATCH").length;
      await page.getByRole("button", { name: "Refresh current entry" }).click();
      expect(s.requests.filter((r) => r.method === "PATCH")).toHaveLength(
        before,
      );
      await browserExpect(
        page.getByRole("button", { name: "Save changes" }),
      ).toBeEnabled();
      s.setFault("network");
      await page.getByRole("button", { name: "Save changes" }).click();
      await page.getByRole("button", { name: "Retry save" }).click();
      await browserExpect(
        page.getByRole("heading", { name: "My corrected guide" }),
      ).toBeVisible();
      const writes = s.requests.filter((r) => r.method === "PATCH");
      expect(writes.at(-1).key).toBe(writes.at(-2).key);
      expect(writes.at(-1).body).toEqual(writes.at(-2).body);
    } finally {
      await s.context.close();
    }
  }, 30000);
  it("clears role-bound data and ignores late curator responses", async () => {
    const s = await workspace();
    try {
      await browserExpect(
        s.page.getByRole("link", { name: initialValues.title }),
      ).toBeVisible();
      s.setFault("hold-curator");
      await s.page.getByLabel("Demo role").selectOption("curator");
      await browserExpect
        .poll(() => s.requests.some((r) => r.role === "curator"))
        .toBe(true);
      await browserExpect(
        s.page.getByRole("link", { name: initialValues.title }),
      ).toHaveCount(0);
      await s.page.getByLabel("Demo role").selectOption("reader");
      s.release();
      await browserExpect(
        s.page.getByRole("link", { name: initialValues.title }),
      ).toBeVisible();
      await browserExpect(
        s.page.getByText("Private draft resource"),
      ).toHaveCount(0);
    } finally {
      s.release();
      await s.context.close();
    }
  }, 30000);
  it("creates hidden plain-text entries, rejects invalid values and recovers a create conflict", async () => {
    const s = await workspace(1440),
      { page } = s;
    try {
      await page.getByLabel("Demo role").selectOption("curator");
      await page.getByRole("link", { name: "Create entry" }).last().click();
      await page.getByLabel("Title", { exact: true }).fill("New resource");
      await page.getByLabel("Summary", { exact: true }).fill("s".repeat(281));
      await page
        .getByLabel("Body", { exact: true })
        .fill("<script>window.bad=true</script>\nPlain text resource.");
      await page.getByRole("button", { name: "Create hidden entry" }).click();
      await browserExpect(page.getByRole("alert")).toContainText("280");
      expect(s.requests.some((r) => r.method !== "GET")).toBe(false);
      await page
        .getByLabel("Summary", { exact: true })
        .fill("An accurate summary");
      s.setFault("create-conflict");
      await page.getByRole("button", { name: "Create hidden entry" }).click();
      await browserExpect(
        page.getByLabel("Title", { exact: true }),
      ).toHaveValue("New resource");
      await browserExpect(
        page.getByRole("button", { name: "Create hidden entry" }),
      ).toBeEnabled();
      await page.getByRole("button", { name: "Create hidden entry" }).click();
      await browserExpect(
        page.getByRole("button", { name: "Show entry", exact: true }),
      ).toBeVisible();
      await browserExpect(page.locator(".directory-body")).toContainText(
        "<script>",
      );
      expect(await page.evaluate(() => Boolean((window as any).bad))).toBe(
        false,
      );
      await page
        .getByRole("button", { name: "Show entry", exact: true })
        .click();
      await page.getByLabel("Demo role").selectOption("reader");
      await browserExpect(
        page.getByRole("link", { name: "New resource", exact: true }),
      ).toBeVisible();
    } finally {
      await s.context.close();
    }
  }, 30000);
  it("keeps empty catalogue and missing-entry states usable without decoration", async () => {
    const s = await workspace(),
      { page } = s;
    try {
      const entries = (
        await s.runtime.directoryList("curator", "resource", "?limit=20")
      ).records;
      for (const entry of entries)
        if (entry.status === "listed")
          await s.runtime.directoryCommand(
            "curator",
            "fixture",
            "resource",
            entry.id,
            "cancel",
            "empty-" + entry.id,
            { expectedVersion: entry.version },
          );
      await page.getByRole("button", { name: "Refresh", exact: true }).click();
      await browserExpect(
        page.getByRole("heading", { name: "No resources yet" }),
      ).toBeVisible();
      await page.addStyleTag({
        content: ".directory-icon {visibility:hidden}",
      });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.getByLabel("Demo role").selectOption("curator");
      await browserExpect(
        page.getByRole("link", { name: "Private draft resource", exact: true }),
      ).toBeVisible();
      await page.goto(
        "https://directory.test/resource-detail?id=missing-entry",
      );
      await browserExpect(page.getByRole("alert")).toContainText(
        "not available",
      );
      await page.getByRole("link", { name: "Back to resources" }).click();
      await browserExpect(
        page.getByRole("heading", { name: "All resources", exact: true }),
      ).toBeVisible();
    } finally {
      await s.context.close();
    }
  }, 30000);
  it.each([390, 768, 1440])(
    "renders a complete long-content workspace at %ipx",
    async (width) => {
      const s = await workspace(width),
        { page } = s;
      try {
        const item = page.getByRole("link", { name: initialValues.title });
        await browserExpect(item).toBeVisible();
        expect((await item.boundingBox())!.y).toBeLessThan(
          width === 390 ? 440 : 650,
        );
        for (const control of await page.locator("button,input,select").all()) {
          const box = await control.boundingBox();
          if (box) {
            expect(box.height).toBeGreaterThanOrEqual(44);
            expect(box.width).toBeGreaterThanOrEqual(44);
          }
        }
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        if (process.env.FACTORY_DIRECTORY_UI_EVIDENCE_DIR) {
          mkdirSync(process.env.FACTORY_DIRECTORY_UI_EVIDENCE_DIR, {
            recursive: true,
          });
          await page.screenshot({
            path: join(
              process.env.FACTORY_DIRECTORY_UI_EVIDENCE_DIR,
              `directory-reader-${width}.png`,
            ),
            fullPage: true,
          });
        }
        await item.click();
        await browserExpect(page.locator(".directory-body")).toBeVisible();
        if (process.env.FACTORY_DIRECTORY_UI_EVIDENCE_DIR)
          await page.screenshot({
            path: join(
              process.env.FACTORY_DIRECTORY_UI_EVIDENCE_DIR,
              `directory-reader-detail-${width}.png`,
            ),
            fullPage: true,
          });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await page.getByRole("link", { name: "Back to resources" }).click();
        await page.getByLabel("Search resources").fill("No matching knowledge");
        await page.getByRole("button", { name: "Search", exact: true }).click();
        await browserExpect(
          page.getByRole("heading", { name: "No matching resources" }),
        ).toBeVisible();
        await page
          .getByRole("button", { name: "Clear filters", exact: true })
          .click();
        await browserExpect(item).toBeVisible();
        await page.getByLabel("Demo role").selectOption("curator");
        await browserExpect(
          page.getByRole("link", {
            name: "Private draft resource",
            exact: true,
          }),
        ).toBeVisible();
        if (process.env.FACTORY_DIRECTORY_UI_EVIDENCE_DIR)
          await page.screenshot({
            path: join(
              process.env.FACTORY_DIRECTORY_UI_EVIDENCE_DIR,
              `directory-curator-${width}.png`,
            ),
            fullPage: true,
          });
        await page.getByRole("link", { name: "Create entry" }).last().click();
        await browserExpect(
          page.getByLabel("Body", { exact: true }),
        ).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        if (process.env.FACTORY_DIRECTORY_UI_EVIDENCE_DIR)
          await page.screenshot({
            path: join(
              process.env.FACTORY_DIRECTORY_UI_EVIDENCE_DIR,
              `directory-curator-form-${width}.png`,
            ),
            fullPage: true,
          });
      } finally {
        await s.context.close();
      }
    },
    30000,
  );
});
