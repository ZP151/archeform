import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { OpenAIRequirementInterpreterAdapter } from "@factory/adapters";
import {
  controlPlaneUrl,
  currentPreview,
  stopPreview,
} from "./helpers/restaurant-delivery";

const factoryProject = process.env.FACTORY_E2E_FACTORY_PROJECT;
const controlPlaneBase = process.env.FACTORY_E2E_CONTROL_PLANE_URL;
const evidenceDirectory = resolve(
  process.cwd(),
  "docs/acceptance/evidence/appointment-booking",
);
const timeoutMs = 1_800_000;
const appointmentBrief =
  "Build an appointment booking application. Customers choose a service and an available time, staff confirm or reschedule appointments, and administrators manage services, schedules, and cancellations.";

type JsonRecord = Record<string, unknown>;
type Preview = {
  readonly id: string;
  readonly compilationId: string;
  readonly status: string;
  readonly previewUrl: string | null;
  readonly composeProjectName: string;
};

function hash(value: string | Uint8Array): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function jsonBody(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Expected a JSON object.");
  return value as JsonRecord;
}

function responseCode(value: unknown): string | null {
  const body = value as JsonRecord;
  return typeof body.code === "string" ? body.code : null;
}

function sessionHeaders(
  session: "customer" | "staff" | "administrator",
  idempotencyKey?: string,
): Record<string, string> {
  return {
    "content-type": "application/json",
    "x-factory-fixture-session": `fixture-session-${session}`,
    ...(idempotencyKey ? { "x-factory-idempotency-key": idempotencyKey } : {}),
  };
}

async function apiJson(
  request: APIRequestContext,
  origin: string,
  path: string,
  options: {
    readonly method?: "GET" | "POST";
    readonly session: "customer" | "staff" | "administrator";
    readonly idempotencyKey?: string;
    readonly body?: unknown;
  },
): Promise<{
  readonly status: number;
  readonly body: JsonRecord | JsonRecord[];
}> {
  const response = await request.fetch(new URL(path, origin).toString(), {
    method: options.method ?? "GET",
    headers: sessionHeaders(options.session, options.idempotencyKey),
    ...(options.body === undefined ? {} : { data: options.body }),
  });
  const text = await response.text();
  let body: JsonRecord | JsonRecord[];
  try {
    body = JSON.parse(text) as JsonRecord | JsonRecord[];
  } catch {
    throw new Error(
      `Generated API returned non-JSON status ${response.status()}.`,
    );
  }
  return { status: response.status(), body };
}

function docker(args: readonly string[]): string {
  return execFileSync("docker", [...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function dockerExitCode(args: readonly string[]): 0 | 1 {
  const result = spawnSync("docker", [...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) throw result.error;
  if (result.status === 0 || result.status === 1) return result.status;
  throw new Error("Docker resource check failed.");
}

function previewResourceState(
  previewRunId: string,
  composeProjectName: string,
): Record<"artifact" | "containers" | "networks" | "volumes", string> {
  if (!factoryProject)
    throw new Error("FACTORY_E2E_FACTORY_PROJECT is required.");
  const workerContainer = docker([
    "ps",
    "--filter",
    `label=com.docker.compose.project=${factoryProject}`,
    "--filter",
    "label=com.docker.compose.service=compiler-worker",
    "--quiet",
  ]);
  expect(workerContainer).toMatch(/\S/);
  return {
    artifact:
      dockerExitCode([
        "exec",
        workerContainer,
        "test",
        "-d",
        `/artifacts/.preview-runs/${previewRunId}`,
      ]) === 0
        ? "present"
        : "",
    containers: docker([
      "ps",
      "--all",
      "--filter",
      `label=com.docker.compose.project=${composeProjectName}`,
      "--quiet",
    ]),
    networks: docker([
      "network",
      "ls",
      "--filter",
      `label=com.docker.compose.project=${composeProjectName}`,
      "--quiet",
    ]),
    volumes: docker([
      "volume",
      "ls",
      "--filter",
      `label=com.docker.compose.project=${composeProjectName}`,
      "--quiet",
    ]),
  };
}

async function captureGenerated(page: Page, name: string): Promise<void> {
  await mkdir(evidenceDirectory, { recursive: true });
  for (const viewport of [
    { label: "390x844", width: 390, height: 844 },
    { label: "768x1024", width: 768, height: 1024 },
    { label: "1440x900", width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.screenshot({
      path: resolve(evidenceDirectory, `${name}-${viewport.label}.png`),
      fullPage: true,
    });
  }
}

async function canonicalInterpretation(requirementId: string) {
  return new OpenAIRequirementInterpreterAdapter({
    readEnvironment: () => "fixture-key",
    transport: {
      async create() {
        return {
          outputText: JSON.stringify({
            resultKind: "definition-selection",
            definitionSelection: {
              definitionKey: "appointment-booking-v1",
              disposition: "supported-default",
              requirementId,
              title: "Appointment Booking",
              outcome: "Complete the reviewed local business workflow.",
              materialQuestions: [],
              businessParameters: null,
            },
            generatedInterpretation: null,
          }),
        };
      },
    },
  }).interpret({ brief: appointmentBrief, answers: {} });
}

async function waitForPreviewReady(
  request: APIRequestContext,
  compilationId: string,
): Promise<Preview> {
  let current: Preview | null = null;
  await expect
    .poll(
      async () => {
        current = (await currentPreview(
          request,
          compilationId,
        )) as Preview | null;
        return current?.status ?? null;
      },
      { timeout: 300_000 },
    )
    .toBe("ready");
  if (!current || !current.previewUrl) throw new Error("Preview URL missing.");
  expect(current.composeProjectName).toMatch(/^factory-preview-[a-z0-9-]+$/u);
  return current;
}

async function waitForGeneratedApi(
  request: APIRequestContext,
  origin: string,
): Promise<void> {
  await expect
    .poll(
      async () => {
        try {
          return (
            await request.get(new URL("/api/health", origin).toString())
          ).status();
        } catch {
          return 0;
        }
      },
      { timeout: 120_000 },
    )
    .toBe(200);
}

test.describe.configure({ mode: "serial", retries: 0 });

test("Appointment Booking completes the local lifecycle and atomic business journey", async ({
  page,
  context,
  request,
}) => {
  test.setTimeout(timeoutMs);
  context.setDefaultTimeout(45_000);
  expect(process.env.FACTORY_E2E_ISOLATED).toBe("1");
  expect(factoryProject).toMatch(/^factory-t10-[a-z0-9-]+$/u);
  expect(controlPlaneBase).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/u);

  const interpretation = await canonicalInterpretation(
    `appointment-booking-e2e-${randomUUID()}`,
  );
  const startedAt = Date.now();
  let compilationId: string | null = null;
  let preview: Preview | null = null;
  let generated: Page | null = null;
  const lifecycle: string[] = [];
  const safeEvidence: JsonRecord = {
    definitionKey: "appointment-booking-v1",
    authoredSelections: 1,
    modelCalls: 0,
    technicalHandoffs: 0,
    inRunManualRescues: 0,
    scope: "isolated-local-fixture-session",
  };

  await page.route("**/api/requirements/interpret", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(interpretation),
    });
  });

  try {
    await page.goto("/");
    await expect(
      page.getByText("Control Plane ready", { exact: true }),
    ).toBeVisible({
      timeout: 120_000,
    });
    await page.getByLabel("Requirement brief").fill(appointmentBrief);
    await page
      .getByRole("button", { name: "Create product", exact: true })
      .click();

    const choose = page.getByRole("button", { name: /^Choose /u }).first();
    await expect(choose).toBeVisible({ timeout: 180_000 });
    await choose.click();
    const apply = page.getByRole("button", {
      name: "Apply to Draft",
      exact: true,
    });
    await expect(apply).toBeVisible({ timeout: 90_000 });
    await apply.click();
    await expect(page.getByLabel("Puck Page Studio")).toBeVisible({
      timeout: 120_000,
    });

    const release = page.getByRole("region", { name: "Release", exact: true });
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(release).toBeVisible();

    const publishedResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        /\/application-graphs\/[^/]+\/published-revisions$/u.test(
          new URL(response.url()).pathname,
        ),
    );
    await release
      .getByRole("button", { name: "Publish Draft", exact: true })
      .click();
    const published = jsonBody(await (await publishedResponse).json());
    expect(typeof published.id).toBe("string");
    expect(published.graphHash).toMatch(/^sha256:[a-f0-9]{64}$/u);
    lifecycle.push("publish");
    safeEvidence.publishedRevisionId = published.id;
    safeEvidence.inputGraphHash = published.graphHash;
    safeEvidence.compositionLockHash =
      typeof published.compositionLockHash === "string"
        ? published.compositionLockHash
        : null;

    const compileResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/compilations",
    );
    await expect(
      release.getByRole("button", {
        name: "Compile Published Graph",
        exact: true,
      }),
    ).toBeVisible({ timeout: 60_000 });
    await release
      .getByRole("button", { name: "Compile Published Graph", exact: true })
      .click();
    const compilation = jsonBody(await (await compileResponse).json());
    expect(typeof compilation.id).toBe("string");
    expect(compilation.publishedRevisionId).toBe(published.id);
    compilationId = compilation.id as string;
    lifecycle.push("compile");
    safeEvidence.compilationId = compilationId;

    const verify = release.getByRole("button", {
      name: "Run Isolated Verification",
      exact: true,
    });
    await expect(verify).toBeVisible({ timeout: 315_000 });
    await verify.click();
    await expect(release.locator(".release-evidence-summary")).toBeVisible({
      timeout: 910_000,
    });
    const summary =
      (await release.locator(".release-evidence-summary").textContent()) ?? "";
    expect(summary).toMatch(/\d+ steps · \d+ passed · 0 failed/u);
    lifecycle.push("verify");

    const startPreview = release.getByRole("button", {
      name: "Start Preview",
      exact: true,
    });
    await expect(startPreview).toBeVisible();
    const previewResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        /\/compilations\/[^/]+\/preview-runs$/u.test(
          new URL(response.url()).pathname,
        ),
    );
    await startPreview.click();
    const started = jsonBody(await (await previewResponse).json());
    expect(started.id).toMatch(/^preview-[a-z0-9-]+$/u);
    preview = await waitForPreviewReady(request, compilationId);
    expect(preview.id).toBe(started.id);
    lifecycle.push("preview");
    safeEvidence.previewRunId = preview.id;
    safeEvidence.lifecycle = lifecycle;

    const previewPagePromise = context.waitForEvent("page");
    await release
      .getByRole("link", { name: "Open preview", exact: true })
      .click();
    generated = await previewPagePromise;
    await generated.waitForLoadState("domcontentloaded");
    await expect(generated.locator("main.generated-app")).toBeVisible({
      timeout: 120_000,
    });
    const origin = preview.previewUrl;
    await waitForGeneratedApi(request, origin);
    await captureGenerated(generated, "appointment-list");

    const admin = "administrator" as const;
    const service = await apiJson(request, origin, "/api/service", {
      method: "POST",
      session: admin,
      body: {
        name: "Follow-up consultation",
        durationMinutes: 30,
        active: true,
      },
    });
    expect(service.status).toBe(201);
    const serviceRecord = jsonBody(service.body);
    const serviceId = serviceRecord.id;
    expect(typeof serviceId).toBe("string");
    const scheduleA = await apiJson(request, origin, "/api/schedule", {
      method: "POST",
      session: admin,
      body: {
        serviceId,
        startUtc: "2026-10-02T09:00:00Z",
        endUtc: "2026-10-02T09:30:00Z",
        timezone: "Asia/Singapore",
        capacity: 1,
        status: "open",
      },
    });
    const scheduleB = await apiJson(request, origin, "/api/schedule", {
      method: "POST",
      session: admin,
      body: {
        serviceId,
        startUtc: "2026-10-03T09:00:00Z",
        endUtc: "2026-10-03T09:30:00Z",
        timezone: "America/Los_Angeles",
        capacity: 1,
        status: "open",
      },
    });
    expect(scheduleA.status).toBe(201);
    expect(scheduleB.status).toBe(201);
    const scheduleAId = jsonBody(scheduleA.body).id;
    const scheduleBId = jsonBody(scheduleB.body).id;
    expect(typeof scheduleAId).toBe("string");
    expect(typeof scheduleBId).toBe("string");

    const beforeAppointments = await apiJson(
      request,
      origin,
      "/api/appointment",
      {
        session: "staff",
      },
    );
    expect(Array.isArray(beforeAppointments.body)).toBe(true);
    const requestKey = `appointment-e2e-${randomUUID()}`;
    const first = await apiJson(request, origin, "/api/appointment", {
      method: "POST",
      session: "customer",
      idempotencyKey: requestKey,
      body: {
        values: {
          scheduleId: scheduleAId,
          customerName: "Customer A",
          notes: "Initial request",
        },
      },
    });
    expect(first.status).toBe(201);
    const firstRecord = jsonBody(first.body);
    expect(firstRecord.status).toBe("requested");
    expect(firstRecord.version).toBe(0);
    const recordId = firstRecord.id;
    expect(typeof recordId).toBe("string");
    await captureGenerated(generated, "appointment-form");

    const confirmed = await apiJson(
      request,
      origin,
      `/api/appointment/${encodeURIComponent(String(recordId))}/events/confirm`,
      {
        method: "POST",
        session: "staff",
        idempotencyKey: `appointment-confirm-${randomUUID()}`,
        body: { expectedVersion: 0 },
      },
    );
    expect(confirmed.status).toBe(200);
    expect(jsonBody(confirmed.body).status).toBe("confirmed");
    expect(jsonBody(confirmed.body).version).toBe(1);

    const beforeConflict = await apiJson(request, origin, "/api/appointment", {
      session: "staff",
    });
    const conflict = await apiJson(request, origin, "/api/appointment", {
      method: "POST",
      session: "customer",
      idempotencyKey: `appointment-conflict-${randomUUID()}`,
      body: {
        values: { scheduleId: scheduleAId, customerName: "Customer B" },
      },
    });
    expect(conflict.status).toBe(409);
    expect(responseCode(conflict.body)).toBe("appointment.capacity_conflict");
    const afterConflict = await apiJson(request, origin, "/api/appointment", {
      session: "staff",
    });
    expect(Array.isArray(beforeConflict.body)).toBe(true);
    expect(Array.isArray(afterConflict.body)).toBe(true);
    expect((afterConflict.body as JsonRecord[]).length).toBe(
      (beforeConflict.body as JsonRecord[]).length,
    );
    await captureGenerated(generated, "appointment-error");

    const moved = await apiJson(
      request,
      origin,
      `/api/appointment/${encodeURIComponent(String(recordId))}/events/reschedule`,
      {
        method: "POST",
        session: "staff",
        idempotencyKey: `appointment-move-${randomUUID()}`,
        body: { expectedVersion: 1, scheduleId: scheduleBId },
      },
    );
    expect(moved.status).toBe(200);
    expect(jsonBody(moved.body).status).toBe("requested");
    expect(jsonBody(moved.body).version).toBe(2);
    expect(jsonBody(moved.body).scheduleId).toBe(scheduleBId);

    const cancelled = await apiJson(
      request,
      origin,
      `/api/appointment/${encodeURIComponent(String(recordId))}/events/cancel`,
      {
        method: "POST",
        session: "customer",
        idempotencyKey: `appointment-cancel-${randomUUID()}`,
        body: { expectedVersion: 2, cancellationReason: "Schedule changed" },
      },
    );
    expect(cancelled.status).toBe(200);
    expect(jsonBody(cancelled.body).status).toBe("cancelled");
    expect(jsonBody(cancelled.body).version).toBe(3);

    const history = await apiJson(
      request,
      origin,
      `/api/appointment/${encodeURIComponent(String(recordId))}/appointment-history`,
      { session: "staff" },
    );
    expect(history.status).toBe(200);
    const historyActions = (history.body as JsonRecord[]).map(
      (entry) => entry.action,
    );
    expect(historyActions).toEqual(["claim", "confirm", "move", "cancel"]);
    expect(
      (history.body as JsonRecord[]).every(
        (entry) => typeof entry.at === "string",
      ),
    ).toBe(true);
    await captureGenerated(generated, "appointment-history");

    const apiContainer = docker([
      "ps",
      "--filter",
      `label=com.docker.compose.project=${preview.composeProjectName}`,
      "--filter",
      "label=com.docker.compose.service=api",
      "--quiet",
    ]);
    expect(apiContainer).toMatch(/^[a-f0-9]+$/u);
    docker(["restart", apiContainer]);
    await expect
      .poll(
        async () => {
          try {
            return (
              await request.get(new URL("/api/health", origin).toString())
            ).status();
          } catch {
            return 0;
          }
        },
        { timeout: 120_000 },
      )
      .toBe(200);
    const replay = await apiJson(request, origin, "/api/appointment", {
      method: "POST",
      session: "customer",
      idempotencyKey: requestKey,
      body: {
        values: {
          scheduleId: scheduleAId,
          customerName: "Customer A",
          notes: "Initial request",
        },
      },
    });
    expect(replay.status).toBe(201);
    expect(replay.body).toEqual(first.body);
    const historyAfterReplay = await apiJson(
      request,
      origin,
      `/api/appointment/${encodeURIComponent(String(recordId))}/appointment-history`,
      { session: "staff" },
    );
    expect((historyAfterReplay.body as JsonRecord[]).length).toBe(
      (history.body as JsonRecord[]).length,
    );

    const denied = await apiJson(
      request,
      origin,
      `/api/appointment/${encodeURIComponent(String(recordId))}/events/confirm`,
      {
        method: "POST",
        session: "customer",
        idempotencyKey: `appointment-denied-${randomUUID()}`,
        body: { expectedVersion: 3 },
      },
    );
    expect(denied.status).toBe(403);
    expect(responseCode(denied.body)).toBe("appointment.forbidden");
    await captureGenerated(generated, "appointment-retry");

    await generated.locator("main.generated-app").evaluate((element) => {
      element.setAttribute("data-theme", "dark");
    });
    await captureGenerated(generated, "appointment-dark");
    await captureGenerated(generated, "appointment-media-fallback");

    const compilationDetails = await request.get(
      controlPlaneUrl(`/compilations/${encodeURIComponent(compilationId)}`),
    );
    expect(compilationDetails.ok()).toBe(true);
    const compilationPayload = jsonBody(await compilationDetails.json());
    safeEvidence.immutableCompilationPreserved = true;
    safeEvidence.compilationArtifactManifestHash = hash(
      JSON.stringify(compilationPayload.artifacts ?? compilationPayload),
    );
    safeEvidence.elapsedMs = Date.now() - startedAt;

    const sourceIdentity = {
      gitHead: execFileSync("git", ["rev-parse", "HEAD"], {
        encoding: "utf8",
      }).trim(),
      publishedGraphHash: published.graphHash,
      compositionLockHash: safeEvidence.compositionLockHash,
      compilationId,
      taskSources: {
        appointmentContract: hash(
          await readFile(
            "packages/compiler/src/appointment-mutation-contract.ts",
          ),
        ),
        admission: hash(
          await readFile(
            "packages/compiler/src/appointment-compilation-admission.ts",
          ),
        ),
        definitionCatalogue: hash(
          await readFile(
            "packages/adapters/src/requirements/definitions/product-definitions.v1.json",
          ),
        ),
        capability: hash(
          await readFile(
            "packages/capabilities/assets/scheduling.appointment/1.0.1/component.json",
          ),
        ),
      },
      scope: "isolated-local-fixture-session",
    };
    await mkdir(evidenceDirectory, { recursive: true });
    await writeFile(
      resolve(evidenceDirectory, "delivery-journey.json"),
      JSON.stringify(safeEvidence, null, 2) + "\n",
    );
    await writeFile(
      resolve(evidenceDirectory, "correction-journey.json"),
      JSON.stringify(
        {
          recordId: hash(String(recordId)),
          requestVersion: firstRecord.version,
          confirmVersion: jsonBody(confirmed.body).version,
          moveVersion: jsonBody(moved.body).version,
          cancelVersion: jsonBody(cancelled.body).version,
          statuses: [
            firstRecord.status,
            jsonBody(confirmed.body).status,
            jsonBody(moved.body).status,
            jsonBody(cancelled.body).status,
          ],
          historyActions,
          slotTimezones: ["Asia/Singapore", "America/Los_Angeles"],
          capacityConflict: {
            status: conflict.status,
            code: responseCode(conflict.body),
            unchanged: true,
          },
          replay: {
            afterApiRestart: true,
            identical: true,
            noAdditionalEffects: true,
          },
          denied: { status: denied.status, code: responseCode(denied.body) },
          modelCalls: 0,
          scope: "isolated-local-fixture-session",
        },
        null,
        2,
      ) + "\n",
    );
    await writeFile(
      resolve(evidenceDirectory, "source-identity.json"),
      JSON.stringify(sourceIdentity, null, 2) + "\n",
    );
  } finally {
    await generated?.close().catch(() => undefined);
    if (preview && compilationId) {
      await stopPreview(request, compilationId, preview.id).catch(
        () => undefined,
      );
      await expect
        .poll(
          () => previewResourceState(preview!.id, preview!.composeProjectName),
          {
            timeout: 120_000,
          },
        )
        .toEqual({ artifact: "", containers: "", networks: "", volumes: "" });
      await mkdir(evidenceDirectory, { recursive: true });
      await writeFile(
        resolve(evidenceDirectory, "runtime-cleanup.json"),
        JSON.stringify(
          {
            previewRunId: preview.id,
            composeProjectName: preview.composeProjectName,
            stopped: true,
            resources: previewResourceState(
              preview.id,
              preview.composeProjectName,
            ),
            scope: "isolated-local-fixture-session",
          },
          null,
          2,
        ) + "\n",
      );
    }
  }
});
