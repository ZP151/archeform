import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import {
  access,
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  readdir,
  rm,
  symlink,
  utimes,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { describe, it } from "node:test";

import {
  acquireLocalAcceptanceOperationLease,
  cleanupExactPreownedPreview,
  createLocalAcceptanceSupervisorReady,
  createLocalAcceptanceSupervisorIpcSession,
  createLocalAcceptanceWorkloadResult,
  validateLocalAcceptanceSupervisorMessage,
  createLocalPreviewLease,
  createRunInputs,
  executeCommand,
  fetchWithDeadline,
  runLocalProductAcceptance,
  runLocalProductAcceptanceWorkload,
  runLocalAcceptanceClient,
  runLocalAcceptanceSupervisor,
  waitForHostReadiness,
} from "./local-product-acceptance.mjs";
import {
  composeSentinelAbsent,
  gateMessage as nativeHarnessGateMessage,
  isPosixAcceptanceCommand,
  minimalDockerEnvironment,
  parseArguments as parseNativeHarnessArguments,
  parseWindowsLauncherRoot,
  privateAcceptanceRootsAbsent,
} from "./local-product-acceptance-interruption-harness.mjs";

const ports = [41_001, 41_002, 41_003, 41_004];
const callerSecret = "caller-secret-sentinel";
const stderrSecret = "stderr-secret-sentinel";
const evidence = {
  accessibility: {
    generatedDesktop: 0,
    generatedNarrow: 0,
    workbenchDesktop: 0,
    workbenchNarrow: 0,
  },
  digests: {
    compilation: `sha256:${"b".repeat(64)}`,
    publishedRevision: `sha256:${"a".repeat(64)}`,
  },
  cleanup: { previewDirectories: 0 },
};

async function waitForCondition(predicate, timeoutMilliseconds = 1_000) {
  const deadline = Date.now() + timeoutMilliseconds;
  while (!predicate() && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
  assert.equal(predicate(), true);
}

function commandKey(command, args) {
  if (command === "node" && args[0] === "scripts/doctor.mjs") {
    return "doctor";
  }
  if (
    command === "node" &&
    args[0] === "scripts/verify-no-preview-resources.mjs"
  ) {
    return "preview-guard";
  }
  if (
    command === "docker" &&
    args[0] === "compose" &&
    args.includes("config")
  ) {
    return "compose-config";
  }
  if (command === "docker" && args[0] === "compose" && args.includes("up")) {
    return "compose-up";
  }
  if (
    (command === "pnpm" && args[0] === "exec" && args[1] === "playwright") ||
    (args[0] === "/d" &&
      args[1] === "/s" &&
      args[2] === "/c" &&
      args[3] === "pnpm" &&
      args[4] === "exec" &&
      args[5] === "playwright")
  ) {
    return "playwright";
  }
  if (command === "docker" && args[0] === "compose" && args.includes("down")) {
    return "compose-down";
  }
  if (command === "docker" && args[0] === "inspect") {
    return "preview-worker-image";
  }
  if (command === "docker" && args[0] === "stop") {
    return "outer-service-stop";
  }
  if (command === "docker" && args[0] === "run") {
    return "preview-helper";
  }
  if (command === "docker" && args[0] === "rm") {
    return "preview-container-remove";
  }
  if (
    command === "docker" &&
    args[0] === "ps" &&
    args.includes("label=com.docker.compose.service=control-plane")
  ) {
    return "outer-control-plane-container";
  }
  if (
    command === "docker" &&
    args[0] === "ps" &&
    args.includes("label=com.docker.compose.service=compiler-worker")
  ) {
    return "preview-worker-container";
  }
  if (command === "docker" && args[0] === "exec") {
    return args.some(
      (argument) =>
        typeof argument === "string" && argument.includes("existsSync"),
    )
      ? "preview-directory-after-stop"
      : "preview-directory-before-stop";
  }
  if (command === "docker" && args[0] === "ps") return "cleanup-container";
  if (command === "docker" && args[0] === "network") {
    return "cleanup-network";
  }
  if (command === "docker" && args[0] === "volume") {
    if (args.includes("label=com.docker.compose.volume=factory-artifacts")) {
      return "outer-artifacts-volume";
    }
    return "cleanup-volume";
  }
  throw new Error(`Unexpected command: ${command} ${args.join(" ")}`);
}

function successfulResult(
  key,
  acceptanceEvidence,
  decorateEvidence = false,
  composeConfig,
  doctorComposeVersion,
) {
  if (key === "doctor") {
    return {
      exitCode: 0,
      stderr: stderrSecret,
      stdout: `PASS node: v22.11.0\nPASS pnpm: 9.0.0\nPASS docker-compose: ${doctorComposeVersion}\n`,
    };
  }
  if (key === "playwright") {
    const marker = `FACTORY_ACCEPTANCE_EVIDENCE ${JSON.stringify(acceptanceEvidence)}`;
    return {
      exitCode: 0,
      stderr: stderrSecret,
      stdout: decorateEvidence
        ? `\u001b[2K${marker}\u001b[0m\n`
        : `${marker}\n`,
    };
  }
  if (key === "compose-config") {
    return {
      exitCode: 0,
      stderr: stderrSecret,
      stdout: JSON.stringify(composeConfig),
    };
  }
  if (key === "preview-worker-container") {
    return { exitCode: 0, stderr: stderrSecret, stdout: "abcdef012345\n" };
  }
  if (key === "preview-worker-image") {
    return {
      exitCode: 0,
      stderr: stderrSecret,
      stdout: `sha256:${"c".repeat(64)}\n`,
    };
  }
  if (key === "outer-control-plane-container") {
    return { exitCode: 0, stderr: stderrSecret, stdout: "bcdef0123456\n" };
  }
  if (key === "outer-artifacts-volume") {
    return {
      exitCode: 0,
      stderr: stderrSecret,
      stdout: "factory-local-test_factory-artifacts\n",
    };
  }
  return { exitCode: 0, stderr: stderrSecret, stdout: "" };
}

function scenario({
  fail = undefined,
  failureStdout = undefined,
  failureStage = undefined,
  interruptAt = undefined,
  platform = "linux",
  playwrightEvidence = evidence,
  ready = true,
  decorateEvidence = false,
  doctorComposeVersion = "5.3.1",
  onPlaywright = undefined,
  previewFetch = undefined,
  composeConfig = {
    services: Object.fromEntries(
      [
        ["postgres", 5432, ports[0]],
        ["redis", 6379, ports[1]],
        ["control-plane", 3000, ports[2]],
        ["workbench", 5174, ports[3]],
      ].map(([name, target, published]) => [
        name,
        {
          ports: [
            {
              host_ip: "127.0.0.1",
              protocol: "tcp",
              published: String(published),
              target,
            },
          ],
        },
      ]),
    ),
  },
} = {}) {
  const calls = [];
  const childEnvironments = [];
  const output = [];
  let releaseCount = 0;
  let signalHandler;
  let activePreviewRunId = "preview-1";
  let controlPlaneStopped = false;
  let workerStopped = false;
  const readinessCalls = [];

  const dependencies = {
    cleanupWait: async () => {},
    environment: {
      CALLER_SECRET: callerSecret,
      FACTORY_FIXTURE_MODE: "1",
      OPENAI_API_KEY: "provider-secret-sentinel",
      PATH: process.env.PATH,
    },
    installSignalHandler: (handler) => {
      signalHandler = handler;
      return () => {
        signalHandler = undefined;
      };
    },
    platform,
    randomBytes: (() => {
      let fill = 1;
      return (size) => Buffer.alloc(size, fill++);
    })(),
    reservePorts: async () => ({
      ports,
      release: async () => {
        releaseCount += 1;
      },
    }),
    runCommand: async (command, args, options) => {
      const key = commandKey(command, args);
      calls.push({
        args,
        command,
        environment: options.environment,
        key,
        signalAborted: options.signal?.aborted ?? false,
        stdin: options.input,
        timeoutMilliseconds: options.timeoutMilliseconds,
      });
      childEnvironments.push(options.environment);
      if (key === "outer-service-stop") {
        controlPlaneStopped ||= args.includes("bcdef0123456");
        workerStopped ||= args.includes("abcdef012345");
      }
      if (key === interruptAt) signalHandler?.("SIGINT");
      if (key === fail) {
        return {
          exitCode: 17,
          stderr: stderrSecret,
          stdout:
            failureStdout ??
            (failureStage ? `FACTORY_ACCEPTANCE_STAGE ${failureStage}\n` : ""),
        };
      }
      if (key === "playwright" && !options.signal?.aborted) {
        if (onPlaywright) {
          await onPlaywright(options.environment);
        } else {
          const { writeFile } = await import("node:fs/promises");
          await writeFile(
            options.environment.FACTORY_E2E_PREVIEW_REQUEST_PATH,
            "compilation-1\n",
            { encoding: "utf8", flag: "wx" },
          );
        }
        await waitForLease(options.environment.FACTORY_E2E_PREVIEW_LEASE_PATH);
      }
      if (key === "preview-worker-container" && workerStopped) {
        return { exitCode: 0, stderr: "", stdout: "" };
      }
      if (key === "outer-control-plane-container" && controlPlaneStopped) {
        return { exitCode: 0, stderr: "", stdout: "" };
      }
      return successfulResult(
        key,
        playwrightEvidence,
        decorateEvidence,
        composeConfig,
        doctorComposeVersion,
      );
    },
    windowsCommand: "C:\\Windows\\System32\\cmd.exe",
    waitForReady: async (urls, options) => {
      readinessCalls.push({ signalAborted: options.signal.aborted, urls });
      return ready;
    },
    previewFetch:
      previewFetch ??
      (async (url, options = {}) => {
        if (options.method === "POST") {
          if (url.includes("/internal/compilations/")) {
            const intent = JSON.parse(options.body);
            activePreviewRunId = intent.previewRunId;
            return new Response(
              JSON.stringify({
                apiVersion: "factory.local-preview-intent/v1",
                compilationId: "compilation-1",
                composeProjectName: `factory-preview-${activePreviewRunId}`,
                previewRunId: activePreviewRunId,
                status: "starting",
              }),
              { status: 200 },
            );
          }
          return new Response(
            JSON.stringify({
              compilationId: "compilation-1",
              composeProjectName: `factory-preview-${activePreviewRunId}`,
              id: activePreviewRunId,
              status: url.includes("/stop") ? "stopping" : "starting",
            }),
            { status: 200 },
          );
        }
        if (url.includes("/preview-runs/current")) {
          return new Response(
            JSON.stringify({
              compilationId: "compilation-1",
              composeProjectName: `factory-preview-${activePreviewRunId}`,
              id: activePreviewRunId,
              status: "stopped",
            }),
            { status: 200 },
          );
        }
        return new Response(
          JSON.stringify({
            id: "compilation-1",
            result: { status: "succeeded" },
          }),
          { status: 200 },
        );
      }),
    writeOutput: (value) => output.push(value),
  };

  return {
    calls,
    childEnvironments,
    dependencies,
    output,
    readinessCalls,
    releaseCount: () => releaseCount,
  };
}

function keys(calls) {
  return calls.map((call) => call.key);
}

async function waitForLease(path) {
  const { readFile } = await import("node:fs/promises");
  const deadline = Date.now() + 1_000;
  while (Date.now() < deadline) {
    try {
      JSON.parse(await readFile(path, "utf8"));
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  }
  throw new Error("Runner did not publish a preview lease.");
}

function composeCalls(calls, operation) {
  return calls.filter(
    (call) => call.command === "docker" && call.args.includes(operation),
  );
}

const interruptionWindows = [
  "before-start-request",
  "after-enqueue-before-response",
  "during-compose-startup",
  "after-response-before-readiness",
  "after-readiness",
];

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function directoryCount(path) {
  try {
    return (await readdir(path)).length;
  } catch (error) {
    if (error?.code === "ENOENT") return 0;
    throw error;
  }
}

async function waitForText(path, expected) {
  const deadline = Date.now() + 2_000;
  while (Date.now() < deadline) {
    try {
      if ((await readFile(path, "utf8")).trim() === expected) return;
    } catch {
      // The child has not published this phase yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error(`Timed out waiting for ${expected}.`);
}

function interruptedChildProgram(window) {
  return [
    "const { access, writeFile } = require('node:fs/promises');",
    "const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));",
    "const waitForever = () => new Promise(() => setInterval(() => {}, 1_000));",
    "const phase = process.env.FACTORY_INTERRUPT_PHASE_PATH;",
    "const request = process.env.FACTORY_E2E_PREVIEW_REQUEST_PATH;",
    "const lease = process.env.FACTORY_E2E_PREVIEW_LEASE_PATH;",
    "async function hasLease() { try { await access(lease); return true; } catch { return false; } }",
    "async function main() {",
    "  await writeFile(phase, 'child-started\\n', 'utf8');",
    window === "before-start-request"
      ? "  await waitForever();"
      : "  await writeFile(request, 'compilation-1\\n', { encoding: 'utf8', flag: 'wx' });",
    window === "before-start-request"
      ? ""
      : "  while (!(await hasLease())) await delay(5);",
    window === "after-response-before-readiness"
      ? "  await writeFile(phase, 'lease-published\\n', 'utf8');"
      : "",
    window === "after-readiness"
      ? "  await writeFile(phase, 'preview-ready\\n', 'utf8');"
      : "",
    "  await waitForever();",
    "}",
    "main().catch(() => process.exitCode = 1);",
  ]
    .filter(Boolean)
    .join(" ");
}

function composeConfigForHarness() {
  return {
    services: Object.fromEntries(
      [
        ["postgres", 5432, ports[0]],
        ["redis", 6379, ports[1]],
        ["control-plane", 3000, ports[2]],
        ["workbench", 5174, ports[3]],
      ].map(([name, target, published]) => [
        name,
        {
          ports: [
            {
              host_ip: "127.0.0.1",
              protocol: "tcp",
              published: String(published),
              target,
            },
          ],
        },
      ]),
    ),
  };
}

async function runRealChildInterruptionCase({
  signal = "SIGINT",
  overrideMutation = undefined,
  window,
}) {
  const resourceRoot = await mkdtemp(
    join(tmpdir(), "factory-local-interruption-harness-"),
  );
  const phasePath = join(resourceRoot, "child.phase");
  const resource = (scope, kind) => join(resourceRoot, scope, kind);
  const previewDirectory = join(
    resourceRoot,
    "preview-directories",
    "preview-1",
  );
  const previewScopes = ["containers", "networks", "volumes"];
  const outerScopes = ["containers", "networks", "volumes"];
  const calls = [];
  const childResults = [];
  const output = [];
  let signalHandler;
  let signalCount = 0;
  let overrideRoot;
  let previewStarted = false;
  let previewStopped = false;
  let activePreviewRunId;
  let controlPlaneStopped = false;
  let workerStopped = false;
  let requestPath;
  let mutationFailure;

  const createResources = async (scope, kinds) => {
    await Promise.all(
      kinds.map((kind) =>
        mkdir(join(resourceRoot, scope, kind, "owned"), {
          recursive: true,
        }),
      ),
    );
  };
  const removeResources = async (scope) => {
    await rm(join(resourceRoot, scope), { force: true, recursive: true });
  };
  const resourceCount = async (scope, kind) =>
    directoryCount(resource(scope, kind));
  const allResourcesGone = async () => {
    const counts = await Promise.all([
      directoryCount(previewDirectory),
      ...previewScopes.map((kind) => resourceCount("preview", kind)),
      ...outerScopes.map((kind) => resourceCount("outer", kind)),
    ]);
    return counts.every((count) => count === 0);
  };
  const interrupt = () => {
    signalCount += 1;
    signalHandler?.(signal);
  };
  const zeroResult = (scope, kind) =>
    resourceCount(scope, kind).then((count) => ({
      exitCode: 0,
      stderr: "",
      stdout: count === 0 ? "" : "owned-resource\n".repeat(count),
    }));
  const mutateOverride = async (path) => {
    if (overrideMutation === "mutate") {
      await writeFile(path, "services: {}\n", "utf8");
      return;
    }
    if (overrideMutation === "delete") {
      await rm(path, { force: true });
      return;
    }
    if (overrideMutation === "symlink") {
      const root = dirname(path);
      await writeFile(
        join(resourceRoot, "compose.override.yml"),
        "services: {}\n",
        "utf8",
      );
      await rm(root, { force: true, recursive: true });
      await symlink(
        resourceRoot,
        root,
        process.platform === "win32" ? "junction" : "dir",
      );
    }
  };

  try {
    const exitCode = await runLocalProductAcceptance({
      environment: { PATH: process.env.PATH },
      installSignalHandler: (handler) => {
        signalHandler = handler;
        return () => {
          signalHandler = undefined;
        };
      },
      platform: process.platform,
      previewFetch: async (url, options = {}) => {
        if (options.method === "POST" && url.includes("/preview-runs")) {
          if (url.includes("/stop")) {
            assert.equal(
              url,
              `http://127.0.0.1:41003/preview-runs/${activePreviewRunId}/stop`,
            );
            assert.equal(previewStarted, true);
            await rm(previewDirectory, { force: true, recursive: true });
            await removeResources("preview");
            previewStopped = true;
            return new Response("{}", { status: 200 });
          }
          assert.match(url, /\/compilations\/compilation-1\/preview-runs$/u);
          assert.ok(requestPath);
          const requestEntry = await lstat(requestPath);
          assert.equal(requestEntry.isFile(), true);
          assert.equal(requestEntry.isSymbolicLink(), false);
          assert.equal(await readFile(requestPath, "utf8"), "compilation-1\n");
          const intent = JSON.parse(options.body);
          activePreviewRunId = intent.previewRunId;
          await createResources("preview", previewScopes);
          await mkdir(previewDirectory, { recursive: true });
          previewStarted = true;
          if (window === "after-enqueue-before-response") interrupt();
          return new Response(
            JSON.stringify({
              apiVersion: "factory.local-preview-intent/v1",
              compilationId: "compilation-1",
              composeProjectName: `factory-preview-${activePreviewRunId}`,
              previewRunId: activePreviewRunId,
              status: "starting",
            }),
            { status: 200 },
          );
        }
        if (url.includes("/preview-runs/current")) {
          return new Response(
            JSON.stringify({
              compilationId: "compilation-1",
              composeProjectName: `factory-preview-${activePreviewRunId}`,
              id: activePreviewRunId,
              status: previewStopped ? "stopped" : "ready",
            }),
            { status: 200 },
          );
        }
        return new Response(
          JSON.stringify({
            id: "compilation-1",
            result: { status: "succeeded" },
          }),
          { status: 200 },
        );
      },
      randomBytes: (() => {
        let value = 32;
        return (size) => Buffer.alloc(size, value++);
      })(),
      reservePorts: async () => ({ ports, release: async () => {} }),
      runCommand: async (command, args, options) => {
        const key = commandKey(command, args);
        calls.push({ args, command, key });
        if (key === "doctor") {
          return successfulResult(
            key,
            evidence,
            false,
            composeConfigForHarness(),
            "5.3.1",
          );
        }
        if (key === "preview-guard") {
          return {
            exitCode: (await allResourcesGone()) ? 0 : 1,
            stderr: "",
            stdout: "",
          };
        }
        if (key === "compose-config") {
          const index = args.lastIndexOf("-f");
          overrideRoot = dirname(args[index + 1]);
          return successfulResult(
            key,
            evidence,
            false,
            composeConfigForHarness(),
            "5.3.1",
          );
        }
        if (key === "compose-up") {
          await createResources("outer", outerScopes);
          if (window === "during-compose-startup" || overrideMutation) {
            try {
              await mutateOverride(args[args.lastIndexOf("-f") + 1]);
            } catch (error) {
              mutationFailure =
                error instanceof Error ? error.message : String(error);
              throw error;
            }
            interrupt();
          }
          return { exitCode: 0, stderr: "", stdout: "" };
        }
        if (key === "playwright") {
          requestPath = options.environment.FACTORY_E2E_PREVIEW_REQUEST_PATH;
          const child = executeCommand(
            process.execPath,
            ["-e", interruptedChildProgram(window)],
            {
              environment: {
                ...options.environment,
                FACTORY_INTERRUPT_PHASE_PATH: phasePath,
              },
              signal: options.signal,
            },
          );
          if (window === "before-start-request") {
            await waitForText(phasePath, "child-started");
            interrupt();
          }
          if (window === "after-response-before-readiness") {
            await waitForText(phasePath, "lease-published");
            interrupt();
          }
          if (window === "after-readiness") {
            await waitForText(phasePath, "preview-ready");
            interrupt();
          }
          const result = await child;
          childResults.push(result);
          return result;
        }
        if (key === "preview-worker-container") {
          return {
            exitCode: 0,
            stderr: "",
            stdout: workerStopped ? "" : "abcdef012345\n",
          };
        }
        if (key === "preview-worker-image") {
          return {
            exitCode: 0,
            stderr: "",
            stdout: `sha256:${"c".repeat(64)}\n`,
          };
        }
        if (key === "outer-control-plane-container") {
          return {
            exitCode: 0,
            stderr: "",
            stdout: controlPlaneStopped ? "" : "bcdef0123456\n",
          };
        }
        if (key === "outer-service-stop") {
          controlPlaneStopped ||= args.includes("bcdef0123456");
          workerStopped ||= args.includes("abcdef012345");
          return { exitCode: 0, stderr: "", stdout: "" };
        }
        if (key === "outer-artifacts-volume") {
          return {
            exitCode: 0,
            stderr: "",
            stdout: "factory-local-harness_factory-artifacts\n",
          };
        }
        if (key === "preview-helper") {
          return { exitCode: 0, stderr: "", stdout: "" };
        }
        if (key === "preview-directory-before-stop") {
          assert.equal(await exists(previewDirectory), true);
          return { exitCode: 0, stderr: "", stdout: "" };
        }
        if (key === "preview-directory-after-stop") {
          assert.equal(await exists(previewDirectory), false);
          return { exitCode: 0, stderr: "", stdout: "" };
        }
        if (key === "compose-down") {
          await removeResources("outer");
          return { exitCode: 0, stderr: "", stdout: "" };
        }
        if (
          key === "cleanup-container" ||
          key === "cleanup-network" ||
          key === "cleanup-volume"
        ) {
          if (
            key === "cleanup-container" &&
            args.includes(
              "label=factory.archeform.helper=factory.local-acceptance-helper/v1",
            )
          ) {
            return { exitCode: 0, stderr: "", stdout: "" };
          }
          const kind = key.slice("cleanup-".length);
          const scope = args.includes(
            `label=com.docker.compose.project=factory-preview-${activePreviewRunId}`,
          )
            ? "preview"
            : "outer";
          return zeroResult(
            scope,
            kind === "container" ? "containers" : `${kind}s`,
          );
        }
        throw new Error(`Unexpected command: ${command} ${args.join(" ")}`);
      },
      waitForReady: async () => true,
      windowsCommand: process.env.ComSpec ?? "cmd.exe",
      writeOutput: (value) => output.push(value),
    });

    assert.equal(exitCode, 1);
    assert.equal(
      signalCount,
      1,
      JSON.stringify({
        calls: calls.map((call) => call.key),
        mutationFailure,
        overrideMutation,
        previewStarted,
        window,
      }),
    );
    assert.equal(await allResourcesGone(), true);
    assert.equal(previewStopped, previewStarted);
    assert.ok(overrideRoot);
    assert.equal(await exists(overrideRoot), overrideMutation === "symlink");
    assert.equal(
      (await readdir(dirname(overrideRoot))).filter((entry) =>
        entry.startsWith(`${basename(overrideRoot)}.remove-`),
      ).length,
      0,
    );
    for (const result of childResults) assert.notEqual(result.exitCode, 0);
    assert.match(output.join(""), /"containers":0/u);
    assert.match(output.join(""), /"networks":0/u);
    assert.match(output.join(""), /"volumes":0/u);

    const projectName = calls.find((call) => call.key === "compose-config")
      ?.args[2];
    const cleanupKeys = calls.map((call) => call.key);
    const previewCleanupStart = cleanupKeys.indexOf("preview-worker-container");
    if (previewStarted) {
      const workerImage = cleanupKeys.indexOf("preview-worker-image");
      const firstProducerStop = cleanupKeys.indexOf("outer-service-stop");
      const helper = cleanupKeys.indexOf("preview-helper");
      const outerDown = cleanupKeys.lastIndexOf("compose-down");
      assert.ok(previewCleanupStart < workerImage);
      assert.ok(workerImage < firstProducerStop);
      assert.ok(firstProducerStop < helper);
      assert.ok(helper < outerDown);
    } else {
      assert.equal(previewCleanupStart, -1);
    }
    const outerCleanupStart = cleanupKeys.lastIndexOf("compose-down");
    assert.deepEqual(
      cleanupKeys.slice(outerCleanupStart, outerCleanupStart + 5),
      [
        "compose-down",
        "preview-guard",
        "cleanup-container",
        "cleanup-network",
        "cleanup-volume",
      ],
    );
    for (const call of calls.filter((candidate) =>
      ["cleanup-container", "cleanup-network", "cleanup-volume"].includes(
        candidate.key,
      ),
    )) {
      const label = call.args.find((argument) =>
        argument.startsWith("label=com.docker.compose.project="),
      );
      if (label === undefined) {
        if (call.args.includes("label=com.docker.compose.project")) continue;
        assert.ok(
          call.args.includes(
            "label=factory.archeform.helper=factory.local-acceptance-helper/v1",
          ),
        );
        continue;
      }
      assert.ok(
        label ===
          `label=com.docker.compose.project=factory-preview-${activePreviewRunId}` ||
          label === `label=com.docker.compose.project=${projectName}`,
      );
    }
    return { window };
  } finally {
    if (overrideRoot !== undefined) {
      await rm(overrideRoot, { force: true, recursive: true }).catch(() => {});
      const overrideParent = dirname(overrideRoot);
      const tombstonePrefix = `${basename(overrideRoot)}.remove-`;
      for (const entry of await readdir(overrideParent)) {
        if (entry.startsWith(tombstonePrefix)) {
          await rm(join(overrideParent, entry), {
            force: true,
            recursive: true,
          });
        }
      }
    }
    await rm(resourceRoot, { force: true, recursive: true });
  }
}

async function runRealChildInterruptionHarness() {
  const windows = [];
  const overrides = [];
  for (const window of interruptionWindows) {
    windows.push(await runRealChildInterruptionCase({ window }));
  }
  for (const overrideMutation of ["mutate", "symlink", "delete"]) {
    for (const signal of ["SIGINT", "SIGTERM"]) {
      await runRealChildInterruptionCase({
        overrideMutation,
        signal,
        window: "during-compose-startup",
      });
      overrides.push(`${overrideMutation}:${signal}`);
    }
  }
  return { overrides, windows };
}

describe("local product acceptance inputs", () => {
  it("accepts only exact native harness stage and signal arguments", () => {
    assert.deepEqual(
      parseNativeHarnessArguments([
        "--stage=before-ready",
        `--signal=${process.platform === "win32" ? "CTRL_C" : "SIGINT"}`,
      ]),
      {
        signal: process.platform === "win32" ? "CTRL_C" : "SIGINT",
        stage: "before-ready",
      },
    );
    assert.equal(
      parseNativeHarnessArguments([
        "--stage=before-ready,payload",
        `--signal=${process.platform === "win32" ? "CTRL_C" : "SIGINT"}`,
      ]),
      null,
    );
    assert.equal(
      nativeHarnessGateMessage(
        JSON.stringify({
          apiVersion: "factory.local-acceptance-interruption-harness/v1",
          stage: "before-ready",
          type: "gate",
        }),
        "before-ready",
      ),
      true,
    );
    assert.equal(
      nativeHarnessGateMessage(
        JSON.stringify({
          apiVersion: "factory.local-acceptance-interruption-harness/v1",
          extra: "secret",
          stage: "before-ready",
          type: "gate",
        }),
        "before-ready",
      ),
      false,
    );
  });

  it("proves exact Compose sentinel absence with resource-specific formatters", async () => {
    const calls = [];
    const absent = await composeSentinelAbsent(
      "factory-harness-sentinel-test",
      performance.now() + 10_000,
      async (command, args) => {
        calls.push({ args, command });
        return { exitCode: 0, stderr: "", stdout: "" };
      },
    );

    assert.equal(absent, true);
    assert.deepEqual(
      calls.map(({ args }) => args.at(-1)),
      ["{{.ID}}", "{{.ID}}", "{{.Name}}"],
    );
    assert.equal(
      await composeSentinelAbsent(
        "factory-harness-sentinel-test",
        performance.now() + 10_000,
        async () => ({ exitCode: 0, stderr: "", stdout: "owned\n" }),
      ),
      false,
    );
  });

  it("rejects any pre-existing private acceptance root instead of baselining it", () => {
    assert.equal(
      privateAcceptanceRootsAbsent([
        "unrelated-entry",
        "factory-local-ab12-acceptance-stale",
      ]),
      false,
    );
    assert.equal(privateAcceptanceRootsAbsent(["unrelated-entry"]), true);
  });

  it("recognizes the path-qualified pnpm command used by a POSIX pseudo-terminal", () => {
    assert.equal(
      isPosixAcceptanceCommand(
        "node /home/operator/.nvm/versions/node/v22.11.0/bin/pnpm accept:local",
      ),
      true,
    );
    assert.equal(isPosixAcceptanceCommand("pnpm accept:local"), true);
    assert.equal(
      isPosixAcceptanceCommand(
        "node /home/operator/.nvm/versions/node/v22.11.0/bin/not-pnpm accept:local",
      ),
      false,
    );
    assert.equal(isPosixAcceptanceCommand("pnpm accept:local-extra"), false);
  });

  it("retains the Windows Docker CLI plugin root without forwarding unrelated environment values", () => {
    assert.deepEqual(
      minimalDockerEnvironment(
        {
          OPENAI_API_KEY: "provider-secret-sentinel",
          PATH: "windows-path",
          ProgramFiles: "C:\\Program Files",
          USERPROFILE: "C:\\Users\\operator",
        },
        "win32",
      ),
      {
        PATH: "windows-path",
        ProgramFiles: "C:\\Program Files",
      },
    );
    assert.deepEqual(
      minimalDockerEnvironment(
        {
          OPENAI_API_KEY: "provider-secret-sentinel",
          PATH: "/usr/bin",
          ProgramFiles: "unused",
        },
        "linux",
      ),
      { PATH: "/usr/bin" },
    );
  });

  it("accepts only the exact native Windows launcher root identity", () => {
    const identity = {
      apiVersion: "factory.windows-native-console-launcher/v1",
      processCreationTime: "134328900103154145",
      processId: 36_428,
      type: "root",
    };
    assert.deepEqual(parseWindowsLauncherRoot(JSON.stringify(identity)), {
      processCreationTime: identity.processCreationTime,
      processId: identity.processId,
    });
    assert.equal(
      parseWindowsLauncherRoot(
        JSON.stringify({ ...identity, processId: `${identity.processId}` }),
      ),
      null,
    );
    assert.equal(
      parseWindowsLauncherRoot(
        JSON.stringify({ ...identity, command: "pnpm.cmd accept:local" }),
      ),
      null,
    );
    assert.equal(parseWindowsLauncherRoot("not-json"), null);
  });

  it("accepts only one exact ready ACK and result IPC shape", () => {
    const nonce = "a".repeat(64);
    const ready = createLocalAcceptanceSupervisorReady(nonce);
    assert.deepEqual(ready, {
      apiVersion: "factory.local-acceptance-supervisor-ipc/v1",
      nonce,
      type: "ready",
    });
    assert.equal(
      validateLocalAcceptanceSupervisorMessage(ready, nonce, "ready"),
      true,
    );
    assert.equal(
      validateLocalAcceptanceSupervisorMessage(
        { ...ready, extra: true },
        nonce,
        "ready",
      ),
      false,
    );
    assert.equal(
      validateLocalAcceptanceSupervisorMessage(
        {
          apiVersion: "factory.local-acceptance-supervisor-ipc/v1",
          exitCode: 1,
          nonce,
          summary: {
            schemaVersion: "factory.local-acceptance-summary/v1",
            secret: "must-not-cross-ipc",
          },
          type: "result",
        },
        nonce,
        "result",
      ),
      false,
    );
    assert.equal(
      validateLocalAcceptanceSupervisorMessage(
        { ...ready, nonce: "b".repeat(64) },
        nonce,
        "ready",
      ),
      false,
    );
    assert.equal(
      validateLocalAcceptanceSupervisorMessage(
        {
          apiVersion: "factory.local-acceptance-supervisor-ipc/v1",
          nonce,
          type: "ack",
        },
        nonce,
        "ack",
      ),
      true,
    );
    assert.equal(
      validateLocalAcceptanceSupervisorMessage([], nonce, "ack"),
      false,
    );
    assert.equal(
      validateLocalAcceptanceSupervisorMessage(
        { ...ready, type: "wrong" },
        nonce,
        "ready",
      ),
      false,
    );
    assert.equal(
      validateLocalAcceptanceSupervisorMessage(
        {
          apiVersion: "factory.local-acceptance-supervisor-ipc/v1",
          exitCode: 2,
          nonce,
          summary: { schemaVersion: "factory.local-acceptance-summary/v1" },
          type: "result",
        },
        nonce,
        "result",
      ),
      false,
    );
    const session = createLocalAcceptanceSupervisorIpcSession(nonce);
    assert.equal(
      session.accept({
        apiVersion: "factory.local-acceptance-supervisor-ipc/v1",
        nonce,
        type: "ack",
      }),
      true,
    );
    assert.equal(
      session.accept({
        apiVersion: "factory.local-acceptance-supervisor-ipc/v1",
        nonce,
        type: "ack",
      }),
      false,
    );
    assert.equal(
      session.result({
        apiVersion: "factory.local-acceptance-supervisor-ipc/v1",
        exitCode: 0,
        nonce,
        summary: { schemaVersion: "factory.local-acceptance-summary/v1" },
        type: "result",
      }),
      true,
    );
    assert.equal(
      session.result({
        apiVersion: "factory.local-acceptance-supervisor-ipc/v1",
        exitCode: 0,
        nonce,
        summary: { schemaVersion: "factory.local-acceptance-summary/v1" },
        type: "result",
      }),
      false,
    );
  });

  it("releases the operation lease after product failure only when terminal proof is exact", () => {
    assert.equal(
      createLocalAcceptanceWorkloadResult({
        cleanupComplete: true,
        exitCode: 1,
      }).terminalProof,
      true,
    );
    assert.equal(
      createLocalAcceptanceWorkloadResult({
        cleanupComplete: false,
        exitCode: 1,
      }).terminalProof,
      false,
    );
  });
  it("atomically excludes a second local acceptance owner for one canonical worktree", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "factory-local-worktree-"));
    const leaseParent = await mkdtemp(
      join(tmpdir(), "factory-local-operation-"),
    );
    try {
      const lease = await acquireLocalAcceptanceOperationLease({
        leaseParent,
        workspace,
      });
      await assert.rejects(() =>
        acquireLocalAcceptanceOperationLease({ leaseParent, workspace }),
      );
      await lease.release();
    } finally {
      await rm(workspace, { force: true, recursive: true });
      await rm(leaseParent, { force: true, recursive: true });
    }
  });

  it("reclaims only a valid dead-owner operation lease", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "factory-local-worktree-"));
    const leaseParent = await mkdtemp(
      join(tmpdir(), "factory-local-operation-"),
    );
    try {
      const canonicalWorkspace = await realpath(workspace);
      const digest = createHash("sha256")
        .update(
          process.platform === "win32"
            ? canonicalWorkspace.toLowerCase()
            : canonicalWorkspace,
        )
        .digest("hex");
      const root = join(leaseParent, digest);
      await mkdir(root, { mode: 0o700, recursive: true });
      await writeFile(
        join(root, "owner.json"),
        `${JSON.stringify({ apiVersion: "factory.local-acceptance-operation-lease/v1", createdAtUnixMs: 1, ownerNonce: "a".repeat(64), ownerPid: 999999, workspaceDigest: digest })}\n`,
        { encoding: "utf8", mode: 0o600 },
      );
      const lease = await acquireLocalAcceptanceOperationLease({
        leaseParent,
        workspace,
      });
      await lease.release();
    } finally {
      await rm(workspace, { force: true, recursive: true });
      await rm(leaseParent, { force: true, recursive: true });
    }
  });

  it("rejects a non-canonical or invalid-age stale owner record", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "factory-local-worktree-"));
    const leaseParent = await mkdtemp(
      join(tmpdir(), "factory-local-operation-"),
    );
    try {
      const canonicalWorkspace = await realpath(workspace);
      const digest = createHash("sha256")
        .update(
          process.platform === "win32"
            ? canonicalWorkspace.toLowerCase()
            : canonicalWorkspace,
        )
        .digest("hex");
      const root = join(leaseParent, digest);
      await mkdir(root, { mode: 0o700 });
      await writeFile(
        join(root, "owner.json"),
        `${JSON.stringify({ ownerPid: 999999, apiVersion: "factory.local-acceptance-operation-lease/v1", createdAtUnixMs: "1", ownerNonce: "a".repeat(64), workspaceDigest: digest })}\n`,
        { encoding: "utf8", mode: 0o600 },
      );

      await assert.rejects(() =>
        acquireLocalAcceptanceOperationLease({ leaseParent, workspace }),
      );
    } finally {
      await rm(workspace, { force: true, recursive: true });
      await rm(leaseParent, { force: true, recursive: true });
    }
  });

  it(
    "rejects a POSIX operation owner file with group-readable permissions",
    { skip: process.platform === "win32" },
    async () => {
      const workspace = await mkdtemp(
        join(tmpdir(), "factory-local-worktree-"),
      );
      const leaseParent = await mkdtemp(
        join(tmpdir(), "factory-local-operation-"),
      );
      try {
        const canonicalWorkspace = await realpath(workspace);
        const digest = createHash("sha256")
          .update(canonicalWorkspace)
          .digest("hex");
        const root = join(leaseParent, digest);
        await mkdir(root);
        const owner = join(root, "owner.json");
        await writeFile(
          owner,
          `${JSON.stringify({ apiVersion: "factory.local-acceptance-operation-lease/v1", createdAtUnixMs: 1, ownerNonce: "a".repeat(64), ownerPid: 999999, workspaceDigest: digest })}\n`,
        );
        await chmod(owner, 0o644);
        await assert.rejects(() =>
          acquireLocalAcceptanceOperationLease({ leaseParent, workspace }),
        );
      } finally {
        await rm(workspace, { force: true, recursive: true });
        await rm(leaseParent, { force: true, recursive: true });
      }
    },
  );

  it("rejects a symlinked operation-lease parent without following it", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "factory-local-worktree-"));
    const target = await mkdtemp(join(tmpdir(), "factory-local-operation-"));
    const parent = join(target, "lease-link");
    try {
      await symlink(
        target,
        parent,
        process.platform === "win32" ? "junction" : "dir",
      );
      await assert.rejects(() =>
        acquireLocalAcceptanceOperationLease({
          leaseParent: parent,
          workspace,
        }),
      );
    } finally {
      await rm(workspace, { force: true, recursive: true });
      await rm(target, { force: true, recursive: true });
    }
  });

  it("reclaims only an empty incomplete lease entry older than fifteen seconds", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "factory-local-worktree-"));
    const leaseParent = await mkdtemp(
      join(tmpdir(), "factory-local-operation-"),
    );
    try {
      const canonicalWorkspace = await realpath(workspace);
      const digest = createHash("sha256")
        .update(
          process.platform === "win32"
            ? canonicalWorkspace.toLowerCase()
            : canonicalWorkspace,
        )
        .digest("hex");
      const root = join(leaseParent, digest);
      await mkdir(root, { mode: 0o700 });
      const olderThanFifteenSeconds = new Date(Date.now() - 15_001);
      await utimes(root, olderThanFifteenSeconds, olderThanFifteenSeconds);
      const lease = await acquireLocalAcceptanceOperationLease({
        leaseParent,
        workspace,
      });
      await lease.release();
    } finally {
      await rm(workspace, { force: true, recursive: true });
      await rm(leaseParent, { force: true, recursive: true });
    }
  });
  it("creates an isolated identity, four ports, and three distinct secrets", async () => {
    let randomCalls = 0;
    const inputs = await createRunInputs({
      environment: {},
      randomBytes: (size) => Buffer.alloc(size, ++randomCalls),
      reservePorts: async () => ({ ports, release: async () => {} }),
    });

    assert.match(inputs.projectName, /^factory-local-[a-z0-9-]+$/);
    assert.deepEqual(Object.values(inputs.ports), ports);
    assert.equal(new Set(Object.values(inputs.secrets)).size, 3);
    assert.equal(randomCalls, 4);
  });

  it("constructs a provider-free child environment for the template journey", async () => {
    const run = scenario();

    const exitCode = await runLocalProductAcceptance(run.dependencies);

    assert.equal(exitCode, 0);
    for (const environment of run.childEnvironments) {
      assert.equal(environment.OPENAI_API_KEY, "");
      assert.equal(environment.FACTORY_FIXTURE_MODE, "");
      assert.equal(environment.CALLER_SECRET, callerSecret);
      if (environment.FACTORY_E2E_ISOLATED !== undefined) {
        assert.equal(environment.FACTORY_E2E_ISOLATED, "1");
        assert.match(
          environment.FACTORY_E2E_FACTORY_PROJECT,
          /^factory-local-[a-z0-9-]+$/,
        );
      }
    }
  });

  it("returns one structured terminal proof from the actual successful workload", async () => {
    const run = scenario();

    const result = await runLocalProductAcceptanceWorkload(run.dependencies);

    assert.equal(result.exitCode, 0);
    assert.equal(result.terminalProof, true);
    assert.equal(
      result.summary.schemaVersion,
      "factory.local-acceptance-summary/v1",
    );
    assert.deepEqual(result.summary.cleanup, {
      containers: 0,
      networks: 0,
      previewDirectories: 0,
      volumes: 0,
    });
  });

  it("runs no workload before one exact supervisor ACK and releases only after proof", async () => {
    const channel = new EventEmitter();
    channel.connected = true;
    const sent = [];
    channel.send = (message) => sent.push(message);
    let workloadCalls = 0;
    let releases = 0;
    const supervisor = runLocalAcceptanceSupervisor({
      acquireOperationLease: async () => ({
        release: async () => {
          releases += 1;
        },
      }),
      channel,
      randomBytes: () => Buffer.alloc(32, 0xaa),
      runWorkload: async () => {
        workloadCalls += 1;
        return createLocalAcceptanceWorkloadResult({
          cleanupComplete: true,
          exitCode: 0,
          summary: { schemaVersion: "factory.local-acceptance-summary/v1" },
        });
      },
      signalSource: new EventEmitter(),
    });
    await waitForCondition(() => sent.length === 1);
    assert.equal(workloadCalls, 0);
    assert.deepEqual(sent, [
      {
        apiVersion: "factory.local-acceptance-supervisor-ipc/v1",
        nonce: "aa".repeat(32),
        type: "ready",
      },
    ]);

    channel.emit("message", {
      apiVersion: "factory.local-acceptance-supervisor-ipc/v1",
      nonce: "aa".repeat(32),
      type: "ack",
    });

    assert.equal(await supervisor, 0);
    assert.equal(workloadCalls, 1);
    assert.equal(releases, 1);
    assert.equal(sent.length, 2);
    assert.equal(sent[1].type, "result");
  });

  it("rejects malformed timing gates before lease acquisition", async () => {
    let acquisitions = 0;

    const exitCode = await runLocalAcceptanceSupervisor({
      acquireOperationLease: async () => {
        acquisitions += 1;
        return { release: async () => {} };
      },
      channel: new EventEmitter(),
      environment: {
        FACTORY_LOCAL_ACCEPTANCE_TIMING_GATE:
          "factory.local-acceptance-interruption-harness/v1:unknown",
      },
      signalSource: new EventEmitter(),
    });

    assert.equal(exitCode, 1);
    assert.equal(acquisitions, 0);
  });

  it("holds the exact before-ready timing gate until native interruption", async () => {
    const channel = new EventEmitter();
    channel.connected = true;
    const sent = [];
    channel.send = (message) => sent.push(message);
    const signalSource = new EventEmitter();
    let releases = 0;
    const supervisor = runLocalAcceptanceSupervisor({
      acquireOperationLease: async () => ({
        release: async () => {
          releases += 1;
        },
      }),
      channel,
      environment: {
        FACTORY_LOCAL_ACCEPTANCE_TIMING_GATE:
          "factory.local-acceptance-interruption-harness/v1:before-ready",
      },
      randomBytes: () => Buffer.alloc(32, 0xab),
      signalSource,
    });
    await waitForCondition(() => sent.length === 1);

    assert.deepEqual(sent[0], {
      apiVersion: "factory.local-acceptance-interruption-harness/v1",
      stage: "before-ready",
      type: "gate",
    });
    signalSource.emit("SIGINT");
    assert.equal(await supervisor, 1);
    assert.equal(releases, 1);
    assert.equal(sent.length, 1);
  });

  it("uses a detached thin client for one ready ACK and one terminal result", async () => {
    const child = new EventEmitter();
    child.connected = true;
    child.sent = [];
    child.send = (message) => child.sent.push(message);
    child.unrefCalls = 0;
    child.unref = () => {
      child.unrefCalls += 1;
    };
    child.disconnect = () => {
      child.connected = false;
    };
    let forkCall;
    const output = [];
    const client = runLocalAcceptanceClient({
      environment: {
        FACTORY_LOCAL_ACCEPTANCE_TOKEN: "must-not-cross-client-boundary",
        PATH: process.env.PATH,
      },
      forkProcess: (modulePath, args, options) => {
        forkCall = { args, modulePath, options };
        return child;
      },
      modulePath: "C:\\workspace\\scripts\\local-product-acceptance.mjs",
      signalSource: new EventEmitter(),
      writeOutput: (value) => output.push(value),
    });
    await waitForCondition(() => forkCall !== undefined);
    assert.equal(forkCall.options.detached, true);
    assert.equal(forkCall.options.windowsHide, true);
    assert.deepEqual(forkCall.args, ["--factory-local-acceptance-supervisor"]);
    assert.equal(
      forkCall.options.env.FACTORY_LOCAL_ACCEPTANCE_TOKEN,
      undefined,
    );
    assert.equal(child.unrefCalls, 1);
    const nonce = "ab".repeat(32);
    child.emit("message", {
      apiVersion: "factory.local-acceptance-supervisor-ipc/v1",
      nonce,
      type: "ready",
    });
    assert.deepEqual(child.sent, [
      {
        apiVersion: "factory.local-acceptance-supervisor-ipc/v1",
        nonce,
        type: "ack",
      },
    ]);
    const summary = { schemaVersion: "factory.local-acceptance-summary/v1" };
    child.emit("message", {
      apiVersion: "factory.local-acceptance-supervisor-ipc/v1",
      exitCode: 0,
      nonce,
      summary,
      type: "result",
    });

    assert.equal(await client, 0);
    assert.deepEqual(output, [`${JSON.stringify(summary)}\n`]);
  });

  it("releases an unused lease and runs no workload after an invalid ACK", async () => {
    const channel = new EventEmitter();
    channel.connected = true;
    let readySent = false;
    channel.send = () => {
      readySent = true;
    };
    let workloadCalls = 0;
    let releases = 0;
    const supervisor = runLocalAcceptanceSupervisor({
      acquireOperationLease: async () => ({
        release: async () => {
          releases += 1;
        },
      }),
      channel,
      randomBytes: () => Buffer.alloc(32, 0xac),
      runWorkload: async () => {
        workloadCalls += 1;
      },
      signalSource: new EventEmitter(),
    });
    await waitForCondition(() => readySent);
    channel.emit("message", {
      apiVersion: "factory.local-acceptance-supervisor-ipc/v1",
      nonce: "wrong",
      type: "ack",
    });

    assert.equal(await supervisor, 1);
    assert.equal(workloadCalls, 0);
    assert.equal(releases, 1);
  });

  it("retains the lease when acknowledged workload cleanup is uncertain", async () => {
    const channel = new EventEmitter();
    channel.connected = true;
    const sent = [];
    channel.send = (message) => sent.push(message);
    let releases = 0;
    const supervisor = runLocalAcceptanceSupervisor({
      acquireOperationLease: async () => ({
        release: async () => {
          releases += 1;
        },
      }),
      channel,
      randomBytes: () => Buffer.alloc(32, 0xad),
      runWorkload: async () =>
        createLocalAcceptanceWorkloadResult({
          cleanupComplete: false,
          exitCode: 1,
          summary: { schemaVersion: "factory.local-acceptance-summary/v1" },
        }),
      signalSource: new EventEmitter(),
    });
    await waitForCondition(() => sent.length === 1);
    channel.emit("message", {
      apiVersion: "factory.local-acceptance-supervisor-ipc/v1",
      nonce: "ad".repeat(32),
      type: "ack",
    });

    assert.equal(await supervisor, 1);
    assert.equal(releases, 0);
    assert.equal(sent.at(-1).type, "result");
    assert.equal(sent.at(-1).exitCode, 1);
  });

  it("treats post-ACK client disconnect as interruption while finishing cleanup", async () => {
    const channel = new EventEmitter();
    channel.connected = true;
    const sent = [];
    channel.send = (message) => sent.push(message);
    let releases = 0;
    let workloadStarted;
    const started = new Promise((resolve) => {
      workloadStarted = resolve;
    });
    const supervisor = runLocalAcceptanceSupervisor({
      acquireOperationLease: async () => ({
        release: async () => {
          releases += 1;
        },
      }),
      channel,
      randomBytes: () => Buffer.alloc(32, 0xae),
      runWorkload: async ({ installSignalHandler }) =>
        await new Promise((resolve) => {
          installSignalHandler(() => {
            resolve(
              createLocalAcceptanceWorkloadResult({
                cleanupComplete: true,
                exitCode: 1,
                summary: {
                  schemaVersion: "factory.local-acceptance-summary/v1",
                },
              }),
            );
          });
          workloadStarted();
        }),
      signalSource: new EventEmitter(),
    });
    await waitForCondition(() => sent.length === 1);
    channel.emit("message", {
      apiVersion: "factory.local-acceptance-supervisor-ipc/v1",
      nonce: "ae".repeat(32),
      type: "ack",
    });
    await started;
    channel.connected = false;
    channel.emit("disconnect");

    assert.equal(await supervisor, 1);
    assert.equal(releases, 1);
    assert.equal(sent.length, 1);
  });

  it("cuts product work off at one supervisor deadline and preserves cleanup proof", async () => {
    const channel = new EventEmitter();
    channel.connected = true;
    const sent = [];
    channel.send = (message) => sent.push(message);
    let releases = 0;
    const supervisor = runLocalAcceptanceSupervisor({
      acquireOperationLease: async () => ({
        release: async () => {
          releases += 1;
        },
      }),
      channel,
      productWorkTimeoutMilliseconds: 20,
      randomBytes: () => Buffer.alloc(32, 0xaf),
      runWorkload: async ({ installSignalHandler }) =>
        await new Promise((resolve) => {
          const fallback = setTimeout(
            () =>
              resolve(
                createLocalAcceptanceWorkloadResult({
                  cleanupComplete: true,
                  exitCode: 0,
                  summary: {
                    schemaVersion: "factory.local-acceptance-summary/v1",
                  },
                }),
              ),
            200,
          );
          installSignalHandler(() => {
            clearTimeout(fallback);
            resolve(
              createLocalAcceptanceWorkloadResult({
                cleanupComplete: true,
                exitCode: 1,
                summary: {
                  schemaVersion: "factory.local-acceptance-summary/v1",
                },
              }),
            );
          });
        }),
      signalSource: new EventEmitter(),
    });
    await waitForCondition(() => sent.length === 1);
    const startedAt = Date.now();
    channel.emit("message", {
      apiVersion: "factory.local-acceptance-supervisor-ipc/v1",
      nonce: "af".repeat(32),
      type: "ack",
    });

    assert.equal(await supervisor, 1);
    assert.ok(Date.now() - startedAt < 150);
    assert.equal(releases, 1);
    assert.equal(sent.at(-1).exitCode, 1);
  });

  it("awaits shutdown cleanup and retains the lease at the supervisor lifetime", async () => {
    const channel = new EventEmitter();
    channel.connected = true;
    const sent = [];
    channel.send = (message) => sent.push(message);
    let releases = 0;
    let workloadSettled = false;
    const supervisor = runLocalAcceptanceSupervisor({
      acquireOperationLease: async () => ({
        release: async () => {
          releases += 1;
        },
      }),
      channel,
      productWorkTimeoutMilliseconds: 1_000,
      randomBytes: () => Buffer.alloc(32, 0xb0),
      runWorkload: async ({ lifetimeSignal }) =>
        await new Promise((resolve) => {
          lifetimeSignal.addEventListener(
            "abort",
            () => {
              workloadSettled = true;
              resolve(
                createLocalAcceptanceWorkloadResult({
                  cleanupComplete: false,
                  exitCode: 1,
                  summary: {
                    schemaVersion: "factory.local-acceptance-summary/v1",
                  },
                }),
              );
            },
            { once: true },
          );
        }),
      signalSource: new EventEmitter(),
      totalSupervisorTimeoutMilliseconds: 20,
    });
    await waitForCondition(() => sent.length === 1);
    const startedAt = Date.now();
    channel.emit("message", {
      apiVersion: "factory.local-acceptance-supervisor-ipc/v1",
      nonce: "b0".repeat(32),
      type: "ack",
    });

    assert.equal(await supervisor, 1);
    assert.ok(Date.now() - startedAt < 150);
    assert.equal(workloadSettled, true);
    assert.equal(releases, 0);
  });

  it("invokes the hard fail-stop when shutdown cleanup cannot settle", async () => {
    const channel = new EventEmitter();
    channel.connected = true;
    const sent = [];
    channel.send = (message) => sent.push(message);
    const exits = [];
    let releases = 0;
    const supervisor = runLocalAcceptanceSupervisor({
      acquireOperationLease: async () => ({
        release: async () => {
          releases += 1;
        },
      }),
      channel,
      exitProcess: (code) => exits.push(code),
      productWorkTimeoutMilliseconds: 1_000,
      randomBytes: () => Buffer.alloc(32, 0xb2),
      runWorkload: async () => await new Promise(() => {}),
      signalSource: new EventEmitter(),
      totalSupervisorTimeoutMilliseconds: 20,
    });
    await waitForCondition(() => sent.length === 1);
    const startedAt = Date.now();
    channel.emit("message", {
      apiVersion: "factory.local-acceptance-supervisor-ipc/v1",
      nonce: "b2".repeat(32),
      type: "ack",
    });

    assert.equal(await supervisor, 1);
    assert.ok(Date.now() - startedAt < 100);
    assert.deepEqual(exits, [1]);
    assert.equal(releases, 0);
  });

  it("bounds operation-lease acquisition and releases a late lease", async () => {
    const channel = new EventEmitter();
    channel.connected = true;
    channel.send = () => assert.fail("lease timeout must precede readiness");
    let releases = 0;
    const startedAt = Date.now();

    const exitCode = await runLocalAcceptanceSupervisor({
      acquireOperationLease: async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return {
          release: async () => {
            releases += 1;
          },
        };
      },
      channel,
      leaseTimeoutMilliseconds: 20,
      randomBytes: () => Buffer.alloc(32, 0xb1),
      signalSource: new EventEmitter(),
      totalSupervisorTimeoutMilliseconds: 1_000,
    });

    assert.equal(exitCode, 1);
    assert.ok(Date.now() - startedAt < 100);
    await waitForCondition(() => releases === 1);
  });

  it("uses one runner-owned private override to inject the capability only into Control Plane", async () => {
    const run = scenario();
    run.dependencies.environment.FACTORY_LOCAL_PREVIEW_PROFILE =
      "caller-controlled-value";

    const exitCode = await runLocalProductAcceptance(run.dependencies);

    assert.equal(exitCode, 0);
    for (const environment of run.childEnvironments) {
      if (environment.FACTORY_E2E_ISOLATED === "1") {
        assert.equal(
          environment.FACTORY_LOCAL_PREVIEW_PROFILE,
          "factory.local-preview-profile/v1:acceptance",
        );
      } else {
        assert.equal(environment.FACTORY_LOCAL_PREVIEW_PROFILE, undefined);
      }
    }
    for (const call of run.calls.filter(
      (candidate) =>
        candidate.command === "docker" &&
        candidate.args[0] === "compose" &&
        (candidate.args.includes("config") || candidate.args.includes("up")),
    )) {
      const overrideIndex = call.args.lastIndexOf("-f");
      assert.notEqual(overrideIndex, -1);
      const override = call.args[overrideIndex + 1];
      assert.match(override, /factory-local-[a-z0-9-]+/u);
      assert.notEqual(override, "-");
      assert.equal(call.stdin, "");
      assert.match(
        call.environment?.FACTORY_LOCAL_ACCEPTANCE_TOKEN ?? "",
        /^[a-f0-9]{64}$/u,
      );
    }
    assert.equal(
      run.calls.find((call) => call.key === "playwright")?.environment
        ?.FACTORY_LOCAL_ACCEPTANCE_TOKEN,
      undefined,
    );
  });

  it("scrubs the timing protocol from every workload child environment", async () => {
    const run = scenario();
    run.dependencies.environment.FACTORY_LOCAL_ACCEPTANCE_TIMING_GATE =
      "factory.local-acceptance-interruption-harness/v1:during-playwright";

    const exitCode = await runLocalProductAcceptance(run.dependencies);

    assert.equal(exitCode, 0);
    assert.equal(
      run.childEnvironments.every(
        (environment) =>
          environment.FACTORY_LOCAL_ACCEPTANCE_TIMING_GATE === undefined,
      ),
      true,
    );
  });

  it("blocks on an existing outer project before ports or secrets are created", async () => {
    const run = scenario();
    const originalRunCommand = run.dependencies.runCommand;
    let randomCalls = 0;
    let reservationCalls = 0;
    run.dependencies.randomBytes = (size) => {
      randomCalls += 1;
      return Buffer.alloc(size, 1);
    };
    run.dependencies.reservePorts = async () => {
      reservationCalls += 1;
      return { ports, release: async () => {} };
    };
    run.dependencies.runCommand = async (command, args, options) => {
      if (
        command === "docker" &&
        args.includes("label=com.docker.compose.project") &&
        args.includes("{{.Labels}}")
      ) {
        return {
          exitCode: 0,
          stderr: "",
          stdout:
            "com.docker.compose.project=factory-local-existing-sentinel\n",
        };
      }
      return await originalRunCommand(command, args, options);
    };

    const result = await runLocalProductAcceptanceWorkload(run.dependencies);

    assert.equal(result.exitCode, 1);
    assert.equal(result.terminalProof, false);
    assert.equal(reservationCalls, 0);
    assert.equal(randomCalls, 0);
    assert.equal(
      run.calls.some((call) => call.key === "compose-config"),
      false,
    );
  });

  it("quiesces exact producers and removes only the preowned preview identity", async () => {
    const previewRunId = `preview-${"a".repeat(64)}`;
    const outerProject = "factory-local-test";
    const calls = [];
    const fetches = [];
    const outputs = new Map([
      ["preview-worker-container", "abcdef012345\n"],
      ["preview-worker-image", `sha256:${"b".repeat(64)}\n`],
      ["outer-control-plane-containers", "bcdef0123456\n"],
      ["outer-worker-containers", "abcdef012345\n"],
      ["preview-containers-list", "cdef01234567\n"],
      ["preview-networks-list", "def012345678\n"],
      ["preview-volumes-list", "factory-preview-owned\n"],
      ["outer-artifacts-volume", "factory-local-test_factory-artifacts\n"],
    ]);
    const result = await cleanupExactPreownedPreview({
      baseUrl: "http://127.0.0.1:41003",
      factoryProjectName: outerProject,
      lease: {
        apiVersion: "factory.local-preview-lease/v1",
        compilationId: "compilation-1",
        composeProjectName: `factory-preview-${previewRunId}`,
        factoryProjectName: outerProject,
        previewDirectoryRelativePath: `.preview-runs/${previewRunId}`,
        previewRunId,
      },
      previewFetch: async (url, options) => {
        fetches.push({ method: options?.method, url });
        return new Response("{}", { status: 404 });
      },
      runStep: async (name, command, args) => {
        calls.push({ args, command, name });
        return { exitCode: 0, stdout: outputs.get(name) ?? "" };
      },
      wait: async () => {},
    });

    assert.equal(result, true);
    assert.deepEqual(fetches, [
      {
        method: "POST",
        url: `http://127.0.0.1:41003/preview-runs/${previewRunId}/stop`,
      },
    ]);
    assert.deepEqual(
      calls
        .filter((call) => call.name.endsWith("-stop"))
        .map((call) => call.name),
      ["outer-control-plane-stop", "outer-worker-stop"],
    );
    const helper = calls.find((call) => call.name === "preview-helper");
    assert.ok(
      calls
        .find((call) => call.name === "preview-worker-container")
        .args.includes("-a"),
    );
    assert.equal(
      calls
        .find((call) => call.name === "stable-proof-worker-0")
        .args.includes("-a"),
      false,
    );
    assert.ok(helper.args.includes("--pull"));
    assert.ok(helper.args.includes("never"));
    assert.ok(helper.args.includes("--network"));
    assert.ok(helper.args.includes("none"));
    assert.ok(helper.args.includes("--cap-drop"));
    assert.ok(helper.args.includes("ALL"));
    assert.ok(helper.args.includes("--read-only"));
    assert.ok(
      helper.args.includes(
        "type=volume,src=factory-local-test_factory-artifacts,dst=/artifacts",
      ),
    );
    assert.ok(
      helper.args.includes(`factory.archeform.preview-run=${previewRunId}`),
    );
    assert.equal(
      calls.filter((call) => call.name.startsWith("stable-proof-")).length,
      18,
    );
  });

  it("settles a fetch deadline even when the underlying request ignores abort", async () => {
    const startedAt = Date.now();
    await assert.rejects(() =>
      fetchWithDeadline(
        async () => await new Promise(() => {}),
        "http://127.0.0.1:41003/never-settles",
        {},
        20,
      ),
    );
    assert.ok(Date.now() - startedAt < 500);
  });

  it("creates one atomic, exact, runner-owned preview lease", async () => {
    const root = await (
      await import("node:fs/promises")
    ).mkdtemp("factory-local-lease-test-");
    try {
      const lease = await createLocalPreviewLease(root, {
        compilationId: "compilation-1",
        factoryProjectName: "factory-local-test",
        previewRunId: "preview-1",
      });
      assert.deepEqual(lease, {
        apiVersion: "factory.local-preview-lease/v1",
        compilationId: "compilation-1",
        composeProjectName: "factory-preview-preview-1",
        factoryProjectName: "factory-local-test",
        previewDirectoryRelativePath: ".preview-runs/preview-1",
        previewRunId: "preview-1",
      });
      await assert.rejects(() =>
        createLocalPreviewLease(root, {
          compilationId: "compilation-1",
          factoryProjectName: "factory-local-test",
          previewRunId: "preview-1",
        }),
      );
    } finally {
      await (
        await import("node:fs/promises")
      ).rm(root, {
        recursive: true,
        force: true,
      });
    }
  });
});

describe("local product acceptance orchestration", () => {
  it("starts exactly the E2E-selected immutable compilation before releasing a runner-owned lease", async () => {
    const compilationId = "cm12345678901234567890123";
    const previewRequests = [];
    let stopRequested = false;
    let previewRunId;
    let preStopCurrentRequests = 0;
    const run = scenario({
      onPlaywright: async (environment) => {
        const { writeFile } = await import("node:fs/promises");
        await writeFile(
          environment.FACTORY_E2E_PREVIEW_REQUEST_PATH,
          `${compilationId}\n`,
          { encoding: "utf8", flag: "wx" },
        );
      },
      previewFetch: async (url, options = {}) => {
        previewRequests.push({
          body: options.body,
          headers: options.headers,
          method: options.method ?? "GET",
          url,
        });
        if (options.method === "POST") {
          if (url.includes("/stop")) {
            stopRequested = true;
            return new Response("{}", { status: 200 });
          }
          const intent = JSON.parse(options.body);
          previewRunId = intent.previewRunId;
          return new Response(
            JSON.stringify({
              apiVersion: "factory.local-preview-intent/v1",
              compilationId,
              composeProjectName: `factory-preview-${previewRunId}`,
              previewRunId,
              status: "starting",
            }),
            { status: 200 },
          );
        }
        if (!url.includes("/preview-runs/current")) {
          return new Response(
            JSON.stringify({
              id: compilationId,
              result: { status: "succeeded" },
            }),
            { status: 200 },
          );
        }
        if (!stopRequested) preStopCurrentRequests += 1;
        return new Response(
          JSON.stringify({
            compilationId,
            composeProjectName: `factory-preview-${previewRunId}`,
            id: previewRunId,
            status: stopRequested ? "stopped" : "ready",
          }),
          { status: 200 },
        );
      },
    });

    const exitCode = await runLocalProductAcceptance(run.dependencies);

    assert.equal(exitCode, 0);
    assert.equal(preStopCurrentRequests, 0);
    const startRequest = previewRequests.find((request) =>
      request.url.includes("/internal/compilations/"),
    );
    const intent = JSON.parse(startRequest?.body);
    assert.equal(intent.apiVersion, "factory.local-preview-intent/v1");
    assert.match(intent.previewRunId, /^preview-[a-f0-9]{64}$/u);
    assert.match(
      startRequest?.headers?.["x-factory-local-acceptance-token"] ?? "",
      /^[a-f0-9]{64}$/u,
    );
    assert.equal(
      typeof startRequest?.headers?.["x-factory-internal-token"],
      "string",
    );
    assert.deepEqual(
      previewRequests
        .filter((request) => request.method === "POST")
        .map(({ method, url }) => ({ method, url })),
      [
        {
          method: "POST",
          url: `http://127.0.0.1:41003/internal/compilations/${compilationId}/preview-runs`,
        },
        {
          method: "POST",
          url: `http://127.0.0.1:41003/preview-runs/${previewRunId}/stop`,
        },
      ],
    );
    const playwright = run.calls.find((call) => call.key === "playwright");
    assert.match(
      playwright?.environment?.FACTORY_E2E_PREVIEW_LEASE_PATH ?? "",
      /factory-local-[a-z0-9-]+/u,
    );
  });

  it("fails closed after lease publication fails but stops the exact acknowledged preview", async () => {
    const previewRequests = [];
    let acknowledgeStart;
    let rootRemoved;
    const startAcknowledged = new Promise((resolve) => {
      acknowledgeStart = resolve;
    });
    const privateRootRemoved = new Promise((resolve) => {
      rootRemoved = resolve;
    });
    let stopped = false;
    let previewRunId;
    const run = scenario({
      onPlaywright: async (environment) => {
        const { rm, writeFile } = await import("node:fs/promises");
        const { dirname } = await import("node:path");
        await writeFile(
          environment.FACTORY_E2E_PREVIEW_REQUEST_PATH,
          "compilation-1\n",
          { encoding: "utf8", flag: "wx" },
        );
        await startAcknowledged;
        await rm(dirname(environment.FACTORY_E2E_PREVIEW_REQUEST_PATH), {
          force: true,
          recursive: true,
        });
        rootRemoved();
      },
      previewFetch: async (url, options = {}) => {
        previewRequests.push({
          body: options.body,
          method: options.method ?? "GET",
          url,
        });
        if (options.method === "POST") {
          if (url.includes("/stop")) {
            stopped = true;
            return new Response("{}", { status: 200 });
          }
          const intent = JSON.parse(options.body);
          previewRunId = intent.previewRunId;
          acknowledgeStart();
          await privateRootRemoved;
          return new Response(
            JSON.stringify({
              apiVersion: "factory.local-preview-intent/v1",
              compilationId: "compilation-1",
              composeProjectName: `factory-preview-${previewRunId}`,
              previewRunId,
              status: "starting",
            }),
            { status: 200 },
          );
        }
        if (url.includes("/preview-runs/current")) {
          return new Response(
            JSON.stringify({
              compilationId: "compilation-1",
              composeProjectName: `factory-preview-${previewRunId}`,
              id: previewRunId,
              status: stopped ? "stopped" : "ready",
            }),
            { status: 200 },
          );
        }
        return new Response(
          JSON.stringify({
            id: "compilation-1",
            result: { status: "succeeded" },
          }),
          { status: 200 },
        );
      },
    });

    const exitCode = await runLocalProductAcceptance(run.dependencies);

    assert.equal(exitCode, 1);
    assert.deepEqual(
      previewRequests.filter((request) => request.method === "POST"),
      [
        {
          method: "POST",
          url: "http://127.0.0.1:41003/internal/compilations/compilation-1/preview-runs",
          body: JSON.stringify({
            apiVersion: "factory.local-preview-intent/v1",
            previewRunId,
          }),
        },
        {
          method: "POST",
          url: `http://127.0.0.1:41003/preview-runs/${previewRunId}/stop`,
          body: undefined,
        },
      ],
    );
    assert.equal(
      run.calls.some((call) => call.key === "preview-worker-image"),
      true,
    );
    assert.equal(
      run.calls.some((call) => call.key === "preview-helper"),
      true,
    );
    assert.equal(JSON.parse(run.output.join("")).cleanup.previewDirectories, 0);
  });

  it("times out a never-settling intent response and cleans the preowned identity", async () => {
    let previewRunId;
    let stopUrl;
    const run = scenario({
      previewFetch: async (url, options = {}) => {
        if (url.includes("/internal/compilations/")) {
          previewRunId = JSON.parse(options.body).previewRunId;
          return await new Promise(() => {});
        }
        if (url.includes("/stop")) {
          stopUrl = url;
          return new Response("{}", { status: 404 });
        }
        return new Response(
          JSON.stringify({
            id: "compilation-1",
            result: { status: "succeeded" },
          }),
          { status: 200 },
        );
      },
    });
    run.dependencies.intentPostTimeoutMilliseconds = 20;
    run.dependencies.previewStopTimeoutMilliseconds = 20;
    const startedAt = Date.now();

    const result = await runLocalProductAcceptanceWorkload(run.dependencies);

    assert.equal(result.exitCode, 1);
    assert.equal(result.terminalProof, true);
    assert.equal(
      stopUrl,
      `http://127.0.0.1:41003/preview-runs/${previewRunId}/stop`,
    );
    assert.ok(Date.now() - startedAt < 1_500);
  });

  it("waits until every host endpoint responds successfully", async () => {
    const controller = new AbortController();
    let calls = 0;

    const ready = await waitForHostReadiness(
      ["http://127.0.0.1:1", "http://127.0.0.1:2/health"],
      {
        fetchImpl: async () => ({ ok: ++calls > 2 }),
        retryMilliseconds: 0,
        signal: controller.signal,
        timeoutMilliseconds: 100,
      },
    );

    assert.equal(ready, true);
    assert.equal(calls, 4);
  });

  it("does not probe host endpoints after cancellation", async () => {
    const controller = new AbortController();
    controller.abort();
    let calls = 0;

    const ready = await waitForHostReadiness(["http://127.0.0.1:1"], {
      fetchImpl: async () => {
        calls += 1;
        return { ok: true };
      },
      signal: controller.signal,
      timeoutMilliseconds: 100,
    });

    assert.equal(ready, false);
    assert.equal(calls, 0);
  });

  it(
    "kills a SIGTERM-ignoring detached Unix descendant before resolving",
    { skip: process.platform === "win32" },
    async () => {
      const controller = new AbortController();
      const descendantProgram =
        "process.on('SIGTERM', () => {}); setInterval(() => {}, 1_000);";
      const parentProgram = [
        "const { spawn } = require('node:child_process');",
        `const child = spawn(process.execPath, ['-e', ${JSON.stringify(descendantProgram)}], { stdio: 'ignore' });`,
        "process.stdout.write(String(child.pid));",
        "setInterval(() => {}, 1_000);",
      ].join(" ");
      setTimeout(() => controller.abort(), 100).unref();

      const result = await executeCommand(
        process.execPath,
        ["-e", parentProgram],
        { environment: process.env, signal: controller.signal },
      );

      assert.notEqual(result.exitCode, 0);
      const descendantPid = Number(result.stdout.trim());
      assert.ok(Number.isInteger(descendantPid) && descendantPid > 0);
      assert.throws(
        () => process.kill(descendantPid, 0),
        (error) => error?.code === "ESRCH",
      );
    },
  );

  it(
    "launches the supported Windows pnpm shim through the real adapter",
    { skip: process.platform !== "win32" },
    async () => {
      const result = await executeCommand(
        process.env.ComSpec,
        ["/d", "/s", "/c", "pnpm", "--version"],
        { environment: process.env },
      );

      assert.equal(result.exitCode, 0);
      assert.equal(result.stdout.trim(), "9.0.0");
    },
  );

  it(
    "promptly aborts a real Windows command and its pending child",
    { skip: process.platform !== "win32" },
    async () => {
      const controller = new AbortController();
      const startedAt = Date.now();
      setTimeout(() => controller.abort(), 100).unref();

      const result = await executeCommand(
        process.env.ComSpec,
        ["/d", "/s", "/c", "ping", "-n", "4", "127.0.0.1"],
        { environment: process.env, signal: controller.signal },
      );

      assert.notEqual(result.exitCode, 0);
      assert.ok(Date.now() - startedAt < 1_500);
    },
  );

  it("terminates a never-settling child at its single command deadline", async () => {
    const startedAt = Date.now();
    const result = await executeCommand(
      process.execPath,
      ["-e", "setTimeout(() => process.exit(0), 2000)"],
      {
        environment: process.env,
        timeoutMilliseconds: 50,
      },
    );

    assert.equal(result.exitCode, 1);
    assert.ok(Date.now() - startedAt < 1_500);
  });

  it("bounds a never-closing Windows taskkill process", async () => {
    let spawnCount = 0;
    let killerKilled = false;
    const spawnProcess = () => {
      spawnCount += 1;
      const child = new EventEmitter();
      child.pid = 12_345;
      child.stdin = new EventEmitter();
      child.stdin.end = () => {};
      child.stdout = new EventEmitter();
      child.stderr = new EventEmitter();
      child.kill = () => {
        if (spawnCount === 2) killerKilled = true;
        return true;
      };
      return child;
    };
    const startedAt = Date.now();

    const result = await executeCommand("never.exe", [], {
      environment: {},
      platform: "win32",
      spawnProcess,
      timeoutMilliseconds: 20,
      windowsTerminationTimeoutMilliseconds: 20,
    });

    assert.equal(result.exitCode, 1);
    assert.equal(spawnCount, 2);
    assert.equal(killerKilled, true);
    assert.ok(Date.now() - startedAt < 1_500);
  });

  it("uses the remaining Windows termination budget to observe the exact child close", async () => {
    let spawnCount = 0;
    let originalChild;
    const spawnProcess = () => {
      spawnCount += 1;
      const child = new EventEmitter();
      child.pid = 12_345 + spawnCount;
      child.stdin = new EventEmitter();
      child.stdin.end = () => {};
      child.stdout = new EventEmitter();
      child.stderr = new EventEmitter();
      child.kill = () => true;
      if (spawnCount === 1) {
        originalChild = child;
      } else {
        setTimeout(() => child.emit("close", 0), 1);
        setTimeout(() => originalChild.emit("close", 1), 1_200);
      }
      return child;
    };

    const result = await executeCommand("slow-close.exe", [], {
      environment: {},
      platform: "win32",
      spawnProcess,
      timeoutMilliseconds: 10,
      windowsTerminationTimeoutMilliseconds: 2_000,
    });

    assert.equal(result.exitCode, 1);
    assert.equal(result.terminationProven, true);
    assert.equal(spawnCount, 2);
  });

  it("runs the exact success sequence and releases reservations before Compose", async () => {
    const run = scenario();

    const exitCode = await runLocalProductAcceptance(run.dependencies);

    assert.equal(exitCode, 0);
    assert.equal(run.releaseCount(), 1);
    const childEnvironment = run.childEnvironments.find(
      (candidate) => candidate.FACTORY_E2E_BASE_URL !== undefined,
    );
    assert.deepEqual(run.readinessCalls, [
      {
        signalAborted: false,
        urls: [
          childEnvironment.FACTORY_E2E_BASE_URL,
          `${childEnvironment.FACTORY_E2E_CONTROL_PLANE_URL}/health`,
        ],
      },
    ]);
    const projectName = childEnvironment.FACTORY_E2E_FACTORY_PROJECT;
    assert.deepEqual(keys(run.calls), [
      "doctor",
      "preview-guard",
      "cleanup-container",
      "cleanup-network",
      "cleanup-volume",
      "compose-config",
      "compose-up",
      "playwright",
      "preview-worker-container",
      "preview-worker-image",
      "outer-control-plane-container",
      "preview-worker-container",
      "outer-service-stop",
      "outer-service-stop",
      "cleanup-container",
      "cleanup-network",
      "cleanup-volume",
      "outer-artifacts-volume",
      "preview-helper",
      "outer-control-plane-container",
      "preview-worker-container",
      "cleanup-container",
      "cleanup-network",
      "cleanup-volume",
      "cleanup-container",
      "outer-control-plane-container",
      "preview-worker-container",
      "cleanup-container",
      "cleanup-network",
      "cleanup-volume",
      "cleanup-container",
      "outer-control-plane-container",
      "preview-worker-container",
      "cleanup-container",
      "cleanup-network",
      "cleanup-volume",
      "cleanup-container",
      "compose-down",
      "preview-guard",
      "cleanup-container",
      "cleanup-network",
      "cleanup-volume",
      "cleanup-container",
      "cleanup-network",
      "cleanup-volume",
    ]);
    for (const call of composeCalls(run.calls, "-f")) {
      assert.equal(call.args[0], "compose");
      assert.equal(call.args[1], "-p");
      assert.equal(call.args[2], projectName);
      assert.equal(call.args.includes("infra/docker-compose.yml"), true);
      assert.equal(call.args.includes("-"), false);
      assert.equal(call.stdin, "");
    }
    assert.equal(
      run.calls.find((call) => call.key === "doctor")?.timeoutMilliseconds,
      30_000,
    );
    assert.equal(
      run.calls.find((call) => call.key === "compose-up")?.timeoutMilliseconds,
      630_000,
    );
    assert.equal(
      run.calls.find((call) => call.key === "playwright")?.timeoutMilliseconds,
      900_000,
    );
    assert.equal(
      run.calls.find((call) => call.key === "preview-helper")
        ?.timeoutMilliseconds,
      60_000,
    );
    assert.equal(
      run.calls.find((call) => call.key === "compose-down")
        ?.timeoutMilliseconds,
      180_000,
    );
  });

  it("exposes every workload timing-only interruption stage in order", async () => {
    const run = scenario();
    const stages = [];
    run.dependencies.timingGate = async (stage) => stages.push(stage);

    const exitCode = await runLocalProductAcceptance(run.dependencies);

    assert.equal(exitCode, 0);
    assert.deepEqual(stages, [
      "before-outer-up",
      "during-outer-up",
      "after-outer-up",
      "during-playwright",
      "before-preview-intent",
      "after-preview-intent",
      "during-preview-post",
      "after-preview-response",
      "during-preview-startup",
      "after-preview-ready",
      "during-preview-reconcile",
      "during-preview-stop",
      "after-preview-proof",
      "during-outer-down",
      "after-outer-down",
      "during-global-guard",
      "during-outer-proof",
      "before-root-removal",
    ]);
  });

  it("emits only the bounded safe summary", async () => {
    const run = scenario();

    const exitCode = await runLocalProductAcceptance(run.dependencies);
    const report = run.output.join("");

    assert.equal(exitCode, 0);
    assert.match(report, /factory-local-[a-z0-9-]+/);
    assert.match(report, /22\.11\.0/);
    assert.match(report, /9\.0\.0/);
    assert.match(report, /publishedRevision/);
    assert.match(report, /generatedNarrow/);
    assert.match(report, /"containers":0/);
    for (const secret of [
      callerSecret,
      stderrSecret,
      "provider-secret-sentinel",
    ]) {
      assert.equal(report.includes(secret), false);
    }
    assert.equal(report.includes("OPENAI_API_KEY"), false);
    assert.equal(report.includes("FACTORY_REDIS_PASSWORD"), false);
  });

  it("reports only an allowlisted last stage when Playwright fails", async () => {
    const run = scenario({
      fail: "playwright",
      failureStdout: [
        "FACTORY_ACCEPTANCE_STAGE template-entry",
        "\u001b[1A\u001b[2KFACTORY_ACCEPTANCE_STAGE compile\u001b[0m",
        "\u001b[2KFACTORY_ACCEPTANCE_CLEANUP_STAGE resources-removed\u001b[0m",
      ].join("\n"),
    });

    const exitCode = await runLocalProductAcceptance(run.dependencies);
    const report = JSON.parse(run.output.join(""));

    assert.equal(exitCode, 1);
    assert.equal(report.failureStage, "compile");
    assert.equal(report.cleanupStage, "resources-removed");
    assert.equal(run.output.join("").includes(stderrSecret), false);
  });

  it("accepts a safe evidence marker decorated by the line reporter", async () => {
    const run = scenario({ decorateEvidence: true });

    const exitCode = await runLocalProductAcceptance(run.dependencies);
    const report = JSON.parse(run.output.join(""));

    assert.equal(exitCode, 0);
    assert.deepEqual(report.accessibility, evidence.accessibility);
    assert.deepEqual(report.digests, evidence.digests);
  });

  it("rejects non-zero accessibility evidence even when Playwright exits zero", async () => {
    const run = scenario({
      playwrightEvidence: {
        ...evidence,
        accessibility: { ...evidence.accessibility, generatedNarrow: 1 },
      },
    });

    const exitCode = await runLocalProductAcceptance(run.dependencies);

    assert.equal(exitCode, 1);
  });

  it("stops before startup when resolved Compose publishes off loopback", async () => {
    const run = scenario({
      composeConfig: {
        services: {
          postgres: {
            ports: [{ published: String(ports[0]), target: 5432 }],
          },
        },
      },
    });

    const exitCode = await runLocalProductAcceptance(run.dependencies);

    assert.equal(exitCode, 1);
    assert.deepEqual(keys(run.calls), [
      "doctor",
      "preview-guard",
      "cleanup-container",
      "cleanup-network",
      "cleanup-volume",
      "compose-config",
    ]);
  });

  it("uses the fixed command interpreter boundary for Playwright on Windows", async () => {
    const run = scenario({ platform: "win32" });

    const exitCode = await runLocalProductAcceptance(run.dependencies);
    const playwright = run.calls.find((call) => call.key === "playwright");

    assert.equal(exitCode, 0);
    assert.equal(playwright?.command, "C:\\Windows\\System32\\cmd.exe");
    assert.deepEqual(playwright?.args, [
      "/d",
      "/s",
      "/c",
      "pnpm",
      "exec",
      "playwright",
      "test",
      "e2e/restaurant-template-acceptance.spec.ts",
      "--workers=1",
      "--reporter=line",
    ]);
  });

  it("stops before Compose when the doctor fails", async () => {
    const run = scenario({ fail: "doctor" });

    const exitCode = await runLocalProductAcceptance(run.dependencies);

    assert.equal(exitCode, 1);
    assert.deepEqual(keys(run.calls), ["doctor"]);
    assert.equal(run.releaseCount(), 0);
  });

  it("stops before Compose when the plugin predates !override support", async () => {
    const run = scenario({ doctorComposeVersion: "2.24.3" });

    const exitCode = await runLocalProductAcceptance(run.dependencies);

    assert.equal(exitCode, 1);
    assert.deepEqual(keys(run.calls), ["doctor"]);
    assert.equal(run.releaseCount(), 0);
  });

  it("tears down without launching Playwright when host readiness fails", async () => {
    const run = scenario({ ready: false });

    const exitCode = await runLocalProductAcceptance(run.dependencies);

    assert.equal(exitCode, 1);
    assert.deepEqual(keys(run.calls), [
      "doctor",
      "preview-guard",
      "cleanup-container",
      "cleanup-network",
      "cleanup-volume",
      "compose-config",
      "compose-up",
      "compose-down",
      "preview-guard",
      "cleanup-container",
      "cleanup-network",
      "cleanup-volume",
      "cleanup-container",
      "cleanup-network",
      "cleanup-volume",
    ]);
    assert.equal(run.readinessCalls.length, 1);
  });

  for (const failure of ["compose-up", "playwright"]) {
    it(`tears down exactly once when ${failure} fails`, async () => {
      const run = scenario({ fail: failure });

      const exitCode = await runLocalProductAcceptance(run.dependencies);

      assert.equal(exitCode, 1);
      assert.equal(composeCalls(run.calls, "down").length, 1);
      assert.equal(run.releaseCount(), 1);
    });
  }

  it("tears down exactly once after an interruption", async () => {
    const run = scenario({ interruptAt: "playwright" });

    const exitCode = await runLocalProductAcceptance(run.dependencies);

    assert.equal(exitCode, 1);
    assert.equal(composeCalls(run.calls, "down").length, 1);
    assert.equal(
      run.calls.find((call) => call.key === "compose-down")?.signalAborted,
      false,
    );
    assert.equal(run.releaseCount(), 1);
  });

  it("changes an otherwise successful run to failure when cleanup fails", async () => {
    const run = scenario({ fail: "compose-down" });

    const result = await runLocalProductAcceptanceWorkload(run.dependencies);

    assert.equal(result.exitCode, 1);
    assert.equal(result.terminalProof, false);
    assert.equal(composeCalls(run.calls, "down").length, 1);
  });

  it("does not tear the outer project down when exact preview proof fails", async () => {
    const run = scenario({ fail: "preview-helper" });

    const result = await runLocalProductAcceptanceWorkload(run.dependencies);

    assert.equal(result.exitCode, 1);
    assert.equal(result.terminalProof, false);
    assert.equal(composeCalls(run.calls, "down").length, 0);
  });

  it("launches no cleanup after an active child cannot be reaped", async () => {
    const run = scenario();
    const originalRunCommand = run.dependencies.runCommand;
    run.dependencies.runCommand = async (command, args, options) => {
      if (commandKey(command, args) === "playwright") {
        return {
          exitCode: 1,
          stderr: "",
          stdout: "",
          terminationProven: false,
        };
      }
      return await originalRunCommand(command, args, options);
    };

    const result = await runLocalProductAcceptanceWorkload(run.dependencies);
    const config = run.calls.find((call) => call.key === "compose-config");
    const root = dirname(config.args[config.args.lastIndexOf("-f") + 1]);
    try {
      assert.equal(result.exitCode, 1);
      assert.equal(result.terminalProof, false);
      assert.equal(composeCalls(run.calls, "down").length, 0);
      assert.equal(await exists(root), true);
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("fails terminal proof when the post-cleanup outer prefix guard is nonzero", async () => {
    const run = scenario();
    const originalRunCommand = run.dependencies.runCommand;
    let outerGuardQueries = 0;
    run.dependencies.runCommand = async (command, args, options) => {
      if (
        command === "docker" &&
        args.includes("label=com.docker.compose.project") &&
        args.includes("{{.Labels}}")
      ) {
        outerGuardQueries += 1;
        if (outerGuardQueries === 6) {
          return {
            exitCode: 0,
            stderr: "",
            stdout:
              "com.docker.compose.project=factory-local-residual-sentinel\n",
          };
        }
      }
      return await originalRunCommand(command, args, options);
    };

    const result = await runLocalProductAcceptanceWorkload(run.dependencies);

    assert.equal(result.exitCode, 1);
    assert.equal(result.terminalProof, false);
    assert.equal(outerGuardQueries, 6);
  });

  it("proves preview-directory cleanup in the runner instead of trusting Playwright evidence", async () => {
    const { cleanup: _cleanup, ...withoutCleanup } = evidence;
    const run = scenario({ playwrightEvidence: withoutCleanup });

    const exitCode = await runLocalProductAcceptance(run.dependencies);

    assert.equal(exitCode, 0);
    const report = JSON.parse(run.output.join(""));
    assert.equal(report.cleanup.previewDirectories, 0);
  });

  it("exercises every preview ownership interruption window with a real child and owned resources", async () => {
    const { overrides, windows } = await runRealChildInterruptionHarness();

    assert.deepEqual(
      windows.map((result) => result.window),
      [
        "before-start-request",
        "after-enqueue-before-response",
        "during-compose-startup",
        "after-response-before-readiness",
        "after-readiness",
      ],
    );
    assert.deepEqual(overrides, [
      "mutate:SIGINT",
      "mutate:SIGTERM",
      "symlink:SIGINT",
      "symlink:SIGTERM",
      "delete:SIGINT",
      "delete:SIGTERM",
    ]);
  });
});
