import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

test("stored Decimal precision cannot cross declared numeric bounds", async ({
  request,
}) => {
  const apiUrl = process.env.FACTORY_NUMERIC_PRECISION_API_URL;
  const project = process.env.FACTORY_NUMERIC_PRECISION_PROJECT;
  expect(process.env.FACTORY_E2E_ISOLATED).toBe("1");
  expect(project).toMatch(/^factory-preview-numeric-precision-[a-z0-9-]+$/);
  if (!apiUrl || new URL(apiUrl).hostname !== "127.0.0.1")
    throw new Error("An isolated precision API is required.");
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
  const headers = (key = randomUUID()) => ({
    "x-factory-fixture-session": "fixture-session-author",
    "x-factory-idempotency-key": key,
  });
  const url = (path: string) => new URL(path, apiUrl).toString();
  const createdResponse = await request.post(url("/api/submission"), {
    headers: headers(),
    data: {
      values: {
        courseTitle: "Exact Decimal boundary fixture",
        fee: 125.5,
        sessionDate: "2026-10-12",
        justification: "Verify inclusive stored bounds exactly.",
      },
    },
  });
  expect(createdResponse.status()).toBe(201);
  const created = (await createdResponse.json()) as { id: string };
  expect(created.id).toMatch(/^[A-Za-z0-9-]+$/);
  const snapshot = () =>
    sql(
      `SELECT "status", "version", "fee"::text FROM "Submission" WHERE "id"='${created.id}'; SELECT count(*) FROM "ApprovalMutationReceipt"; SELECT count(*) FROM "Factory_AuditEvent";`,
    );
  const failedKeys: string[] = [];
  for (const fee of ["125.50000000000000001", "0.99999999999999999"]) {
    sql(`UPDATE "Submission" SET "fee"=${fee} WHERE "id"='${created.id}';`);
    const before = snapshot();
    const key = randomUUID();
    failedKeys.push(key);
    const response = await request.post(
      url(`/api/submission/${created.id}/events/submit`),
      {
        headers: headers(key),
        data: { expectedVersion: 0 },
      },
    );
    expect(
      response.status(),
      "precision-adjacent stored value is outside the exact bound",
    ).toBe(400);
    expect(
      snapshot(),
      "denial leaves exact Decimal, state, receipts and audit untouched",
    ).toBe(before);
  }
  sql(`UPDATE "Submission" SET "fee"=125.5 WHERE "id"='${created.id}';`);
  const submit = () =>
    request.post(url(`/api/submission/${created.id}/events/submit`), {
      headers: headers(failedKeys[0]),
      data: { expectedVersion: 0 },
    });
  const accepted = await submit();
  expect(
    accepted.status(),
    "valid exact bound may reuse a previously denied command key",
  ).toBe(200);
  const acceptedBody = await accepted.json();
  expect(acceptedBody).toMatchObject({ status: "submitted", version: 1 });
  const acceptedSnapshot = snapshot();
  expect(await (await submit()).json()).toEqual(acceptedBody);
  expect(snapshot()).toBe(acceptedSnapshot);
  const evidence = resolve(
    process.cwd(),
    "docs/acceptance/evidence/numeric-field-domains",
  );
  await mkdir(evidence, { recursive: true });
  await writeFile(
    resolve(evidence, "decimal-precision-runtime.json"),
    JSON.stringify(
      {
        fixtureOnly: true,
        lowerInclusive: 1,
        upperInclusive: 125.5,
        precisionAdjacentDenials: 2,
        denialPreservesExactStoredStateAndAudit: true,
        exactBoundaryAccepted: true,
        deniedKeyReusableAfterCorrection: true,
        acceptedReplayHasNoSideEffects: true,
        modelCalls: 0,
      },
      null,
      2,
    ) + "\n",
  );
});
