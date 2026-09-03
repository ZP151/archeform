import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import * as doctorModule from "./doctor.mjs";

const {
  evaluateDoctor,
  formatDoctorResult,
  parseEnvironmentNames,
  runDoctorCli,
} = doctorModule;

const repositoryRoot = resolve("C:/workspace/archeform");
const realRepositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const manifest = JSON.stringify({
  name: "factory-pilot",
  version: "0.1.0",
  private: true,
  packageManager: "pnpm@9.0.0",
  engines: {
    node: ">=22.11.0 <23",
    pnpm: ">=9",
  },
});
const environmentFile = [
  "FACTORY_REDIS_PASSWORD=redis-secret-sentinel",
  "FACTORY_INTERNAL_WORKER_TOKEN=worker-secret-sentinel",
  "OPENAI_API_KEY=provider-secret-sentinel",
].join("\n");

function commandResult(stdout = "") {
  return { exitCode: 0, stdout, stderr: "" };
}

function passingDependencies(overrides = {}) {
  return {
    cwd: repositoryRoot,
    nodeVersion: "22.11.0",
    pathExists: async (path) => path.endsWith(".git") || path.endsWith(".env"),
    readText: async (path) => {
      if (path.endsWith("package.json")) return manifest;
      if (path.endsWith(".node-version")) return "22.11.0\n";
      if (path.endsWith(".env")) return environmentFile;
      throw new Error(`Unexpected test read: ${path}`);
    },
    runCommand: async (command, args) => {
      if (command === "pnpm") return commandResult("9.0.0\n");
      if (command === "git" && args[0] === "--version") {
        return commandResult("git version 2.51.0.windows.1\n");
      }
      if (command === "git" && args[0] === "rev-parse") {
        return commandResult(`${repositoryRoot}\n`);
      }
      if (command === "docker" && args[0] === "--version") {
        return commandResult("Docker version 29.6.2, build test\n");
      }
      if (command === "docker" && args[0] === "info") {
        return commandResult("29.6.2\n");
      }
      if (command === "docker" && args[0] === "compose") {
        return commandResult("Docker Compose version v5.3.1\n");
      }
      throw new Error(`Unexpected test command: ${command} ${args.join(" ")}`);
    },
    ...overrides,
  };
}

function check(result, name) {
  const found = result.checks.find((candidate) => candidate.name === name);
  assert.ok(found, `Missing ${name} check.`);
  return found;
}

describe("environment-name parsing", () => {
  it("recognizes assignments and exports without retaining their values", () => {
    const names = parseEnvironmentNames(
      [
        "# comment",
        "FACTORY_REDIS_PASSWORD=redis-secret-sentinel",
        "export FACTORY_INTERNAL_WORKER_TOKEN = worker-secret-sentinel",
        "OPENAI_API_KEY=provider-secret-sentinel",
        "not an assignment",
      ].join("\n"),
    );

    assert.deepEqual([...names].sort(), [
      "FACTORY_INTERNAL_WORKER_TOKEN",
      "FACTORY_REDIS_PASSWORD",
      "OPENAI_API_KEY",
    ]);
    assert.equal([...names].join(" ").includes("secret-sentinel"), false);
  });
});

describe("command execution boundary", () => {
  it("terminates a stalled child within its deadline and discards child output", async () => {
    assert.equal(typeof doctorModule.executeCommand, "function");
    const startedAt = Date.now();
    const result = await doctorModule.executeCommand(
      process.execPath,
      [
        "-e",
        "process.stdout.write('stdout-secret-sentinel'); process.stderr.write('stderr-secret-sentinel'); setInterval(() => {}, 1000);",
      ],
      { timeoutMilliseconds: 50 },
    );

    assert.notEqual(result.exitCode, 0);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, "");
    assert.ok(Date.now() - startedAt < 2_000);
  });
});

describe("toolchain doctor", () => {
  it("checks the real active pnpm shim on the supported Windows toolchain", async () => {
    const result = await evaluateDoctor({
      scope: "toolchain",
      cwd: realRepositoryRoot,
    });

    assert.equal(check(result, "pnpm").ok, true);
    assert.equal(check(result, "pnpm").detail, "9.0.0");
  });

  it("accepts the minimum supported Node and exact active pnpm", async () => {
    const result = await evaluateDoctor({
      scope: "toolchain",
      ...passingDependencies(),
    });

    assert.equal(result.ok, true);
    assert.equal(check(result, "node").detail, "v22.11.0");
    assert.equal(check(result, "pnpm").detail, "9.0.0");
    assert.equal(check(result, "git").ok, true);
    assert.equal(check(result, "repository-root").ok, true);
  });

  for (const [nodeVersion, expectedOk] of [
    ["22.11.0", true],
    ["22.99.0", true],
    ["22.10.99", false],
    ["23.0.0", false],
    ["21.99.0", false],
    ["22.11", false],
    ["not-a-version", false],
  ]) {
    it(`${expectedOk ? "accepts" : "rejects"} Node ${nodeVersion}`, async () => {
      const result = await evaluateDoctor({
        scope: "toolchain",
        ...passingDependencies({ nodeVersion }),
      });

      assert.equal(check(result, "node").ok, expectedOk);
      assert.equal(result.ok, expectedOk);
    });
  }

  for (const pnpmVersion of ["9.0.1", "9.1.0", "11.19.0", "invalid"]) {
    it(`rejects active pnpm ${pnpmVersion}`, async () => {
      const dependencies = passingDependencies({
        runCommand: async (command, args) => {
          if (command === "pnpm") return commandResult(`${pnpmVersion}\n`);
          return passingDependencies().runCommand(command, args);
        },
      });
      const result = await evaluateDoctor({
        scope: "toolchain",
        ...dependencies,
      });

      assert.equal(check(result, "pnpm").ok, false);
      assert.equal(result.ok, false);
    });
  }

  it("rejects selector and manifest drift", async () => {
    const dependencies = passingDependencies({
      readText: async (path) => {
        if (path.endsWith("package.json")) {
          return JSON.stringify({
            name: "factory-pilot",
            packageManager: "pnpm@9.1.0",
            engines: { node: ">=22 <24", pnpm: ">=9" },
          });
        }
        if (path.endsWith(".node-version")) return "22.12.0\n";
        return environmentFile;
      },
    });

    const result = await evaluateDoctor({
      scope: "toolchain",
      ...dependencies,
    });

    assert.equal(check(result, "manifest").ok, false);
    assert.equal(check(result, "node-selector").ok, false);
    assert.equal(result.ok, false);
  });

  it("fails safely when Git is unavailable", async () => {
    const dependencies = passingDependencies({
      runCommand: async (command, args) => {
        if (command === "git") {
          return {
            exitCode: 127,
            stdout: "",
            stderr: "git-secret-sentinel",
          };
        }
        return passingDependencies().runCommand(command, args);
      },
    });

    const result = await evaluateDoctor({
      scope: "toolchain",
      ...dependencies,
    });
    const output = formatDoctorResult(result);

    assert.equal(check(result, "git").ok, false);
    assert.equal(result.ok, false);
    assert.equal(output.includes("git-secret-sentinel"), false);
  });

  it("distinguishes installed Git from a directory outside a checkout", async () => {
    const dependencies = passingDependencies({
      runCommand: async (command, args) => {
        if (command === "git" && args[0] === "--version") {
          return commandResult("git version 2.51.0.windows.1\n");
        }
        if (command === "git" && args[0] === "rev-parse") {
          return { exitCode: 128, stdout: "", stderr: "not a repository" };
        }
        return passingDependencies().runCommand(command, args);
      },
    });

    const result = await evaluateDoctor({
      scope: "toolchain",
      ...dependencies,
    });

    assert.equal(check(result, "git").ok, true);
    assert.equal(check(result, "repository-root").ok, false);
    assert.equal(
      check(result, "repository-root").remediation,
      "Run the doctor from the Archeform repository root.",
    );
    assert.equal(result.ok, false);
  });

  it("accepts Apple Git vendor output while reporting only its numeric version", async () => {
    const dependencies = passingDependencies({
      runCommand: async (command, args) => {
        if (command === "git" && args[0] === "--version") {
          return commandResult("git version 2.39.5 (Apple Git-154)\n");
        }
        return passingDependencies().runCommand(command, args);
      },
    });

    const result = await evaluateDoctor({
      scope: "toolchain",
      ...dependencies,
    });

    assert.equal(check(result, "git").ok, true);
    assert.equal(check(result, "git").detail, "2.39.5");
    assert.equal(result.ok, true);
  });

  it("rejects execution outside the repository root", async () => {
    const dependencies = passingDependencies({
      runCommand: async (command, args) => {
        if (command === "git" && args[0] === "--version") {
          return commandResult("git version 2.51.0.windows.1\n");
        }
        if (command === "git" && args[0] === "rev-parse") {
          return commandResult(`${resolve("C:/workspace/other")}\n`);
        }
        return passingDependencies().runCommand(command, args);
      },
    });

    const result = await evaluateDoctor({
      scope: "toolchain",
      ...dependencies,
    });

    assert.equal(check(result, "git").ok, true);
    assert.equal(check(result, "repository-root").ok, false);
    assert.equal(result.ok, false);
  });
});

describe("local doctor", () => {
  it("passes with Docker, Compose, and required environment names", async () => {
    const result = await evaluateDoctor({
      scope: "local",
      ...passingDependencies(),
    });

    assert.equal(result.ok, true);
    for (const name of [
      "docker-client",
      "docker-server",
      "docker-compose",
      "environment-file",
      "environment-names",
    ]) {
      assert.equal(check(result, name).ok, true);
    }
  });

  it("accepts a Docker server distribution suffix while reporting only its numeric version", async () => {
    const dependencies = passingDependencies({
      runCommand: async (command, args) => {
        if (command === "docker" && args[0] === "info") {
          return commandResult("29.6.2+azure-1\n");
        }
        return passingDependencies().runCommand(command, args);
      },
    });

    const result = await evaluateDoctor({ scope: "local", ...dependencies });

    assert.equal(check(result, "docker-server").ok, true);
    assert.equal(check(result, "docker-server").detail, "29.6.2");
    assert.equal(result.ok, true);
  });

  it("accepts blank required values because the runner owns run secrets", async () => {
    const dependencies = passingDependencies({
      readText: async (path) => {
        if (path.endsWith("package.json")) return manifest;
        if (path.endsWith(".node-version")) return "22.11.0\n";
        if (path.endsWith(".env")) {
          return "FACTORY_REDIS_PASSWORD=\nFACTORY_INTERNAL_WORKER_TOKEN=\n";
        }
        throw new Error(`Unexpected test read: ${path}`);
      },
    });

    const result = await evaluateDoctor({ scope: "local", ...dependencies });

    assert.equal(check(result, "environment-names").ok, true);
    assert.equal(result.ok, true);
  });

  it("reports only missing names and never environment values", async () => {
    const dependencies = passingDependencies({
      readText: async (path) => {
        if (path.endsWith("package.json")) return manifest;
        if (path.endsWith(".node-version")) return "22.11.0\n";
        if (path.endsWith(".env")) {
          return "OPENAI_API_KEY=provider-secret-sentinel\n";
        }
        throw new Error(`Unexpected test read: ${path}`);
      },
    });

    const result = await evaluateDoctor({ scope: "local", ...dependencies });
    const output = formatDoctorResult(result);

    assert.equal(check(result, "environment-names").ok, false);
    assert.match(output, /FACTORY_REDIS_PASSWORD/);
    assert.match(output, /FACTORY_INTERNAL_WORKER_TOKEN/);
    assert.equal(output.includes("provider-secret-sentinel"), false);
    assert.equal(result.ok, false);
  });

  it("fails before reading values when the root environment file is absent", async () => {
    let environmentRead = false;
    const dependencies = passingDependencies({
      pathExists: async (path) => !path.endsWith(".env"),
      readText: async (path) => {
        if (path.endsWith("package.json")) return manifest;
        if (path.endsWith(".node-version")) return "22.11.0\n";
        if (path.endsWith(".env")) environmentRead = true;
        return environmentFile;
      },
    });

    const result = await evaluateDoctor({ scope: "local", ...dependencies });

    assert.equal(check(result, "environment-file").ok, false);
    assert.equal(environmentRead, false);
    assert.equal(result.ok, false);
  });

  for (const failedCheck of [
    "docker-client",
    "docker-server",
    "docker-compose",
  ]) {
    it(`fails closed when ${failedCheck} is unavailable without leaking stderr`, async () => {
      const dependencies = passingDependencies({
        runCommand: async (command, args) => {
          const isFailedCommand =
            (failedCheck === "docker-client" &&
              command === "docker" &&
              args[0] === "--version") ||
            (failedCheck === "docker-server" &&
              command === "docker" &&
              args[0] === "info") ||
            (failedCheck === "docker-compose" &&
              command === "docker" &&
              args[0] === "compose");
          if (isFailedCommand) {
            return {
              exitCode: 1,
              stdout: "",
              stderr: "docker-secret-sentinel",
            };
          }
          return passingDependencies().runCommand(command, args);
        },
      });

      const result = await evaluateDoctor({ scope: "local", ...dependencies });
      const output = formatDoctorResult(result);

      assert.equal(check(result, failedCheck).ok, false);
      assert.equal(result.ok, false);
      assert.equal(output.includes("docker-secret-sentinel"), false);
    });
  }

  for (const malformedCheck of [
    "docker-client",
    "docker-server",
    "docker-compose",
  ]) {
    it(`fails closed when ${malformedCheck} exits zero with malformed output`, async () => {
      const dependencies = passingDependencies({
        runCommand: async (command, args) => {
          const isMalformedCommand =
            (malformedCheck === "docker-client" &&
              command === "docker" &&
              args[0] === "--version") ||
            (malformedCheck === "docker-server" &&
              command === "docker" &&
              args[0] === "info") ||
            (malformedCheck === "docker-compose" &&
              command === "docker" &&
              args[0] === "compose");
          if (isMalformedCommand) {
            return commandResult("malformed-success\n");
          }
          return passingDependencies().runCommand(command, args);
        },
      });

      const result = await evaluateDoctor({ scope: "local", ...dependencies });

      assert.equal(check(result, malformedCheck).ok, false);
      assert.equal(check(result, malformedCheck).detail, "unavailable");
      assert.equal(result.ok, false);
    });
  }
});

describe("doctor CLI boundary", () => {
  for (const args of [[], ["unknown"], ["toolchain", "extra"]]) {
    it(`rejects arguments ${JSON.stringify(args)} without running a command`, async () => {
      let commandCalls = 0;
      let output = "";
      const exitCode = await runDoctorCli(args, {
        ...passingDependencies({
          runCommand: async () => {
            commandCalls += 1;
            throw new Error("command must not run");
          },
        }),
        writeOutput: (value) => {
          output += value;
        },
      });

      assert.equal(exitCode, 1);
      assert.equal(commandCalls, 0);
      assert.equal(
        output,
        "Usage: node scripts/doctor.mjs <toolchain|local>\n",
      );
    });
  }

  it("returns zero and writes the bounded report for a passing scope", async () => {
    let output = "";
    const exitCode = await runDoctorCli(["toolchain"], {
      ...passingDependencies(),
      writeOutput: (value) => {
        output += value;
      },
    });

    assert.equal(exitCode, 0);
    assert.match(output, /PASS node: v22\.11\.0/);
    assert.match(output, /PASS pnpm: 9\.0\.0/);
    assert.equal(output.includes("secret-sentinel"), false);
  });
});
