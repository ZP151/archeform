import { expect, test, type Page, type Request } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { stopPreview } from "./helpers/restaurant-delivery";
import {
  compilationIdentity,
  digest,
  object,
  ownedResources,
  ready,
  restartOwnedApi,
  type Json,
  type OwnedPreview,
} from "./helpers/content-directory";
import {
  deliverWorkOrders,
  workOrdersApi,
  workOrdersApiUrl,
  workOrdersCleanup,
  workOrdersFactRequest,
  workOrdersFacts,
  workOrdersFailure,
  workOrdersGuard,
  workOrdersPhase,
  workOrdersSources,
  type Staff,
} from "./helpers/service-work-orders";

test.describe.configure({ mode: "serial", retries: 0 });
// Raw transport traces can contain fixture command bodies and provider material.
test.use({
  trace: "off",
  video: "off",
  screenshot: "off",
  serviceWorkers: "block",
});

test("Facilities Service Desk completes persisted dispatch, technician work and exact recovery", async ({
  page,
  context,
  request,
}, testInfo) => {
  test.setTimeout(1_800_000);
  context.setDefaultTimeout(45_000);
  const factoryProject = workOrdersGuard({
    isolated: process.env.FACTORY_E2E_ISOLATED,
    factoryProject: process.env.FACTORY_E2E_FACTORY_PROJECT,
    controlPlane: process.env.FACTORY_E2E_CONTROL_PLANE_URL,
    workbench: testInfo.project.use.baseURL,
  });
  const attempt = randomUUID(),
    output = resolve(
      "docs/acceptance/evidence/service-work-orders",
      "attempt-" + attempt,
    );
  await mkdir(output, { recursive: true });
  const startedAt = Date.now(),
    phases: { name: string; elapsedMs: number }[] = [];
  let activePhase = "source-identity",
    phaseStartedAt = startedAt;
  const evidence: Json = {
    attempt,
    definitionKey: "facilities-service-desk",
    runtimeFamily: "service-work-orders/v1",
    caseId: "facilities-service-desk-local",
    scope: "isolated-local-synthetic-staff",
    authoredSelections: 1,
    modelCalls: 0,
    ordinaryUserStudies: 0,
    businessRetries: 0,
    inRunManualRescues: 0,
    readyTargetMs: 300_000,
    outerPreparation: "root-owned; excluded from prepared-local timer",
    visualReview: "pending-image-inspection",
    outcome: "running",
    phases,
  };
  const phase = (name: string) => {
    console.info(JSON.stringify(workOrdersPhase(attempt, name)));
    phases.push({ name: activePhase, elapsedMs: Date.now() - phaseStartedAt });
    activePhase = name;
    phaseStartedAt = Date.now();
  };
  console.info(JSON.stringify(workOrdersPhase(attempt, activePhase)));
  let preview: OwnedPreview | undefined,
    compilationId: string | undefined,
    desktop: Page | undefined,
    phone: Page | undefined,
    failure: unknown,
    releaseResponse: (() => void) | undefined;
  let remoteRequests = 0,
    businessActions = 0;
  const visuals: Json[] = [];
  const capture = async (
    target: Page,
    name: string,
    widths = [390, 768, 1440],
  ) => {
    const previous = target.viewportSize();
    for (const width of widths) {
      await target.setViewportSize({ width, height: 844 });
      await expect(target.locator("main.work-order-v1")).toBeVisible();
      const geometry = await target.evaluate(() => {
        const root = document.querySelector("main.work-order-v1")!;
        const visible = (element: Element) => {
          const box = element.getBoundingClientRect();
          return (
            element.getClientRects().length > 0 &&
            box.width > 0 &&
            box.height > 0
          );
        };
        const controls = [
          ...root.querySelectorAll("button,a,input,select,textarea"),
        ].filter(visible);
        const primary = root.querySelector(
          ".work-order-quick-actions .generated-primary",
        );
        const style = getComputedStyle(root);
        return {
          width: innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          controls: controls.length,
          smallControls: controls.filter((element) => {
            const box = element.getBoundingClientRect();
            return box.width < 43.5 || box.height < 43.5;
          }).length,
          stylesheets: [...document.styleSheets].filter(
            (sheet) =>
              !!sheet.href && new URL(sheet.href!).origin === location.origin,
          ).length,
          svgCount: [...root.querySelectorAll(".work-order-icon svg")].filter(
            visible,
          ).length,
          accent: style.getPropertyValue("--factory-accent").trim(),
          background: style.backgroundColor,
          primaryBottom:
            primary && visible(primary)
              ? primary.getBoundingClientRect().bottom
              : null,
          detailDisplay: getComputedStyle(
            root.querySelector(".work-order-detail") ?? root,
          ).display,
        };
      });
      expect(geometry.scrollWidth).toBeLessThanOrEqual(width + 1);
      expect(geometry.controls).toBeGreaterThan(0);
      expect(geometry.smallControls).toBe(0);
      expect(geometry.stylesheets).toBeGreaterThan(0);
      expect(geometry.svgCount).toBeGreaterThan(0);
      expect(geometry.accent.length).toBeGreaterThan(0);
      if (width === 390 && geometry.primaryBottom !== null)
        expect(geometry.primaryBottom).toBeLessThanOrEqual(650);
      visuals.push({ name, ...geometry });
      await target.screenshot({
        path: resolve(output, name + "-" + width + ".png"),
        fullPage: true,
      });
    }
    if (previous) await target.setViewportSize(previous);
  };
  const staff = async (target: Page, slot: Staff) => {
    const mobile = (target.viewportSize()?.width ?? 1440) <= 800;
    await target
      .getByLabel(
        mobile ? "Demo staff member" : "Local demo — synthetic staff",
        { exact: true },
      )
      .selectOption("fixture-principal-" + slot);
    await expect(target.locator(".work-order-queue")).not.toContainText(
      "Loading…",
    );
  };
  const freeze = (req: Request) => ({
    path: new URL(req.url()).pathname,
    method: req.method(),
    body: req.postData()!,
    key: req.headers()["x-factory-idempotency-key"]!,
    session: req.headers()["x-factory-fixture-session"]!,
  });
  const save = async (
    target: Page,
    label: string,
    path: string,
    status = 200,
  ) => {
    const received = target.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === path,
    );
    await target
      .locator(".work-order-editor")
      .getByRole("button", { name: label, exact: true })
      .click();
    businessActions++;
    const response = await received;
    expect(response.status()).toBe(status);
    const row = object(await response.json());
    await expect(target.locator(".work-order-detail-head h2")).toHaveText(
      String(row.title),
    );
    await expect(target.locator(".work-order-history li")).toHaveCount(
      Number(row.version) + 1,
    );
    return { row, command: freeze(response.request()) };
  };
  const metadata = async (target: Page, values: Json) => {
    for (const [key, label] of [
      ["title", "Title"],
      ["serviceLocation", "Service location"],
      ["description", "Description"],
      ["dueDate", "Due date"],
    ])
      await target
        .getByLabel(label!, { exact: true })
        .fill(String(values[key!] ?? ""));
    await target
      .getByLabel("Priority", { exact: true })
      .selectOption(String(values.priority));
  };
  const openAction = async (target: Page, label: string) => {
    await target
      .locator(".work-order-quick-actions")
      .getByRole("button", { name: label, exact: true })
      .click();
  };
  try {
    evidence.sources = await workOrdersSources();
    expect(
      object(evidence.sources)[
        "docs/adr/adr-0080-service-work-orders-family.md"
      ],
    ).toBe(
      "sha256:e35fa837394b66909af0063ab29714a0f9bcd800d06ad677a1d78bc761e093b6",
    );
    expect(
      object(evidence.sources)[
        "docs/adr/adr-0083-work-orders-fixture-identifiers.md"
      ],
    ).toBe(
      "sha256:e4932b817715d45a1df0bc7c7f03891752df797d9f1e22485482df8e5d712e5d",
    );
    const delivery = await deliverWorkOrders(
      page,
      request,
      evidence,
      phase,
      (id, owned) => {
        compilationId = id;
        if (owned) preview = owned;
      },
    );
    preview = delivery.preview;
    workOrdersFactRequest(preview, []);
    const origin = preview.previewUrl!,
      base = "/api/" + delivery.profile.orderEntity;
    workOrdersApiUrl(origin, base);
    expect(ownedResources(preview, factoryProject)).toMatchObject({
      artifact: true,
      containers: true,
      networks: true,
      volumes: true,
    });
    const immutable = await compilationIdentity(request, compilationId!);
    expect(immutable.inputGraphHash).toBe(evidence.inputGraphHash);
    expect(immutable.publishedRevisionId).toBe(evidence.publishedRevisionId);
    evidence.compilation = immutable;
    const api = (
      path: string,
      who: Staff = "dispatcher",
      method = "GET",
      body?: unknown,
      key?: string,
    ) => workOrdersApi(request, origin, path, who, method, body, key);
    const read = async (id: string) => {
      const result = await api(base + "/" + encodeURIComponent(id));
      expect(result.status).toBe(200);
      return result.body;
    };
    const history = async (id: string) => {
      const result = await api(
        base + "/" + encodeURIComponent(id) + "/history?limit=50",
      );
      expect(result.status).toBe(200);
      expect(result.body.nextBeforeVersion).toBeNull();
      return result.body.items as Json[];
    };
    const pathFor = (id: string, operation?: string) =>
      base +
      "/" +
      encodeURIComponent(id) +
      (operation ? "/events/" + operation : "");
    const command = async (
      id: string,
      operation: string,
      body: Json,
      who: Staff = "dispatcher",
    ) => api(pathFor(id, operation), who, "POST", body, randomUUID());
    const checkHistory = async (id: string, actions: string[]) => {
      const rows = await history(id);
      expect(rows.map((row) => row.action)).toEqual([...actions].reverse());
      expect(rows.map((row) => row.orderVersion)).toEqual(
        actions.map((_, i) => i).reverse(),
      );
      expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
      for (const row of rows) {
        expect(row.workOrder).toBe(id);
        expect(row.actorRole).toBe(
          row.actorPrincipalId === "fixture-principal-dispatcher"
            ? delivery.profile.roles.dispatcher
            : delivery.profile.roles.technician,
        );
      }
      return rows;
    };
    phase("empty-create");
    evidence.initialDatabaseFacts = workOrdersFacts(preview);
    expect(evidence.initialDatabaseFacts).toEqual({
      orders: 0,
      history: 0,
      audit: 0,
      receipts: 0,
      records: [],
    });
    expect((await api(base)).body.items).toEqual([]);
    await context.route("**/*", async (route) => {
      if (route.request().frame().page() === page) return route.continue();
      const url = new URL(route.request().url());
      if (
        ["http:", "https:"].includes(url.protocol) &&
        url.origin !== new URL(origin).origin
      ) {
        remoteRequests++;
        await route.abort();
      } else await route.continue();
    });
    [desktop] = await Promise.all([
      context.waitForEvent("page"),
      page.getByRole("link", { name: "Open local app", exact: true }).click(),
    ]);
    object(evidence.consumerEntry).openAppActions = 1;
    await desktop.setViewportSize({ width: 1440, height: 844 });
    await expect(
      desktop.locator(".work-order-queue .work-order-empty"),
    ).toContainText("No work orders here", { timeout: 120_000 });
    evidence.readyMs = Date.now() - startedAt;
    evidence.readyTargetMet = Number(evidence.readyMs) <= 300_000;
    await capture(desktop, "empty");
    const create = async (values: Json) => {
      await desktop!
        .getByRole("button", { name: "Create order", exact: true })
        .click();
      await metadata(desktop!, values);
      return save(desktop!, "Create order", base, 201);
    };
    const wrong = {
      title: "Pump leak — incorrect location",
      serviceLocation: "South plant room",
      priority: "low",
      description: "Inspect a reported leak",
      dueDate: "2026-10-01",
    };
    let current = (await create(wrong)).row;
    const id = String(current.id),
      detailUrl = desktop.url(),
      actions = ["create"];
    evidence.firstUsefulActionMs = Date.now() - startedAt;
    phase("correct-assign-start");
    await openAction(desktop, "Edit details");
    const corrected = {
      ...wrong,
      title: "Circulation pump leak",
      serviceLocation: "North plant room",
      priority: "high",
    };
    await metadata(desktop, corrected);
    await desktop
      .getByLabel("Reason", { exact: true })
      .fill("Correct the caller's location and urgency");
    current = (await save(desktop, "Save correction", pathFor(id, "update")))
      .row;
    actions.push("update");
    await desktop.reload();
    await expect(desktop.locator(".work-order-history")).toContainText(
      "South plant room → North plant room",
    );
    await expect(desktop.locator(".work-order-history")).toContainText(
      "low → high",
    );
    const firstHistory = await checkHistory(id, actions);
    expect(firstHistory[0]).toMatchObject({
      beforeServiceLocation: wrong.serviceLocation,
      afterServiceLocation: corrected.serviceLocation,
      beforePriority: "low",
      afterPriority: "high",
    });
    await capture(desktop, "corrected-details");
    await openAction(desktop, "Assign");
    await desktop
      .getByLabel("Technician", { exact: true })
      .selectOption("fixture-principal-technician-a");
    current = (await save(desktop, "Assign", pathFor(id, "assign"))).row;
    actions.push("assign");
    phone = await context.newPage();
    await phone.setViewportSize({ width: 390, height: 844 });
    await phone.goto(detailUrl);
    await staff(phone, "technician-a");
    await expect(phone.locator(".work-order-detail-location")).toHaveText(
      corrected.serviceLocation,
    );
    await expect(phone.locator(".work-order-detail-head")).toContainText(
      "high priority",
    );
    await capture(phone, "technician-a-assigned", [390]);
    await openAction(phone, "Start work");
    const started = await save(phone, "Start work", pathFor(id, "start"));
    current = started.row;
    actions.push("start");
    await desktop.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(desktop.locator(".work-order-detail-status")).toContainText(
      "In progress",
    );

    phase("uncertain-retry");
    // Each interception forwards the exact real command, observes its committed response,
    // then drops/replaces only that response. No successful business data is fabricated.
    let recovered: Awaited<ReturnType<typeof save>> | undefined;
    const recoveries: Json[] = [];
    for (const mode of ["abort", "502", "504"] as const) {
      await openAction(desktop, "Edit details");
      const values = {
        ...corrected,
        serviceLocation: "North plant room — bay " + mode,
        description: "Locate pump beside the isolation valve",
      };
      await metadata(desktop, values);
      await desktop
        .getByLabel("Reason", { exact: true })
        .fill("Clarify the active work location " + mode);
      const path = pathFor(id, "update"),
        before = workOrdersFacts(preview, [id]);
      let interrupted: ReturnType<typeof freeze> | undefined,
        committed: Json | undefined;
      let signalCommit!: (ok: boolean) => void;
      const didCommit = new Promise<boolean>((resolveCommit) => {
        signalCommit = resolveCommit;
      });
      const hold = new Promise<void>((resolveHold) => {
        releaseResponse = resolveHold;
      });
      await desktop.route(
        "**" + path,
        async (route) => {
          try {
            interrupted = freeze(route.request());
            const response = await route.fetch({
              maxRedirects: 0,
              timeout: 30_000,
            });
            if (response.status() !== 200) {
              signalCommit(false);
              await route.fulfill({ response });
              return;
            }
            committed = object(await response.json());
            signalCommit(true);
            await hold;
            if (mode === "abort") await route.abort("failed");
            else
              await route.fulfill({
                status: Number(mode),
                contentType: "text/plain",
                body: "Local acceptance response interruption",
              });
          } catch {
            signalCommit(false);
            await route.abort().catch(() => undefined);
          }
        },
        { times: 1 },
      );
      await desktop
        .locator(".work-order-editor")
        .getByRole("button", { name: "Save correction", exact: true })
        .click();
      businessActions++;
      expect(await didCommit).toBe(true);
      await expect(
        desktop.getByLabel("Local demo — synthetic staff", { exact: true }),
      ).toBeDisabled();
      await expect(
        desktop.getByRole("button", { name: "Refresh", exact: true }),
      ).toBeDisabled();
      await expect(
        desktop.getByLabel("Service location", { exact: true }),
      ).toBeDisabled();
      releaseResponse!();
      releaseResponse = undefined;
      await expect(desktop.getByRole("alert")).toContainText(
        "result is unknown",
      );
      await expect(
        desktop.getByLabel("Service location", { exact: true }),
      ).toHaveValue(values.serviceLocation);
      await capture(desktop, "uncertain-" + mode, [390, 1440]);
      const committedFacts = workOrdersFacts(preview, [id]);
      expect(committedFacts.history).toBe(before.history + 1);
      expect(committedFacts.audit).toBe(before.audit + 1);
      expect(committedFacts.receipts).toBe(before.receipts + 1);
      const retried = desktop.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          new URL(response.url()).pathname === path,
      );
      await desktop
        .getByRole("button", { name: "Retry same change", exact: true })
        .click();
      businessActions++;
      const response = await retried;
      expect(response.status()).toBe(200);
      expect(freeze(response.request())).toEqual(interrupted);
      expect(await response.json()).toEqual(committed);
      expect(interrupted!.session).toBe("fixture-session-dispatcher");
      expect(workOrdersFacts(preview, [id])).toEqual(committedFacts);
      current = committed!;
      actions.push("update");
      const correctedEvent = (await history(id))[0]!;
      expect(correctedEvent).toMatchObject({
        action: "update",
        actorPrincipalId: "fixture-principal-dispatcher",
        orderVersion: current.version,
        afterServiceLocation: values.serviceLocation,
        beforeServiceLocation:
          mode === "abort"
            ? corrected.serviceLocation
            : "North plant room — bay " + (mode === "502" ? "abort" : "502"),
        note: "Clarify the active work location " + mode,
      });
      recovered = { row: current, command: interrupted! };
      await expect(desktop.locator(".work-order-detail-location")).toHaveText(
        values.serviceLocation,
      );
      await expect(desktop.locator(".work-order-history li")).toHaveCount(
        actions.length,
      );
      await phone.getByRole("button", { name: "Refresh", exact: true }).click();
      await expect(phone.locator(".work-order-detail-location")).toHaveText(
        values.serviceLocation,
      );
      recoveries.push({
        mode,
        keyDigest: digest(interrupted!.key),
        bodyDigest: digest(interrupted!.body),
        principal: "dispatcher",
        version: current.version,
        exactlyOneHistoryAuditReceipt: true,
      });
    }
    evidence.recovery = recoveries;
    await checkHistory(id, actions);

    phase("reassign-denial");
    await openAction(desktop, "Reassign");
    await desktop
      .getByLabel("Technician", { exact: true })
      .selectOption("fixture-principal-technician-b");
    await desktop
      .getByLabel("Reason", { exact: true })
      .fill("Technician B takes over the active repair");
    current = (await save(desktop, "Reassign", pathFor(id, "reassign"))).row;
    actions.push("reassign");
    expect(current.status).toBe("in-progress");
    const beforeDenial = workOrdersFacts(preview, [id]);
    expect((await api(base, "technician-a")).body.items).toEqual([]);
    for (const path of [pathFor(id), pathFor(id) + "/history"])
      expect(await api(path, "technician-a")).toEqual({
        status: 404,
        body: { code: "work_order.not_found" },
      });
    for (const [operation, body, key] of [
      ["start", { expectedVersion: current.version }, randomUUID()],
      [
        "resolve",
        {
          expectedVersion: current.version,
          resolutionNote: "Former assignee cannot write",
        },
        randomUUID(),
      ],
      ["start", JSON.parse(started.command.body), started.command.key],
    ] as const)
      expect(
        await api(pathFor(id, operation), "technician-a", "POST", body, key),
      ).toEqual({ status: 404, body: { code: "work_order.not_found" } });
    await phone.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(phone.locator(".work-order-detail")).toContainText(
      "no longer available",
    );
    await expect(
      phone.locator(
        ".work-order-detail-head,.work-order-history,.work-order-report",
      ),
    ).toHaveCount(0);
    await expect(phone.locator(".work-order-card")).toHaveCount(0);
    await capture(phone, "former-assignee-denied", [390]);
    expect(workOrdersFacts(preview, [id])).toEqual(beforeDenial);
    await phone.reload();
    await expect(phone.locator(".work-order-detail")).toContainText(
      "no longer available",
    );
    await expect(
      phone.locator(".work-order-detail-head,.work-order-history"),
    ).toHaveCount(0);
    await staff(phone, "technician-b");
    await expect(phone.locator(".work-order-detail-head h2")).toHaveText(
      corrected.title,
    );
    await capture(phone, "technician-b-takeover", [390]);

    phase("resolve-reopen");
    const reports = [
      "Replaced the worn seal and tested normal pump operation.",
      "Retightened the coupling and observed a dry seal after a second pressure test.",
    ];
    await openAction(phone, "Resolve");
    await phone.getByLabel("Work report", { exact: true }).fill(reports[0]!);
    current = (await save(phone, "Resolve", pathFor(id, "resolve"))).row;
    actions.push("resolve");
    await desktop.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(desktop.locator(".work-order-report")).toContainText(
      reports[0]!,
    );
    await openAction(desktop, "Reopen");
    await desktop
      .getByLabel("Reason", { exact: true })
      .fill("Follow-up inspection found a recurring leak");
    current = (await save(desktop, "Reopen", pathFor(id, "reopen"))).row;
    actions.push("reopen");
    await expect(desktop.locator(".work-order-report")).toContainText(
      "Earlier resolution report",
    );
    await phone.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(phone.locator(".work-order-detail-status")).toContainText(
      "Open",
    );
    await openAction(phone, "Start work");
    current = (await save(phone, "Start work", pathFor(id, "start"))).row;
    actions.push("start");
    await openAction(phone, "Resolve");
    await phone.getByLabel("Work report", { exact: true }).fill(reports[1]!);
    current = (await save(phone, "Resolve", pathFor(id, "resolve"))).row;
    actions.push("resolve");
    await desktop.reload();
    for (const report of reports)
      await expect(desktop.locator(".work-order-history")).toContainText(
        report,
      );
    const flagshipHistory = await checkHistory(id, actions);
    expect(
      flagshipHistory
        .filter((row) => row.action === "resolve")
        .map((row) => row.note),
    ).toEqual([...reports].reverse());
    expect(
      flagshipHistory
        .filter((row) => row.action === "resolve")
        .every(
          (row) => row.actorPrincipalId === "fixture-principal-technician-b",
        ),
    ).toBe(true);
    await capture(desktop, "two-resolution-reports");

    phase("cancel-validation");
    // A separate mistaken duplicate carries validation/staleness/cancellation probes.
    await desktop.goto(detailUrl);
    // Desktop queue remains visible on detail and owns the Create order control.
    const duplicate = (
      await create({ ...wrong, title: "Mistaken duplicate pump repair" })
    ).row;
    const duplicateId = String(duplicate.id),
      duplicateUrl = desktop.url();
    const duplicateActions = ["create"];
    const noWrites = workOrdersFacts(preview, [id, duplicateId]);
    await openAction(desktop, "Edit details");
    await desktop.getByLabel("Title", { exact: true }).fill("   ");
    await desktop
      .getByLabel("Reason", { exact: true })
      .fill("Retained validation draft");
    await desktop
      .locator(".work-order-editor")
      .getByRole("button", { name: "Save correction", exact: true })
      .click();
    businessActions++;
    await expect(desktop.getByRole("alert")).toContainText("Enter a title");
    await expect(desktop.getByLabel("Reason", { exact: true })).toHaveValue(
      "Retained validation draft",
    );
    for (const values of [
      { ...wrong, dueDate: "2026-02-30" },
      { ...wrong, title: "" },
      { ...wrong, priority: "urgent" },
    ])
      expect(
        (
          await command(duplicateId, "update", {
            expectedVersion: 0,
            reason: "Invalid acceptance input",
            values,
          })
        ).status,
      ).toBe(400);
    expect(workOrdersFacts(preview, [id, duplicateId])).toEqual(noWrites);
    await capture(desktop, "validation-retained", [390, 1440]);
    await desktop
      .getByRole("button", { name: "Close form", exact: true })
      .click();

    phase("stale-reapply");
    await openAction(desktop, "Edit details");
    const proposed = {
      ...wrong,
      title: "Retained duplicate correction",
      serviceLocation: "Retained draft bay",
    };
    await metadata(desktop, proposed);
    await desktop
      .getByLabel("Reason", { exact: true })
      .fill("Conscious correction after review");
    const fresh = {
      ...wrong,
      title: "Concurrent saved duplicate",
      serviceLocation: "Current saved bay",
    };
    expect(
      (
        await command(duplicateId, "update", {
          expectedVersion: 0,
          reason: "Concurrent dispatcher correction",
          values: fresh,
        })
      ).status,
    ).toBe(200);
    duplicateActions.push("update");
    const staleResponse = desktop.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === pathFor(duplicateId, "update"),
    );
    await desktop
      .locator(".work-order-editor")
      .getByRole("button", { name: "Save correction", exact: true })
      .click();
    businessActions++;
    const stale = await staleResponse;
    expect(stale.status()).toBe(409);
    const staleCommand = freeze(stale.request());
    await expect(desktop.getByRole("alert")).toContainText(
      "This order changed",
    );
    await expect(desktop.getByLabel("Title", { exact: true })).toHaveValue(
      proposed.title,
    );
    await expect(
      desktop.getByLabel("Service location", { exact: true }),
    ).toHaveValue(proposed.serviceLocation);
    await expect(desktop.locator(".work-order-current")).toContainText(
      fresh.serviceLocation,
    );
    const staleFacts = workOrdersFacts(preview, [id, duplicateId]);
    await capture(desktop, "stale-draft-current-values", [390, 1440]);
    expect(workOrdersFacts(preview, [id, duplicateId])).toEqual(staleFacts);
    const reapplied = await save(
      desktop,
      "Apply draft to current order",
      pathFor(duplicateId, "update"),
    );
    duplicateActions.push("update");
    expect(reapplied.command.key).not.toBe(staleCommand.key);
    expect(JSON.parse(reapplied.command.body)).toEqual({
      expectedVersion: 1,
      reason: "Conscious correction after review",
      values: proposed,
    });
    await openAction(desktop, "Assign");
    await desktop
      .getByLabel("Technician", { exact: true })
      .selectOption("fixture-principal-technician-a");
    await save(desktop, "Assign", pathFor(duplicateId, "assign"));
    duplicateActions.push("assign");
    await openAction(desktop, "Cancel order");
    await desktop
      .getByLabel("Reason", { exact: true })
      .fill("Duplicate of the completed pump repair");
    const cancelled = (
      await save(desktop, "Cancel order", pathFor(duplicateId, "cancel"))
    ).row;
    duplicateActions.push("cancel");
    expect(cancelled.status).toBe("cancelled");
    await desktop.reload();
    await expect(desktop.locator(".work-order-cancelled")).toContainText(
      "Cancelled order",
    );
    await expect(desktop.locator(".work-order-history")).toContainText(
      "Duplicate of the completed pump repair",
    );
    await expect(desktop.locator(".work-order-report")).toHaveCount(0);
    expect((await read(duplicateId)).latestResolution).toBeNull();
    const terminalFacts = workOrdersFacts(preview, [id, duplicateId]);
    for (const [operation, extra] of [
      ["update", { reason: "Denied correction", values: wrong }],
      ["assign", { assigneePrincipalId: "fixture-principal-technician-a" }],
      [
        "reassign",
        {
          assigneePrincipalId: "fixture-principal-technician-b",
          reason: "Denied transfer",
        },
      ],
      ["reopen", { reason: "Denied reopen" }],
      ["cancel", { reason: "Denied repeated cancel" }],
    ] as const)
      expect(
        await command(duplicateId, operation, {
          expectedVersion: cancelled.version,
          ...extra,
        }),
      ).toEqual({ status: 409, body: { code: "work_order.state_conflict" } });
    for (const operation of ["start", "resolve"])
      expect(
        await command(
          duplicateId,
          operation,
          {
            expectedVersion: cancelled.version,
            ...(operation === "resolve"
              ? { resolutionNote: "Denied report" }
              : {}),
          },
          "technician-a",
        ),
      ).toEqual({ status: 409, body: { code: "work_order.state_conflict" } });
    expect(workOrdersFacts(preview, [id, duplicateId])).toEqual(terminalFacts);
    await checkHistory(duplicateId, duplicateActions);
    await capture(desktop, "cancelled-without-report");

    phase("concurrency");
    const probe = async (title: string) => {
      const result = await api(
        base,
        "dispatcher",
        "POST",
        { values: { ...wrong, title } },
        randomUUID(),
      );
      expect(result.status).toBe(201);
      return String(result.body.id);
    };
    const raceA = await probe("Reassignment versus resolution probe"),
      raceB = await probe("Correction versus cancellation probe");
    expect(
      (
        await command(raceA, "assign", {
          expectedVersion: 0,
          assigneePrincipalId: "fixture-principal-technician-a",
        })
      ).status,
    ).toBe(200);
    expect(
      (await command(raceA, "start", { expectedVersion: 1 }, "technician-a"))
        .status,
    ).toBe(200);
    const assignmentRace = await Promise.all([
      command(raceA, "reassign", {
        expectedVersion: 2,
        assigneePrincipalId: "fixture-principal-technician-b",
        reason: "Concurrent transfer probe",
      }),
      command(
        raceA,
        "resolve",
        {
          expectedVersion: 2,
          resolutionNote: "Concurrent completion probe report",
        },
        "technician-a",
      ),
    ]);
    expect(
      assignmentRace.filter((result) => result.status === 200),
    ).toHaveLength(1);
    const transferWon = assignmentRace[0]!.status === 200;
    expect(assignmentRace[transferWon ? 1 : 0]).toEqual({
      status: transferWon ? 404 : 409,
      body: {
        code: transferWon
          ? "work_order.not_found"
          : "work_order.version_conflict",
      },
    });
    expect(await read(raceA)).toMatchObject({
      version: 3,
      status: transferWon ? "in-progress" : "resolved",
      assigneePrincipalId: transferWon
        ? "fixture-principal-technician-b"
        : "fixture-principal-technician-a",
    });
    await checkHistory(raceA, [
      "create",
      "assign",
      "start",
      transferWon ? "reassign" : "resolve",
    ]);
    const cancellationRace = await Promise.all([
      command(raceB, "update", {
        expectedVersion: 0,
        reason: "Concurrent correction probe",
        values: corrected,
      }),
      command(raceB, "cancel", {
        expectedVersion: 0,
        reason: "Concurrent cancellation probe",
      }),
    ]);
    expect(cancellationRace.map((result) => result.status).sort()).toEqual([
      200, 409,
    ]);
    expect(
      cancellationRace.find((result) => result.status === 409)!.body.code,
    ).toBe("work_order.version_conflict");
    const correctionWon = cancellationRace[0]!.status === 200;
    expect(await read(raceB)).toMatchObject({
      version: 1,
      status: correctionWon ? "open" : "cancelled",
      title: correctionWon
        ? corrected.title
        : "Correction versus cancellation probe",
      latestResolution: null,
    });
    await checkHistory(raceB, ["create", correctionWon ? "update" : "cancel"]);
    evidence.concurrency = {
      separateRecords: true,
      reassignVersusResolve: {
        winner: transferWon ? "reassign" : "resolve",
        statuses: assignmentRace.map((result) => result.status),
      },
      correctionVersusCancel: {
        winner: correctionWon ? "update" : "cancel",
        statuses: cancellationRace.map((result) => result.status),
      },
    };

    phase("restart-replay");
    const ids = [id, duplicateId, raceA, raceB],
      beforeRestart = workOrdersFacts(preview, ids);
    const snapshots = await Promise.all(
      ids.map(async (recordId) => ({
        detail: await read(recordId),
        history: await history(recordId),
      })),
    );
    const eventCount = actions.length + duplicateActions.length + 4 + 2;
    expect(beforeRestart).toEqual({
      orders: 4,
      history: eventCount,
      audit: eventCount,
      receipts: eventCount,
      records: snapshots.map((snapshot) => ({
        version: Number(snapshot.detail.version),
        history: snapshot.history.length,
        audit: snapshot.history.length,
        receipts: snapshot.history.length,
      })),
    });
    workOrdersFactRequest(preview, ids);
    restartOwnedApi(preview);
    await ready(request, origin);
    expect(
      await api(
        recovered!.command.path,
        "dispatcher",
        "POST",
        JSON.parse(recovered!.command.body),
        recovered!.command.key,
      ),
    ).toEqual({ status: 200, body: recovered!.row });
    expect(
      await api(
        started.command.path,
        "technician-a",
        "POST",
        JSON.parse(started.command.body),
        started.command.key,
      ),
    ).toEqual({ status: 404, body: { code: "work_order.not_found" } });
    expect(workOrdersFacts(preview, ids)).toEqual(beforeRestart);
    expect(
      await Promise.all(
        ids.map(async (recordId) => ({
          detail: await read(recordId),
          history: await history(recordId),
        })),
      ),
    ).toEqual(snapshots);
    await desktop.goto(detailUrl);
    await expect(desktop.locator(".work-order-detail-status")).toContainText(
      "Resolved",
    );
    for (const report of reports)
      await expect(desktop.locator(".work-order-history")).toContainText(
        report,
      );
    await phone.reload();
    await expect(phone.locator(".work-order-report")).toContainText(
      reports[1]!,
    );
    await capture(desktop, "persisted-result");
    // Demonstrate real loaded theme tokens and keyboard focus, not screenshot existence.
    const root = desktop.locator("main.work-order-v1");
    await root.evaluate((element) =>
      element.setAttribute("data-theme", "light"),
    );
    const light = await root.evaluate((element) =>
      getComputedStyle(element).getPropertyValue("--factory-bg").trim(),
    );
    await root.evaluate((element) =>
      element.setAttribute("data-theme", "dark"),
    );
    const dark = await root.evaluate((element) =>
      getComputedStyle(element).getPropertyValue("--factory-bg").trim(),
    );
    expect(light).not.toBe(dark);
    expect(dark.length).toBeGreaterThan(0);
    await capture(desktop, "dark-result");
    await desktop
      .getByLabel("Local demo — synthetic staff", { exact: true })
      .focus();
    await desktop.keyboard.press("Tab");
    expect(
      await desktop.evaluate(() => {
        const active = document.activeElement;
        return (
          !!active &&
          active.matches(":focus-visible") &&
          getComputedStyle(active).outlineStyle !== "none" &&
          parseFloat(getComputedStyle(active).outlineWidth) >= 2
        );
      }),
    ).toBe(true);
    await capture(desktop, "keyboard-focus", [1440]);
    await desktop.goto(duplicateUrl);
    await expect(desktop.locator(".work-order-cancelled")).toBeVisible();
    expect(await compilationIdentity(request, compilationId!)).toEqual(
      immutable,
    );
    expect(await delivery.fingerprint()).toBe(delivery.publishedFingerprint);
    expect(remoteRequests).toBe(0);
    evidence.finalDatabaseFacts = beforeRestart;
    evidence.historyDigests = snapshots.map((snapshot) =>
      digest(JSON.stringify(snapshot.history)),
    );
    evidence.recordDigests = ids.map(digest);
    evidence.authoredOrders = 4;
    evidence.adversarialOrders = 2;
    evidence.sameKeyReplayAfterApiRestart = true;
    evidence.immutablePublishedAndCompilationPreserved = true;
    evidence.outcome = "business-passed-cleanup-pending";
  } catch (error) {
    failure = error;
    evidence.failure = {
      phase: activePhase,
      ...workOrdersFailure(error),
      kind:
        error instanceof Error && error.name === "TimeoutError"
          ? "timeout"
          : "assertion-or-operation-failed",
    };
    evidence.outcome = "failed";
    // Only authored generated-app screens; never the provider/Workbench page.
    for (const [name, target] of [
      ["desktop", desktop],
      ["phone", phone],
    ] as const)
      if (target && !target.isClosed())
        await target
          .screenshot({
            path: resolve(output, "failure-" + name + ".png"),
            fullPage: true,
          })
          .catch(() => undefined);
  } finally {
    releaseResponse?.();
    phase("cleanup");
    await phone?.close().catch(() => undefined);
    await desktop?.close().catch(() => undefined);
    let removed = false;
    try {
      if (preview && compilationId) {
        workOrdersFactRequest(preview, []);
        expect(preview.compilationId).toBe(compilationId);
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
        removed = true;
      }
      const outcome = workOrdersCleanup(
        !!preview,
        evidence.consumerOwnershipRecovery,
        removed,
      );
      evidence.cleanup = {
        outcome,
        ...(preview
          ? {
              previewRunId: preview.id,
              composeProjectName: preview.composeProjectName,
              resources: removed
                ? {
                    artifact: false,
                    containers: false,
                    networks: false,
                    volumes: false,
                  }
                : "unconfirmed",
            }
          : {}),
      };
      if (outcome === "cleanup_required")
        throw new Error("Owned Preview cleanup remains uncertain.");
      if (!failure) evidence.outcome = "passed";
    } catch {
      evidence.cleanup = {
        outcome: "cleanup_required",
        previewRunId: preview?.id,
        composeProjectName: preview?.composeProjectName,
        ownedRemovalObserved: removed,
      };
      evidence.outcome = "failed";
      failure ??= new Error("Owned Preview cleanup failed.");
    }
    phases.push({ name: activePhase, elapsedMs: Date.now() - phaseStartedAt });
    evidence.elapsedMs = Date.now() - startedAt;
    evidence.businessActions = businessActions;
    evidence.unintendedExternalRequests = remoteRequests;
    evidence.visualObservations = visuals;
    await writeFile(
      resolve(output, "journey.json"),
      JSON.stringify(evidence, null, 2) + "\n",
    );
  }
  if (failure)
    throw new Error(
      "Work Orders acceptance failed during " +
        String(object(evidence.failure ?? { phase: "cleanup" }).phase) +
        "; sanitized attempt evidence: " +
        attempt +
        ".",
    );
});
