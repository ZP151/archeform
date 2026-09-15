import { expect, test, type Page, type Response } from "@playwright/test";
import { observeInterpretation } from "./helpers/interpretation-diagnostics";
import {
  allowedQuestionCategories,
  arrayLengthAt,
  assertIsolatedProviderRun,
  controlPlaneUrl,
  currentPreview,
  expectCompletedPhase,
  interpretationTimeoutMs,
  lifecycleTimeoutMs,
  observeDirectRestaurantOutcome,
  readProductCreationDiagnostic,
  stopPreview,
  stringAt,
} from "./helpers/restaurant-delivery";

type PublishedRevision = {
  readonly graphHash: string;
  readonly id: string;
  readonly name: string;
};

const suppliedDisplayName = "Saffron Table";

let finishDiagnostics: (() => Promise<void>) | undefined;
test.beforeEach(({ page }) => {
  finishDiagnostics = observeInterpretation(page);
});
test.afterEach(async () => {
  await finishDiagnostics?.();
});

test.describe.configure({ mode: "serial", retries: 0 });

test("a supplied Restaurant display name stays bound through the immutable delivery", async ({
  context,
  page,
  request,
}) => {
  test.setTimeout(1_800_000);
  assertIsolatedProviderRun();

  let compilationId: string | null = null;
  let previewRunId: string | null = null;
  let generated: Page | null = null;
  let interpretation:
    | {
        readonly ok: boolean;
        readonly status: number;
        readonly title: string | null;
        readonly clarificationCount: number | null;
        readonly restaurantProductType: boolean;
      }
    | undefined;
  let productName: string | null | undefined;
  let publishedRevision: PublishedRevision | undefined;
  let verificationRunId: string | undefined;
  const responseReads = new Set<Promise<void>>();
  const submittedAt = Date.now();

  const observeDeliveryResponse = (response: Response): void => {
    if (response.request().method() !== "POST") return;
    const path = new URL(response.url()).pathname;
    let reading: Promise<void>;
    reading = (async () => {
      if (path === "/api/requirements/interpret") {
        const body = await response.json().catch(() => null);
        interpretation = {
          clarificationCount: arrayLengthAt(body, [
            "interpretation",
            "clarifications",
          ]),
          ok: response.ok(),
          restaurantProductType:
            stringAt(body, ["interpretation", "spec", "productType"]) ===
            "restaurant-ordering",
          status: response.status(),
          title: stringAt(body, ["interpretation", "blueprint", "title"]),
        };
        console.info(
          "FACTORY_RESTAURANT_BUSINESS_BINDING_INTERPRETATION_EVIDENCE",
          JSON.stringify({
            clarificationCount: interpretation.clarificationCount ?? -1,
            ok: interpretation.ok,
            restaurantProductType: interpretation.restaurantProductType,
            status: interpretation.status,
            titleMatches: interpretation.title === suppliedDisplayName,
          }),
        );
      } else if (path === "/product/requirements") {
        productName = stringAt(response.request().postDataJSON(), ["name"]);
      } else if (/\/published-revisions$/u.test(path)) {
        const body = await response.json();
        const id = stringAt(body, ["id"]);
        const graphHash = stringAt(body, ["graphHash"]);
        const name = stringAt(body, ["graph", "graph", "metadata", "name"]);
        if (id !== null && graphHash !== null && name !== null) {
          publishedRevision = { id, graphHash, name };
        }
      } else if (path === "/compilations") {
        compilationId = stringAt(await response.json(), ["id"]);
      } else if (/\/compilations\/[^/]+\/verification-runs$/u.test(path)) {
        verificationRunId = stringAt(await response.json(), [
          "verificationRunId",
        ]);
      } else if (/\/compilations\/[^/]+\/preview-runs$/u.test(path)) {
        previewRunId = stringAt(await response.json(), ["id"]);
      }
    })()
      .catch(() => undefined)
      .finally(() => responseReads.delete(reading));
    responseReads.add(reading);
  };
  page.on("response", observeDeliveryResponse);

  try {
    await page.goto("/");
    await page
      .getByLabel("Requirement brief")
      .fill(
        "Build a local Restaurant ordering app named Saffron Table where customers browse sample menu items and place table orders, kitchen staff prepare orders, and a manager operates restaurant settings using simulated payments.",
      );
    await page.getByRole("button", { name: "Create product" }).click();

    let directOutcome: DirectRestaurantObservation | undefined;
    try {
      await expect
        .poll(
          async () => {
            await Promise.all([...responseReads]);
            if (interpretation !== undefined) return true;
            return (await hasManualReview(page)) ? "manual-review" : false;
          },
          { timeout: interpretationTimeoutMs },
        )
        .not.toBe(false);
      directOutcome = await observeDirectRestaurantOutcome(page);
    } finally {
      const fallback = await readProductCreationDiagnostic(page).catch(() => ({
        failureCode: "unknown",
        failurePhase: "unknown",
        journeyOutcome: "unknown" as const,
        requirementOutcome: "unknown" as const,
      }));
      console.info(
        "FACTORY_RESTAURANT_BUSINESS_BINDING_ENTRY_EVIDENCE",
        JSON.stringify({
          failureCode: directOutcome?.failureCode ?? fallback.failureCode,
          failurePhase: directOutcome?.failurePhase ?? fallback.failurePhase,
          interpretationClarificationCount:
            interpretation?.clarificationCount ?? -1,
          interpretationReceived: interpretation !== undefined,
          interpretationRestaurantProductType:
            interpretation?.restaurantProductType ?? false,
          interpretationStatus: interpretation?.status ?? 0,
          journeyOutcome:
            directOutcome?.journeyOutcome ?? fallback.journeyOutcome,
          outcome: directOutcome?.outcome ?? "unresolved",
          questionCategories: directOutcome?.questionCategories ?? [],
          questionCount: directOutcome?.questionCount ?? 0,
          requirementOutcome:
            directOutcome?.requirementOutcome ?? fallback.requirementOutcome,
          titleMatches: interpretation?.title === suppliedDisplayName,
        }),
      );
    }
    expect(directOutcome?.outcome === "delivery").toBe(true);
    await expect(page.getByRole("button", { name: /Choose / })).toHaveCount(0);
    await expect(
      page.getByRole("region", { name: "Review the product plan" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("region", { name: "Review the approved plan Diff" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Apply to Draft" }),
    ).toHaveCount(0);
    await expectCompletedPhase(
      page,
      async () => {
        await Promise.all([...responseReads]);
        return (
          interpretation !== undefined &&
          productName !== undefined &&
          publishedRevision !== undefined &&
          compilationId !== null
        );
      },
      lifecycleTimeoutMs,
    );
    expect(interpretation!.ok, "named interpretation response").toBeTruthy();
    expect(interpretation!.restaurantProductType).toBe(true);
    expect(interpretation!.title === suppliedDisplayName).toBe(true);
    expect(productName === suppliedDisplayName).toBe(true);
    expect(publishedRevision!.name === suppliedDisplayName).toBe(true);
    expect(publishedRevision!.graphHash).toMatch(/^sha256:[a-f0-9]{64}$/u);

    await expectCompletedPhase(
      page,
      async () => {
        await Promise.all([...responseReads]);
        return verificationRunId !== undefined;
      },
      lifecycleTimeoutMs,
    );
    const observedVerificationRunId = verificationRunId!;
    await expectCompletedPhase(
      page,
      async () => {
        const response = await request.get(
          controlPlaneUrl(
            `/verification-runs/${encodeURIComponent(observedVerificationRunId)}`,
          ),
        );
        if (!response.ok()) return false;
        const body = (await response.json()) as {
          readonly evidence?: { readonly steps?: unknown };
          readonly status?: string;
        };
        if (body.status === "failed") return "failed";
        return (
          body.status === "succeeded" &&
          Array.isArray(body.evidence?.steps) &&
          body.evidence.steps.length > 0
        );
      },
      910_000,
    );

    await expectCompletedPhase(
      page,
      async () => {
        await Promise.all([...responseReads]);
        return previewRunId !== null;
      },
      lifecycleTimeoutMs,
    );
    await expectCompletedPhase(
      page,
      async () => {
        const status = (await currentPreview(request, compilationId!))?.status;
        if (status === "failed") return "failed";
        return status === "ready";
      },
      315_000,
    );
    const readyPreview = await currentPreview(request, compilationId!);
    expect(readyPreview?.id === previewRunId).toBe(true);
    expect(readyPreview?.previewUrl !== null).toBe(true);

    const completedResponse = await request.get(
      controlPlaneUrl(`/compilations/${encodeURIComponent(compilationId!)}`),
    );
    expect(
      completedResponse.ok(),
      "completed compilation response",
    ).toBeTruthy();
    const completed = await completedResponse.json();
    expect(
      stringAt(completed, ["publishedRevisionId"]) === publishedRevision!.id,
    ).toBe(true);
    expect(
      stringAt(completed, ["inputGraphHash"]) === publishedRevision!.graphHash,
    ).toBe(true);
    expect(stringAt(completed, ["result", "status"]) === "succeeded").toBe(
      true,
    );

    const previewOrigin = new URL(readyPreview!.previewUrl!);
    expect(["127.0.0.1", "localhost", "[::1]"]).toContain(
      previewOrigin.hostname,
    );
    generated = await context.newPage();
    expect((await generated.goto(previewOrigin.toString()))?.ok()).toBeTruthy();
    await expect
      .poll(async () => (await generated.title()) === suppliedDisplayName)
      .toBe(true);
    expect(
      (await generated.locator(".mobile-shell > header h1").textContent()) ===
        suppliedDisplayName,
    ).toBe(true);
    expect(
      (await generated.locator("#menu-hero-title").textContent()) ===
        suppliedDisplayName,
    ).toBe(true);
    expect(readyPreview?.apiPort).toEqual(expect.any(Number));

    const managerSettings = await request.get(
      new URL(
        "/api/merchant/settings",
        `http://127.0.0.1:${readyPreview!.apiPort}`,
      ).toString(),
    );
    expect(managerSettings.ok(), "merchant settings response").toBeTruthy();
    expect(
      stringAt(await managerSettings.json(), ["settings", "name"]) ===
        suppliedDisplayName,
    ).toBe(true);
    console.info(
      "FACTORY_RESTAURANT_BUSINESS_BINDING_EVIDENCE",
      JSON.stringify({
        elapsedMs: Date.now() - submittedAt,
        fixtureModeOff: true,
        interpretationStatus: interpretation!.status,
        interpretationTitleMatches: true,
        productRequestNameMatches: true,
        publishedNameMatches: true,
        compilationHashMatches: true,
        customerTitleMatches: true,
        customerShellMatches: true,
        customerHeroMatches: true,
        managerSettingsNameMatches: true,
        questionCount: 0,
        verified: true,
      }),
    );
  } finally {
    page.off("response", observeDeliveryResponse);
    await Promise.all([...responseReads]);
    await generated?.close().catch(() => undefined);
    await page.close().catch(() => undefined);
    if (compilationId !== null) {
      const current =
        previewRunId === null
          ? await currentPreview(request, compilationId)
          : null;
      const exactPreviewRunId = previewRunId ?? current?.id;
      if (exactPreviewRunId !== undefined) {
        await stopPreview(request, compilationId, exactPreviewRunId);
      }
    }
  }
});

test("a supplied Restaurant menu with a missing price stays as one data clarification", async ({
  page,
  request,
}) => {
  test.setTimeout(600_000);
  assertIsolatedProviderRun();
  let deliveryMutations = 0;
  let unexpectedCompilationId: string | null = null;
  let unexpectedPreviewRunId: string | null = null;
  const unexpectedResponseReads = new Set<Promise<void>>();
  page.on("request", (request) => {
    if (request.method() !== "POST") return;
    const path = new URL(request.url()).pathname;
    if (
      /\/(?:published-revisions|compilations|verification-runs|preview-runs)$/u.test(
        path,
      ) ||
      /^\/product\/requirements(?:\/|$)/u.test(path)
    ) {
      deliveryMutations += 1;
    }
  });
  const observeUnexpectedDelivery = (response: Response): void => {
    if (response.request().method() !== "POST") return;
    const path = new URL(response.url()).pathname;
    let reading: Promise<void>;
    reading = (async () => {
      if (path === "/compilations") {
        unexpectedCompilationId = stringAt(await response.json(), ["id"]);
      } else if (/\/compilations\/[^/]+\/preview-runs$/u.test(path)) {
        unexpectedPreviewRunId = stringAt(await response.json(), ["id"]);
      }
    })()
      .catch(() => undefined)
      .finally(() => unexpectedResponseReads.delete(reading));
    unexpectedResponseReads.add(reading);
  };
  page.on("response", observeUnexpectedDelivery);

  try {
    await page.goto("/");
    await page
      .getByLabel("Requirement brief")
      .fill(
        "Build a local Restaurant ordering app named Cedar House with custom menu items: saffron risotto at USD 31.00 and grilled sea bass whose price I have not decided. Customers place table orders, kitchen staff prepare them, and managers operate the restaurant using simulated payments.",
      );
    const interpreted = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/requirements/interpret",
      { timeout: interpretationTimeoutMs },
    );
    void interpreted.catch(() => undefined);
    const submittedAt = Date.now();
    await page.getByRole("button", { name: "Create product" }).click();
    const response = await interpreted;
    const delivery = page.getByRole("region", { name: "Restaurant delivery" });
    const clarification = page.getByRole("button", {
      name: "Continue",
      exact: true,
    });
    let terminal: "clarification" | "delivery" | "failed" | "pending" =
      "pending";
    await expect
      .poll(
        async () => {
          const productCreation = await readProductCreationDiagnostic(page);
          if (await clarification.isVisible()) terminal = "clarification";
          else if (
            productCreation.requirementOutcome === "failed" ||
            productCreation.journeyOutcome === "failed"
          ) {
            terminal = "failed";
          } else if (await delivery.isVisible()) terminal = "delivery";
          return terminal;
        },
        { timeout: 30_000 },
      )
      .not.toBe("pending");
    const questions = page.locator("ol.clarification-questions input");
    const questionCategories = await questions.evaluateAll(
      (inputs, allowed) =>
        inputs.map((input) => {
          const category = input.getAttribute("data-clarification-category");
          return category !== null && allowed.includes(category)
            ? category
            : "unknown";
        }),
      [...allowedQuestionCategories],
    );
    const questionCount = questionCategories.length;
    const dataQuestionCount = await page
      .locator(
        'ol.clarification-questions input[data-clarification-category="data"]',
      )
      .count();
    const productCreation = await readProductCreationDiagnostic(page);
    console.info(
      "FACTORY_RESTAURANT_MENU_REFUSAL_EVIDENCE",
      JSON.stringify({
        dataQuestionCount,
        deliveryMutations,
        elapsedToClarificationMs: Date.now() - submittedAt,
        failureCode: productCreation.failureCode,
        failurePhase: productCreation.failurePhase,
        journeyOutcome: productCreation.journeyOutcome,
        outcome: terminal,
        questionCategories,
        questionCount,
        requirementOutcome: productCreation.requirementOutcome,
        status: response.status(),
      }),
    );
    expect(response.status(), "custom menu interpretation response").toBe(200);
    expect(terminal === "clarification").toBe(true);
    expect(questionCount).toBe(1);
    expect(dataQuestionCount).toBe(1);
    await expect(
      page.getByRole("region", { name: "Restaurant delivery" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Open local app" }),
    ).toHaveCount(0);
    expect(deliveryMutations).toBe(0);
  } finally {
    page.off("response", observeUnexpectedDelivery);
    await Promise.all([...unexpectedResponseReads]);
    await page.close().catch(() => undefined);
    if (unexpectedCompilationId !== null) {
      const current =
        unexpectedPreviewRunId === null
          ? await currentPreview(request, unexpectedCompilationId)
          : null;
      const exactPreviewRunId = unexpectedPreviewRunId ?? current?.id;
      if (exactPreviewRunId !== undefined) {
        await stopPreview(request, unexpectedCompilationId, exactPreviewRunId);
      }
    }
  }
});
