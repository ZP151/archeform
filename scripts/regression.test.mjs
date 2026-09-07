import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { describe, it } from "node:test";

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
        "Usage: node scripts/regression.mjs <smoke|product> [--dry-run]\n",
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
