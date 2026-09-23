import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { describe, it } from "node:test";
import { isDeepStrictEqual } from "node:util";

import { runRegression } from "./regression.mjs";

const productArguments = [
  "exec",
  "turbo",
  "run",
  "test",
  "--filter=@factory/graph",
  "--filter=@factory/adapters",
  "--filter=@factory/capabilities",
  "--filter=@factory/compiler",
  "--filter=@factory/workbench",
  "--concurrency=4",
];

const definitionArguments = [
  "exec",
  "turbo",
  "run",
  "build",
  "--filter=@factory/adapters...",
  "--filter=@factory/compiler...",
];
const definitionEmittedControlTestArguments = [
  "--filter",
  "@factory/compiler",
  "test",
  "--",
  "test/approval-numeric-domain.test.ts",
  "test/approval-calculated-total.test.ts",
  "test/inventory-operations-presentation.test.ts",
];
const definitionPrismaGenerateArguments = [
  "--filter",
  "@factory/control-plane",
  "prisma:generate",
];

function successfulCommand() {
  return { exitCode: 0, terminationProven: true };
}

function collector() {
  const values = [];
  return { values, writeOutput: (value) => values.push(value) };
}

describe("local regression lanes", () => {
  it("rejects every non-canonical argument sequence without executing", async () => {
    for (const argumentsList of [
      [],
      ["full"],
      ["smoke", "smoke"],
      ["definitions", "--dry-run", "extra"],
      ["--dry-run", "smoke"],
      ["smoke", "--dry-run", "extra"],
    ]) {
      const output = collector();
      let calls = 0;

      const result = await runRegression({
        argumentsList,
        execute: async () => {
          calls += 1;
          return successfulCommand();
        },
        writeOutput: output.writeOutput,
      });

      assert.equal(result.exitCode, 1);
      assert.equal(calls, 0);
      assert.deepEqual(output.values, [
        "Usage: node scripts/regression.mjs <smoke|product|definitions> [--dry-run]\n",
      ]);
    }
  });

  it("lists the fixed smoke commands during dry-run without executing", async () => {
    const output = collector();
    let calls = 0;

    const result = await runRegression({
      argumentsList: ["smoke", "--dry-run"],
      execute: async () => {
        calls += 1;
        return successfulCommand();
      },
      writeOutput: output.writeOutput,
    });

    assert.equal(result.exitCode, 0);
    assert.equal(calls, 0);
    assert.deepEqual(JSON.parse(output.values[0]), {
      dryRun: true,
      lane: "smoke",
      schemaVersion: "factory.local-regression-summary/v1",
      status: "dry-run",
      steps: [
        { args: ["--test", "scripts/doctor.test.mjs"], id: "doctor" },
        {
          args: ["--test", "scripts/local-product-acceptance.test.mjs"],
          id: "local-product-acceptance",
        },
      ],
    });
  });

  it("lists the provider-free definition admission commands during dry-run", async () => {
    const output = collector();
    let calls = 0;

    const result = await runRegression({
      argumentsList: ["definitions", "--dry-run"],
      platform: "linux",
      execute: async () => {
        calls += 1;
        return successfulCommand();
      },
      writeOutput: output.writeOutput,
    });

    assert.equal(result.exitCode, 0);
    assert.equal(calls, 0);
    assert.deepEqual(JSON.parse(output.values[0]), {
      dryRun: true,
      lane: "definitions",
      schemaVersion: "factory.local-regression-summary/v1",
      status: "dry-run",
      steps: [
        {
          args: definitionArguments,
          id: "definition-build",
        },
        {
          args: [
            "--test",
            "scripts/definition-case-index.test.mjs",
            "scripts/regression.test.mjs",
          ],
          id: "definition-tool-tests",
        },
        {
          args: ["scripts/verify-product-definition-data.mjs"],
          id: "definition-validation",
        },
        {
          args: ["scripts/definition-case-index.mjs", "--check"],
          id: "definition-case-index",
        },
        {
          args: [
            "--filter",
            "@factory/adapters",
            "test",
            "--",
            "test/product-definition-data.test.ts",
            "test/requirement-interpreter.test.ts",
            "test/supplies-stockroom-definition.test.ts",
          ],
          id: "definition-adapter-tests",
        },
        {
          args: definitionPrismaGenerateArguments,
          id: "definition-prisma-generate",
        },
        {
          args: definitionEmittedControlTestArguments,
          id: "definition-emitted-control-tests",
        },
        {
          args: [
            "--filter",
            "@factory/compiler",
            "test",
            "--",
            "test/definition-data-compatibility.test.ts",
            "test/inventory-operations-contract.test.ts",
          ],
          id: "definition-compatibility-tests",
        },
      ],
    });
  });

  it("stops definitions admission when the emitted-control step fails, including Windows dispatch", async () => {
    for (const platform of ["linux", "win32"]) {
      const output = collector();
      const calls = [];
      const expectedCommand = platform === "win32" ? "cmd.exe" : "pnpm";
      const expectedArgs =
        platform === "win32"
          ? ["/d", "/s", "/c", "pnpm", ...definitionEmittedControlTestArguments]
          : definitionEmittedControlTestArguments;
      const result = await runRegression({
        argumentsList: ["definitions"],
        execute: async (command, args) => {
          calls.push({ args, command });
          return command === expectedCommand &&
            isDeepStrictEqual(args, expectedArgs)
            ? { exitCode: 7, terminationProven: true }
            : successfulCommand();
        },
        platform,
        writeOutput: output.writeOutput,
      });

      assert.equal(result.exitCode, 1);
      assert.deepEqual(calls.at(-1), {
        args: expectedArgs,
        command: expectedCommand,
      });
      assert.equal(
        calls.some(({ args }) =>
          args.includes("test/definition-data-compatibility.test.ts"),
        ),
        false,
      );
      assert.deepEqual(JSON.parse(output.values[0]), {
        dryRun: false,
        lane: "definitions",
        schemaVersion: "factory.local-regression-summary/v1",
        status: "failed",
        steps: [
          { exitCode: 0, id: "definition-build" },
          { exitCode: 0, id: "definition-tool-tests" },
          { exitCode: 0, id: "definition-validation" },
          { exitCode: 0, id: "definition-case-index" },
          { exitCode: 0, id: "definition-adapter-tests" },
          { exitCode: 0, id: "definition-prisma-generate" },
          { exitCode: 7, id: "definition-emitted-control-tests" },
        ],
      });
    }
  });

  it("runs provider-free Prisma generation before emitted controls and stops definitions admission when it fails", async () => {
    for (const platform of ["linux", "win32"]) {
      const output = collector();
      const calls = [];
      const expectedCommand = platform === "win32" ? "cmd.exe" : "pnpm";
      const expectedArgs =
        platform === "win32"
          ? ["/d", "/s", "/c", "pnpm", ...definitionPrismaGenerateArguments]
          : definitionPrismaGenerateArguments;
      const result = await runRegression({
        argumentsList: ["definitions"],
        environment: {
          OPENAI_API_KEY: "provider-secret-sentinel",
          SAFE: "safe",
        },
        execute: async (command, args, options) => {
          calls.push({ args, command, options });
          return command === expectedCommand &&
            isDeepStrictEqual(args, expectedArgs)
            ? { exitCode: 5, terminationProven: true }
            : successfulCommand();
        },
        platform,
        writeOutput: output.writeOutput,
      });

      assert.equal(result.exitCode, 1);
      assert.deepEqual(
        calls.at(-1) && {
          args: calls.at(-1).args,
          command: calls.at(-1).command,
        },
        { args: expectedArgs, command: expectedCommand },
      );
      assert.equal(calls.at(-1).options.environment.SAFE, "safe");
      assert.equal("OPENAI_API_KEY" in calls.at(-1).options.environment, false);
      assert.equal(
        output.values[0].includes("provider-secret-sentinel"),
        false,
      );
      assert.equal(
        calls.some(({ args }) =>
          args.includes("test/approval-numeric-domain.test.ts"),
        ),
        false,
      );
      assert.deepEqual(JSON.parse(output.values[0]), {
        dryRun: false,
        lane: "definitions",
        schemaVersion: "factory.local-regression-summary/v1",
        status: "failed",
        steps: [
          { exitCode: 0, id: "definition-build" },
          { exitCode: 0, id: "definition-tool-tests" },
          { exitCode: 0, id: "definition-validation" },
          { exitCode: 0, id: "definition-case-index" },
          { exitCode: 0, id: "definition-adapter-tests" },
          { exitCode: 5, id: "definition-prisma-generate" },
        ],
      });
    }
  });

  it("uses the exact POSIX product selection and removes provider variables", async () => {
    const output = collector();
    const calls = [];
    const result = await runRegression({
      argumentsList: ["product"],
      environment: {
        KEEP: "safe",
        OPENAI_API_KEY: "provider-secret-sentinel",
        OPENAI_MODEL: "provider-model-sentinel",
        openai_api_key: "provider-secret-sentinel",
      },
      execute: async (command, args, options) => {
        calls.push({ args, command, options });
        return successfulCommand();
      },
      platform: "linux",
      writeOutput: output.writeOutput,
    });

    assert.equal(result.exitCode, 0);
    assert.deepEqual(
      calls.map(({ command, args }) => ({ args, command })),
      [{ args: productArguments, command: "pnpm" }],
    );
    assert.equal(calls[0].options.environment.KEEP, "safe");
    assert.equal("OPENAI_API_KEY" in calls[0].options.environment, false);
    assert.equal("OPENAI_MODEL" in calls[0].options.environment, false);
    assert.equal("openai_api_key" in calls[0].options.environment, false);
    assert.equal(calls[0].options.timeoutMilliseconds, 600_000);
    assert.equal(calls[0].options.signal instanceof AbortSignal, true);
  });

  it("uses the established Windows pnpm adapter with the same fixed selection", async () => {
    const calls = [];
    const result = await runRegression({
      argumentsList: ["product"],
      execute: async (command, args, options) => {
        calls.push({ args, command, options });
        return successfulCommand();
      },
      platform: "win32",
      writeOutput: () => {},
    });

    assert.equal(result.exitCode, 0);
    assert.deepEqual(
      calls.map(({ command, args }) => ({ args, command })),
      [
        {
          args: ["/d", "/s", "/c", "pnpm", ...productArguments],
          command: "cmd.exe",
        },
      ],
    );
    assert.equal(calls[0].options.platform, "win32");
  });

  it("stops the smoke lane at its first failed command without retrying", async () => {
    const output = collector();
    const calls = [];
    const result = await runRegression({
      argumentsList: ["smoke"],
      execute: async (command, args) => {
        calls.push({ args, command });
        return { exitCode: 9, terminationProven: true };
      },
      writeOutput: output.writeOutput,
    });

    assert.equal(result.exitCode, 1);
    assert.deepEqual(calls, [
      {
        args: ["--test", "scripts/doctor.test.mjs"],
        command: process.execPath,
      },
    ]);
    assert.deepEqual(JSON.parse(output.values[0]), {
      dryRun: false,
      lane: "smoke",
      schemaVersion: "factory.local-regression-summary/v1",
      status: "failed",
      steps: [{ exitCode: 9, id: "doctor" }],
    });
  });

  it("fails closed for spawn errors, timeouts, and uncertain termination without exposing raw text", async () => {
    for (const execute of [
      async () => {
        throw new Error("provider-secret-sentinel");
      },
      async () => ({ exitCode: 1, terminationProven: true }),
      async () => ({ exitCode: 0, terminationProven: false }),
    ]) {
      const output = collector();
      const result = await runRegression({
        argumentsList: ["product"],
        execute,
        writeOutput: output.writeOutput,
      });

      assert.equal(result.exitCode, 1);
      assert.equal(
        output.values[0].includes("provider-secret-sentinel"),
        false,
      );
      assert.deepEqual(JSON.parse(output.values[0]), {
        dryRun: false,
        lane: "product",
        schemaVersion: "factory.local-regression-summary/v1",
        status: "failed",
        steps: [{ exitCode: 1, id: "product-tests" }],
      });
    }
  });

  it("stops nonzero when SIGINT or SIGTERM aborts the lane", async () => {
    for (const signal of ["SIGINT", "SIGTERM"]) {
      const signalSource = new EventEmitter();
      const calls = [];
      const result = await runRegression({
        argumentsList: ["smoke"],
        execute: async (command, args, options) => {
          calls.push({ args, command, signal: options.signal });
          signalSource.emit(signal);
          return successfulCommand();
        },
        signalSource,
        writeOutput: () => {},
      });

      assert.equal(result.exitCode, 1);
      assert.equal(calls.length, 1);
      assert.equal(calls[0].signal.aborted, true);
    }
  });

  it("uses the short fixed timeout for each smoke test", async () => {
    const calls = [];
    const result = await runRegression({
      argumentsList: ["smoke"],
      execute: async (command, args, options) => {
        calls.push({ args, command, options });
        return successfulCommand();
      },
      writeOutput: () => {},
    });

    assert.equal(result.exitCode, 0);
    assert.deepEqual(
      calls.map(({ args, command, options }) => ({
        args,
        command,
        timeoutMilliseconds: options.timeoutMilliseconds,
      })),
      [
        {
          args: ["--test", "scripts/doctor.test.mjs"],
          command: process.execPath,
          timeoutMilliseconds: 120_000,
        },
        {
          args: ["--test", "scripts/local-product-acceptance.test.mjs"],
          command: process.execPath,
          timeoutMilliseconds: 120_000,
        },
      ],
    );
  });

  it("returns an immutable bounded summary with no child output", async () => {
    const output = collector();
    const result = await runRegression({
      argumentsList: ["product"],
      execute: async () => ({
        exitCode: 0,
        stderr: "stderr-secret-sentinel",
        stdout: "stdout-secret-sentinel",
        terminationProven: true,
      }),
      writeOutput: output.writeOutput,
    });

    assert.equal(result.exitCode, 0);
    assert.equal(Object.isFrozen(result.summary), true);
    assert.equal(Object.isFrozen(result.summary.steps), true);
    assert.equal(Object.isFrozen(result.summary.steps[0]), true);
    assert.equal(output.values[0].includes("secret-sentinel"), false);
    assert.deepEqual(JSON.parse(output.values[0]), {
      dryRun: false,
      lane: "product",
      schemaVersion: "factory.local-regression-summary/v1",
      status: "succeeded",
      steps: [{ exitCode: 0, id: "product-tests" }],
    });
  });
});
