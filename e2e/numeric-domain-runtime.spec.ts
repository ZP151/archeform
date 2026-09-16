import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  navigateApproval,
  verifyApprovalAssets,
  verifyApprovalCorrection,
} from "./approval-presentation";

// Authored capability fixture only. Registration and consumer intake are
// exercised separately when a definition is admitted.
test("numeric rules survive actual Prisma persistence and browser correction", async ({
  page,
}) => {
  test.setTimeout(600_000);
  const runtimeUrl = process.env.FACTORY_NUMERIC_RUNTIME_URL;
  const project = process.env.FACTORY_NUMERIC_RUNTIME_PROJECT;
  expect(process.env.FACTORY_E2E_ISOLATED).toBe("1");
  expect(project).toMatch(/^factory-preview-numeric-[a-z0-9-]+$/);
  if (!runtimeUrl || new URL(runtimeUrl).hostname !== "127.0.0.1")
    throw new Error("An isolated loopback numeric runtime is required.");
  const evidence = resolve(
    process.cwd(),
    "docs/acceptance/evidence/numeric-field-domains/runtime",
  );
  await mkdir(evidence, { recursive: true });
  const docker = (args: string[], input?: string) =>
    execFileSync("docker", args, {
      encoding: "utf8",
      input,
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 30_000,
    }).trim();
  const postgres = docker([
    "ps",
    "--filter",
    `label=com.docker.compose.project=${project}`,
    "--filter",
    "label=com.docker.compose.service=postgres",
    "--format",
    "{{.ID}}",
  ]);
  expect(postgres).toMatch(/^[a-f0-9]{12,64}$/);
  const sql = (statement: string) =>
    docker(
      [
        "exec",
        "-i",
        postgres,
        "psql",
        "-U",
        "generated",
        "-d",
        "generated",
        "-v",
        "ON_ERROR_STOP=1",
        "-At",
      ],
      statement,
    );
  const headers = (role = "author", key = randomUUID()) => ({
    "x-factory-fixture-session": `fixture-session-${role}`,
    "x-factory-idempotency-key": key,
  });
  const api = (path: string) => new URL(path, runtimeUrl).toString();
  const list = async () => {
    const response = await page.request.get(api("/api/submission"), {
      headers: headers(),
    });
    expect(response.status()).toBe(200);
    return response.json() as Promise<Array<Record<string, unknown>>>;
  };
  const audit = async () => {
    const response = await page.request.get(api("/api/audit"), {
      headers: headers("auditor"),
    });
    expect(response.status()).toBe(200);
    return response.json();
  };
  const snapshot = async () => ({
    records: await list(),
    audit: await audit(),
    receipts: sql('SELECT count(*) FROM "ApprovalMutationReceipt";'),
  });
  const values = {
    courseTitle: "Numeric persistence fixture",
    fee: 125.5,
    sessionDate: "2026-10-12",
    justification: "Practise a reusable application capability.",
  };
  const initial = await snapshot();
  for (const fee of [0, -1, "125.5", " ", true, null, {}, []]) {
    const response = await page.request.post(api("/api/submission"), {
      headers: headers(),
      data: { values: { ...values, fee } },
    });
    expect(response.status(), "invalid numeric create").toBe(400);
    expect(
      await snapshot(),
      "invalid create leaves records, audit and receipts untouched",
    ).toEqual(initial);
  }
  const overflow = await page.request.post(api("/api/submission"), {
    headers: { ...headers(), "content-type": "application/json" },
    data: JSON.stringify({ values }).replace('"fee":125.5', '"fee":1e309'),
  });
  expect(overflow.status()).toBe(400);
  expect(await snapshot()).toEqual(initial);
  const createKey = randomUUID();
  const create = () =>
    page.request.post(api("/api/submission"), {
      headers: headers("author", createKey),
      data: { values: { ...values, fee: 0.0000001 } },
    });
  const createdResponse = await create();
  expect(createdResponse.status()).toBe(201);
  const created = (await createdResponse.json()) as {
    id: string;
    version: number;
    fee: unknown;
  };
  expect(Number(created.fee)).toBe(0.0000001);
  expect(created.id).toMatch(/^[a-zA-Z0-9-]+$/);
  expect(await (await create()).json()).toEqual(created);
  const path = `/api/submission/${created.id}`;
  const beforeInvalidEdit = await snapshot();
  for (const fee of [0, -0.01, "2", false, null]) {
    const response = await page.request.patch(api(path), {
      headers: headers(),
      data: { expectedVersion: 0, values: { fee } },
    });
    expect(response.status()).toBe(400);
    expect(await snapshot()).toEqual(beforeInvalidEdit);
  }
  const table = sql(
    "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename='Submission';",
  );
  expect(table).toMatch(/^[A-Za-z0-9_]+$/);
  sql(`UPDATE "${table}" SET "fee" = 0 WHERE "id" = '${created.id}';`);
  const invalidStored = await snapshot();
  const submit = await page.request.post(api(`${path}/events/submit`), {
    headers: headers(),
    data: { expectedVersion: 0 },
  });
  expect(
    submit.status(),
    "submit validates the authoritative persisted fee",
  ).toBe(400);
  expect(await snapshot()).toEqual(invalidStored);
  const repaired = await page.request.patch(api(path), {
    headers: headers(),
    data: { expectedVersion: 0, values: { fee: 1.25 } },
  });
  expect(repaired.status()).toBe(200);

  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(runtimeUrl);
  await verifyApprovalAssets(page);
  await navigateApproval(page, "All submissions");
  await page.getByLabel("Demo role", { exact: true }).selectOption("author");
  await page.getByRole("link", { name: "New submission", exact: true }).click();
  const fields = {
    "Course title": "Browser numeric correction",
    Fee: "125.5",
    "Session date": "2026-10-20",
    Justification: "A distinct course for correction and approval.",
  };
  for (const [label, value] of Object.entries(fields))
    await page.getByLabel(label, { exact: true }).fill(value);
  let browserCreates = 0;
  const observe = (request: import("@playwright/test").Request) => {
    if (
      request.method() === "POST" &&
      new URL(request.url()).pathname === "/api/submission"
    )
      browserCreates++;
  };
  page.on("request", observe);
  try {
    for (const fee of ["0", "-1"]) {
      await page.getByLabel("Fee", { exact: true }).fill(fee);
      await page
        .getByRole("button", { name: "Create Submission", exact: true })
        .click();
      if (fee === "0")
        await expect(
          page.locator(".approval-form-card").getByRole("alert"),
        ).toContainText(/greater than 0/i);
      else
        expect(
          await page
            .getByLabel("Fee", { exact: true })
            .evaluate(
              (node) => (node as HTMLInputElement).validity.rangeUnderflow,
            ),
        ).toBe(true);
      expect(browserCreates, "invalid browser values never call create").toBe(
        0,
      );
    }
    await page.screenshot({
      path: resolve(evidence, "invalid-fee-390.png"),
      fullPage: true,
    });
  } finally {
    page.off("request", observe);
  }
  await navigateApproval(page, "All submissions");
  const numericRow = page
    .locator(".generated-records > li")
    .filter({ hasText: values.courseTitle });
  await numericRow.getByRole("button", { name: "Edit", exact: true }).click();
  const numericEdit = numericRow.locator("form");
  let browserEdits = 0;
  const observeEdit = (request: import("@playwright/test").Request) => {
    if (
      request.method() === "PATCH" &&
      new URL(request.url()).pathname === path
    )
      browserEdits++;
  };
  page.on("request", observeEdit);
  try {
    await numericEdit.getByLabel("Fee", { exact: true }).fill("0");
    await numericEdit
      .getByRole("button", { name: "Save", exact: true })
      .click();
    await expect(numericRow.getByRole("alert")).toContainText(
      /greater than 0/i,
    );
    expect(browserEdits, "invalid edit never calls update").toBe(0);
    await page.screenshot({
      path: resolve(evidence, "invalid-edit-390.png"),
      fullPage: true,
    });
    await numericEdit
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
  } finally {
    page.off("request", observeEdit);
  }
  const facts = await verifyApprovalCorrection(page, {
    entity: "submission",
    requester: "author",
    reviewer: "editor",
    auditor: "auditor",
    list: "All submissions",
    create: "New submission",
    createAction: "Create Submission",
    identity: fields["Course title"],
    identityField: "Course title",
    identityKey: "courseTitle",
    fields,
    requiredFields: [
      { key: "courseTitle", label: "Course title" },
      { key: "fee", label: "Fee" },
      { key: "sessionDate", label: "Session date" },
      { key: "justification", label: "Justification" },
    ],
    recordMedia: "optional",
    assertAuditorDenied: true,
    evidence,
    previewProject: project!,
    correction: {
      key: "fee",
      label: "Fee",
      initialInput: "125.5",
      firstEditInput: "130.5",
      concurrentApiValue: 135.5,
      expectedConflictValue: 135.5,
      finalInput: "140.5",
      expectedFinalValue: 140.5,
    },
  });
  await page.reload();
  const row = page
    .locator(".generated-records > li")
    .filter({ hasText: fields["Course title"] });
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(row.locator(".approval-summary")).toContainText("140.5");
    await expect(row.locator(".approval-summary")).toContainText("2026-10-20");
    await page.screenshot({
      path: resolve(evidence, `numeric-summary-${width}.png`),
      fullPage: true,
    });
  }
  const approvedSnapshot = await snapshot();
  expect(facts.recordId).toMatch(/^[a-zA-Z0-9-]+$/);
  sql(`UPDATE "${table}" SET "fee" = 0 WHERE "id" = '${facts.recordId}';`);
  const wrongStateSnapshot = await snapshot();
  const wrongStateSubmit = await page.request.post(
    api(`/api/submission/${facts.recordId}/events/submit`),
    {
      headers: headers(),
      data: { expectedVersion: 7 },
    },
  );
  expect(
    wrongStateSubmit.status(),
    "state authorization precedes stored numeric validation",
  ).toBe(403);
  expect(await snapshot()).toEqual(wrongStateSnapshot);
  sql(`UPDATE "${table}" SET "fee" = 140.5 WHERE "id" = '${facts.recordId}';`);
  expect(await snapshot()).toEqual(approvedSnapshot);
  await writeFile(
    resolve(evidence, "numeric-runtime.json"),
    JSON.stringify(
      {
        fixtureOnly: true,
        registeredDefinitionAdded: false,
        invalidCreateCases: 9,
        invalidUpdateCases: 5,
        invalidMutationsPreserveReceiptsAndAudit: true,
        storedInvalidSubmitDenied: true,
        stateAuthorizationPrecedesNumericValidation: true,
        smallPositiveDecimalPersisted: true,
        invalidClientCreateFetches: browserCreates,
        invalidClientEditFetches: browserEdits,
        correctionRecordId: facts.recordId,
        modelCalls: 0,
        responsiveWidths: [390, 768, 1440],
      },
      null,
      2,
    ) + "\n",
  );
});
