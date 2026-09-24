import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { selectServiceWorkOrdersProfile } from "../../packages/compiler/dist/index.js";
import {
  applicationGraphSchema,
  hashApplicationGraph,
} from "../../packages/graph/dist/index.js";
import type { CapabilityCompositionLockV1 } from "../../packages/capabilities/dist/index.js";
import {
  consumerSourcePaths,
  deliverDirectory,
  digest,
  directoryFailureDiagnostic,
  object,
  verifiedConsumerEvidence,
  type Json,
  type OwnedPreview,
} from "./content-directory";
import { controlPlaneUrl } from "./restaurant-delivery";

export type Staff = "dispatcher" | "technician-a" | "technician-b";
export const workOrdersSelection = Object.freeze({
  definitionKey: "facilities-service-desk",
  requirementIdPrefix: "work-orders-e2e",
  title: "Facilities Service Desk",
  outcome:
    "Dispatch service orders, correct saved details, assign technicians and retain reasoned resolution and cancellation history.",
  brief:
    "Build a facilities service desk. A dispatcher creates and corrects work orders with locations and priorities, assigns and reassigns technicians, and reopens or cancels orders with reasons. Assigned technicians start work and resolve it with a work report. Use local demo synthetic staff, not private accounts.",
});
function localOrigin(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^http:\/\/(?:127\.0\.0\.1|localhost):[1-9]\d{0,4}\/?$/u.test(value) &&
    (() => {
      try {
        return Number(new URL(value).port) <= 65535;
      } catch {
        return false;
      }
    })()
  );
}
export function workOrdersGuard(input: {
  isolated?: string;
  factoryProject?: string;
  controlPlane?: string;
  workbench?: string;
}): string {
  if (
    input.isolated !== "1" ||
    !/^factory-t10-[a-z0-9-]{1,80}$/u.test(input.factoryProject ?? "") ||
    !localOrigin(input.controlPlane) ||
    !localOrigin(input.workbench)
  )
    throw new Error("Invalid isolated Work Orders environment.");
  return input.factoryProject!;
}
export function workOrdersApiUrl(origin: string, path: string): string {
  if (!localOrigin(origin) || !path.startsWith("/api/"))
    throw new Error("Work Orders API requires its owned loopback origin.");
  const url = new URL(path, origin);
  if (
    url.origin !== new URL(origin).origin ||
    url.username ||
    url.password ||
    url.hash ||
    !url.pathname.startsWith("/api/")
  )
    throw new Error("Work Orders API requires its owned loopback origin.");
  return url.toString();
}
export async function workOrdersApi(
  request: APIRequestContext,
  origin: string,
  path: string,
  staff: Staff = "dispatcher",
  method = "GET",
  body?: unknown,
  key?: string,
) {
  const response = await request.fetch(workOrdersApiUrl(origin, path), {
    method,
    headers: {
      "x-factory-fixture-session": "fixture-session-" + staff,
      ...(key ? { "x-factory-idempotency-key": key } : {}),
    },
    ...(body === undefined ? {} : { data: body }),
    timeout: 30_000,
    maxRedirects: 0,
  });
  let value: unknown;
  try {
    value = await response.json();
  } catch {
    throw new Error("Generated Work Orders API returned non-JSON.");
  }
  return { status: response.status(), body: object(value) };
}
export function workOrdersFactRequest(
  preview: Pick<OwnedPreview, "id" | "composeProjectName">,
  ids: readonly string[],
): string[] {
  if (
    !/^preview-[a-z0-9-]{1,100}$/u.test(preview.id) ||
    preview.composeProjectName !== "factory-preview-" + preview.id ||
    !Array.isArray(ids) ||
    ids.length > 4 ||
    new Set(ids).size !== ids.length ||
    ids.some(
      (id) => typeof id !== "string" || !/^[A-Za-z0-9._~-]{1,64}$/u.test(id),
    )
  )
    throw new Error("Invalid owned Work Orders observation.");
  return [...ids];
}
export interface WorkOrdersFacts {
  orders: number;
  history: number;
  audit: number;
  receipts: number;
  records: {
    version: number;
    history: number;
    audit: number;
    receipts: number;
  }[];
}
export function parseWorkOrdersFacts(
  text: string,
  recordCount: number,
): WorkOrdersFacts {
  const fail = (): never => {
    throw new Error("Invalid bounded Work Orders facts.");
  };
  if (
    typeof text !== "string" ||
    text.length > 4096 ||
    !Number.isInteger(recordCount) ||
    recordCount < 0 ||
    recordCount > 4
  )
    fail();
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return fail();
  }
  const exact = (input: unknown, keys: string[]): input is Json =>
    !!input &&
    typeof input === "object" &&
    !Array.isArray(input) &&
    Object.keys(input).length === keys.length &&
    keys.every((key) => Object.hasOwn(input, key));
  const count = (input: unknown, max = 10000) =>
    typeof input === "number" &&
    Number.isSafeInteger(input) &&
    !Object.is(input, -0) &&
    input >= 0 &&
    input <= max;
  if (
    !exact(value, ["orders", "history", "audit", "receipts", "records"]) ||
    !["orders", "history", "audit", "receipts"].every((key) =>
      count(value[key]),
    ) ||
    !Array.isArray(value.records) ||
    value.records.length !== recordCount
  )
    return fail();
  for (const row of value.records)
    if (
      !exact(row, ["version", "history", "audit", "receipts"]) ||
      !count(row.version, 2147483647) ||
      !["history", "audit", "receipts"].every((key) => count(row[key]))
    )
      return fail();
  return value as unknown as WorkOrdersFacts;
}
/** Fixed canonical profile observation: counts only, never keys, rows or environment. Called only by the separately authorized actual case. */
export function workOrdersFacts(
  preview: OwnedPreview,
  requestedIds: readonly string[] = [],
): WorkOrdersFacts {
  const ids = workOrdersFactRequest(preview, requestedIds);
  const run = (args: string[], input?: string): string => {
    try {
      return execFileSync("docker", args, {
        encoding: "utf8",
        stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
        ...(input === undefined ? {} : { input }),
        timeout: 120_000,
        maxBuffer: 8192,
      }).trim();
    } catch {
      throw new Error("Owned Work Orders fact observation failed.");
    }
  };
  const container = run([
    "ps",
    "--filter",
    "label=com.docker.compose.project=" + preview.composeProjectName,
    "--filter",
    "label=com.docker.compose.service=api",
    "--quiet",
  ]);
  if (!/^[a-f0-9]{12,64}$/u.test(container))
    throw new Error("Owned Work Orders API container was not unique.");
  const script = `const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();(async()=>{try{const ids=${JSON.stringify(ids)};const records=[];for(const id of ids){const row=await p.workOrder.findUnique({where:{id},select:{version:true}});if(!row)throw Error();records.push({version:row.version,history:await p.workOrderHistory.count({where:{workOrderId:id}}),audit:await p.factory_AuditEvent.count({where:{recordId:id}}),receipts:await p.factory_WorkOrderMutationReceipt.count({where:{recordId:id}})});}process.stdout.write(JSON.stringify({orders:await p.workOrder.count(),history:await p.workOrderHistory.count(),audit:await p.factory_AuditEvent.count(),receipts:await p.factory_WorkOrderMutationReceipt.count(),records}));}catch{process.stderr.write('Work Orders fact observation failed');process.exitCode=1;}finally{await p.$disconnect();}})();`;
  return parseWorkOrdersFacts(
    run(["exec", "-i", container, "node"], script),
    ids.length,
  );
}
export function workOrdersFailure(error: unknown) {
  const assertion = directoryFailureDiagnostic(error).assertion;
  const stack = (error as { stack?: unknown } | null)?.stack;
  const frame =
    typeof stack === "string"
      ? stack
          .split("\n")
          .filter((line) => /^\s+at /u.test(line))
          .map((line) =>
            /[\\/]e2e[\\/](service-work-orders\.spec\.ts|helpers[\\/]service-work-orders\.ts):(\d{1,6}):(\d{1,6})(?:\)|$)/u.exec(
              line,
            ),
          )
          .find(Boolean)
      : undefined;
  return {
    assertion,
    location: frame
      ? {
          file: frame[1]!.startsWith("helpers")
            ? "e2e/helpers/service-work-orders.ts"
            : "e2e/service-work-orders.spec.ts",
          line: Number(frame[2]),
          column: Number(frame[3]),
        }
      : null,
  };
}
export function workOrdersPhase(attempt: string, phase: string) {
  if (
    !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(attempt) ||
    ![
      "source-identity",
      "draft",
      "publish",
      "compile",
      "verify",
      "preview",
      "empty-create",
      "correct-assign-start",
      "uncertain-retry",
      "reassign-denial",
      "resolve-reopen",
      "cancel-validation",
      "stale-reapply",
      "concurrency",
      "restart-replay",
      "cleanup",
    ].includes(phase)
  )
    throw new Error("Invalid safe Work Orders phase event.");
  return { event: "work-orders.acceptance.phase", attempt, phase };
}
export function workOrdersCleanup(
  hasOwnedPreview: boolean,
  recovery: unknown,
  removed: boolean,
) {
  if (recovery === "cleanup-required" || (hasOwnedPreview && !removed))
    return "cleanup_required";
  return hasOwnedPreview ? "removed" : "no-preview-created";
}
export async function workOrdersSources() {
  const paths = [
    ...consumerSourcePaths,
    "e2e/service-work-orders.spec.ts",
    "e2e/helpers/service-work-orders.ts",
    "e2e/helpers/service-work-orders.test.ts",
    "e2e/helpers/content-directory.ts",
    "e2e/tsconfig.consumer-delivery.json",
    "scripts/definition-case-bindings.mjs",
    "docs/adr/adr-0080-service-work-orders-family.md",
    "docs/adr/adr-0083-work-orders-fixture-identifiers.md",
    "packages/compiler/src/index.ts",
    "packages/compiler/src/service-work-orders-contract.ts",
    "packages/compiler/src/service-work-orders-runtime.ts",
    "packages/compiler/src/service-work-orders-presentation.ts",
    "packages/adapters/src/requirements/definitions/product-definitions.v1.json",
    "apps/compiler-worker/src/verifier/service-work-orders-verification.ts",
    "apps/compiler-worker/src/verifier/verification-environment.ts",
    "pnpm-lock.yaml",
  ];
  return Object.fromEntries(
    await Promise.all(
      [...new Set(paths)].map(async (path) => [
        path,
        digest(await readFile(path)),
      ]),
    ),
  );
}
/** Adapter over the existing automatic consumer observer; no technical lifecycle controls. */
export async function deliverWorkOrders(
  page: Page,
  request: APIRequestContext,
  evidence: Json,
  phase: (name: string) => void,
  remember: (id: string, preview?: OwnedPreview) => void,
) {
  const preview = await deliverDirectory(
    page,
    request,
    evidence,
    phase,
    remember,
    workOrdersSelection,
  );
  const readPublished = async () => {
    const response = await request.get(
      controlPlaneUrl(
        "/application-graphs/" +
          encodeURIComponent(
            String(object(evidence.applied).applicationGraphId),
          ) +
          "/published-revisions",
      ),
      { maxRedirects: 0 },
    );
    expect(response.ok()).toBe(true);
    const match = ((await response.json()) as Json[]).find(
      (row) => row.id === evidence.publishedRevisionId,
    );
    if (!match) throw new Error("Work Orders Published revision missing.");
    return match;
  };
  const published = await readPublished(),
    graph = applicationGraphSchema.parse(published.graph);
  // Select the unmodified Published object: the selector itself requires lossless parsing.
  const profile = selectServiceWorkOrdersProfile(
    published.graph as typeof graph,
    published.compositionLock as CapabilityCompositionLockV1,
  );
  expect(profile).toBeDefined();
  expect(profile!.orderEntity).toBe("work-order");
  expect(profile!.historyEntity).toBe("work-order-history");
  expect(graph.domain.seedData).toEqual([]);
  expect(hashApplicationGraph(graph)).toBe(published.graphHash);
  expect(profile!.graphHash).toBe(published.graphHash);
  evidence.published = {
    id: published.id,
    applicationGraphId: published.applicationGraphId,
    sourceDraftRevisionId: published.sourceDraftRevisionId,
    graphHash: published.graphHash,
    compositionLockHash: published.compositionLockHash,
    emptySeeds: true,
  };
  const verificationId = evidence.verificationRunId;
  if (typeof verificationId !== "string")
    throw new Error("Work Orders worker verification was not observed.");
  const response = await request.get(
    controlPlaneUrl("/verification-runs/" + encodeURIComponent(verificationId)),
    { maxRedirects: 0 },
  );
  expect(response.ok()).toBe(true);
  const run = object(await response.json()),
    result = object(run.evidence);
  expect(
    verifiedConsumerEvidence(run, preview.compilationId, verificationId),
  ).toBe(evidence.verificationStepCount);
  const required = [
    "create",
    "correct-open",
    "assign",
    "start",
    "correct-in-progress",
    "resolve",
    "reopen",
    "resolve-again",
    "reassign-open",
    "reassign-in-progress",
    "resolve-reassigned",
    "cancel-open",
    "cancel-in-progress",
    "cancel-after-reopen",
    "former-detail",
    "former-history",
    "former-start",
    "former-resolve",
    "former-replay",
    "technician-denied-create",
    "technician-denied-update",
  ];
  for (const step of required)
    expect(
      (result.steps as Json[]).some(
        (row) =>
          row.stepId === "work-orders-" + step && row.status === "passed",
      ),
    ).toBe(true);
  evidence.worker = {
    verificationRunId: verificationId,
    evidenceDigest: digest(JSON.stringify(result)),
    passedWorkOrdersScenarios: required.length,
    scope: "bounded-status-and-replay-probes",
  };
  const fingerprint = async () => {
    const row = await readPublished();
    return digest(
      JSON.stringify({
        graph: row.graph,
        compositionLock: row.compositionLock,
        graphHash: row.graphHash,
        compositionLockHash: row.compositionLockHash,
      }),
    );
  };
  return {
    preview,
    profile: profile!,
    fingerprint,
    publishedFingerprint: await fingerprint(),
  };
}
