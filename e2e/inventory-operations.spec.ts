import { expect, test, type Page } from "@playwright/test";
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
  deliverInventory,
  inventoryApi,
  inventoryFacts,
  inventoryFailureDiagnostic,
  inventoryPhaseEvent,
  inventorySourceIdentity,
} from "./helpers/inventory-operations";

test.describe.configure({ mode: "serial", retries: 0 });

test("Supplies Stockroom completes immutable delivery, stock corrections and exact recovery", async ({
  page,
  context,
  request,
}, testInfo) => {
  test.setTimeout(1_800_000);
  context.setDefaultTimeout(45_000);
  // Guard all application and Docker access before creating the attempt.
  expect(process.env.FACTORY_E2E_ISOLATED).toBe("1");
  const factoryProject = process.env.FACTORY_E2E_FACTORY_PROJECT!;
  expect(factoryProject).toMatch(/^factory-t10-[a-z0-9-]+$/u);
  expect(process.env.FACTORY_E2E_CONTROL_PLANE_URL).toMatch(
    /^http:\/\/127\.0\.0\.1:\d+$/u,
  );
  expect(testInfo.project.use.baseURL).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/u);
  const attempt = randomUUID(),
    output = resolve(
      "docs/acceptance/evidence/inventory-operations",
      "attempt-" + attempt,
    );
  await mkdir(output, { recursive: true });
  const startedAt = Date.now();
  let activePhase = "source-identity",
    phaseStartedAt = startedAt;
  const phases: { name: string; elapsedMs: number }[] = [];
  const evidence: Json = {
    attempt,
    definitionKey: "supplies-stockroom",
    runtimeFamily: "inventory-operations/v1",
    caseId: "supplies-stockroom-local",
    scope: "isolated-local-fixture-session",
    authoredSelections: 1,
    authoredItems: 2,
    modelCalls: 0,
    ordinaryUserStudies: 0,
    technicalHandoffs: 0,
    inRunManualRescues: 0,
    readyTargetMs: 300_000,
    outerPreparation: "root-owned; excluded from prepared-local timer",
    outcome: "running",
    visualReview: "pending-image-inspection",
    phases,
  };
  console.info(JSON.stringify(inventoryPhaseEvent(attempt, activePhase)));
  const phase = (name: string) => {
    console.info(JSON.stringify(inventoryPhaseEvent(attempt, name)));
    phases.push({ name: activePhase, elapsedMs: Date.now() - phaseStartedAt });
    activePhase = name;
    phaseStartedAt = Date.now();
  };
  let preview: OwnedPreview | undefined,
    compilationId: string | undefined,
    generated: Page | undefined,
    businessError: unknown;
  let releaseResponse: (() => void) | undefined;
  const capture = async (name: string, widths = [390, 768, 1440]) => {
    for (const width of widths) {
      await generated!.setViewportSize({ width, height: 844 });
      await expect(generated!.locator("main.inventory-v1")).toBeVisible();
      const geometry = await generated!.evaluate(() => ({
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        media: document.querySelectorAll(
          "main.inventory-v1 img,main.inventory-v1 video",
        ).length,
        smallControls: [
          ...document.querySelectorAll(
            "main.inventory-v1 button,main.inventory-v1 a,main.inventory-v1 input,main.inventory-v1 select",
          ),
        ].filter((element) => {
          const r = element.getBoundingClientRect();
          return (
            r.width > 0 && r.height > 0 && (r.width < 43.5 || r.height < 43.5)
          );
        }).length,
      }));
      expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.width + 1);
      expect(geometry.smallControls).toBe(0);
      expect(geometry.media).toBe(0);
      await generated!.screenshot({
        path: resolve(output, name + "-" + width + ".png"),
        fullPage: true,
      });
    }
  };
  const saved = async (
    label: string,
    method: string,
    path: string,
    editor = true,
  ) => {
    const waiting = generated!.waitForResponse(
      (response) =>
        response.request().method() === method &&
        new URL(response.url()).pathname === path,
    );
    const target = editor
      ? generated!.locator(".inventory-editor")
      : generated!;
    await target.getByRole("button", { name: label, exact: true }).click();
    const response = await waiting;
    expect(response.status()).toBe(method === "PATCH" ? 200 : 201);
    const result = object(await response.json());
    await expect(generated!.locator(".inventory-notice")).toContainText(
      "Saved balance:",
    );
    return result;
  };
  const fillMovement = async (
    label: string,
    amount: string,
    reason: string,
  ) => {
    await generated!.getByRole("button", { name: label, exact: true }).click();
    await expect(generated!.locator("#inventory-amount")).toBeFocused();
    await generated!.locator("#inventory-amount").fill(amount);
    await generated!.getByLabel("Reason", { exact: true }).fill(reason);
  };
  const back = async () => {
    await generated!
      .getByRole("button", { name: "Back to stock", exact: true })
      .click();
    await expect(generated!.locator(".inventory-record")).toHaveCount(2);
  };
  try {
    evidence.sources = await inventorySourceIdentity();
    expect(
      object(evidence.sources)[
        "docs/adr/adr-0076-inventory-operations-family.md"
      ],
    ).toBe(
      "sha256:b73f303c780e371ef9afa146b5940153fa84d9e5e87b433c16bf91aaad446800",
    );
    const delivery = await deliverInventory(
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
    const origin = preview.previewUrl!,
      entity = delivery.profile.itemEntity,
      base = "/api/" + entity;
    const immutable = await compilationIdentity(request, compilationId!);
    expect(immutable.inputGraphHash).toBe(evidence.inputGraphHash);
    evidence.compilation = immutable;
    phase("empty-create");
    const empty = inventoryFacts(preview);
    expect(empty).toEqual({
      items: 0,
      movements: 0,
      audit: 0,
      receipts: 0,
      effects: 0,
      records: [],
    });
    evidence.initialDatabaseFacts = empty;
    expect(
      (await inventoryApi(request, origin, base, "observer")).body.records,
    ).toEqual([]);
    generated = await context.newPage();
    let remoteRequests = 0;
    await generated.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (
        ["http:", "https:"].includes(url.protocol) &&
        url.origin !== new URL(origin).origin
      ) {
        remoteRequests++;
        await route.abort();
      } else await route.continue();
    });
    await generated.goto(origin);
    await expect(generated.locator("main.inventory-v1")).toBeVisible({
      timeout: 120_000,
    });
    await generated
      .getByLabel("Demo role", { exact: true })
      .selectOption("stockkeeper");
    await expect(
      generated.getByRole("heading", {
        name: "Your stockroom starts here",
        exact: true,
      }),
    ).toBeVisible();
    evidence.readyMs = Date.now() - startedAt;
    evidence.readyTargetMet = Number(evidence.readyMs) <= 300_000;
    await capture("empty", [390]);
    expect(
      (await generated
        .locator(".inventory-empty")
        .getByRole("link", { name: "Add item", exact: true })
        .boundingBox())!.y,
    ).toBeLessThan(844);
    const create = async (sku: string, name: string) => {
      await generated!
        .getByRole("link", { name: "Add item", exact: true })
        .first()
        .click();
      await expect(generated!.getByLabel("SKU", { exact: true })).toBeFocused();
      await generated!.getByLabel("SKU", { exact: true }).fill(sku);
      await generated!.getByLabel("Item name", { exact: true }).fill(name);
      if (sku === "cable-usb-c") await capture("create-input", [390, 1440]);
      return saved("Add item", "POST", base);
    };
    await generated.setViewportSize({ width: 1440, height: 844 });
    const cable = await create("cable-usb-c", "USB-C charging cable");
    expect(cable).toMatchObject({
      sku: "CABLE-USB-C",
      name: "USB-C charging cable",
      quantity: 0,
      unit: "each",
      version: 0,
    });
    const cableId = String(cable.id),
      cablePath = base + "/" + encodeURIComponent(cableId),
      detailUrl = generated.url();
    await generated
      .getByRole("button", { name: "Back to stock", exact: true })
      .click();
    const pad = await create("PAD-A5", "A5 writing pad");
    expect(pad).toMatchObject({ quantity: 0, unit: "each", version: 0 });
    const padId = String(pad.id);
    expect(padId).not.toBe(cableId);
    await back();
    await capture("two-authored-items");
    await generated.setViewportSize({ width: 390, height: 844 });
    await generated.evaluate(() => window.scrollTo(0, 0));
    for (const row of await generated.locator(".inventory-record").all()) {
      const rect = await row.boundingBox();
      expect(rect!.y).toBeGreaterThanOrEqual(0);
      expect(rect!.y + rect!.height).toBeLessThanOrEqual(844);
    }
    await generated
      .getByRole("link", { name: "USB-C charging cable", exact: true })
      .click();
    expect(new URL(generated.url()).searchParams.get("id")).toBe(cableId);
    expect(
      (
        await inventoryApi(
          request,
          origin,
          cablePath + "/movements",
          "stockkeeper",
        )
      ).body.records,
    ).toEqual([]);

    phase("uncertain-retry");
    await generated.setViewportSize({ width: 1440, height: 844 });
    await fillMovement("Receive stock", "10", "Stockroom delivery");
    await expect(generated.locator(".inventory-proposal")).toHaveText(
      "Proposed balance: 10 each.",
    );
    await capture("receive-input");
    const receivePath = cablePath + "/movements/receive";
    let interrupted: { key: string; body: string } | undefined,
      received: Json | undefined;
    let responseFailed = false;
    let notifyCommitted!: () => void;
    const committed = new Promise<void>((resolveGate) => {
        notifyCommitted = resolveGate;
      }),
      release = new Promise<void>((resolveGate) => {
        releaseResponse = resolveGate;
      });
    const pattern = "**" + receivePath;
    await generated.route(pattern, async (route) => {
      if (route.request().method() !== "POST" || interrupted)
        return route.fallback();
      interrupted = {
        key: route.request().headers()["x-factory-idempotency-key"]!,
        body: route.request().postData()!,
      };
      try {
        const results = await Promise.all([route.fetch(), route.fetch()]);
        for (const result of results) expect(result.status()).toBe(201);
        received = object(await results[0]!.json());
        expect(await results[1]!.json()).toEqual(received);
      } catch {
        responseFailed = true;
      } finally {
        notifyCommitted();
      }
      await release;
      await route.abort("connectionreset");
    });
    await generated
      .locator(".inventory-editor")
      .getByRole("button", { name: "Receive stock", exact: true })
      .click();
    try {
      await committed;
      expect(responseFailed).toBe(false);
      expect(received).toBeDefined();
      await expect(
        generated
          .locator(".inventory-editor")
          .getByRole("button", { name: "Receive stock", exact: true }),
      ).toBeDisabled();
      await capture("pending-receive", [1440]);
    } finally {
      releaseResponse!();
    }
    await expect(
      generated.getByRole("button", { name: "Retry same change", exact: true }),
    ).toBeVisible();
    await expect(generated.getByLabel("Reason", { exact: true })).toHaveValue(
      "Stockroom delivery",
    );
    await expect(generated.locator("#inventory-amount")).toBeDisabled();
    await capture("uncertain-retry", [390, 1440]);
    const retryWaiting = generated.waitForRequest(
      (req) =>
        req.method() === "POST" && new URL(req.url()).pathname === receivePath,
    );
    expect(
      await saved("Retry same change", "POST", receivePath, false),
    ).toEqual(received);
    const retry = await retryWaiting;
    expect(retry.headers()["x-factory-idempotency-key"]).toBe(interrupted!.key);
    expect(retry.postData()).toBe(interrupted!.body);
    await generated.unroute(pattern);
    expect(inventoryFacts(preview, [cableId, padId])).toMatchObject({
      items: 2,
      movements: 1,
      audit: 3,
      receipts: 3,
      effects: 1,
      records: [
        {
          quantity: 10,
          version: 1,
          movements: 1,
          itemAudit: 1,
          movementAudit: 1,
          receipts: 2,
          effects: 1,
        },
        { quantity: 0, version: 0, movements: 0, itemAudit: 1, receipts: 1 },
      ],
    });

    phase("receive-issue-adjust");
    await generated.setViewportSize({ width: 390, height: 844 });
    await generated.evaluate(() => window.scrollTo(0, 0));
    const issueControl = await generated
      .getByRole("button", { name: "Issue stock", exact: true })
      .boundingBox();
    expect(issueControl!.y).toBeGreaterThanOrEqual(0);
    expect(issueControl!.y + issueControl!.height).toBeLessThanOrEqual(844);
    await capture("phone-available", [390]);
    await fillMovement("Issue stock", "3", "Supplies for the team");
    await expect(generated.locator(".inventory-proposal")).toHaveText(
      "Proposed balance: 7 each.",
    );
    await capture("issue-input", [390]);
    const issued = await saved(
      "Issue stock",
      "POST",
      cablePath + "/movements/issue",
    );
    expect(object(issued.item)).toMatchObject({
      id: cableId,
      quantity: 7,
      version: 2,
    });
    await generated.setViewportSize({ width: 1440, height: 844 });
    await generated
      .locator(".inventory-movements li")
      .filter({ hasText: "Stockroom delivery" })
      .getByRole("button", { name: "Correct this movement", exact: true })
      .click();
    await generated.getByLabel("Adjustment (each)", { exact: true }).fill("-1");
    await generated
      .getByLabel("Reason", { exact: true })
      .fill("One cable missing from original delivery");
    await expect(generated.locator(".inventory-proposal")).toHaveText(
      "Proposed balance: 6 each.",
    );
    await capture("adjust-input", [1440]);
    const adjusted = await saved(
      "Adjust stock",
      "POST",
      cablePath + "/movements/adjust",
    );
    expect(object(adjusted.item)).toMatchObject({
      id: cableId,
      quantity: 6,
      version: 3,
    });
    expect(object(adjusted.movement).correctionOf).toBe(
      object(received!.movement).id,
    );
    await expect(generated.locator(".inventory-movements li")).toHaveCount(3);
    await capture("main-result");
    evidence.firstCompletedJobMs = Date.now() - startedAt;
    const history = await inventoryApi(
      request,
      origin,
      cablePath + "/movements",
      "stockkeeper",
    );
    const originalMovements = history.body.records as Json[];
    expect(
      originalMovements.map((row) => [
        row.kind,
        row.delta,
        row.beforeQuantity,
        row.afterQuantity,
      ]),
    ).toEqual([
      ["adjust", -1, 7, 6],
      ["issue", -3, 10, 7],
      ["receive", 10, 0, 10],
    ]);
    expect(new Set(originalMovements.map((row) => row.id)).size).toBe(3);
    expect(
      originalMovements.every(
        (row) =>
          row.stockItem === cableId &&
          row.actorRole === "stockkeeper" &&
          row.status === "recorded" &&
          Number.isFinite(Date.parse(String(row.recordedAt))),
      ),
    ).toBe(true);
    evidence.mainJobFacts = inventoryFacts(preview, [cableId, padId]);
    expect(evidence.mainJobFacts).toMatchObject({
      items: 2,
      movements: 3,
      audit: 5,
      receipts: 5,
      effects: 3,
      records: [
        { quantity: 6, version: 3, movementAudit: 3, effects: 3 },
        { quantity: 0, version: 0, movements: 0 },
      ],
    });

    phase("find-read");
    await back();
    await generated.setViewportSize({ width: 390, height: 844 });
    await generated
      .getByLabel("Search stock", { exact: true })
      .fill("cable-usb");
    await generated
      .getByRole("button", { name: "Search", exact: true })
      .click();
    await expect(generated.locator(".inventory-record")).toHaveCount(1);
    await capture("search", [390]);
    await generated.getByLabel("Search stock", { exact: true }).fill("%_");
    await generated
      .getByRole("button", { name: "Search", exact: true })
      .click();
    await expect(
      generated.getByRole("heading", {
        name: "No matching items",
        exact: true,
      }),
    ).toBeVisible();
    await capture("no-results", [390, 768]);
    await generated
      .getByRole("button", { name: "Clear filters", exact: true })
      .click();
    await expect(generated.locator(".inventory-record")).toHaveCount(2);
    const firstPage = await inventoryApi(
        request,
        origin,
        base + "?limit=1&offset=0",
        "observer",
      ),
      secondPage = await inventoryApi(
        request,
        origin,
        base + "?limit=1&offset=1",
        "observer",
      );
    expect(firstPage.body).toMatchObject({
      limit: 1,
      offset: 0,
      hasMore: true,
    });
    expect(secondPage.body).toMatchObject({
      limit: 1,
      offset: 1,
      hasMore: false,
    });
    expect(object((firstPage.body.records as Json[])[0]).id).toBe(cableId);
    expect(object((secondPage.body.records as Json[])[0]).id).toBe(padId);
    expect(
      (await inventoryApi(request, origin, base + "?q=%25_", "observer")).body
        .records,
    ).toEqual([]);
    const historyPage = await inventoryApi(
      request,
      origin,
      cablePath + "/movements?limit=1&offset=1",
      "stockkeeper",
    );
    expect(historyPage.body).toMatchObject({
      limit: 1,
      offset: 1,
      hasMore: true,
    });
    expect(historyPage.body.records).toEqual([originalMovements[1]]);
    await generated
      .getByRole("link", { name: "USB-C charging cable", exact: true })
      .click();

    phase("over-issue");
    const noWriteBefore = inventoryFacts(preview, [cableId, padId]);
    await fillMovement("Issue stock", "7", "Too many cables requested");
    const insufficient = generated.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === cablePath + "/movements/issue",
    );
    await generated
      .locator(".inventory-editor")
      .getByRole("button", { name: "Issue stock", exact: true })
      .click();
    expect((await insufficient).status()).toBe(409);
    await expect(generated.getByRole("alert")).toContainText(
      "not enough stock",
    );
    await expect(generated.locator("#inventory-amount")).toHaveValue("7");
    await expect(generated.getByLabel("Reason", { exact: true })).toHaveValue(
      "Too many cables requested",
    );
    expect(inventoryFacts(preview, [cableId, padId])).toEqual(noWriteBefore);
    await capture("insufficient-stock", [390, 1440]);
    await generated
      .getByRole("button", { name: "Cancel", exact: true })
      .click();

    phase("name-correction");
    await generated.setViewportSize({ width: 1440, height: 844 });
    await generated
      .getByRole("button", { name: "Edit name", exact: true })
      .click();
    const correctedName = "USB-C charging cable (1 metre)";
    await generated
      .getByLabel("Item name", { exact: true })
      .fill(correctedName);
    const corrected = await saved("Save name", "PATCH", cablePath);
    expect(corrected).toMatchObject({
      id: cableId,
      sku: "CABLE-USB-C",
      name: correctedName,
      quantity: 6,
      version: 4,
    });
    expect(
      (
        await inventoryApi(
          request,
          origin,
          cablePath + "/movements",
          "stockkeeper",
        )
      ).body.records,
    ).toEqual(originalMovements);
    await capture("corrected-result");

    phase("stale-concurrency");
    // Separate authored acceptance probe: flagship balances and history stay intact.
    const probeCreated = await inventoryApi(
      request,
      origin,
      base,
      "stockkeeper",
      "POST",
      { values: { sku: "RACE-PROBE", name: "Concurrency acceptance probe" } },
      "probe-create-" + attempt,
    );
    expect(probeCreated.status).toBe(201);
    const probeId = String(probeCreated.body.id),
      probePath = base + "/" + encodeURIComponent(probeId);
    evidence.authoredItems = 3;
    evidence.adversarialItems = 1;
    expect(
      (
        await inventoryApi(
          request,
          origin,
          probePath + "/movements/receive",
          "stockkeeper",
          "POST",
          {
            expectedVersion: 0,
            quantity: 10,
            reason: "Prepare isolated concurrency probe",
          },
          "probe-receive-" + attempt,
        )
      ).status,
    ).toBe(201);
    const probeUrl = new URL(detailUrl);
    probeUrl.searchParams.set("id", probeId);
    await generated.goto(probeUrl.toString());
    await expect(generated.locator(".inventory-balance")).toHaveText(
      "10each available",
    );
    await fillMovement(
      "Issue stock",
      "3",
      "Probe issue retained during conflict",
    );
    expect(
      (
        await inventoryApi(
          request,
          origin,
          probePath + "/movements/receive",
          "stockkeeper",
          "POST",
          {
            expectedVersion: 1,
            quantity: 2,
            reason: "Concurrent probe delivery",
          },
          "probe-external-" + attempt,
        )
      ).status,
    ).toBe(201);
    const issuePath = probePath + "/movements/issue";
    const staleRequest = generated.waitForRequest(
        (req) =>
          req.method() === "POST" && new URL(req.url()).pathname === issuePath,
      ),
      staleResponse = generated.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          new URL(response.url()).pathname === issuePath,
      );
    await generated
      .locator(".inventory-editor")
      .getByRole("button", { name: "Issue stock", exact: true })
      .click();
    expect((await staleResponse).status()).toBe(409);
    const stale = await staleRequest;
    await expect(generated.getByRole("alert")).toContainText("Stock changed");
    await expect(generated.locator("#inventory-amount")).toHaveValue("3");
    await expect(generated.getByLabel("Reason", { exact: true })).toHaveValue(
      "Probe issue retained during conflict",
    );
    await expect(
      generated
        .locator(".inventory-editor")
        .getByRole("button", { name: "Issue stock", exact: true }),
    ).toBeDisabled();
    await capture("probe-stale-conflict", [390, 1440]);
    const beforeRefresh = inventoryFacts(preview, [cableId, padId, probeId]);
    await generated
      .getByRole("button", { name: "Refresh current stock", exact: true })
      .click();
    await expect(generated.locator(".inventory-notice")).toContainText(
      "Your entries are kept",
    );
    await expect(generated.locator(".inventory-proposal")).toHaveText(
      "Proposed balance: 9 each.",
    );
    expect(inventoryFacts(preview, [cableId, padId, probeId])).toEqual(
      beforeRefresh,
    );
    const confirmRequest = generated.waitForRequest(
      (req) =>
        req.method() === "POST" && new URL(req.url()).pathname === issuePath,
    );
    const reconciled = await saved(
      "Confirm issue stock with latest stock",
      "POST",
      issuePath,
    );
    const confirmed = await confirmRequest;
    expect(confirmed.headers()["x-factory-idempotency-key"]).not.toBe(
      stale.headers()["x-factory-idempotency-key"],
    );
    expect(object(confirmed.postDataJSON())).toEqual({
      expectedVersion: 2,
      quantity: 3,
      reason: "Probe issue retained during conflict",
    });
    expect(object(reconciled.item)).toMatchObject({
      id: probeId,
      quantity: 9,
      version: 3,
    });
    const race = await Promise.all(
      ["A", "B"].map((label) =>
        inventoryApi(
          request,
          origin,
          issuePath,
          "stockkeeper",
          "POST",
          {
            expectedVersion: 3,
            quantity: 1,
            reason: "One-winner stock command probe",
          },
          "probe-race-" + label + "-" + attempt,
        ),
      ),
    );
    expect(race.map((value) => value.status).sort()).toEqual([201, 409]);
    const probeWinner = object(
      race.find((value) => value.status === 201)!.body.item,
    );
    expect(probeWinner).toMatchObject({ id: probeId, quantity: 8, version: 4 });
    expect(race.find((value) => value.status === 409)!.body.code).toBe(
      "inventory.version_conflict",
    );
    const probeHistory = (
      await inventoryApi(
        request,
        origin,
        probePath + "/movements",
        "stockkeeper",
      )
    ).body.records as Json[];
    expect(probeHistory).toHaveLength(4);
    expect(probeHistory.map((row) => row.delta)).toEqual([-1, -3, 2, 10]);
    evidence.concurrencyProbe = {
      recordHash: digest(probeId),
      quantity: 8,
      version: 4,
      movements: 4,
      historyDigest: digest(JSON.stringify(probeHistory)),
      freshVersionConfirmed: true,
      oneWinner: true,
    };
    await generated.reload();
    await expect(generated.locator(".inventory-balance")).toHaveText(
      "8each available",
    );
    await capture("probe-concurrency-result", [390, 1440]);
    await generated.goto(detailUrl);
    await expect(generated.locator(".inventory-identity h2")).toHaveText(
      correctedName,
    );
    await expect(generated.locator(".inventory-balance")).toHaveText(
      "6each available",
    );
    phase("observer-denials");
    const beforeDenials = inventoryFacts(preview, [cableId, padId]);
    await generated
      .getByRole("button", { name: "Issue stock", exact: true })
      .click();
    await generated
      .getByLabel("Reason", { exact: true })
      .fill("Intent cleared on role switch");
    await generated
      .getByLabel("Demo role", { exact: true })
      .selectOption("observer");
    await expect(generated.locator(".inventory-history")).toHaveCount(0);
    await expect(generated.locator(".inventory-editor")).toHaveCount(0);
    await expect(
      generated.getByRole("button", { name: "Issue stock", exact: true }),
    ).toHaveCount(0);
    await expect(generated.locator(".inventory-balance")).toHaveText(
      "6each available",
    );
    await capture("observer", [390, 1440]);
    for (const path of [
      cablePath + "/movements",
      base + "/missing-item/movements",
      "/api/stock-movement",
      "/api/audit",
      "/api/capability-events",
    ])
      expect(await inventoryApi(request, origin, path, "observer")).toEqual({
        status: 403,
        body: { code: "inventory.forbidden" },
      });
    for (const target of [
      {
        path: base,
        method: "POST",
        body: { values: { sku: "DENIED", name: "Denied item" } },
      },
      {
        path: cablePath,
        method: "PATCH",
        body: { expectedVersion: 4, values: { name: "Denied" } },
      },
      {
        path: receivePath,
        method: "POST",
        body: JSON.parse(interrupted!.body),
      },
    ])
      expect(
        await inventoryApi(
          request,
          origin,
          target.path,
          "observer",
          target.method,
          target.body,
          interrupted!.key,
        ),
      ).toEqual({ status: 403, body: { code: "inventory.forbidden" } });
    for (const path of [
      "/api/stock-movement",
      "/api/stock-movement/" +
        String(originalMovements[0]!.id) +
        "/events/submit",
      cablePath + "/events/submit",
    ])
      expect(
        (
          await inventoryApi(
            request,
            origin,
            path,
            "stockkeeper",
            "POST",
            {},
            randomUUID(),
          )
        ).status,
      ).toBe(403);
    for (const query of [
      "?limit=51",
      "?offset=10001",
      "?q=a&q=b",
      "?unknown=x",
    ])
      expect(
        (await inventoryApi(request, origin, base + query, "observer")).status,
      ).toBe(400);
    for (const quantity of ["1", 1.5, 0, 1000000001])
      expect(
        (
          await inventoryApi(
            request,
            origin,
            receivePath,
            "stockkeeper",
            "POST",
            { expectedVersion: 4, quantity, reason: "Invalid quantity" },
            randomUUID(),
          )
        ).status,
      ).toBe(400);
    const duplicate = await Promise.all(
      [1, 2].map(() =>
        inventoryApi(
          request,
          origin,
          base,
          "stockkeeper",
          "POST",
          { values: { sku: "pad-a5", name: "Duplicate pad" } },
          randomUUID(),
        ),
      ),
    );
    expect(duplicate.map((value) => value.status)).toEqual([409, 409]);
    expect(
      duplicate.every((value) => value.body.code === "inventory.sku_conflict"),
    ).toBe(true);
    expect(inventoryFacts(preview, [cableId, padId])).toEqual(beforeDenials);

    phase("restart-replay");
    const beforeRestart = inventoryFacts(preview, [cableId, padId, probeId]);
    expect(beforeRestart).toMatchObject({
      items: 3,
      movements: 7,
      audit: 11,
      receipts: 11,
      effects: 7,
      records: [
        {
          quantity: 6,
          version: 4,
          movements: 3,
          itemAudit: 2,
          movementAudit: 3,
          receipts: 5,
          effects: 3,
        },
        {
          quantity: 0,
          version: 0,
          movements: 0,
          itemAudit: 1,
          receipts: 1,
          effects: 0,
        },
        {
          quantity: 8,
          version: 4,
          movements: 4,
          itemAudit: 1,
          movementAudit: 4,
          receipts: 5,
          effects: 4,
        },
      ],
    });
    restartOwnedApi(preview);
    await ready(request, origin);
    expect(
      await inventoryApi(
        request,
        origin,
        receivePath,
        "stockkeeper",
        "POST",
        JSON.parse(interrupted!.body),
        interrupted!.key,
      ),
    ).toEqual({ status: 201, body: received });
    expect(inventoryFacts(preview, [cableId, padId, probeId])).toEqual(
      beforeRestart,
    );
    expect(
      (await inventoryApi(request, origin, cablePath, "observer")).body,
    ).toEqual(corrected);
    expect(
      (await inventoryApi(request, origin, probePath, "observer")).body,
    ).toEqual(probeWinner);
    expect(
      (
        await inventoryApi(
          request,
          origin,
          probePath + "/movements",
          "stockkeeper",
        )
      ).body.records,
    ).toEqual(probeHistory);
    expect(
      (
        await inventoryApi(
          request,
          origin,
          cablePath + "/movements",
          "stockkeeper",
        )
      ).body.records,
    ).toEqual(originalMovements);
    expect(
      (
        await inventoryApi(
          request,
          origin,
          base + "/" + encodeURIComponent(padId),
          "observer",
        )
      ).body,
    ).toEqual(pad);
    for (const width of [390, 1440]) {
      await generated.setViewportSize({ width, height: 844 });
      await generated.reload();
      await expect(generated.locator(".inventory-balance")).toHaveText(
        "6each available",
      );
      await expect(generated.locator(".inventory-identity h2")).toHaveText(
        correctedName,
      );
      expect(new URL(generated.url()).searchParams.get("id")).toBe(cableId);
    }
    await generated
      .getByLabel("Demo role", { exact: true })
      .selectOption("stockkeeper");
    await expect(generated.locator(".inventory-movements li")).toHaveCount(3);
    await capture("persisted-result");
    await generated.emulateMedia({
      colorScheme: "dark",
      reducedMotion: "reduce",
    });
    await generated
      .locator("main.inventory-v1")
      .evaluate((element) => element.setAttribute("data-theme", "dark"));
    await capture("dark-result", [390, 1440]);
    expect(remoteRequests).toBe(0);
    expect(await compilationIdentity(request, compilationId!)).toEqual(
      immutable,
    );
    expect(await delivery.fingerprint()).toBe(delivery.publishedFingerprint);
    evidence.records = [cableId, padId].map(digest);
    evidence.historyDigest = digest(JSON.stringify(originalMovements));
    evidence.finalDatabaseFacts = beforeRestart;
    evidence.sameKeyReplayAfterApiRestart = true;
    evidence.databaseRetained = true;
    evidence.immutablePublishedAndCompilationPreserved = true;
    evidence.unintendedRemoteRequests = remoteRequests;
    evidence.outcome = "business-passed-cleanup-pending";
  } catch (error) {
    businessError = error;
    evidence.failure = {
      phase: activePhase,
      ...inventoryFailureDiagnostic(error),
      kind:
        error instanceof Error && error.name === "TimeoutError"
          ? "timeout"
          : "assertion-or-operation-failed",
    };
    evidence.outcome = "failed";
    if (generated && !generated.isClosed())
      await generated
        .screenshot({
          path: resolve(output, "failure-generated-app.png"),
          fullPage: true,
        })
        .catch(() => undefined);
  } finally {
    releaseResponse?.();
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
        evidence.cleanup = {
          outcome: "removed",
          previewRunId: preview.id,
          composeProjectName: preview.composeProjectName,
          resources: ownedResources(preview, factoryProject),
        };
      } else evidence.cleanup = { outcome: "no-preview-created" };
      if (!businessError) evidence.outcome = "passed";
    } catch {
      evidence.cleanup = {
        outcome: "cleanup_required",
        previewRunId: preview?.id,
        composeProjectName: preview?.composeProjectName,
      };
      evidence.outcome = "failed";
      businessError ??= new Error("Owned Preview cleanup failed.");
    }
    phases.push({ name: activePhase, elapsedMs: Date.now() - phaseStartedAt });
    evidence.elapsedMs = Date.now() - startedAt;
    await writeFile(
      resolve(output, "journey.json"),
      JSON.stringify(evidence, null, 2) + "\n",
    );
  }
  if (businessError)
    throw new Error(
      "Inventory acceptance failed during " +
        String(object(evidence.failure ?? { phase: "cleanup" }).phase) +
        "; sanitized attempt evidence: " +
        attempt +
        ".",
    );
});
