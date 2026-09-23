import { pathToFileURL } from "node:url";

import { executeCommand } from "./local-product-acceptance.mjs";

const schemaVersion = "factory.local-regression-summary/v1";
const usage =
  "Usage: node scripts/regression.mjs <smoke|product|definitions> [--dry-run]\n";
const smokeTimeoutMilliseconds = 120_000;
const productTimeoutMilliseconds = 600_000;

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

const definitionBuildArguments = [
  "exec",
  "turbo",
  "run",
  "build",
  "--filter=@factory/adapters...",
  "--filter=@factory/compiler...",
];
const definitionAdapterTestArguments = [
  "--filter",
  "@factory/adapters",
  "test",
  "--",
  "test/product-definition-data.test.ts",
  "test/requirement-interpreter.test.ts",
  "test/supplies-stockroom-definition.test.ts",
];
const definitionCompatibilityTestArguments = [
  "--filter",
  "@factory/compiler",
  "test",
  "--",
  "test/definition-data-compatibility.test.ts",
  "test/inventory-operations-contract.test.ts",
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

function pnpmCommand(args, platform) {
  return platform === "win32"
    ? { command: "cmd.exe", args: ["/d", "/s", "/c", "pnpm", ...args] }
    : { command: "pnpm", args };
}

function nodeCommand(args, platform) {
  return platform === "win32"
    ? { command: "cmd.exe", args: ["/d", "/s", "/c", "node", ...args] }
    : { command: process.execPath, args };
}

function commandPlan(lane, platform) {
  if (lane === "smoke") {
    return [
      {
        args: ["--test", "scripts/doctor.test.mjs"],
        command: process.execPath,
        id: "doctor",
        timeoutMilliseconds: smokeTimeoutMilliseconds,
      },
      {
        args: ["--test", "scripts/local-product-acceptance.test.mjs"],
        command: process.execPath,
        id: "local-product-acceptance",
        timeoutMilliseconds: smokeTimeoutMilliseconds,
      },
    ];
  }
  if (lane === "definitions") {
    const build = pnpmCommand(definitionBuildArguments, platform);
    const adapterTests = pnpmCommand(definitionAdapterTestArguments, platform);
    const compatibilityTests = pnpmCommand(
      definitionCompatibilityTestArguments,
      platform,
    );
    const emittedControlTests = pnpmCommand(
      definitionEmittedControlTestArguments,
      platform,
    );
    const prismaGenerate = pnpmCommand(
      definitionPrismaGenerateArguments,
      platform,
    );
    return [
      {
        ...build,
        id: "definition-build",
        timeoutMilliseconds: productTimeoutMilliseconds,
      },
      {
        ...nodeCommand(
          [
            "--test",
            "scripts/definition-case-index.test.mjs",
            "scripts/regression.test.mjs",
          ],
          platform,
        ),
        id: "definition-tool-tests",
        timeoutMilliseconds: smokeTimeoutMilliseconds,
      },
      {
        ...nodeCommand(
          ["scripts/verify-product-definition-data.mjs"],
          platform,
        ),
        id: "definition-validation",
        timeoutMilliseconds: smokeTimeoutMilliseconds,
      },
      {
        ...nodeCommand(
          ["scripts/definition-case-index.mjs", "--check"],
          platform,
        ),
        id: "definition-case-index",
        timeoutMilliseconds: smokeTimeoutMilliseconds,
      },
      {
        ...adapterTests,
        id: "definition-adapter-tests",
        timeoutMilliseconds: productTimeoutMilliseconds,
      },
      {
        ...prismaGenerate,
        id: "definition-prisma-generate",
        timeoutMilliseconds: productTimeoutMilliseconds,
      },
      {
        ...emittedControlTests,
        id: "definition-emitted-control-tests",
        timeoutMilliseconds: productTimeoutMilliseconds,
      },
      {
        ...compatibilityTests,
        id: "definition-compatibility-tests",
        timeoutMilliseconds: productTimeoutMilliseconds,
      },
    ];
  }
  return [
    {
      args:
        platform === "win32"
          ? ["/d", "/s", "/c", "pnpm", ...productArguments]
          : productArguments,
      command: platform === "win32" ? "cmd.exe" : "pnpm",
      id: "product-tests",
      timeoutMilliseconds: productTimeoutMilliseconds,
    },
  ];
}

function parseArguments(argumentsList) {
  if (
    (argumentsList.length !== 1 && argumentsList.length !== 2) ||
    !["smoke", "product", "definitions"].includes(argumentsList[0]) ||
    (argumentsList.length === 2 && argumentsList[1] !== "--dry-run")
  ) {
    return null;
  }
  return { dryRun: argumentsList.length === 2, lane: argumentsList[0] };
}

function freezeSummary(summary) {
  for (const step of summary.steps) {
    if (step.args !== undefined) Object.freeze(step.args);
    Object.freeze(step);
  }
  Object.freeze(summary.steps);
  return Object.freeze(summary);
}

function createSummary(lane, dryRun, steps, status) {
  return freezeSummary({
    dryRun,
    lane,
    schemaVersion,
    status,
    steps,
  });
}

function safeExitCode(result) {
  return Number.isSafeInteger(result?.exitCode) &&
    result.exitCode >= 0 &&
    result.exitCode <= 255
    ? result.exitCode
    : 1;
}

function removeSignalListener(signalSource, signal, listener) {
  if (typeof signalSource.off === "function")
    signalSource.off(signal, listener);
  else signalSource.removeListener?.(signal, listener);
}

export async function runRegression({
  argumentsList = process.argv.slice(2),
  environment = process.env,
  execute = executeCommand,
  platform = process.platform,
  signalSource = process,
  writeOutput = (value) => process.stdout.write(value),
} = {}) {
  const parsed = parseArguments(argumentsList);
  if (parsed === null) {
    writeOutput(usage);
    return { exitCode: 1, summary: null };
  }
  const providerFree = Object.fromEntries(
    Object.entries(environment).filter(
      ([name]) =>
        name.toUpperCase() !== "OPENAI_API_KEY" &&
        name.toUpperCase() !== "OPENAI_MODEL",
    ),
  );
  const plan = commandPlan(parsed.lane, platform);
  if (parsed.dryRun) {
    const summary = createSummary(
      parsed.lane,
      true,
      plan.map(({ args, id }) => ({ args: [...args], id })),
      "dry-run",
    );
    writeOutput(`${JSON.stringify(summary)}\n`);
    return { exitCode: 0, summary };
  }

  const controller = new AbortController();
  const interrupt = () => controller.abort();
  for (const signal of ["SIGINT", "SIGTERM"])
    signalSource.once(signal, interrupt);
  const completed = [];
  let failed = false;
  try {
    for (const step of plan) {
      if (controller.signal.aborted) {
        failed = true;
        break;
      }
      let result;
      try {
        result = await execute(step.command, step.args, {
          environment: providerFree,
          platform,
          signal: controller.signal,
          timeoutMilliseconds: step.timeoutMilliseconds,
        });
      } catch {
        result = { exitCode: 1, terminationProven: false };
      }
      const exitCode = safeExitCode(result);
      completed.push({ exitCode, id: step.id });
      if (
        controller.signal.aborted ||
        exitCode !== 0 ||
        result?.terminationProven !== true
      ) {
        failed = true;
        if (exitCode === 0) completed[completed.length - 1].exitCode = 1;
        break;
      }
    }
  } finally {
    for (const signal of ["SIGINT", "SIGTERM"]) {
      removeSignalListener(signalSource, signal, interrupt);
    }
  }
  const summary = createSummary(
    parsed.lane,
    false,
    completed,
    failed ? "failed" : "succeeded",
  );
  const exitCode = failed ? 1 : 0;
  writeOutput(`${JSON.stringify(summary)}\n`);
  return { exitCode, summary };
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  process.exitCode = (await runRegression()).exitCode;
}
