import {
  expect,
  type APIRequestContext,
  type Page,
  type Response,
  type Request,
} from "@playwright/test";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import {
  OpenAIRequirementInterpreterAdapter,
  assertRequirementInterpretationResult,
} from "../../packages/adapters/dist/index.js";
import { parseVerificationEvidence } from "../../packages/graph/dist/index.js";
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
const safeIdentity = (value: unknown): value is string =>
  typeof value === "string" && /^[a-zA-Z0-9._-]{1,128}$/u.test(value);

export function consumerDeliveryLabel(definitionKey: string): string {
  switch (definitionKey) {
    case "facilities-service-desk":
      return "Work Orders";
    case "knowledge-resource-directory":
      return "Directory";
    case "supplies-stockroom":
      return "Inventory";
    case "appointment-booking-v2":
      return "Appointment";
    default:
      throw new Error("Unsupported consumer acceptance definition.");
  }
}

export function assertConsumerCompilation(published: Json, compilation: Json) {
  if (
    !safeIdentity(published.id) ||
    !safeIdentity(compilation.id) ||
    compilation.publishedRevisionId !== published.id ||
    typeof published.graphHash !== "string" ||
    !/^sha256:[a-f0-9]{64}$/u.test(published.graphHash) ||
    typeof published.compositionLockHash !== "string" ||
    !/^sha256:[a-f0-9]{64}$/u.test(published.compositionLockHash) ||
    compilation.inputGraphHash !== published.graphHash
  )
    throw new Error("Consumer Compilation identity mismatch.");
}

export function verifiedConsumerEvidence(
  value: unknown,
  compilationId: string,
  verificationRunId: string,
): number {
  try {
    const run = object(value);
    const evidence = parseVerificationEvidence(run.evidence);
    if (
      run.compilationId !== compilationId ||
      run.verificationRunId !== verificationRunId ||
      run.status !== "succeeded" ||
      evidence.verificationRunId !== verificationRunId ||
      !evidence.cleanup.succeeded ||
      !evidence.steps.every((step) => step.status === "passed") ||
      JSON.stringify(run.stepIds) !==
        JSON.stringify(evidence.steps.map((step) => step.stepId))
    )
      throw new Error();
    return evidence.steps.length;
  } catch {
    throw new Error(
      "Consumer verification was not authoritative and successful.",
    );
  }
}

export function ownedConsumerPreview(
  value: unknown,
  compilationId: string,
): OwnedPreview {
  const preview = object(value);
  if (
    typeof preview.id !== "string" ||
    !/^preview-[a-z0-9-]{1,100}$/u.test(preview.id) ||
    preview.compilationId !== compilationId ||
    preview.composeProjectName !== "factory-preview-" + preview.id
  )
    throw new Error("Consumer Preview ownership mismatch.");
  return preview as unknown as OwnedPreview;
}

export function reconcileConsumerPreviewAttempt(
  compilationId: string,
  attempted: boolean,
  current: unknown,
  remember: (id: string, preview?: OwnedPreview) => void,
) {
  if (current) {
    remember(compilationId, ownedConsumerPreview(current, compilationId));
    return "owned-preview-observed";
  }
  // An empty read cannot prove that an in-flight create will not commit later.
  return attempted ? "cleanup-required" : "no-preview-attempted";
}

export function consumerEntryActions(actions: readonly string[]) {
  const counts = {
    businessSubmissions: 0,
    materialAnswerSubmissions: 0,
    technicalActions: 0,
    viewNavigation: 0,
    retries: 0,
    otherActions: 0,
  };
  const keys = {
    business: "businessSubmissions",
    answer: "materialAnswerSubmissions",
    technical: "technicalActions",
    navigation: "viewNavigation",
    retry: "retries",
    other: "otherActions",
  } as const;
  if (actions.length > 1000)
    throw new Error("Invalid bounded consumer action observation.");
  for (const action of actions) {
    if (!Object.hasOwn(keys, action))
      throw new Error("Invalid bounded consumer action observation.");
    counts[keys[action as keyof typeof keys]]++;
  }
  return counts;
}

export const consumerSourcePaths = [
  "docs/adr/adr-0079-accepted-family-consumer-delivery.md",
  "apps/workbench/lib/product-journey/consumer-family.ts",
  "apps/workbench/lib/product-journey/use-consumer-generation.ts",
  "apps/workbench/components/workbench-home.tsx",
  "apps/workbench/components/workbench.tsx",
  "apps/workbench/components/journey/requirement-composer.tsx",
  "apps/workbench/components/journey/clarification-panel.tsx",
  "apps/workbench/app/api/requirements/interpret/route.ts",
  "apps/workbench/lib/product-journey/use-product-journey.ts",
  "apps/workbench/lib/product-journey/interpret-payload.ts",
  "apps/workbench/lib/product-journey/interpret-contract.ts",
  "apps/workbench/lib/product-journey/journey-model.ts",
  "packages/capabilities/src/product-composer.ts",
  "packages/capabilities/src/plan-alternatives.ts",
  "packages/capabilities/src/index.ts",
  "packages/adapters/src/requirements/definition-family-registry.ts",
  "packages/adapters/src/requirements/openai-interpreter.ts",
  "packages/adapters/src/requirements/requirement-interpreter.ts",
] as const;
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
    ...consumerSourcePaths,
    "e2e/content-directory.spec.ts",
    "e2e/helpers/content-directory.ts",
    "e2e/helpers/content-directory.test.ts",
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

/** Observe the existing automatic consumer journey; never operate lifecycle controls. */
export async function deliverDirectory(
  page: Page,
  request: APIRequestContext,
  evidence: Json,
  phase: (name: string) => void,
  remember: (id: string, preview?: OwnedPreview) => void,
  selection = {
    definitionKey: "knowledge-resource-directory",
    requirementIdPrefix: "directory-e2e",
    title: "Knowledge Resource Directory",
    outcome:
      "Find useful resources and keep the same entries accurate and visible.",
    brief: directoryBrief,
  },
) {
  const familyLabel = consumerDeliveryLabel(selection.definitionKey);
  const interpretation = await new OpenAIRequirementInterpreterAdapter({
    readEnvironment: () => "fixture-key",
    transport: {
      async create() {
        return {
          outputText: JSON.stringify({
            resultKind: "definition-selection",
            definitionSelection: {
              definitionKey: selection.definitionKey,
              disposition: "supported-default",
              requirementId: `${selection.requirementIdPrefix}-${randomUUID()}`,
              title: selection.title,
              outcome: selection.outcome,
              materialQuestions: [],
              businessParameters: null,
            },
            generatedInterpretation: null,
          }),
        };
      },
    },
  }).interpret({ brief: selection.brief, answers: {} });
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
  await page.getByLabel("Requirement brief").fill(selection.brief);
  // The browser retains only allowlisted categories and counts, never labels or input.
  await page.evaluate(() => {
    const actions: string[] = [];
    let active = true,
      materialAnswers = 0;
    const record = (event: MouseEvent) => {
      if (!active || !(event.target instanceof Element)) return;
      const control = event.target.closest("button, a, [role=button]");
      if (!control) return;
      const label = (
        control.getAttribute("aria-label") ??
        control.textContent ??
        ""
      ).trim();
      const category =
        label === "Create product"
          ? "business"
          : label === "Continue"
            ? "answer"
            : label === "Publish"
              ? "navigation"
              : ["Restart local delivery", "Retry", "Try again"].includes(label)
                ? "retry"
                : /^Choose /u.test(label) ||
                    [
                      "Apply to Draft",
                      "Publish Draft",
                      "Compile Published Graph",
                      "Run Isolated Verification",
                      "Start Preview",
                    ].includes(label)
                  ? "technical"
                  : "other";
      if (category === "answer") {
        materialAnswers += [
          ...document.querySelectorAll<HTMLInputElement>(
            "input[data-clarification-category]",
          ),
        ].filter(
          (input) =>
            input.value.trim() !== "" &&
            input.dataset.clarificationCategory !== "experience.visual-style",
        ).length;
      }
      if (actions.length <= 1000) actions.push(category);
    };
    document.addEventListener("click", record, true);
    (
      window as unknown as {
        __consumerEntryObservation: () => {
          actions: string[];
          materialAnswers: number;
        };
      }
    ).__consumerEntryObservation = () => {
      active = false;
      document.removeEventListener("click", record, true);
      return { actions, materialAnswers };
    };
  });
  const entry: Json = {
    scope: "Create product to verified consumer ready control",
    status: "observing",
    startedAtMs: Date.now(),
    materialQuestions: null,
    interpretationResponses: 0,
    firstUsefulActionMs: null,
  };
  evidence.consumerEntry = entry;
  let choiceReviewId: string | undefined, applied: Json | undefined;
  let published: Json | undefined,
    compilation: Json | undefined,
    verification: Json | undefined;
  let started: OwnedPreview | undefined, ownedId: string | undefined;
  let observationFailed = false,
    completed = false;
  let previewAttempted = false;
  const observeRequest = (request: Request) => {
    const url = new URL(request.url());
    if (
      request.method() === "POST" &&
      url.origin === new URL(controlPlaneUrl("/")).origin &&
      /^\/compilations\/[^/]+\/preview-runs$/u.test(url.pathname)
    ) {
      previewAttempted = true;
      entry.previewCreationAttempted = true;
    }
  };
  const calls = {
    choose: 0,
    apply: 0,
    publish: 0,
    compile: 0,
    verify: 0,
    preview: 0,
  };
  const pending: Promise<void>[] = [];
  const observe = (response: Response) => {
    const url = new URL(response.url()),
      path = url.pathname;
    if (response.request().method() !== "POST") return;
    if (
      path === "/api/requirements/interpret" &&
      url.origin === new URL(page.url()).origin
    ) {
      pending.push(
        (async () => {
          if (!response.ok()) throw new Error();
          const actual = assertRequirementInterpretationResult(
            await response.json(),
          );
          entry.materialQuestions =
            Number(entry.materialQuestions ?? 0) +
            actual.interpretation.clarifications
              .flatMap((item) => item.questions)
              .filter(
                (question) => question.category !== "experience.visual-style",
              ).length;
          entry.interpretationResponses =
            Number(entry.interpretationResponses) + 1;
        })().catch(() => {
          observationFailed = true;
        }),
      );
      return;
    }
    if (url.origin !== new URL(controlPlaneUrl("/")).origin) return;
    const kind = /^\/product\/requirements\/[^/]+\/choices$/u.test(path)
      ? "choose"
      : /^\/product\/requirements\/[^/]+\/apply$/u.test(path)
        ? "apply"
        : /\/application-graphs\/[^/]+\/published-revisions$/u.test(path)
          ? "publish"
          : path === "/compilations"
            ? "compile"
            : /\/compilations\/[^/]+\/verification-runs$/u.test(path)
              ? "verify"
              : /\/compilations\/[^/]+\/preview-runs$/u.test(path)
                ? "preview"
                : null;
    if (!kind) return;
    calls[kind]++;
    pending.push(
      (async () => {
        if (!response.ok()) throw new Error();
        const body = object(await response.json());
        if (kind === "choose") {
          if (
            object(response.request().postDataJSON()).alternativeKey !==
            "standard"
          )
            throw new Error();
          choiceReviewId = decodeURIComponent(path.split("/")[3]!);
          if (!safeIdentity(choiceReviewId)) throw new Error();
        } else if (kind === "apply") {
          const review = object(body.review),
            draft = object(body.draftRevision);
          if (
            !safeIdentity(review.applicationGraphId) ||
            !safeIdentity(draft.id)
          )
            throw new Error();
          applied = {
            applicationGraphId: review.applicationGraphId,
            draftRevisionId: draft.id,
            reviewId: decodeURIComponent(path.split("/")[3]!),
          };
          if (!safeIdentity(applied.reviewId)) throw new Error();
        } else if (kind === "compile") {
          if (!safeIdentity(body.id)) throw new Error();
          ownedId = body.id;
          remember(ownedId);
          evidence.compilationId = ownedId;
          compilation = body;
        } else if (kind === "preview") {
          // Capture cleanup authority before any later readiness/identity assertion.
          const requestedId = decodeURIComponent(path.split("/")[2]!);
          started = ownedConsumerPreview(body, requestedId);
          remember(requestedId, started);
          evidence.previewRunId = started.id;
        } else if (kind === "publish") {
          if (
            !safeIdentity(body.id) ||
            !safeIdentity(body.applicationGraphId) ||
            body.applicationGraphId !== decodeURIComponent(path.split("/")[2]!)
          )
            throw new Error();
          published = body;
          evidence.publishedRevisionId = body.id;
        } else {
          if (
            !safeIdentity(body.verificationRunId) ||
            body.compilationId !== decodeURIComponent(path.split("/")[2]!)
          )
            throw new Error();
          verification = body;
        }
      })().catch(() => {
        observationFailed = true;
      }),
    );
  };
  const healthyObservation = () => {
    if (observationFailed || Object.values(calls).some((count) => count > 1))
      throw new Error("Consumer lifecycle observation failed or duplicated.");
  };
  const waitFor = async (observed: () => boolean, timeout: number) => {
    await expect
      .poll(
        () => {
          healthyObservation();
          return observed();
        },
        { timeout },
      )
      .toBe(true);
  };
  page.on("request", observeRequest);
  page.on("response", observe);
  try {
    await page
      .getByRole("button", { name: "Create product", exact: true })
      .click();
    phase("publish");
    await waitFor(() => published !== undefined, 300_000);
    await waitFor(
      () => applied !== undefined && choiceReviewId !== undefined,
      30_000,
    );
    if (
      applied!.reviewId !== choiceReviewId ||
      published!.applicationGraphId !== applied!.applicationGraphId ||
      published!.sourceDraftRevisionId !== applied!.draftRevisionId
    )
      throw new Error(
        "Consumer Published revision did not match the applied Draft.",
      );
    evidence.applied = applied;
    phase("compile");
    await waitFor(() => compilation !== undefined, 60_000);
    const id = ownedId!;
    assertConsumerCompilation(published!, compilation!);
    evidence.publishedRevisionId = published!.id;
    evidence.inputGraphHash = published!.graphHash;
    evidence.compositionLockHash = published!.compositionLockHash;
    const compilationDeadline = Date.now() + 315_000;
    let observation = compilationObservation(compilation);
    evidence.compilationObservation = observation;
    await expect
      .poll(
        async () => {
          healthyObservation();
          const remainingMs = compilationDeadline - Date.now();
          if (remainingMs <= 0) return false;
          const response = await request.get(
            controlPlaneUrl(`/compilations/${encodeURIComponent(id)}`),
            { timeout: Math.min(10_000, remainingMs) },
          );
          expect(response.ok()).toBe(true);
          const body = object(await response.json());
          if (body.id !== id)
            throw new Error("Consumer Compilation identity mismatch.");
          assertConsumerCompilation(published!, body);
          observation = compilationObservation(body);
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
    await waitFor(() => verification !== undefined, 60_000);
    if (verification!.compilationId !== id)
      throw new Error("Consumer verification ownership mismatch.");
    const verificationId = String(verification!.verificationRunId);
    let verified: Json | undefined;
    await expect
      .poll(
        async () => {
          healthyObservation();
          const response = await request.get(
            controlPlaneUrl(
              "/verification-runs/" + encodeURIComponent(verificationId),
            ),
          );
          expect(response.ok()).toBe(true);
          verified = object(await response.json());
          return ["succeeded", "failed", "cancelled"].includes(
            String(verified.status),
          );
        },
        { timeout: 910_000 },
      )
      .toBe(true);
    evidence.verificationStepCount = verifiedConsumerEvidence(
      verified,
      id,
      verificationId,
    );
    evidence.verificationRunId = verificationId;
    evidence.verificationPassed = true;
    phase("preview");
    await waitFor(() => started !== undefined, 60_000);
    ownedConsumerPreview(started, id);
    let preview: OwnedPreview | null = null;
    await expect
      .poll(
        async () => {
          healthyObservation();
          const current = await currentPreview(request, id);
          if (current) {
            preview = ownedConsumerPreview(current, id);
            remember(id, preview);
          }
          return preview?.status;
        },
        { timeout: 300_000 },
      )
      .toBe("ready");
    const result = preview as unknown as OwnedPreview;
    expect(result.id).toBe(started!.id);
    if (
      typeof result.previewUrl !== "string" ||
      !/^http:\/\/(?:127\.0\.0\.1|localhost):\d+\/?$/u.test(result.previewUrl)
    )
      throw new Error("Consumer Preview did not expose a ready loopback URL.");
    const delivery = page.getByRole("region", {
      name: familyLabel + " delivery",
      exact: true,
    });
    await expect(delivery.getByRole("status")).toHaveText(
      `Your local ${familyLabel} app is ready.`,
    );
    const openApp = delivery.getByRole("link", {
      name: "Open local app",
      exact: true,
    });
    await expect(openApp).toBeVisible();
    expect((await openApp.getAttribute("href")) === result.previewUrl).toBe(
      true,
    );
    await ready(request, result.previewUrl!);
    completed = true;
    return result;
  } finally {
    entry.machineWaitMs = Date.now() - Number(entry.startedAtMs);
    try {
      const measured = await page.evaluate(() =>
        (
          window as unknown as {
            __consumerEntryObservation: () => {
              actions: string[];
              materialAnswers: number;
            };
          }
        ).__consumerEntryObservation(),
      );
      Object.assign(entry, consumerEntryActions(measured.actions), {
        materialAnswers: measured.materialAnswers,
      });
      entry.status = completed ? "ready-observed" : "failed";
    } catch {
      entry.status = "observation-failed";
      observationFailed = true;
    }
    // Navigation stops the client, not a server-side create already in flight.
    if (!completed) await page.goto("about:blank").catch(() => undefined);
    await Promise.all(pending);
    if (!completed && previewAttempted)
      evidence.consumerOwnershipRecovery = "cleanup-required";
    if (!completed && ownedId) {
      try {
        const response = await request.get(
          controlPlaneUrl(
            `/compilations/${encodeURIComponent(ownedId)}/preview-runs/current`,
          ),
          { timeout: 10_000 },
        );
        if (!response.ok()) throw new Error();
        const text = await response.text();
        const current: unknown = text.trim() ? JSON.parse(text) : null;
        evidence.consumerOwnershipRecovery = reconcileConsumerPreviewAttempt(
          ownedId,
          previewAttempted,
          current ?? started,
          remember,
        );
      } catch {
        evidence.consumerOwnershipRecovery = "cleanup-required";
      }
    }
    page.off("response", observe);
    page.off("request", observeRequest);
    await Promise.all(pending);
    entry.lifecycleResponses = calls;
    if (completed) {
      healthyObservation();
      expect(calls).toEqual({
        choose: 1,
        apply: 1,
        publish: 1,
        compile: 1,
        verify: 1,
        preview: 1,
      });
      expect(entry).toMatchObject({
        interpretationResponses: 1,
        businessSubmissions: 1,
        materialQuestions: 0,
        materialAnswers: 0,
        materialAnswerSubmissions: 0,
        technicalActions: 0,
        viewNavigation: 0,
        retries: 0,
        otherActions: 0,
      });
    }
  }
}
