import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { posix, resolve } from "node:path";
import ts from "typescript";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createCapabilityCompositionLock } from "@factory/capabilities";
import { hashApplicationGraph } from "@factory/graph";
import { generateApplicationBundle } from "../src/index.js";
import { selectAppointmentConsumerProfile } from "../src/appointment-consumer-contract.js";
import { appointmentDefinitionCompilationInput } from "./fixtures/definition-data-compatibility.js";
import { renderAppointmentWorkspace } from "../src/appointment-workspace-presentation.js";

const require = createRequire(import.meta.url);
const playwright = require("@playwright/test"),
  browserExpect = playwright.expect;
const viteRequire = createRequire(
  createRequire(require.resolve("vitest/package.json")).resolve(
    "vite/package.json",
  ),
);
const root = resolve(__dirname, "../../..");
const captureDirectory = resolve(
  root,
  `generated/.appointment-v2-task3-ui/root-interaction-${randomUUID()}`,
);
const clock = "2026-10-01T00:00:00.000Z";
const { graph, compositionLock: previousLock } =
  appointmentDefinitionCompilationInput();
graph.metadata.name = "Studio appointments";
graph.policy.permissions = graph.policy.permissions.flatMap((permission) =>
  permission.resource === "appointment" &&
  ["customer", "staff"].includes(permission.role)
    ? [
        permission,
        {
          role: permission.role,
          resource: "schedule",
          actions: ["read-availability"],
        },
      ]
    : [permission],
);
const graphHash = hashApplicationGraph(graph);
const compositionLock = createCapabilityCompositionLock({
  graphChecksum: graphHash,
  selections: previousLock.packages,
});
const profile = selectAppointmentConsumerProfile(graph, compositionLock)!;
let files: Map<string, string>, browser: any, script: string, styles: string;

beforeAll(async () => {
  await mkdir(captureDirectory, { recursive: true });
  files = new Map(
    generateApplicationBundle({
      publishedRevisionId: "appointment-ui",
      graph,
      compositionLock,
    }).files.map((file) => [file.path, file.content]),
  );
  const source = files.get("web/app/page-runtime.tsx")!;
  styles = files.get("web/app/globals.css")!;
  script = await bundleFrontend(source);
  browser = await playwright.chromium.launch({ headless: true });
});
async function bundleFrontend(source: string): Promise<string> {
  return (
    await viteRequire("esbuild").build({
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
    })
  ).outputFiles[0].text;
}
afterAll(async () => {
  await browser?.close();
  console.info(`Appointment component captures: ${captureDirectory}`);
});

/** Real emitted modules and exact request envelopes; no listener or PostgreSQL. */
function loadRuntime() {
  const cache = new Map<string, { exports: any }>();
  function load(path: string): any {
    if (cache.has(path)) return cache.get(path)!.exports;
    const source = files.get(path);
    if (!source) throw new Error(`Missing emitted module: ${path}`);
    const module = { exports: {} as any };
    cache.set(path, module);
    const code = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    new Function("require", "module", "exports", code)(
      (specifier: string) =>
        specifier.startsWith(".")
          ? load(
              posix.normalize(
                posix.join(
                  posix.dirname(path),
                  specifier.replace(/\.js$/, ".ts"),
                ),
              ),
            )
          : require(specifier),
      module,
      module.exports,
    );
    return module.exports;
  }
  return load("api/src/application-runtime.ts");
}

async function workspace(
  width = 390,
  dateHeader = true,
  timezoneId = "UTC",
  theme: "light" | "dark" = "light",
) {
  let pageScript = script,
    pageStyles = styles;
  if (theme === "dark") {
    const darkGraph = structuredClone(graph);
    darkGraph.experience.theme.mode = "dark";
    const darkLock = createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(darkGraph),
      selections: previousLock.packages,
    });
    const darkFiles = new Map(
      generateApplicationBundle({
        publishedRevisionId: "appointment-dark-ui",
        graph: darkGraph,
        compositionLock: darkLock,
      }).files.map((file) => [file.path, file.content]),
    );
    pageScript = await bundleFrontend(
      darkFiles.get("web/app/page-runtime.tsx")!,
    );
    pageStyles = darkFiles.get("web/app/globals.css")!;
  }
  const { InMemoryRecordStore, ApplicationRuntime } = loadRuntime();
  const store = new InMemoryRecordStore(),
    runtime = new ApplicationRuntime(store);
  const actor = (role: string) => ({
    role,
    scope: "fixture:fixture-session-" + role,
    graphHash,
  });
  const service = await runtime.appointmentSetupCreate(
    actor("administrator"),
    "service",
    "ui-service",
    { name: "Planning session", durationMinutes: 30, active: true },
  );
  const schedule = await runtime.appointmentSetupCreate(
    actor("administrator"),
    "schedule",
    "ui-schedule",
    {
      serviceId: service.id,
      startUtc: "2026-10-02T09:00:00.000Z",
      endUtc: "2026-10-02T09:30:00.000Z",
      timezone: "UTC",
      capacity: 2,
      status: "open",
    },
  );
  const context = await browser.newContext({
      viewport: { width, height: 900 },
      timezoneId,
    }),
    page = await context.newPage();
  page.setDefaultTimeout(5000);
  const requests: Array<{
      path: string;
      method: string;
      body: any;
      key?: string;
      role: string;
    }> = [],
    errors: string[] = [];
  page.on("pageerror", (error: Error) => errors.push(error.message));
  const faults = {
    dateHeader,
    now: clock,
    loseResponse: "",
    denyRead: "",
    afterDispatch: undefined as
      | undefined
      | ((
          request: { path: string; method: string; role: string },
          result: unknown,
        ) => Promise<void>),
  };
  await page.route("**/*", async (route: any) => {
    const request = route.request(),
      url = new URL(request.url()),
      method = request.method();
    if (url.origin !== "https://appointment.test") {
      errors.push("Unexpected external request");
      await route.abort();
      return;
    }
    if (!url.pathname.startsWith("/api/")) {
      await route.fulfill({
        contentType: "text/html",
        body:
          '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>' +
          pageStyles +
          '</style></head><body><div id="root"></div><script>' +
          pageScript +
          "</script></body></html>",
      });
      return;
    }
    const headers = request.headers(),
      role = String(headers["x-factory-fixture-session"] ?? "").replace(
        /^fixture-session-/,
        "",
      ),
      key = headers["x-factory-idempotency-key"];
    const parts = url.pathname
        .split("/")
        .filter(Boolean)
        .map(decodeURIComponent),
      entity = parts[1],
      id = parts[2];
    const body = request.postData()
      ? JSON.parse(request.postData())
      : undefined;
    requests.push({ path: url.pathname + url.search, method, body, key, role });
    let status = 200,
      result: unknown;
    try {
      if (method === "GET" && faults.denyRead === url.pathname) {
        const denied = Object.assign(new Error("Denied"), {
          status: 403,
          code: "appointment.forbidden",
        });
        throw denied;
      }
      if (method === "GET" && entity === "appointment-availability")
        result = await runtime.appointmentAvailability(
          role,
          url.pathname + url.search,
          faults.now,
        );
      else if (method === "GET" && parts[3] === "appointment-summary")
        result = await runtime.appointmentSummary(role, id);
      else if (method === "GET" && parts[3] === "appointment-history")
        result = await runtime.appointmentHistory(role, entity, id);
      else if (method === "GET")
        result = id
          ? await runtime.read(role, entity, id)
          : await runtime.list(role, entity);
      else if (
        method === "POST" &&
        parts.length === 2 &&
        ["service", "schedule"].includes(entity)
      ) {
        result = await runtime.appointmentSetupCreate(
          actor(role),
          entity,
          key,
          body,
        );
        status = 201;
      } else if (method === "PATCH")
        result = await runtime.appointmentSetupUpdate(
          actor(role),
          entity,
          id,
          key,
          body,
        );
      else if (
        method === "POST" &&
        entity === "appointment" &&
        (parts.length === 2 || (parts.length === 5 && parts[3] === "events"))
      ) {
        result = await runtime.appointmentCommand(
          actor(role),
          entity,
          id,
          id ? parts[4] : "create",
          key,
          body,
        );
        status = id ? 200 : 201;
      } else
        throw Object.assign(new Error("No controller route"), {
          status: 404,
          code: "route.not_found",
        });
    } catch (error: any) {
      status = error.status ?? 500;
      result = { code: error.code ?? "test.unexpected" };
    }
    await faults.afterDispatch?.({ path: url.pathname, method, role }, result);
    if (method !== "GET" && faults.loseResponse === url.pathname) {
      faults.loseResponse = "";
      await route.abort("failed");
      return;
    }
    await route.fulfill({
      status,
      contentType: "application/json",
      headers: {
        "Cache-Control": "no-store",
        ...(faults.dateHeader
          ? { Date: new Date(faults.now).toUTCString() }
          : { Date: "" }),
      },
      body: JSON.stringify(result),
    });
  });
  return {
    page,
    context,
    store,
    runtime,
    requests,
    errors,
    faults,
    service,
    schedule,
    open: () => page.goto("https://appointment.test/"),
  };
}

const actor = (role: string) => ({
  role,
  scope: `fixture:fixture-session-${role}`,
  graphHash,
});
type Workspace = Awaited<ReturnType<typeof workspace>>;
const savedCard = (s: Workspace, customer: string) =>
  s.page
    .locator(".appointment-records > li")
    .filter({ has: s.page.getByText(customer, { exact: true }) });
async function requestAppointment(s: Workspace, customer: string) {
  await s.page
    .getByLabel("Service", { exact: true })
    .selectOption(s.service.id);
  await s.page.locator(".appointment-slot").first().click();
  await s.page.getByLabel("Your name", { exact: true }).fill(customer);
  await s.page
    .getByRole("button", { name: "Request appointment", exact: true })
    .click();
}

async function chooseAdministrator(s: Workspace) {
  await s.page.getByRole("combobox").first().selectOption("administrator");
  await browserExpect(s.page.getByLabel("Current service setup")).toBeVisible();
}

describe("Appointment emitted consumer workspace", () => {
  it.each(["list", "cursor"])(
    "requires offset-zero recovery before reusing a retained cursor after a %s clock failure",
    async (failure) => {
      const s = await workspace(1440);
      try {
        for (let index = 0; index < 101; index++)
          await s.store.create("schedule", {
            serviceId: s.service.id,
            startUtc: "2026-10-03T09:00:00.000Z",
            endUtc: "2026-10-03T09:30:00.000Z",
            timezone: "UTC",
            capacity: 1,
            status: "open",
          });
        await s.open();
        await s.page.getByRole("combobox").first().selectOption("staff");
        const more = s.page.getByRole("button", {
          name: "More available times",
          exact: true,
        });
        await browserExpect(more).toBeEnabled();
        s.faults.dateHeader = false;
        if (failure === "list")
          await s.page
            .getByRole("button", { name: "Refresh appointments", exact: true })
            .click();
        else await more.click();
        const retry = s.page.getByRole("button", {
          name: "Retry availability",
          exact: true,
        });
        await browserExpect(retry).toBeVisible();
        await browserExpect(more).toBeDisabled();
        s.faults.dateHeader = true;
        const before = s.requests.length;
        await retry.click();
        await browserExpect(more).toBeEnabled();
        const recovery = s.requests.slice(before);
        expect(recovery[0].path).toBe("/api/appointment");
        expect(
          recovery
            .filter((r) => r.path.startsWith("/api/appointment-availability"))
            .map((r) =>
              new URL(r.path, "https://appointment.test").searchParams.get(
                "offset",
              ),
            ),
        ).toEqual(["0"]);
        await more.click();
        await browserExpect(more).toHaveCount(0);
        expect(
          s.requests
            .filter((r) => r.path.startsWith("/api/appointment-availability"))
            .at(-1)?.path,
        ).toContain("offset=100");
        expect(s.errors).toEqual([]);
      } finally {
        await s.context.close();
      }
    },
  );

  it("shows all authoritative schedule fields beside the preserved draft after a conflict", async () => {
    const s = await workspace(1440);
    try {
      const other = await s.runtime.appointmentSetupCreate(
        actor("administrator"),
        "service",
        "other-service",
        { name: "Portfolio review", durationMinutes: 45, active: true },
      );
      await s.open();
      await chooseAdministrator(s);
      await s.page
        .getByLabel("Current schedule setup")
        .locator("article")
        .filter({ hasText: "2026-10-02 09:00:00 UTC" })
        .getByRole("button", { name: "Update schedule", exact: true })
        .click();
      await s.page.getByLabel("Capacity", { exact: true }).fill("4");
      const expectedValues = {
        serviceId: s.service.id,
        startUtc: s.schedule.startUtc,
        endUtc: s.schedule.endUtc,
        timezone: "UTC",
        capacity: 2,
        status: "open",
      };
      const current = {
        ...expectedValues,
        serviceId: other.id,
        startUtc: "2026-10-04T10:00:00.000Z",
        endUtc: "2026-10-04T10:45:00.000Z",
        timezone: "Asia/Singapore",
        capacity: 3,
        status: "closed",
      };
      await s.runtime.appointmentSetupUpdate(
        actor("administrator"),
        "schedule",
        s.schedule.id,
        "concurrent-schedule-edit",
        { expectedValues, values: current },
      );
      await s.page
        .getByRole("button", { name: "Save schedule update", exact: true })
        .click();
      await browserExpect(s.page.getByRole("alert")).toContainText(
        "Latest saved values",
      );
      const saved = s.page.getByRole("region", {
        name: "Current saved schedule",
        exact: true,
      });
      for (const value of [
        "Portfolio review",
        current.startUtc,
        current.endUtc,
        "Asia/Singapore",
        "3",
        "Closed to new bookings",
      ])
        await browserExpect(
          saved.getByText(value, { exact: true }),
        ).toBeVisible();
      await s.page.screenshot({
        path: resolve(
          captureDirectory,
          "administrator-schedule-conflict-1440.png",
        ),
        fullPage: true,
      });
      await s.page.setViewportSize({ width: 390, height: 900 });
      await browserExpect(saved).toBeVisible();
      expect(
        await s.page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await s.page.screenshot({
        path: resolve(
          captureDirectory,
          "administrator-schedule-conflict-390.png",
        ),
        fullPage: true,
      });
      await browserExpect(
        s.page.getByLabel("Capacity", { exact: true }),
      ).toHaveValue("4");
      await browserExpect(
        s.page.getByLabel("Schedule service", { exact: true }),
      ).toHaveValue(s.service.id);
      await browserExpect(
        s.page.getByLabel("End time (UTC)", { exact: true }),
      ).toHaveValue("2026-10-02T09:30");
      const attempts = () =>
        s.requests.filter(
          (r) =>
            r.method === "PATCH" && r.path === `/api/schedule/${s.schedule.id}`,
        );
      expect(attempts()).toHaveLength(1);
      await s.page
        .getByRole("button", { name: "Save schedule update", exact: true })
        .click();
      await browserExpect(s.page.getByRole("status")).toHaveText(
        "Changes saved.",
      );
      expect(attempts()).toHaveLength(2);
      expect(attempts()[1].key).not.toBe(attempts()[0].key);
      expect(attempts()[1].body).toEqual({
        expectedValues: current,
        values: { ...expectedValues, capacity: 4 },
      });
      await browserExpect(
        saved.getByText("Planning session", { exact: true }),
      ).toBeVisible();
      await browserExpect(saved.getByText("4", { exact: true })).toBeVisible();
    } finally {
      await s.context.close();
    }
  });

  it.each([false, true])(
    "refreshes externally changed history and fences an older pending read: %s",
    async (delayOld) => {
      const s = await workspace(1440);
      let releaseOld!: () => void;
      const gate = new Promise<void>((resolve) => {
        releaseOld = resolve;
      });
      let held = false;
      try {
        await s.open();
        await requestAppointment(s, "External change");
        await s.page.getByRole("combobox").first().selectOption("staff");
        const card = savedCard(s, "External change");
        await browserExpect(
          card.getByRole("button", {
            name: "Confirm appointment",
            exact: true,
          }),
        ).toBeEnabled();
        const row = (await s.store.list("appointment")).find(
          (r: any) => r.customerName === "External change",
        );
        s.faults.afterDispatch = async (request) => {
          if (
            delayOld &&
            request.path.endsWith("/appointment-history") &&
            !held
          ) {
            held = true;
            await gate;
          }
        };
        await card.getByText("Appointment history", { exact: true }).click();
        if (delayOld) await expect.poll(() => held).toBe(true);
        else
          await browserExpect(
            card.locator(".appointment-history strong"),
          ).toHaveText(["Requested"]);
        await s.runtime.appointmentCommand(
          actor("staff"),
          "appointment",
          row.id,
          "confirm",
          "external-history-confirm",
          { expectedVersion: 0 },
        );
        await s.page
          .getByRole("button", { name: "Refresh appointments", exact: true })
          .click();
        await browserExpect(card.locator(".appointment-status")).toHaveText(
          "confirmed",
        );
        await browserExpect(
          card.locator(".appointment-history strong"),
        ).toHaveText(["Requested", "Confirmed"]);
        if (delayOld) {
          const response = s.page.waitForResponse((r: any) =>
            new URL(r.url()).pathname.endsWith("/appointment-history"),
          );
          releaseOld();
          await response;
          await s.page.evaluate(
            () =>
              new Promise<void>((resolve) =>
                requestAnimationFrame(() =>
                  requestAnimationFrame(() => resolve()),
                ),
              ),
          );
          await browserExpect(
            card.locator(".appointment-history strong"),
          ).toHaveText(["Requested", "Confirmed"]);
        }
        expect(s.errors).toEqual([]);
      } finally {
        releaseOld();
        await s.context.close();
      }
    },
  );

  it("identifies renamed service metadata as current beside the retained booked time", async () => {
    const s = await workspace();
    try {
      await s.open();
      await requestAppointment(s, "Service rename");
      await s.runtime.appointmentSetupUpdate(
        actor("administrator"),
        "service",
        s.service.id,
        "rename-after-booking",
        {
          expectedValues: {
            name: "Planning session",
            durationMinutes: 30,
            active: true,
          },
          values: {
            name: "Current consultation",
            durationMinutes: 45,
            active: true,
          },
        },
      );
      await s.page
        .getByRole("button", { name: "Refresh appointments", exact: true })
        .click();
      const card = savedCard(s, "Service rename");
      await browserExpect(
        card.getByRole("heading", {
          name: "Current consultation",
          exact: true,
        }),
      ).toBeVisible();
      await browserExpect(
        card.getByText("Current service name", { exact: true }),
      ).toBeVisible();
      await browserExpect(card).toContainText(
        "Booked time retained from appointment history.",
      );
    } finally {
      await s.context.close();
    }
  });

  it("lets staff reach replacement times after the first cursor page and in the next week", async () => {
    const s = await workspace(1440);
    try {
      let last: any;
      for (let index = 0; index < 101; index++) {
        const start = Date.UTC(2026, 9, 3, 10, index);
        last = await s.runtime.appointmentSetupCreate(
          actor("administrator"),
          "schedule",
          `staff-page-${index}`,
          {
            serviceId: s.service.id,
            startUtc: new Date(start).toISOString(),
            endUtc: new Date(start + 1800000).toISOString(),
            timezone: "UTC",
            capacity: 1,
            status: "open",
          },
        );
      }
      const nextWeek = await s.runtime.appointmentSetupCreate(
        actor("administrator"),
        "schedule",
        "staff-next-week",
        {
          serviceId: s.service.id,
          startUtc: "2026-10-10T09:00:00.000Z",
          endUtc: "2026-10-10T09:30:00.000Z",
          timezone: "UTC",
          capacity: 1,
          status: "open",
        },
      );
      await s.open();
      await requestAppointment(s, "Staff navigation");
      await s.page.getByRole("combobox").first().selectOption("staff");
      const card = savedCard(s, "Staff navigation");
      await card
        .getByRole("button", { name: "Confirm appointment", exact: true })
        .click();
      await card.getByText("Manage appointment", { exact: true }).click();
      const select = card.getByLabel("Reschedule Staff navigation");
      await browserExpect(
        select.locator(`option[value="${last.id}"]`),
      ).toHaveCount(0);
      await s.page
        .getByRole("button", { name: "More available times", exact: true })
        .click();
      await select.selectOption(last.id);
      await browserExpect(select).toHaveValue(last.id);
      await s.page
        .getByRole("button", { name: "Next week", exact: true })
        .click();
      await browserExpect(
        select.locator(`option[value="${last.id}"]`),
      ).toHaveCount(0);
      await browserExpect(
        card.getByRole("button", {
          name: "Reschedule appointment",
          exact: true,
        }),
      ).toBeDisabled();
      await select.selectOption(nextWeek.id);
      await card
        .getByRole("button", { name: "Reschedule appointment", exact: true })
        .click();
      await browserExpect(card.locator(".appointment-status")).toHaveText(
        "requested",
      );
      expect(
        s.requests.find((request) =>
          request.path.endsWith("/events/reschedule"),
        )?.body,
      ).toEqual({ expectedVersion: 1, scheduleId: nextWeek.id });
      expect(s.errors).toEqual([]);
    } finally {
      await s.context.close();
    }
  });

  it("lets staff advance an empty scanned availability page to usable replacement times", async () => {
    const s = await workspace(1440);
    try {
      for (let index = 0; index < 500; index++)
        await s.store.create("schedule", {
          serviceId: s.service.id,
          startUtc: "2026-10-01T01:00:00.000Z",
          endUtc: "2026-10-01T01:30:00.000Z",
          timezone: "UTC",
          capacity: 1,
          status: "closed",
        });
      const replacement = await s.runtime.appointmentSetupCreate(
        actor("administrator"),
        "schedule",
        "empty-page-replacement",
        {
          serviceId: s.service.id,
          startUtc: "2026-10-03T09:00:00.000Z",
          endUtc: "2026-10-03T09:30:00.000Z",
          timezone: "UTC",
          capacity: 1,
          status: "open",
        },
      );
      await s.runtime.appointmentCommand(
        actor("customer"),
        "appointment",
        undefined,
        "create",
        "empty-page-booking",
        { values: { scheduleId: s.schedule.id, customerName: "Empty scan" } },
      );
      const row = (await s.store.list("appointment")).find(
        (r: any) => r.customerName === "Empty scan",
      );
      await s.runtime.appointmentCommand(
        actor("staff"),
        "appointment",
        row.id,
        "confirm",
        "empty-page-confirm",
        { expectedVersion: 0 },
      );
      await s.open();
      await s.page.getByRole("combobox").first().selectOption("staff");
      const card = savedCard(s, "Empty scan"),
        select = card.getByLabel("Reschedule Empty scan");
      await card.getByText("Manage appointment", { exact: true }).click();
      await browserExpect(select).toBeEnabled();
      await browserExpect(select.locator("option")).toHaveCount(1);
      await s.page
        .getByRole("button", { name: "More available times", exact: true })
        .click();
      await select.selectOption(replacement.id);
      expect(
        s.requests.some(
          (r) => r.role === "staff" && r.path.includes("offset=500"),
        ),
      ).toBe(true);
      await card
        .getByRole("button", { name: "Reschedule appointment", exact: true })
        .click();
      await browserExpect(card.locator(".appointment-status")).toHaveText(
        "requested",
      );
    } finally {
      await s.context.close();
    }
  });

  it.each(["clock", "read"])(
    "blocks staff rescheduling while availability needs %s recovery",
    async (failure) => {
      const s = await workspace(1440);
      try {
        const replacement = await s.runtime.appointmentSetupCreate(
          actor("administrator"),
          "schedule",
          "staff-recovery",
          {
            serviceId: s.service.id,
            startUtc: "2026-10-03T09:00:00.000Z",
            endUtc: "2026-10-03T09:30:00.000Z",
            timezone: "UTC",
            capacity: 1,
            status: "open",
          },
        );
        await s.open();
        await requestAppointment(s, "Staff recovery");
        await s.page.getByRole("combobox").first().selectOption("staff");
        const card = savedCard(s, "Staff recovery");
        await card
          .getByRole("button", { name: "Confirm appointment", exact: true })
          .click();
        await card.getByText("Manage appointment", { exact: true }).click();
        const select = card.getByLabel("Reschedule Staff recovery"),
          submit = card.getByRole("button", {
            name: "Reschedule appointment",
            exact: true,
          });
        await select.selectOption(replacement.id);
        if (failure === "clock") s.faults.dateHeader = false;
        else s.faults.denyRead = "/api/appointment-availability";
        await s.page
          .getByRole("button", { name: "Refresh appointments", exact: true })
          .click();
        await browserExpect(
          s.page.getByRole("button", {
            name: "Retry availability",
            exact: true,
          }),
        ).toBeVisible();
        await browserExpect(select).toBeDisabled();
        await browserExpect(submit).toBeDisabled();
        expect(
          s.requests.filter((request) =>
            request.path.endsWith("/events/reschedule"),
          ),
        ).toHaveLength(0);
        s.faults.dateHeader = true;
        s.faults.denyRead = "";
        await s.page
          .getByRole("button", { name: "Retry availability", exact: true })
          .click();
        await browserExpect(select).toBeEnabled();
        await select.selectOption(replacement.id);
        await submit.click();
        await browserExpect(card.locator(".appointment-status")).toHaveText(
          "requested",
        );
      } finally {
        await s.context.close();
      }
    },
  );

  it("requires a deliberate new action after a stale record version conflict", async () => {
    const s = await workspace(1440);
    try {
      await s.open();
      await requestAppointment(s, "Stale version customer");
      await s.page.getByRole("combobox").first().selectOption("staff");
      const card = savedCard(s, "Stale version customer");
      await browserExpect(
        card.getByRole("button", { name: "Confirm appointment", exact: true }),
      ).toBeEnabled();
      const row = (await s.store.list("appointment")).find(
        (item: any) => item.customerName === "Stale version customer",
      );
      await s.runtime.appointmentCommand(
        actor("staff"),
        "appointment",
        row.id,
        "confirm",
        "other-staff-confirm",
        { expectedVersion: 0 },
      );
      await card
        .getByRole("button", { name: "Confirm appointment", exact: true })
        .click();
      await browserExpect(s.page.getByRole("alert")).toContainText("changed");
      await browserExpect(card.locator(".appointment-status")).toHaveText(
        "confirmed",
      );
      expect(
        s.requests.filter((request) =>
          request.path.endsWith("/events/confirm"),
        ),
      ).toHaveLength(1);
      const first = s.requests.find((request) =>
        request.path.endsWith("/events/confirm"),
      )!;
      expect(first.body).toEqual({ expectedVersion: 0 });
      await card
        .locator("summary")
        .filter({ hasText: "Cancel appointment" })
        .click();
      await card
        .getByLabel("Cancellation reason for Stale version customer")
        .fill("Customer called to cancel");
      await card
        .getByRole("button", { name: "Cancel appointment", exact: true })
        .click();
      await browserExpect(card.locator(".appointment-status")).toHaveText(
        "cancelled",
      );
      const second = s.requests.find((request) =>
        request.path.endsWith("/events/cancel"),
      )!;
      expect(second.body).toEqual({
        expectedVersion: 1,
        cancellationReason: "Customer called to cancel",
      });
      expect(second.key).not.toBe(first.key);
    } finally {
      await s.context.close();
    }
  });

  it("loads bounded availability cursor pages and replaces the window on refresh", async () => {
    const s = await workspace();
    try {
      for (let index = 0; index < 101; index++) {
        const start = Date.UTC(2026, 9, 3, 10, index);
        await s.runtime.appointmentSetupCreate(
          actor("administrator"),
          "schedule",
          `cursor-slot-${index}`,
          {
            serviceId: s.service.id,
            startUtc: new Date(start).toISOString(),
            endUtc: new Date(start + 30 * 60000).toISOString(),
            timezone: "UTC",
            capacity: 1,
            status: "open",
          },
        );
      }
      await s.open();
      await browserExpect(s.page.locator(".appointment-slot")).toHaveCount(100);
      await s.page
        .getByRole("button", { name: "More available times", exact: true })
        .click();
      await browserExpect(s.page.locator(".appointment-slot")).toHaveCount(104);
      await browserExpect(
        s.page.getByRole("button", {
          name: "More available times",
          exact: true,
        }),
      ).toHaveCount(0);
      await s.page
        .getByRole("button", { name: "Refresh appointments", exact: true })
        .click();
      await browserExpect(s.page.locator(".appointment-slot")).toHaveCount(100);
      const pages = s.requests
        .filter((request) =>
          request.path.startsWith("/api/appointment-availability"),
        )
        .map((request) =>
          new URL(request.path, "https://appointment.test").searchParams.get(
            "offset",
          ),
        );
      expect(pages).toEqual(["0", "100", "0"]);
      expect(s.errors).toEqual([]);
    } finally {
      await s.context.close();
    }
  });
  it("shows a readable 768px dark staff empty state and recovers from denied reads", async () => {
    const s = await workspace(768, true, "UTC", "dark");
    try {
      await s.open();
      await s.page.getByRole("combobox").first().selectOption("staff");
      await s.page
        .getByLabel("Appointment status", { exact: true })
        .selectOption("cancelled");
      await browserExpect(s.page.locator(".appointment-empty")).toBeVisible();
      expect(
        await s.page.locator(".appointment-v1").getAttribute("data-theme"),
      ).toBe("dark");
      const geometry = await s.page.evaluate(() => {
        const canvas = document.querySelector(".appointment-workspace-canvas")!;
        const main = document.querySelector(".appointment-v1")!;
        return {
          width: window.innerWidth,
          scroll: document.documentElement.scrollWidth,
          canvas: canvas.getBoundingClientRect().width,
          bg: getComputedStyle(main).backgroundColor,
          text: getComputedStyle(main).color,
          roleText: getComputedStyle(
            document.querySelector(".appointment-role-strip")!,
          ).color,
        };
      });
      expect(geometry.scroll).toBe(768);
      expect(geometry.canvas).toBeGreaterThan(650);
      expect(geometry.bg).not.toBe(geometry.text);
      expect(geometry.roleText).toBe(geometry.text);
      await s.page
        .getByRole("button", { name: "Refresh appointments", exact: true })
        .focus();
      expect(
        await s.page
          .getByRole("button", { name: "Refresh appointments", exact: true })
          .evaluate((node: HTMLElement) => getComputedStyle(node).outlineStyle),
      ).not.toBe("none");
      await s.page.screenshot({
        path: resolve(captureDirectory, "staff-empty-dark-768.png"),
        fullPage: true,
      });
      s.faults.denyRead = "/api/appointment";
      await s.page
        .getByRole("button", { name: "Refresh appointments", exact: true })
        .press("Enter");
      await browserExpect(
        s.page.getByText("This demo role cannot make that change.", {
          exact: true,
        }),
      ).toBeVisible();
      await s.page.screenshot({
        path: resolve(captureDirectory, "staff-denied-dark-768.png"),
        fullPage: true,
      });
      s.faults.denyRead = "";
      await s.page
        .getByRole("button", { name: "Retry availability", exact: true })
        .click();
      await browserExpect(
        s.page.getByRole("button", { name: "Retry availability", exact: true }),
      ).toHaveCount(0);
      expect(
        s.requests.filter((request) => request.method !== "GET"),
      ).toHaveLength(0);
      expect(s.errors).toEqual([]);
    } finally {
      await s.context.close();
    }
  });

  it("preserves typed booking input on capacity conflict and clears the invalid slot", async () => {
    const s = await workspace();
    try {
      await s.open();
      await s.page
        .getByLabel("Service", { exact: true })
        .selectOption(s.service.id);
      await s.page.locator(".appointment-slot").first().click();
      await s.page
        .getByLabel("Your name", { exact: true })
        .fill("Waiting customer");
      await s.page
        .getByLabel("Notes", { exact: true })
        .fill("Keep this request");
      for (let index = 0; index < 2; index++)
        await s.runtime.appointmentCommand(
          actor("customer"),
          "appointment",
          undefined,
          "create",
          `fill-${index}`,
          {
            values: {
              scheduleId: s.schedule.id,
              customerName: `Other customer ${index}`,
            },
          },
        );
      await s.page
        .getByRole("button", { name: "Request appointment", exact: true })
        .click();
      await browserExpect(s.page.getByRole("alert")).toContainText("full");
      await browserExpect(
        s.page.getByRole("button", {
          name: "Request appointment",
          exact: true,
        }),
      ).toBeDisabled();
      await browserExpect(
        s.page.getByLabel("Your name", { exact: true }),
      ).toHaveValue("Waiting customer");
      await browserExpect(
        s.page.getByLabel("Notes", { exact: true }),
      ).toHaveValue("Keep this request");
      await browserExpect(
        s.page.getByLabel("Service", { exact: true }),
      ).toHaveValue(s.service.id);
      await browserExpect(
        s.page.locator(".appointment-slot[aria-pressed='true']"),
      ).toHaveCount(0);
      expect(
        (await s.store.list("appointment")).some(
          (row: any) => row.customerName === "Waiting customer",
        ),
      ).toBe(false);
      await s.page.screenshot({
        path: resolve(captureDirectory, "customer-conflict-390.png"),
        fullPage: true,
      });
    } finally {
      await s.context.close();
    }
  });

  it("never recreates an unresolved command automatically after full reload", async () => {
    const s = await workspace();
    try {
      await s.open();
      s.faults.loseResponse = "/api/appointment";
      await requestAppointment(s, "Reload review customer");
      await browserExpect(
        s.page.getByRole("button", { name: "Retry same request", exact: true }),
      ).toBeVisible();
      await s.page.reload();
      await browserExpect(savedCard(s, "Reload review customer")).toBeVisible();
      await browserExpect(
        s.page.getByRole("button", { name: "Retry same request", exact: true }),
      ).toHaveCount(0);
      expect(
        s.requests.filter((request) => request.method === "POST"),
      ).toHaveLength(1);
      expect(
        (await s.store.list("appointment")).filter(
          (row: any) => row.customerName === "Reload review customer",
        ),
      ).toHaveLength(1);
    } finally {
      await s.context.close();
    }
  });
  it("preserves template-like business names as literal display values", () => {
    const named = structuredClone(graph);
    named.metadata.name = "ICONS_JSON HEADER_CHANNEL CONFIG_JSON $&";
    expect(renderAppointmentWorkspace(named, profile, true)).toContain(
      `"name":${JSON.stringify(named.metadata.name)}`,
    );
  });
  it("lets staff filter status and reach appointments beyond the first twenty", async () => {
    const s = await workspace(1440);
    try {
      await s.runtime.appointmentSetupUpdate(
        actor("administrator"),
        "schedule",
        s.schedule.id,
        "raise-capacity",
        {
          expectedValues: {
            serviceId: s.service.id,
            startUtc: "2026-10-02T09:00:00.000Z",
            endUtc: "2026-10-02T09:30:00.000Z",
            timezone: "UTC",
            capacity: 2,
            status: "open",
          },
          values: {
            serviceId: s.service.id,
            startUtc: "2026-10-02T09:00:00.000Z",
            endUtc: "2026-10-02T09:30:00.000Z",
            timezone: "UTC",
            capacity: 30,
            status: "open",
          },
        },
      );
      let last: any;
      for (let index = 0; index < 22; index++)
        last = await s.runtime.appointmentCommand(
          actor("customer"),
          "appointment",
          undefined,
          "create",
          `many-${index}`,
          {
            values: {
              scheduleId: s.schedule.id,
              customerName: `Queue person ${index}`,
            },
          },
        );
      await s.open();
      await s.page.getByRole("combobox").first().selectOption("staff");
      await browserExpect(savedCard(s, "Queue person 21")).toHaveCount(0);
      await s.page
        .getByRole("button", { name: "Show more appointments", exact: true })
        .click();
      await browserExpect(
        savedCard(s, "Queue person 21").getByRole("heading", {
          name: "Planning session",
          exact: true,
        }),
      ).toBeVisible();
      await s.runtime.appointmentCommand(
        actor("staff"),
        "appointment",
        last.record?.id ?? last.id,
        "confirm",
        "confirm-last",
        { expectedVersion: 0 },
      );
      await s.page
        .getByRole("button", { name: "Refresh appointments", exact: true })
        .click();
      await s.page
        .getByLabel("Appointment status", { exact: true })
        .selectOption("confirmed");
      await browserExpect(
        s.page.locator(".appointment-records > li"),
      ).toHaveCount(1);
      await browserExpect(savedCard(s, "Queue person 21")).toBeVisible();
      await s.page
        .getByLabel("Appointment status", { exact: true })
        .selectOption("cancelled");
      await browserExpect(
        s.page.getByText("No appointments", { exact: false }).first(),
      ).toBeVisible();
    } finally {
      await s.context.close();
    }
  });
  it("creates a UTC schedule through visible controls and protects referenced time edits", async () => {
    const s = await workspace(1440, true, "Asia/Singapore");
    try {
      await s.open();
      await chooseAdministrator(s);
      await s.page
        .getByLabel("Schedule service", { exact: true })
        .selectOption(s.service.id);
      await s.page
        .getByLabel("Start time (UTC)", { exact: true })
        .fill("2026-10-05T09:00");
      await s.page
        .getByLabel("End time (UTC)", { exact: true })
        .fill("2026-10-05T09:30");
      await s.page
        .getByLabel("Timezone", { exact: true })
        .fill("Asia/Singapore");
      await s.page
        .getByRole("button", { name: "Save schedule", exact: true })
        .click();
      await browserExpect(s.page.getByRole("status")).toContainText(
        "Changes saved",
      );
      const expected = {
        serviceId: s.service.id,
        startUtc: "2026-10-05T09:00:00.000Z",
        endUtc: "2026-10-05T09:30:00.000Z",
        timezone: "Asia/Singapore",
        capacity: 1,
        status: "open",
      };
      expect(
        s.requests.filter((request) => request.method === "POST").at(-1)?.body,
      ).toEqual(expected);
      const slot = (await s.store.list("schedule")).find(
        (item: any) => item.startUtc === expected.startUtc,
      );
      await s.runtime.appointmentCommand(
        actor("customer"),
        "appointment",
        undefined,
        "create",
        "referenced-booking",
        {
          values: { scheduleId: slot.id, customerName: "Referenced schedule" },
        },
      );
      await s.page
        .getByLabel("Current schedule setup")
        .locator("article")
        .filter({ hasText: "2026-10-05" })
        .getByRole("button", { name: "Update schedule", exact: true })
        .click();
      await s.page
        .getByLabel("Start time (UTC)", { exact: true })
        .fill("2026-10-05T09:05");
      await s.page
        .getByRole("button", { name: "Save schedule update", exact: true })
        .click();
      await browserExpect(s.page.getByRole("alert")).toBeVisible();
      await browserExpect(
        s.page.getByLabel("Start time (UTC)", { exact: true }),
      ).toHaveValue("2026-10-05T09:05");
      expect(await s.store.find("schedule", slot.id)).toMatchObject(expected);
      await s.page
        .getByLabel("Start time (UTC)", { exact: true })
        .fill("2026-10-05T09:00");
      await s.page
        .getByLabel("Schedule availability", { exact: true })
        .selectOption("closed");
      await s.page
        .getByRole("button", { name: "Save schedule update", exact: true })
        .click();
      await browserExpect(s.page.getByRole("alert")).toHaveCount(0);
      await browserExpect(s.page.getByRole("combobox").first()).toBeEnabled();
      expect(await s.store.find("schedule", slot.id)).toMatchObject({
        ...expected,
        status: "closed",
      });
      expect(
        (await s.store.list("appointment")).find(
          (item: any) => item.customerName === "Referenced schedule",
        ),
      ).toMatchObject({ status: "requested", scheduleId: slot.id });
    } finally {
      await s.context.close();
    }
  });

  it("keeps an uncertain setup create frozen and reuses its exact flat command once", async () => {
    const s = await workspace(1440);
    try {
      await s.open();
      await chooseAdministrator(s);
      s.faults.loseResponse = "/api/service";
      await s.page
        .getByLabel("Service name", { exact: true })
        .fill("Recovered service");
      await s.page.getByLabel("Duration minutes", { exact: true }).fill("45");
      await s.page
        .getByRole("button", { name: "Save service", exact: true })
        .click();
      await browserExpect(s.page.getByRole("alert")).toContainText("uncertain");
      await browserExpect(
        s.page.getByLabel("Service name", { exact: true }),
      ).toBeDisabled();
      await browserExpect(s.page.getByRole("combobox").first()).toBeDisabled();
      await s.page
        .getByRole("button", { name: "Retry same request", exact: true })
        .click();
      await browserExpect(
        s.page
          .getByLabel("Current service setup")
          .getByText("Recovered service", { exact: true }),
      ).toBeVisible();
      const commands = s.requests.filter(
        (request) =>
          request.method === "POST" && request.path === "/api/service",
      );
      expect(commands).toHaveLength(2);
      expect(commands[1]).toEqual(commands[0]);
      expect(
        (await s.store.list("service")).filter(
          (row: any) => row.name === "Recovered service",
        ),
      ).toHaveLength(1);
      await browserExpect(s.page.getByRole("combobox").first()).toBeEnabled();
    } finally {
      await s.context.close();
    }
  });

  it("recovers the retained availability window from a new authenticated clock without losing form input", async () => {
    const s = await workspace();
    try {
      await s.open();
      await s.page
        .getByLabel("Service", { exact: true })
        .selectOption(s.service.id);
      await s.page.locator(".appointment-slot").first().click();
      await s.page
        .getByLabel("Your name", { exact: true })
        .fill("Retained name");
      await s.page.getByLabel("Notes", { exact: true }).fill("Retained notes");
      const before = new URL(
        s.requests.find((request) =>
          request.path.startsWith("/api/appointment-availability"),
        )!.path,
        "https://appointment.test",
      );
      s.faults.dateHeader = false;
      await s.page
        .getByRole("button", { name: "Refresh appointments", exact: true })
        .click();
      await browserExpect(
        s.page.getByRole("button", { name: "Retry availability", exact: true }),
      ).toBeVisible();
      await browserExpect(
        s.page.getByRole("button", {
          name: "Request appointment",
          exact: true,
        }),
      ).toBeDisabled();
      s.faults.dateHeader = true;
      s.faults.now = "2026-10-01T03:00:00.000Z";
      const offset = s.requests.length;
      await s.page
        .getByRole("button", { name: "Retry availability", exact: true })
        .click();
      await browserExpect(
        s.page.getByRole("button", {
          name: "Request appointment",
          exact: true,
        }),
      ).toBeEnabled();
      const after = s.requests.slice(offset);
      expect(after[0]?.path).toBe("/api/appointment");
      const query = new URL(
        after.find((request) =>
          request.path.startsWith("/api/appointment-availability"),
        )!.path,
        "https://appointment.test",
      );
      expect(query.searchParams.get("from")).toBe(
        before.searchParams.get("from"),
      );
      expect(query.searchParams.get("to")).toBe(before.searchParams.get("to"));
      expect(query.searchParams.get("offset")).toBe("0");
      await browserExpect(
        s.page.getByLabel("Your name", { exact: true }),
      ).toHaveValue("Retained name");
      await browserExpect(
        s.page.getByLabel("Notes", { exact: true }),
      ).toHaveValue("Retained notes");
    } finally {
      await s.context.close();
    }
  });

  it("does not let a late customer read replace a newer staff view", async () => {
    const s = await workspace(768);
    let release!: () => void, observed!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const dispatched = new Promise<void>((resolve) => {
      observed = resolve;
    });
    let first = true;
    s.faults.afterDispatch = async (request) => {
      if (
        first &&
        request.method === "GET" &&
        request.path === "/api/appointment" &&
        request.role === "customer"
      ) {
        first = false;
        observed();
        await held;
      }
    };
    try {
      await s.open();
      await dispatched;
      await s.runtime.appointmentCommand(
        actor("customer"),
        "appointment",
        undefined,
        "create",
        "new-staff-record",
        {
          values: {
            scheduleId: s.schedule.id,
            customerName: "Newer staff record",
          },
        },
      );
      await s.page.getByRole("combobox").first().selectOption("staff");
      await browserExpect(savedCard(s, "Newer staff record")).toBeVisible();
      const response = s.page.waitForResponse(
        (result: any) =>
          result.url().endsWith("/api/appointment") &&
          result.request().headers()["x-factory-fixture-session"] ===
            "fixture-session-customer",
      );
      release();
      await response;
      await s.page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
      await browserExpect(
        savedCard(s, "Newer staff record").getByRole("button", {
          name: "Confirm appointment",
          exact: true,
        }),
      ).toBeVisible();
      await browserExpect(s.page.getByRole("combobox").first()).toHaveValue(
        "staff",
      );
      expect(s.errors).toEqual([]);
    } finally {
      release();
      await s.context.close();
    }
  });

  it("typechecks the actual emitted frontend with strict React types", () => {
    const file = resolve(
      root,
      "apps/workbench/appointment-generated-typecheck.tsx",
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
    host.readFile = (name) =>
      name === file ? files.get("web/app/page-runtime.tsx")! : read(name);
    host.fileExists = (name) => name === file || exists(name);
    expect(
      ts
        .getPreEmitDiagnostics(ts.createProgram([file], options, host))
        .map((diagnostic) =>
          ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
        ),
    ).toEqual([]);
  });

  it("completes the visible staff chain and refreshes already-open immutable history", async () => {
    const s = await workspace(1440);
    try {
      const alternate = await s.runtime.appointmentSetupCreate(
        actor("administrator"),
        "schedule",
        "alternate-slot",
        {
          serviceId: s.service.id,
          startUtc: "2026-10-03T10:00:00.000Z",
          endUtc: "2026-10-03T10:30:00.000Z",
          timezone: "Asia/Singapore",
          capacity: 2,
          status: "open",
        },
      );
      await s.open();
      await requestAppointment(s, "Jordan Park");
      await s.page.getByRole("combobox").first().selectOption("staff");
      const card = savedCard(s, "Jordan Park");
      await card
        .getByRole("button", { name: "Confirm appointment", exact: true })
        .click();
      await browserExpect(card.locator(".appointment-status")).toHaveText(
        "confirmed",
      );
      await card
        .locator("summary")
        .filter({ hasText: "Appointment history" })
        .click();
      await browserExpect(
        card.locator(".appointment-history strong"),
      ).toHaveText(["Requested", "Confirmed"]);
      await card
        .locator("summary")
        .filter({ hasText: "Manage appointment" })
        .click();
      await card
        .getByLabel("Reschedule Jordan Park", { exact: true })
        .selectOption(alternate.id);
      await card
        .getByRole("button", { name: "Reschedule appointment", exact: true })
        .click();
      await browserExpect(card.locator(".appointment-status")).toHaveText(
        "requested",
      );
      await card
        .getByRole("button", { name: "Confirm appointment", exact: true })
        .click();
      await browserExpect(card.locator(".appointment-status")).toHaveText(
        "confirmed",
      );
      await card
        .locator("summary")
        .filter({ hasText: "Cancel appointment" })
        .click();
      await card
        .getByLabel("Cancellation reason for Jordan Park")
        .fill("Plans changed");
      await card
        .getByRole("button", { name: "Cancel appointment", exact: true })
        .click();
      await browserExpect(card.locator(".appointment-status")).toHaveText(
        "cancelled",
      );
      await browserExpect(
        card.locator(".appointment-history strong"),
      ).toHaveText([
        "Requested",
        "Confirmed",
        "Rescheduled",
        "Confirmed",
        "Cancelled",
      ]);
      await browserExpect(
        card.getByText("Plans changed", { exact: true }),
      ).toBeVisible();
      await browserExpect(
        card.getByRole("button", {
          name: /Confirm|Reschedule|Cancel appointment/,
        }),
      ).toHaveCount(0);
      const row = (await s.store.list("appointment")).find(
        (item: any) => item.customerName === "Jordan Park",
      );
      expect(row).toMatchObject({
        scheduleId: alternate.id,
        status: "cancelled",
        version: 4,
        cancellationReason: "Plans changed",
      });
      expect(
        s.requests
          .filter(
            (request) =>
              request.method === "POST" && request.path.includes("/events/"),
          )
          .map((request) => request.body),
      ).toEqual([
        { expectedVersion: 0 },
        { expectedVersion: 1, scheduleId: alternate.id },
        { expectedVersion: 2 },
        { expectedVersion: 3, cancellationReason: "Plans changed" },
      ]);
      expect(s.errors).toEqual([]);
    } finally {
      await s.context.close();
    }
  });

  it("retries a committed lost booking response with identical intent and refreshes current state", async () => {
    const s = await workspace();
    try {
      await s.open();
      s.faults.loseResponse = "/api/appointment";
      await requestAppointment(s, "Lost response customer");
      await browserExpect(s.page.getByRole("alert")).toContainText("uncertain");
      await browserExpect(s.page.getByRole("combobox").first()).toBeDisabled();
      await browserExpect(
        s.page.getByLabel("Your name", { exact: true }),
      ).toBeDisabled();
      const row = (await s.store.list("appointment")).find(
        (item: any) => item.customerName === "Lost response customer",
      );
      expect(row).toBeDefined();
      await s.runtime.appointmentCommand(
        actor("staff"),
        "appointment",
        row.id,
        "confirm",
        "confirm-before-replay",
        { expectedVersion: 0 },
      );
      await s.page
        .getByRole("button", { name: "Retry same request", exact: true })
        .click();
      const card = savedCard(s, "Lost response customer");
      await browserExpect(card.locator(".appointment-status")).toHaveText(
        "confirmed",
      );
      await browserExpect(s.page.getByRole("combobox").first()).toBeEnabled();
      const commands = s.requests.filter(
        (request) =>
          request.method === "POST" && request.path === "/api/appointment",
      );
      expect(commands).toHaveLength(2);
      expect(commands[1]).toEqual(commands[0]);
      expect(
        (await s.store.list("appointment")).filter(
          (item: any) => item.customerName === "Lost response customer",
        ),
      ).toHaveLength(1);
      await browserExpect(
        card.locator("summary").filter({ hasText: "Cancel appointment" }),
      ).toHaveCount(0);
      await s.page.reload();
      await browserExpect(
        savedCard(s, "Lost response customer").locator(".appointment-status"),
      ).toHaveText("confirmed");
      expect(
        s.requests.filter((request) => request.method === "POST"),
      ).toHaveLength(2);
      expect(s.errors).toEqual([]);
    } finally {
      await s.context.close();
    }
  });

  it("allows an administrator to cancel an active appointment with its reason", async () => {
    const s = await workspace(1440);
    try {
      await s.open();
      await requestAppointment(s, "Admin cancellation");
      await s.page.getByRole("combobox").first().selectOption("administrator");
      const card = savedCard(s, "Admin cancellation");
      await card
        .locator("summary")
        .filter({ hasText: "Cancel appointment" })
        .click();
      await card
        .getByLabel("Cancellation reason for Admin cancellation")
        .fill("Created in error");
      await card
        .getByRole("button", { name: "Cancel appointment", exact: true })
        .click();
      await browserExpect(card.locator(".appointment-status")).toHaveText(
        "cancelled",
      );
      expect(
        s.requests.filter((request) => request.method === "POST").at(-1),
      ).toMatchObject({
        role: "administrator",
        body: { expectedVersion: 0, cancellationReason: "Created in error" },
      });
    } finally {
      await s.context.close();
    }
  });

  it("preserves exact UTC timestamps when a non-UTC administrator changes only capacity", async () => {
    const s = await workspace(1440, true, "Asia/Singapore");
    try {
      const before = {
        serviceId: s.service.id,
        startUtc: "2026-10-04T09:00:37.125Z",
        endUtc: "2026-10-04T09:30:37.125Z",
        timezone: "Asia/Singapore",
        capacity: 2,
        status: "open",
      };
      const slot = await s.runtime.appointmentSetupCreate(
        actor("administrator"),
        "schedule",
        "fractional-slot",
        before,
      );
      await s.open();
      await s.page.getByRole("combobox").first().selectOption("administrator");
      await s.page
        .getByLabel("Current schedule setup")
        .locator("article")
        .filter({ hasText: "2026-10-04" })
        .getByRole("button", { name: "Update schedule", exact: true })
        .click();
      await browserExpect(
        s.page.getByLabel("Start time (UTC)", { exact: true }),
      ).toHaveValue("2026-10-04T09:00");
      await s.page.getByLabel("Capacity", { exact: true }).fill("3");
      await s.page
        .getByRole("button", { name: "Save schedule update", exact: true })
        .click();
      await browserExpect(s.page.getByRole("status")).toContainText(
        "Changes saved",
      );
      expect(
        s.requests.filter((request) => request.method === "PATCH").at(-1),
      ).toMatchObject({
        path: `/api/schedule/${slot.id}`,
        body: { expectedValues: before, values: { ...before, capacity: 3 } },
      });
      expect(await s.store.find("schedule", slot.id)).toMatchObject({
        ...before,
        capacity: 3,
      });
    } finally {
      await s.context.close();
    }
  });

  it("selects the V2 appointment presentation and its pinned icon notice only for the accepted profile", () => {
    expect(files.get("web/app/page-runtime.tsx")).toContain(
      "appointment-workspace-presentation@1.0.0",
    );
    expect(files.get("web/app/globals.css")).toContain(".appointment-v1");
    expect(files.get("THIRD_PARTY_NOTICES.md")).toContain("lucide-static");
  });

  it("lets a phone customer select a named slot and persist the exact booking envelope", async () => {
    const s = await workspace();
    try {
      await s.open();
      await s.page
        .getByLabel("Service", { exact: true })
        .selectOption(s.service.id);
      await s.page.locator(".appointment-slot").first().click();
      await s.page.getByLabel("Your name", { exact: true }).fill("Alex Morgan");
      await s.page
        .getByLabel("Notes", { exact: true })
        .fill("Discuss the next project");
      await s.page
        .getByRole("button", { name: "Request appointment", exact: true })
        .click();
      await browserExpect(s.page.getByRole("status")).toContainText(
        "Appointment requested",
      );
      const mutation = s.requests.find((request) => request.method === "POST");
      expect(mutation?.body).toEqual({
        values: {
          scheduleId: s.schedule.id,
          customerName: "Alex Morgan",
          notes: "Discuss the next project",
        },
      });
      expect(mutation?.key).toMatch(/^[A-Za-z0-9._:-]{1,128}$/);
      expect(
        (await s.store.list("appointment")).some(
          (record: any) => record.customerName === "Alex Morgan",
        ),
      ).toBe(true);
      expect(
        s.requests.findIndex((request) => request.path === "/api/appointment"),
      ).toBeLessThan(
        s.requests.findIndex((request) =>
          request.path.startsWith("/api/appointment-availability"),
        ),
      );
      await browserExpect(
        s.page.getByRole("heading", {
          name: "My demo appointments",
          exact: true,
        }),
      ).toBeVisible();
      await browserExpect(
        s.page.getByRole("button", {
          name: "My demo appointments",
          exact: true,
        }),
      ).toBeEnabled();
      expect(s.errors).toEqual([]);
      expect(
        await s.page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          width: window.innerWidth,
          grid: getComputedStyle(document.querySelector(".appointment-v1")!)
            .gridTemplateColumns,
        })),
      ).toEqual({ scrollWidth: 390, width: 390, grid: "390px" });
      await s.page.screenshot({
        path: resolve(captureDirectory, "customer-390.png"),
        fullPage: true,
      });
    } finally {
      await s.context.close();
    }
  });

  it("keeps booking unavailable when the authenticated list has no valid server Date", async () => {
    const s = await workspace(390, false);
    try {
      await s.open();
      await browserExpect(
        s.page.getByRole("button", { name: "Retry availability", exact: true }),
      ).toBeVisible();
      await browserExpect(
        s.page.getByRole("button", {
          name: "Request appointment",
          exact: true,
        }),
      ).toBeDisabled();
      expect(
        s.requests.some((request) =>
          request.path.startsWith("/api/appointment-availability"),
        ),
      ).toBe(false);
      expect(s.errors).toEqual([]);
    } finally {
      await s.context.close();
    }
  });

  it("lets staff confirm a requested appointment from its desktop work list", async () => {
    const s = await workspace(1440);
    try {
      await s.open();
      await s.page
        .getByLabel("Service", { exact: true })
        .selectOption(s.service.id);
      await s.page.locator(".appointment-slot").first().click();
      await s.page.getByLabel("Your name", { exact: true }).fill("Taylor Reed");
      await s.page
        .getByRole("button", { name: "Request appointment", exact: true })
        .click();
      await s.page.getByRole("combobox").first().selectOption("staff");
      const confirm = s.page
        .getByText("Taylor Reed", { exact: true })
        .locator("xpath=ancestor::li")
        .getByRole("button", { name: "Confirm appointment", exact: true });
      await browserExpect(confirm).toBeVisible();
      await confirm.click();
      await browserExpect(
        s.page.getByText("confirmed", { exact: true }).first(),
      ).toBeVisible();
      const mutation = s.requests
        .filter((request) => request.method === "POST")
        .at(-1);
      expect(mutation).toMatchObject({
        path: expect.stringMatching(
          /^\/api\/appointment\/[^/]+\/events\/confirm$/,
        ),
        body: { expectedVersion: 0 },
        role: "staff",
      });
      expect(s.errors).toEqual([]);
      await s.page.screenshot({
        path: resolve(captureDirectory, "staff-1440.png"),
        fullPage: true,
      });
    } finally {
      await s.context.close();
    }
  });

  it("lets an administrator create a named service with the flat setup envelope", async () => {
    const s = await workspace(1440);
    try {
      await s.open();
      await s.page.getByRole("combobox").first().selectOption("administrator");
      await s.page
        .getByLabel("Service name", { exact: true })
        .fill("Design review");
      await s.page.getByLabel("Duration minutes", { exact: true }).fill("45");
      await s.page
        .getByRole("button", { name: "Save service", exact: true })
        .click();
      const mutation = s.requests
        .filter(
          (request) =>
            request.method === "POST" && request.path === "/api/service",
        )
        .at(-1);
      expect(mutation?.body).toEqual({
        name: "Design review",
        durationMinutes: 45,
        active: true,
      });
      expect(mutation?.key).toMatch(/^[A-Za-z0-9._:-]{1,128}$/);
      await browserExpect(
        s.page
          .getByLabel("Current service setup")
          .getByText("Design review", { exact: true }),
      ).toBeVisible();
      expect(s.errors).toEqual([]);
      await s.page.screenshot({
        path: resolve(captureDirectory, "administrator-1440.png"),
        fullPage: true,
      });
    } finally {
      await s.context.close();
    }
  });

  it("sends a complete expected-values setup patch after an administrator edits a service", async () => {
    const s = await workspace(1440);
    try {
      await s.open();
      await s.page.getByRole("combobox").first().selectOption("administrator");
      await s.page
        .getByLabel("Current service setup")
        .getByText("Planning session", { exact: true })
        .locator("xpath=ancestor::article")
        .getByRole("button", { name: "Update service", exact: true })
        .click();
      await s.page
        .getByLabel("Service name", { exact: true })
        .fill("Planning workshop");
      await s.page
        .getByRole("button", { name: "Save service update", exact: true })
        .click();
      const mutation = s.requests
        .filter(
          (request) =>
            request.method === "PATCH" &&
            request.path === `/api/service/${s.service.id}`,
        )
        .at(-1);
      expect(mutation?.body).toEqual({
        expectedValues: {
          name: "Planning session",
          durationMinutes: 30,
          active: true,
        },
        values: {
          name: "Planning workshop",
          durationMinutes: 30,
          active: true,
        },
      });
      expect(mutation?.key).toMatch(/^[A-Za-z0-9._:-]{1,128}$/);
      await browserExpect(
        s.page
          .getByLabel("Current service setup")
          .getByText("Planning workshop", { exact: true }),
      ).toBeVisible();
      expect(s.errors).toEqual([]);
    } finally {
      await s.context.close();
    }
  });

  it("keeps an administrator's desired service edit beside refreshed current values after a definite conflict", async () => {
    const s = await workspace(1440);
    try {
      await s.open();
      await s.page.getByRole("combobox").first().selectOption("administrator");
      await s.page
        .getByLabel("Current service setup")
        .getByText("Planning session", { exact: true })
        .locator("xpath=ancestor::article")
        .getByRole("button", { name: "Update service", exact: true })
        .click();
      await s.runtime.appointmentSetupUpdate(
        {
          role: "administrator",
          scope: "fixture:fixture-session-administrator",
          graphHash,
        },
        "service",
        s.service.id,
        "external-service-change",
        {
          expectedValues: {
            name: "Planning session",
            durationMinutes: 30,
            active: true,
          },
          values: {
            name: "Current planning session",
            durationMinutes: 30,
            active: true,
          },
        },
      );
      await s.page
        .getByLabel("Service name", { exact: true })
        .fill("Desired planning workshop");
      await s.page
        .getByRole("button", { name: "Save service update", exact: true })
        .click();
      await browserExpect(s.page.getByRole("alert")).toContainText(
        "Latest saved values are shown below",
      );
      await browserExpect(
        s.page.getByLabel("Service name", { exact: true }),
      ).toHaveValue("Desired planning workshop");
      await browserExpect(
        s.page
          .getByLabel("Current service setup")
          .getByText("Current planning session", { exact: true }),
      ).toBeVisible();
      await s.page
        .getByRole("button", { name: "Save service update", exact: true })
        .click();
      const retry = s.requests
        .filter(
          (request) =>
            request.method === "PATCH" &&
            request.path === `/api/service/${s.service.id}`,
        )
        .at(-1);
      expect(retry?.body).toEqual({
        expectedValues: {
          name: "Current planning session",
          durationMinutes: 30,
          active: true,
        },
        values: {
          name: "Desired planning workshop",
          durationMinutes: 30,
          active: true,
        },
      });
      await browserExpect(
        s.page
          .getByLabel("Current service setup")
          .getByText("Desired planning workshop", { exact: true }),
      ).toBeVisible();
      expect(s.errors).toEqual([]);
    } finally {
      await s.context.close();
    }
  });
});
