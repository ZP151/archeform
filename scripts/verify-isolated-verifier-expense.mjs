#!/usr/bin/env node
/**
 * Docker-backed acceptance for the isolated verifier (Task 6).
 *
 * Exercises the full loop against real infrastructure: a deterministic
 * Published Revision is seeded into PostgreSQL, the Compilation is created
 * through the real Control Plane API and compiled by the Worker (which
 * records the immutable artifact manifest), the Control Plane queues one
 * verification run, the Worker re-compiles the immutable input, boots the
 * generated application as an isolated Docker preview, runs the six bounded
 * probes against it, reports one evidence bundle, and the run reaches a
 * terminal status with the allowlisted evidence persisted.
 *
 * Safety properties of this record:
 * - The generated application, Graph, and probe requests are exercised but
 *   never persisted by diagnosis or verification; only the allowlisted
 *   evidence bundle, its digest, and the bounded status are stored.
 * - All credentials are synthetic Factory tokens generated per run; nothing
 *   real is read, written, or retained.
 * - The Compose project is the dedicated `factory-pilot` infra stack
 *   (postgres + redis only); `docker compose down` restores the environment
 *   without removing volumes.
 *
 * Usage: pnpm verify:isolated-verifier-expense
 * Requires: Docker daemon running, ports 5432/6379/3000 free, node >= 22.
 */
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  composeDefaultCapabilityDraft,
  createCapabilityCompositionLock,
} from "../packages/capabilities/dist/index.js";
import {
  hashApplicationGraph,
  parseApplicationGraph,
} from "../packages/graph/dist/index.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { PrismaClient } = require(
  resolve(repoRoot, "apps/control-plane/node_modules/@prisma/client"),
);

const WORKSPACE_SLUG = "isolated-verifier-acceptance";
const GRAPH_KEY = "expense-approval";
const PUBLISHED_REVISION_ID = "published-expense-approval-1";
const VERIFICATION_RUN_ID = "verify-expense-acceptance-1";
const PROFILE_KEY = "expense-approval";
const POSTGRES_PORT = process.env.FACTORY_POSTGRES_PORT ?? "5432";
const REDIS_PORT = "6379";
const CONTROL_PLANE_PORT = "3000";
const DATABASE_URL = `postgresql://factory:factory@127.0.0.1:${POSTGRES_PORT}/factory_pilot?schema=public`;
const REDIS_URL = `redis://127.0.0.1:${REDIS_PORT}`;
const CONTROL_PLANE_URL = `http://127.0.0.1:${CONTROL_PLANE_PORT}`;
const TOKEN = `factory-${randomBytes(9).toString("hex")}`;
const REDIS_PASSWORD = `factory-${randomBytes(9).toString("hex")}`;

// The Prisma client resolves env("DATABASE_URL") from this process's own
// environment, not from the per-command env dicts passed to runSync.
process.env.DATABASE_URL = DATABASE_URL;

const children = new Set();
const fail = (message) => {
  throw new Error(message);
};

function assert(condition, message) {
  if (!condition) fail(message);
}

function runSync(label, command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, ...(options.env ?? {}) },
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) {
    const tail = (result.stdout + result.stderr)
      .split(/\r?\n/)
      .filter((line) => line.length > 0)
      .slice(-15)
      .join("\n");
    fail(`${label} failed.\n${tail}`);
  }
  return result.stdout;
}

function spawnChild(label, command, args, env) {
  const child = spawn(command, args, {
    cwd: repoRoot,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, ...env },
  });
  children.add(child);
  let output = "";
  const attach = (stream) => {
    stream.on("data", (chunk) => {
      output += chunk.toString("utf8");
      // Bounded ring buffer: never retain more than the tail for diagnostics.
      if (output.length > 32 * 1024) output = output.slice(-32 * 1024);
    });
  };
  attach(child.stdout);
  attach(child.stderr);
  child.on("exit", () => children.delete(child));
  return {
    child,
    output: () => output,
    waitForLine: (needle, timeoutMs) =>
      new Promise((resolvePromise, reject) => {
        const deadline = Date.now() + timeoutMs;
        const check = () => {
          if (output.includes(needle)) resolvePromise();
          else if (Date.now() > deadline)
            reject(new Error(`${label} did not report: ${needle}`));
          else setTimeout(check, 250);
        };
        check();
      }),
  };
}

async function waitForHttp(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.status === 200) return;
    } catch {
      // not up yet
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
  }
  fail(`HTTP endpoint did not become ready: ${url}`);
}

function workerTail(...children) {
  // Last lines of each spawned child's captured output, for failure messages.
  return children
    .map((child) =>
      child
        .output()
        .split(/\r?\n/)
        .filter((line) => line.length > 0)
        .slice(-25)
        .join("\n"),
    )
    .filter((tail) => tail.length > 0)
    .join("\n---\n");
}

function composeArgs(...extra) {
  // The infra compose file list must be split into separate argv tokens;
  // passing the joined string as one "-f" value makes docker read a file
  // named "-f <path> -f <path>".
  return ["compose", ...COMPOSE_FILE.split(" "), ...extra];
}

async function waitForComposeService(service, timeoutMs, env) {
  const deadline = Date.now() + timeoutMs;
  let lastProbe;
  while (Date.now() < deadline) {
    lastProbe = spawnSync("docker", composeArgs("ps", "-q", service), {
      encoding: "utf8",
      env: { ...process.env, ...env },
    });
    if (lastProbe.status === 0 && lastProbe.stdout.trim().length > 0) {
      // Service container exists; probe readiness per service below.
      return;
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
  }
  // Surface the docker diagnostics so a recurrence is self-diagnosing
  // instead of a blind 120s timeout.
  const psAll = spawnSync("docker", composeArgs("ps", "-a"), {
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
  const stderrTail = (lastProbe.stderr ?? "")
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
    .slice(-6)
    .join("\n");
  const psTable = (psAll.stdout ?? "").split(/\r?\n/).slice(0, 12).join("\n");
  fail(
    `Compose service did not start: ${service}\n` +
      (stderrTail ? `last poll stderr:\n${stderrTail}\n` : "") +
      (psTable ? `compose ps -a:\n${psTable}` : ""),
  );
}

let artifactRoot;
let overrideFile;
let COMPOSE_FILE;

async function main() {
  // ---- Preflight --------------------------------------------------------
  const dockerInfo = spawnSync("docker", ["info"], { encoding: "utf8" });
  assert(dockerInfo.status === 0, "The Docker daemon is not reachable.");
  // The run ids here are constants, so the preview and generated-tests
  // project names are stable across runs. A crashed prior run's containers
  // must not be silently adopted by this one.
  const stalePreview = spawnSync(
    "docker",
    [
      "ps",
      "-a",
      "--filter",
      "name=^factory-(preview|generated-tests)-",
      "--format",
      "{{.Names}}",
    ],
    { encoding: "utf8" },
  );
  assert(
    stalePreview.status === 0 && stalePreview.stdout.trim().length === 0,
    "Stale preview or generated-tests containers exist before the run.",
  );
  runSync("worker build", "pnpm", [
    "--filter",
    "@factory/compiler-worker",
    "build",
  ]);
  runSync("control plane build", "pnpm", [
    "--filter",
    "@factory/control-plane",
    "build",
  ]);

  // ---- Infrastructure: postgres + redis only ----------------------------
  artifactRoot = await mkdtemp(join(tmpdir(), "factory-verifier-artifacts-"));
  const infrastructureDir = await mkdtemp(
    join(tmpdir(), "factory-verifier-infra-"),
  );
  overrideFile = join(infrastructureDir, "redis-ports.yml");
  await writeFile(
    overrideFile,
    'services:\n  redis:\n    ports:\n      - "127.0.0.1:6379:6379"\n',
    "utf8",
  );
  COMPOSE_FILE = [
    "-f",
    resolve(repoRoot, "infra/docker-compose.yml"),
    "-f",
    overrideFile,
  ].join(" ");
  const composeEnv = {
    FACTORY_REDIS_PASSWORD: REDIS_PASSWORD,
    FACTORY_INTERNAL_WORKER_TOKEN: TOKEN,
  };
  runSync(
    "infrastructure start",
    "docker",
    [
      "compose",
      "--env-file",
      ".env",
      ...COMPOSE_FILE.split(" "),
      "up",
      "-d",
      "postgres",
      "redis",
    ],
    { env: composeEnv },
  );
  // Postgres: wait for the container, then pg_isready inside it.
  await waitForComposeService("postgres", 120_000, composeEnv);
  const postgresReady = await new Promise((resolvePromise) => {
    const deadline = Date.now() + 120_000;
    const check = () => {
      const probe = spawnSync(
        "docker",
        [
          "compose",
          ...COMPOSE_FILE.split(" "),
          "exec",
          "-T",
          "postgres",
          "pg_isready",
          "-U",
          "factory",
          "-d",
          "factory_pilot",
        ],
        { encoding: "utf8", env: { ...process.env, ...composeEnv } },
      );
      if (probe.status === 0) resolvePromise(true);
      else if (Date.now() > deadline) resolvePromise(false);
      else setTimeout(check, 1_000);
    };
    check();
  });
  assert(postgresReady, "PostgreSQL did not become ready.");
  // Redis: ping with the generated password.
  const redisReady = await new Promise((resolvePromise) => {
    const deadline = Date.now() + 120_000;
    const check = () => {
      const probe = spawnSync(
        "docker",
        [
          "compose",
          ...COMPOSE_FILE.split(" "),
          "exec",
          "-T",
          "redis",
          "redis-cli",
          "-a",
          REDIS_PASSWORD,
          "ping",
        ],
        { encoding: "utf8", env: { ...process.env, ...composeEnv } },
      );
      if (probe.status === 0 && probe.stdout.trim() === "PONG")
        resolvePromise(true);
      else if (Date.now() > deadline) resolvePromise(false);
      else setTimeout(check, 1_000);
    };
    check();
  });
  assert(redisReady, "Redis did not become ready.");

  // ---- Schema + deterministic seed --------------------------------------
  runSync(
    "prisma db push",
    "pnpm",
    [
      "--filter",
      "@factory/control-plane",
      "exec",
      "prisma",
      "db",
      "push",
      "--skip-generate",
    ],
    { env: { DATABASE_URL } },
  );

  const draft = composeDefaultCapabilityDraft({ profile: PROFILE_KEY });
  const selections = draft.graph.integration.compositionSelections;
  const graph = structuredClone(draft.graph);
  delete graph.integration.compositionSelections;
  graph.domain.seedData = [
    {
      entity: "expense",
      id: "expense-fixture-01",
      values: { amount: "125.50", description: "Team lunch", status: "draft" },
    },
  ];
  const draftGraphHash = hashApplicationGraph(graph);
  const compositionLock = createCapabilityCompositionLock({
    graphChecksum: draftGraphHash,
    selections,
  });

  const prisma = new PrismaClient();
  try {
    const workspace = await prisma.workspace.upsert({
      where: { slug: WORKSPACE_SLUG },
      update: {},
      create: { slug: WORKSPACE_SLUG, name: "Isolated Verifier Acceptance" },
    });
    const applicationGraph = await prisma.applicationGraph.upsert({
      where: { workspaceId_key: { workspaceId: workspace.id, key: GRAPH_KEY } },
      update: {},
      create: {
        workspaceId: workspace.id,
        key: GRAPH_KEY,
        name: "Expense Approval",
      },
    });
    await prisma.draftRevision.upsert({
      where: {
        applicationGraphId_revisionNumber: {
          applicationGraphId: applicationGraph.id,
          revisionNumber: 1,
        },
      },
      update: { graph },
      create: {
        applicationGraphId: applicationGraph.id,
        revisionNumber: 1,
        graph,
      },
    });
    await prisma.publishedRevision.upsert({
      where: { id: PUBLISHED_REVISION_ID },
      update: {
        graph,
        graphHash: draftGraphHash,
        compositionLock,
        compositionLockHash: compositionLock.lockDigest,
      },
      create: {
        id: PUBLISHED_REVISION_ID,
        applicationGraphId: applicationGraph.id,
        sourceDraftRevisionId: (
          await prisma.draftRevision.findUniqueOrThrow({
            where: {
              applicationGraphId_revisionNumber: {
                applicationGraphId: applicationGraph.id,
                revisionNumber: 1,
              },
            },
          })
        ).id,
        revisionNumber: 1,
        graph,
        graphHash: draftGraphHash,
        compositionLock,
        compositionLockHash: compositionLock.lockDigest,
        publishedAt: new Date(),
      },
    });
    // The stored Graph and Composition Lock must be transform-consistent with
    // what the Control Plane computes before enqueueing: parseApplicationGraph
    // rebuilds the Graph in canonical order and the Composition Lock is
    // re-derived from the stored packages. jsonb key reordering means the
    // hashable values must be derived from the row read back from the
    // database, not from the in-memory draft.
    const storedRevision = await prisma.publishedRevision.findUniqueOrThrow({
      where: { id: PUBLISHED_REVISION_ID },
    });
    const parsedGraph = parseApplicationGraph(storedRevision.graph);
    const graphHash = hashApplicationGraph(parsedGraph);
    const canonicalLock = createCapabilityCompositionLock({
      graphChecksum: graphHash,
      selections: storedRevision.compositionLock.packages,
    });
    await prisma.publishedRevision.update({
      where: { id: PUBLISHED_REVISION_ID },
      data: {
        graph: parsedGraph,
        graphHash,
        compositionLock: canonicalLock,
        compositionLockHash: canonicalLock.lockDigest,
      },
    });
    // The Compilation itself is created through the real API below so the
    // artifact manifest is recorded by the same Worker that verifies it.
    // Prior acceptance runs of the same identity would otherwise be returned
    // by the idempotent branch as stale pending rows; the seed starts fresh.
    const priorCompilations = await prisma.compilation.findMany({
      where: { publishedRevisionId: PUBLISHED_REVISION_ID },
      select: { id: true },
    });
    const priorIds = priorCompilations.map((compilation) => compilation.id);
    if (priorIds.length > 0) {
      await prisma.verificationRun.deleteMany({
        where: { compilationId: { in: priorIds } },
      });
      await prisma.artifact.deleteMany({
        where: { compilationId: { in: priorIds } },
      });
      await prisma.compilation.deleteMany({
        where: { id: { in: priorIds } },
      });
    }
  } finally {
    await prisma.$disconnect();
  }

  // ---- Control Plane + Worker on the host -------------------------------
  const appEnv = {
    DATABASE_URL,
    REDIS_URL,
    FACTORY_REDIS_PASSWORD: REDIS_PASSWORD,
    FACTORY_INTERNAL_WORKER_TOKEN: TOKEN,
    FACTORY_ARTIFACT_ROOT: artifactRoot,
    PORT: CONTROL_PLANE_PORT,
    OPENAI_MODEL: "gpt-5",
  };
  const controlPlane = spawnChild(
    "control plane",
    process.execPath,
    ["apps/control-plane/dist/main.js"],
    appEnv,
  );
  await waitForHttp(`${CONTROL_PLANE_URL}/health`, 120_000);

  const worker = spawnChild(
    "worker",
    process.execPath,
    ["apps/compiler-worker/dist/main.js"],
    {
      ...appEnv,
      FACTORY_CONTROL_PLANE_URL: CONTROL_PLANE_URL,
      FACTORY_PREVIEW_OPERATION_TIMEOUT_MS: "1200000",
    },
  );
  await worker.waitForLine("compiler worker ready", 120_000);
  await worker.waitForLine("verification worker ready", 120_000);

  // ---- Create the compilation through the real pipeline -------------------
  // The Worker compiles the published revision and records the immutable
  // artifact manifest; the compilation must reach "succeeded" before any run
  // can be created for it. The queued job carries exactly the transformed
  // Graph and canonical Composition Lock derived above, so the artifacts the
  // verification Worker later re-derives match the manifest by construction.
  const compileResponse = await fetch(`${CONTROL_PLANE_URL}/compilations`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      publishedRevisionId: PUBLISHED_REVISION_ID,
      target: PROFILE_KEY,
      compilerVersion: "0.1.0",
    }),
  });
  assert(
    compileResponse.status === 201,
    `Create compilation: ${compileResponse.status}`,
  );
  const compilation = await compileResponse.json();
  const COMPILATION_ID = compilation.id;
  const compileDeadline = Date.now() + 3 * 60 * 1_000;
  let compileResult;
  for (;;) {
    const statusResponse = await fetch(
      `${CONTROL_PLANE_URL}/compilations/${COMPILATION_ID}`,
    );
    assert(
      statusResponse.status === 200,
      `Get compilation: ${statusResponse.status}`,
    );
    const statusBody = await statusResponse.json();
    compileResult = statusBody.result;
    if (compileResult?.status === "succeeded") break;
    if (Date.now() > compileDeadline) {
      console.error(workerTail(worker, controlPlane));
      fail(
        `Compilation did not reach succeeded (result: ${JSON.stringify(compileResult)}).`,
      );
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 2_000));
  }
  assert(
    Number.isInteger(compileResult.artifactCount) &&
      compileResult.artifactCount > 0,
    `Compilation succeeded with no recorded artifacts: ${JSON.stringify(compileResult)}`,
  );

  // ---- Create the verification run ---------------------------------------
  const createResponse = await fetch(
    `${CONTROL_PLANE_URL}/compilations/${COMPILATION_ID}/verification-runs`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        verificationRunId: VERIFICATION_RUN_ID,
        profileKey: PROFILE_KEY,
      }),
    },
  );
  assert(
    createResponse.status === 201,
    `Create verification run: ${createResponse.status}`,
  );

  // ---- Wait for the terminal run -----------------------------------------
  // The configured preview operation timeout bounds each lifecycle operation
  // (boot, each probe, cleanup) separately, so a bounded but slow lifecycle can
  // legitimately take tens of minutes. The poll window must exceed the worst
  // bounded case (boot + cleanup + per-step timeouts) or the harness would tear
  // down a still-working worker and misreport the run as stuck. With the
  // per-operation timeout at 20 minutes and eight sequential operations, the
  // worst bounded case is 160 minutes, so the window is 180.
  let run;
  const deadline = Date.now() + 180 * 60 * 1_000;
  let lastProgressLine = 0;
  for (;;) {
    const response = await fetch(
      `${CONTROL_PLANE_URL}/verification-runs/${VERIFICATION_RUN_ID}`,
    );
    assert(response.status === 200, `Get verification run: ${response.status}`);
    run = await response.json();
    if (["succeeded", "failed", "cancelled"].includes(run.status)) break;
    if (Date.now() > deadline) {
      // A stuck run means the queue job stalled or failed silently; the
      // worker's captured output is the fastest way to see where. Print it
      // directly: pnpm truncates multi-line error messages to their first
      // line.
      console.error(workerTail(worker, controlPlane));
      fail("Verification run did not reach a terminal status.");
    }
    const elapsedMinutes = Math.floor(
      (Date.now() - (deadline - 60 * 60 * 1_000)) / 60_000,
    );
    if (elapsedMinutes > lastProgressLine) {
      lastProgressLine = elapsedMinutes;
      console.error(
        `verification run still pending after ${elapsedMinutes} min (status ${run.status})`,
      );
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 5_000));
  }

  // ---- Assertions ---------------------------------------------------------
  // A terminal failure is the exact evidence this harness exists to surface:
  // print the bounded step record and the worker's captured output before the
  // assertions discard them (the infrastructure is torn down on exit).
  if (run.status !== "succeeded") {
    console.error(
      `Run ${run.status} evidence: ${JSON.stringify(run.evidence?.steps ?? run, null, 2)}`,
    );
    console.error(workerTail(worker, controlPlane));
  }
  const expectedStepIds = [
    "migration",
    "health",
    "employee-creates-expense",
    "employee-submits-expense",
    "manager-approves-expense",
    "employee-denied-approval",
    "cleanup",
  ];
  assert(run.status === "succeeded", `Verification run status: ${run.status}`);
  assert(
    JSON.stringify(run.stepIds) === JSON.stringify(expectedStepIds),
    `Unexpected stepIds: ${JSON.stringify(run.stepIds)}`,
  );
  assert(
    /^sha256:[a-f0-9]{64}$/.test(run.evidenceDigest),
    "Evidence digest shape is invalid.",
  );
  const steps = run.evidence.steps;
  assert(
    steps.every((step) => step.status === "passed"),
    "Not every step passed.",
  );
  const statusOf = (stepId) =>
    steps.find((step) => step.stepId === stepId)?.httpStatus;
  assert(
    statusOf("employee-creates-expense") === 201,
    "Create journey status is not 201.",
  );
  assert(
    statusOf("employee-submits-expense") === 403,
    "Idempotency replay status is not 403.",
  );
  assert(
    statusOf("manager-approves-expense") === 201,
    "Approve journey status is not 201.",
  );
  assert(
    statusOf("employee-denied-approval") === 403,
    "Authorization denial status is not 403.",
  );
  assert(
    run.evidence.cleanup.succeeded === true,
    "Preview cleanup did not succeed.",
  );
  assert(run.diagnosis === null, "A passing run must not persist a diagnosis.");

  // The isolated preview project must be fully removed after the run: no
  // containers and no project volumes may remain.
  const previewProject = `factory-preview-preview-${VERIFICATION_RUN_ID}`;
  const leftovers = spawnSync(
    "docker",
    [
      "ps",
      "-a",
      "--filter",
      `name=${previewProject}`,
      "--format",
      "{{.Names}}",
    ],
    { encoding: "utf8" },
  );
  assert(
    leftovers.status === 0 && leftovers.stdout.trim().length === 0,
    "Preview containers remain after cleanup.",
  );
  const leftoverVolumes = spawnSync(
    "docker",
    [
      "volume",
      "ls",
      "--filter",
      `name=${previewProject}`,
      "--format",
      "{{.Name}}",
    ],
    { encoding: "utf8" },
  );
  assert(
    leftoverVolumes.status === 0 && leftoverVolumes.stdout.trim().length === 0,
    "Preview volumes remain after cleanup.",
  );

  // ---- Idempotent retry: the same identity returns the same terminal run --
  const retryResponse = await fetch(
    `${CONTROL_PLANE_URL}/compilations/${COMPILATION_ID}/verification-runs`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        verificationRunId: VERIFICATION_RUN_ID,
        profileKey: PROFILE_KEY,
      }),
    },
  );
  assert(
    retryResponse.status === 201,
    `Idempotent retry: ${retryResponse.status}`,
  );
  const retried = await retryResponse.json();
  assert(
    retried.verificationRunId === run.verificationRunId,
    "Retry returned a different run identity.",
  );
  assert(
    retried.evidenceDigest === run.evidenceDigest,
    "Retry returned different evidence.",
  );

  // ---- Generated-app tests: the profile's own journey suite --------------
  // The worker materialized the immutable bundle into the artifact root; boot
  // that exact source as a fresh preview (images are cached, so this is fast),
  // inject the generated journey test into the api image, and run it against
  // the generated database. The api image is built from the bundle without the
  // test directory (`COPY src ./src` only), so the injection creates it.
  const generatedDirectory = join(
    artifactRoot,
    "expense-approval-published-expense-approval-1",
  );
  const generatedProject = `factory-generated-tests-${VERIFICATION_RUN_ID}`;
  let testResult;
  try {
    runSync("generated preview start", "docker", [
      "compose",
      "--file",
      join(generatedDirectory, "docker-compose.yml"),
      "--project-name",
      generatedProject,
      "up",
      "--build",
      "--detach",
      "--wait",
      "--wait-timeout",
      "900",
    ]);
    const journeyTest = join(
      generatedDirectory,
      "api",
      "test",
      "journey.generated.test.ts",
    );
    testResult = spawnSync(
      "docker",
      [
        "compose",
        "--file",
        join(generatedDirectory, "docker-compose.yml"),
        "--project-name",
        generatedProject,
        "exec",
        "-T",
        "api",
        "sh",
        "-c",
        "mkdir -p /app/test && cat > /app/test/journey.generated.test.ts && pnpm test",
      ],
      {
        cwd: repoRoot,
        encoding: "utf8",
        env: { ...process.env },
        maxBuffer: 64 * 1024 * 1024,
        input: await readFile(journeyTest, "utf8"),
      },
    );
  } finally {
    // The generated-test preview must not leak even if the boot or the
    // injection fails mid-way.
    spawnSync(
      "docker",
      [
        "compose",
        "--file",
        join(generatedDirectory, "docker-compose.yml"),
        "--project-name",
        generatedProject,
        "down",
        "--volumes",
      ],
      { stdio: "ignore" },
    );
  }
  const generatedLeftovers = spawnSync(
    "docker",
    [
      "ps",
      "-a",
      "--filter",
      `name=${generatedProject}`,
      "--format",
      "{{.Names}}",
    ],
    { encoding: "utf8" },
  );
  assert(
    generatedLeftovers.status === 0 &&
      generatedLeftovers.stdout.trim().length === 0,
    "Generated-tests containers remain after teardown.",
  );
  if (testResult !== undefined && testResult.status !== 0) {
    // Surface the bounded tail of the in-container test run; the preview is
    // already torn down, so this output is the only trace of the failure.
    const output = `${testResult.stdout ?? ""}${testResult.stderr ?? ""}`
      .trim()
      .slice(-8000);
    console.error(
      `Generated journey test output:\n${output || "(no output captured)"}`,
    );
  }
  assert(testResult.status === 0, "Generated journey tests failed.");

  console.log(
    JSON.stringify(
      {
        status: run.status,
        stepIds: run.stepIds,
        evidenceDigest: run.evidenceDigest,
        compilationId: COMPILATION_ID,
        compilationDigest: run.evidence.compilationDigest,
        profileKey: run.profileKey,
        previewCleanup: true,
        idempotentRetry: true,
        generatedTests: "passed",
        infra: "postgres+redis in Docker, control plane+worker on host",
      },
      null,
      2,
    ),
  );
}

async function teardown() {
  for (const child of children) {
    try {
      child.kill("SIGTERM");
    } catch {
      // already gone
    }
  }
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 2_000));
  for (const child of children) {
    try {
      child.kill("SIGKILL");
    } catch {
      // already gone
    }
  }
  if (COMPOSE_FILE) {
    spawnSync("docker", ["compose", ...COMPOSE_FILE.split(" "), "down"], {
      cwd: repoRoot,
      stdio: "ignore",
      env: {
        ...process.env,
        FACTORY_REDIS_PASSWORD: REDIS_PASSWORD,
        FACTORY_INTERNAL_WORKER_TOKEN: TOKEN,
      },
    });
  }
  if (artifactRoot) await rm(artifactRoot, { recursive: true, force: true });
}

try {
  await main();
} catch (error) {
  console.error(`verify-isolated-verifier-expense: ${error.message}`);
  process.exitCode = 1;
} finally {
  await teardown();
}
