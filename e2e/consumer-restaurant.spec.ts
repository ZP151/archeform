import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { observeInterpretation } from "./helpers/interpretation-diagnostics";

let finishDiagnostics: (() => Promise<void>) | undefined;
test.beforeEach(({ page }) => {
  finishDiagnostics = observeInterpretation(page);
});
test.afterEach(async () => {
  await finishDiagnostics?.();
});

type PreviewRun = {
  readonly id: string;
  readonly compilationId: string;
  readonly status: string;
  readonly previewUrl: string | null;
  readonly apiPort: number | null;
  readonly composeProjectName: string;
};

const factoryProject = process.env.FACTORY_E2E_FACTORY_PROJECT;
const controlPlaneBaseUrl = process.env.FACTORY_E2E_CONTROL_PLANE_URL;
const INTERPRETATION_TIMEOUT_MS = 570_000;
const LIFECYCLE_RESPONSE_TIMEOUT_MS = 1_800_000;
const restaurantBrief =
  "Build a local Restaurant ordering app where customers browse a menu and place table orders; kitchen staff prepare orders and a manager operates the restaurant.";
const clarificationAnswers = {
  "experience.visual-style": "Use the Factory standard visual style.",
  authorization:
    "Customers may create and view only their own orders. Kitchen staff may fulfil orders only. Managers may operate restaurant settings and staff operations. Guests receive no staff access.",
  visibility:
    "Customers can see only their own orders. Kitchen staff can see fulfilment work only. Managers can see restaurant operations. Staff areas are private from guests.",
  role: "Customers place and track their own orders. Kitchen staff fulfil orders. Managers manage restaurant operations. Guests have no staff role.",
  "business-rule":
    "Use standard table ordering and kitchen fulfilment with sample menu items, local-only operation, and simulated payments.",
  data: "Use one local restaurant with sample menu data. Do not use external or regulated data.",
  integration:
    "Use simulated payments only. Do not add live payment providers or external integrations.",
} as const;

type ClarificationCategory = keyof typeof clarificationAnswers;

function clarificationAnswerForCategory(category: string | null): string {
  if (category === null || !Object.hasOwn(clarificationAnswers, category)) {
    throw new Error("Consumer clarification used an unsupported category.");
  }
  return clarificationAnswers[category as ClarificationCategory];
}

test.describe.configure({ mode: "serial", retries: 0 });

function dockerOutput(args: readonly string[]): string {
  return execFileSync("docker", [...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function controlPlaneUrl(path: string): string {
  if (!controlPlaneBaseUrl) {
    throw new Error("FACTORY_E2E_CONTROL_PLANE_URL is required.");
  }
  return new URL(path, `${controlPlaneBaseUrl}/`).toString();
}

async function axe(page: Page): Promise<void> {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(result.violations).toEqual([]);
}

async function expectNoOverflow(page: Page, width: number): Promise<void> {
  await page.setViewportSize({ width, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      })),
    )
    .toEqual({ clientWidth: width, scrollWidth: width });
  await axe(page);
}

async function waitForConsumerStart(
  page: Page,
): Promise<"delivery" | "clarification"> {
  const delivery = page.getByRole("region", { name: "Restaurant delivery" });
  const deliveryStatus = delivery.getByRole("status");
  const continueClarifying = page.getByRole("button", {
    name: "Continue",
    exact: true,
  });
  const failedJourney = page.locator(
    'section[aria-label="Product creation"][data-journey-outcome="failed"]',
  );
  const outcome = await Promise.race([
    delivery
      .waitFor({ state: "visible", timeout: INTERPRETATION_TIMEOUT_MS })
      .then(async () =>
        (await deliveryStatus.textContent())?.startsWith("Delivery paused")
          ? "paused"
          : "delivery",
      ),
    continueClarifying
      .waitFor({ state: "visible", timeout: INTERPRETATION_TIMEOUT_MS })
      .then(() => "clarification" as const),
    failedJourney
      .waitFor({ state: "visible", timeout: INTERPRETATION_TIMEOUT_MS })
      .then(() => "failed" as const),
  ]);
  if (outcome === "paused" || outcome === "failed") {
    throw new Error("Consumer start did not produce a usable delivery state.");
  }
  return outcome;
}

async function captureSafeScreenshot(page: Page, name: string): Promise<void> {
  const artifactDirectory = resolve(
    process.cwd(),
    "acceptance-artifacts",
    "d1",
  );
  await mkdir(artifactDirectory, { recursive: true });
  await page.screenshot({ path: resolve(artifactDirectory, `${name}.png`) });
}

async function currentPreview(
  request: APIRequestContext,
  compilationId: string,
): Promise<PreviewRun | null> {
  const response = await request.get(
    controlPlaneUrl(
      `/compilations/${encodeURIComponent(compilationId)}/preview-runs/current`,
    ),
  );
  if (!response.ok()) return null;
  const preview = (await response.json()) as Partial<PreviewRun>;
  if (
    typeof preview.id !== "string" ||
    typeof preview.compilationId !== "string" ||
    typeof preview.status !== "string" ||
    typeof preview.composeProjectName !== "string" ||
    (preview.previewUrl !== null && typeof preview.previewUrl !== "string")
  ) {
    return null;
  }
  return preview as PreviewRun;
}

async function stopPreview(
  request: APIRequestContext,
  compilationId: string,
  previewRunId: string,
): Promise<void> {
  const stopped = await request.post(
    controlPlaneUrl(`/preview-runs/${encodeURIComponent(previewRunId)}/stop`),
    { data: {} },
  );
  expect(stopped.ok(), "exact preview stop request").toBeTruthy();
  await expect
    .poll(async () => (await currentPreview(request, compilationId))?.status, {
      timeout: 120_000,
    })
    .toBe("stopped");
}

function roleOrigin(
  composeProjectName: string,
  service: "cashier" | "kitchen",
  targetPort: 3002 | 3003,
): URL {
  const ids = dockerOutput([
    "ps",
    "--filter",
    `label=com.docker.compose.project=${composeProjectName}`,
    "--filter",
    `label=com.docker.compose.service=${service}`,
    "--format",
    "{{.ID}}",
  ])
    .split(/\r?\n/u)
    .filter(Boolean);
  expect(ids).toHaveLength(1);
  const binding = dockerOutput(["port", ids[0]!, String(targetPort)]);
  expect(binding).toMatch(/^127\.0\.0\.1:(\d+)$/u);
  return new URL(`http://${binding}`);
}

test.beforeAll(() => {
  expect(process.env.FACTORY_E2E_ISOLATED).toBe("1");
  expect(factoryProject).toMatch(/^factory-t9-[a-z0-9-]+$/u);
  const postgres = dockerOutput([
    "ps",
    "--filter",
    `label=com.docker.compose.project=${factoryProject}`,
    "--filter",
    "label=com.docker.compose.service=postgres",
    "--quiet",
  ]);
  expect(postgres).toMatch(/\S/u);
});

test("fresh Restaurant Describe automatically delivers a local customer and merchant app", async ({
  context,
  page,
  request,
}) => {
  test.setTimeout(1_800_000);
  let compilationId: string | null = null;
  let previewRunId: string | null = null;
  let verificationRunId: string | null = null;
  let submittedAt: number | null = null;
  let clarificationCycles = 0;
  let initialQuestionCount: number | null = null;
  let currentQuestionCount = 0;
  let currentCategoryCounts: Readonly<Record<string, number>> = {};
  let businessQuestionCount = 0;
  let nonemptyVerificationConfirmed = false;
  let generated: Page | null = null;

  try {
    const compilationStarted = page
      .waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          new URL(response.url()).pathname === "/compilations",
        { timeout: LIFECYCLE_RESPONSE_TIMEOUT_MS },
      )
      .then(async (response) => {
        expect(response.ok(), "automatic compilation response").toBeTruthy();
        const body = (await response.json()) as { readonly id?: unknown };
        if (typeof body.id !== "string" || body.id.length === 0) {
          throw new Error("Automatic compilation response was invalid.");
        }
        compilationId = body.id;
        return body.id;
      });
    void compilationStarted.catch(() => undefined);
    const verificationStarted = page
      .waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          /\/compilations\/[^/]+\/verification-runs$/u.test(
            new URL(response.url()).pathname,
          ),
        { timeout: LIFECYCLE_RESPONSE_TIMEOUT_MS },
      )
      .then(async (response) => {
        expect(response.ok(), "automatic verification response").toBeTruthy();
        const body = (await response.json()) as {
          readonly verificationRunId?: unknown;
        };
        if (
          typeof body.verificationRunId !== "string" ||
          !/^verify-[a-z0-9-]+$/u.test(body.verificationRunId)
        ) {
          throw new Error("Automatic verification response was invalid.");
        }
        verificationRunId = body.verificationRunId;
        return body.verificationRunId;
      });
    void verificationStarted.catch(() => undefined);
    const previewStarted = page
      .waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          /\/compilations\/[^/]+\/preview-runs$/u.test(
            new URL(response.url()).pathname,
          ),
        { timeout: LIFECYCLE_RESPONSE_TIMEOUT_MS },
      )
      .then(async (response) => {
        expect(response.ok(), "automatic preview response").toBeTruthy();
        const body = (await response.json()) as {
          readonly compilationId?: unknown;
          readonly id?: unknown;
        };
        if (
          typeof body.id !== "string" ||
          !/^preview-[a-z0-9-]+$/u.test(body.id) ||
          typeof body.compilationId !== "string" ||
          body.compilationId.length === 0
        ) {
          throw new Error("Automatic preview response was invalid.");
        }
        if (compilationId !== null && body.compilationId !== compilationId) {
          throw new Error("Automatic preview targeted the wrong compilation.");
        }
        previewRunId = body.id;
        return { compilationId: body.compilationId, previewRunId: body.id };
      });
    void previewStarted.catch(() => undefined);

    await page.goto("/");
    await page.getByLabel("Requirement brief").fill(restaurantBrief);
    submittedAt = Date.now();
    await page.getByRole("button", { name: "Create product" }).click();

    let consumerStart = await waitForConsumerStart(page);
    while (consumerStart === "clarification") {
      if (clarificationCycles >= 2) {
        throw new Error(
          "Consumer clarification exceeded the supported cycle limit.",
        );
      }
      clarificationCycles += 1;
      const answers = page.locator("ol.clarification-questions input");
      const questionsThisCycle = await answers.count();
      initialQuestionCount ??= questionsThisCycle;
      currentQuestionCount = questionsThisCycle;
      currentCategoryCounts = await answers.evaluateAll((inputs, allowed) => {
        const categories = new Set(allowed);
        const counts: Record<string, number> = {};
        for (const input of inputs) {
          const category = input.getAttribute("data-clarification-category");
          const key =
            category !== null && categories.has(category)
              ? category
              : "unknown";
          counts[key] = (counts[key] ?? 0) + 1;
        }
        return counts;
      }, Object.keys(clarificationAnswers));
      if (
        questionsThisCycle === 0 ||
        businessQuestionCount + questionsThisCycle > 3
      ) {
        throw new Error(
          "Consumer clarification exceeded the supported question limit.",
        );
      }
      businessQuestionCount += questionsThisCycle;
      for (let index = 0; index < questionsThisCycle; index += 1) {
        await answers
          .nth(index)
          .fill(
            clarificationAnswerForCategory(
              await answers
                .nth(index)
                .getAttribute("data-clarification-category"),
            ),
          );
      }
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      consumerStart = await waitForConsumerStart(page);
    }

    const delivery = page.getByRole("region", { name: "Restaurant delivery" });
    await expect(delivery).toBeVisible({ timeout: INTERPRETATION_TIMEOUT_MS });
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
    await expect(delivery).toContainText("standard Restaurant configuration");
    await expect(delivery).toContainText(
      "sample menu items and simulated payments",
    );

    const observedCompilationId = await compilationStarted;
    expect(observedCompilationId).toBe(compilationId);
    const observedVerificationRunId = await verificationStarted;
    expect(observedVerificationRunId).toBe(verificationRunId);
    await expect
      .poll(
        async () => {
          const response = await request.get(
            controlPlaneUrl(
              `/verification-runs/${encodeURIComponent(observedVerificationRunId)}`,
            ),
          );
          if (!response.ok()) return null;
          const body = (await response.json()) as {
            readonly status?: string;
            readonly evidence?: { readonly steps?: unknown };
          };
          return body.status === "succeeded" &&
            Array.isArray(body.evidence?.steps) &&
            body.evidence.steps.length > 0
            ? "verified"
            : (body.status ?? null);
        },
        { timeout: 910_000 },
      )
      .toBe("verified");
    nonemptyVerificationConfirmed = true;
    const startedPreview = await previewStarted;
    expect(startedPreview.compilationId).toBe(compilationId);
    expect(startedPreview.previewRunId).toBe(previewRunId);

    await expect
      .poll(
        async () => (await currentPreview(request, compilationId!))?.status,
        {
          timeout: 315_000,
        },
      )
      .toBe("ready");
    const readyPreview = await currentPreview(request, compilationId);
    expect(readyPreview?.id).toBe(previewRunId);
    expect(readyPreview?.previewUrl).toBeTruthy();
    const previewOrigin = new URL(readyPreview!.previewUrl!);
    expect(["127.0.0.1", "localhost", "[::1]"]).toContain(
      previewOrigin.hostname,
    );
    await expect(
      delivery.getByRole("link", { name: "Open local app" }),
    ).toHaveAttribute("href", readyPreview!.previewUrl!);
    await expect(page.getByLabel("Requirement brief")).toHaveCount(0);
    const elapsedToVerifiedReadyMs = Date.now() - submittedAt;
    console.info(
      "FACTORY_CONSUMER_D1_EVIDENCE",
      JSON.stringify({
        businessQuestionCount,
        elapsedToVerifiedReadyMs,
        nonemptyVerificationConfirmed,
        userHandoffCount: 0,
      }),
    );
    await captureSafeScreenshot(page, "workbench-ready-desktop").catch(
      () => undefined,
    );

    await expectNoOverflow(page, 1440);
    await expectNoOverflow(page, 390);
    await page.setViewportSize({ width: 1440, height: 960 });

    generated = await context.newPage();
    expect((await generated.goto(previewOrigin.toString()))?.ok()).toBeTruthy();
    await expect(
      generated.getByRole("heading", { level: 1, name: "Maison Aurelia" }),
    ).toBeVisible();
    const dish = new URL(previewOrigin);
    dish.pathname = "/menu/margherita-pizza";
    expect((await generated.goto(dish.toString()))?.ok()).toBeTruthy();
    await expect(
      generated.getByRole("heading", { name: "Margherita pizza" }),
    ).toBeVisible();
    const lineAdded = generated.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/cart/items",
    );
    const dishReloaded = generated.waitForNavigation();
    await generated.getByRole("button", { name: "Add to order" }).click();
    expect((await lineAdded).ok()).toBeTruthy();
    await dishReloaded;
    const cart = new URL(previewOrigin);
    cart.pathname = "/cart";
    await generated.goto(cart.toString());
    await expect(
      generated.getByRole("heading", { name: "Cart item" }),
    ).toBeVisible();
    const checkout = new URL(previewOrigin);
    checkout.pathname = "/checkout";
    await generated.goto(checkout.toString());
    const paidResponse = generated.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/checkout",
    );
    const checkoutReloaded = generated.waitForNavigation();
    await generated.getByRole("button", { name: "Pay", exact: true }).click();
    expect((await paidResponse).ok()).toBeTruthy();
    await checkoutReloaded;
    const orders = new URL(previewOrigin);
    orders.pathname = "/orders";
    await generated.goto(orders.toString());
    await expect(
      generated.getByText("Paid (simulated)", { exact: true }),
    ).toBeVisible();

    expect(readyPreview?.apiPort).toEqual(expect.any(Number));
    const managerOrigin = new URL(`http://127.0.0.1:${readyPreview!.apiPort!}`);
    const merchantOrders = async (origin: URL) => {
      const response = await request.get(
        new URL("/api/merchant/orders", origin).toString(),
      );
      expect(response.ok()).toBeTruthy();
      return (await response.json()) as {
        readonly orders: readonly {
          id: string;
          status: string;
          version: number;
        }[];
      };
    };
    const paid = (await merchantOrders(managerOrigin)).orders.find(
      (order) => order.status === "paid",
    );
    expect(paid).toBeDefined();
    const composeProjectName = readyPreview!.composeProjectName;
    const cashierOrigin = roleOrigin(composeProjectName, "cashier", 3003);
    expect(
      (await merchantOrders(cashierOrigin)).orders.find(
        (order) => order.id === paid!.id,
      )?.status,
    ).toBe("paid");
    const kitchenOrigin = roleOrigin(composeProjectName, "kitchen", 3002);
    const kitchenActionUrl = new URL(
      `/api/merchant/kitchen/${encodeURIComponent(paid!.id)}/actions`,
      kitchenOrigin,
    ).toString();
    const acceptedPayload = { action: "accept", expectedVersion: 1 };
    const accepted = await request.post(kitchenActionUrl, {
      data: acceptedPayload,
      headers: {
        "content-type": "application/json",
        "idempotency-key": "consumer-accept",
      },
    });
    expect(accepted.ok(), "accept").toBeTruthy();
    const acceptedBody = (await accepted.json()) as {
      readonly order?: {
        readonly id?: unknown;
        readonly status?: unknown;
        readonly version?: unknown;
      };
    };
    expect(acceptedBody.order?.id).toBe(paid!.id);
    expect(acceptedBody.order?.status).toBe("accepted");
    expect(acceptedBody.order?.version).toEqual(expect.any(Number));
    const acceptedVersion = acceptedBody.order!.version;
    const acceptedReplay = await request.post(kitchenActionUrl, {
      data: acceptedPayload,
      headers: {
        "content-type": "application/json",
        "idempotency-key": "consumer-accept",
      },
    });
    expect(acceptedReplay.ok(), "duplicate accept").toBeTruthy();
    expect(await acceptedReplay.json()).toEqual(acceptedBody);
    const acceptedAfterReplay = (
      await merchantOrders(managerOrigin)
    ).orders.find((order) => order.id === paid!.id);
    expect(acceptedAfterReplay).toMatchObject({
      status: acceptedBody.order!.status,
      version: acceptedVersion,
    });

    for (const [action, expectedVersion] of [
      ["start-preparing", 2],
      ["mark-ready", 3],
    ] as const) {
      const response = await request.post(kitchenActionUrl, {
        data: { action, expectedVersion },
        headers: {
          "content-type": "application/json",
          "idempotency-key": `consumer-${action}`,
        },
      });
      expect(response.ok(), action).toBeTruthy();
    }
    const denied = await request.post(
      new URL(
        `/api/merchant/kitchen/${encodeURIComponent(paid!.id)}/actions`,
        previewOrigin,
      ).toString(),
      {
        data: { action: "accept", expectedVersion: 4 },
        headers: {
          "content-type": "application/json",
          "idempotency-key": "consumer-customer-denied",
        },
      },
    );
    expect(denied.status()).toBe(403);
    const customerOrder = await generated.evaluate(async (orderId) => {
      const response = await fetch(
        `/api/orders/${encodeURIComponent(orderId)}`,
      );
      return { status: response.status, body: await response.json() };
    }, paid!.id);
    expect(customerOrder.status).toBe(200);
    expect(customerOrder.body.order?.status).toBe("ready");
    expect(
      (await merchantOrders(managerOrigin)).orders.find(
        (order) => order.id === paid!.id,
      )?.status,
    ).toBe("ready");
    expect(
      (await merchantOrders(cashierOrigin)).orders.find(
        (order) => order.id === paid!.id,
      )?.status,
    ).toBe("ready");
    await generated
      .getByRole("link", { name: "Refresh status", exact: true })
      .click();
    await expect(generated.getByText("Ready", { exact: true })).toBeVisible();
    await expectNoOverflow(generated, 1440);
    await expectNoOverflow(generated, 390);
    await captureSafeScreenshot(generated, "generated-mobile").catch(
      () => undefined,
    );
  } catch (error) {
    if (submittedAt !== null) {
      console.info(
        "FACTORY_CONSUMER_D1_FAILURE_EVIDENCE",
        JSON.stringify({
          businessQuestionCount,
          clarificationCycles,
          currentCategoryCounts,
          currentQuestionCount,
          elapsedSinceSubmitMs: Date.now() - submittedAt,
          initialQuestionCount,
          nonemptyVerificationConfirmed,
        }),
      );
    }
    throw error;
  } finally {
    await generated?.close().catch(() => undefined);
    if (compilationId !== null) {
      const preview =
        previewRunId === null
          ? await currentPreview(request, compilationId)
          : null;
      const exactPreviewRunId = previewRunId ?? preview?.id;
      if (exactPreviewRunId !== undefined) {
        await stopPreview(request, compilationId, exactPreviewRunId);
      }
    }
  }
});
