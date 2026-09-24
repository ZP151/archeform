import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { controlPlaneUrl, stopPreview } from "./helpers/restaurant-delivery";
import {
  consumerEntryActions,
  consumerSourcePaths,
  ownedResources,
  ready,
  restartOwnedApi,
  type Json,
  type OwnedPreview,
} from "./helpers/content-directory";
import { deliverDirectory } from "./helpers/content-directory";
import {
  applicationGraphSchema,
  hashApplicationGraph,
} from "../packages/graph/dist/index.js";
import {
  createCapabilityCompositionLock,
  type CapabilityCompositionLockV1,
} from "../packages/capabilities/dist/index.js";

test.describe.configure({ mode: "serial", retries: 0 });

const appointmentSelection = {
  definitionKey: "appointment-booking-v2",
  requirementIdPrefix: "appointment-e2e",
  title: "Appointment Booking",
  outcome:
    "Book a named service at an available time and let staff manage the resulting appointment.",
  brief:
    "Build an appointment booking application. Customers choose a service and an available time, staff confirm or reschedule appointments, and administrators manage services, schedules, and cancellations.",
} as const;

type RecordValue = Record<string, unknown>;
type SavedCommand = {
  readonly method: string;
  readonly path: string;
  readonly body: string;
  readonly key: string;
  readonly role: string;
};

function record(value: unknown): RecordValue {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Expected an object response.");
  return value as RecordValue;
}

function digest(value: unknown): string {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")}`;
}

function fixtureHeaders(role: "customer" | "staff" | "administrator") {
  return { "x-factory-fixture-session": `fixture-session-${role}` };
}

async function getJson(
  request: APIRequestContext,
  origin: string,
  path: string,
  role: "customer" | "staff" | "administrator",
) {
  const response = await request.get(origin + path, {
    headers: fixtureHeaders(role),
  });
  expect(response.ok()).toBe(true);
  return { response, body: await response.json() };
}

function identity(value: unknown): string {
  expect(typeof value).toBe("string");
  expect(value).toMatch(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u);
  return value as string;
}

async function publishedSnapshot(
  request: APIRequestContext,
  compilationId: string,
  graphId: string,
) {
  const response = await request.get(
    controlPlaneUrl("/compilations/" + encodeURIComponent(compilationId)),
  );
  expect(response.ok()).toBe(true);
  const compilation = record(await response.json());
  expect(identity(compilation.id)).toBe(compilationId);
  const revisionId = identity(compilation.publishedRevisionId);
  // The Compilation controller returns its model and artifacts, not its Published relation.
  const revisions = await request.get(
    controlPlaneUrl(
      "/application-graphs/" +
        encodeURIComponent(identity(graphId)) +
        "/published-revisions",
    ),
  );
  expect(revisions.ok()).toBe(true);
  const listed: unknown = await revisions.json();
  expect(Array.isArray(listed)).toBe(true);
  const revision = (listed as RecordValue[]).find(
    (value) => value.id === revisionId,
  );
  expect(revision).toBeDefined();
  expect(identity(revision!.applicationGraphId)).toBe(graphId);
  const graph = applicationGraphSchema.parse(revision!.graph);
  const lock = record(
    revision!.compositionLock,
  ) as unknown as CapabilityCompositionLockV1;
  const graphHash = hashApplicationGraph(graph);
  expect(revision!.graphHash).toBe(graphHash);
  expect(compilation.inputGraphHash).toBe(graphHash);
  expect(lock.applicationGraphChecksum).toBe(graphHash);
  const rebuiltLock = createCapabilityCompositionLock({
    graphChecksum: graphHash,
    selections: lock.packages,
  });
  expect(revision!.compositionLockHash).toBe(rebuiltLock.lockDigest);
  expect(lock).toEqual(rebuiltLock);
  expect(Array.isArray(compilation.artifacts)).toBe(true);
  expect((compilation.artifacts as unknown[]).length).toBeGreaterThan(0);
  return {
    id: revisionId,
    graphHash,
    compositionLockHash: rebuiltLock.lockDigest,
    graph,
    lock,
    compilation,
  };
}

function futureUtc(date: string, offsetHours: number): string {
  const millis = Date.parse(date);
  expect(Number.isFinite(millis)).toBe(true);
  return new Date(millis + offsetHours * 3_600_000).toISOString().slice(0, 16);
}

function exactServerDate(value: string | null): string {
  expect(value).not.toBeNull();
  expect(Number.isFinite(Date.parse(value!))).toBe(true);
  expect(new Date(value!).toUTCString()).toBe(value);
  return new Date(value!).toISOString();
}

test("Appointment Booking completes a UI-led immutable consumer delivery", async ({
  page,
  context,
  request,
}, testInfo) => {
  test.setTimeout(1_800_000);
  context.setDefaultTimeout(45_000);
  expect(process.env.FACTORY_E2E_ISOLATED).toBe("1");
  const factoryProject = process.env.FACTORY_E2E_FACTORY_PROJECT!;
  expect(factoryProject).toMatch(/^factory-t10-[a-z0-9-]+$/u);
  expect(process.env.FACTORY_E2E_CONTROL_PLANE_URL).toMatch(
    /^http:\/\/127\.0\.0\.1:\d+$/u,
  );
  expect(testInfo.project.use.baseURL).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/u);

  const attempt = randomUUID();
  const output = resolve(
    "docs/acceptance/evidence/accepted-family-consumer-delivery/appointment",
    "attempt-" + attempt,
  );
  await mkdir(output, { recursive: true });
  const startedAt = Date.now();
  let activePhase = "delivery",
    phaseStartedAt = startedAt;
  const phases: { name: string; elapsedMs: number }[] = [];
  const evidence: Json = {
    attempt,
    definitionKey: appointmentSelection.definitionKey,
    runtimeFamily: "appointment-booking/v2",
    scope: "isolated-local-fixture-session",
    modelCalls: 0,
    outcome: "running",
    phases,
  };
  const phase = (name: string) => {
    phases.push({ name: activePhase, elapsedMs: Date.now() - phaseStartedAt });
    activePhase = name;
    phaseStartedAt = Date.now();
  };
  let preview: OwnedPreview | undefined;
  let compilationId: string | undefined;
  let generated: Page | undefined;
  let businessError: unknown;
  const observedActions: string[] = [];
  await context.exposeBinding(
    "__recordAppointmentAction",
    (_source, category: string) => {
      expect(["business", "navigation", "retry", "other"]).toContain(category);
      expect(observedActions.length).toBeLessThan(1000);
      observedActions.push(category);
    },
  );
  await context.addInitScript(() => {
    const report = (category: string) =>
      void (
        window as unknown as {
          __recordAppointmentAction: (category: string) => Promise<void>;
        }
      ).__recordAppointmentAction(category);
    document.addEventListener(
      "click",
      (event) => {
        if (!(event.target instanceof Element)) return;
        const control = event.target.closest("button, summary, a");
        if (!control?.closest("main.appointment-v1")) return;
        const label = (
          control.getAttribute("aria-label") ??
          control.textContent ??
          ""
        ).trim();
        report(
          /^Retry /u.test(label)
            ? "retry"
            : /^(Save |Request appointment$|Confirm appointment$|Reschedule appointment$|Cancel appointment$)/u.test(
                  label,
                ) && control.tagName !== "SUMMARY"
              ? "business"
              : control.tagName === "SUMMARY" ||
                  control.closest("nav") ||
                  /^(Previous week|Next week|More available times|Refresh appointments)$/u.test(
                    label,
                  )
                ? "navigation"
                : "other",
        );
      },
      true,
    );
    document.addEventListener(
      "change",
      (event) => {
        if (
          event.target instanceof HTMLSelectElement &&
          event.target.closest(".appointment-role-strip")
        )
          report("navigation");
      },
      true,
    );
  });

  const capture = async (name: string, widths = [390, 768, 1440]) => {
    for (const width of widths) {
      await generated!.setViewportSize({ width, height: 844 });
      await expect(generated!.locator("main.appointment-v1")).toBeVisible();
      const geometry = await generated!.evaluate(() => {
        const root = document.querySelector("main.appointment-v1")!;
        const controls = [
          ...root.querySelectorAll<HTMLElement>(
            "button, input, select, textarea, summary, a",
          ),
        ].filter((node) => {
          const box = node.getBoundingClientRect();
          return box.width > 0 && box.height > 0;
        });
        return {
          width: innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          icons: root.querySelectorAll(".appointment-icon svg").length,
          undersized: controls.filter((node) => {
            if (node instanceof HTMLInputElement && node.type === "checkbox")
              return false;
            const box = node.getBoundingClientRect();
            return box.width < 43.5 || box.height < 43.5;
          }).length,
          checkboxLabels: [
            ...root.querySelectorAll<HTMLInputElement>(
              'input[type="checkbox"]',
            ),
          ].every((node) => {
            const label = node.closest("label")?.getBoundingClientRect();
            return !!label && label.width >= 43.5 && label.height >= 43.5;
          }),
          disclaimer: root.querySelector(".appointment-demo-note")?.textContent,
        };
      });
      expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.width + 1);
      expect(geometry.icons).toBeGreaterThan(0);
      expect(geometry.undersized).toBe(0);
      expect(geometry.checkboxLabels).toBe(true);
      expect(geometry.disclaimer).toContain("Shared demo data");
      await generated!.screenshot({
        path: resolve(output, `${name}-${width}.png`),
        fullPage: true,
      });
    }
  };
  const setRole = async (role: "customer" | "staff" | "administrator") => {
    await generated!
      .getByLabel("Demo role", { exact: true })
      .selectOption(role);
    await expect(generated!.locator("main.appointment-v1")).toHaveAttribute(
      "data-role",
      role,
    );
  };
  const clickSaved = async (
    target: ReturnType<Page["getByRole"]>,
    method: "POST" | "PATCH",
    pathname: RegExp,
  ) => {
    const saved = generated!.waitForResponse(
      (response) =>
        response.request().method() === method &&
        pathname.test(new URL(response.url()).pathname),
    );
    await target.click();
    const response = await saved;
    expect(response.status()).toBe(method === "POST" ? 201 : 200);
    const outgoing = response.request();
    const key = outgoing.headers()["x-factory-idempotency-key"];
    expect(key).toMatch(/^[0-9a-f-]{36}$/iu);
    return {
      value: record(await response.json()),
      command: {
        method,
        path: new URL(response.url()).pathname,
        body: outgoing.postData()!,
        key,
        role: outgoing.headers()["x-factory-fixture-session"]!,
      } satisfies SavedCommand,
    };
  };
  const appointmentRow = (customer: string) =>
    generated!
      .locator(".appointment-records > li")
      .filter({ hasText: customer });
  const action = async (
    row: ReturnType<typeof appointmentRow>,
    operation: "confirm" | "reschedule" | "cancel",
  ) => {
    const label = {
      confirm: "Confirm appointment",
      reschedule: "Reschedule appointment",
      cancel: "Cancel appointment",
    }[operation];
    const saved = generated!.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname.endsWith(`/events/${operation}`),
    );
    await row.getByRole("button", { name: label, exact: true }).click();
    const response = await saved;
    expect(response.status()).toBe(200);
    expect(new URL(response.url()).pathname).toContain(`/events/${operation}`);
    const outgoing = response.request();
    return {
      value: record(await response.json()),
      command: {
        method: outgoing.method(),
        path: new URL(response.url()).pathname,
        body: outgoing.postData()!,
        key: outgoing.headers()["x-factory-idempotency-key"]!,
        role: outgoing.headers()["x-factory-fixture-session"]!,
      } satisfies SavedCommand,
    };
  };

  try {
    const sourcePaths = [
      ...new Set([
        ...consumerSourcePaths,
        "docs/adr/adr-0081-appointment-consumer-workspace.md",
        "docs/adr/adr-0082-appointment-administrator-setup-updates.md",
        "packages/compiler/src/appointment-workspace-presentation.ts",
        "packages/compiler/src/appointment-consumer-read.ts",
        "packages/compiler/src/appointment-administrator-setup.ts",
        "packages/compiler/src/appointment-compilation-admission.ts",
        "packages/compiler/src/index.ts",
        "packages/adapters/src/requirements/definitions/product-definitions.v1.json",
        "packages/adapters/src/requirements/definition-selection-catalogue.ts",
        "packages/adapters/src/requirements/definition-family-registry.ts",
        "packages/adapters/src/requirements/openai-interpreter.ts",
        "packages/capabilities/src/plan-alternatives.ts",
        "apps/workbench/lib/product-journey/consumer-family.ts",
        "apps/workbench/lib/product-journey/use-consumer-generation.ts",
        "e2e/appointment-booking.spec.ts",
        "e2e/helpers/content-directory.ts",
        "e2e/helpers/restaurant-delivery.ts",
      ]),
    ];
    evidence.sourceIdentities = Object.fromEntries(
      await Promise.all(
        sourcePaths.map(async (path) => [
          path,
          "sha256:" +
            createHash("sha256")
              .update(await readFile(path))
              .digest("hex"),
        ]),
      ),
    );
    expect(
      record(evidence.sourceIdentities)[
        "docs/adr/adr-0081-appointment-consumer-workspace.md"
      ],
    ).toBe(
      "sha256:65f867c7afeeefc892b8493e508d86d5d212302fcc247e927843ce05b6672adc",
    );
    expect(
      record(evidence.sourceIdentities)[
        "docs/adr/adr-0082-appointment-administrator-setup-updates.md"
      ],
    ).toBe(
      "sha256:5734bacdd01d4b27475ea861ed94f97011191a587eddfe73ad68e8900473a7d9",
    );
    phase("create-product");
    const delivery = await deliverDirectory(
      page,
      request,
      evidence,
      phase,
      (id, owned) => {
        compilationId = id;
        if (owned) preview = owned;
      },
      appointmentSelection,
    );
    preview = delivery;
    const origin = preview.previewUrl!;
    const graphId = identity(record(evidence.applied).applicationGraphId);
    const published = await publishedSnapshot(
      request,
      identity(compilationId),
      graphId,
    );
    evidence.publishedBeforeBusinessActivity = {
      id: published.id,
      graphHash: published.graphHash,
      compositionLockHash: published.compositionLockHash,
      snapshotDigest: digest(published),
    };

    let remoteRequests = 0;
    await context.route("**/*", async (route) => {
      if (route.request().frame().page() === page) return route.continue();
      const url = new URL(route.request().url());
      if (
        ["http:", "https:"].includes(url.protocol) &&
        url.origin !== new URL(origin).origin
      ) {
        remoteRequests++;
        return route.abort();
      }
      return route.continue();
    });
    let openAppActions = 0;
    page.on("popup", () => {
      openAppActions++;
    });
    [generated] = await Promise.all([
      context.waitForEvent("page"),
      page.getByRole("link", { name: "Open local app", exact: true }).click(),
    ]);
    await expect(generated.locator("main.appointment-v1")).toBeVisible({
      timeout: 120_000,
    });
    await expect(
      generated.getByText(
        "Shared demo data. Roles are examples, not private accounts.",
      ),
    ).toBeVisible();
    record(evidence.consumerEntry).openAppActions = openAppActions;
    expect(openAppActions).toBe(1);
    evidence.consumerReadyMs = Date.now() - startedAt;

    phase("administrator-setup");
    await generated.setViewportSize({ width: 1440, height: 844 });
    await setRole("administrator");
    const serverClock = exactServerDate(
      (
        await getJson(request, origin, "/api/schedule", "administrator")
      ).response.headers()["date"] ?? null,
    );
    const serviceName = "Consultation " + attempt.slice(0, 8);
    await generated
      .getByLabel("Service name", { exact: true })
      .fill(serviceName);
    await generated.getByLabel("Duration minutes", { exact: true }).fill("30");
    const service = await clickSaved(
      generated.getByRole("button", { name: "Save service", exact: true }),
      "POST",
      /\/api\/service$/u,
    );
    const serviceId = identity(service.value.id);
    expect(service.command.body).not.toContain('"values"');
    expect(service.command.role).toBe("fixture-session-administrator");
    await expect(
      generated.getByRole("region", { name: "Current service setup" }),
    ).toContainText(serviceName);

    const createSchedule = async (offsetHours: number, capacity: string) => {
      await generated!
        .getByLabel("Schedule service", { exact: true })
        .selectOption(serviceId);
      await generated!
        .getByLabel("Start time (UTC)", { exact: true })
        .fill(futureUtc(serverClock, offsetHours));
      await generated!
        .getByLabel("End time (UTC)", { exact: true })
        .fill(futureUtc(serverClock, offsetHours + 1));
      await generated!
        .getByLabel("Timezone", { exact: true })
        .fill("Asia/Singapore");
      await generated!.getByLabel("Capacity", { exact: true }).fill(capacity);
      return clickSaved(
        generated!.getByRole("button", { name: "Save schedule", exact: true }),
        "POST",
        /\/api\/schedule$/u,
      );
    };
    const firstSchedule = await createSchedule(48, "2");
    const secondSchedule = await createSchedule(72, "2");
    expect(firstSchedule.command.body).not.toContain('"values"');
    expect(secondSchedule.command.body).not.toContain('"values"');
    const scheduleId = identity(firstSchedule.value.id);
    const createdSchedule = generated
      .getByRole("region", { name: "Current schedule setup" })
      .locator("article")
      .filter({
        hasText: String(firstSchedule.value.startUtc)
          .replace("T", " ")
          .replace(".000Z", " UTC"),
      });
    await expect(createdSchedule).toHaveCount(1);
    await createdSchedule
      .getByRole("button", { name: "Update schedule", exact: true })
      .click();
    await expect(
      generated.getByRole("region", { name: "Current saved schedule" }),
    ).toContainText("Start time (UTC)");
    await generated.getByLabel("Capacity", { exact: true }).fill("1");
    const schedulePatch = await clickSaved(
      generated.getByRole("button", {
        name: "Save schedule update",
        exact: true,
      }),
      "PATCH",
      new RegExp(`/api/schedule/${scheduleId}$`, "u"),
    );
    const schedulePatchBody = record(JSON.parse(schedulePatch.command.body));
    expect(record(schedulePatchBody.expectedValues)).toBeTruthy();
    expect(record(schedulePatchBody.values)).toMatchObject({
      capacity: 1,
      startUtc: firstSchedule.value.startUtc,
      endUtc: firstSchedule.value.endUtc,
      timezone: "Asia/Singapore",
    });
    expect(record(schedulePatchBody.expectedValues)).toMatchObject({
      capacity: 2,
    });
    await generated
      .getByRole("region", { name: "Current service setup" })
      .locator("article")
      .filter({ hasText: serviceName })
      .getByRole("button", { name: "Update service", exact: true })
      .click();
    await generated.getByLabel("Duration minutes", { exact: true }).fill("35");
    const servicePatch = await clickSaved(
      generated.getByRole("button", {
        name: "Save service update",
        exact: true,
      }),
      "PATCH",
      new RegExp(`/api/service/${serviceId}$`, "u"),
    );
    expect(
      record(JSON.parse(servicePatch.command.body)).expectedValues,
    ).toBeTruthy();
    await expect(
      generated.getByLabel("Available for new bookings"),
    ).toBeChecked();
    // Re-open the saved row so the next edit uses the current expected snapshot.
    const editService = async () => {
      await generated!
        .getByRole("region", { name: "Current service setup" })
        .locator("article")
        .filter({ hasText: serviceName })
        .getByRole("button", { name: "Update service", exact: true })
        .click();
    };
    await editService();
    await generated.getByLabel("Available for new bookings").uncheck();
    const servicePattern = new RegExp("/api/service/" + serviceId + "$", "u");
    const inactiveService = await clickSaved(
      generated.getByRole("button", {
        name: "Save service update",
        exact: true,
      }),
      "PATCH",
      servicePattern,
    );
    expect(inactiveService.value.active).toBe(false);
    expect(
      record(
        (
          await getJson(
            request,
            origin,
            "/api/service/" + serviceId,
            "administrator",
          )
        ).body,
      ).active,
    ).toBe(false);
    const discoveryQuery = new URLSearchParams({
      from: serverClock,
      to: new Date(Date.parse(serverClock) + 7 * 86_400_000).toISOString(),
      serviceId,
    });
    expect(
      record(
        (
          await getJson(
            request,
            origin,
            "/api/appointment-availability?" + discoveryQuery,
            "customer",
          )
        ).body,
      ).slots,
    ).toEqual([]);
    await editService();
    await generated.getByLabel("Available for new bookings").check();
    await clickSaved(
      generated.getByRole("button", {
        name: "Save service update",
        exact: true,
      }),
      "PATCH",
      servicePattern,
    );
    await capture("administrator-setup", [1440]);

    // A real stale setup snapshot retains the typed draft and shows current saved values.
    await createdSchedule
      .getByRole("button", { name: "Update schedule", exact: true })
      .click();
    await generated.getByLabel("Capacity", { exact: true }).fill("3");
    const setupPath = "/api/schedule/" + scheduleId;
    const setupBefore = record(
      (await getJson(request, origin, setupPath, "administrator")).body,
    );
    const scheduleValues = (row: RecordValue) =>
      Object.fromEntries(
        [
          "serviceId",
          "startUtc",
          "endUtc",
          "timezone",
          "capacity",
          "status",
        ].map((key) => [key, row[key]]),
      );
    const competingSetup = await request.patch(origin + setupPath, {
      headers: {
        ...fixtureHeaders("administrator"),
        "x-factory-idempotency-key": randomUUID(),
      },
      data: {
        expectedValues: scheduleValues(setupBefore),
        values: { ...scheduleValues(setupBefore), capacity: 2 },
      },
    });
    expect(competingSetup.status()).toBe(200);
    expect(await competingSetup.json()).toMatchObject({ capacity: 2 });
    const setupCommitted = (
      await getJson(request, origin, setupPath, "administrator")
    ).body;
    const setupConflictResponse = generated.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        new URL(response.url()).pathname === setupPath,
    );
    await generated
      .getByRole("button", { name: "Save schedule update", exact: true })
      .click();
    expect((await setupConflictResponse).status()).toBe(409);
    await expect(
      generated.locator('main.appointment-v1 [role="alert"]'),
    ).toContainText("Your draft is kept");
    await expect(generated.getByLabel("Capacity", { exact: true })).toHaveValue(
      "3",
    );
    await expect(
      generated
        .getByRole("region", { name: "Current saved schedule" })
        .locator("dt")
        .filter({ hasText: /^Capacity$/u })
        .locator("xpath=following-sibling::dd[1]"),
    ).toHaveText("2");
    expect(
      (await getJson(request, origin, setupPath, "administrator")).body,
    ).toEqual(setupCommitted);
    await capture("administrator-stale-conflict", [1440]);
    await generated.getByLabel("Capacity", { exact: true }).fill("1");
    await generated
      .getByLabel("Schedule availability", { exact: true })
      .selectOption("closed");
    let setupInterrupted: SavedCommand | undefined;
    await generated.route("**" + setupPath, async (route) => {
      if (route.request().method() !== "PATCH" || setupInterrupted)
        return route.fallback();
      setupInterrupted = {
        method: "PATCH",
        path: setupPath,
        body: route.request().postData()!,
        key: route.request().headers()["x-factory-idempotency-key"]!,
        role: route.request().headers()["x-factory-fixture-session"]!,
      };
      const result = await route.fetch();
      expect(result.status()).toBe(200);
      await route.abort();
    });
    await generated
      .getByRole("button", { name: "Save schedule update", exact: true })
      .click();
    await expect(
      generated.getByRole("button", {
        name: "Retry same request",
        exact: true,
      }),
    ).toBeVisible();
    await expect(generated.getByLabel("Capacity", { exact: true })).toHaveValue(
      "1",
    );
    await expect(
      generated.getByLabel("Capacity", { exact: true }),
    ).toBeDisabled();
    const setupAfterCommit = (
      await getJson(request, origin, setupPath, "administrator")
    ).body;
    expect(setupAfterCommit).toMatchObject({ capacity: 1, status: "closed" });
    await capture("administrator-uncertain-setup", [1440]);
    await generated.unroute("**" + setupPath);
    const setupReplayResponse = generated.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        new URL(response.url()).pathname === setupPath,
    );
    await generated
      .getByRole("button", { name: "Retry same request", exact: true })
      .click();
    const setupReplay = await setupReplayResponse;
    expect(setupReplay.status()).toBe(200);
    expect({
      method: setupReplay.request().method(),
      path: setupPath,
      body: setupReplay.request().postData(),
      key: setupReplay.request().headers()["x-factory-idempotency-key"],
      role: setupReplay.request().headers()["x-factory-fixture-session"],
    }).toEqual(setupInterrupted);
    await expect(
      generated.getByRole("button", {
        name: "Save schedule update",
        exact: true,
      }),
    ).toBeEnabled();
    expect(
      (await getJson(request, origin, setupPath, "administrator")).body,
    ).toEqual(setupAfterCommit);
    await generated
      .getByLabel("Schedule availability", { exact: true })
      .selectOption("open");
    await clickSaved(
      generated.getByRole("button", {
        name: "Save schedule update",
        exact: true,
      }),
      "PATCH",
      new RegExp(setupPath + "$", "u"),
    );

    // More than a full availability page, all in the retained seven-day window.
    const paginationScheduleIds: string[] = [];
    for (let index = 0; index < 102; index++) {
      const start = new Date(
        Date.parse(serverClock) + 96 * 3_600_000 + index * 60_000 + 17_123,
      );
      const seeded = await request.post(origin + "/api/schedule", {
        headers: {
          ...fixtureHeaders("administrator"),
          "x-factory-idempotency-key": randomUUID(),
        },
        data: {
          serviceId,
          startUtc: start.toISOString(),
          endUtc: new Date(start.getTime() + 30 * 60_000).toISOString(),
          timezone: "Asia/Singapore",
          capacity: 1,
          status: "open",
        },
      });
      expect(seeded.status()).toBe(201);
      paginationScheduleIds.push(identity(record(await seeded.json()).id));
    }
    expect(paginationScheduleIds).toHaveLength(102);
    evidence.paginationFixtureSlots = paginationScheduleIds.length;
    const precisePath = "/api/schedule/" + paginationScheduleIds[0];
    const preciseBefore = record(
      (await getJson(request, origin, precisePath, "administrator")).body,
    );
    await generated
      .getByRole("button", { name: "Refresh appointments", exact: true })
      .click();
    const preciseRow = generated
      .getByRole("region", { name: "Current schedule setup" })
      .locator("article")
      .filter({
        hasText: String(preciseBefore.startUtc)
          .replace("T", " ")
          .replace(".000Z", " UTC"),
      });
    await expect(preciseRow).toHaveCount(1);
    await preciseRow
      .getByRole("button", { name: "Update schedule", exact: true })
      .click();
    await generated.getByLabel("Capacity", { exact: true }).fill("2");
    const precisionUpdate = await clickSaved(
      generated.getByRole("button", {
        name: "Save schedule update",
        exact: true,
      }),
      "PATCH",
      new RegExp(precisePath + "$", "u"),
    );
    expect(precisionUpdate.value).toMatchObject({
      capacity: 2,
      startUtc: preciseBefore.startUtc,
      endUtc: preciseBefore.endUtc,
      timezone: preciseBefore.timezone,
    });
    expect(
      record(JSON.parse(precisionUpdate.command.body)).values,
    ).toMatchObject({
      startUtc: preciseBefore.startUtc,
      endUtc: preciseBefore.endUtc,
    });

    phase("phone-customer-booking");
    await generated.setViewportSize({ width: 390, height: 844 });
    await setRole("customer");
    const availabilityReads: {
      kind: string;
      offset: string | null;
      from: string | null;
      to: string | null;
    }[] = [];
    generated.on("request", (outgoing) => {
      const url = new URL(outgoing.url());
      if (
        outgoing.method() === "GET" &&
        ["/api/appointment", "/api/appointment-availability"].includes(
          url.pathname,
        )
      )
        availabilityReads.push({
          kind: url.pathname.endsWith("availability")
            ? "availability"
            : "authenticated-list",
          offset: url.searchParams.get("offset"),
          from: url.searchParams.get("from"),
          to: url.searchParams.get("to"),
        });
    });
    const customerName = "Avery " + attempt.slice(0, 8);
    const notes = "Please call on arrival.";
    await expect(
      generated.getByRole("button", {
        name: "More available times",
        exact: true,
      }),
    ).toBeEnabled();
    await generated.getByLabel("Your name", { exact: true }).fill(customerName);
    await generated.getByLabel("Notes", { exact: true }).fill(notes);
    await generated.locator(".appointment-slot").first().click();
    const requestButton = generated.getByRole("button", {
      name: "Request appointment",
      exact: true,
    });
    const moreTimes = generated.getByRole("button", {
      name: "More available times",
      exact: true,
    });
    const assertClockBlocked = async () => {
      await expect(
        generated!.locator('main.appointment-v1 [role="alert"]'),
      ).toContainText("server time could not be confirmed");
      await expect(requestButton).toBeDisabled();
      await expect(moreTimes).toBeDisabled();
      await expect(
        generated!.getByRole("button", { name: "Previous week", exact: true }),
      ).toBeDisabled();
      await expect(
        generated!.getByRole("button", { name: "Next week", exact: true }),
      ).toBeDisabled();
      for (const slot of await generated!.locator(".appointment-slot").all())
        await expect(slot).toBeDisabled();
      await expect(
        generated!.getByLabel("Your name", { exact: true }),
      ).toHaveValue(customerName);
      await expect(generated!.getByLabel("Notes", { exact: true })).toHaveValue(
        notes,
      );
    };
    let stripOffset: "0" | "cursor" | null = "0";
    await generated.route(
      "**/api/appointment-availability?*",
      async (route) => {
        const offset = new URL(route.request().url()).searchParams.get(
          "offset",
        );
        if (
          stripOffset === null ||
          (stripOffset === "0" ? offset !== "0" : offset === "0")
        )
          return route.fallback();
        stripOffset = null;
        const upstream = await route.fetch();
        expect(upstream.status()).toBe(200);
        const headers = { ...upstream.headers() };
        delete headers.date;
        // Explicit fulfillment headers, without the APIResponse object, really omit Date.
        await route.fulfill({
          status: 200,
          headers,
          body: await upstream.body(),
        });
      },
    );
    const recoverySequences: (typeof availabilityReads)[] = [];
    const recoverClock = async (retained: {
      from: string | null;
      to: string | null;
    }) => {
      const start = availabilityReads.length;
      const recovered = generated!.waitForResponse((response) => {
        const url = new URL(response.url());
        return (
          url.pathname === "/api/appointment-availability" &&
          url.searchParams.get("offset") === "0"
        );
      });
      await generated!
        .getByRole("button", { name: "Retry availability", exact: true })
        .click();
      exactServerDate((await recovered).headers()["date"] ?? null);
      await expect(moreTimes).toBeEnabled();
      const sequence = availabilityReads.slice(start);
      expect(sequence.map(({ kind, offset }) => ({ kind, offset }))).toEqual([
        { kind: "authenticated-list", offset: null },
        { kind: "availability", offset: "0" },
      ]);
      expect(sequence[1]).toMatchObject(retained);
      recoverySequences.push(sequence);
    };
    await generated
      .getByRole("button", { name: "Refresh appointments", exact: true })
      .click();
    await assertClockBlocked();
    const initialRead = availabilityReads
      .filter((read) => read.kind === "availability")
      .at(-1)!;
    expect(initialRead.offset).toBe("0");
    await capture("customer-first-page-clock-recovery", [390]);
    await recoverClock({ from: initialRead.from, to: initialRead.to });
    stripOffset = "cursor";
    await moreTimes.click();
    await assertClockBlocked();
    const failedCursor = availabilityReads.at(-1)!;
    expect(Number(failedCursor.offset)).toBeGreaterThan(0);
    expect(failedCursor).toMatchObject({
      from: initialRead.from,
      to: initialRead.to,
    });
    await capture("customer-retained-cursor-clock-recovery", [390, 768]);
    await recoverClock({ from: failedCursor.from, to: failedCursor.to });
    const cursorPage = generated.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        url.pathname === "/api/appointment-availability" &&
        url.searchParams.get("offset") === failedCursor.offset
      );
    });
    await moreTimes.click();
    const cursorResult = await cursorPage;
    expect(cursorResult.status()).toBe(200);
    exactServerDate(cursorResult.headers()["date"] ?? null);
    await expect
      .poll(() => generated!.locator(".appointment-slot").count())
      .toBeGreaterThan(100);
    await expect(moreTimes).toHaveCount(0);
    await generated.unroute("**/api/appointment-availability?*");
    evidence.availabilityRecovery = {
      sequences: recoverySequences,
      failedCursor,
      successfulCursor: availabilityReads.at(-1),
      visibleSlots: await generated.locator(".appointment-slot").count(),
    };
    // Deterministic empty view for this selected service, beyond all of its authored slots.
    await generated
      .getByLabel("Service", { exact: true })
      .selectOption(serviceId);
    const shiftWeek = async (name: "Next week" | "Previous week") => {
      const result = generated!.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === "/api/appointment-availability",
      );
      await generated!.getByRole("button", { name, exact: true }).click();
      expect((await result).status()).toBe(200);
      await expect(
        generated!.getByRole("button", { name, exact: true }),
      ).toBeEnabled();
    };
    await shiftWeek("Next week");
    await expect(
      generated.getByRole("heading", {
        name: "No available times in this view",
        exact: true,
      }),
    ).toBeVisible();
    await expect(requestButton).toBeDisabled();
    await expect(
      generated.getByLabel("Your name", { exact: true }),
    ).toHaveValue(customerName);
    await capture("customer-empty-next-week", [390]);
    await shiftWeek("Previous week");
    await generated
      .getByLabel("Service", { exact: true })
      .selectOption({ label: serviceName });
    const slot = generated
      .locator(".appointment-slot")
      .filter({ hasText: serviceName })
      .first();
    await expect(slot).toBeVisible();
    await slot.click();
    const nonUtcTime = await generated.evaluate(
      ({ instant, timezone }) =>
        new Date(instant).toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
          timeZone: timezone,
        }),
      {
        instant: String(firstSchedule.value.startUtc),
        timezone: "Asia/Singapore",
      },
    );
    await expect(generated.locator(".appointment-selection")).toContainText(
      nonUtcTime,
    );
    await expect(generated.locator(".appointment-selection")).toContainText(
      "Asia/Singapore",
    );
    await generated.getByLabel("Your name", { exact: true }).fill(customerName);
    await generated
      .getByLabel("Notes", { exact: true })
      .fill("Please call on arrival.");
    // Another customer takes the already-selected last place; the visible form must retain its draft.
    const competitor = await request.post(origin + "/api/appointment", {
      headers: {
        ...fixtureHeaders("customer"),
        "x-factory-idempotency-key": randomUUID(),
      },
      data: {
        values: {
          scheduleId,
          customerName: "Capacity fixture " + attempt.slice(0, 8),
        },
      },
    });
    expect(competitor.status()).toBe(201);
    const competitorRecord = record(await competitor.json());
    const competitorId = identity(competitorRecord.id);
    const capacityBefore = (
      await getJson(request, origin, "/api/appointment", "staff")
    ).body;
    const capacityHistory = (
      await getJson(
        request,
        origin,
        "/api/appointment/" + competitorId + "/appointment-history",
        "staff",
      )
    ).body;
    const capacityResponse = generated.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/appointment",
    );
    await requestButton.click();
    expect((await capacityResponse).status()).toBe(409);
    await expect(
      generated.locator('main.appointment-v1 [role="alert"]'),
    ).toContainText("That time is now full");
    await expect(
      generated.getByLabel("Your name", { exact: true }),
    ).toHaveValue(customerName);
    await expect(generated.getByLabel("Notes", { exact: true })).toHaveValue(
      notes,
    );
    expect(
      (await getJson(request, origin, "/api/appointment", "staff")).body,
    ).toEqual(capacityBefore);
    expect(
      (
        await getJson(
          request,
          origin,
          "/api/appointment/" + competitorId + "/appointment-history",
          "staff",
        )
      ).body,
    ).toEqual(capacityHistory);
    await capture("customer-capacity-conflict", [390]);
    const releasePlace = await request.post(
      origin + "/api/appointment/" + competitorId + "/events/cancel",
      {
        headers: {
          ...fixtureHeaders("customer"),
          "x-factory-idempotency-key": randomUUID(),
        },
        data: {
          expectedVersion: 0,
          cancellationReason: "Release the controlled capacity fixture.",
        },
      },
    );
    expect(releasePlace.status()).toBe(200);
    await generated
      .getByRole("button", { name: "Refresh appointments", exact: true })
      .click();
    await expect(slot).toBeEnabled();
    await slot.click();
    const booking = await clickSaved(
      generated.getByRole("button", {
        name: "Request appointment",
        exact: true,
      }),
      "POST",
      /\/api\/appointment$/u,
    );
    const appointmentId = identity(booking.value.id);
    const consumerEntry = record(evidence.consumerEntry);
    consumerEntry.firstUsefulAction = "customer-requested-appointment";
    consumerEntry.firstUsefulActionMs =
      Date.now() - Number(consumerEntry.startedAtMs);
    expect(booking.command.role).toBe("fixture-session-customer");
    await generated
      .getByRole("button", { name: "My demo appointments", exact: true })
      .click();
    await expect(appointmentRow(customerName)).toContainText("requested");
    await expect(appointmentRow(customerName)).toContainText(
      "Please call on arrival.",
    );
    await capture("customer-requested", [390]);
    await generated.reload();
    await expect(appointmentRow(customerName)).toContainText(serviceName);
    expect(booking.value).toMatchObject({ status: "requested", version: 0 });
    await expect(appointmentRow(customerName)).toContainText("Asia/Singapore");
    const primaryVersions = [booking.value.version];

    phase("protected-schedule-retime");
    await setRole("administrator");
    const referencedScheduleBefore = (
      await getJson(
        request,
        origin,
        "/api/schedule/" + scheduleId,
        "administrator",
      )
    ).body;
    const referencedAppointmentBefore = (
      await getJson(
        request,
        origin,
        "/api/appointment/" + appointmentId,
        "staff",
      )
    ).body;
    const referencedHistoryBefore = (
      await getJson(
        request,
        origin,
        "/api/appointment/" + appointmentId + "/appointment-history",
        "staff",
      )
    ).body;
    await createdSchedule
      .getByRole("button", { name: "Update schedule", exact: true })
      .click();
    const attemptedStart = futureUtc(serverClock, 49),
      attemptedEnd = futureUtc(serverClock, 50);
    await generated
      .getByLabel("Start time (UTC)", { exact: true })
      .fill(attemptedStart);
    await generated
      .getByLabel("End time (UTC)", { exact: true })
      .fill(attemptedEnd);
    const protectedResponse = generated.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        new URL(response.url()).pathname === "/api/schedule/" + scheduleId,
    );
    await generated
      .getByRole("button", { name: "Save schedule update", exact: true })
      .click();
    expect((await protectedResponse).status()).toBe(409);
    await expect(
      generated.locator('main.appointment-v1 [role="alert"]'),
    ).toContainText("Your draft is kept");
    await expect(
      generated.getByLabel("Start time (UTC)", { exact: true }),
    ).toHaveValue(attemptedStart);
    await expect(
      generated.getByLabel("End time (UTC)", { exact: true }),
    ).toHaveValue(attemptedEnd);
    expect(
      (
        await getJson(
          request,
          origin,
          "/api/schedule/" + scheduleId,
          "administrator",
        )
      ).body,
    ).toEqual(referencedScheduleBefore);
    expect(
      (
        await getJson(
          request,
          origin,
          "/api/appointment/" + appointmentId,
          "staff",
        )
      ).body,
    ).toEqual(referencedAppointmentBefore);
    expect(
      (
        await getJson(
          request,
          origin,
          "/api/appointment/" + appointmentId + "/appointment-history",
          "staff",
        )
      ).body,
    ).toEqual(referencedHistoryBefore);
    await capture("administrator-protected-retime-conflict", [1440]);

    phase("staff-command-chain");
    await generated.setViewportSize({ width: 1440, height: 844 });
    await setRole("staff");
    const row = appointmentRow(customerName);
    await expect(row).toContainText("requested");
    await row
      .locator("summary")
      .filter({ hasText: "Appointment history" })
      .click();
    await expect(row.locator(".appointment-history")).toContainText(
      "Requested",
    );
    const confirmed = await action(row, "confirm");
    expect(confirmed.value).toMatchObject({ version: 1 });
    primaryVersions.push(confirmed.value.version);
    await expect(row).toContainText("confirmed");
    await row
      .locator("summary")
      .filter({ hasText: "Manage appointment" })
      .click();
    await row
      .getByLabel(`Reschedule ${customerName}`, { exact: true })
      .selectOption(identity(secondSchedule.value.id));
    const moved = await action(row, "reschedule");
    expect(moved.value).toMatchObject({ version: 2 });
    primaryVersions.push(moved.value.version);
    await expect(row).toContainText("requested");
    const reconfirmed = await action(row, "confirm");
    expect(reconfirmed.value).toMatchObject({ version: 3 });
    primaryVersions.push(reconfirmed.value.version);
    await row
      .locator("summary")
      .filter({ hasText: "Cancel appointment" })
      .click();
    await row
      .getByLabel(`Cancellation reason for ${customerName}`, { exact: true })
      .fill("Customer asked to cancel.");
    const cancelled = await action(row, "cancel");
    expect(cancelled.value).toMatchObject({ version: 4 });
    primaryVersions.push(cancelled.value.version);
    await expect(row).toContainText("cancelled");
    await expect(row.locator(".appointment-history")).toContainText(
      /Requested[\s\S]*Confirmed[\s\S]*Rescheduled[\s\S]*Confirmed[\s\S]*Cancelled/u,
    );
    const history = await getJson(
      request,
      origin,
      `/api/appointment/${encodeURIComponent(appointmentId)}/appointment-history`,
      "staff",
    );
    expect(
      (history.body as { action: string }[]).map((entry) => entry.action),
    ).toEqual(["claim", "confirm", "move", "confirm", "cancel"]);
    expect(primaryVersions).toEqual([0, 1, 2, 3, 4]);
    expect(
      (history.body as RecordValue[]).map((entry) => entry.toStatus),
    ).toEqual([
      "requested",
      "confirmed",
      "requested",
      "confirmed",
      "cancelled",
    ]);
    expect(
      (history.body as RecordValue[]).map((entry) => entry.actorRole),
    ).toEqual(["customer", "staff", "staff", "staff", "staff"]);
    expect((history.body as RecordValue[])[4]).toMatchObject({
      cancellationReason: "Customer asked to cancel.",
    });
    await capture("staff-cancelled", [768, 1440]);
    await generated.reload();
    await expect(appointmentRow(customerName)).toContainText("cancelled");
    await appointmentRow(customerName)
      .getByText("Appointment history", { exact: true })
      .click();
    await expect(
      appointmentRow(customerName).locator(".appointment-history > li"),
    ).toHaveCount(5);
    expect(
      (
        await getJson(
          request,
          origin,
          "/api/appointment/" + appointmentId + "/appointment-history",
          "staff",
        )
      ).body,
    ).toEqual(history.body);
    evidence.primaryJourney = {
      versions: primaryVersions,
      actions: (history.body as RecordValue[]).map((entry) => entry.action),
      historyDigest: digest(history.body),
    };

    phase("staff-stale-input-recovery");
    const staleName = "Stale " + attempt.slice(0, 8);
    const staleSetup = await request.post(origin + "/api/appointment", {
      headers: {
        ...fixtureHeaders("customer"),
        "x-factory-idempotency-key": randomUUID(),
      },
      data: {
        values: {
          scheduleId: identity(secondSchedule.value.id),
          customerName: staleName,
        },
      },
    });
    expect(staleSetup.status()).toBe(201);
    const staleId = identity(record(await staleSetup.json()).id);
    await generated.reload();
    const staleRow = appointmentRow(staleName);
    await expect(staleRow).toContainText("requested");
    await staleRow
      .locator("summary")
      .filter({ hasText: "Cancel appointment" })
      .click();
    const staleReason = "Retain this cancellation draft.";
    await staleRow
      .getByLabel("Cancellation reason for " + staleName, { exact: true })
      .fill(staleReason);
    const stalePath = "/api/appointment/" + staleId;
    const competingConfirmation = await request.post(
      origin + stalePath + "/events/confirm",
      {
        headers: {
          ...fixtureHeaders("staff"),
          "x-factory-idempotency-key": randomUUID(),
        },
        data: { expectedVersion: 0 },
      },
    );
    expect(competingConfirmation.status()).toBe(200);
    const afterCompeting = await competingConfirmation.json();
    const afterCompetingHistory = (
      await getJson(
        request,
        origin,
        stalePath + "/appointment-history",
        "staff",
      )
    ).body;
    const staleResponse = generated.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === stalePath + "/events/cancel",
    );
    await staleRow
      .getByRole("button", { name: "Cancel appointment", exact: true })
      .click();
    expect((await staleResponse).status()).toBe(409);
    await expect(
      generated.locator('main.appointment-v1 [role="alert"]'),
    ).toContainText("details changed");
    await expect(
      staleRow.getByLabel("Cancellation reason for " + staleName, {
        exact: true,
      }),
    ).toHaveValue(staleReason);
    await expect(staleRow).toContainText("confirmed");
    expect((await getJson(request, origin, stalePath, "staff")).body).toEqual(
      afterCompeting,
    );
    expect(
      (
        await getJson(
          request,
          origin,
          stalePath + "/appointment-history",
          "staff",
        )
      ).body,
    ).toEqual(afterCompetingHistory);
    await capture("staff-stale-cancellation-input", [768, 1440]);
    await action(staleRow, "cancel");
    await expect(staleRow).toContainText("cancelled");

    phase("committed-lost-response-contract");
    // A controlled fixture record isolates transport recovery from the completed
    // business journey above; its confirmation itself is still submitted through UI.
    const faultBody = record(JSON.parse(booking.command.body));
    const faultValues = record(faultBody.values);
    for (const [field, value] of Object.entries(faultValues))
      if (value === customerName)
        faultValues[field] = `Retry ${attempt.slice(0, 8)}`;
    const faultSetup = await request.post(origin + "/api/appointment", {
      headers: {
        ...fixtureHeaders("customer"),
        "content-type": "application/json",
        "x-factory-idempotency-key": randomUUID(),
      },
      data: faultBody,
    });
    expect(faultSetup.status()).toBe(201);
    const faultId = identity(record(await faultSetup.json()).id);
    const faultCustomer = `Retry ${attempt.slice(0, 8)}`;
    await generated.reload();
    const faultRow = appointmentRow(faultCustomer);
    await expect(faultRow).toContainText("requested");
    const faultPath = `/api/appointment/${encodeURIComponent(faultId)}/events/confirm`;
    const faultRecordPath = `/api/appointment/${encodeURIComponent(faultId)}`;
    const beforeDenied = (
      await getJson(request, origin, faultRecordPath, "staff")
    ).body;
    const historyBeforeDenied = (
      await getJson(
        request,
        origin,
        faultRecordPath + "/appointment-history",
        "staff",
      )
    ).body;
    // The UI submits a real command while a controlled transport substitutes an unauthorized fixture identity.
    await generated.route("**" + faultPath, async (route) =>
      route.request().method() === "POST"
        ? route.continue({
            headers: {
              ...route.request().headers(),
              ...fixtureHeaders("customer"),
            },
          })
        : route.fallback(),
    );
    const deniedResponse = generated.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === faultPath,
    );
    await faultRow
      .getByRole("button", { name: "Confirm appointment", exact: true })
      .click();
    expect((await deniedResponse).status()).toBe(403);
    await expect(
      generated.locator('main.appointment-v1 [role="alert"]'),
    ).toContainText("This demo role cannot make that change");
    await expect(faultRow).toContainText("requested");
    expect(
      (await getJson(request, origin, faultRecordPath, "staff")).body,
    ).toEqual(beforeDenied);
    expect(
      (
        await getJson(
          request,
          origin,
          faultRecordPath + "/appointment-history",
          "staff",
        )
      ).body,
    ).toEqual(historyBeforeDenied);
    await capture("denied-command-no-write", [390, 1440]);
    await generated.unroute("**" + faultPath);
    let interrupted: SavedCommand | undefined;
    await generated.route("**" + faultPath, async (route) => {
      if (interrupted || route.request().method() !== "POST")
        return route.fallback();
      interrupted = {
        method: route.request().method(),
        path: new URL(route.request().url()).pathname,
        body: route.request().postData()!,
        key: route.request().headers()["x-factory-idempotency-key"]!,
        role: route.request().headers()["x-factory-fixture-session"]!,
      };
      const committed = await route.fetch();
      expect(committed.status()).toBe(200);
      await route.abort();
    });
    await faultRow
      .getByRole("button", { name: "Confirm appointment", exact: true })
      .click();
    await expect(
      generated.getByRole("button", {
        name: "Retry same request",
        exact: true,
      }),
    ).toBeVisible();
    expect(interrupted).toBeDefined();
    await expect(
      generated.getByLabel("Demo role", { exact: true }),
    ).toBeDisabled();
    const committedRecord = record(
      (await getJson(request, origin, faultRecordPath, "staff")).body,
    );
    expect(committedRecord).toMatchObject({ version: 1, status: "confirmed" });
    await capture("staff-committed-response-lost", [1440]);
    await generated.unroute("**" + faultPath);
    // Supersede the saved confirmation before retry, then restart only this owned API.
    // The tab stays open so it retains the original immutable pending command.
    const superseding = await request.post(
      origin + faultRecordPath + "/events/cancel",
      {
        headers: {
          ...fixtureHeaders("staff"),
          "x-factory-idempotency-key": randomUUID(),
        },
        data: {
          expectedVersion: 1,
          cancellationReason: "Recovery state superseded.",
        },
      },
    );
    expect(superseding.status()).toBe(200);
    const currentRecord = record(await superseding.json());
    expect(currentRecord).toMatchObject({ version: 2, status: "cancelled" });
    const currentHistory = (
      await getJson(
        request,
        origin,
        faultRecordPath + "/appointment-history",
        "staff",
      )
    ).body;
    expect(
      (currentHistory as RecordValue[]).map((entry) => entry.action),
    ).toEqual(["claim", "confirm", "cancel"]);
    phase("restart-before-delayed-receipt-replay");
    restartOwnedApi(preview);
    await ready(request, origin);
    expect(
      (await getJson(request, origin, faultRecordPath, "staff")).body,
    ).toEqual(currentRecord);
    expect(
      (
        await getJson(
          request,
          origin,
          faultRecordPath + "/appointment-history",
          "staff",
        )
      ).body,
    ).toEqual(currentHistory);
    const replayRequest = generated.waitForRequest(
      (candidate) =>
        candidate.method() === interrupted!.method &&
        new URL(candidate.url()).pathname === interrupted!.path,
    );
    const replayResponse = generated.waitForResponse(
      (candidate) =>
        candidate.request().method() === "POST" &&
        new URL(candidate.url()).pathname === interrupted!.path,
    );
    await generated
      .getByRole("button", { name: "Retry same request", exact: true })
      .click();
    const replay = await replayRequest;
    expect({
      method: replay.method(),
      path: new URL(replay.url()).pathname,
      body: replay.postData(),
      key: replay.headers()["x-factory-idempotency-key"],
      role: replay.headers()["x-factory-fixture-session"],
    }).toEqual(interrupted);
    const savedReplay = await replayResponse;
    expect(savedReplay.status()).toBe(200);
    const oldReceipt = record(await savedReplay.json());
    expect(oldReceipt).toEqual(committedRecord);
    await expect(faultRow.locator(".appointment-status")).toHaveText(
      "cancelled",
    );
    await expect(faultRow).toContainText("Recovery state superseded.");
    const replayHistory = await getJson(
      request,
      origin,
      `${faultPath.replace("/events/confirm", "")}/appointment-history`,
      "staff",
    );
    expect(
      (replayHistory.body as { action: string }[]).map((entry) => entry.action),
    ).toEqual(["claim", "confirm", "cancel"]);
    expect(replayHistory.body).toEqual(currentHistory);
    expect(
      (await getJson(request, origin, faultRecordPath, "staff")).body,
    ).toEqual(currentRecord);
    await capture("staff-delayed-receipt-current-state", [768, 1440]);
    evidence.lostResponseRetry = {
      receiptVersion: oldReceipt.version,
      currentVersion: currentRecord.version,
      currentStatus: currentRecord.status,
      historyActions: (replayHistory.body as RecordValue[]).map(
        (entry) => entry.action,
      ),
      replayCommandDigest: digest(interrupted),
      persistedHistoryDigest: digest(replayHistory.body),
    };

    phase("restart-and-identity");
    await generated.reload();
    await expect(appointmentRow(customerName)).toContainText("cancelled");
    await expect(appointmentRow(faultCustomer)).toContainText("cancelled");
    expect(
      (
        await getJson(
          request,
          origin,
          `/api/appointment/${appointmentId}/appointment-history`,
          "staff",
        )
      ).body,
    ).toEqual(history.body);
    const publishedAfter = await publishedSnapshot(
      request,
      identity(compilationId),
      graphId,
    );
    expect(publishedAfter).toEqual(published);
    evidence.publishedAfterBusinessActivity = {
      id: publishedAfter.id,
      graphHash: publishedAfter.graphHash,
      compositionLockHash: publishedAfter.compositionLockHash,
      snapshotDigest: digest(publishedAfter),
    };
    expect(remoteRequests).toBe(0);
    evidence.unintendedRemoteRequests = remoteRequests;
    evidence.primaryCommandDigests = {
      service: digest(service.command.body),
      schedule: digest(schedulePatch.command.body),
      booking: digest(booking.command.body),
      appointment: digest(appointmentId),
      history: digest(history.body),
    };
    evidence.outcome = "business-passed-cleanup-pending";
  } catch (error) {
    businessError = error;
    evidence.outcome = "failed";
    evidence.failure = {
      phase: activePhase,
      kind: error instanceof Error ? error.name : "unknown",
    };
    if (generated && !generated.isClosed())
      await generated
        .screenshot({
          path: resolve(output, "failure-generated-app.png"),
          fullPage: true,
        })
        .catch(() => undefined);
  } finally {
    const entry = evidence.consumerEntry;
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      const consumer = record(entry);
      const measured = consumerEntryActions(observedActions);
      consumer.generatedProductActions = measured;
      for (const key of [
        "businessSubmissions",
        "viewNavigation",
        "retries",
        "otherActions",
      ] as const) {
        if (typeof consumer[key] === "number")
          consumer[key] = Number(consumer[key]) + measured[key];
      }
      consumer.scope =
        "Create product through generated Appointment interactions";
    }
    phase("cleanup");
    await generated?.close().catch(() => undefined);
    try {
      if (preview && compilationId) {
        await stopPreview(request, compilationId, preview.id);
        await expect
          .poll(() => ownedResources(preview!, factoryProject), {
            timeout: 120_000,
          })
          .toEqual({
            artifact: false,
            containers: false,
            networks: false,
            volumes: false,
          });
        evidence.cleanup = { outcome: "removed", previewRunId: preview.id };
      } else if (evidence.consumerOwnershipRecovery === "cleanup-required") {
        throw new Error(
          "Consumer Preview ownership recovery requires cleanup.",
        );
      } else evidence.cleanup = { outcome: "no-preview-created" };
      if (!businessError) evidence.outcome = "passed";
    } catch (cleanupError) {
      evidence.cleanup = { outcome: "cleanup-required" };
      evidence.outcome = "failed";
      businessError ??=
        cleanupError instanceof Error
          ? new Error("Owned Preview cleanup failed: " + cleanupError.name)
          : new Error("Owned Preview cleanup failed.");
    } finally {
      phases.push({
        name: activePhase,
        elapsedMs: Date.now() - phaseStartedAt,
      });
      await writeFile(
        resolve(output, "evidence.json"),
        JSON.stringify(evidence, null, 2) + "\n",
      );
    }
    if (businessError) throw businessError;
  }
});
