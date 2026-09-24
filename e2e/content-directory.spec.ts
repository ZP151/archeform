import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { stopPreview } from "./helpers/restaurant-delivery";
import {
  api,
  compilationIdentity,
  deliverDirectory,
  digest,
  directoryFailureDiagnostic,
  directoryPhaseEvent,
  mutationFacts,
  object,
  ownedResources,
  ready,
  restartOwnedApi,
  sourceIdentity,
  type Json,
  type OwnedPreview,
} from "./helpers/content-directory";

test.describe.configure({ mode: "serial", retries: 0 });

test("Knowledge Resource Directory completes immutable delivery and reader/curator recovery", async ({
  page,
  context,
  request,
}, testInfo) => {
  test.setTimeout(1_800_000);
  context.setDefaultTimeout(45_000);
  // All assertions precede any access to the application or Docker.
  expect(process.env.FACTORY_E2E_ISOLATED).toBe("1");
  const factoryProject = process.env.FACTORY_E2E_FACTORY_PROJECT!;
  expect(factoryProject).toMatch(/^factory-t10-[a-z0-9-]+$/u);
  expect(process.env.FACTORY_E2E_CONTROL_PLANE_URL).toMatch(
    /^http:\/\/127\.0\.0\.1:\d+$/u,
  );
  expect(testInfo.project.use.baseURL).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/u);
  const attempt = randomUUID();
  const output = resolve(
    "docs/acceptance/evidence/accepted-family-consumer-delivery/content-directory",
    `attempt-${attempt}`,
  );
  await mkdir(output, { recursive: true });
  const startedAt = Date.now();
  let activePhase = "source-identity";
  console.info(JSON.stringify(directoryPhaseEvent(attempt, activePhase)));
  let phaseStartedAt = startedAt;
  const phases: { name: string; elapsedMs: number }[] = [];
  const evidence: Json = {
    attempt,
    definitionKey: "knowledge-resource-directory",
    scope: "isolated-local-fixture-session",
    authoredSelections: 1,
    authoredEntries: 2,
    modelCalls: 0,
    ordinaryUserStudies: 0,
    inRunManualRescues: 0,
    businessRetries: 0,
    readyTargetMs: 300_000,
    outcome: "running",
    visualReview: "pending-human-inspection",
    phases,
  };
  const phase = (name: string) => {
    console.info(JSON.stringify(directoryPhaseEvent(attempt, name)));
    phases.push({ name: activePhase, elapsedMs: Date.now() - phaseStartedAt });
    activePhase = name;
    phaseStartedAt = Date.now();
  };
  let preview: OwnedPreview | undefined;
  let compilationId: string | undefined;
  let generated: Page | undefined;
  let businessError: unknown;
  const capture = async (name: string, widths = [390, 768, 1440]) => {
    for (const width of widths) {
      await generated!.setViewportSize({
        width,
        height: width === 390 ? 844 : width === 768 ? 1024 : 900,
      });
      await expect(generated!.locator("main.directory-v1")).toBeVisible();
      const geometry = await generated!.evaluate(() => ({
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        icons: [...document.querySelectorAll(".directory-icon svg")].filter(
          (icon) => {
            const bounds = icon.getBoundingClientRect();
            return bounds.width > 0 && bounds.height > 0;
          },
        ).length,
        smallControls: [
          ...document.querySelectorAll(
            "main.directory-v1 button, main.directory-v1 a, main.directory-v1 input, main.directory-v1 select",
          ),
        ].filter((element) => {
          const bounds = element.getBoundingClientRect();
          return (
            bounds.width > 0 &&
            bounds.height > 0 &&
            (bounds.width < 43.5 || bounds.height < 43.5)
          );
        }).length,
      }));
      expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.width + 1);
      expect(geometry.icons).toBeGreaterThan(0);
      expect(geometry.smallControls).toBe(0);
      await generated!.screenshot({
        path: resolve(output, `${name}-${width}.png`),
        fullPage: true,
      });
    }
  };
  const valuesA = {
    title: "Field guide to accessible meetings",
    summary: "Prepare an agenda and make remote participation useful.",
    body:
      "Start with an agenda.\nInvite written questions before the meeting.\n\nPlain text stays literal: <strong>Ask, listen, follow up.</strong>\n" +
      "Give each participant a clear way to contribute. ".repeat(18).trim(),
    category: "Guides",
  };
  const valuesB = {
    title: "Release readiness checklist",
    summary: "Check ownership, rollback and follow-up before release.",
    body: "Confirm the owner.\nReview the rollback steps.\nRecord the outcome and follow-up.",
    category: "Checklists",
  };
  const fill = async (values: typeof valuesA) => {
    for (const field of ["title", "summary", "body"] as const)
      await generated!.getByLabel(field, { exact: false }).fill(values[field]);
    await generated!
      .getByLabel("Category", { exact: true })
      .selectOption({ label: values.category });
  };
  const saved = async (button: string, method: string, pathname: string) => {
    const response = generated!.waitForResponse(
      (r) =>
        r.request().method() === method &&
        new URL(r.url()).pathname === pathname,
    );
    await generated!.getByRole("button", { name: button, exact: true }).click();
    const result = await response;
    expect(result.status()).toBe(
      method === "POST" && pathname === "/api/resource" ? 201 : 200,
    );
    const record = object(await result.json());
    await expect(
      generated!.getByRole("status").filter({ hasText: "Entry saved." }),
    ).toBeVisible();
    return record;
  };
  try {
    evidence.sources = await sourceIdentity();
    preview = await deliverDirectory(
      page,
      request,
      evidence,
      phase,
      (id, owned) => {
        compilationId = id;
        if (owned) preview = owned;
      },
    );
    const origin = preview.previewUrl!;
    const beforeIdentity = await compilationIdentity(request, compilationId!);
    expect(beforeIdentity.inputGraphHash).toBe(evidence.inputGraphHash);
    evidence.compilation = beforeIdentity;
    phase("curator-create");
    let remoteRequests = 0;
    // Context routing covers the popup's first request from Open local app.
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
    [generated] = await Promise.all([
      context.waitForEvent("page"),
      page.getByRole("link", { name: "Open local app", exact: true }).click(),
    ]);
    object(evidence.consumerEntry).openAppActions = 1;
    await expect(generated.locator("main.directory-v1")).toBeVisible({
      timeout: 120_000,
    });
    await expect(
      generated.getByRole("status").filter({ hasText: "Loading resources" }),
    ).toHaveCount(0);
    evidence.readyMs = Date.now() - startedAt;
    evidence.readyTargetMet = Number(evidence.readyMs) <= 300_000;
    await capture("initial-reader", [390]);
    await generated.setViewportSize({ width: 1440, height: 900 });
    await generated
      .getByLabel("Demo role", { exact: true })
      .selectOption({ label: "Curator" });
    await generated
      .getByRole("link", { name: "Create entry", exact: true })
      .first()
      .click();
    await fill({ ...valuesA, title: "   " });
    await generated
      .getByRole("button", { name: "Create hidden entry", exact: true })
      .click();
    await expect(
      generated.locator("main.directory-v1").getByRole("alert"),
    ).toContainText("Enter title between 1 and 120 characters");
    await capture("curator-validation", [390, 1440]);
    await fill(valuesA);
    await capture("curator-editor");
    const first = await saved("Create hidden entry", "POST", "/api/resource");
    expect(first).toMatchObject({ status: "hidden", version: 0, ...valuesA });
    object(evidence.consumerEntry).firstUsefulActionMs =
      Date.now() - Number(object(evidence.consumerEntry).startedAtMs);
    object(evidence.consumerEntry).firstUsefulAction = "curator-created-entry";
    const firstId = String(first.id);
    const firstPath = `/api/resource/${encodeURIComponent(firstId)}`;
    const detailUrl = generated.url();
    expect(new URL(detailUrl).searchParams.get("id")).toBe(firstId);
    const firstShow = await saved(
      "Show entry",
      "POST",
      `${firstPath}/events/submit`,
    );
    expect(firstShow).toMatchObject({
      id: firstId,
      status: "listed",
      version: 1,
    });
    evidence.firstCompletedManagementJobMs = Date.now() - startedAt;
    await capture("curator-listed");

    phase("uncertain-create-retry");
    await generated
      .getByRole("link", { name: "Create entry", exact: true })
      .first()
      .click();
    await fill(valuesB);
    let interruptedRequest: { key: string; body: string } | undefined;
    let interruptedRecord: Json | undefined;
    let releaseResponse!: () => void;
    const release = new Promise<void>((resolveGate) => {
      releaseResponse = resolveGate;
    });
    let accepted!: () => void;
    const committed = new Promise<void>((resolveGate) => {
      accepted = resolveGate;
    });
    const createPattern = "**/api/resource";
    await generated.route(createPattern, async (route) => {
      if (route.request().method() !== "POST" || interruptedRequest)
        return route.fallback();
      interruptedRequest = {
        key: route.request().headers()["x-factory-idempotency-key"]!,
        body: route.request().postData()!,
      };
      try {
        const responses = await Promise.all([route.fetch(), route.fetch()]);
        for (const response of responses) expect(response.status()).toBe(201);
        interruptedRecord = object(await responses[0]!.json());
        expect(await responses[1]!.json()).toEqual(interruptedRecord);
      } finally {
        accepted();
      }
      await release;
      await route.abort("connectionreset");
    });
    await generated
      .getByRole("button", { name: "Create hidden entry", exact: true })
      .click();
    try {
      await committed;
      expect(interruptedRecord).toBeDefined();
      await expect(
        generated.getByText("Saving entry…", { exact: true }),
      ).toBeVisible();
      await expect(
        generated.getByRole("button", {
          name: "Create hidden entry",
          exact: true,
        }),
      ).toBeDisabled();
      await capture("pending-save", [1440]);
    } finally {
      releaseResponse();
    }
    await expect(
      generated.getByRole("button", { name: "Retry save", exact: true }),
    ).toBeVisible();
    await expect(generated.getByLabel("Title", { exact: true })).toHaveValue(
      valuesB.title,
    );
    await capture("uncertain-save", [390, 1440]);
    const retryRequest = generated.waitForRequest(
      (r) =>
        r.method() === "POST" && new URL(r.url()).pathname === "/api/resource",
    );
    evidence.businessRetries = Number(evidence.businessRetries) + 1;
    const second = await saved("Retry save", "POST", "/api/resource");
    const retried = await retryRequest;
    expect(retried.headers()["x-factory-idempotency-key"]).toBe(
      interruptedRequest!.key,
    );
    expect(retried.postData()).toBe(interruptedRequest!.body);
    expect(second).toEqual(interruptedRecord);
    await generated.unroute(createPattern);
    const secondId = String(second.id);
    expect(secondId).not.toBe(firstId);
    const initialFacts = mutationFacts(preview, [firstId, secondId]);
    expect(initialFacts.map((row) => [row.audit, row.receipts])).toEqual([
      [2, 2],
      [1, 1],
    ]);

    phase("reader-find-read");
    await generated
      .getByLabel("Demo role", { exact: true })
      .selectOption({ label: "Reader" });
    await generated
      .getByRole("link", { name: "Browse resources", exact: true })
      .click();
    await generated.setViewportSize({ width: 390, height: 844 });
    await generated
      .getByLabel("Search resources", { exact: true })
      .fill("accessible meetings");
    await generated
      .getByRole("button", { name: "Search", exact: true })
      .press("Enter");
    await generated
      .getByRole("button", { name: "Guides", exact: true })
      .click();
    await expect(
      generated.getByRole("link", { name: valuesA.title, exact: true }),
    ).toBeVisible();
    const readerList = await api(
      request,
      origin,
      "/api/resource?limit=1&q=accessible%20meetings",
      "reader",
    );
    expect(readerList.body).toMatchObject({
      apiVersion: "factory.generated.directory-list/v1",
      offset: 0,
      limit: 1,
      hasMore: false,
    });
    expect(readerList.body.records).toEqual([
      {
        id: firstId,
        title: valuesA.title,
        summary: valuesA.summary,
        category: valuesA.category,
        status: "listed",
        version: 1,
      },
    ]);
    await expect(
      generated.getByText(valuesB.title, { exact: true }),
    ).toHaveCount(0);
    await capture("reader-search");
    await generated
      .getByRole("link", { name: valuesA.title, exact: true })
      .click();
    expect(new URL(generated.url()).searchParams.get("id")).toBe(firstId);
    await expect(generated.locator(".directory-body")).toHaveText(valuesA.body);
    await expect(generated.locator(".directory-body strong")).toHaveCount(0);
    await expect(
      generated.getByRole("button", { name: "Edit entry", exact: true }),
    ).toHaveCount(0);
    await capture("reader-detail");
    await generated
      .getByRole("link", { name: "Back to resources", exact: true })
      .click();
    await expect(
      generated.getByLabel("Search resources", { exact: true }),
    ).toHaveValue("accessible meetings");
    await generated
      .getByLabel("Search resources", { exact: true })
      .fill("No matching authored resource");
    await generated
      .getByRole("button", { name: "Search", exact: true })
      .click();
    await expect(
      generated.getByRole("heading", {
        name: "No matching resources",
        exact: true,
      }),
    ).toBeVisible();
    await capture("reader-no-results");
    await generated
      .getByRole("button", { name: "Clear filters", exact: true })
      .click();
    await expect(
      generated.getByLabel("Search resources", { exact: true }),
    ).toHaveValue("");
    await expect(
      generated.getByRole("link", { name: valuesA.title, exact: true }),
    ).toBeVisible();

    phase("same-record-stale-correction");
    await generated.goto(detailUrl);
    await generated
      .getByLabel("Demo role", { exact: true })
      .selectOption({ label: "Curator" });
    await generated.setViewportSize({ width: 1440, height: 900 });
    await generated
      .getByRole("button", { name: "Edit entry", exact: true })
      .click();
    const corrected = {
      ...valuesA,
      title: "Field guide to inclusive accessible meetings",
      body: valuesA.body + "\nCorrected: publish the notes after the meeting.",
    };
    await fill(corrected);
    const external = await api(
      request,
      origin,
      firstPath,
      "curator",
      "PATCH",
      {
        expectedVersion: 1,
        values: {
          ...valuesA,
          summary: "A concurrent curator corrected this summary.",
        },
      },
      `concurrent-${attempt}`,
    );
    expect(external.status).toBe(200);
    const staleResponse = generated.waitForResponse(
      (r) =>
        r.request().method() === "PATCH" &&
        new URL(r.url()).pathname === firstPath,
    );
    await generated
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    expect((await staleResponse).status()).toBe(409);
    await expect(
      generated.getByRole("button", {
        name: "Refresh current entry",
        exact: true,
      }),
    ).toBeVisible();
    await expect(generated.getByLabel("Title", { exact: true })).toHaveValue(
      corrected.title,
    );
    await capture("stale-conflict");
    await generated
      .getByRole("button", { name: "Refresh current entry", exact: true })
      .click();
    await expect(
      generated.getByText(
        "Latest entry loaded. Your edits are kept. Review and save again.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(generated.getByLabel("Body", { exact: true })).toHaveValue(
      corrected.body,
    );
    const correction = await saved("Save changes", "PATCH", firstPath);
    expect(correction).toMatchObject({
      id: firstId,
      status: "listed",
      version: 3,
      ...corrected,
    });
    await capture("corrected-detail");
    const hidden = await saved(
      "Hide entry",
      "POST",
      `${firstPath}/events/cancel`,
    );
    expect(hidden).toMatchObject({ id: firstId, status: "hidden", version: 4 });
    const hiddenRead = await api(request, origin, firstPath, "reader");
    expect(hiddenRead).toEqual({
      status: 404,
      body: { code: "directory.not_found" },
    });
    const absentRead = await api(
      request,
      origin,
      "/api/resource/missing-authored-entry",
      "reader",
    );
    expect(absentRead).toEqual(hiddenRead);
    const hiddenList = await api(
      request,
      origin,
      `/api/resource?q=${encodeURIComponent(corrected.title)}`,
      "reader",
    );
    expect(hiddenList.status).toBe(200);
    expect(hiddenList.body.records).toEqual([]);
    await generated
      .getByLabel("Demo role", { exact: true })
      .selectOption({ label: "Reader" });
    await expect(
      generated.locator("main.directory-v1").getByRole("alert"),
    ).toContainText("This resource is not available.");
    await expect(
      generated.getByText(corrected.title, { exact: true }),
    ).toHaveCount(0);
    await capture("reader-hidden-detail");
    await generated
      .getByLabel("Demo role", { exact: true })
      .selectOption({ label: "Curator" });
    await generated
      .getByRole("button", { name: "Edit entry", exact: true })
      .click();
    const hiddenCorrection = {
      ...corrected,
      summary: "An updated agenda, participation and follow-up guide.",
    };
    await fill(hiddenCorrection);
    expect(await saved("Save changes", "PATCH", firstPath)).toMatchObject({
      id: firstId,
      status: "hidden",
      version: 5,
    });
    expect(
      await saved("Show entry", "POST", `${firstPath}/events/submit`),
    ).toMatchObject({ id: firstId, status: "listed", version: 6 });

    phase("server-denials-concurrency");
    const factsBeforeDenials = mutationFacts(preview, [firstId, secondId]);
    for (const command of [
      { path: "/api/resource", method: "POST", body: { values: valuesA } },
      {
        path: firstPath,
        method: "PATCH",
        body: { expectedVersion: 6, values: valuesA },
      },
      {
        path: `${firstPath}/events/cancel`,
        method: "POST",
        body: { expectedVersion: 6 },
      },
    ]) {
      const denied = await api(
        request,
        origin,
        command.path,
        "reader",
        command.method,
        command.body,
        randomUUID(),
      );
      expect(denied).toEqual({
        status: 403,
        body: { code: "directory.forbidden" },
      });
    }
    for (const query of [
      "?limit=51",
      "?q=a&q=b",
      "?category=Unknown",
      "?status=hidden",
    ])
      expect(
        (await api(request, origin, `/api/resource${query}`, "reader")).status,
      ).toBe(400);
    expect(
      (await api(request, origin, "/api/resource?q=%25_", "reader")).body
        .records,
    ).toEqual([]);
    expect(
      (
        await api(
          request,
          origin,
          "/api/resource",
          "curator",
          "POST",
          { ...valuesA, status: "listed" },
          randomUUID(),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await api(
          request,
          origin,
          `${firstPath}/events/submit`,
          "curator",
          "POST",
          { expectedVersion: 6 },
          randomUUID(),
        )
      ).body.code,
    ).toBe("directory.invalid_state");
    expect(
      (
        await api(
          request,
          origin,
          `${firstPath}/events/approve`,
          "curator",
          "POST",
          { expectedVersion: 6 },
          randomUUID(),
        )
      ).status,
    ).toBe(403);
    for (const path of ["/api/audit", "/api/capability-events"])
      expect((await api(request, origin, path, "reader")).status).toBe(403);
    expect(mutationFacts(preview, [firstId, secondId])).toEqual(
      factsBeforeDenials,
    );
    const race = await Promise.all(
      ["A", "B"].map((label) =>
        api(
          request,
          origin,
          firstPath,
          "curator",
          "PATCH",
          {
            expectedVersion: 6,
            values: {
              ...hiddenCorrection,
              summary: `Concurrent winner ${label}.`,
            },
          },
          `race-${label}-${attempt}`,
        ),
      ),
    );
    expect(race.map((result) => result.status).sort()).toEqual([200, 409]);
    const winner = race.find((result) => result.status === 200)!.body;
    expect(winner).toMatchObject({ id: firstId, version: 7, status: "listed" });
    const sameKey = await Promise.all(
      [1, 2].map(() =>
        api(
          request,
          origin,
          "/api/resource",
          "curator",
          "POST",
          JSON.parse(interruptedRequest!.body),
          interruptedRequest!.key,
        ),
      ),
    );
    for (const result of sameKey)
      expect(result).toEqual({ status: 201, body: second });
    const conflictingKey = await api(
      request,
      origin,
      "/api/resource",
      "curator",
      "POST",
      { values: valuesA },
      interruptedRequest!.key,
    );
    expect(conflictingKey.status).toBe(409);
    expect(conflictingKey.body.code).toBe("directory.idempotency_conflict");

    phase("restart-replay-persistence");
    const beforeRestart = mutationFacts(preview, [firstId, secondId]);
    expect(beforeRestart.map((row) => [row.audit, row.receipts])).toEqual([
      [8, 8],
      [1, 1],
    ]);
    restartOwnedApi(preview);
    await ready(request, origin);
    expect(
      await api(
        request,
        origin,
        "/api/resource",
        "curator",
        "POST",
        JSON.parse(interruptedRequest!.body),
        interruptedRequest!.key,
      ),
    ).toEqual({ status: 201, body: second });
    expect(mutationFacts(preview, [firstId, secondId])).toEqual(beforeRestart);
    expect((await api(request, origin, firstPath, "reader")).body).toEqual(
      winner,
    );
    await generated.reload();
    await expect(generated.locator(".directory-article h2")).toHaveText(
      corrected.title,
    );
    await expect(generated.locator(".directory-lead")).toHaveText(
      String(winner.summary),
    );
    await capture("persisted-detail");
    await generated
      .locator("main.directory-v1")
      .evaluate((element) => element.setAttribute("data-theme", "dark"));
    await capture("dark-detail");
    // The directory uses local SVGs and text, with no record-image requirement.
    await generated.route(/\.(?:png|jpe?g|webp)(?:\?|$)/u, (route) =>
      route.abort(),
    );
    await generated.reload();
    await expect(generated.locator(".directory-body")).toHaveText(
      corrected.body,
    );
    await capture("missing-decorative-media");
    expect(remoteRequests).toBe(0);
    expect(await compilationIdentity(request, compilationId!)).toEqual(
      beforeIdentity,
    );
    evidence.records = [firstId, secondId].map(digest);
    evidence.mutationCounts = beforeRestart;
    evidence.immutableCompilationPreserved = true;
    evidence.sameKeyReplayAfterRestart = true;
    evidence.unintendedRemoteRequests = remoteRequests;
    evidence.outcome = "business-passed-cleanup-pending";
  } catch (error) {
    businessError = error;
    // Never persist arbitrary exception messages, HTTP responses or Workbench screenshots.
    evidence.failure = {
      phase: activePhase,
      ...directoryFailureDiagnostic(error),
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
      if (evidence.consumerOwnershipRecovery === "cleanup-required")
        throw new Error(
          "Consumer Preview ownership recovery requires cleanup.",
        );
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
      `Directory acceptance failed during ${String(object(evidence.failure ?? { phase: "cleanup" }).phase)}; sanitized attempt evidence: ${attempt}.`,
    );
});
