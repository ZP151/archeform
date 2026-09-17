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

test("calculated totals survive actual PostgreSQL authority, recovery and responsive correction", async ({
  page,
  request,
}) => {
  test.setTimeout(600_000);
  const runtimeUrl = process.env.FACTORY_CALCULATED_RUNTIME_URL;
  const project = process.env.FACTORY_CALCULATED_RUNTIME_PROJECT;
  expect(process.env.FACTORY_E2E_ISOLATED).toBe("1");
  expect(project).toMatch(/^factory-preview-calculated-[a-z0-9-]+$/);
  if (!runtimeUrl || new URL(runtimeUrl).hostname !== "127.0.0.1")
    throw new Error("An isolated loopback calculated runtime is required.");
  const evidence = resolve(
    process.cwd(),
    "docs/acceptance/evidence/calculated-request-totals/runtime",
  );
  await mkdir(evidence, { recursive: true });
  const docker = (args: string[], input?: string) =>
    execFileSync("docker", args, {
      encoding: "utf8",
      input,
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 30_000,
    }).trim();
  const container = (service: string) => {
    const id = docker([
      "ps",
      "-q",
      "--filter",
      `label=com.docker.compose.project=${project}`,
      "--filter",
      `label=com.docker.compose.service=${service}`,
    ]);
    expect(id).toMatch(/^[a-f0-9]{12,64}$/);
    return id;
  };
  const postgres = container("postgres");
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
  const tables = sql(
    "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;",
  ).split(/\r?\n/);
  expect(tables).toContain("Submission");
  for (const table of tables) expect(table).toMatch(/^[A-Za-z0-9_]+$/);
  // Whole-table digests cover records, receipts, audit, outbox and capability effects.
  const snapshot = () =>
    sql(
      tables
        .map(
          (table) =>
            `SELECT '${table}:' || coalesce(md5(string_agg(row_to_json(t)::text, '' ORDER BY row_to_json(t)::text)), 'empty') FROM "${table}" t;`,
        )
        .join("\n"),
    );
  const headers = (role = "author", key = randomUUID()) => ({
    "x-factory-fixture-session": `fixture-session-${role}`,
    "x-factory-idempotency-key": key,
  });
  const url = (path: string) => new URL(path, runtimeUrl).toString();
  const values = {
    itemName: "Exact calculated fixture",
    quantity: 3,
    unitPrice: 0.1,
    justification: "Prove exact local estimated totals.",
  };
  const initial = snapshot();
  expect(
    sql(
      'SELECT "quantity", "unitPrice"::text, "total"::text FROM "Submission" WHERE "id"=\'sample-submission\';',
    ),
  ).toBe("3|0.07|0.21");
  expect(
    (
      await request.get(url("/api/submission"), { headers: headers() })
    ).status(),
  ).toBe(200);
  const invalid = [
    { quantity: 0 },
    { quantity: 1.5 },
    { quantity: 2147483648 },
    { quantity: "3" },
    { unitPrice: 0 },
    { unitPrice: -1 },
    { unitPrice: "0.1" },
    { unitPrice: null },
    { unitPrice: true },
    { unitPrice: {} },
    { unitPrice: [] },
    { quantity: 3, unitPrice: 0.10000000000000002 },
    { quantity: 2147483647, unitPrice: 1e308 },
    { total: 0.3 },
    { total: null },
  ];
  for (const changes of invalid) {
    const response = await request.post(url("/api/submission"), {
      headers: headers(),
      data: { values: { ...values, ...changes } },
    });
    expect(response.status(), "invalid or forged calculated create").toBe(400);
    expect(snapshot()).toBe(initial);
  }
  const createKey = randomUUID();
  const create = () =>
    request.post(url("/api/submission"), {
      headers: headers("author", createKey),
      data: { values },
    });
  const createdResponse = await create();
  expect(createdResponse.status()).toBe(201);
  const created = await createdResponse.json();
  expect(created).toMatchObject({
    quantity: 3,
    unitPrice: 0.1,
    total: 0.3,
    version: 0,
  });
  expect(created.id).toMatch(/^[A-Za-z0-9-]+$/);
  const path = `/api/submission/${created.id}`;
  const beforeInjectedFailure = snapshot();
  const faultResult = JSON.parse(
    docker(
      ["exec", "-i", container("api"), "node", "-"],
      `
const assert=require('node:assert/strict');
const {PrismaClient}=require('@prisma/client');
const {PrismaRecordStore}=require('./dist/prisma-record-store.js');
const {ApplicationRuntime}=require('./dist/application-runtime.js');
const db=new PrismaClient();
const original=PrismaRecordStore.prototype.conditionalApprovalUpdate;
let wroteInsideTransaction=false;
PrismaRecordStore.prototype.conditionalApprovalUpdate=async function(...args){
 const row=await original.apply(this,args);
 if(row&&args[1]===${JSON.stringify(created.id)}){
  assert.equal(row.quantity,4);assert.equal(row.version,1);
  wroteInsideTransaction=true;
  return {...row,total:'0.40000000000000000001'};
 }
 return row;
};
(async()=>{try{
 await assert.rejects(new ApplicationRuntime(new PrismaRecordStore(db)).approvalCommand(
  'author','fixture-session-author','submission',${JSON.stringify(created.id)},'update',
  ${JSON.stringify(randomUUID())},{expectedVersion:0,values:{quantity:4}}
 ),error=>error.status===409&&error.body.code==='approval.calculation_invalid_record');
 assert.equal(wroteInsideTransaction,true);
 console.log(JSON.stringify({postWriteReached:true,invalidStoredResponseRejected:true}));
}finally{PrismaRecordStore.prototype.conditionalApprovalUpdate=original;await db.$disconnect();}})()
 .catch(()=>{console.log('Rollback injection failed');process.exitCode=1;});
`,
    ),
  );
  expect(faultResult).toEqual({
    postWriteReached: true,
    invalidStoredResponseRejected: true,
  });
  expect(
    snapshot(),
    "PostgreSQL rollback preserves every table after an invalid actual write result",
  ).toBe(beforeInjectedFailure);
  const patch = (
    version: number,
    changes: Record<string, unknown>,
    key = randomUUID(),
    role = "author",
  ) =>
    request.patch(url(path), {
      headers: headers(role, key),
      data: { expectedVersion: version, values: changes },
    });
  const transition = (
    event: string,
    version: number,
    key = randomUUID(),
    role = "author",
    reason?: string,
  ) =>
    request.post(url(`${path}/events/${event}`), {
      headers: headers(role, key),
      data: { expectedVersion: version, ...(reason ? { reason } : {}) },
    });
  const first = await patch(0, { unitPrice: 0.07 });
  expect(first.status()).toBe(200);
  expect(await first.json()).toMatchObject({
    quantity: 3,
    unitPrice: 0.07,
    total: 0.21,
    version: 1,
  });
  const second = await patch(1, { quantity: 5 });
  expect(second.status()).toBe(200);
  expect(await second.json()).toMatchObject({
    quantity: 5,
    unitPrice: 0.07,
    total: 0.35,
    version: 2,
  });
  const beforeDenial = snapshot();
  for (const changes of [
    { total: 0.35 },
    { quantity: 2.5 },
    { unitPrice: "1" },
  ]) {
    expect((await patch(2, changes)).status()).toBe(400);
    expect(snapshot()).toBe(beforeDenial);
  }
  expect(await (await create()).json()).toEqual(created);
  expect(snapshot()).toBe(beforeDenial);
  expect(
    (await patch(2, { quantity: 6 }, randomUUID(), "auditor")).status(),
  ).toBe(403);
  expect(snapshot()).toBe(beforeDenial);
  const race = await Promise.all([
    patch(2, { quantity: 6 }),
    patch(2, { quantity: 7 }),
  ]);
  expect(race.map((response) => response.status()).sort()).toEqual([200, 409]);
  const winning = await race
    .find((response) => response.status() === 200)!
    .json();
  expect(winning).toMatchObject({
    version: 3,
    unitPrice: 0.07,
    total: winning.quantity === 6 ? 0.42 : 0.49,
  });
  const corrupt = (assignment: string) =>
    sql(`UPDATE "Submission" SET ${assignment} WHERE "id"='${created.id}';`);
  corrupt('"unitPrice"=0.10000000000000000001');
  const corrupted = snapshot();
  for (const endpoint of ["/api/submission", path]) {
    expect(
      (await request.get(url(endpoint), { headers: headers() })).status(),
    ).toBe(409);
    expect(snapshot()).toBe(corrupted);
  }
  expect((await transition("submit", 3)).status()).toBe(409);
  expect(
    (
      await patch(3, {
        justification: "Cannot repair a retained invalid operand.",
      })
    ).status(),
  ).toBe(400);
  expect(snapshot()).toBe(corrupted);
  const repaired = await patch(3, { unitPrice: 0.07 });
  expect(repaired.status()).toBe(200);
  expect(await repaired.json()).toMatchObject({
    version: 4,
    total: winning.total,
  });
  corrupt('"total"=123');
  const repairedTotal = await patch(4, {
    justification:
      "Recalculate an invalid old total through an authorized correction.",
  });
  expect(repairedTotal.status()).toBe(200);
  expect(await repairedTotal.json()).toMatchObject({
    version: 5,
    total: winning.total,
  });
  const submitKey = randomUUID();
  expect((await transition("submit", 5, submitKey)).status()).toBe(200);
  corrupt('"total"=123');
  const beforeReplay = snapshot();
  expect((await transition("submit", 5, submitKey)).status()).toBe(409);
  expect(
    (await transition("approve", 6, randomUUID(), "editor")).status(),
  ).toBe(409);
  expect(snapshot()).toBe(beforeReplay);
  corrupt(`"total"=${winning.total}`);
  expect(
    (
      await transition(
        "reject",
        6,
        randomUUID(),
        "editor",
        "Revise quantities and estimated price.",
      )
    ).status(),
  ).toBe(200);
  expect((await patch(7, { quantity: 3, unitPrice: 0.1 })).status()).toBe(200);
  expect((await transition("submit", 8)).status()).toBe(200);
  const approveKey = randomUUID();
  expect((await transition("approve", 9, approveKey, "editor")).status()).toBe(
    200,
  );
  corrupt('"total"=0.30000000000000000001');
  const beforeDecisionReplay = snapshot();
  expect((await transition("approve", 9, approveKey, "editor")).status()).toBe(
    409,
  );
  expect(snapshot()).toBe(beforeDecisionReplay);
  corrupt('"total"=0.3');
  const persisted = snapshot();
  docker(["restart", container("api")]);
  await expect(async () =>
    expect(
      (await request.get(url(path), { headers: headers() })).status(),
    ).toBe(200),
  ).toPass({ timeout: 60_000 });
  expect(await (await create()).json()).toEqual(created);
  expect(snapshot()).toBe(persisted);

  await writeFile(
    resolve(evidence, "database-runtime.json"),
    JSON.stringify(
      {
        fixtureOnly: true,
        alternateSeedExact: true,
        seed: { quantity: 3, unitPrice: 0.07, total: 0.21 },
        invalidCreateCases: invalid.length,
        exactCreateAndPartialCorrection: true,
        realPrismaPostWriteFailureRollsBackAllTables: true,
        raceHasOneWinner: true,
        trustedPrecisionReadTransitionReplayDenial: true,
        authorizedCorrectionRepair: true,
        originalReceiptSurvivesEditsAndRestart: true,
        modelCalls: 0,
      },
      null,
      2,
    ) + "\n",
  );

  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(runtimeUrl);
  await verifyApprovalAssets(page);
  await navigateApproval(page, "All submissions");
  await page.getByLabel("Demo role", { exact: true }).selectOption("author");
  await page.getByRole("link", { name: "New submission", exact: true }).click();
  await page.getByLabel("Quantity", { exact: true }).fill("3");
  await page.getByLabel("Unit price", { exact: true }).fill("0.07");
  const output = page.getByLabel("Total", { exact: true });
  await expect(output).toHaveJSProperty("tagName", "OUTPUT");
  await expect(output).toHaveText("0.21");
  await page
    .getByLabel("Item name", { exact: true })
    .fill("Calculated browser request");
  await page
    .getByLabel("Justification", { exact: true })
    .fill("Replace a shared workstation accessory.");
  let clientCreates = 0;
  const observe = (event: import("@playwright/test").Request) => {
    if (
      event.method() === "POST" &&
      new URL(event.url()).pathname === "/api/submission"
    )
      clientCreates++;
  };
  page.on("request", observe);
  try {
    await page.getByLabel("Quantity", { exact: true }).fill("0");
    await page
      .getByRole("button", { name: "Create Submission", exact: true })
      .click();
    expect(
      await page
        .getByLabel("Quantity", { exact: true })
        .evaluate((node) => (node as HTMLInputElement).validity.rangeUnderflow),
    ).toBe(true);
    expect(clientCreates).toBe(0);
    await page.getByLabel("Quantity", { exact: true }).fill("3");
    await page
      .getByLabel("Unit price", { exact: true })
      .fill("0.10000000000000002");
    await expect(output).toHaveText("Unavailable");
    await page
      .getByRole("button", { name: "Create Submission", exact: true })
      .click();
    await expect(
      page.locator(".approval-form-card").getByRole("alert"),
    ).toContainText(/representable total/i);
    expect(clientCreates).toBe(0);
  } finally {
    page.off("request", observe);
  }
  const facts = await verifyApprovalCorrection(page, {
    entity: "submission",
    requester: "author",
    reviewer: "editor",
    auditor: "auditor",
    list: "All submissions",
    create: "New submission",
    createAction: "Create Submission",
    identity: "Calculated browser request",
    identityField: "Item name",
    identityKey: "itemName",
    fields: {
      "Item name": "Calculated browser request",
      Quantity: "3",
      "Unit price": "125.5",
      Justification: "Replace a shared workstation accessory.",
    },
    requiredFields: [
      { key: "itemName", label: "Item name" },
      { key: "quantity", label: "Quantity" },
      { key: "unitPrice", label: "Unit price" },
      { key: "justification", label: "Justification" },
    ],
    recordMedia: "optional",
    assertAuditorDenied: true,
    evidence,
    previewProject: project!,
    invalidUpdates: [{ total: 376.5 }, { quantity: 0 }, { unitPrice: 0 }],
    clientInvalidValue: {
      label: "Unit price",
      input: "0",
      message: "greater than 0",
    },
    correction: {
      key: "quantity",
      label: "Quantity",
      initialInput: "3",
      firstEditInput: "4",
      concurrentApiValue: 6,
      expectedConflictValue: 6,
      finalInput: "5",
      expectedFinalValue: 5,
    },
    finalCorrectionFields: [
      {
        key: "unitPrice",
        label: "Unit price",
        input: "149.5",
        expectedValue: 149.5,
      },
    ],
  });
  await page.reload();
  const row = page
    .locator(".generated-records > li")
    .filter({ hasText: "Calculated browser request" });
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(row.locator(".approval-summary")).toContainText("747.5");
    await expect(row.locator(".approval-summary")).toContainText("149.5");
    await page.screenshot({
      path: resolve(evidence, `calculated-summary-${width}.png`),
      fullPage: true,
    });
  }
  await writeFile(
    resolve(evidence, "calculated-runtime.json"),
    JSON.stringify(
      {
        fixtureOnly: true,
        registeredDefinitionAdded: false,
        invalidCreateCases: invalid.length,
        exactPrimitiveAndStoredArithmetic: true,
        realPrismaPostWriteFailureRollsBackAllTables: true,
        partialUpdatesRecalculate: true,
        rejectedWritesPreserveAllTables: true,
        concurrentVersionProtection: true,
        originalReceiptSurvivesEditsAndRestart: true,
        trustedPrecisionReadAndTransitionDenial: true,
        invalidRetainedOperandRequiresReplacement: true,
        invalidOldTotalRepair: true,
        submitAndDecisionReplayValidateFreshRecord: true,
        clientInvalidCreateFetches: clientCreates,
        responsiveWidths: [390, 768, 1440],
        correctionRecordId: facts.recordId,
        finalTotal: 747.5,
        modelCalls: 0,
      },
      null,
      2,
    ) + "\n",
  );
});

test("calculated summaries expose quantity, price and total labels on every viewport", async ({
  page,
}) => {
  const runtimeUrl = process.env.FACTORY_CALCULATED_RUNTIME_URL;
  expect(process.env.FACTORY_E2E_ISOLATED).toBe("1");
  if (!runtimeUrl || new URL(runtimeUrl).hostname !== "127.0.0.1")
    throw new Error("An isolated loopback calculated runtime is required.");
  const evidence = resolve(
    process.cwd(),
    "docs/acceptance/evidence/calculated-request-totals/presentation",
  );
  await mkdir(evidence, { recursive: true });
  await page.goto(runtimeUrl);
  await navigateApproval(page, "All submissions");
  const row = page
    .locator(".generated-records > li")
    .filter({ hasText: "Calculated browser request" });
  const facts: { width: number; theme: string; labelsVisible: boolean }[] = [];
  for (const theme of ["light", "dark"]) {
    await page
      .locator(".approval-v1")
      .evaluate((node, value) => node.setAttribute("data-theme", value), theme);
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await verifyApprovalAssets(page);
      const summary = row.locator(".approval-summary");
      for (const label of ["Quantity", "Unit price", "Total"]) {
        const term = summary
          .locator("dt")
          .filter({ hasText: new RegExp("^" + label + "$") });
        await expect(term).toBeVisible();
        const style = await term.evaluate((node) => {
          const css = getComputedStyle(node),
            bounds = node.getBoundingClientRect();
          return {
            clipPath: css.clipPath,
            position: css.position,
            width: bounds.width,
            height: bounds.height,
          };
        });
        expect(style.clipPath).toBe("none");
        expect(style.position).not.toBe("absolute");
        expect(style.width).toBeGreaterThan(20);
        expect(style.height).toBeGreaterThan(10);
      }
      const total = summary
        .locator("div")
        .filter({ has: page.locator("dt", { hasText: /^Total$/ }) })
        .locator("dd");
      await expect(total).toHaveText("747.5");
      expect(
        await total.evaluate((node) =>
          Number(getComputedStyle(node).fontWeight),
        ),
      ).toBeGreaterThanOrEqual(600);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      facts.push({ width, theme, labelsVisible: true });
      await page.screenshot({
        path: resolve(evidence, `labelled-summary-${theme}-${width}.png`),
        fullPage: true,
      });
    }
  }
  await page
    .locator(".approval-v1")
    .evaluate((node) => node.setAttribute("data-theme", "light"));
  await page.getByRole("link", { name: "New submission", exact: true }).click();
  await page.getByLabel("Quantity", { exact: true }).fill("3");
  await page.getByLabel("Unit price", { exact: true }).fill("0.07");
  await expect(page.getByLabel("Total", { exact: true })).toHaveText("0.21");
  await expect(
    page.getByText("Calculated preview", { exact: true }),
  ).toBeVisible();
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({
      path: resolve(evidence, `calculated-form-${width}.png`),
      fullPage: true,
    });
  }
  await writeFile(
    resolve(evidence, "presentation.json"),
    JSON.stringify(
      {
        fixtureOnly: true,
        facts,
        totalEmphasized: true,
        previewUsesOrdinaryLanguage: true,
        unchangedApiEvidenceReused: true,
      },
      null,
      2,
    ) + "\n",
  );
});
