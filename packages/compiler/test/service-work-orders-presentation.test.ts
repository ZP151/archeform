import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import ts from "typescript";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resolveExperienceDesignSystem } from "@factory/graph";
import { selectServiceWorkOrdersProfile } from "../src/service-work-orders-contract.js";
import {
  renderServiceWorkOrdersWorkspace,
  renderServiceWorkOrdersStyles,
} from "../src/service-work-orders-presentation.js";
import { renderWorkspaceStyles } from "../src/approval-workspace-presentation.js";
import { serviceWorkOrdersInput } from "./fixtures/service-work-orders.js";

const { graph, compositionLock } = serviceWorkOrdersInput();
const profile = selectServiceWorkOrdersProfile(graph, compositionLock)!;
const root = resolve(__dirname, "../../..");
const require = createRequire(import.meta.url);
const viteRequire = createRequire(
  createRequire(require.resolve("vitest/package.json")).resolve(
    "vite/package.json",
  ),
);
const playwright = require("@playwright/test");
let browser: any, script: string;
const captureDirectory = resolve(root, "generated/.work-orders-task3-ui");

function themeCss(input = graph) {
  const system = resolveExperienceDesignSystem(input.experience);
  const block = (mode: "light" | "dark") => {
    const vars: string[] = [];
    for (const [group, tokens] of Object.entries(system.tokens))
      for (const [key, value] of Object.entries(
        tokens as Record<string, unknown>,
      ))
        if (typeof value === "string")
          vars.push(`--factory-${group}-${key}:${value};`);
    for (const [key, value] of Object.entries(system.tokens.colour[mode]))
      vars.push(`--factory-colour-${key}:${value};`);
    const accent = mode === "light" ? "#155EEF" : "#84ADFF",
      accentText = mode === "light" ? "#FFFFFF" : "#102A56";
    return (
      vars.join("") +
      `--factory-bg:var(--factory-colour-background);--factory-surface-muted:var(--factory-colour-surface);--factory-muted:var(--factory-colour-text-muted);--factory-accent:${accent};--factory-accent-text:${accentText};--factory-surface:var(--factory-colour-surface);--factory-text:var(--factory-colour-text);--factory-border:var(--factory-colour-border);--factory-danger:var(--factory-colour-danger);`
    );
  };
  return (
    `*{box-sizing:border-box}body{margin:0}.generated-app[data-theme=light]{color-scheme:light;${block("light")}}.generated-app[data-theme=dark]{color-scheme:dark;${block("dark")}}.generated-app{font-family:var(--factory-typography-font-family);font-size:var(--factory-typography-font-size-base);background:var(--factory-bg);color:var(--factory-text)}` +
    renderServiceWorkOrdersStyles().join("\n")
  );
}

beforeAll(async () => {
  await mkdir(captureDirectory, { recursive: true });
  const source = renderServiceWorkOrdersWorkspace(graph, profile, true);
  script = (
    await viteRequire("esbuild").build({
      stdin: {
        contents:
          source +
          '\nimport {createRoot} from "react-dom/client";Object.assign(window,{__workOrderValidate:validDraft});createRoot(document.getElementById("root")!).render(<GeneratedApplication requestedPath={window.location.pathname}/>);',
        loader: "tsx",
        resolveDir: resolve(root, "apps/workbench"),
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

function fixture(
  status: "open" | "in-progress" | "resolved" | "cancelled",
  id: string,
  assigneePrincipalId: string | null,
) {
  return {
    id,
    version: id === "order-a" ? 1 : 0,
    title:
      id === "order-a" ? "Cooling unit inspection" : "Replace corridor light",
    serviceLocation:
      id === "order-a" ? "North plant · Level 2" : "East wing · Corridor 4",
    priority: id === "order-a" ? "high" : "medium",
    description:
      "Reported by facilities. Inspect the unit and record the outcome.",
    dueDate: "2026-10-01",
    status,
    assigneePrincipalId,
  };
}

function historyEvent(
  id: string,
  action: "create" | "assign",
  version: number,
) {
  return {
    apiVersion: "factory.generated.work-order-history-entry/v1",
    id: `${id}-${action}`,
    workOrder: id,
    action,
    orderVersion: version,
    toStatus: "open",
    fromStatus: action === "assign" ? "open" : null,
    fromAssigneePrincipalId: null,
    toAssigneePrincipalId:
      action === "assign" ? "fixture-principal-technician-a" : null,
    actorPrincipalId: "fixture-principal-dispatcher",
    actorRole: "dispatcher",
    recordedAt: "2026-09-24T00:00:00.000Z",
    note: null,
    beforeTitle: null,
    afterTitle: action === "create" ? "Cooling unit inspection" : null,
    beforeServiceLocation: null,
    afterServiceLocation: action === "create" ? "North plant · Level 2" : null,
    beforePriority: null,
    afterPriority: action === "create" ? "high" : null,
    beforeDescription: null,
    afterDescription:
      action === "create"
        ? "Reported by facilities. Inspect the unit and record the outcome."
        : null,
    beforeDueDate: null,
    afterDueDate: action === "create" ? "2026-10-01" : null,
  };
}

async function workspace(
  width: number,
  initialPrincipal:
    "dispatcher" | "technician-a" | "technician-b" = "dispatcher",
  options?: {
    uncertainOnce?: boolean;
    conflictOnce?: boolean;
    holdARead?: boolean;
    listErrorOnce?: boolean;
    overrideScript?: string;
    overrideCss?: string;
    ambiguousCreateStatus?: 502 | 504;
    holdMutationOnce?: boolean;
    ambiguousMutationSequence?: ("abort" | 503)[];
    rejectCreateStatus?: 400 | 409;
  },
) {
  const context = await browser.newContext({
      viewport: { width, height: 900 },
    }),
    page = await context.newPage();
  page.setDefaultTimeout(5000);
  const records = new Map<string, any>([
    ["order-a", fixture("open", "order-a", "fixture-principal-technician-a")],
    ["order-b", fixture("open", "order-b", null)],
  ]);
  const history = new Map<string, any[]>([
      [
        "order-a",
        [
          historyEvent("order-a", "assign", 1),
          historyEvent("order-a", "create", 0),
        ],
      ],
      ["order-b", [historyEvent("order-b", "create", 0)]],
    ]),
    requests: any[] = [],
    reads: any[] = [];
  const receipts = new Map<string, any>();
  let createdCount = 0;
  let ambiguousCreateStatus = options?.ambiguousCreateStatus;
  const ambiguousMutationSequence = [
    ...(options?.ambiguousMutationSequence ?? []),
  ];
  let releaseMutation: () => void = () => {};
  let markMutationStarted: () => void = () => {};
  const mutationGate = new Promise<void>((resolve) => {
    releaseMutation = resolve;
  });
  const mutationStarted = new Promise<void>((resolve) => {
    markMutationStarted = resolve;
  });
  let heldMutation = false;
  let releaseARead: () => void = () => {};
  const aReadGate = new Promise<void>((resolve) => {
    releaseARead = resolve;
  });
  let heldARead = false;
  let uncertain = options?.uncertainOnce ?? false,
    conflict = options?.conflictOnce ?? false,
    listError = options?.listErrorOnce ?? false;
  await page.route("**/*", async (route: any) => {
    const request = route.request(),
      url = new URL(request.url()),
      path = url.pathname,
      method = request.method();
    if (
      (method === "GET" && path === "/assigned-work") ||
      (method === "GET" && path === "/dispatch")
    )
      return route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<!doctype html><html><head><meta charset='utf-8'></head><body><div id='root'></div></body></html>",
      });
    const session = request.headers()["x-factory-fixture-session"] ?? "",
      principal = session.replace("fixture-session-", "fixture-principal-");
    if (path.startsWith("/api/") && method === "GET")
      reads.push({ path, session });
    const dispatcher = session === "fixture-session-dispatcher";
    const visible = (record: any) =>
      dispatcher || record.assigneePrincipalId === principal;
    const json = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (path === "/api/work-order-assignees" && method === "GET")
      return dispatcher
        ? json([
            {
              principalId: "fixture-principal-technician-a",
              displayName: "Technician A",
            },
            {
              principalId: "fixture-principal-technician-b",
              displayName: "Technician B",
            },
          ])
        : json({ code: "work_order.forbidden" }, 403);
    if (path === "/api/work-order" && method === "GET") {
      if (listError && session === "fixture-session-" + initialPrincipal) {
        listError = false;
        return json({ code: "work_order.internal_error" }, 503);
      }
      return json({
        items: [...records.values()].filter(visible),
        nextAfterId: null,
      });
    }
    const parts = path.split("/").filter(Boolean),
      id = parts[2],
      record = records.get(id);
    if (
      parts[0] === "api" &&
      parts[1] === "work-order" &&
      id &&
      (!record || !visible(record))
    )
      return json({ code: "work_order.not_found" }, 404);
    if (
      parts[0] === "api" &&
      parts[1] === "work-order" &&
      id &&
      method === "GET" &&
      parts[3] === "history"
    )
      return json({ items: history.get(id) ?? [], nextBeforeVersion: null });
    if (
      parts[0] === "api" &&
      parts[1] === "work-order" &&
      id &&
      method === "GET"
    ) {
      if (options?.holdARead && id === "order-a" && !heldARead) {
        heldARead = true;
        await aReadGate;
      }
      const latest = (history.get(id) ?? []).find(
        (e) => e.action === "resolve",
      );
      return json({
        ...record,
        latestResolution: latest
          ? { ...latest, historical: record.status !== "resolved" }
          : null,
      });
    }
    if (parts[0] === "api" && parts[1] === "work-order" && method === "POST") {
      const operation = id ? parts[4] : "create",
        body = JSON.parse(request.postData() ?? "{}"),
        key = request.headers()["x-factory-idempotency-key"];
      requests.push({ operation, body, key, path, session });
      if (!key) return json({ code: "work_order.invalid_request" }, 400);
      if (operation === "create" && options?.rejectCreateStatus)
        return json(
          { code: "work_order.invalid_request" },
          options.rejectCreateStatus,
        );
      if (receipts.has(key)) {
        const ambiguousReplay = ambiguousMutationSequence.shift();
        if (ambiguousReplay === "abort") return route.abort("failed");
        if (ambiguousReplay === 503)
          return json({ code: "work_order.internal_error" }, 503);
        return json(receipts.get(key), operation === "create" ? 201 : 200);
      }
      if (conflict) {
        conflict = false;
        record.version++;
        record.title = "Saved by another dispatcher";
        return json({ code: "work_order.version_conflict" }, 409);
      }
      if (operation === "start") record.status = "in-progress";
      else if (operation === "resolve") record.status = "resolved";
      else if (operation === "assign" || operation === "reassign")
        record.assigneePrincipalId = body.assigneePrincipalId;
      else if (operation === "update") Object.assign(record, body.values);
      else if (operation === "reopen") record.status = "open";
      else if (operation === "cancel") record.status = "cancelled";
      else if (operation === "create") {
        const createdId = "order-created-" + ++createdCount;
        const created = {
          ...fixture("open", createdId, null),
          ...body.values,
          version: 0,
        };
        records.set(created.id, created);
        history.set(created.id, [
          {
            ...historyEvent("order-a", "create", 0),
            id: createdId + "-create",
            workOrder: created.id,
            afterTitle: created.title,
            afterServiceLocation: created.serviceLocation,
            afterPriority: created.priority,
            afterDescription: created.description,
            afterDueDate: created.dueDate,
          },
        ]);
        receipts.set(key, { ...created });
        if (ambiguousCreateStatus) {
          const status = ambiguousCreateStatus;
          ambiguousCreateStatus = undefined;
          return json({ code: "work_order.internal_error" }, status);
        }
        return json(created, 201);
      }
      record.version++;
      const event = {
        apiVersion: "factory.generated.work-order-history-entry/v1",
        id: "event-" + record.version,
        workOrder: id,
        action: operation,
        orderVersion: record.version,
        toStatus: record.status,
        fromStatus: null,
        fromAssigneePrincipalId: null,
        toAssigneePrincipalId: record.assigneePrincipalId,
        actorPrincipalId: principal,
        actorRole: dispatcher ? "dispatcher" : "technician",
        recordedAt: "2026-09-24T00:00:00.000Z",
        note: body.resolutionNote ?? body.reason ?? null,
        beforeTitle: null,
        afterTitle: null,
        beforeServiceLocation: null,
        afterServiceLocation: null,
        beforePriority: null,
        afterPriority: null,
        beforeDescription: null,
        afterDescription: null,
        beforeDueDate: null,
        afterDueDate: null,
      };
      history.set(id, [event, ...(history.get(id) ?? [])]);
      receipts.set(key, { ...record });
      if (options?.holdMutationOnce && !heldMutation) {
        heldMutation = true;
        markMutationStarted();
        await mutationGate;
      }
      const ambiguousMutation = ambiguousMutationSequence.shift();
      if (ambiguousMutation === "abort") return route.abort("failed");
      if (ambiguousMutation === 503)
        return json({ code: "work_order.internal_error" }, 503);
      if (uncertain) {
        uncertain = false;
        return route.abort("failed");
      }
      return json(record);
    }
    return json({ code: "work_order.not_found" }, 404);
  });
  const initialPath =
    initialPrincipal === "dispatcher" ? "/dispatch" : "/assigned-work";
  await page.goto("https://work-orders.local" + initialPath);
  await page.evaluate(
    (name: string) =>
      sessionStorage.setItem(
        "work-orders-principal-work-orders-fixture",
        "fixture-principal-" + name,
      ),
    initialPrincipal,
  );
  await page.addStyleTag({ content: options?.overrideCss ?? themeCss() });
  await page.addScriptTag({ content: options?.overrideScript ?? script });
  return {
    context,
    page,
    records,
    history,
    requests,
    reads,
    releaseARead,
    releaseMutation,
    mutationStarted,
  };
}

describe("Service Work Orders presentation", () => {
  it("emits principal-aware work queues and all approved commands", () => {
    const source = renderServiceWorkOrdersWorkspace(graph, profile, true);
    expect(source).toContain("export function GeneratedApplication");
    expect(source).toContain("Local demo — synthetic staff");
    expect(source).toContain("fixture-session-technician-b");
    expect(source).toContain("/api/work-order-assignees");
    for (const command of [
      "create",
      "update",
      "assign",
      "reassign",
      "start",
      "resolve",
      "reopen",
      "cancel",
    ]) {
      expect(source).toContain(command);
    }
  });

  it("extends the shared stylesheet without changing any prior profile bytes", () => {
    expect(renderWorkspaceStyles("work-order").join("\n")).toContain(
      ".work-order-v1.generated-app",
    );
    expect(renderServiceWorkOrdersStyles().join("\n")).toContain(
      ".work-order-queue",
    );
    // Protected outputs from the original helper SHA-256 43f8b2956189246bb08808bbbe40b3d5fe14b8287cec1e4c446f36a75fa8c58e.
    const prior: Record<"approval" | "task" | "appointment", string> = {
      approval:
        "2d89a115bf32f5e77e03ce4ba2fdd493a57270ba2eb4613726c6f4551f4c2edb",
      task: "e6a6f6d5a2180da2419f3c8a9022264269691b595008b061c5306dc6996ff271",
      appointment:
        "24d0e9f8669e1a8309e5a74d0a3c69b3f716e1d80b0200a0316c6496ba2165dc",
    };
    for (const oldProfile of ["approval", "task", "appointment"] as const)
      expect(
        createHash("sha256")
          .update(renderWorkspaceStyles(oldProfile).join("\n"))
          .digest("hex"),
      ).toBe(prior[oldProfile]);
  });

  it("emits a strict React module that bundles for the local component harness", async () => {
    const source = renderServiceWorkOrdersWorkspace(graph, profile, true);
    const file = resolve(
      root,
      "apps/workbench/work-orders-generated-typecheck.tsx",
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
        .map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n")),
    ).toEqual([]);
    const output = await viteRequire("esbuild").build({
      stdin: {
        contents: source,
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
    expect(output.outputFiles[0].text.length).toBeGreaterThan(1000);
  });

  it("shows a coordinated desktop queue and detail with actual local icons and styles", async () => {
    const s = await workspace(1440);
    try {
      await s.page.getByRole("heading", { name: "Dispatch queue" }).waitFor();
      await s.page.locator(".work-order-card").first().click();
      await s.page
        .getByRole("heading", { name: "Cooling unit inspection" })
        .waitFor();
      expect(await s.page.getByText("Dispatch desk").count()).toBe(0);
      expect(
        await s.page
          .locator(".work-order-quick-actions")
          .getByRole("button", { name: "Edit details" })
          .count(),
      ).toBe(1);
      expect(await s.page.getByText("No history available.").count()).toBe(0);
      expect(await s.page.getByText(/^Version \d/).count()).toBe(0);
      const timeline = await s.page.locator(".work-order-history").innerText();
      expect(timeline).toContain("Assigned to Technician A");
      expect(timeline).toContain("Created at North plant · Level 2");
      expect(timeline).not.toContain("Saved change");
      expect(timeline).not.toContain("dispatcher ·");
      const queue = await s.page.locator(".work-order-queue").boundingBox(),
        detail = await s.page.locator(".work-order-detail").boundingBox();
      expect(queue && detail && queue.x + queue.width < detail.x).toBe(true);
      expect(
        await s.page.locator(".work-order-icon svg").count(),
      ).toBeGreaterThan(0);
      expect(
        await s.page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await s.page.screenshot({
        path: resolve(captureDirectory, "dispatch-detail-1440.png"),
        fullPage: true,
      });
    } finally {
      await s.context.close();
    }
  });

  it("keeps the technician's first action near the top on a 390 px phone and saves a report", async () => {
    const s = await workspace(390, "technician-a");
    try {
      await s.page.locator("h1").getByText("Assigned work").waitFor();
      await s.page.locator(".work-order-card").first().waitFor();
      expect(await s.page.locator(".work-order-card").count()).toBe(1);
      await s.page.locator(".work-order-card").first().click();
      const action = s.page
        .locator(".work-order-quick-actions")
        .getByRole("button", { name: "Start work" });
      await action.waitFor();
      const box = await action.boundingBox();
      await s.page.screenshot({
        path: resolve(captureDirectory, "technician-detail-390.png"),
        fullPage: true,
      });
      expect(box!.y + box!.height).toBeLessThanOrEqual(650);
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(
        await s.page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await action.click();
      await s.page.locator(".work-order-editor button[type=submit]").click();
      await s.page
        .locator(".work-order-quick-actions")
        .getByRole("button", { name: "Resolve" })
        .waitFor();
      await s.page
        .locator(".work-order-quick-actions")
        .getByRole("button", { name: "Resolve" })
        .click();
      await s.page
        .getByLabel("Work report")
        .fill(
          "Replaced the failed condenser relay and verified stable cooling.",
        );
      await s.page.locator(".work-order-editor button[type=submit]").click();
      await s.page
        .getByRole("heading", { name: "Latest resolution report" })
        .waitFor();
      expect(await s.page.locator(".work-order-report").innerText()).toContain(
        "Replaced the failed condenser relay",
      );
      expect(
        s.requests.filter((request: any) => request.operation === "resolve")[0]
          .body,
      ).toEqual({
        expectedVersion: 2,
        resolutionNote:
          "Replaced the failed condenser relay and verified stable cooling.",
      });
      await s.page.screenshot({
        path: resolve(captureDirectory, "technician-resolved-390.png"),
        fullPage: true,
      });
    } finally {
      await s.context.close();
    }
  });

  it("retains correction inputs after a conflict and shows current saved values", async () => {
    const s = await workspace(768, "dispatcher", { conflictOnce: true });
    try {
      await s.page.locator(".work-order-card").first().click();
      await s.page
        .locator(".work-order-quick-actions")
        .getByRole("button", { name: "Edit details" })
        .click();
      await s.page
        .getByLabel("Title", { exact: true })
        .fill("Updated cooling inspection");
      await s.page.getByLabel("Reason").fill("Correct the field report title.");
      await s.page.locator(".work-order-editor button[type=submit]").click();
      await s.page.getByText(/Current saved order/).waitFor();
      expect(
        await s.page.getByLabel("Title", { exact: true }).inputValue(),
      ).toBe("Updated cooling inspection");
      expect(
        await s.page.getByText(/Current saved order/).innerText(),
      ).toContain("Saved by another dispatcher");
      await s.page.screenshot({
        path: resolve(captureDirectory, "correction-conflict-768.png"),
        fullPage: true,
      });
    } finally {
      await s.context.close();
    }
  });

  it("keeps a former assignee's denial visible and replaces the authorized queue", async () => {
    const s = await workspace(390, "technician-a");
    try {
      await s.page.locator(".work-order-card").first().click();
      await s.page
        .getByRole("heading", { name: "Cooling unit inspection" })
        .waitFor();
      s.records.get("order-a").assigneePrincipalId =
        "fixture-principal-technician-b";
      await s.page.getByRole("button", { name: "Refresh" }).click();
      await s.page
        .getByText(/no longer available to this staff member/)
        .waitFor();
      expect(
        await s.page
          .getByRole("heading", { name: "Cooling unit inspection" })
          .count(),
      ).toBe(0);
      await s.page.getByRole("button", { name: "Back to queue" }).click();
      await s.page.getByText("No work orders here").waitFor();
      await s.page.screenshot({
        path: resolve(captureDirectory, "former-assignee-denied-390.png"),
        fullPage: true,
      });
    } finally {
      await s.context.close();
    }
  });

  it("keeps a denied mutation explanation after refreshing assigned work", async () => {
    const s = await workspace(390, "technician-a");
    try {
      await s.page.locator(".work-order-card").first().click();
      await s.page
        .locator(".work-order-quick-actions")
        .getByRole("button", { name: "Start work" })
        .click();
      s.records.get("order-a").assigneePrincipalId =
        "fixture-principal-technician-b";
      await s.page.locator(".work-order-editor button[type=submit]").click();
      await s.page
        .getByText("This order is no longer in your assigned work.")
        .waitFor();
      await s.page.getByRole("button", { name: "Back to queue" }).click();
      await s.page.getByText("No work orders here").waitFor();
    } finally {
      await s.context.close();
    }
  });

  it("opens a blank creation form from existing detail and retains a cancellation reason", async () => {
    const s = await workspace(1440);
    try {
      await s.page.locator(".work-order-card").first().click();
      await s.page
        .getByRole("heading", { name: "Cooling unit inspection" })
        .waitFor();
      await s.page
        .getByRole("navigation", { name: "Application routes" })
        .getByRole("link", { name: "New work order" })
        .click();
      expect(
        await s.page.getByLabel("Title", { exact: true }).inputValue(),
      ).toBe("");
      await s.page
        .getByLabel("Title", { exact: true })
        .fill("Duplicate service request");
      await s.page.getByLabel("Service location").fill("North plant · Level 2");
      await s.page.locator(".work-order-editor button[type=submit]").click();
      await s.page
        .getByRole("heading", { name: "Duplicate service request" })
        .waitFor();
      expect(
        s.requests.find((request: any) => request.operation === "create").body,
      ).toEqual({
        values: {
          title: "Duplicate service request",
          serviceLocation: "North plant · Level 2",
          priority: "medium",
          description: null,
          dueDate: null,
        },
      });
      await s.page
        .locator(".work-order-quick-actions")
        .getByRole("button", { name: "Cancel order" })
        .click();
      await s.page
        .getByLabel("Reason")
        .fill("Duplicate of an existing inspection.");
      await s.page.locator(".work-order-editor button[type=submit]").click();
      await s.page.getByText(/Cancelled order. Its saved details/).waitFor();
      expect(
        s.requests.find((request: any) => request.operation === "cancel").body,
      ).toEqual({
        expectedVersion: 0,
        reason: "Duplicate of an existing inspection.",
      });
      expect(await s.page.locator(".work-order-history").innerText()).toContain(
        "Duplicate of an existing inspection.",
      );
      await s.page.screenshot({
        path: resolve(captureDirectory, "cancelled-duplicate-1440.png"),
        fullPage: true,
      });
    } finally {
      await s.context.close();
    }
  });

  it("freezes an uncertain command and replays the same key without duplicating work", async () => {
    const s = await workspace(390, "technician-a", { uncertainOnce: true });
    try {
      await s.page.locator(".work-order-card").first().click();
      await s.page
        .locator(".work-order-quick-actions")
        .getByRole("button", { name: "Start work" })
        .click();
      await s.page.locator(".work-order-editor button[type=submit]").click();
      await s.page.getByRole("button", { name: "Retry same change" }).waitFor();
      expect(await s.page.getByLabel("Demo staff member").isDisabled()).toBe(
        true,
      );
      await s.page.evaluate(() => history.back());
      await s.page.waitForTimeout(50);
      expect(new URL(s.page.url()).pathname).toBe("/order-detail");
      await s.page.getByRole("button", { name: "Retry same change" }).click();
      await s.page
        .locator(".work-order-quick-actions")
        .getByRole("button", { name: "Resolve" })
        .waitFor();
      const commands = s.requests.filter(
        (request: any) => request.operation === "start",
      );
      expect(commands).toHaveLength(2);
      expect(commands[0]).toEqual(commands[1]);
      expect(s.records.get("order-a").version).toBe(2);
      expect(
        s.history
          .get("order-a")!
          .filter((event: any) => event.action === "start"),
      ).toHaveLength(1);
      await s.page.screenshot({
        path: resolve(captureDirectory, "uncertain-recovered-390.png"),
        fullPage: true,
      });
    } finally {
      await s.context.close();
    }
  });

  it.each([502, 504] as const)(
    "retries a committed create after an ambiguous %i without creating a second order",
    async (status) => {
      const s = await workspace(1440, "dispatcher", {
        ambiguousCreateStatus: status,
      });
      try {
        await s.page.getByRole("button", { name: "Create order" }).click();
        await s.page
          .getByLabel("Title", { exact: true })
          .fill("Repair roof fan");
        await s.page.getByLabel("Service location").fill("North roof");
        await s.page.locator(".work-order-editor button[type=submit]").click();
        await s.page
          .getByRole("button", { name: "Retry same change" })
          .waitFor();
        expect(await s.page.locator("#work-order-principal").isDisabled()).toBe(
          true,
        );
        await s.page.getByRole("button", { name: "Retry same change" }).click();
        await s.page
          .locator(".work-order-detail h2", { hasText: "Repair roof fan" })
          .waitFor();
        expect(new URL(s.page.url()).pathname).toBe("/order-detail");
        expect(await s.page.locator("#work-order-principal").isDisabled()).toBe(
          false,
        );
        const commands = s.requests.filter(
          (request: any) => request.operation === "create",
        );
        expect(commands).toHaveLength(2);
        expect(commands[1]).toEqual(commands[0]);
        expect(
          [...s.records.keys()].filter((id) => id.startsWith("order-created-")),
        ).toHaveLength(1);
        expect(s.history.get("order-created-1")).toHaveLength(1);
      } finally {
        await s.context.close();
      }
    },
  );

  it("holds principal, route and selected order during a pending command and a second ambiguous replay", async () => {
    const s = await workspace(1440, "dispatcher", {
      holdMutationOnce: true,
      ambiguousMutationSequence: ["abort", 503],
    });
    try {
      await s.page.locator(".work-order-card").first().click();
      await s.page
        .locator(".work-order-quick-actions")
        .getByRole("button", { name: "Edit details" })
        .click();
      await s.page
        .getByLabel("Title", { exact: true })
        .fill("Roof fan checked");
      await s.page.getByLabel("Reason").fill("Correct the ticket title.");
      await s.page.locator(".work-order-editor button[type=submit]").click();
      await s.mutationStarted;
      expect(await s.page.locator("#work-order-principal").isDisabled()).toBe(
        true,
      );
      await s.page
        .getByRole("navigation", { name: "Application routes" })
        .locator("a")
        .first()
        .evaluate((node: any) => node.click());
      await s.page
        .locator(".work-order-card")
        .nth(1)
        .evaluate((node: any) => node.click());
      await s.page.evaluate(() => history.back());
      await s.page.waitForTimeout(50);
      expect(new URL(s.page.url()).pathname).toBe("/order-detail");
      expect(await s.page.locator(".work-order-detail h2").innerText()).toBe(
        "Cooling unit inspection",
      );
      s.releaseMutation();
      await s.page.getByRole("button", { name: "Retry same change" }).waitFor();
      await s.page.getByRole("button", { name: "Retry same change" }).click();
      await s.page.getByRole("button", { name: "Retry same change" }).waitFor();
      await s.page.getByRole("button", { name: "Retry same change" }).click();
      await s.page
        .locator(".work-order-detail h2", { hasText: "Roof fan checked" })
        .waitFor();
      const commands = s.requests.filter(
        (request: any) => request.operation === "update",
      );
      expect(commands).toHaveLength(3);
      expect(commands[1]).toEqual(commands[0]);
      expect(commands[2]).toEqual(commands[0]);
      expect(
        s.history.get("order-a")!.filter((e: any) => e.action === "update"),
      ).toHaveLength(1);
      expect(await s.page.locator("#work-order-principal").isDisabled()).toBe(
        false,
      );
    } finally {
      s.releaseMutation();
      await s.context.close();
    }
  });

  it("preserves a rejected create draft and its server explanation after queue refresh", async () => {
    const s = await workspace(1440, "dispatcher", { rejectCreateStatus: 400 });
    try {
      await s.page.getByRole("button", { name: "Create order" }).click();
      await s.page.getByLabel("Title", { exact: true }).fill("Repair roof fan");
      await s.page.getByLabel("Service location").fill("North roof");
      await s.page.locator(".work-order-editor button[type=submit]").click();
      await s.page
        .getByRole("alert")
        .getByText(/Check the entered values/)
        .waitFor();
      expect(
        await s.page.getByLabel("Title", { exact: true }).inputValue(),
      ).toBe("Repair roof fan");
      expect(
        s.requests.filter((request: any) => request.operation === "create"),
      ).toHaveLength(1);
      expect(
        [...s.records.keys()].filter((id) => id.startsWith("order-created-")),
      ).toHaveLength(0);
    } finally {
      await s.context.close();
    }
  });

  it("does not let a late former-record read replace a newer detail", async () => {
    const s = await workspace(1440, "dispatcher", { holdARead: true });
    try {
      await s.page.locator(".work-order-card").first().click();
      await s.page.locator(".work-order-card").nth(1).click();
      await s.page
        .getByRole("heading", { name: "Replace corridor light" })
        .waitFor();
      s.releaseARead();
      await s.page.waitForTimeout(100);
      expect(await s.page.locator(".work-order-detail h2").innerText()).toBe(
        "Replace corridor light",
      );
    } finally {
      s.releaseARead();
      await s.context.close();
    }
  });

  it("keeps earlier reports across reopen and a later resolution", async () => {
    const s = await workspace(390, "technician-a");
    const submit = () =>
      s.page.locator(".work-order-editor button[type=submit]").click();
    try {
      await s.page.locator(".work-order-card").first().click();
      await s.page
        .locator(".work-order-quick-actions")
        .getByRole("button", { name: "Start work" })
        .click();
      await submit();
      await s.page
        .locator(".work-order-quick-actions")
        .getByRole("button", { name: "Resolve" })
        .click();
      await s.page
        .getByLabel("Work report")
        .fill("First repair: replaced relay.");
      await submit();
      await s.page
        .getByRole("heading", { name: "Latest resolution report" })
        .waitFor();
      await s.page
        .getByLabel("Demo staff member")
        .selectOption("fixture-principal-dispatcher");
      await s.page
        .locator(".work-order-quick-actions")
        .getByRole("button", { name: "Reopen" })
        .click();
      await s.page.getByLabel("Reason").fill("Cooling failed overnight.");
      await submit();
      await s.page
        .getByRole("heading", { name: "Earlier resolution report" })
        .waitFor();
      expect(await s.page.locator(".work-order-report").innerText()).toContain(
        "First repair: replaced relay.",
      );
      await s.page
        .getByLabel("Demo staff member")
        .selectOption("fixture-principal-technician-a");
      await s.page
        .locator(".work-order-quick-actions")
        .getByRole("button", { name: "Start work" })
        .click();
      await submit();
      await s.page
        .locator(".work-order-quick-actions")
        .getByRole("button", { name: "Resolve" })
        .click();
      await s.page
        .getByLabel("Work report")
        .fill("Second repair: replaced compressor.");
      await submit();
      await s.page
        .getByRole("heading", { name: "Latest resolution report" })
        .waitFor();
      const readable = await s.page.locator(".work-order-history").innerText();
      expect(readable).toContain("First repair: replaced relay.");
      expect(readable).toContain("Second repair: replaced compressor.");
      await s.page.screenshot({
        path: resolve(captureDirectory, "reopened-resolved-390.png"),
        fullPage: true,
      });
    } finally {
      await s.context.close();
    }
  });

  it("keeps a late former-principal detail response out of the new staff view", async () => {
    const s = await workspace(1440, "dispatcher", { holdARead: true });
    try {
      await s.page.locator(".work-order-card").first().click();
      await s.page
        .locator("#work-order-principal")
        .selectOption("fixture-principal-technician-b");
      await s.page
        .getByText(/no longer available to this staff member/)
        .waitFor();
      s.releaseARead();
      await s.page.waitForTimeout(100);
      expect(
        await s.page
          .getByRole("heading", { name: "Cooling unit inspection" })
          .count(),
      ).toBe(0);
    } finally {
      s.releaseARead();
      await s.context.close();
    }
  });

  it("shows distinct empty and recoverable queue-error states with keyboard focus at tablet width", async () => {
    const s = await workspace(768, "technician-b", { listErrorOnce: true });
    try {
      await s.page
        .getByText("Queue unavailable. Use Refresh to try again.")
        .waitFor();
      expect(await s.page.getByText("No work orders here").count()).toBe(0);
      await s.page.getByRole("button", { name: "Refresh" }).focus();
      expect(
        await s.page.evaluate(() =>
          document.activeElement?.getAttribute("aria-label"),
        ),
      ).toBe("Refresh");
      const light = await s.page
        .locator(".generated-app")
        .evaluate((node: Element) => getComputedStyle(node).backgroundColor);
      await s.page
        .locator(".generated-app")
        .evaluate((node: Element) => node.setAttribute("data-theme", "dark"));
      const dark = await s.page
        .locator(".generated-app")
        .evaluate((node: Element) => getComputedStyle(node).backgroundColor);
      expect(dark).not.toBe(light);
      await s.page.getByRole("button", { name: "Refresh" }).click();
      await s.page.getByText("No work orders here").waitFor();
      expect(await s.page.locator(".work-order-queue h2").isVisible()).toBe(
        false,
      );
      expect(
        await s.page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await s.page.screenshot({
        path: resolve(captureDirectory, "empty-dark-768.png"),
        fullPage: true,
      });
    } finally {
      await s.context.close();
    }
  });

  it("starts with the persisted technician principal before any business read", async () => {
    const s = await workspace(390, "technician-b");
    try {
      await s.page.getByText("No work orders here").waitFor();
      expect(s.reads.length).toBeGreaterThan(0);
      expect(
        s.reads.every(
          (read: any) => read.session === "fixture-session-technician-b",
        ),
      ).toBe(true);
    } finally {
      await s.context.close();
    }
  });

  it("renders a long Graph page title and explicit dark theme without phone overflow", async () => {
    const custom = structuredClone(graph) as any;
    const title =
      "Assigned facility inspection and repair work across every building and service location";
    custom.metadata.name =
      "Facilities service for a long named campus division";
    custom.page.pages.find(
      (page: any) => page.id === profile.pages.queue,
    ).title = title;
    custom.experience.theme.mode = "dark";
    const source = renderServiceWorkOrdersWorkspace(custom, profile, true);
    const output = await viteRequire("esbuild").build({
      stdin: {
        contents:
          source +
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
    const s = await workspace(390, "technician-a", {
      overrideScript: output.outputFiles[0].text,
      overrideCss: themeCss(custom),
    });
    try {
      await s.page.getByRole("heading", { name: title }).waitFor();
      expect(
        await s.page.locator(".generated-app").getAttribute("data-theme"),
      ).toBe("dark");
      expect(
        await s.page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await s.page.screenshot({
        path: resolve(captureDirectory, "long-title-dark-390.png"),
        fullPage: true,
      });
    } finally {
      await s.context.close();
    }
  });

  it("returns a recoverable validation message for an impossible date", async () => {
    const s = await workspace(390);
    try {
      const message = await s.page.evaluate(() =>
        (window as any).__workOrderValidate("create", {
          title: "Inspect unit",
          serviceLocation: "Plant 2",
          priority: "high",
          description: "",
          dueDate: "2026-99-99",
          reason: "",
          resolutionNote: "",
          assigneePrincipalId: "",
        }),
      );
      expect(message).toBe("Enter a valid due date.");
    } finally {
      await s.context.close();
    }
  });
});

import {
  loadWorkOrdersRuntime,
  roleWorkOrdersInput,
  workOrdersRoleCases,
} from "./fixtures/service-work-orders-runtime.js";
it.each(workOrdersRoleCases)(
  "keeps fixed fixture identity in outgoing UI requests for $name roles",
  async ({ dispatcher, technician }) => {
    const input = roleWorkOrdersInput(dispatcher, technician);
    const selected = selectServiceWorkOrdersProfile(
      input.graph,
      input.compositionLock,
    )!;
    const source = renderServiceWorkOrdersWorkspace(
      input.graph,
      selected,
      true,
    );
    const output = await viteRequire("esbuild").build({
      stdin: {
        contents:
          source +
          '\nimport {createRoot} from "react-dom/client";createRoot(document.getElementById("root")!).render(<GeneratedApplication requestedPath="/dispatch"/>);',
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
    const emitted = loadWorkOrdersRuntime(undefined, input);
    const { resolvePrincipalContext } = emitted.load("api/src/main.ts");
    const runtime = new emitted.ApplicationRuntime(
      new emitted.InMemoryRecordStore(),
    );
    const resolveActor = (session: string) =>
      resolvePrincipalContext({
        headers: { "x-factory-fixture-session": session },
      });
    const dispatch = resolveActor("fixture-session-dispatcher");
    const created = await runtime.workOrderCommand(
      dispatch,
      "work-order",
      undefined,
      "create",
      "ui-seed",
      {
        values: {
          title: "Identity repair",
          serviceLocation: "Room 1",
          priority: "medium",
          description: null,
          dueDate: null,
        },
      },
    );
    const context = await browser.newContext(),
      page = await context.newPage();
    page.setDefaultTimeout(5000);
    const requests: {
      method: string;
      session: string;
      operation?: string;
      body?: any;
    }[] = [];
    await page.route("**/*", async (route: any) => {
      const request = route.request(),
        path = new URL(request.url()).pathname,
        method = request.method();
      if (path === "/dispatch")
        return route.fulfill({
          status: 200,
          contentType: "text/html",
          body: "<!doctype html><div id='root'></div>",
        });
      const session = request.headers()["x-factory-fixture-session"] ?? "";
      const parts = path.split("/").filter(Boolean),
        id = parts[2],
        operation = parts[4];
      const body = request.postData()
        ? JSON.parse(request.postData())
        : undefined;
      requests.push({ method, session, operation, body });
      try {
        const actor = resolveActor(session);
        const result =
          path === "/api/work-order-assignees"
            ? await runtime.workOrderAssignees(actor)
            : method === "POST"
              ? await runtime.workOrderCommand(
                  actor,
                  "work-order",
                  id,
                  operation ?? "create",
                  request.headers()["x-factory-idempotency-key"],
                  body,
                )
              : parts[3] === "history"
                ? await runtime.workOrderHistory(actor, "work-order", id)
                : id
                  ? await runtime.workOrderRead(actor, "work-order", id)
                  : await runtime.workOrderList(actor, "work-order");
        return route.fulfill({
          status: method === "POST" ? result.status : 200,
          contentType: "application/json",
          body: JSON.stringify(method === "POST" ? result.body : result),
        });
      } catch (error: any) {
        return route.fulfill({
          status: error.status ?? 403,
          contentType: "application/json",
          body: JSON.stringify(error.body ?? { code: "work_order.forbidden" }),
        });
      }
    });
    try {
      await page.goto("https://work-orders.local/dispatch");
      await page.addScriptTag({ content: output.outputFiles[0].text });
      await page.getByRole("heading", { name: "Dispatch queue" }).waitFor();
      expect(
        await page
          .locator("#work-order-principal option")
          .evaluateAll((options: HTMLOptionElement[]) =>
            options.map((option) => option.value),
          ),
      ).toEqual([
        "fixture-principal-dispatcher",
        "fixture-principal-technician-a",
        "fixture-principal-technician-b",
      ]);
      await page.locator(".work-order-card").first().click();
      await page
        .locator(".work-order-quick-actions")
        .getByRole("button", { name: "Assign", exact: true })
        .click();
      await page.locator("#work-order-assigneePrincipalId").waitFor();
      expect(
        await page
          .locator("#work-order-assigneePrincipalId")
          .locator("option")
          .evaluateAll((options: HTMLOptionElement[]) =>
            options.map((option) => option.value),
          ),
      ).toEqual([
        "",
        "fixture-principal-technician-a",
        "fixture-principal-technician-b",
      ]);
      await page
        .locator("#work-order-assigneePrincipalId")
        .selectOption("fixture-principal-technician-a");
      await page.locator(".work-order-editor button[type=submit]").click();
      await page
        .locator(".work-order-quick-actions")
        .getByRole("button", { name: "Reassign", exact: true })
        .waitFor();
      for (const [person, operation] of [
        ["technician-a", "Start work"],
        ["technician-b", "Resolve"],
      ]) {
        if (person === "technician-b") {
          await page
            .locator("#work-order-principal")
            .selectOption("fixture-principal-dispatcher");
          await page.locator(".work-order-card").first().click();
          await page
            .locator(".work-order-quick-actions")
            .getByRole("button", { name: "Reassign", exact: true })
            .click();
          await page
            .locator("#work-order-assigneePrincipalId")
            .selectOption("fixture-principal-technician-b");
          await page.getByLabel("Reason", { exact: true }).fill("Shift change");
          await page.locator(".work-order-editor button[type=submit]").click();
          await page
            .locator(".work-order-editor")
            .waitFor({ state: "detached" });
        }
        await page
          .locator("#work-order-principal")
          .selectOption("fixture-principal-" + person);
        await page.locator(".work-order-card").first().click();
        await page
          .locator(".work-order-quick-actions")
          .getByRole("button", { name: operation, exact: true })
          .click();
        if (person === "technician-b")
          await page.getByLabel("Work report").fill("Repair verified");
        await page.locator(".work-order-editor button[type=submit]").click();
        await page.locator(".work-order-editor").waitFor({ state: "detached" });
      }
      expect(
        requests
          .filter((request) => request.method === "POST")
          .map(({ operation, session, body }) => [
            operation,
            session,
            body.assigneePrincipalId ?? null,
          ]),
      ).toEqual([
        [
          "assign",
          "fixture-session-dispatcher",
          "fixture-principal-technician-a",
        ],
        ["start", "fixture-session-technician-a", null],
        [
          "reassign",
          "fixture-session-dispatcher",
          "fixture-principal-technician-b",
        ],
        ["resolve", "fixture-session-technician-b", null],
      ]);
      expect(
        (await runtime.workOrderRead(dispatch, "work-order", created.body.id))
          .status,
      ).toBe("resolved");
    } finally {
      await context.close();
    }
  },
  20000,
);
