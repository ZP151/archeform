import { OpenAIRequirementInterpreterAdapter } from "../../packages/adapters/dist/index.js";
import {
  expect,
  type APIRequestContext,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  immutableApprovalFingerprint,
  navigateApproval,
  verifyApprovalAssets,
  verifyApprovalCorrection,
  verifyAssetFailureDetection,
  verifyExpressiveRecovery,
  verifyWorkspaceComposition,
  type ApprovalCorrectionOptions,
} from "../approval-presentation";

type Preview = {
  readonly id: string;
  readonly compilationId: string;
  readonly status: string;
  readonly previewUrl: string | null;
  readonly composeProjectName: string;
};

export type ApprovalDefinitionCase = {
  readonly definitionKey: string;
  readonly requirementIdPrefix?: string;
  readonly brief: string;
  readonly title: string;
  readonly outcome: string;
  readonly deliveryRegion: string;
  readonly evidenceDirectory: string;
  readonly correction: Omit<
    ApprovalCorrectionOptions,
    "evidence" | "previewProject"
  >;
  readonly retainedDetails?: Readonly<Record<string, string>>;
  readonly requireVisibleSummaryLabels?: boolean;
  readonly calculatedOutput?: { readonly key: string; readonly label: string };
  readonly visibleSummary?: readonly {
    readonly label: string;
    readonly corrected: string;
    readonly additional: string;
  }[];
  readonly additionalApprovedRecord: {
    readonly identity: string;
    readonly fields: Record<string, string>;
    readonly selectValue?: string;
  };
};

export const publicationReviewDefinitionCase: ApprovalDefinitionCase = {
  definitionKey: "publication-review",
  brief:
    "Build a local publication review application. Authors submit article titles and content for a channel. Editors return or approve submissions, and auditors read the decisions. Approval records editorial review only; do not publish externally.",
  title: "Publication Review",
  outcome:
    "Authors submit content and editors decide it; auditors read retained editorial decisions.",
  deliveryRegion: "Approval delivery",
  evidenceDirectory: resolve(
    process.cwd(),
    "docs/acceptance/evidence/definition-batch-one/publication-review",
  ),
  correction: {
    entity: "submission",
    requester: "author",
    reviewer: "editor",
    auditor: "auditor",
    list: "All submissions",
    create: "New submission",
    createAction: "Create Submission",
    identity: "Local editorial correction article",
    identityField: "Article title",
    identityKey: "articleTitle",
    fields: {
      "Article title": "Local editorial correction article",
      "Content body": "Initial review copy for a local publication submission.",
      "Editorial notes": "Keep the opening concise for the local review.",
    },
    select: {
      key: "channel",
      label: "Channel",
      value: "blog",
      invalidValue: "external-publish",
    },
    requiredFields: [
      { key: "articleTitle", label: "Article title" },
      { key: "contentBody", label: "Content body" },
    ],
    recordMedia: "optional",
    assertAuditorDenied: true,
    correction: {
      key: "contentBody",
      label: "Content body",
      initialInput: "Initial review copy for a local publication submission.",
      firstEditInput:
        "First editorial correction for the local publication submission.",
      concurrentApiValue:
        "Concurrent editorial correction for the local publication submission.",
      expectedConflictValue:
        "Concurrent editorial correction for the local publication submission.",
      finalInput: "Final reviewed copy for the local publication submission.",
      expectedFinalValue:
        "Final reviewed copy for the local publication submission.",
    },
  },
  additionalApprovedRecord: {
    identity: "Second newsletter editorial review",
    fields: {
      "Article title": "Second newsletter editorial review",
      "Content body":
        "A distinct newsletter submission for final editorial approval.",
    },
    selectValue: "newsletter",
  },
  retainedDetails: {
    "Editorial notes": "Keep the opening concise for the local review.",
  },
};

function controlPlaneUrl(path: string): string {
  const base = process.env.FACTORY_E2E_CONTROL_PLANE_URL;
  if (!base) throw new Error("Isolated Control Plane URL is required.");
  const url = new URL(base);
  if (url.hostname !== "127.0.0.1" || url.username || url.password)
    throw new Error("Control Plane must be loopback.");
  return new URL(path, url).toString();
}

function docker(args: readonly string[]): string {
  return execFileSync("docker", [...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

async function currentPreview(
  request: APIRequestContext,
  compilationId: string,
): Promise<Preview | null> {
  const response = await request.get(
    controlPlaneUrl(
      `/compilations/${encodeURIComponent(compilationId)}/preview-runs/current`,
    ),
  );
  if (!response.ok()) return null;
  const body = await response.text();
  if (!body.trim()) return null;
  const value = JSON.parse(body) as Partial<Preview>;
  return value.compilationId === compilationId &&
    typeof value.id === "string" &&
    typeof value.status === "string" &&
    typeof value.composeProjectName === "string"
    ? (value as Preview)
    : null;
}

async function stopExactPreview(
  request: APIRequestContext,
  compilationId: string,
): Promise<void> {
  const preview = await currentPreview(request, compilationId);
  if (!preview) return;
  expect(preview.composeProjectName).toMatch(/^factory-preview-[a-z0-9-]+$/);
  const stopped = await request.post(
    controlPlaneUrl(`/preview-runs/${encodeURIComponent(preview.id)}/stop`),
    { data: {} },
  );
  expect(stopped.ok(), "exact definition preview stop").toBe(true);
  await expect
    .poll(async () => (await currentPreview(request, compilationId))?.status, {
      timeout: 120_000,
    })
    .toBe("stopped");
  for (const resource of ["container", "network", "volume"]) {
    expect(
      docker([
        resource,
        "ls",
        ...(resource === "container" ? ["--all"] : []),
        "--filter",
        `label=com.docker.compose.project=${preview.composeProjectName}`,
        "--quiet",
      ]),
    ).toBe("");
  }
}

async function authoredInterpretation(
  definition: ApprovalDefinitionCase,
  requirementId: string,
) {
  return new OpenAIRequirementInterpreterAdapter({
    readEnvironment: () => "test-key",
    transport: {
      async create() {
        return {
          outputText: JSON.stringify({
            resultKind: "definition-selection",
            definitionSelection: {
              definitionKey: definition.definitionKey,
              requirementId,
              title: definition.title,
              outcome: definition.outcome,
              disposition: "supported-default",
              materialQuestions: [],
              businessParameters: null,
            },
            generatedInterpretation: null,
          }),
        };
      },
    },
  }).interpret({ brief: definition.brief, answers: {} });
}

function safeFailureCode(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const error = (value as { error?: unknown }).error;
  const code =
    error && typeof error === "object"
      ? (error as { code?: unknown }).code
      : (value as { code?: unknown }).code;
  return typeof code === "string" && /^[a-z][a-z0-9._-]{0,127}$/.test(code)
    ? code
    : null;
}

async function capturePrimaryScreen(
  page: Page,
  definition: ApprovalDefinitionCase,
): Promise<void> {
  await mkdir(definition.evidenceDirectory, { recursive: true });
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({
      path: resolve(definition.evidenceDirectory, `primary-${width}.png`),
      fullPage: true,
    });
    await verifyWorkspaceComposition(
      page,
      width,
      definition.correction.recordMedia,
    );
    const firstAction = page
      .locator(".generated-records > li")
      .first()
      .getByRole("button", { name: "Submit", exact: true });
    await expect(
      firstAction,
      "first primary action is reachable",
    ).toBeVisible();
    await expect(firstAction).toBeInViewport();
    const bounds = await firstAction.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    expect(
      bounds!.y + bounds!.height,
      "first Submit action is above the fold",
    ).toBeLessThanOrEqual(650);
  }
  await page.setViewportSize({ width: 390, height: 900 });
}

function visibleSummaryValue(
  row: import("@playwright/test").Locator,
  label: string,
) {
  return row
    .locator(".approval-summary dt", {
      hasText: new RegExp(`^${label}$`),
    })
    .locator("..")
    .locator("dd");
}

async function setDecisionHistoryOpen(
  page: Page,
  history: import("@playwright/test").Locator,
  open: boolean,
): Promise<void> {
  const isOpen = await history.evaluate(
    (element) => element instanceof HTMLDetailsElement && element.open,
  );
  if (isOpen !== open) {
    const summary = history.locator(":scope > summary");
    await summary.focus();
    await page.keyboard.press("Enter");
  }
  if (open) await expect(history).toHaveAttribute("open", "");
  else await expect(history).not.toHaveAttribute("open", "");
}

async function verifyVisibleBusinessIdentity(
  page: Page,
  definition: ApprovalDefinitionCase,
  records: readonly {
    readonly id: string;
    readonly identity: string;
    readonly summaries: readonly {
      readonly label: string;
      readonly value: string;
    }[];
    readonly decisionCount: number;
  }[],
): Promise<void> {
  const { correction } = definition;
  if (!correction.identityKey)
    throw new Error("Definition case must declare its visible identity key.");
  const history = page.locator(".approval-decision-history");
  await expect(history).toBeVisible();
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await setDecisionHistoryOpen(page, history, false);
    await page.evaluate(() => scrollTo(0, 0));
    await verifyWorkspaceComposition(page, width, correction.recordMedia);
    for (const record of records) {
      const row = page
        .locator(".generated-records > li")
        .filter({ hasText: record.identity });
      await expect(row).toHaveCount(1);
      const title = row.locator(".approval-record-title");
      await expect(title).toBeVisible();
      await expect(title).toContainText(record.identity);
      for (const summary of record.summaries) {
        if (definition.requireVisibleSummaryLabels) {
          const term = row.locator(".approval-summary dt", {
            hasText: new RegExp(`^${summary.label}$`),
          });
          await expect(term).toBeVisible();
          const style = await term.evaluate((node) => {
            const css = getComputedStyle(node),
              box = node.getBoundingClientRect();
            return {
              clip: css.clipPath,
              position: css.position,
              width: box.width,
              height: box.height,
            };
          });
          expect(style.clip).toBe("none");
          expect(style.position).not.toBe("absolute");
          expect(style.width).toBeGreaterThan(20);
          expect(style.height).toBeGreaterThan(10);
        }
        await expect(visibleSummaryValue(row, summary.label)).toBeVisible();
        await expect(visibleSummaryValue(row, summary.label)).toHaveText(
          summary.value,
        );
        if (summary.label === definition.calculatedOutput?.label)
          expect(
            await visibleSummaryValue(row, summary.label).evaluate((node) =>
              Number(getComputedStyle(node).fontWeight),
            ),
          ).toBeGreaterThanOrEqual(600);
      }
    }
    await page.screenshot({
      path: resolve(
        definition.evidenceDirectory,
        `two-authored-records-${width}.png`,
      ),
      fullPage: true,
    });

    await setDecisionHistoryOpen(page, history, true);
    await page.evaluate(() => scrollTo(0, 0));
    for (const record of records) {
      const historyRows = history
        .locator(".approval-history-row")
        .filter({ hasText: record.identity });
      await expect(historyRows).toHaveCount(record.decisionCount);
      for (const historyRow of await historyRows.all()) {
        const historyTitle = historyRow.getByRole("heading", { level: 3 });
        await expect(historyTitle).toBeVisible();
        await expect(historyTitle).toContainText(record.identity);
        for (const summary of record.summaries)
          await expect(historyTitle).toContainText(summary.value);
        await expect(
          historyRow.getByText(record.id, { exact: true }),
          "record identifiers stay out of the visible decision history summary",
        ).not.toBeVisible();
      }
    }
    await page.screenshot({
      path: resolve(
        definition.evidenceDirectory,
        `two-authored-history-${width}.png`,
      ),
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 390, height: 900 });
}

function detailValue(row: import("@playwright/test").Locator, label: string) {
  return row
    .locator(".approval-details-values dt", {
      hasText: new RegExp(`^${label}$`),
    })
    .locator("..")
    .locator("dd");
}

async function createAndApproveAdditionalRecord(
  page: Page,
  definition: ApprovalDefinitionCase,
): Promise<{ id: string; identity: string }> {
  const { correction, additionalApprovedRecord } = definition;
  await navigateApproval(page, correction.list);
  const role = page.getByLabel("Demo role", { exact: true });
  await role.selectOption(correction.requester);
  await page
    .getByRole("link", { name: correction.create, exact: true })
    .click();
  await role.selectOption(correction.requester);
  for (const [label, value] of Object.entries(additionalApprovedRecord.fields))
    await page.getByLabel(label, { exact: true }).fill(value);
  if (definition.calculatedOutput) {
    const output = page.getByLabel(definition.calculatedOutput.label, {
      exact: true,
    });
    await expect(output).toHaveJSProperty("tagName", "OUTPUT");
    await expect(output).toHaveText(
      definition.visibleSummary!.find(
        ({ label }) => label === definition.calculatedOutput!.label,
      )!.additional,
    );
    await expect(
      page.locator(`input[name="${definition.calculatedOutput.key}"]`),
    ).toHaveCount(0);
    await expect(
      page.getByText("Calculated preview", { exact: true }),
    ).toBeVisible();
  }
  if (correction.select) {
    if (!additionalApprovedRecord.selectValue)
      throw new Error("The additional record must declare its enum selection.");
    await page
      .getByLabel(correction.select.label, { exact: true })
      .selectOption(additionalApprovedRecord.selectValue);
  }
  const createdResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === `/api/${correction.entity}`,
  );
  await page
    .getByRole("button", { name: correction.createAction, exact: true })
    .click();
  const createResult = await createdResponse;
  expect(createResult.status()).toBe(201);
  const created = (await createResult.json()) as Record<string, unknown>;
  if (typeof created.id !== "string")
    throw new Error("Additional authored record has no server identity.");
  if (definition.calculatedOutput)
    expect(created[definition.calculatedOutput.key]).toBe(
      Number(
        definition.visibleSummary!.find(
          ({ label }) => label === definition.calculatedOutput!.label,
        )!.additional,
      ),
    );

  await navigateApproval(page, correction.list);
  const row = page
    .locator(".generated-records > li")
    .filter({ hasText: additionalApprovedRecord.identity });
  await expect(row).toHaveCount(1);
  const submitted = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname ===
        `/api/${correction.entity}/${created.id}/events/submit`,
  );
  await row.getByRole("button", { name: "Submit", exact: true }).click();
  expect((await submitted).status()).toBe(200);
  await role.selectOption(correction.reviewer ?? "manager");
  const approved = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname ===
        `/api/${correction.entity}/${created.id}/events/approve`,
  );
  await row.getByRole("button", { name: "Approve", exact: true }).click();
  expect((await approved).status()).toBe(200);
  await page.reload();
  await role.selectOption(correction.auditor);
  const history = page.locator(".approval-decision-history");
  await history.locator(":scope > summary").focus();
  await page.keyboard.press("Enter");
  return {
    id: created.id,
    identity: additionalApprovedRecord.identity,
  };
}

export async function runApprovalDefinitionBatch({
  page,
  context,
  request,
  definition,
}: {
  readonly page: Page;
  readonly context: BrowserContext;
  readonly request: APIRequestContext;
  readonly definition: ApprovalDefinitionCase;
}): Promise<void> {
  const factoryProject = process.env.FACTORY_E2E_FACTORY_PROJECT;
  expect(process.env.FACTORY_E2E_ISOLATED).toBe("1");
  expect(factoryProject).toMatch(/^factory-t9-[a-z0-9-]+$/);
  const workbench = docker([
    "ps",
    "--filter",
    `label=com.docker.compose.project=${factoryProject}`,
    "--filter",
    "label=com.docker.compose.service=workbench",
    "--quiet",
  ]);
  expect(workbench).toMatch(/^[a-f0-9]+$/);
  expect(
    docker([
      "exec",
      workbench,
      "node",
      "-e",
      "console.log(Boolean(process.env.OPENAI_API_KEY))",
    ]),
  ).toBe("false");

  const requirementId = `${definition.requirementIdPrefix ?? "batch"}-${randomUUID()}`;
  const interpretation = await authoredInterpretation(
    definition,
    requirementId,
  );
  expect(interpretation.interpretation.spec.openQuestions).toHaveLength(0);
  await page.route("**/api/requirements/interpret", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(interpretation),
    });
  });

  let compilationId: string | null = null;
  const lifecycle: string[] = [];
  const pending: Promise<void>[] = [];
  const requestDiagnostics: Array<{
    readonly code: string | null;
    readonly path: string;
    readonly status: number;
  }> = [];
  let interpretationCalls = 0;
  let generated: Page | null = null;
  const pageErrors: string[] = [];
  const callerOutputKeys: string[] = [];
  let generatedBrowserWrites = 0;
  let elapsedToReadyMs: number | null = null;
  page.on("pageerror", (error) => pageErrors.push(error.name));
  page.on("response", (response) => {
    if (response.request().method() !== "POST") return;
    const path = new URL(response.url()).pathname;
    if (path === "/api/requirements/interpret") interpretationCalls += 1;
    if (
      path === "/api/requirements/interpret" ||
      path === "/product/requirements"
    ) {
      pending.push(
        response
          .json()
          .then((body) => {
            requestDiagnostics.push({
              code: safeFailureCode(body),
              path,
              status: response.status(),
            });
          })
          .catch(() => {
            requestDiagnostics.push({
              code: null,
              path,
              status: response.status(),
            });
          }),
      );
    }
    if (path.endsWith("/published-revisions")) lifecycle.push("publish");
    if (path === "/compilations") {
      lifecycle.push("compile");
      pending.push(
        response.json().then((body: { id?: unknown }) => {
          if (typeof body.id === "string") compilationId = body.id;
        }),
      );
    }
    if (/\/compilations\/[^/]+\/verification-runs$/.test(path))
      lifecycle.push("verify");
    if (/\/compilations\/[^/]+\/preview-runs$/.test(path))
      lifecycle.push("preview");
  });

  const startedAt = Date.now();
  try {
    await page.goto("/");
    await page.getByLabel("Requirement brief").fill(definition.brief);
    await page.getByRole("button", { name: "Create product" }).click();
    const delivery = page.getByRole("region", {
      name: definition.deliveryRegion,
    });
    await expect(delivery).toBeVisible({ timeout: 60_000 });
    await expect(
      page.getByRole("button", { name: /Choose |Apply to Draft/ }),
    ).toHaveCount(0);
    const openApp = delivery.getByRole("link", { name: "Open local app" });
    let outcome: "failed" | "pending" | "ready" = "pending";
    await expect
      .poll(
        async () => {
          outcome = (await openApp.isVisible())
            ? "ready"
            : (await delivery.getByRole("status").textContent())?.startsWith(
                  "Delivery paused",
                )
              ? "failed"
              : "pending";
          return outcome;
        },
        { timeout: 1_500_000 },
      )
      .not.toBe("pending");
    expect(outcome, "definition delivery terminal outcome").toBe("ready");
    elapsedToReadyMs = Date.now() - startedAt;
    expect(elapsedToReadyMs, "prepared local ready target").toBeLessThanOrEqual(
      300_000,
    );
    await Promise.all(pending);
    if (!compilationId)
      throw new Error("No immutable compilation was observed.");
    const immutableBefore = await immutableApprovalFingerprint(
      request,
      controlPlaneUrl(`/compilations/${compilationId}`),
    );
    const preview = await currentPreview(request, compilationId);
    const href = await openApp.getAttribute("href");
    expect(preview?.status).toBe("ready");
    expect(href).toBe(preview?.previewUrl);
    if (!href || new URL(href).hostname !== "127.0.0.1")
      throw new Error("No loopback generated app.");
    expect(lifecycle).toEqual(["publish", "compile", "verify", "preview"]);
    expect(interpretationCalls, "one authored selection, no model call").toBe(
      1,
    );

    generated = await context.newPage();
    generated.on("pageerror", (error) => pageErrors.push(error.name));
    generated.on("request", (outgoing) => {
      if (
        !definition.calculatedOutput ||
        !["POST", "PATCH"].includes(outgoing.method()) ||
        !new URL(outgoing.url()).pathname.startsWith(
          `/api/${definition.correction.entity}`,
        )
      )
        return;
      const body = outgoing.postDataJSON() as {
        values?: Record<string, unknown>;
      } | null;
      if (!body?.values) return;
      generatedBrowserWrites++;
      if (Object.hasOwn(body.values, definition.calculatedOutput.key))
        callerOutputKeys.push(definition.calculatedOutput.key);
    });
    await generated.goto(href);
    await verifyApprovalAssets(generated);
    await verifyAssetFailureDetection(generated);
    await navigateApproval(generated, definition.correction.list);
    await expect(generated.locator(".generated-records > li")).toHaveCount(1);
    await capturePrimaryScreen(generated, definition);
    const correctionFacts = await verifyApprovalCorrection(generated, {
      ...definition.correction,
      evidence: definition.evidenceDirectory,
      previewProject: preview!.composeProjectName,
    });
    if (definition.calculatedOutput) {
      const persisted = await generated.request.get(
        new URL(
          `/api/${definition.correction.entity}/${correctionFacts.recordId}`,
          href,
        ).toString(),
        {
          headers: {
            "x-factory-fixture-session": `fixture-session-${definition.correction.auditor}`,
          },
        },
      );
      expect(persisted.status()).toBe(200);
      expect((await persisted.json())[definition.calculatedOutput.key]).toBe(
        Number(
          definition.visibleSummary!.find(
            ({ label }) => label === definition.calculatedOutput!.label,
          )!.corrected,
        ),
      );
    }
    const correctedRow = generated
      .locator(".generated-records > li")
      .filter({ hasText: definition.correction.identity });
    const correctedDetails = correctedRow.locator(
      "details:has(.approval-details-values)",
    );
    await correctedDetails.locator("summary").focus();
    await correctedDetails.locator("summary").press("Enter");
    const correctedField = definition.correction.correction!;
    const correctedValue = definition.visibleSummary?.some(
      ({ label }) => label === correctedField.label,
    )
      ? visibleSummaryValue(correctedRow, correctedField.label)
      : detailValue(correctedRow, correctedField.label);
    await expect(correctedValue).toBeVisible();
    await expect(correctedValue).toHaveText(
      String(correctedField.expectedFinalValue),
    );
    for (const [label, value] of Object.entries(
      definition.retainedDetails ?? {},
    ))
      await expect(detailValue(correctedRow, label)).toHaveText(value);
    await correctedDetails.locator("summary").press("Enter");
    const additional = await createAndApproveAdditionalRecord(
      generated,
      definition,
    );
    const summary =
      definition.visibleSummary ??
      (definition.correction.select &&
      definition.additionalApprovedRecord.selectValue
        ? [
            {
              label: definition.correction.select.label,
              corrected: definition.correction.select.value,
              additional: definition.additionalApprovedRecord.selectValue,
            },
          ]
        : []);
    expect(
      summary.length,
      "each definition declares visible business summaries",
    ).toBeGreaterThan(0);
    await verifyVisibleBusinessIdentity(generated, definition, [
      {
        id: correctionFacts.recordId,
        identity: definition.correction.identity,
        summaries: summary.map(({ label, corrected }) => ({
          label,
          value: corrected,
        })),
        decisionCount: 2,
      },
      {
        ...additional,
        summaries: summary.map(({ label, additional: value }) => ({
          label,
          value,
        })),
        decisionCount: 1,
      },
    ]);
    await verifyExpressiveRecovery(
      generated,
      definition.evidenceDirectory,
      definition.correction.recordMedia,
    );
    expect(pageErrors).toEqual([]);
    if (definition.calculatedOutput) {
      expect(generatedBrowserWrites).toBeGreaterThan(0);
      expect(callerOutputKeys, "browser writes contain operands only").toEqual(
        [],
      );
    }
    expect(
      await immutableApprovalFingerprint(
        request,
        controlPlaneUrl(`/compilations/${compilationId}`),
      ),
    ).toBe(immutableBefore);
    await writeFile(
      resolve(definition.evidenceDirectory, "delivery-journey.json"),
      JSON.stringify(
        {
          definitionKey: definition.definitionKey,
          compilationId,
          previewRunId: preview!.id,
          elapsedToReadyMs,
          elapsedThroughAcceptanceMs: Date.now() - startedAt,
          lifecycle,
          authoredSelections: interpretationCalls,
          modelCalls: 0,
          technicalHandoffs: 0,
          inRunManualRescues: 0,
          immutableCompilationPreserved: true,
          authoredRecordsApproved: 2,
          clientInvalidCreateAndEditNoFetch: Boolean(
            definition.correction.clientInvalidValue,
          ),
          businessSummaries: summary.map(({ label }) => label),
          ...(definition.calculatedOutput
            ? {
                calculatedPreviewReadOnly: true,
                browserWritesOmitCalculatedOutput: true,
                numericLabelsVisiblyMeasured:
                  definition.requireVisibleSummaryLabels === true,
              }
            : {}),
          scope:
            "Authored interpretation fixture and prepared local runtime. Durations include test instrumentation and visual checks; no real-model, ordinary-user or hosted performance claim.",
        },
        null,
        2,
      ) + "\n",
    );
    console.info(
      "FACTORY_APPROVAL_DEFINITION_BATCH",
      JSON.stringify({
        compilationId,
        definitionKey: definition.definitionKey,
        elapsedToReadyMs,
        externalIntegration: null,
        lifecycle,
        modelCalls: 0,
        previewRunId: preview!.id,
        requestDiagnostics,
      }),
    );
  } catch (error) {
    if (generated) {
      await mkdir(definition.evidenceDirectory, { recursive: true }).catch(
        () => undefined,
      );
      await generated
        .screenshot({
          path: resolve(
            definition.evidenceDirectory,
            `failure-generated-${Date.now()}.png`,
          ),
          fullPage: true,
        })
        .catch(() => undefined);
    }
    await Promise.allSettled(pending);
    console.info(
      "FACTORY_APPROVAL_DEFINITION_BATCH_FAILURE",
      JSON.stringify({
        compilationId,
        definitionKey: definition.definitionKey,
        elapsedToReadyMs,
        elapsedAtFailureMs: Date.now() - startedAt,
        lifecycle,
        pageErrors,
        requestDiagnostics,
      }),
    );
    throw error;
  } finally {
    await Promise.allSettled(pending);
    await generated?.close();
    if (compilationId) await stopExactPreview(request, compilationId);
  }
}
