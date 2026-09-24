import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { selectCustomerRequestsProfile } from "../../packages/compiler/dist/index.js";
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
  ownedConsumerPreview,
  verifiedConsumerEvidence,
  type Json,
  type OwnedPreview,
} from "./content-directory";
import { controlPlaneUrl } from "./restaurant-delivery";

export type CustomerRequestsActor =
  "customer-a" | "customer-b" | "support-staff";
export const customerRequestsSelection = Object.freeze({
  definitionKey: "customer-support-desk",
  requirementIdPrefix: "customer-requests-e2e",
  title: "Customer Support Desk",
  outcome:
    "Customers and staff retain attributed requests, corrections, replies, resolutions, reopen reasons and cancellation history.",
  brief:
    "Build a local customer support desk with synthetic demo people. Customers submit their own subject and description, correct mistaken details with a reason, read saved attributed replies, reply and correct their own messages, reopen a resolved request with a reason and cancel an open mistaken request with a reason. Staff triage requests by status and next reply, reply and correct their own messages, and resolve with a customer-visible message. Retain the original conversation and corrections after reload. Customer A and Customer B share a role but cannot access each other's requests. Support phones and desktop. This demo uses no private accounts, real personal data, uploads or outbound notifications.",
});
function localOrigin(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    !/^http:\/\/(?:127\.0\.0\.1|localhost):[1-9]\d{0,4}\/?$/u.test(value)
  )
    return false;
  try {
    return Number(new URL(value).port) <= 65535;
  } catch {
    return false;
  }
}
export function customerRequestsGuard(input: {
  authorized?: string;
  isolated?: string;
  factoryProject?: string;
  controlPlane?: string;
  workbench?: string;
}): string {
  if (
    input.authorized !== "1" ||
    input.isolated !== "1" ||
    !/^factory-t10-[a-z0-9-]{1,80}$/u.test(input.factoryProject ?? "") ||
    !localOrigin(input.controlPlane) ||
    !localOrigin(input.workbench)
  )
    throw new Error(
      "Customer Requests requires independently authorized isolated local execution.",
    );
  return input.factoryProject!;
}
export function customerRequestsApiUrl(origin: string, path: string): string {
  const fail = (): never => {
    throw new Error("Customer Requests API requires its owned loopback path.");
  };
  if (
    !localOrigin(origin) ||
    !/^\/api\/customer-request(?:\/|\?|$)/u.test(path) ||
    /[\\#\u0000-\u0020]/u.test(path)
  )
    return fail();
  const url = new URL(path, origin);
  if (
    url.origin !== new URL(origin).origin ||
    url.username ||
    url.password ||
    url.hash ||
    !/^\/api\/customer-request(?:\/|$)/u.test(url.pathname) ||
    /(?:^|\/)\.\.(?:\/|$)|%2e|%2f|%5c/iu.test(path)
  )
    return fail();
  return url.toString();
}
/** Pure scope proof. The caller must separately authorize and execute cleanup. */
export function customerRequestsCleanupPlan(
  preview: Pick<OwnedPreview, "id" | "compilationId" | "composeProjectName">,
  compilationId: string,
  factoryProject: string,
) {
  if (
    !/^[a-zA-Z0-9._-]{1,128}$/u.test(compilationId) ||
    !/^factory-t10-[a-z0-9-]{1,80}$/u.test(factoryProject)
  )
    throw new Error("Invalid Customer Requests cleanup owner.");
  const owned = ownedConsumerPreview(preview, compilationId);
  return {
    compilationId,
    previewRunId: owned.id,
    composeProjectName: owned.composeProjectName,
    factoryProject,
    artifactPath: "/artifacts/.preview-runs/" + owned.id,
  };
}
export function customerRequestsHistorySummary(
  id: string,
  version: number,
  rows: readonly Json[],
) {
  if (
    !/^[A-Za-z0-9._~-]{1,128}$/u.test(id) ||
    !Number.isSafeInteger(version) ||
    version < 0 ||
    version >= 50 ||
    rows.length !== version + 1 ||
    new Set(rows.map((row) => row.id)).size !== rows.length ||
    rows.some(
      (row, i) =>
        typeof row.id !== "string" ||
        row.request !== id ||
        row.requestVersion !== version - i ||
        !["create", "update", "reply", "complete", "reopen", "cancel"].includes(
          String(row.action),
        ),
    )
  )
    throw new Error("Invalid bounded Customer Requests history chain.");
  return {
    recordDigest: digest(id),
    version,
    events: rows.length,
    actions: [...rows].reverse().map((row) => String(row.action)),
    historyDigest: digest(JSON.stringify(rows)),
  };
}
export function customerRequestsFailure(error: unknown) {
  const assertion = directoryFailureDiagnostic(error).assertion;
  const stack = (error as { stack?: unknown } | null)?.stack;
  const frame =
    typeof stack === "string"
      ? stack
          .split("\n")
          .filter((line) => /^\s+at /u.test(line))
          .map((line) =>
            /[\\/]e2e[\\/](customer-requests\.spec\.ts|helpers[\\/]customer-requests\.ts):(\d{1,6}):(\d{1,6})(?:\)|$)/u.exec(
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
            ? "e2e/helpers/customer-requests.ts"
            : "e2e/customer-requests.spec.ts",
          line: Number(frame[2]),
          column: Number(frame[3]),
        }
      : null,
  };
}
export async function customerRequestsApi(
  request: APIRequestContext,
  origin: string,
  path: string,
  actor: CustomerRequestsActor = "customer-a",
  method = "GET",
  body?: unknown,
  key?: string,
) {
  const response = await request.fetch(customerRequestsApiUrl(origin, path), {
    method,
    headers: {
      "x-factory-fixture-session": "fixture-session-" + actor,
      ...(key ? { "x-factory-idempotency-key": key } : {}),
    },
    ...(body === undefined ? {} : { data: body }),
    maxRedirects: 0,
    timeout: 30_000,
  });
  let value: unknown;
  try {
    value = await response.json();
  } catch {
    throw new Error("Customer Requests API returned non-JSON.");
  }
  return { status: response.status(), body: object(value) };
}
export async function customerRequestsSources() {
  const paths = [
    ...consumerSourcePaths,
    "docs/adr/adr-0084-customer-requests-family.md",
    "docs/adr/adr-0085-customer-requests-verifier-adaptation.md",
    "e2e/customer-requests.spec.ts",
    "e2e/helpers/customer-requests.ts",
    "e2e/helpers/customer-requests.test.ts",
    "e2e/helpers/content-directory.ts",
    "e2e/tsconfig.consumer-delivery.json",
    "scripts/definition-case-bindings.mjs",
    "packages/graph/src/customer-requests-graph-witness.ts",
    "packages/graph/src/customer-requests-blueprint-witness.ts",
    "packages/compiler/src/index.ts",
    "packages/compiler/src/customer-requests-contract.ts",
    "packages/compiler/src/customer-requests-runtime.ts",
    "packages/compiler/src/customer-requests-presentation.ts",
    "packages/compiler/src/approval-workspace-presentation.ts",
    "packages/adapters/src/requirements/definitions/product-definitions.v1.json",
    "apps/compiler-worker/src/verifier/customer-requests-verification.ts",
    "pnpm-lock.yaml",
  ];
  return Object.fromEntries(
    await Promise.all(
      [...new Set(paths)].map(async (path) => {
        const source = await readFile(path, "utf8");
        return [
          path,
          {
            digest: digest(source),
            nonblankLines: source.split(/\r?\n/u).filter((line) => line.trim())
              .length,
          },
        ];
      }),
    ),
  );
}
/** Existing Home observer supplies authored selection, automatic immutable delivery and measured actions. */
export async function deliverCustomerRequests(
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
    customerRequestsSelection,
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
    const published = ((await response.json()) as Json[]).find(
      (row) => row.id === evidence.publishedRevisionId,
    );
    if (!published)
      throw new Error("Customer Requests Published revision missing.");
    return published;
  };
  const published = await readPublished(),
    graph = applicationGraphSchema.parse(published.graph);
  const profile = selectCustomerRequestsProfile(
    published.graph as typeof graph,
    published.compositionLock as CapabilityCompositionLockV1,
  );
  expect(profile).toBeDefined();
  expect(profile).toMatchObject({
    requestEntity: "customer-request",
    historyEntity: "request-history",
    workflow: "handle-request",
    roles: { staff: "staff", customer: "customer" },
    pages: {
      list: "my-requests",
      form: "new-request",
      detail: "request-detail",
      queue: "staff-queue",
    },
  });
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
  evidence.materialRequirements = {
    authority: "exact-family-witness-plus-business-journey",
    required: [
      "own-request-create",
      "reasoned-metadata-correction",
      "attributed-persisted-conversation",
      "own-message-correction",
      "staff-triage",
      "resolution-message",
      "reasoned-reopen",
      "terminal-cancellation",
      "same-role-ownership",
      "mobile-and-desktop",
    ],
    unsupportedRequested: 0,
    silentlyDropped: 0,
  };
  const verificationId = evidence.verificationRunId;
  if (typeof verificationId !== "string")
    throw new Error("Customer Requests verification not observed.");
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
  expect(
    (result.steps as Json[]).some(
      (row) =>
        row.stepId === "customer-requests-lifecycle" && row.status === "passed",
    ),
  ).toBe(true);
  evidence.worker = {
    verificationRunId: verificationId,
    evidenceDigest: digest(JSON.stringify(result)),
    scope: "bounded-lifecycle-and-ownership-probes",
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
