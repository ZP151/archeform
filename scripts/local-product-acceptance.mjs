import { spawn } from "node:child_process";
import { randomBytes as nodeRandomBytes } from "node:crypto";
import { createServer } from "node:net";
import { pathToFileURL } from "node:url";

const outputLimit = 1_048_576;
const ansiPattern = /\u001b\[[0-?]*[ -/]*[@-~]/gu;
const evidencePrefix = "FACTORY_ACCEPTANCE_EVIDENCE ";
const stagePrefix = "FACTORY_ACCEPTANCE_STAGE ";
const cleanupStagePrefix = "FACTORY_ACCEPTANCE_CLEANUP_STAGE ";
const acceptanceStages = new Set([
  "template-entry",
  "template-start",
  "template-opened",
  "template-preview-ready",
  "template-menu-selected",
  "template-menu-editor",
  "template-title-saved",
  "publish",
  "compile",
  "verify",
  "workbench-accessibility",
  "preview-start",
  "customer-page-created",
  "customer-root",
  "customer-dish",
  "customer-item-response",
  "customer-item-added",
  "customer-cart",
  "customer-checkout",
  "customer-payment-response",
  "customer-checkout-reloaded",
  "customer-orders",
  "customer-paid",
  "merchant-denial",
  "generated-accessibility",
  "evidence",
]);
const cleanupStages = new Set([
  "start",
  "page-closed",
  "stop",
  "stopped",
  "resource-proof",
  "resources-removed",
]);
const digestPattern = /^sha256:[a-f0-9]{64}$/u;
const minimumComposeVersion = [2, 24, 4];
const loopbackComposeOverride = `services:
  postgres:
    ports: !override
      - "127.0.0.1:\${FACTORY_POSTGRES_PORT:-5432}:5432"
  redis:
    ports: !override
      - "127.0.0.1:\${FACTORY_REDIS_PORT:-6379}:6379"
  control-plane:
    ports: !override
      - "127.0.0.1:\${FACTORY_CONTROL_PLANE_PORT:-3000}:3000"
  workbench:
    ports: !override
      - "127.0.0.1:\${FACTORY_WORKBENCH_PORT:-5174}:5174"
`;
const composePrefix = (projectName) => [
  "compose",
  "-p",
  projectName,
  "--env-file",
  ".env",
  "-f",
  "infra/docker-compose.yml",
  "-f",
  "-",
];

function appendBounded(current, chunk) {
  if (current.length >= outputLimit) return current;
  return `${current}${chunk.toString("utf8")}`.slice(0, outputLimit);
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function endpointReady(url, signal, fetchImpl) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timeout = setTimeout(abort, 2_000);
  signal.addEventListener("abort", abort, { once: true });
  try {
    const response = await fetchImpl(url, {
      redirect: "manual",
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener("abort", abort);
  }
}

export async function waitForHostReadiness(
  urls,
  {
    signal,
    fetchImpl = fetch,
    timeoutMilliseconds = 120_000,
    retryMilliseconds = 250,
  },
) {
  const deadline = Date.now() + timeoutMilliseconds;
  while (!signal.aborted && Date.now() < deadline) {
    const ready = await Promise.all(
      urls.map((url) => endpointReady(url, signal, fetchImpl)),
    );
    if (ready.every(Boolean)) return true;
    await delay(retryMilliseconds);
  }
  return false;
}

function processGroupExists(processId) {
  try {
    process.kill(-processId, 0);
    return true;
  } catch (error) {
    return error?.code !== "ESRCH";
  }
}

async function waitForProcessGroupExit(processId, timeoutMilliseconds) {
  const deadline = Date.now() + timeoutMilliseconds;
  while (Date.now() < deadline) {
    if (!processGroupExists(processId)) return true;
    await delay(25);
  }
  return !processGroupExists(processId);
}

async function terminateUnixProcessGroup(processId) {
  try {
    process.kill(-processId, "SIGTERM");
  } catch (error) {
    if (error?.code === "ESRCH") return true;
    return false;
  }
  if (await waitForProcessGroupExit(processId, 1_000)) return true;
  try {
    process.kill(-processId, "SIGKILL");
  } catch (error) {
    if (error?.code === "ESRCH") return true;
    return false;
  }
  return await waitForProcessGroupExit(processId, 1_000);
}

async function terminateWindowsProcessTree(processId) {
  return await new Promise((resolve) => {
    const killer = spawn(
      "taskkill.exe",
      ["/pid", String(processId), "/T", "/F"],
      {
        shell: false,
        stdio: "ignore",
        windowsHide: true,
      },
    );
    killer.once("error", () => resolve(false));
    killer.once("close", (code) => resolve(code === 0));
  });
}

export async function executeCommand(
  command,
  args,
  {
    environment,
    signal,
    input = "",
    cwd = process.cwd(),
    platform = process.platform,
  },
) {
  return await new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      detached: platform !== "win32",
      env: environment,
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    let aborted = false;
    let closeResult;
    let termination;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", abort);
      resolve(result);
    };
    const completeIfReady = () => {
      if (settled || closeResult === undefined) return;
      if (!aborted) {
        finish(closeResult);
        return;
      }
      void (termination ?? Promise.resolve(false)).then((terminated) => {
        finish({
          ...closeResult,
          exitCode:
            terminated && closeResult.exitCode !== 0 ? closeResult.exitCode : 1,
        });
      });
    };
    const abort = () => {
      if (aborted) return;
      aborted = true;
      termination =
        child.pid === undefined
          ? Promise.resolve(false)
          : platform === "win32"
            ? terminateWindowsProcessTree(child.pid)
            : terminateUnixProcessGroup(child.pid);
      completeIfReady();
    };
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
    child.stdin.on("error", () => {});
    child.stdin.end(input);
    child.stdout.on("data", (chunk) => {
      stdout = appendBounded(stdout, chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr = appendBounded(stderr, chunk);
    });
    child.once("error", () => {
      closeResult = { exitCode: 1, stderr: "", stdout: "" };
      completeIfReady();
    });
    child.once("close", (code) => {
      closeResult = { exitCode: code ?? 1, stderr, stdout };
      completeIfReady();
    });
  });
}

function installSignalHandler(handler) {
  const onInterrupt = () => handler("SIGINT");
  const onTerminate = () => handler("SIGTERM");
  process.once("SIGINT", onInterrupt);
  process.once("SIGTERM", onTerminate);
  return () => {
    process.removeListener("SIGINT", onInterrupt);
    process.removeListener("SIGTERM", onTerminate);
  };
}

async function reserveLoopbackPorts() {
  const servers = [];
  const ports = [];
  const close = async (server) => {
    if (!server.listening) return;
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  };
  try {
    for (let index = 0; index < 4; index += 1) {
      const server = createServer();
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolve);
      });
      const address = server.address();
      if (typeof address === "string" || address === null) {
        throw new Error("Unable to reserve a loopback port.");
      }
      servers.push(server);
      ports.push(address.port);
    }
  } catch (error) {
    await Promise.allSettled(servers.map(close));
    throw error;
  }
  let released = false;
  return {
    ports,
    release: async () => {
      if (released) return;
      released = true;
      await Promise.all(servers.map(close));
    },
  };
}

function safeSecret(randomBytes) {
  return randomBytes(18).toString("base64url");
}

function versionAtLeast(version, minimum) {
  for (let index = 0; index < minimum.length; index += 1) {
    if (version[index] > minimum[index]) return true;
    if (version[index] < minimum[index]) return false;
  }
  return true;
}

function createChildEnvironment(environment, projectName, ports, secrets) {
  const childEnvironment = { ...environment };
  delete childEnvironment.OPENAI_MODEL;
  return {
    ...childEnvironment,
    FACTORY_FIXTURE_MODE: "",
    FACTORY_CONTROL_PLANE_PORT: String(ports.controlPlane),
    FACTORY_E2E_BASE_URL: `http://127.0.0.1:${ports.workbench}`,
    FACTORY_E2E_CONTROL_PLANE_URL: `http://127.0.0.1:${ports.controlPlane}`,
    FACTORY_E2E_FACTORY_PROJECT: projectName,
    FACTORY_E2E_ISOLATED: "1",
    FACTORY_INTERNAL_WORKER_TOKEN: secrets.workerToken,
    OPENAI_API_KEY: "",
    FACTORY_POSTGRES_PORT: String(ports.postgres),
    FACTORY_PUBLIC_CONTROL_PLANE_URL: `http://127.0.0.1:${ports.controlPlane}`,
    FACTORY_REDIS_PASSWORD: secrets.redisPassword,
    FACTORY_REDIS_PORT: String(ports.redis),
    FACTORY_WORKBENCH_PORT: String(ports.workbench),
    RESTAURANT_DEMO_TABLE_TOKEN: secrets.tableToken,
  };
}

export async function createRunInputs({
  environment = process.env,
  randomBytes = nodeRandomBytes,
  reservePorts = reserveLoopbackPorts,
} = {}) {
  const reservation = await reservePorts();
  if (!Array.isArray(reservation.ports) || reservation.ports.length !== 4) {
    await reservation.release?.();
    throw new Error("Exactly four loopback ports are required.");
  }
  if (new Set(reservation.ports).size !== 4) {
    await reservation.release?.();
    throw new Error("Reserved loopback ports must be unique.");
  }
  const projectName = `factory-local-${randomBytes(18).toString("hex")}`;
  const ports = {
    postgres: reservation.ports[0],
    redis: reservation.ports[1],
    controlPlane: reservation.ports[2],
    workbench: reservation.ports[3],
  };
  const secrets = {
    redisPassword: safeSecret(randomBytes),
    workerToken: safeSecret(randomBytes),
    tableToken: safeSecret(randomBytes),
  };
  return {
    environment: createChildEnvironment(
      environment,
      projectName,
      ports,
      secrets,
    ),
    ports,
    projectName,
    releasePorts: reservation.release,
    secrets,
  };
}

function parseDoctorVersions(stdout) {
  const node = /^PASS node: v(\d+\.\d+\.\d+)$/mu.exec(stdout)?.[1];
  const pnpm = /^PASS pnpm: (\d+\.\d+\.\d+)$/mu.exec(stdout)?.[1];
  const compose = /^PASS docker-compose: v?(\d+\.\d+\.\d+)$/mu.exec(
    stdout,
  )?.[1];
  const composeParts = compose?.split(".").map(Number);
  const composeSupported =
    composeParts !== undefined &&
    composeParts.length === minimumComposeVersion.length &&
    composeParts.every(Number.isInteger) &&
    versionAtLeast(composeParts, minimumComposeVersion);
  return node && pnpm && composeSupported ? { node, pnpm } : null;
}

function parseEvidence(stdout) {
  const marker = stdout
    .replace(ansiPattern, "")
    .split(/\r?\n/u)
    .find((line) => line.includes(evidencePrefix));
  if (!marker) return null;
  try {
    const markerIndex = marker.indexOf(evidencePrefix);
    const parsed = JSON.parse(
      marker.slice(markerIndex + evidencePrefix.length).trim(),
    );
    const accessibility = parsed?.accessibility;
    const cleanup = parsed?.cleanup;
    const digests = parsed?.digests;
    const counts = [
      accessibility?.generatedDesktop,
      accessibility?.generatedNarrow,
      accessibility?.workbenchDesktop,
      accessibility?.workbenchNarrow,
    ];
    if (!counts.every((value) => value === 0)) {
      return null;
    }
    if (
      !digestPattern.test(digests?.publishedRevision ?? "") ||
      !digestPattern.test(digests?.compilation ?? "") ||
      cleanup?.previewDirectories !== 0
    ) {
      return null;
    }
    return {
      accessibility: {
        generatedDesktop: accessibility.generatedDesktop,
        generatedNarrow: accessibility.generatedNarrow,
        workbenchDesktop: accessibility.workbenchDesktop,
        workbenchNarrow: accessibility.workbenchNarrow,
      },
      digests: {
        compilation: digests.compilation,
        publishedRevision: digests.publishedRevision,
      },
      cleanup: { previewDirectories: 0 },
    };
  } catch {
    return null;
  }
}

function parseLastAllowlistedMarker(stdout, prefix, allowlist) {
  let lastStage = null;
  for (const line of stdout.replace(ansiPattern, "").split(/\r?\n/u)) {
    const markerIndex = line.indexOf(prefix);
    if (markerIndex === -1) continue;
    const stage = line.slice(markerIndex + prefix.length).trim();
    if (allowlist.has(stage)) lastStage = stage;
  }
  return lastStage;
}

function outputCount(stdout) {
  return stdout.split(/\r?\n/u).filter((line) => line.trim() !== "").length;
}

function hasExactLoopbackBindings(stdout, ports) {
  try {
    const services = JSON.parse(stdout)?.services;
    const expected = {
      "control-plane": { published: ports.controlPlane, target: 3000 },
      postgres: { published: ports.postgres, target: 5432 },
      redis: { published: ports.redis, target: 6379 },
      workbench: { published: ports.workbench, target: 5174 },
    };
    return Object.entries(expected).every(([service, binding]) => {
      const published = services?.[service]?.ports;
      return (
        Array.isArray(published) &&
        published.length === 1 &&
        published[0]?.host_ip === "127.0.0.1" &&
        published[0]?.protocol === "tcp" &&
        published[0]?.target === binding.target &&
        published[0]?.published === String(binding.published)
      );
    });
  } catch {
    return false;
  }
}

export async function runLocalProductAcceptance({
  environment = process.env,
  installSignalHandler: registerSignalHandler = installSignalHandler,
  platform = process.platform,
  randomBytes = nodeRandomBytes,
  reservePorts = reserveLoopbackPorts,
  runCommand = executeCommand,
  waitForReady = waitForHostReadiness,
  windowsCommand = process.env.ComSpec ?? "cmd.exe",
  writeOutput = (value) => process.stdout.write(value),
} = {}) {
  const inputs = await createRunInputs({
    environment,
    randomBytes,
    reservePorts,
  });
  const controller = new AbortController();
  let interrupted = false;
  let portsReleased = false;
  let composeAttempted = false;
  let failed = false;
  let versions = null;
  let acceptanceEvidence = null;
  let cleanupStage = null;
  let failureStage = null;
  const steps = [];
  const cleanup = {
    containers: -1,
    networks: -1,
    previewDirectories: -1,
    volumes: -1,
  };
  const releasePorts = async () => {
    if (portsReleased) return;
    portsReleased = true;
    await inputs.releasePorts();
  };
  const unregister = registerSignalHandler(() => {
    interrupted = true;
    controller.abort();
  });
  const runStep = async (
    name,
    command,
    args,
    { abortable = true, input = "" } = {},
  ) => {
    let result;
    try {
      result = await runCommand(command, args, {
        environment: inputs.environment,
        input,
        signal: abortable ? controller.signal : undefined,
      });
    } catch {
      result = { exitCode: 1, stderr: "", stdout: "" };
    }
    const exitCode = Number.isInteger(result?.exitCode) ? result.exitCode : 1;
    steps.push({ exitCode, name });
    return {
      exitCode,
      stdout: typeof result?.stdout === "string" ? result.stdout : "",
    };
  };
  const composeArgs = composePrefix(inputs.projectName);
  try {
    const doctor = await runStep("doctor", "node", [
      "scripts/doctor.mjs",
      "local",
    ]);
    versions =
      doctor.exitCode === 0 ? parseDoctorVersions(doctor.stdout) : null;
    if (doctor.exitCode !== 0 || versions === null || interrupted) {
      failed = true;
      return 1;
    }

    const preGuard = await runStep("preview-guard-before", "node", [
      "scripts/verify-no-preview-resources.mjs",
    ]);
    if (preGuard.exitCode !== 0 || interrupted) {
      failed = true;
      return 1;
    }

    const composeConfig = await runStep(
      "compose-config",
      "docker",
      [...composeArgs, "config", "--format", "json"],
      { input: loopbackComposeOverride },
    );
    if (
      composeConfig.exitCode !== 0 ||
      !hasExactLoopbackBindings(composeConfig.stdout, inputs.ports) ||
      interrupted
    ) {
      failed = true;
      return 1;
    }

    await releasePorts();
    composeAttempted = true;
    const up = await runStep(
      "compose-up",
      "docker",
      [
        ...composeArgs,
        "up",
        "-d",
        "--build",
        "--wait",
        "--wait-timeout",
        "600",
      ],
      { input: loopbackComposeOverride },
    );
    if (up.exitCode !== 0 || interrupted) {
      failed = true;
    } else {
      const ready = await waitForReady(
        [
          inputs.environment.FACTORY_E2E_BASE_URL,
          `${inputs.environment.FACTORY_E2E_CONTROL_PLANE_URL}/health`,
        ],
        { signal: controller.signal },
      );
      steps.push({ exitCode: ready ? 0 : 1, name: "host-readiness" });
      if (!ready || interrupted) {
        failed = true;
        return 1;
      }
      const playwrightArguments = [
        "exec",
        "playwright",
        "test",
        "e2e/restaurant-template-acceptance.spec.ts",
        "--workers=1",
        "--reporter=line",
      ];
      const playwright = await runStep(
        "playwright",
        platform === "win32" ? windowsCommand : "pnpm",
        platform === "win32"
          ? ["/d", "/s", "/c", "pnpm", ...playwrightArguments]
          : playwrightArguments,
      );
      failureStage =
        playwright.exitCode === 0
          ? null
          : parseLastAllowlistedMarker(
              playwright.stdout,
              stagePrefix,
              acceptanceStages,
            );
      cleanupStage =
        playwright.exitCode === 0
          ? null
          : parseLastAllowlistedMarker(
              playwright.stdout,
              cleanupStagePrefix,
              cleanupStages,
            );
      acceptanceEvidence =
        playwright.exitCode === 0 ? parseEvidence(playwright.stdout) : null;
      if (acceptanceEvidence !== null) {
        cleanup.previewDirectories =
          acceptanceEvidence.cleanup.previewDirectories;
      }
      if (
        playwright.exitCode !== 0 ||
        acceptanceEvidence === null ||
        interrupted
      ) {
        failed = true;
      }
    }
  } finally {
    await releasePorts().catch(() => {
      failed = true;
    });
    if (composeAttempted) {
      const down = await runStep(
        "compose-down",
        "docker",
        [...composeArgs, "down", "--volumes", "--remove-orphans"],
        { abortable: false, input: loopbackComposeOverride },
      );
      if (down.exitCode !== 0) failed = true;

      const postGuard = await runStep(
        "preview-guard-after",
        "node",
        ["scripts/verify-no-preview-resources.mjs"],
        { abortable: false },
      );
      if (postGuard.exitCode !== 0) failed = true;

      for (const [kind, args] of [
        [
          "containers",
          [
            "ps",
            "-a",
            "--filter",
            `label=com.docker.compose.project=${inputs.projectName}`,
            "--format",
            "{{.ID}}",
          ],
        ],
        [
          "networks",
          [
            "network",
            "ls",
            "--filter",
            `label=com.docker.compose.project=${inputs.projectName}`,
            "--format",
            "{{.ID}}",
          ],
        ],
        [
          "volumes",
          [
            "volume",
            "ls",
            "--filter",
            `label=com.docker.compose.project=${inputs.projectName}`,
            "--format",
            "{{.Name}}",
          ],
        ],
      ]) {
        const query = await runStep(`cleanup-${kind}`, "docker", args, {
          abortable: false,
        });
        cleanup[kind] = query.exitCode === 0 ? outputCount(query.stdout) : -1;
        if (query.exitCode !== 0 || cleanup[kind] !== 0) failed = true;
      }
    }
    unregister();
    const report = {
      accessibility: acceptanceEvidence?.accessibility ?? null,
      cleanup,
      cleanupStage,
      digests: acceptanceEvidence?.digests ?? null,
      failureStage,
      projectName: inputs.projectName,
      schemaVersion: "factory.local-acceptance-summary/v1",
      steps,
      versions,
    };
    writeOutput(`${JSON.stringify(report)}\n`);
  }
  return failed || interrupted ? 1 : 0;
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  process.exitCode = await runLocalProductAcceptance();
}
