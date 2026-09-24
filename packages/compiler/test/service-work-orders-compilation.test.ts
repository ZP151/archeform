import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createCapabilityCompositionLock } from "@factory/capabilities";
import {
  hashApplicationGraph,
  resolveExperienceDesignSystem,
} from "@factory/graph";
import { generateApplicationBundle } from "../src/index.js";
import { serviceWorkOrdersInput } from "./fixtures/service-work-orders.js";
import { loadWorkOrdersRuntime } from "./fixtures/service-work-orders-runtime.js";

const root = resolve(__dirname, "../../..");
const require = createRequire(import.meta.url);
const viteRequire = createRequire(
  createRequire(require.resolve("vitest/package.json")).resolve(
    "vite/package.json",
  ),
);

function compiledFiles(source = serviceWorkOrdersInput()) {
  const input = JSON.parse(JSON.stringify(source));
  return new Map(
    generateApplicationBundle({
      ...input,
      publishedRevisionId: "work-orders-public-presentation",
    }).files.map((file) => [file.path, file.content]),
  );
}

describe("Work Orders public presentation assembly", () => {
  it("emits the dispatch and technician workspace after a persisted input round trip", () => {
    const files = compiledFiles();
    const runtime = files.get("web/app/page-runtime.tsx")!;
    expect(
      runtime.includes("work-order-quick-actions"),
      "Work Orders workspace",
    ).toBe(true);
    expect(runtime).toContain("work-order-principal");
    expect(runtime).toContain("fixture-session-technician-b");
    expect(runtime).toContain("/api/work-order-assignees");
    expect(files.get("web/app/[...path]/page.tsx")).toContain(
      "GeneratedApplication",
    );
  });

  it("ships workspace CSS through the stylesheet loaded by the generated layout", () => {
    const files = compiledFiles();
    const css = files.get("web/app/globals.css")!;
    expect(files.get("web/app/layout.tsx")).toContain('import "./globals.css"');
    expect(
      css.includes(".work-order-v1.generated-app"),
      "Work Orders stylesheet",
    ).toBe(true);
    expect(css).toContain(".work-order-icon-button");
    expect(css).toContain("--factory-accent: #155EEF");
    expect(css).toContain("--factory-accent: #84ADFF");
  });

  it("includes the license notice for the bundled local icons", () => {
    const notice = compiledFiles().get("THIRD_PARTY_NOTICES.md");
    expect(notice).toBeDefined();
    expect(notice).toContain("lucide-static");
    expect(notice).toContain("ISC");
  });

  it("preserves explicit light and dark design tokens in the compiled stylesheet", () => {
    const input = serviceWorkOrdersInput();
    const designSystem = structuredClone(
      resolveExperienceDesignSystem(input.graph.experience),
    );
    designSystem.tokens.colour.light.brand = "#285430";
    designSystem.tokens.colour.dark.brand = "#b3d9ba";
    const graph = {
      ...input.graph,
      experience: { ...input.graph.experience, designSystem },
    };
    const compositionLock = createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(graph),
      selections: input.compositionLock.packages,
    });
    const css = compiledFiles({ graph, compositionLock }).get(
      "web/app/globals.css",
    )!;
    expect(css).toContain("--factory-colour-brand: #285430");
    expect(css).toContain("--factory-colour-brand: #b3d9ba");
    expect(css).toContain("--factory-accent: var(--factory-colour-brand)");
    expect(css).not.toContain("--factory-accent: #155EEF");
    expect(css).not.toContain("--factory-accent: #84ADFF");
  });

  it.each([390, 768, 1440])(
    "renders the complete emitted bundle at %i px",
    async (width) => {
      const input = serviceWorkOrdersInput();
      const files = compiledFiles();
      const emitted = loadWorkOrdersRuntime(undefined, input);
      const { resolvePrincipalContext } = emitted.load("api/src/main.ts");
      const actor = (session: string) =>
        resolvePrincipalContext({
          headers: {
            "x-factory-fixture-session": session,
          },
        });
      const runtime = new emitted.ApplicationRuntime(
        new emitted.InMemoryRecordStore(),
      );
      const dispatcher = actor("fixture-session-dispatcher");
      const created = await runtime.workOrderCommand(
        dispatcher,
        "work-order",
        undefined,
        "create",
        "compiled-create",
        {
          values: {
            title: "Cooling unit inspection",
            serviceLocation: "North building · Level 2",
            priority: "high",
            description:
              "Investigate intermittent cooling and record the repair.",
            dueDate: null,
          },
        },
      );
      await runtime.workOrderCommand(
        dispatcher,
        "work-order",
        created.body.id,
        "assign",
        "compiled-assign",
        {
          expectedVersion: 0,
          assigneePrincipalId: "fixture-principal-technician-a",
        },
      );
      const script = await viteRequire("esbuild").build({
        stdin: {
          contents:
            files.get("web/app/page-runtime.tsx")! +
            '\nimport {createRoot} from "react-dom/client";createRoot(document.getElementById("root")!).render(<GeneratedApplication requestedPath={window.location.pathname}/>);',
          loader: "tsx",
          resolveDir: resolve(root, "apps/workbench"),
        },
        bundle: true,
        write: false,
        platform: "browser",
        format: "iife",
        jsx: "automatic",
        define: { "process.env.NODE_ENV": '"production"' },
      });
      const browser = await require("@playwright/test").chromium.launch({
        headless: true,
      });
      const context = await browser.newContext({
        viewport: { width, height: 900 },
      });
      const page = await context.newPage();
      page.setDefaultTimeout(5000);
      const errors: string[] = [];
      page.on("pageerror", (error: Error) => errors.push(error.message));
      try {
        await page.route("**/*", async (route: any) => {
          const request = route.request(),
            url = new URL(request.url());
          if (["/dispatch", "/assigned-work"].includes(url.pathname)) {
            return route.fulfill({
              status: 200,
              contentType: "text/html",
              body: "<!doctype html><html><head></head><body><div id='root'></div></body></html>",
            });
          }
          const parts = url.pathname.split("/").filter(Boolean);
          if (parts[0] !== "api") return route.abort();
          try {
            const principal = actor(
              request.headers()["x-factory-fixture-session"] ?? "",
            );
            const result =
              parts[1] === "work-order-assignees"
                ? await runtime.workOrderAssignees(principal)
                : parts[3] === "history"
                  ? await runtime.workOrderHistory(
                      principal,
                      "work-order",
                      parts[2],
                      url.search.slice(1),
                    )
                  : parts[2]
                    ? await runtime.workOrderRead(
                        principal,
                        "work-order",
                        parts[2],
                      )
                    : await runtime.workOrderList(
                        principal,
                        "work-order",
                        url.search.slice(1),
                      );
            return route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify(result),
            });
          } catch (error: any) {
            return route.fulfill({
              status: error.status ?? 500,
              contentType: "application/json",
              body: JSON.stringify(error.body ?? {}),
            });
          }
        });
        const technician = width < 1000;
        await page.goto(
          "https://work-orders.local" +
            (technician ? "/assigned-work" : "/dispatch"),
        );
        await page.evaluate(
          ({ key, principal }: { key: string; principal: string }) =>
            sessionStorage.setItem(key, principal),
          {
            key: "work-orders-principal-" + input.graph.metadata.id,
            principal: technician
              ? "fixture-principal-technician-a"
              : "fixture-principal-dispatcher",
          },
        );
        await page.addStyleTag({ content: files.get("web/app/globals.css")! });
        await page.addScriptTag({ content: script.outputFiles[0].text });
        await page.locator(".work-order-card").first().click();
        await page
          .locator(".work-order-detail-head")
          .getByRole("heading", { name: "Cooling unit inspection" })
          .waitFor();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        const main = page.locator(".work-order-v1");
        if (!technician) {
          expect(
            await main.evaluate(
              (element: HTMLElement) => getComputedStyle(element).display,
            ),
          ).toBe("grid");
        } else {
          expect(await page.locator(".work-order-queue").isVisible()).toBe(
            false,
          );
          expect(await page.locator(".work-order-detail").isVisible()).toBe(
            true,
          );
        }
        expect(
          await page.locator(".work-order-icon svg").count(),
        ).toBeGreaterThan(0);
        const refresh = page.getByRole("button", {
          name: "Refresh",
          exact: true,
        });
        const refreshBox = await refresh.boundingBox();
        expect(refreshBox!.width).toBeGreaterThanOrEqual(44);
        expect(refreshBox!.height).toBeGreaterThanOrEqual(44);
        if (technician) {
          const start = page
            .locator(".work-order-quick-actions")
            .getByRole("button", { name: "Start work" });
          const bounds = await start.boundingBox();
          expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(650);
          expect(
            await start.evaluate(
              (element: HTMLElement) =>
                getComputedStyle(element).backgroundColor,
            ),
          ).toBe("rgb(21, 94, 239)");
        }
        expect(errors).toEqual([]);
        const capture = resolve(
          root,
          "generated/.work-orders-public-presentation",
        );
        await mkdir(capture, { recursive: true });
        await page.screenshot({
          path: resolve(capture, `compiled-${width}.png`),
          fullPage: true,
        });
      } finally {
        await context.close();
        await browser.close();
      }
    },
  );
});
