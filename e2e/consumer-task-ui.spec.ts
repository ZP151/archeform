import { test, expect } from "@playwright/test";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { mkdir } from "node:fs/promises";
import { taskInterpretationFixture } from "./consumer-task-fixture";
import {
  verifyTaskPresentation,
  verifyTaskAssetFailureDetection,
  verifyTaskEmittedIconSupply,
} from "./task-presentation";

// Development-only UI feedback: actual emitted React/CSS with authored records.
// It does not replace real API, persistence, verifier, or consumer acceptance.
test("emitted Task DOM and CSS keep the usable responsive workspace", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const root = process.cwd();
  // Reuse the compiler's installed Vitest/Vite bundler without adding a package
  // or depending on pnpm's private on-disk directory structure.
  const compilerRequire = createRequire(
    resolve(root, "packages/compiler/package.json"),
  );
  const vitestRequire = createRequire(
    compilerRequire.resolve("vitest/package.json"),
  );
  const viteRequire = createRequire(vitestRequire.resolve("vite/package.json"));
  const { build } = viteRequire("esbuild");
  const result = await taskInterpretationFixture("task-focused-ui");
  const { interpretation } = result;
  const { runtime, css } = JSON.parse(
    execFileSync(
      process.execPath,
      [resolve(root, "scripts/emit-composed-ui.mjs")],
      {
        input: JSON.stringify(interpretation),
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024,
      },
    ),
  );
  expect(runtime).toContain("task-v1");
  verifyTaskEmittedIconSupply(runtime);
  const script = await build({
    stdin: {
      contents:
        runtime +
        "\nimport { createRoot } from 'react-dom/client'; createRoot(document.getElementById('root')!).render(<GeneratedApplication requestedPath={location.pathname} />);",
      resolveDir: resolve(root, "apps/workbench"),
      sourcefile: "task-focused.tsx",
      loader: "tsx",
    },
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
    logLevel: "silent",
  });
  const records = [
    {
      id: "task-focused-first",
      title: "Prepare the launch checklist",
      description: "Review the remaining launch steps with the team.",
      assignee: "Morgan",
      dueDate: "2026-09-20T00:00:00.000Z",
      priority: "high",
      status: "not-started",
      version: 0,
    },
    {
      id: "task-focused-second",
      title: "Review the customer guide",
      description: "Check the examples and final wording.",
      assignee: "Riley",
      dueDate: "2026-09-23T00:00:00.000Z",
      priority: "medium",
      status: "not-started",
      version: 0,
    },
  ];
  let emptyRead = false;
  const server = createServer((request, response) => {
    const path = new URL(request.url!, "http://127.0.0.1").pathname;
    if (
      request.method === "POST" &&
      path === `/api/task/${records[0].id}/events/start`
    ) {
      records[0].version = 1;
      records[0].status = "in-progress";
      response.writeHead(409, { "content-type": "application/json" }).end(
        JSON.stringify({
          code: "task.version_conflict",
          current: { id: records[0].id, status: records[0].status, version: 1 },
        }),
      );
      return;
    }
    if (request.method !== "GET") {
      response.writeHead(405).end();
      return;
    }
    const [type, body] =
      path === "/app.js"
        ? ["application/javascript", script.outputFiles[0].text]
        : path === "/globals.css"
          ? ["text/css", css]
          : path.startsWith("/api/")
            ? ["application/json", JSON.stringify(emptyRead ? [] : records)]
            : [
                "text/html",
                '<!doctype html><html lang="en"><head><title>Team Task Tracking</title><link rel="stylesheet" href="/globals.css"></head><body><div id="root"></div><script src="/app.js"></script></body></html>',
              ];
    response.writeHead(200, { "content-type": type }).end(body);
  });
  await new Promise<void>((ready) => server.listen(0, "127.0.0.1", ready));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("No fixture address.");
  const origin = `http://127.0.0.1:${address.port}`;
  const stage = test.info().outputPath("focused-ui");
  try {
    await page.route("**/*", (route) =>
      new URL(route.request().url()).origin === origin
        ? route.continue()
        : route.abort(),
    );
    await mkdir(stage, { recursive: true });
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${origin}/task-list`);
      await expect(
        page.getByRole("heading", { name: records[0].title }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: records[1].title }),
      ).toBeVisible();
      await page.screenshot({
        path: resolve(stage, `task-list-${width}.png`),
        fullPage: true,
      });
      await verifyTaskPresentation(page, width);
      if (width === 768) {
        const mediumLayout = await page
          .locator(".task-record")
          .first()
          .evaluate((row) => {
            const bounds = row.getBoundingClientRect();
            const lastValueEdge = Math.max(
              ...Array.from(
                row.querySelectorAll(".task-summary dd"),
                (field) => field.getBoundingClientRect().right,
              ),
            );
            return {
              summaryCoverage: (lastValueEdge - bounds.left) / bounds.width,
              rowLeft: bounds.left,
              dueDateAlignment: getComputedStyle(
                row.querySelector(".task-summary > div:nth-child(2)")!,
              ).textAlign,
            };
          });
        expect(
          mediumLayout.summaryCoverage,
          "tablet summaries use the available card width",
        ).toBeGreaterThan(0.75);
        expect(
          mediumLayout.dueDateAlignment,
          "tablet due date aligns with the left summary column",
        ).toBe("start");
        const heading = await page
          .getByRole("heading", { name: "All tasks", exact: true })
          .boundingBox();
        expect(
          Math.abs(heading!.x - mediumLayout.rowLeft),
          "tablet heading aligns with its content",
        ).toBeLessThanOrEqual(16);
      }
      const firstAction = page
        .getByRole("button", { name: "Start", exact: true })
        .first();
      const actionBounds = await firstAction.boundingBox();
      expect(actionBounds).not.toBeNull();
      expect(actionBounds!.y + actionBounds!.height).toBeLessThanOrEqual(650);
      if (width === 390) {
        const secondIdentity = await page
          .getByRole("heading", { name: records[1].title })
          .boundingBox();
        expect(secondIdentity!.y + secondIdentity!.height).toBeLessThanOrEqual(
          900,
        );
      }
    }
    await page
      .getByRole("combobox", { name: "Status filter", exact: true })
      .selectOption("not-started");
    await page
      .locator(".task-record")
      .filter({ hasText: records[0].title })
      .getByRole("button", { name: "Start", exact: true })
      .click();
    await expect(
      page.locator(".task-record").filter({ hasText: records[0].title }),
    ).toHaveCount(0);
    await expect(page.locator("main.task-v1").getByRole("alert")).toHaveText(
      "This task changed. Review the latest version before trying again.",
    );
    await page
      .getByRole("button", { name: "Clear filters", exact: true })
      .click();
    await expect(
      page
        .locator(".task-record")
        .filter({ hasText: records[0].title })
        .getByRole("button", { name: "Complete", exact: true }),
    ).toBeVisible();
    await expect(page.locator("main.task-v1").getByRole("alert")).toHaveText(
      "This task changed. Review the latest version before trying again.",
    );
    emptyRead = true;
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(
      page.getByText("No task records yet.", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("No matching records.", { exact: true }),
    ).toHaveCount(0);
    await page.screenshot({
      path: resolve(stage, "task-empty-1440.png"),
      fullPage: true,
    });
    emptyRead = false;
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(page.locator(".task-record")).toHaveCount(2);
    await verifyTaskAssetFailureDetection(page);
    expect(
      pageErrors,
      "generated Task UI has no unhandled browser errors",
    ).toEqual([]);
  } finally {
    try {
      await page.screenshot({
        path: resolve(stage, "task-ui-final.png"),
        fullPage: true,
      });
    } finally {
      server.closeAllConnections();
      await new Promise<void>((closed) => server.close(() => closed()));
    }
  }
});
