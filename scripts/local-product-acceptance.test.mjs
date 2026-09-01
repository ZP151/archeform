import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createRunInputs,
  executeCommand,
  runLocalProductAcceptance,
  waitForHostReadiness,
} from "./local-product-acceptance.mjs";

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
  if (command === "docker" && args[0] === "ps") return "cleanup-container";
  if (command === "docker" && args[0] === "network") {
    return "cleanup-network";
  }
  if (command === "docker" && args[0] === "volume") {
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
  const readinessCalls = [];

  const dependencies = {
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
        key,
        signalAborted: options.signal?.aborted ?? false,
        stdin: options.input,
      });
      childEnvironments.push(options.environment);
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

function composeCalls(calls, operation) {
  return calls.filter(
    (call) => call.command === "docker" && call.args.includes(operation),
  );
}

describe("local product acceptance inputs", () => {
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
      assert.equal(environment.FACTORY_E2E_ISOLATED, "1");
      assert.match(
        environment.FACTORY_E2E_FACTORY_PROJECT,
        /^factory-local-[a-z0-9-]+$/,
      );
      assert.equal(environment.CALLER_SECRET, callerSecret);
    }
  });
});

describe("local product acceptance orchestration", () => {
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

  it("runs the exact success sequence and releases reservations before Compose", async () => {
    const run = scenario();

    const exitCode = await runLocalProductAcceptance(run.dependencies);

    assert.equal(exitCode, 0);
    assert.equal(run.releaseCount(), 1);
    const childEnvironment = run.childEnvironments[0];
    assert.deepEqual(run.readinessCalls, [
      {
        signalAborted: false,
        urls: [
          childEnvironment.FACTORY_E2E_BASE_URL,
          `${childEnvironment.FACTORY_E2E_CONTROL_PLANE_URL}/health`,
        ],
      },
    ]);
    const projectName = run.childEnvironments[0].FACTORY_E2E_FACTORY_PROJECT;
    assert.deepEqual(keys(run.calls), [
      "doctor",
      "preview-guard",
      "compose-config",
      "compose-up",
      "playwright",
      "compose-down",
      "preview-guard",
      "cleanup-container",
      "cleanup-network",
      "cleanup-volume",
    ]);
    assert.deepEqual(
      run.calls.map(({ args, command }) => ({ args, command })),
      [
        { command: "node", args: ["scripts/doctor.mjs", "local"] },
        {
          command: "node",
          args: ["scripts/verify-no-preview-resources.mjs"],
        },
        {
          command: "docker",
          args: [
            "compose",
            "-p",
            projectName,
            "--env-file",
            ".env",
            "-f",
            "infra/docker-compose.yml",
            "-f",
            "-",
            "config",
            "--format",
            "json",
          ],
        },
        {
          command: "docker",
          args: [
            "compose",
            "-p",
            projectName,
            "--env-file",
            ".env",
            "-f",
            "infra/docker-compose.yml",
            "-f",
            "-",
            "up",
            "-d",
            "--build",
            "--wait",
            "--wait-timeout",
            "600",
          ],
        },
        {
          command: "pnpm",
          args: [
            "exec",
            "playwright",
            "test",
            "e2e/restaurant-template-acceptance.spec.ts",
            "--workers=1",
            "--reporter=line",
          ],
        },
        {
          command: "docker",
          args: [
            "compose",
            "-p",
            projectName,
            "--env-file",
            ".env",
            "-f",
            "infra/docker-compose.yml",
            "-f",
            "-",
            "down",
            "--volumes",
            "--remove-orphans",
          ],
        },
        {
          command: "node",
          args: ["scripts/verify-no-preview-resources.mjs"],
        },
        {
          command: "docker",
          args: [
            "ps",
            "-a",
            "--filter",
            `label=com.docker.compose.project=${projectName}`,
            "--format",
            "{{.ID}}",
          ],
        },
        {
          command: "docker",
          args: [
            "network",
            "ls",
            "--filter",
            `label=com.docker.compose.project=${projectName}`,
            "--format",
            "{{.ID}}",
          ],
        },
        {
          command: "docker",
          args: [
            "volume",
            "ls",
            "--filter",
            `label=com.docker.compose.project=${projectName}`,
            "--format",
            "{{.Name}}",
          ],
        },
      ],
    );
    for (const call of composeCalls(run.calls, "-f")) {
      assert.match(call.stdin, /127\.0\.0\.1:/u);
      assert.match(call.stdin, /!override/u);
    }
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
    assert.equal(run.releaseCount(), 1);
  });

  it("stops before Compose when the plugin predates !override support", async () => {
    const run = scenario({ doctorComposeVersion: "2.24.3" });

    const exitCode = await runLocalProductAcceptance(run.dependencies);

    assert.equal(exitCode, 1);
    assert.deepEqual(keys(run.calls), ["doctor"]);
    assert.equal(run.releaseCount(), 1);
  });

  it("tears down without launching Playwright when host readiness fails", async () => {
    const run = scenario({ ready: false });

    const exitCode = await runLocalProductAcceptance(run.dependencies);

    assert.equal(exitCode, 1);
    assert.deepEqual(keys(run.calls), [
      "doctor",
      "preview-guard",
      "compose-config",
      "compose-up",
      "compose-down",
      "preview-guard",
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
    const run = scenario({ fail: "cleanup-network" });

    const exitCode = await runLocalProductAcceptance(run.dependencies);

    assert.equal(exitCode, 1);
    assert.equal(composeCalls(run.calls, "down").length, 1);
  });

  it("fails when Playwright does not prove preview-directory cleanup", async () => {
    const { cleanup: _cleanup, ...withoutCleanup } = evidence;
    const run = scenario({ playwrightEvidence: withoutCleanup });

    const exitCode = await runLocalProductAcceptance(run.dependencies);

    assert.equal(exitCode, 1);
  });
});
