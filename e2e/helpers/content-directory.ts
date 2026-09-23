import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { OpenAIRequirementInterpreterAdapter } from "@factory/adapters";
import {
  controlPlaneUrl,
  currentPreview,
  type PreviewRun,
} from "./restaurant-delivery";

export type Json = Record<string, unknown>;
export type OwnedPreview = PreviewRun & { composeProjectName: string };
export const directoryBrief =
  "Build a knowledge resource directory. Readers search and read guides, references and checklists. Curators create, correct, show and hide plain-text entries.";
export const digest = (value: string | Uint8Array) =>
  `sha256:${createHash("sha256").update(value).digest("hex")}`;
export function object(value: unknown): Json {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Expected a safe JSON object.");
  return value as Json;
}
export function compilationObservation(value: unknown): {
  status: "queued" | "succeeded" | "failed" | "unknown";
  failureCode: "compilation.failed" | "unknown" | null;
} {
  const result =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as { result?: unknown }).result
      : undefined;
  const record =
    result && typeof result === "object" && !Array.isArray(result)
      ? (result as { status?: unknown; failureCode?: unknown })
      : undefined;
  const status =
    record?.status === "queued" ||
    record?.status === "succeeded" ||
    record?.status === "failed"
      ? record.status
      : "unknown";
  return {
    status,
    failureCode:
      status === "failed"
        ? record?.failureCode === "compilation.failed"
          ? "compilation.failed"
          : "unknown"
        : null,
  };
}
export function assertCompilationSucceeded(
  observation: ReturnType<typeof compilationObservation>,
): void {
  if (observation.status !== "succeeded")
    throw new Error("Compilation did not succeed.");
}
export function directoryPhaseEvent(attempt: string, phase: string) {
  const phases = [
    "source-identity",
    "draft",
    "publish",
    "compile",
    "verify",
    "preview",
    "curator-create",
    "uncertain-create-retry",
    "reader-find-read",
    "same-record-stale-correction",
    "server-denials-concurrency",
    "restart-replay-persistence",
    "cleanup",
  ];
  if (
    !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(attempt) ||
    !phases.includes(phase)
  )
    throw new Error("Invalid safe phase event.");
  return { event: "directory.acceptance.phase", attempt, phase };
}
export function directoryFailureDiagnostic(error: unknown) {
  const candidate = error as {
    stack?: unknown;
    matcherResult?: { name?: unknown };
  } | null;
  const matchers = [
    "toBe",
    "toEqual",
    "toMatch",
    "toMatchObject",
    "toBeVisible",
    "toHaveCount",
    "toHaveText",
    "toHaveValue",
    "toContainText",
    "toBeDisabled",
    "toBeDefined",
    "toBeGreaterThan",
    "toBeLessThanOrEqual",
  ];
  const matcher = candidate?.matcherResult?.name;
  const frame =
    typeof candidate?.stack === "string"
      ? candidate.stack
          .split("\n")
          .filter((line) => /^\s+at /u.test(line))
          .map((line) =>
            /[\\/]e2e[\\/](content-directory\.spec\.ts|helpers[\\/]content-directory\.ts):(\d{1,6}):(\d{1,6})(?:\)|$)/u.exec(
              line,
            ),
          )
          .find(Boolean)
      : undefined;
  return {
    assertion:
      typeof matcher === "string" && matchers.includes(matcher)
        ? matcher
        : "unknown",
    location: frame
      ? {
          file: frame[1]!.startsWith("helpers")
            ? "e2e/helpers/content-directory.ts"
            : "e2e/content-directory.spec.ts",
          line: Number(frame[2]),
          column: Number(frame[3]),
        }
      : null,
  };
}
export async function sourceIdentity() {
  const paths = [
    "e2e/content-directory.spec.ts",
    "e2e/helpers/content-directory.ts",
    "docs/adr/adr-0074-content-directory-family.md",
    "packages/compiler/src/index.ts",
    "packages/compiler/src/content-directory-contract.ts",
    "packages/compiler/src/content-directory-runtime.ts",
    "packages/compiler/src/content-directory-presentation.ts",
    "packages/adapters/src/requirements/definitions/product-definitions.v1.json",
    "apps/compiler-worker/src/verifier/verification-graph-plan.ts",
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
export async function api(
  request: APIRequestContext,
  origin: string,
  path: string,
  role: "reader" | "curator",
  method = "GET",
  body?: unknown,
  key?: string,
) {
  const response = await request.fetch(new URL(path, origin).toString(), {
    method,
    headers: {
      "x-factory-fixture-session": `fixture-session-${role}`,
      ...(key ? { "x-factory-idempotency-key": key } : {}),
    },
    ...(body === undefined ? {} : { data: body }),
  });
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error(
      `Generated API returned non-JSON status ${response.status()}.`,
    );
  }
  return { status: response.status(), body: object(payload) };
}
export async function ready(request: APIRequestContext, origin: string) {
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
function docker(args: string[], input?: string) {
  try {
    return execFileSync("docker", args, {
      encoding: "utf8",
      ...(input === undefined ? {} : { input }),
      stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
      timeout: 120_000,
    }).trim();
  } catch {
    throw new Error("Owned Preview Docker operation failed.");
  }
}
function container(project: string, service: string) {
  expect(project).toMatch(/^factory-(?:preview|t10)-[a-z0-9-]+$/u);
  const id = docker([
    "ps",
    "--filter",
    `label=com.docker.compose.project=${project}`,
    "--filter",
    `label=com.docker.compose.service=${service}`,
    "--quiet",
  ]);
  expect(id).toMatch(/^[a-f0-9]{12,64}$/u);
  return id;
}
export function restartOwnedApi(preview: OwnedPreview) {
  expect(preview.composeProjectName).toMatch(/^factory-preview-[a-z0-9-]+$/u);
  docker(["restart", container(preview.composeProjectName, "api")]);
}
export function mutationFacts(preview: OwnedPreview, ids: string[]) {
  // Return counts only. Never emit rows, receipt bodies, keys or environment values.
  const query = `const {PrismaClient}=require('@prisma/client');const prisma=new PrismaClient();
  (async()=>{try{const ids=${JSON.stringify(ids)};const counts=[];for(const recordId of ids){counts.push({audit:await prisma.factory_AuditEvent.count({where:{recordId}}),receipts:await prisma.directoryMutationReceipt.count({where:{recordId}}),effects:await prisma.factory_CapabilityEvent.count({where:{recordId}})});}process.stdout.write(JSON.stringify(counts));}catch{process.stderr.write('Safe mutation count query failed');process.exitCode=1;}finally{await prisma.$disconnect();}})();`;
  return JSON.parse(
    docker(
      ["exec", "-i", container(preview.composeProjectName, "api"), "node"],
      query,
    ),
  ) as { audit: number; receipts: number; effects: number }[];
}
export function ownedResources(preview: OwnedPreview, factoryProject: string) {
  expect(preview.id).toMatch(/^preview-[a-z0-9-]+$/u);
  expect(preview.composeProjectName).toMatch(/^factory-preview-[a-z0-9-]+$/u);
  const artifact = spawnSync(
    "docker",
    [
      "exec",
      container(factoryProject, "compiler-worker"),
      "test",
      "-d",
      `/artifacts/.preview-runs/${preview.id}`,
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30_000 },
  );
  if (artifact.error || ![0, 1].includes(artifact.status ?? -1))
    throw new Error("Owned Preview artifact check failed.");
  const filter = [
    "--filter",
    `label=com.docker.compose.project=${preview.composeProjectName}`,
    "--quiet",
  ];
  return {
    artifact: artifact.status === 0,
    containers: docker(["ps", "--all", ...filter]) !== "",
    networks: docker(["network", "ls", ...filter]) !== "",
    volumes: docker(["volume", "ls", ...filter]) !== "",
  };
}
export async function compilationIdentity(
  request: APIRequestContext,
  compilationId: string,
) {
  const response = await request.get(
    controlPlaneUrl(`/compilations/${encodeURIComponent(compilationId)}`),
  );
  expect(response.ok()).toBe(true);
  const payload = object(await response.json());
  return {
    id: payload.id,
    publishedRevisionId: payload.publishedRevisionId,
    artifactManifestHash: digest(JSON.stringify(payload.artifacts)),
    inputGraphHash: payload.inputGraphHash,
    compositionLockHash: payload.compositionLockHash,
  };
}

/** Existing Workbench lifecycle, using an authored selection through the public adapter. */
export async function deliverDirectory(
  page: Page,
  request: APIRequestContext,
  evidence: Json,
  phase: (name: string) => void,
  remember: (id: string, preview?: OwnedPreview) => void,
) {
  const interpretation = await new OpenAIRequirementInterpreterAdapter({
    readEnvironment: () => "fixture-key",
    transport: {
      async create() {
        return {
          outputText: JSON.stringify({
            resultKind: "definition-selection",
            definitionSelection: {
              definitionKey: "knowledge-resource-directory",
              disposition: "supported-default",
              requirementId: `directory-e2e-${randomUUID()}`,
              title: "Knowledge Resource Directory",
              outcome:
                "Find useful resources and keep the same entries accurate and visible.",
              materialQuestions: [],
              businessParameters: null,
            },
            generatedInterpretation: null,
          }),
        };
      },
    },
  }).interpret({ brief: directoryBrief, answers: {} });
  await page.route("**/api/requirements/interpret", async (route) =>
    route.request().method() === "POST"
      ? route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(interpretation),
        })
      : route.continue(),
  );
  phase("draft");
  await page.goto("/");
  await expect(
    page.getByText("Control Plane ready", { exact: true }),
  ).toBeVisible({ timeout: 120_000 });
  await page.getByLabel("Requirement brief").fill(directoryBrief);
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
  phase("publish");
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  const release = page.getByRole("region", { name: "Release", exact: true });
  const publishedResponse = page.waitForResponse(
    (r) =>
      r.request().method() === "POST" &&
      /\/application-graphs\/[^/]+\/published-revisions$/u.test(
        new URL(r.url()).pathname,
      ),
  );
  await release
    .getByRole("button", { name: "Publish Draft", exact: true })
    .click();
  const published = object(await (await publishedResponse).json());
  expect(published.graphHash).toMatch(/^sha256:[a-f0-9]{64}$/u);
  expect(published.compositionLockHash).toMatch(/^sha256:[a-f0-9]{64}$/u);
  evidence.publishedRevisionId = published.id;
  evidence.inputGraphHash = published.graphHash;
  evidence.compositionLockHash = published.compositionLockHash;
  phase("compile");
  const compile = release.getByRole("button", {
    name: "Compile Published Graph",
    exact: true,
  });
  await expect(compile).toBeVisible({ timeout: 60_000 });
  const compilationResponse = page.waitForResponse(
    (r) =>
      r.request().method() === "POST" &&
      new URL(r.url()).pathname === "/compilations",
  );
  await compile.click();
  const compilation = object(await (await compilationResponse).json());
  expect(typeof compilation.id).toBe("string");
  expect(compilation.publishedRevisionId).toBe(published.id);
  const id = String(compilation.id);
  remember(id);
  evidence.compilationId = id;
  const compilationDeadline = Date.now() + 315_000;
  let observation = compilationObservation(compilation);
  evidence.compilationObservation = observation;
  await expect
    .poll(
      async () => {
        const remainingMs = compilationDeadline - Date.now();
        if (remainingMs <= 0) return false;
        const response = await request.get(
          controlPlaneUrl(`/compilations/${encodeURIComponent(id)}`),
          { timeout: Math.min(10_000, remainingMs) },
        );
        expect(response.ok()).toBe(true);
        observation = compilationObservation(await response.json());
        evidence.compilationObservation = observation;
        return (
          Date.now() <= compilationDeadline &&
          (observation.status === "succeeded" ||
            observation.status === "failed")
        );
      },
      { timeout: 315_000 },
    )
    .toBe(true);
  assertCompilationSucceeded(observation);
  phase("verify");
  const verify = release.getByRole("button", {
    name: "Run Isolated Verification",
    exact: true,
  });
  await expect(verify).toBeVisible({ timeout: 315_000 });
  await verify.click();
  await expect(release.locator(".release-evidence-summary")).toBeVisible({
    timeout: 910_000,
  });
  expect(
    await release.locator(".release-evidence-summary").textContent(),
  ).toMatch(/\d+ steps · \d+ passed · 0 failed/u);
  evidence.verificationPassed = true;
  phase("preview");
  const startedResponse = page.waitForResponse(
    (r) =>
      r.request().method() === "POST" &&
      /\/compilations\/[^/]+\/preview-runs$/u.test(new URL(r.url()).pathname),
  );
  await release
    .getByRole("button", { name: "Start Preview", exact: true })
    .click();
  const started = object(await (await startedResponse).json());
  expect(started.id).toMatch(/^preview-[a-z0-9-]+$/u);
  expect(started.composeProjectName).toMatch(/^factory-preview-[a-z0-9-]+$/u);
  remember(id, started as unknown as OwnedPreview);
  let preview: OwnedPreview | null = null;
  await expect
    .poll(
      async () => {
        preview = (await currentPreview(request, id)) as OwnedPreview | null;
        return preview?.status;
      },
      { timeout: 300_000 },
    )
    .toBe("ready");
  const result = preview as unknown as OwnedPreview;
  expect(result.id).toBe(started.id);
  expect(result.compilationId).toBe(id);
  expect(result.previewUrl).toMatch(
    /^http:\/\/(?:127\.0\.0\.1|localhost):\d+\/?$/u,
  );
  remember(id, result);
  evidence.previewRunId = result.id;
  await ready(request, result.previewUrl!);
  return result;
}
