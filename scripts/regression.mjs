import { pathToFileURL } from "node:url";

import { executeCommand } from "./local-product-acceptance.mjs";

const schemaVersion = "factory.local-regression-summary/v1";
const usage =
  "Usage: node scripts/regression.mjs <smoke|product> [--dry-run]\n";
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
    (argumentsList[0] !== "smoke" && argumentsList[0] !== "product") ||
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
