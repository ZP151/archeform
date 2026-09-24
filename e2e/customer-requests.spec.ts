import {
  expect,
  test,
  type BrowserContext,
  type Page,
  type Request,
} from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  compilationIdentity,
  digest,
  object,
  ownedResources,
  type Json,
  type OwnedPreview,
} from "./helpers/content-directory";
import { stopPreview } from "./helpers/restaurant-delivery";
import {
  customerRequestsApi,
  customerRequestsApiUrl,
  customerRequestsCleanupPlan,
  customerRequestsFailure,
  customerRequestsGuard,
  customerRequestsHistorySummary,
  customerRequestsSources,
  deliverCustomerRequests,
  type CustomerRequestsActor,
} from "./helpers/customer-requests";

test.describe.configure({ mode: "serial", retries: 0 });
// Raw traces may retain command bodies, fixture sessions and provider material.
test.use({
  trace: "off",
  video: "off",
  screenshot: "off",
  serviceWorkers: "block",
});

// SOURCE ONLY until the controller independently clears the blocked execution boundary.
// Setting a variable is not authorization to bypass that boundary.
test("Customer Support Desk retains an owned mobile conversation through correction and recovery", async ({
  page,
  context,
  browser,
  request,
}, testInfo) => {
  test.setTimeout(1_800_000);
  const factoryProject = customerRequestsGuard({
    authorized: process.env.FACTORY_E2E_CUSTOMER_REQUESTS_AUTHORIZED,
    isolated: process.env.FACTORY_E2E_ISOLATED,
    factoryProject: process.env.FACTORY_E2E_FACTORY_PROJECT,
    controlPlane: process.env.FACTORY_E2E_CONTROL_PLANE_URL,
    workbench: testInfo.project.use.baseURL,
  });
  const attempt = randomUUID(),
    output = resolve(
      "generated/.customer-requests-task4/case",
      "attempt-" + attempt,
    );
  await mkdir(output, { recursive: true });
  const startedAt = Date.now(),
    phases: Json[] = [],
    visuals: Json[] = [],
    contexts: BrowserContext[] = [];
  let activePhase = "source-identity",
    phaseStarted = startedAt,
    preview: OwnedPreview | undefined,
    compilationId: string | undefined,
    desktop: Page | undefined,
    phone: Page | undefined,
    failure: unknown,
    releaseResponse: (() => void) | undefined,
    externalRequests = 0,
    businessActions = 0;
  const evidence: Json = {
    attempt,
    definitionKey: "customer-support-desk",
    definitionVersion: "1.0.0",
    runtimeFamily: "customer-requests/v1",
    caseId: "customer-support-desk-local",
    scope: "isolated-local-synthetic-people",
    authoredSelections: 1,
    modelCalls: 0,
    ordinaryUserStudies: 0,
    privateAuthentication: "not-established",
    hostedAvailability: "not-established",
    postgresRacesRollbackRestart: "separate-pending-witness",
    retainedDataUpgrade: "pending",
    readyTargetMs: 300_000,
    outerPreparation: "controller-owned; excluded from prepared-local timer",
    visualReview: "pending-image-inspection",
    outcome: "running",
    phases,
    reusedHelpers: [
      "deliverDirectory",
      "compilationIdentity",
      "ownedConsumerPreview",
      "ownedResources",
      "stopPreview",
      "directoryFailureDiagnostic",
      "verifiedConsumerEvidence",
    ],
    reusedAssetKeys: [
      "button",
      "input",
      "label",
      "select",
      "card",
      "badge",
      "compact-sidebar-navigation",
      "form-field",
      "loading-state",
      "empty-state",
      "error-state",
      "confirmation-state",
      "denial-state",
      "native-textarea",
    ],
    iconProvenance: "lucide-static@0.468.0; ISC",
    reusedSourceBaselineComparison:
      "controller-owned-frozen-baseline; no percentage claim",
  };
  const phase = (name: string) => {
    phases.push({ name: activePhase, elapsedMs: Date.now() - phaseStarted });
    activePhase = name;
    phaseStarted = Date.now();
  };
  const capture = async (
    target: Page,
    name: string,
    widths = [390, 768, 1440],
  ) => {
    const previous = target.viewportSize();
    for (const width of widths) {
      await target.setViewportSize({ width, height: 844 });
      await expect(target.locator("main.customer-request-v1")).toBeVisible();
      const geometry = await target.evaluate(() => {
        const root = document.querySelector("main.customer-request-v1")!;
        const controls = [
          ...root.querySelectorAll("button,input,select,textarea"),
        ].filter((element) => element.getClientRects().length > 0);
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
        };
      });
      expect(geometry.scrollWidth).toBeLessThanOrEqual(width + 1);
      expect(geometry.controls).toBeGreaterThan(0);
      expect(geometry.smallControls).toBe(0);
      expect(geometry.stylesheets).toBeGreaterThan(0);
      visuals.push({ name, ...geometry });
      // Only authored synthetic generated-app screens; never Home or a provider page.
      await target.screenshot({
        path: resolve(output, name + "-" + width + ".png"),
        fullPage: true,
      });
    }
    if (previous) await target.setViewportSize(previous);
  };
  const actor = async (target: Page, slot: CustomerRequestsActor) => {
    await target
      .getByLabel("Local demo · synthetic people", { exact: true })
      .selectOption("fixture-principal-" + slot);
    await expect(target.locator(".customer-request-queue")).not.toContainText(
      "Loading requests…",
    );
  };
  const freeze = (req: Request) => ({
    path: new URL(req.url()).pathname,
    method: req.method(),
    body: req.postData(),
    key: req.headers()["x-factory-idempotency-key"],
    session: req.headers()["x-factory-fixture-session"],
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
      .locator(".customer-request-editor")
      .getByRole("button", { name: label, exact: true })
      .click();
    businessActions++;
    const response = await received;
    expect(response.status()).toBe(status);
    const body = object(await response.json());
    if (status === 200 || status === 201) {
      const row = object(body.request);
      await expect(
        target.locator(".customer-request-detail-head h2"),
      ).toHaveText(String(row.subject));
      await expect(target.locator(".customer-request-event")).toHaveCount(
        Number(row.version) + 1,
      );
      await expect(target.getByRole("status")).toContainText("request");
    }
    return { body, command: freeze(response.request()) };
  };
  const openAction = async (target: Page, label: string) => {
    await target
      .locator(".customer-request-quick-actions")
      .getByRole("button", { name: label, exact: true })
      .click();
  };
  const refresh = async (target: Page) => {
    const received = target.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        /^\/api\/customer-request\/[^/]+$/u.test(
          new URL(response.url()).pathname,
        ),
    );
    await target
      .getByRole("button", { name: "Refresh requests", exact: true })
      .click();
    expect((await received).status()).toBe(200);
    await expect(target.locator(".customer-request-detail-head")).toBeVisible();
  };
  try {
    evidence.sources = await customerRequestsSources();
    expect(
      object(
        object(evidence.sources)[
          "docs/adr/adr-0084-customer-requests-family.md"
        ],
      ).digest,
    ).toBe(
      "sha256:8a78888dd9f1996588f475188b4645664c06bf9e1a49561112cdfa89c6f954c6",
    );
    const delivery = await deliverCustomerRequests(
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
    const cleanupPlan = customerRequestsCleanupPlan(
      preview,
      compilationId!,
      factoryProject,
    );
    evidence.resourceOwner = cleanupPlan;
    const origin = preview.previewUrl!,
      base = "/api/customer-request";
    customerRequestsApiUrl(origin, base);
    const immutable = await compilationIdentity(request, compilationId!);
    expect(immutable.inputGraphHash).toBe(evidence.inputGraphHash);
    expect(immutable.publishedRevisionId).toBe(evidence.publishedRevisionId);
    evidence.compilation = immutable;
    const api = (
      path: string,
      who: CustomerRequestsActor = "customer-a",
      method = "GET",
      body?: unknown,
      key?: string,
    ) => customerRequestsApi(request, origin, path, who, method, body, key);
    const pathFor = (id: string, operation?: string) =>
      base +
      "/" +
      encodeURIComponent(id) +
      (operation ? "/events/" + operation : "");
    const history = async (id: string) => {
      const result = await api(pathFor(id) + "/history?limit=50");
      expect(result.status).toBe(200);
      expect(result.body.nextBeforeVersion).toBeNull();
      return result.body.items as Json[];
    };
    const checkHistory = async (id: string, actions: string[]) => {
      const rows = await history(id);
      const summary = customerRequestsHistorySummary(
        id,
        actions.length - 1,
        rows,
      );
      expect(summary.actions).toEqual(actions);
      for (const row of rows) {
        expect(row.actorRole).toBe(
          row.actorPrincipalId === "fixture-principal-support-staff"
            ? "staff"
            : "customer",
        );
        expect([
          "fixture-principal-support-staff",
          "fixture-principal-customer-a",
        ]).toContain(row.actorPrincipalId);
        expect(
          typeof row.recordedAt === "string" &&
            Number.isFinite(Date.parse(row.recordedAt)),
        ).toBe(true);
      }
      return { rows, summary };
    };
    const restrict = async (ownedContext: BrowserContext) => {
      await ownedContext.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (
          ["http:", "https:"].includes(url.protocol) &&
          url.origin !== new URL(origin).origin
        ) {
          externalRequests++;
          await route.abort();
        } else await route.continue();
      });
    };
    // Install before opening the popup so its first navigation is also confined.
    await context.route("**/*", async (route) => {
      if (route.request().frame().page() === page) return route.continue();
      const url = new URL(route.request().url());
      if (
        ["http:", "https:"].includes(url.protocol) &&
        url.origin !== new URL(origin).origin
      ) {
        externalRequests++;
        await route.abort();
      } else await route.continue();
    });
    [desktop] = await Promise.all([
      context.waitForEvent("page"),
      page.getByRole("link", { name: "Open local app", exact: true }).click(),
    ]);
    object(evidence.consumerEntry).openAppActions = 1;
    await desktop.setViewportSize({ width: 1440, height: 844 });
    // The popup stays on the observed immutable Preview. Fresh contexts use that exact origin.
    const mobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      serviceWorkers: "block",
    });
    contexts.push(mobile);
    await restrict(mobile);
    mobile.setDefaultTimeout(45_000);
    phone = await mobile.newPage();
    phase("loading-empty-validation");
    let releaseLoading!: () => void;
    const loading = new Promise<void>((resolveLoading) => {
      releaseLoading = resolveLoading;
      releaseResponse = resolveLoading;
    });
    await phone.route(
      "**/api/customer-request?*",
      async (route) => {
        await loading;
        await route.continue();
      },
      { times: 1 },
    );
    await phone.goto(origin + "/my-requests");
    await expect(phone.getByRole("status")).toContainText("Loading requests");
    await capture(phone, "loading", [390]);
    releaseLoading();
    releaseResponse = undefined;
    await expect(
      phone.getByRole("heading", { name: "No requests yet", exact: true }),
    ).toBeVisible();
    expect((await api(base)).body.items).toEqual([]);
    evidence.readyMs = Date.now() - startedAt;
    evidence.readyTargetMet = Number(evidence.readyMs) <= 300_000;
    await capture(phone, "empty");
    await phone
      .locator(".customer-request-section-heading")
      .getByRole("button", { name: "New request", exact: true })
      .tap();
    await phone
      .getByRole("button", { name: "Start request", exact: true })
      .tap();
    await expect(phone.getByLabel("Subject", { exact: true })).toBeFocused();
    await phone.getByLabel("Subject", { exact: true }).fill("   ");
    await phone
      .getByLabel("Description", { exact: true })
      .fill("A synthetic delivery question");
    await phone
      .locator(".customer-request-editor")
      .getByRole("button", { name: "Submit request", exact: true })
      .click();
    await expect(phone.getByRole("alert")).toContainText("Enter a subject");
    await expect(phone.getByLabel("Description", { exact: true })).toHaveValue(
      "A synthetic delivery question",
    );
    await capture(phone, "validation", [390]);
    const wrong = {
      subject: "Wrong delivery date",
      description: "The synthetic order was expected on Tuesday.",
    };
    const corrected = {
      subject: "Confirm the Thursday delivery",
      description:
        "The synthetic order was expected on Thursday. " +
        "Please confirm the delivery window. ".repeat(20) +
        "Reference " +
        "x".repeat(180),
    };
    await phone.getByLabel("Subject", { exact: true }).fill(wrong.subject);
    await phone.keyboard.press("Tab");
    await expect(
      phone.getByLabel("Description", { exact: true }),
    ).toBeFocused();
    await phone
      .getByLabel("Description", { exact: true })
      .fill(wrong.description);
    const created = await save(phone, "Submit request", base, 201);
    let current = object(created.body.request);
    const id = String(current.id),
      actions = ["create"],
      detailUrl = phone.url();
    evidence.firstUsefulActionMs = Date.now() - startedAt;
    object(evidence.consumerEntry).firstUsefulActionMs =
      evidence.firstUsefulActionMs;
    evidence.firstUsefulActionTargetMet =
      Number(evidence.firstUsefulActionMs) <= 300_000;
    phase("metadata-correction-reload");
    await openAction(phone, "Correct details");
    await phone.getByLabel("Subject", { exact: true }).fill(corrected.subject);
    await phone
      .getByLabel("Description", { exact: true })
      .fill(corrected.description);
    await phone
      .getByLabel("Reason", { exact: true })
      .fill("Correct the mistaken weekday.");
    current = object(
      (await save(phone, "Save correction", pathFor(id, "update"))).body
        .request,
    );
    actions.push("update");
    await phone.reload();
    await expect(phone.locator(".customer-request-description")).toHaveText(
      corrected.description,
    );
    await expect(
      phone.locator(".customer-request-event.is-update"),
    ).toContainText(wrong.subject + " → " + corrected.subject);
    const correctedHistory = await checkHistory(id, actions);
    expect(correctedHistory.rows[0]).toMatchObject({
      beforeSubject: wrong.subject,
      afterSubject: corrected.subject,
      beforeDescription: wrong.description,
      afterDescription: corrected.description,
    });
    await capture(phone, "corrected-long-text");

    phase("staff-reply-correction");
    await actor(desktop, "support-staff");
    await desktop.getByLabel("Status", { exact: true }).selectOption("open");
    await desktop
      .getByLabel("Next reply", { exact: true })
      .selectOption("staff");
    const card = desktop
      .locator(".customer-request-card")
      .filter({ hasText: corrected.subject });
    await expect(card).toContainText("Waiting for staff reply");
    await card.focus();
    await desktop.keyboard.press("Enter");
    await expect(desktop.locator(".customer-request-description")).toHaveText(
      corrected.description,
    );
    await openAction(desktop, "Send reply");
    await desktop
      .getByLabel("Message", { exact: true })
      .fill("Delivery is scheduled for 10 am.");
    const firstReply = await save(desktop, "Send reply", pathFor(id, "reply"));
    current = object(firstReply.body.request);
    actions.push("reply");
    const replyVersion = Number(current.version);
    await desktop
      .locator(".customer-request-event.is-reply")
      .getByRole("button", { name: "Correct your message", exact: true })
      .click();
    await desktop
      .getByLabel("Message", { exact: true })
      .fill("Correction: delivery is scheduled for 11 am.");
    current = object(
      (await save(desktop, "Send reply", pathFor(id, "reply"))).body.request,
    );
    actions.push("reply");
    expect((await checkHistory(id, actions)).rows[0]).toMatchObject({
      correctsVersion: replyVersion,
      actorPrincipalId: "fixture-principal-support-staff",
    });
    await capture(desktop, "staff-corrected-reply", [1440, 768]);
    // A separate phone context proves saved state without prior component or session caches.
    const freshMobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      serviceWorkers: "block",
    });
    contexts.push(freshMobile);
    await restrict(freshMobile);
    freshMobile.setDefaultTimeout(45_000);
    await phone.close();
    phone = await freshMobile.newPage();
    await phone.goto(detailUrl);
    await expect(phone.locator(".customer-request-event.is-reply")).toHaveCount(
      2,
    );
    for (const event of await phone
      .locator(".customer-request-event.is-reply")
      .all()) {
      await expect(
        event.locator(".customer-request-event-meta strong"),
      ).toHaveText("Support staff");
      await expect(event.locator("time")).toHaveAttribute(
        "datetime",
        /\d{4}-\d{2}-\d{2}T/u,
      );
    }
    await expect(phone.locator(".customer-request-conversation")).toContainText(
      "Delivery is scheduled for 10 am.",
    );
    await expect(phone.locator(".customer-request-conversation")).toContainText(
      "Correction: delivery is scheduled for 11 am.",
    );
    await expect(phone.locator(".customer-request-conversation")).toContainText(
      "Corrects support staff's message",
    );
    await capture(phone, "fresh-phone-attribution", [390]);

    phase("uncertain-frozen-retry");
    await openAction(phone, "Send reply");
    const followup = "Please use the side entrance for the delivery.";
    await phone.getByLabel("Message", { exact: true }).fill(followup);
    let frozen: ReturnType<typeof freeze> | undefined,
      committed: Json | undefined;
    let signalCommit!: (value: boolean) => void;
    const didCommit = new Promise<boolean>((resolveCommit) => {
      signalCommit = resolveCommit;
    });
    const hold = new Promise<void>((resolveHold) => {
      releaseResponse = resolveHold;
    });
    await phone.route(
      "**" + pathFor(id, "reply"),
      async (route) => {
        try {
          frozen = freeze(route.request());
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
          await route.abort("failed");
        } catch {
          signalCommit(false);
          await route.abort().catch(() => undefined);
        }
      },
      { times: 1 },
    );
    await phone
      .locator(".customer-request-editor")
      .getByRole("button", { name: "Send reply", exact: true })
      .click();
    businessActions++;
    expect(await didCommit).toBe(true);
    await expect(
      phone
        .locator(".customer-request-editor")
        .getByRole("button", { name: "Saving…", exact: true }),
    ).toBeDisabled();
    releaseResponse!();
    releaseResponse = undefined;
    await expect(phone.getByRole("alert")).toContainText(
      "could not confirm whether this change was saved",
    );
    await expect(phone.getByLabel("Message", { exact: true })).toHaveValue(
      followup,
    );
    await expect(
      phone
        .locator(".customer-request-editor")
        .getByRole("button", { name: "Send reply", exact: true }),
    ).toBeDisabled();
    await capture(phone, "uncertain-write", [390, 768]);
    const beforeRetry = await history(id);
    const retried = phone.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === pathFor(id, "reply"),
    );
    await phone
      .getByRole("button", { name: "Try again safely", exact: true })
      .tap();
    businessActions++;
    const retriedResponse = await retried;
    expect(retriedResponse.status()).toBe(200);
    expect(freeze(retriedResponse.request())).toEqual(frozen);
    expect(object(await retriedResponse.json())).toEqual(committed);
    expect(await history(id)).toEqual(beforeRetry);
    current = object(committed!.request);
    actions.push("reply");
    await expect(phone.locator(".customer-request-event")).toHaveCount(
      actions.length,
    );
    evidence.uncertainWrite = {
      exactFrozenRetry: true,
      extraEvents: 0,
      commandDigest: digest(JSON.stringify(frozen)),
      resultDigest: digest(JSON.stringify(committed)),
    };
    const followupVersion = Number(current.version);
    await phone
      .locator(".customer-request-event.is-reply")
      .filter({ hasText: followup })
      .getByRole("button", { name: "Correct your message", exact: true })
      .tap();
    await phone
      .getByLabel("Message", { exact: true })
      .fill("Correction: use the front entrance.");
    current = object(
      (await save(phone, "Send reply", pathFor(id, "reply"))).body.request,
    );
    actions.push("reply");
    expect((await checkHistory(id, actions)).rows[0]).toMatchObject({
      correctsVersion: followupVersion,
      actorPrincipalId: "fixture-principal-customer-a",
    });

    phase("stale-correction-reapply");
    await openAction(phone, "Correct details");
    const revisedSubject = "Thursday delivery — front entrance";
    await phone.getByLabel("Subject", { exact: true }).fill(revisedSubject);
    await phone
      .getByLabel("Reason", { exact: true })
      .fill("Make the corrected entrance easy to find.");
    await refresh(desktop);
    await openAction(desktop, "Send reply");
    await desktop
      .getByLabel("Message", { exact: true })
      .fill("We have recorded the front entrance.");
    current = object(
      (await save(desktop, "Send reply", pathFor(id, "reply"))).body.request,
    );
    actions.push("reply");
    const stale = await save(
      phone,
      "Save correction",
      pathFor(id, "update"),
      409,
    );
    expect(stale.body).toEqual({ code: "customer_request.version_conflict" });
    await expect(phone.locator(".customer-request-recovery")).toContainText(
      "Saved request has changed",
    );
    await expect(phone.locator(".customer-request-detail-head h2")).toHaveText(
      corrected.subject,
    );
    await expect(phone.getByLabel("Subject", { exact: true })).toHaveValue(
      revisedSubject,
    );
    await expect(phone.locator(".customer-request-conversation")).toContainText(
      "We have recorded the front entrance.",
    );
    await capture(phone, "stale-draft", [390, 768]);
    await phone
      .getByRole("button", {
        name: "Reapply draft to latest saved request",
        exact: true,
      })
      .tap();
    const reapplied = await save(
      phone,
      "Save correction",
      pathFor(id, "update"),
    );
    expect(reapplied.command.key === stale.command.key).toBe(false);
    expect(object(JSON.parse(reapplied.command.body!)).expectedVersion).toBe(
      current.version,
    );
    current = object(reapplied.body.request);
    actions.push("update");
    evidence.staleRecovery = {
      rejectedWrites: 1,
      retainedDraft: true,
      consciouslyReapplied: true,
      refreshedExpectedVersion: true,
    };

    phase("resolve-reopen-resolve");
    const resolution = async (message: string) => {
      await refresh(desktop!);
      await openAction(desktop!, "Resolve request");
      await expect(
        desktop!.locator(".customer-request-form-hint"),
      ).toContainText("visible to the customer");
      await desktop!
        .getByLabel("Resolution message", { exact: true })
        .fill(message);
      current = object(
        (await save(desktop!, "Resolve request", pathFor(id, "complete"))).body
          .request,
      );
      actions.push("complete");
      await phone!.reload();
      await expect(
        phone!.locator(
          ".customer-request-detail-head .customer-request-status",
        ),
      ).toHaveText("Resolved");
      await expect(
        phone!.locator(".customer-request-event.is-complete").last(),
      ).toContainText(message);
    };
    await resolution(
      "The Thursday 11 am delivery is confirmed for the front entrance.",
    );
    await capture(phone, "first-resolution", [390]);
    await openAction(phone, "Reopen request");
    await phone
      .getByLabel("Reason", { exact: true })
      .fill("The entrance is closed until noon; please confirm a later time.");
    current = object(
      (await save(phone, "Reopen request", pathFor(id, "reopen"))).body.request,
    );
    actions.push("reopen");
    await expect(
      phone.locator(".customer-request-detail-head .customer-request-status"),
    ).toHaveText("Open");
    expect(object((await api(pathFor(id))).body.latestReply).historical).toBe(
      true,
    );
    await refresh(desktop);
    await openAction(desktop, "Send reply");
    await desktop
      .getByLabel("Message", { exact: true })
      .fill("We can deliver at 1 pm instead.");
    current = object(
      (await save(desktop, "Send reply", pathFor(id, "reply"))).body.request,
    );
    actions.push("reply");
    await resolution("The Thursday delivery is now confirmed for 1 pm.");
    await expect(
      phone.locator(".customer-request-event.is-complete"),
    ).toHaveCount(2);
    await expect(
      phone.locator(".customer-request-event.is-reopen"),
    ).toContainText("entrance is closed until noon");
    await capture(phone, "second-resolution");
    const resolved = await checkHistory(id, actions);

    phase("mistaken-request-terminal-cancel");
    await phone
      .getByRole("button", { name: "Back to requests", exact: true })
      .tap();
    await phone
      .locator(".customer-request-section-heading")
      .getByRole("button", { name: "New request", exact: true })
      .tap();
    await phone
      .getByRole("button", { name: "Start request", exact: true })
      .tap();
    await phone
      .getByLabel("Subject", { exact: true })
      .fill("Mistaken duplicate request");
    await phone
      .getByLabel("Description", { exact: true })
      .fill("Created twice by mistake in this synthetic demo.");
    const mistaken = await save(phone, "Submit request", base, 201),
      mistakenId = String(object(mistaken.body.request).id);
    await openAction(phone, "Cancel request");
    await expect(phone.locator(".customer-request-form-hint")).toContainText(
      "retains its history",
    );
    await phone
      .getByLabel("Reason", { exact: true })
      .fill("This request was a duplicate.");
    await capture(phone, "cancellation-confirmation", [390]);
    const cancellation = await save(
      phone,
      "Cancel request",
      pathFor(mistakenId, "cancel"),
    );
    await phone.reload();
    await expect(
      phone.locator(".customer-request-detail-head .customer-request-status"),
    ).toHaveText("Cancelled");
    await expect(
      phone.locator(".customer-request-quick-actions button"),
    ).toHaveCount(0);
    await expect(phone.locator(".customer-request-conversation")).toContainText(
      "This request was a duplicate.",
    );
    const cancelled = await checkHistory(mistakenId, ["create", "cancel"]);
    for (const [operation, body] of [
      [
        "reopen",
        { expectedVersion: 1, reason: "Attempt to reopen cancelled request" },
      ],
      [
        "reply",
        {
          expectedVersion: 1,
          message: "Attempt to reply to cancelled request",
          correctsVersion: null,
        },
      ],
    ] as const) {
      const denied = await api(
        pathFor(mistakenId, operation),
        "customer-a",
        "POST",
        body,
        randomUUID(),
      );
      expect(denied).toEqual({
        status: 409,
        body: { code: "customer_request.state_conflict" },
      });
    }
    expect(await history(mistakenId)).toEqual(cancelled.rows);
    await capture(phone, "terminal-cancellation", [390, 768]);

    phase("same-role-denial-cache-clear");
    await actor(phone, "customer-b");
    await expect(
      phone.getByRole("heading", { name: "No requests yet", exact: true }),
    ).toBeVisible();
    for (const text of [
      revisedSubject,
      "Mistaken duplicate request",
      "Thursday delivery is now confirmed",
      "This request was a duplicate",
    ])
      await expect(phone.locator("main")).not.toContainText(text);
    expect((await api(base, "customer-b")).body.items).toEqual([]);
    let deniedCount = 0;
    for (const recordId of [id, mistakenId]) {
      for (const suffix of ["", "/history?limit=50"]) {
        expect(await api(pathFor(recordId) + suffix, "customer-b")).toEqual({
          status: 404,
          body: { code: "customer_request.not_found" },
        });
        deniedCount++;
      }
      const stolen = recordId === id ? frozen! : cancellation.command;
      const replay = await api(
        stolen.path,
        "customer-b",
        "POST",
        JSON.parse(stolen.body!),
        stolen.key,
      );
      expect(replay).toEqual({
        status: 404,
        body: { code: "customer_request.not_found" },
      });
      deniedCount++;
      for (const [operation, body] of [
        [
          "update",
          {
            expectedVersion: recordId === id ? current.version : 1,
            reason: "Foreign correction",
            values: {
              subject: "Foreign subject",
              description: "Foreign description",
            },
          },
        ],
        [
          "reply",
          {
            expectedVersion: recordId === id ? current.version : 1,
            message: "Foreign message correction",
            correctsVersion: recordId === id ? followupVersion : 0,
          },
        ],
      ] as const) {
        expect(
          await api(
            pathFor(recordId, operation),
            "customer-b",
            "POST",
            body,
            randomUUID(),
          ),
        ).toEqual({
          status: 404,
          body: { code: "customer_request.not_found" },
        });
        deniedCount++;
      }
    }
    await phone.goto(detailUrl);
    await expect(phone.getByRole("alert")).toContainText("no longer available");
    await expect(phone.locator(".customer-request-event")).toHaveCount(0);
    await expect(phone.locator("main")).not.toContainText(revisedSubject);
    await capture(phone, "foreign-request-denied", [390, 768]);
    await phone.reload();
    await expect(phone.getByRole("alert")).toContainText("no longer available");
    await expect(phone.locator(".customer-request-event")).toHaveCount(0);

    phase("read-error-and-principal-switch-recovery");
    await phone.route(
      "**/api/customer-request?*",
      (route) =>
        route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ code: "customer_request.unavailable" }),
        }),
      { times: 1 },
    );
    await phone.goto(origin + "/my-requests");
    await expect(
      phone.getByRole("heading", { name: "Requests unavailable", exact: true }),
    ).toBeVisible();
    await capture(phone, "read-error", [390, 768, 1440]);
    await phone
      .getByRole("button", { name: "Refresh requests", exact: true })
      .tap();
    await expect(
      phone.getByRole("heading", { name: "No requests yet", exact: true }),
    ).toBeVisible();
    await actor(phone, "customer-a");
    await phone
      .locator(".customer-request-section-heading")
      .getByRole("button", { name: "New request", exact: true })
      .tap();
    await phone
      .getByRole("button", { name: "Start request", exact: true })
      .tap();
    const startControl = phone.getByLabel("Subject", { exact: true });
    await expect(startControl).toBeFocused();
    await phone
      .getByRole("button", { name: "Close editor", exact: true })
      .click();
    await expect(
      phone.getByRole("button", { name: "Start request", exact: true }),
    ).toBeFocused();
    await phone.keyboard.press("Enter");
    await startControl.fill("Unsent draft owned by Customer A");
    await phone
      .getByLabel("Description", { exact: true })
      .fill("This draft must disappear on a principal switch.");
    // This separate transport failure never reaches the server. It tests discarding
    // the in-memory uncertain command on a principal switch, not persistence.
    let switchedPosts = 0;
    const countPost = (req: Request) => {
      if (req.method() === "POST" && new URL(req.url()).pathname === base)
        switchedPosts++;
    };
    phone.on("request", countPost);
    await phone.route("**" + base, (route) => route.abort("failed"), {
      times: 1,
    });
    await phone
      .locator(".customer-request-editor")
      .getByRole("button", { name: "Submit request", exact: true })
      .click();
    businessActions++;
    await expect(
      phone.getByRole("button", { name: "Try again safely", exact: true }),
    ).toBeVisible();
    await actor(phone, "customer-b");
    await expect(
      phone.getByRole("button", { name: "Try again safely", exact: true }),
    ).toHaveCount(0);
    await expect(phone.locator(".customer-request-editor")).toHaveCount(0);
    await expect(phone.locator(".customer-request-event")).toHaveCount(0);
    await expect(
      phone.getByRole("heading", { name: "No requests yet", exact: true }),
    ).toBeVisible();
    await expect(phone.locator("main")).not.toContainText(
      "Unsent draft owned by Customer A",
    );
    await phone.reload();
    await expect(
      phone.getByRole("heading", { name: "No requests yet", exact: true }),
    ).toBeVisible();
    expect(switchedPosts).toBe(1);
    phone.off("request", countPost);
    expect((await api(base, "customer-b")).body.items).toEqual([]);
    expect(((await api(base)).body.items as Json[]).length).toBe(2);
    await capture(phone, "principal-switch-cleared", [390, 768, 1440]);
    evidence.principalSwitchRecovery = {
      cachedForeignEvents: 0,
      draftDiscarded: true,
      crossPrincipalReplays: 0,
    };
    evidence.deniedAccess = deniedCount;
    expect(await history(id)).toEqual(resolved.rows);
    expect(await history(mistakenId)).toEqual(cancelled.rows);
    expect(await delivery.fingerprint()).toBe(delivery.publishedFingerprint);
    expect(await compilationIdentity(request, compilationId!)).toEqual(
      immutable,
    );
    evidence.history = [resolved.summary, cancelled.summary];
    expect(externalRequests).toBe(0);
    expect(object(evidence.consumerEntry).technicalActions).toBe(0);
    evidence.technicalHandoffs = object(
      evidence.consumerEntry,
    ).technicalActions;
    evidence.immutablePublishedAndCompilationPreserved = true;
    evidence.outcome = "business-passed-cleanup-pending";
  } catch (error) {
    failure = error;
    evidence.failure = {
      phase: activePhase,
      ...customerRequestsFailure(error),
      kind:
        error instanceof Error && error.name === "TimeoutError"
          ? "timeout"
          : "assertion-or-operation-failed",
    };
    evidence.outcome = "failed";
  } finally {
    releaseResponse?.();
    phase("cleanup");
    for (const ownedContext of contexts)
      await ownedContext.close().catch(() => undefined);
    await desktop?.close().catch(() => undefined);
    let removed = false;
    try {
      if (preview && compilationId) {
        evidence.cleanupPlan = customerRequestsCleanupPlan(
          preview,
          compilationId,
          factoryProject,
        );
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
      const uncertain =
        evidence.consumerOwnershipRecovery === "cleanup-required" ||
        (!!preview && !removed);
      evidence.cleanup = {
        outcome: uncertain
          ? "cleanup_required"
          : preview
            ? "removed"
            : "no-preview-created",
        removed,
      };
      if (uncertain)
        throw new Error("Customer Requests cleanup remains uncertain.");
      if (!failure) evidence.outcome = "passed";
    } catch {
      evidence.cleanup = { outcome: "cleanup_required", removed };
      failure ??= new Error("Customer Requests owned cleanup failed.");
      evidence.outcome = "failed";
    }
    phases.push({ name: activePhase, elapsedMs: Date.now() - phaseStarted });
    evidence.elapsedMs = Date.now() - startedAt;
    evidence.businessActions = businessActions;
    evidence.unintendedExternalRequests = externalRequests;
    evidence.visualObservations = visuals;
    await writeFile(
      resolve(output, "journey.json"),
      JSON.stringify(evidence, null, 2) + "\n",
    );
  }
  if (failure)
    throw new Error(
      "Customer Requests acceptance failed; sanitized attempt evidence: " +
        attempt +
        ".",
    );
});
