import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { selectInventoryOperationsProfile } from "../../packages/compiler/dist/index.js";
import {
  applicationGraphSchema,
  hashApplicationGraph,
} from "../../packages/graph/dist/index.js";
import { type CapabilityCompositionLockV1 } from "../../packages/capabilities/dist/index.js";
import {
  deliverDirectory,
  consumerSourcePaths,
  digest,
  directoryFailureDiagnostic,
  object,
  type Json,
  type OwnedPreview,
  verifiedConsumerEvidence,
} from "./content-directory";
import { controlPlaneUrl } from "./restaurant-delivery";

export const inventorySelection = Object.freeze({
  definitionKey: "supplies-stockroom",
  requirementIdPrefix: "inventory-e2e",
  title: "Supplies Stockroom",
  outcome:
    "Maintain a shared stockroom with authoritative whole-item balances and immutable receive, issue and correction history.",
  brief:
    "Build a supplies stockroom. Stockkeepers add items, receive and issue whole each units, and record reasoned corrections linked to earlier movements. Observers only read availability. Use one shared stock pool and local demo roles.",
});
const phases = [
  "source-identity",
  "draft",
  "publish",
  "compile",
  "verify",
  "preview",
  "empty-create",
  "receive-issue-adjust",
  "find-read",
  "name-correction",
  "over-issue",
  "stale-concurrency",
  "uncertain-retry",
  "observer-denials",
  "restart-replay",
  "cleanup",
];
export function inventoryPhaseEvent(attempt: string, phase: string) {
  if (
    !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(attempt) ||
    !phases.includes(phase)
  )
    throw new Error("Invalid safe Inventory phase event.");
  return { event: "inventory.acceptance.phase", attempt, phase };
}
export function inventoryFailureDiagnostic(error: unknown) {
  const assertion = directoryFailureDiagnostic(error).assertion;
  const stack = (error as { stack?: unknown } | null)?.stack;
  const frame =
    typeof stack === "string"
      ? stack
          .split("\n")
          .filter((line) => /^\s+at /u.test(line))
          .map((line) =>
            /[\\/]e2e[\\/](inventory-operations\.spec\.ts|helpers[\\/]inventory-operations\.ts):(\d{1,6}):(\d{1,6})(?:\)|$)/u.exec(
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
            ? "e2e/helpers/inventory-operations.ts"
            : "e2e/inventory-operations.spec.ts",
          line: Number(frame[2]),
          column: Number(frame[3]),
        }
      : null,
  };
}
export async function inventorySourceIdentity() {
  const paths = [
    ...consumerSourcePaths,
    "e2e/inventory-operations.spec.ts",
    "e2e/helpers/inventory-operations.ts",
    "e2e/helpers/content-directory.ts",
    "e2e/helpers/content-directory.test.ts",
    "docs/adr/adr-0076-inventory-operations-family.md",
    "packages/compiler/src/index.ts",
    "packages/compiler/src/inventory-operations-contract.ts",
    "packages/compiler/src/inventory-operations-runtime.ts",
    "packages/compiler/src/inventory-operations-presentation.ts",
    "packages/adapters/src/requirements/definitions/product-definitions.v1.json",
    "apps/compiler-worker/src/verifier/inventory-operations-verification.ts",
    "apps/compiler-worker/src/verifier/verification-environment.ts",
    "apps/compiler-worker/src/verifier/probes.ts",
    "pnpm-lock.yaml",
  ];
  return Object.fromEntries(
    await Promise.all(
      paths.map(async (path) => [path, digest(await readFile(path))]),
    ),
  );
}
export async function inventoryApi(
  request: APIRequestContext,
  origin: string,
  path: string,
  role: "stockkeeper" | "observer",
  method = "GET",
  body?: unknown,
  key?: string,
) {
  const url = new URL(path, origin);
  if (
    !["127.0.0.1", "localhost"].includes(url.hostname) ||
    url.protocol !== "http:" ||
    url.origin !== new URL(origin).origin ||
    !url.pathname.startsWith("/api/")
  )
    throw new Error("Inventory API requires its owned loopback origin.");
  const response = await request.fetch(url.toString(), {
    method,
    headers: {
      "x-factory-fixture-session": "fixture-session-" + role,
      ...(key ? { "x-factory-idempotency-key": key } : {}),
    },
    ...(body === undefined ? {} : { data: body }),
    timeout: 30_000,
  });
  let value: unknown;
  try {
    value = await response.json();
  } catch {
    throw new Error("Generated Inventory API returned non-JSON.");
  }
  return { status: response.status(), body: object(value) };
}

export function inventoryFactRequest(
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
    throw new Error("Invalid owned Inventory observation.");
  return [...ids];
}
export interface InventoryFacts {
  items: number;
  movements: number;
  audit: number;
  receipts: number;
  effects: number;
  records: {
    quantity: number;
    version: number;
    movements: number;
    itemAudit: number;
    movementAudit: number;
    receipts: number;
    effects: number;
  }[];
}
export function parseInventoryFacts(
  text: string,
  recordCount: number,
): InventoryFacts {
  const fail = () => {
    throw new Error("Invalid bounded Inventory facts.");
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
  const count = (input: unknown, maximum = 10000) =>
    typeof input === "number" &&
    Number.isSafeInteger(input) &&
    !Object.is(input, -0) &&
    input >= 0 &&
    input <= maximum;
  if (
    !exact(value, [
      "items",
      "movements",
      "audit",
      "receipts",
      "effects",
      "records",
    ])
  )
    return fail();
  if (
    !["items", "movements", "audit", "receipts", "effects"].every((key) =>
      count(value[key]),
    ) ||
    !Array.isArray(value.records) ||
    value.records.length !== recordCount
  )
    return fail();
  for (const row of value.records) {
    if (
      !exact(row, [
        "quantity",
        "version",
        "movements",
        "itemAudit",
        "movementAudit",
        "receipts",
        "effects",
      ]) ||
      !count(row.quantity, 1000000000) ||
      !count(row.version, 2147483647) ||
      !["movements", "itemAudit", "movementAudit", "receipts", "effects"].every(
        (key) => count(row[key]),
      )
    )
      return fail();
  }
  return value as unknown as InventoryFacts;
}
/** Fixed read-only Inventory counts. Never returns database rows, keys or receipt bodies. */
export function inventoryFacts(
  preview: OwnedPreview,
  requestedIds: readonly string[] = [],
): InventoryFacts {
  const ids = inventoryFactRequest(preview, requestedIds);
  const run = (args: string[], input?: string) => {
    try {
      return execFileSync("docker", args, {
        encoding: "utf8",
        stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
        ...(input === undefined ? {} : { input }),
        timeout: 120_000,
        maxBuffer: 8192,
      }).trim();
    } catch {
      throw new Error("Owned Inventory fact observation failed.");
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
    throw new Error("Owned Inventory API container was not unique.");
  const script = `const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();(async()=>{try{const ids=${JSON.stringify(ids)};const records=[];for(const id of ids){const item=await p.stockItem.findUnique({where:{id},select:{quantity:true,version:true}});if(!item)throw Error();const movements=await p.stockMovement.findMany({where:{stockItemId:id},select:{id:true},take:10001});if(movements.length>10000)throw Error();const movementIds=movements.map(row=>row.id);records.push({...item,movements:movements.length,itemAudit:await p.factory_AuditEvent.count({where:{recordId:id}}),movementAudit:await p.factory_AuditEvent.count({where:{recordId:{in:movementIds}}}),receipts:await p.factory_InventoryMutationReceipt.count({where:{recordId:id}}),effects:await p.factory_CapabilityEvent.count({where:{recordId:{in:movementIds}}})});}process.stdout.write(JSON.stringify({items:await p.stockItem.count(),movements:await p.stockMovement.count(),audit:await p.factory_AuditEvent.count(),receipts:await p.factory_InventoryMutationReceipt.count(),effects:await p.factory_CapabilityEvent.count(),records}));}catch{process.stderr.write('Inventory fact observation failed');process.exitCode=1;}finally{await p.$disconnect();}})();`;
  return parseInventoryFacts(
    run(["exec", "-i", container, "node"], script),
    ids.length,
  );
}

/** One small adapter over the already exercised lifecycle, with no duplicate runner. */
export async function deliverInventory(
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
    inventorySelection,
  );
  const publishedPath =
    "/application-graphs/" +
    encodeURIComponent(String(object(evidence.applied).applicationGraphId)) +
    "/published-revisions";
  const readPublished = async () => {
    const response = await request.get(controlPlaneUrl(publishedPath));
    expect(response.ok()).toBe(true);
    const rows = (await response.json()) as Json[];
    const match = rows.find((row) => row.id === evidence.publishedRevisionId);
    if (!match) throw new Error("Inventory Published revision missing.");
    return match;
  };
  const published = await readPublished();
  const graph = applicationGraphSchema.parse(published.graph),
    profile = selectInventoryOperationsProfile(
      graph,
      published.compositionLock as CapabilityCompositionLockV1,
    );
  expect(profile).toBeDefined();
  expect(profile!.itemEntity).toBe("stock-item");
  expect(profile!.movementEntity).toBe("stock-movement");
  expect(graph.domain.seedData).toEqual([]);
  expect(hashApplicationGraph(graph)).toBe(published.graphHash);
  expect(published.sourceDraftRevisionId).toEqual(expect.any(String));
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
    throw new Error("Inventory worker verification was not observed.");
  const verified = await request.get(
    controlPlaneUrl("/verification-runs/" + encodeURIComponent(verificationId)),
  );
  expect(verified.ok()).toBe(true);
  const run = object(await verified.json()),
    result = object(run.evidence),
    steps = result.steps;
  expect(
    verifiedConsumerEvidence(run, preview.compilationId, verificationId),
  ).toBe(evidence.verificationStepCount);
  expect(Array.isArray(steps)).toBe(true);
  expect(
    (steps as Json[]).some(
      (step) =>
        step.stepId === "inventory-stock-lifecycle" && step.status === "passed",
    ),
  ).toBe(true);
  evidence.worker = {
    verificationRunId: verificationId,
    evidenceDigest: digest(JSON.stringify(result)),
    inventoryJourneyPassed: true,
  };
  const fingerprint = async () => {
    const match = await readPublished();
    return digest(
      JSON.stringify({
        graph: match.graph,
        compositionLock: match.compositionLock,
        graphHash: match.graphHash,
        compositionLockHash: match.compositionLockHash,
      }),
    );
  };
  return {
    preview,
    profile: profile!,
    publishedFingerprint: await fingerprint(),
    fingerprint,
  };
}
